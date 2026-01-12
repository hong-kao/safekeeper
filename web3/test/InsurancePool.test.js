const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("InsurancePool", function () {
    let pool, pricing, registry;
    let owner, user1, user2, attacker;

    // Realistic test values (scaled to fit Hardhat test accounts)
    // Hardhat accounts have ~10000 ETH each
    const positionSize = ethers.parseEther("100"); // 100 ETH position (not 50k)
    const leverage = 10n;
    const liquidationPrice = ethers.parseEther("2850");
    const poolFunding = ethers.parseEther("100"); // 100 ETH for pool (reduced from 500)

    beforeEach(async function () {
        [owner, user1, user2, attacker] = await ethers.getSigners();

        // Deploy Pricing
        const Pricing = await ethers.getContractFactory("Pricing");
        pricing = await Pricing.deploy();
        await pricing.waitForDeployment();

        // Deploy InsurancePool (which deploys PolicyRegistry internally)
        const InsurancePool = await ethers.getContractFactory("InsurancePool");
        pool = await InsurancePool.deploy(await pricing.getAddress());
        await pool.waitForDeployment();

        // Get the deployed PolicyRegistry
        const registryAddress = await pool.policyRegistry();
        registry = await ethers.getContractAt("PolicyRegistry", registryAddress);

        // Fund the pool
        await owner.sendTransaction({
            to: await pool.getAddress(),
            value: poolFunding
        });
    });

    describe("Deployment", function () {
        it("should set admin to deployer", async function () {
            expect(await pool.admin()).to.equal(owner.address);
        });

        it("should set pricing contract correctly", async function () {
            expect(await pool.pricingContract()).to.equal(await pricing.getAddress());
        });

        it("should deploy PolicyRegistry with pool as owner", async function () {
            expect(await registry.insurancePool()).to.equal(await pool.getAddress());
        });

        it("should start unpaused", async function () {
            expect(await pool.paused()).to.equal(false);
        });

        it("should have initial pool balance from funding", async function () {
            expect(await pool.poolBalance()).to.equal(poolFunding);
        });

        it("should revert if pricing contract is zero address", async function () {
            const InsurancePool = await ethers.getContractFactory("InsurancePool");
            await expect(InsurancePool.deploy(ethers.ZeroAddress))
                .to.be.revertedWith("InsurancePool: invalid pricing address");
        });
    });

    describe("buyInsurance", function () {
        it("should allow buying insurance with correct premium", async function () {
            // Premium for 100 ETH at 10x leverage, 0 volatility = 150 bps = 1.5 ETH
            const premium = await pricing.premiumAmount(positionSize, leverage, 0);

            await pool.connect(user1).buyInsurance(positionSize, leverage, liquidationPrice, {
                value: premium
            });

            expect(await registry.hasPolicy(user1.address)).to.equal(true);
        });

        it("should emit InsurancePurchased event", async function () {
            const premium = await pricing.premiumAmount(positionSize, leverage, 0);

            await expect(pool.connect(user1).buyInsurance(positionSize, leverage, liquidationPrice, {
                value: premium
            }))
                .to.emit(pool, "InsurancePurchased")
                .withArgs(user1.address, positionSize, premium);
        });

        it("should update pool accounting correctly", async function () {
            const premium = await pricing.premiumAmount(positionSize, leverage, 0);
            const initialBalance = await pool.poolBalance();

            await pool.connect(user1).buyInsurance(positionSize, leverage, liquidationPrice, {
                value: premium
            });

            expect(await pool.poolBalance()).to.equal(initialBalance + premium);
            expect(await pool.totalPremiumsCollected()).to.equal(premium);
            expect(await pool.premiumsPaid(user1.address)).to.equal(premium);
        });

        it("should accept overpayment", async function () {
            const premium = await pricing.premiumAmount(positionSize, leverage, 0);
            const overpayment = premium + ethers.parseEther("1");

            await pool.connect(user1).buyInsurance(positionSize, leverage, liquidationPrice, {
                value: overpayment
            });

            expect(await pool.premiumsPaid(user1.address)).to.equal(overpayment);
        });

        it("should revert if premium is insufficient", async function () {
            const premium = await pricing.premiumAmount(positionSize, leverage, 0);
            const insufficientPremium = premium - 1n;

            await expect(pool.connect(user1).buyInsurance(positionSize, leverage, liquidationPrice, {
                value: insufficientPremium
            })).to.be.revertedWith("InsurancePool: insufficient premium");
        });

        it("should revert if position size is 0", async function () {
            await expect(pool.connect(user1).buyInsurance(0, leverage, liquidationPrice, {
                value: ethers.parseEther("1")
            })).to.be.revertedWith("InsurancePool: position size must be > 0");
        });

        it("should revert if leverage is 0", async function () {
            await expect(pool.connect(user1).buyInsurance(positionSize, 0, liquidationPrice, {
                value: ethers.parseEther("1")
            })).to.be.revertedWith("InsurancePool: leverage must be > 0");
        });

        it("should revert if liquidation price is 0", async function () {
            await expect(pool.connect(user1).buyInsurance(positionSize, leverage, 0, {
                value: ethers.parseEther("1")
            })).to.be.revertedWith("InsurancePool: liquidation price must be > 0");
        });

        it("should revert if pool is paused", async function () {
            await pool.pause();
            const premium = await pricing.premiumAmount(positionSize, leverage, 0);

            await expect(pool.connect(user1).buyInsurance(positionSize, leverage, liquidationPrice, {
                value: premium
            })).to.be.revertedWith("InsurancePool: pool is paused");
        });

        it("should revert if user already has policy", async function () {
            const premium = await pricing.premiumAmount(positionSize, leverage, 0);

            await pool.connect(user1).buyInsurance(positionSize, leverage, liquidationPrice, {
                value: premium
            });

            await expect(pool.connect(user1).buyInsurance(positionSize, leverage, liquidationPrice, {
                value: premium
            })).to.be.revertedWith("PolicyRegistry: user already has an active policy");
        });
    });

    describe("submitClaim", function () {
        const lossAmount = ethers.parseEther("100"); // 100 ETH loss
        const expectedPayout = lossAmount * 5000n / 10000n; // 50% = 50 ETH

        beforeEach(async function () {
            // User buys insurance
            const premium = await pricing.premiumAmount(positionSize, leverage, 0);
            await pool.connect(user1).buyInsurance(positionSize, leverage, liquidationPrice, {
                value: premium
            });
        });

        it("should pay out 50% of loss", async function () {
            const userBalanceBefore = await ethers.provider.getBalance(user1.address);

            await pool.submitClaim(user1.address, lossAmount);

            const userBalanceAfter = await ethers.provider.getBalance(user1.address);
            expect(userBalanceAfter - userBalanceBefore).to.equal(expectedPayout);
        });

        it("should emit ClaimPaid event", async function () {
            await expect(pool.submitClaim(user1.address, lossAmount))
                .to.emit(pool, "ClaimPaid")
                .withArgs(user1.address, lossAmount, expectedPayout);
        });

        it("should update pool accounting", async function () {
            const poolBalanceBefore = await pool.poolBalance();

            await pool.submitClaim(user1.address, lossAmount);

            expect(await pool.poolBalance()).to.equal(poolBalanceBefore - expectedPayout);
            expect(await pool.totalClaimsPaid()).to.equal(expectedPayout);
            expect(await pool.hasClaim(user1.address)).to.equal(true);
        });

        it("should mark policy as claimed", async function () {
            expect(await registry.hasPolicy(user1.address)).to.equal(true);

            await pool.submitClaim(user1.address, lossAmount);

            expect(await registry.hasPolicy(user1.address)).to.equal(false);
            const policy = await registry.getPolicy(user1.address);
            expect(policy.claimed).to.equal(true);
        });

        it("should revert if caller is not admin", async function () {
            await expect(pool.connect(attacker).submitClaim(user1.address, lossAmount))
                .to.be.revertedWith("InsurancePool: caller is not admin");
        });

        it("should revert if user has no active policy", async function () {
            await expect(pool.submitClaim(user2.address, lossAmount))
                .to.be.revertedWith("InsurancePool: no active policy for user");
        });

        it("should revert on double claim", async function () {
            await pool.submitClaim(user1.address, lossAmount);

            // After first claim, hasClaim[user] = true, so we get this error first
            await expect(pool.submitClaim(user1.address, lossAmount))
                .to.be.revertedWith("InsurancePool: no active policy for user");
        });

        it("should revert if pool balance insufficient", async function () {
            // Try to claim more than pool can pay (need 50% of 2000 ETH = 1000 ETH, but pool only has ~500)
            const hugeLoss = ethers.parseEther("2000");

            await expect(pool.submitClaim(user1.address, hugeLoss))
                .to.be.revertedWith("InsurancePool: insufficient pool balance");
        });

        it("should revert for zero user address", async function () {
            await expect(pool.submitClaim(ethers.ZeroAddress, lossAmount))
                .to.be.revertedWith("InsurancePool: invalid user address");
        });

        it("should revert for zero loss amount", async function () {
            await expect(pool.submitClaim(user1.address, 0))
                .to.be.revertedWith("InsurancePool: loss amount must be > 0");
        });
    });

    describe("Multi-user scenarios", function () {
        it("should handle two users buying insurance", async function () {
            const premium1 = await pricing.premiumAmount(positionSize, leverage, 0);
            const premium2 = await pricing.premiumAmount(ethers.parseEther("200"), 20n, 0);

            await pool.connect(user1).buyInsurance(positionSize, leverage, liquidationPrice, {
                value: premium1
            });
            await pool.connect(user2).buyInsurance(ethers.parseEther("200"), 20, ethers.parseEther("2800"), {
                value: premium2
            });

            expect(await registry.getActivePoliciesCount()).to.equal(2);
            expect(await pool.totalPremiumsCollected()).to.equal(premium1 + premium2);
        });

        it("should handle claim for one user while other remains active", async function () {
            const premium1 = await pricing.premiumAmount(positionSize, leverage, 0);
            const premium2 = await pricing.premiumAmount(positionSize, leverage, 0);

            await pool.connect(user1).buyInsurance(positionSize, leverage, liquidationPrice, {
                value: premium1
            });
            await pool.connect(user2).buyInsurance(positionSize, leverage, liquidationPrice, {
                value: premium2
            });

            // Claim for user1
            await pool.submitClaim(user1.address, ethers.parseEther("100"));

            // user2 should still have active policy
            expect(await registry.hasPolicy(user1.address)).to.equal(false);
            expect(await registry.hasPolicy(user2.address)).to.equal(true);
            expect(await registry.getActivePoliciesCount()).to.equal(1);
        });
    });

    describe("getPoolStatus", function () {
        it("should return correct pool status", async function () {
            const premium = await pricing.premiumAmount(positionSize, leverage, 0);

            await pool.connect(user1).buyInsurance(positionSize, leverage, liquidationPrice, {
                value: premium
            });

            const [balance, totalPremiums, totalClaims, activePolicies] = await pool.getPoolStatus();

            expect(balance).to.equal(poolFunding + premium);
            expect(totalPremiums).to.equal(premium);
            expect(totalClaims).to.equal(0);
            expect(activePolicies).to.equal(1);
        });

        it("should update after claim", async function () {
            const premium = await pricing.premiumAmount(positionSize, leverage, 0);

            await pool.connect(user1).buyInsurance(positionSize, leverage, liquidationPrice, {
                value: premium
            });

            const lossAmount = ethers.parseEther("100");
            const expectedPayout = lossAmount * 5000n / 10000n;

            await pool.submitClaim(user1.address, lossAmount);

            const [balance, totalPremiums, totalClaims, activePolicies] = await pool.getPoolStatus();

            expect(balance).to.equal(poolFunding + premium - expectedPayout);
            expect(totalPremiums).to.equal(premium);
            expect(totalClaims).to.equal(expectedPayout);
            expect(activePolicies).to.equal(0);
        });
    });

    describe("pause/unpause", function () {
        it("should pause the pool", async function () {
            await pool.pause();
            expect(await pool.paused()).to.equal(true);
        });

        it("should emit Paused event", async function () {
            await expect(pool.pause())
                .to.emit(pool, "Paused")
                .withArgs(owner.address);
        });

        it("should unpause the pool", async function () {
            await pool.pause();
            await pool.unpause();
            expect(await pool.paused()).to.equal(false);
        });

        it("should emit Unpaused event", async function () {
            await pool.pause();
            await expect(pool.unpause())
                .to.emit(pool, "Unpaused")
                .withArgs(owner.address);
        });

        it("should revert pause if already paused", async function () {
            await pool.pause();
            await expect(pool.pause()).to.be.revertedWith("InsurancePool: already paused");
        });

        it("should revert unpause if not paused", async function () {
            await expect(pool.unpause()).to.be.revertedWith("InsurancePool: not paused");
        });

        it("should revert pause if not admin", async function () {
            await expect(pool.connect(attacker).pause())
                .to.be.revertedWith("InsurancePool: caller is not admin");
        });

        it("should revert unpause if not admin", async function () {
            await pool.pause();
            await expect(pool.connect(attacker).unpause())
                .to.be.revertedWith("InsurancePool: caller is not admin");
        });
    });

    describe("changeAdmin", function () {
        it("should change admin", async function () {
            await pool.changeAdmin(user1.address);
            expect(await pool.admin()).to.equal(user1.address);
        });

        it("should emit AdminChanged event", async function () {
            await expect(pool.changeAdmin(user1.address))
                .to.emit(pool, "AdminChanged")
                .withArgs(owner.address, user1.address);
        });

        it("should revert if not admin", async function () {
            await expect(pool.connect(attacker).changeAdmin(attacker.address))
                .to.be.revertedWith("InsurancePool: caller is not admin");
        });

        it("should revert for zero address", async function () {
            await expect(pool.changeAdmin(ethers.ZeroAddress))
                .to.be.revertedWith("InsurancePool: invalid admin address");
        });
    });

    describe("emergencyWithdraw", function () {
        it("should withdraw funds to admin", async function () {
            const withdrawAmount = ethers.parseEther("50");
            const adminBalanceBefore = await ethers.provider.getBalance(owner.address);

            const tx = await pool.emergencyWithdraw(withdrawAmount);
            const receipt = await tx.wait();
            const gasUsed = receipt.gasUsed * receipt.gasPrice;

            const adminBalanceAfter = await ethers.provider.getBalance(owner.address);
            expect(adminBalanceAfter).to.equal(adminBalanceBefore + withdrawAmount - gasUsed);
        });

        it("should emit EmergencyWithdraw event", async function () {
            const withdrawAmount = ethers.parseEther("50");
            await expect(pool.emergencyWithdraw(withdrawAmount))
                .to.emit(pool, "EmergencyWithdraw")
                .withArgs(owner.address, withdrawAmount);
        });

        it("should update pool balance", async function () {
            const withdrawAmount = ethers.parseEther("50");
            const poolBalanceBefore = await pool.poolBalance();

            await pool.emergencyWithdraw(withdrawAmount);

            expect(await pool.poolBalance()).to.equal(poolBalanceBefore - withdrawAmount);
        });

        it("should revert if not admin", async function () {
            await expect(pool.connect(attacker).emergencyWithdraw(ethers.parseEther("1")))
                .to.be.revertedWith("InsurancePool: caller is not admin");
        });

        it("should revert if amount exceeds balance", async function () {
            const tooMuch = poolFunding + ethers.parseEther("1");
            await expect(pool.emergencyWithdraw(tooMuch))
                .to.be.revertedWith("InsurancePool: insufficient balance");
        });
    });

    describe("receive (pool funding)", function () {
        it("should accept direct ETH transfers", async function () {
            const fundAmount = ethers.parseEther("50");
            const poolBalanceBefore = await pool.poolBalance();

            await user1.sendTransaction({
                to: await pool.getAddress(),
                value: fundAmount
            });

            expect(await pool.poolBalance()).to.equal(poolBalanceBefore + fundAmount);
        });

        it("should emit PoolFunded event", async function () {
            const fundAmount = ethers.parseEther("50");

            await expect(user1.sendTransaction({
                to: await pool.getAddress(),
                value: fundAmount
            }))
                .to.emit(pool, "PoolFunded")
                .withArgs(user1.address, fundAmount);
        });
    });

    describe("Edge cases", function () {
        it("should handle exact pool balance payout", async function () {
            // Calculate a loss that would drain exactly the pool (minus premium)
            const premium = await pricing.premiumAmount(positionSize, leverage, 0);

            await pool.connect(user1).buyInsurance(positionSize, leverage, liquidationPrice, {
                value: premium
            });

            const currentBalance = await pool.poolBalance();
            // Payout = loss * 50% / 100%, so loss = balance * 2
            const maxLoss = currentBalance * 10000n / 5000n;

            await pool.submitClaim(user1.address, maxLoss);

            expect(await pool.poolBalance()).to.equal(0);
        });

        it("should allow claims even when paused (admin action)", async function () {
            const premium = await pricing.premiumAmount(positionSize, leverage, 0);

            await pool.connect(user1).buyInsurance(positionSize, leverage, liquidationPrice, {
                value: premium
            });

            await pool.pause();

            // Claims should still work when paused (it's an admin action)
            await expect(pool.submitClaim(user1.address, ethers.parseEther("100")))
                .to.emit(pool, "ClaimPaid");
        });

        it("should handle tiny loss relative to premium without breaking accounting", async function () {
            const premium = await pricing.premiumAmount(positionSize, leverage, 0);
            await pool.connect(user1).buyInsurance(positionSize, leverage, liquidationPrice, {
                value: premium
            });

            const smallLoss = ethers.parseEther("0.0001");
            const expectedPayout = smallLoss * 5000n / 10000n;

            const poolBalanceBefore = await pool.poolBalance();
            await pool.submitClaim(user1.address, smallLoss);
            const poolBalanceAfter = await pool.poolBalance();

            expect(poolBalanceBefore - poolBalanceAfter).to.equal(expectedPayout);
        });
    });
});
