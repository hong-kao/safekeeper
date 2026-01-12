const { expect } = require("chai");
const { ethers } = require("hardhat");

/**
 * Integration Tests
 * 
 * End-to-end tests simulating the full demo flow:
 * 1. Deploy all contracts
 * 2. Fund the pool
 * 3. Multiple users buy insurance
 * 4. Simulate liquidation events
 * 5. Verify payouts and state updates
 */
describe("Integration", function () {
    let pool, pricing, registry;
    let admin, trader1, trader2, trader3;

    // Demo scenario values
    const poolSeedFunding = ethers.parseEther("200"); // 200 ETH seed (enough for claim tests)

    beforeEach(async function () {
        [admin, trader1, trader2, trader3] = await ethers.getSigners();

        // Deploy Pricing contract
        const Pricing = await ethers.getContractFactory("Pricing");
        pricing = await Pricing.deploy();
        await pricing.waitForDeployment();

        // Deploy InsurancePool (deploys PolicyRegistry internally)
        const InsurancePool = await ethers.getContractFactory("InsurancePool");
        pool = await InsurancePool.deploy(await pricing.getAddress());
        await pool.waitForDeployment();

        // Get PolicyRegistry reference
        const registryAddress = await pool.policyRegistry();
        registry = await ethers.getContractAt("PolicyRegistry", registryAddress);

        // Seed the pool with initial funds
        await admin.sendTransaction({
            to: await pool.getAddress(),
            value: poolSeedFunding
        });
    });

    describe("Demo Flow: Happy Path", function () {
        it("should complete full insurance cycle: buy → liquidate → payout", async function () {
            // === STEP 1: Trader buys insurance ===
            const positionSize = ethers.parseEther("100");
            const leverage = 10n;
            const liquidationPrice = ethers.parseEther("2850");

            // Calculate premium: 150 bps for 10x leverage, 0 volatility
            const premium = await pricing.premiumAmount(positionSize, leverage, 0);
            expect(premium).to.equal(ethers.parseEther("1.5")); // 100 * 150 / 10000 = 1.5 ETH

            // Trader1 buys insurance
            await pool.connect(trader1).buyInsurance(positionSize, leverage, liquidationPrice, {
                value: premium
            });

            // Verify policy created
            expect(await registry.hasPolicy(trader1.address)).to.equal(true);
            const policy = await registry.getPolicy(trader1.address);
            expect(policy.positionSize).to.equal(positionSize);
            expect(policy.leverage).to.equal(leverage);
            expect(policy.premiumPaid).to.equal(premium);

            // Verify pool status
            let [balance, totalPremiums, totalClaims, activePolicies] = await pool.getPoolStatus();
            expect(balance).to.equal(poolSeedFunding + premium);
            expect(totalPremiums).to.equal(premium);
            expect(activePolicies).to.equal(1);

            // === STEP 2: Liquidation occurs (simulated by backend) ===
            const lossAmount = positionSize; // Full position lost
            const expectedPayout = lossAmount * 5000n / 10000n; // 50% = 50 ETH

            const balanceBefore = await ethers.provider.getBalance(trader1.address);

            // Admin (backend) submits claim
            await pool.submitClaim(trader1.address, lossAmount);

            const balanceAfter = await ethers.provider.getBalance(trader1.address);

            // === STEP 3: Verify payout ===
            expect(balanceAfter - balanceBefore).to.equal(expectedPayout);

            // Verify policy marked as claimed
            expect(await registry.hasPolicy(trader1.address)).to.equal(false);
            const claimedPolicy = await registry.getPolicy(trader1.address);
            expect(claimedPolicy.claimed).to.equal(true);

            // Verify pool status updated
            [balance, totalPremiums, totalClaims, activePolicies] = await pool.getPoolStatus();
            expect(totalClaims).to.equal(expectedPayout);
            expect(activePolicies).to.equal(0);
            expect(balance).to.equal(poolSeedFunding + premium - expectedPayout);
        });
    });

    describe("Demo Flow: Multiple Users", function () {
        it("should handle multiple users with independent policies", async function () {
            // Trader1 buys insurance
            const position1 = ethers.parseEther("100");
            const premium1 = await pricing.premiumAmount(position1, 10, 0);
            await pool.connect(trader1).buyInsurance(position1, 10, ethers.parseEther("2850"), {
                value: premium1
            });

            // Trader2 buys insurance with higher leverage
            const position2 = ethers.parseEther("50");
            const leverage2 = 20n;
            const premium2 = await pricing.premiumAmount(position2, leverage2, 0);
            await pool.connect(trader2).buyInsurance(position2, leverage2, ethers.parseEther("2800"), {
                value: premium2
            });

            // Verify both policies exist
            expect(await registry.getActivePoliciesCount()).to.equal(2);
            expect(await registry.hasPolicy(trader1.address)).to.equal(true);
            expect(await registry.hasPolicy(trader2.address)).to.equal(true);

            // Trader1 gets liquidated
            await pool.submitClaim(trader1.address, position1);

            // Trader1 claimed, Trader2 still active
            expect(await registry.hasPolicy(trader1.address)).to.equal(false);
            expect(await registry.hasPolicy(trader2.address)).to.equal(true);
            expect(await registry.getActivePoliciesCount()).to.equal(1);

            // Trader2 gets liquidated later
            await pool.submitClaim(trader2.address, position2);

            // Both claimed
            expect(await registry.getActivePoliciesCount()).to.equal(0);

            // Verify total claims
            const [, , totalClaims,] = await pool.getPoolStatus();
            const expectedTotalClaims = (position1 * 5000n / 10000n) + (position2 * 5000n / 10000n);
            expect(totalClaims).to.equal(expectedTotalClaims);
        });
    });

    describe("Demo Flow: User cannot claim twice", function () {
        it("should prevent double-claiming for same user", async function () {
            // Trader buys insurance
            const premium = await pricing.premiumAmount(ethers.parseEther("100"), 10, 0);
            await pool.connect(trader1).buyInsurance(ethers.parseEther("100"), 10, ethers.parseEther("2850"), {
                value: premium
            });

            // First claim succeeds
            await pool.submitClaim(trader1.address, ethers.parseEther("100"));

            // Second claim fails (policy already claimed)
            await expect(pool.submitClaim(trader1.address, ethers.parseEther("100")))
                .to.be.revertedWith("InsurancePool: no active policy for user");
        });
    });

    describe("Demo Flow: Pool balance tracking", function () {
        it("should correctly track pool balance through multiple operations", async function () {
            // Initial state
            let [balance, , ,] = await pool.getPoolStatus();
            expect(balance).to.equal(poolSeedFunding);

            // Trader1 buys (pool +premium)
            const premium1 = await pricing.premiumAmount(ethers.parseEther("20"), 10, 0);
            await pool.connect(trader1).buyInsurance(ethers.parseEther("20"), 10, ethers.parseEther("2850"), {
                value: premium1
            });
            [balance, , ,] = await pool.getPoolStatus();
            expect(balance).to.equal(poolSeedFunding + premium1);

            // Trader2 buys (pool +premium)
            const premium2 = await pricing.premiumAmount(ethers.parseEther("30"), 5, 0);
            await pool.connect(trader2).buyInsurance(ethers.parseEther("30"), 5, ethers.parseEther("2900"), {
                value: premium2
            });
            [balance, , ,] = await pool.getPoolStatus();
            expect(balance).to.equal(poolSeedFunding + premium1 + premium2);

            // Trader1 claims (pool -payout)
            const payout1 = ethers.parseEther("20") * 5000n / 10000n;
            await pool.submitClaim(trader1.address, ethers.parseEther("20"));
            [balance, , ,] = await pool.getPoolStatus();
            expect(balance).to.equal(poolSeedFunding + premium1 + premium2 - payout1);
        });
    });

    describe("Demo Flow: Premium calculation verification", function () {
        it("should charge correct premiums for different leverage levels", async function () {
            // 5x leverage: 50 + 50 = 100 bps = 1%
            expect(await pricing.calculatePremium(5, 0)).to.equal(100);

            // 10x leverage: 50 + 100 = 150 bps = 1.5%
            expect(await pricing.calculatePremium(10, 0)).to.equal(150);

            // 20x leverage: 50 + 200 = 250 bps = 2.5%
            expect(await pricing.calculatePremium(20, 0)).to.equal(250);

            // Verify actual premium amounts for a 100 ETH position
            const position = ethers.parseEther("100");
            expect(await pricing.premiumAmount(position, 5, 0)).to.equal(ethers.parseEther("1"));    // 1%
            expect(await pricing.premiumAmount(position, 10, 0)).to.equal(ethers.parseEther("1.5")); // 1.5%
            expect(await pricing.premiumAmount(position, 20, 0)).to.equal(ethers.parseEther("2.5")); // 2.5%
        });
    });

    describe("Demo Flow: Emergency scenarios", function () {
        it("should allow admin to pause new purchases but still process claims", async function () {
            // Trader buys insurance
            const premium = await pricing.premiumAmount(ethers.parseEther("50"), 10, 0);
            await pool.connect(trader1).buyInsurance(ethers.parseEther("50"), 10, ethers.parseEther("2850"), {
                value: premium
            });

            // Admin pauses pool
            await pool.pause();
            expect(await pool.paused()).to.equal(true);

            // New purchases blocked
            await expect(pool.connect(trader2).buyInsurance(ethers.parseEther("50"), 10, ethers.parseEther("2850"), {
                value: premium
            })).to.be.revertedWith("InsurancePool: pool is paused");

            // Existing claims still processed
            await expect(pool.submitClaim(trader1.address, ethers.parseEther("50")))
                .to.emit(pool, "ClaimPaid");
        });

        it("should allow admin to withdraw funds in emergency", async function () {
            const withdrawAmount = ethers.parseEther("25");
            const poolBalanceBefore = await pool.poolBalance();

            await pool.emergencyWithdraw(withdrawAmount);

            expect(await pool.poolBalance()).to.equal(poolBalanceBefore - withdrawAmount);
        });
    });

    describe("Demo Flow: Contract wiring verification", function () {
        it("should have correct contract references", async function () {
            // InsurancePool references Pricing
            expect(await pool.pricingContract()).to.equal(await pricing.getAddress());

            // InsurancePool references PolicyRegistry
            expect(await pool.policyRegistry()).to.equal(await registry.getAddress());

            // PolicyRegistry references InsurancePool
            expect(await registry.insurancePool()).to.equal(await pool.getAddress());

            // Admin is correctly set
            expect(await pool.admin()).to.equal(admin.address);
        });
    });

    describe("Demo Flow: Edge case - exact balance payout", function () {
        it("should handle payout that exactly drains the pool", async function () {
            // Trader buys insurance
            const position = ethers.parseEther("50");
            const premium = await pricing.premiumAmount(position, 10, 0);
            await pool.connect(trader1).buyInsurance(position, 10, ethers.parseEther("2850"), {
                value: premium
            });

            // Current pool balance
            const poolBalance = await pool.poolBalance();

            // Calculate loss that would exactly drain pool (payout = poolBalance)
            const exactLoss = poolBalance * 10000n / 5000n; // Since payout = loss * 50%

            // Submit claim that drains exactly
            await pool.submitClaim(trader1.address, exactLoss);

            // Pool should be exactly 0
            expect(await pool.poolBalance()).to.equal(0);
        });
    });
});
