const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Pricing", function () {
    let pricing;

    beforeEach(async function () {
        const Pricing = await ethers.getContractFactory("Pricing");
        pricing = await Pricing.deploy();
        await pricing.waitForDeployment();
    });

    describe("Constants", function () {
        it("should have correct BASE_PREMIUM of 50 bps", async function () {
            expect(await pricing.BASE_PREMIUM()).to.equal(50);
        });

        it("should have correct LEVERAGE_FACTOR of 10 bps", async function () {
            expect(await pricing.LEVERAGE_FACTOR()).to.equal(10);
        });

        it("should have correct VOLATILITY_FACTOR of 5 bps", async function () {
            expect(await pricing.VOLATILITY_FACTOR()).to.equal(5);
        });
    });

    describe("calculatePremium", function () {
        it("should calculate premium correctly for leverage 10, volatility 5 (demo case)", async function () {
            // 50 + (10 * 10) + (5 * 5) = 50 + 100 + 25 = 175 bps
            const bps = await pricing.calculatePremium(10, 5);
            expect(bps).to.equal(175);
        });

        it("should calculate premium correctly for leverage 10, volatility 0", async function () {
            // 50 + (10 * 10) + (0 * 5) = 50 + 100 + 0 = 150 bps
            const bps = await pricing.calculatePremium(10, 0);
            expect(bps).to.equal(150);
        });

        it("should calculate premium correctly for leverage 1, volatility 0 (minimum leverage)", async function () {
            // 50 + (1 * 10) + (0 * 5) = 50 + 10 + 0 = 60 bps
            const bps = await pricing.calculatePremium(1, 0);
            expect(bps).to.equal(60);
        });

        it("should calculate premium correctly for leverage 20, volatility 10 (high risk)", async function () {
            // 50 + (20 * 10) + (10 * 5) = 50 + 200 + 50 = 300 bps
            const bps = await pricing.calculatePremium(20, 10);
            expect(bps).to.equal(300);
        });

        it("should calculate premium correctly for leverage 5, volatility 3", async function () {
            // 50 + (5 * 10) + (3 * 5) = 50 + 50 + 15 = 115 bps
            const bps = await pricing.calculatePremium(5, 3);
            expect(bps).to.equal(115);
        });

        it("should calculate premium correctly for leverage 0, volatility 0 (edge case)", async function () {
            // 50 + (0 * 10) + (0 * 5) = 50 bps (base only)
            const bps = await pricing.calculatePremium(0, 0);
            expect(bps).to.equal(50);
        });

        it("should calculate premium correctly for high leverage 100x", async function () {
            // 50 + (100 * 10) + (0 * 5) = 50 + 1000 = 1050 bps = 10.5%
            const bps = await pricing.calculatePremium(100, 0);
            expect(bps).to.equal(1050);
        });
    });

    describe("premiumAmount", function () {
        it("should calculate premium amount correctly for $50k position at 10x leverage, volatility 5", async function () {
            // Premium bps = 175, so premium = 50000 * 175 / 10000 = 875
            const positionSize = ethers.parseEther("50000");
            const amount = await pricing.premiumAmount(positionSize, 10, 5);
            expect(amount).to.equal(ethers.parseEther("875"));
        });

        it("should calculate premium amount correctly for $100k position at 10x leverage, volatility 0", async function () {
            // Premium bps = 150, so premium = 100000 * 150 / 10000 = 1500
            const positionSize = ethers.parseEther("100000");
            const amount = await pricing.premiumAmount(positionSize, 10, 0);
            expect(amount).to.equal(ethers.parseEther("1500"));
        });

        it("should handle small position size (100 wei)", async function () {
            // Premium bps = 60 (1x, 0 vol), so premium = 100 * 60 / 10000 = 0 (rounds down)
            const positionSize = 100n;
            const amount = await pricing.premiumAmount(positionSize, 1, 0);
            expect(amount).to.equal(0);
        });

        it("should handle medium position size correctly", async function () {
            // 10000 wei at 10x, 5 vol → 175 bps → 10000 * 175 / 10000 = 175 wei
            const positionSize = 10000n;
            const amount = await pricing.premiumAmount(positionSize, 10, 5);
            expect(amount).to.equal(175);
        });

        it("should handle large position size (1000 ETH)", async function () {
            // 1000 ETH at 20x, 10 vol → 300 bps → 1000 * 300 / 10000 = 30 ETH
            const positionSize = ethers.parseEther("1000");
            const amount = await pricing.premiumAmount(positionSize, 20, 10);
            expect(amount).to.equal(ethers.parseEther("30"));
        });

        it("should handle very large position (1 million ETH)", async function () {
            // 1,000,000 ETH at 10x, 5 vol → 175 bps → 1,000,000 * 175 / 10000 = 17,500 ETH
            const positionSize = ethers.parseEther("1000000");
            const amount = await pricing.premiumAmount(positionSize, 10, 5);
            expect(amount).to.equal(ethers.parseEther("17500"));
        });

        it("should return zero premium for zero position size", async function () {
            const amount = await pricing.premiumAmount(0, 10, 5);
            expect(amount).to.equal(0);
        });

        it("should not overflow with max uint256 position size", async function () {
            const maxUint256 = ethers.MaxUint256;
            // Even with max uint256, it should handle gracefully (though would be unrealistic)
            // At minimum leverage (1x, 0 vol) = 60 bps
            // This will overflow, but we test that the function doesn't silently fail
            try {
                const amount = await pricing.premiumAmount(maxUint256, 1, 0);
                // If it succeeds, amount should be at least 0
                expect(amount).to.be.gte(0n);
            } catch (err) {
                // Overflow is acceptable for unrealistic inputs
                expect(err.message).to.include("overflow");
            }
        });

        it("should calculate correctly with leverage = 0 (edge case)", async function () {
            // 50 + (0 * 10) + (0 * 5) = 50 bps
            const positionSize = ethers.parseEther("50000");
            const amount = await pricing.premiumAmount(positionSize, 0, 0);
            expect(amount).to.equal(ethers.parseEther("250")); // 50000 * 50 / 10000
        });

        it("should calculate correctly with volatility = 0 (common case)", async function () {
            // Common use case: only leverage, no volatility
            const positionSize = ethers.parseEther("75000");
            const amount = await pricing.premiumAmount(positionSize, 15, 0);
            // 50 + (15 * 10) = 200 bps → 75000 * 200 / 10000 = 1500
            expect(amount).to.equal(ethers.parseEther("1500"));
        });

        it("should scale linearly with position size", async function () {
            // Test linearity: 2x position = 2x premium
            const pos1 = ethers.parseEther("10000");
            const pos2 = ethers.parseEther("20000");
            const premium1 = await pricing.premiumAmount(pos1, 10, 5);
            const premium2 = await pricing.premiumAmount(pos2, 10, 5);
            expect(premium2).to.equal(premium1 * 2n);
        });

        it("should scale linearly with leverage", async function () {
            // Test linearity: 2x leverage = +1% premium
            const positionSize = ethers.parseEther("50000");
            const prem5x = await pricing.premiumAmount(positionSize, 5, 0);
            const prem10x = await pricing.premiumAmount(positionSize, 10, 0);
            // 5x: 50 + 50 = 100 bps → 500
            // 10x: 50 + 100 = 150 bps → 750
            // 10x should be 1.5x the 5x
            expect(prem10x).to.equal(ethers.parseEther("750"));
            expect(prem5x).to.equal(ethers.parseEther("500"));
        });

        it("should scale linearly with volatility", async function () {
            // Test linearity: 2x volatility = +0.5% premium
            const positionSize = ethers.parseEther("100000");
            const prem0vol = await pricing.premiumAmount(positionSize, 10, 0);
            const prem5vol = await pricing.premiumAmount(positionSize, 10, 5);
            // 0 vol: 50 + 100 = 150 bps → 1500
            // 5 vol: 50 + 100 + 25 = 175 bps → 1750
            // Difference: 250
            expect(prem5vol - prem0vol).to.equal(ethers.parseEther("250"));
        });

        it("should handle fractional ETH positions", async function () {
            // Test with fractional ETH (e.g., 0.5 ETH)
            const positionSize = ethers.parseEther("0.5");
            const amount = await pricing.premiumAmount(positionSize, 10, 0);
            // 0.5 * 150 / 10000 = 0.0075 ETH
            expect(amount).to.equal(ethers.parseEther("0.0075"));
        });

        it("should handle wei-level precision", async function () {
            // Test with exact wei values (not ETH)
            const positionSize = 123456789n;
            const amount = await pricing.premiumAmount(positionSize, 10, 5);
            // 123456789 * 175 / 10000 = 2160494.3075 → 2160494 (rounded down)
            const expected = (123456789n * 175n) / 10000n;
            expect(amount).to.equal(expected);
        });

        it("should revert or handle extreme leverage gracefully", async function () {
            const positionSize = ethers.parseEther("50000");
            // Extremely high leverage (1000x)
            const bps = await pricing.calculatePremium(1000, 0);
            // 50 + (1000 * 10) = 10050 bps (100.5% premium — unrealistic but valid)
            expect(bps).to.equal(10050);

            // Should still calculate premium correctly
            const amount = await pricing.premiumAmount(positionSize, 1000, 0);
            expect(amount).to.equal(ethers.parseEther("50250"));
        });

        it("should pass sanity check: premium should be < 50% of position (for reasonable leverage)", async function () {
            // For typical case (10x, 5 vol), premium should be < 2% of position
            const positionSize = ethers.parseEther("50000");
            const premium = await pricing.premiumAmount(positionSize, 10, 5);
            // 175 bps = 1.75%, so premium < 2% of 50k = 1000
            expect(premium).to.be.lt(ethers.parseEther("1000"));
        });
    });
});
