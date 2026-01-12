const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("InsurancePool - Multi-Policy Stress Tests", function () {
    let pool, pricing, registry;
    let owner, user1, user2, user3, attacker;

    // Test values (scaled to fit Hardhat test accounts)
    const positionSize = ethers.parseEther("100"); // 100 ETH position
    const leverage = 10n;
    const liquidationPrice = ethers.parseEther("2850");
    const poolFunding = ethers.parseEther("100"); // 100 ETH for pool

    beforeEach(async function () {
        [owner, user1, user2, user3, attacker] = await ethers.getSigners();

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

    describe("buyInsurance - Returns Policy ID", function () {
        it("should return policy ID when buying insurance", async function () {
            const premium = await pricing.premiumAmount(positionSize, leverage, 0);

            // The function now returns policyId
            const tx = await pool.connect(user1).buyInsurance(positionSize, leverage, liquidationPrice, {
                value: premium
            });
            const receipt = await tx.wait();

            // Check the event for policy ID
            const event = receipt.logs.find(log => {
                try {
                    return pool.interface.parseLog(log)?.name === "InsurancePurchased";
                } catch { return false; }
            });
            const parsedEvent = pool.interface.parseLog(event);
            expect(parsedEvent.args.policyId).to.equal(0);
        });

        it("should emit InsurancePurchased event with policyId", async function () {
            const premium = await pricing.premiumAmount(positionSize, leverage, 0);

            await expect(pool.connect(user1).buyInsurance(positionSize, leverage, liquidationPrice, {
                value: premium
            }))
                .to.emit(pool, "InsurancePurchased")
                .withArgs(user1.address, 0, positionSize, premium);
        });

        it("should increment policy IDs for each purchase", async function () {
            const premium = await pricing.premiumAmount(positionSize, leverage, 0);

            // First purchase - ID 0
            await expect(pool.connect(user1).buyInsurance(positionSize, leverage, liquidationPrice, {
                value: premium
            }))
                .to.emit(pool, "InsurancePurchased")
                .withArgs(user1.address, 0, positionSize, premium);

            // Second purchase - ID 1
            await expect(pool.connect(user1).buyInsurance(positionSize, leverage, liquidationPrice, {
                value: premium
            }))
                .to.emit(pool, "InsurancePurchased")
                .withArgs(user1.address, 1, positionSize, premium);
        });
    });

    describe("CRITICAL: Multiple Policies Per User", function () {
        it("should allow same user to buy multiple insurance policies", async function () {
            const premium = await pricing.premiumAmount(positionSize, leverage, 0);

            // User1 buys first policy
            await pool.connect(user1).buyInsurance(positionSize, leverage, liquidationPrice, {
                value: premium
            });

            // User1 buys second policy - THIS SHOULD WORK NOW
            await pool.connect(user1).buyInsurance(positionSize * 2n, leverage, liquidationPrice, {
                value: premium * 2n
            });

            expect(await registry.getUserPoliciesCount(user1.address)).to.equal(2);
            expect(await registry.getActivePoliciesCount()).to.equal(2);
        });

        it("should allow user to buy 5 policies", async function () {
            const premium = await pricing.premiumAmount(positionSize, leverage, 0);

            for (let i = 0; i < 5; i++) {
                await pool.connect(user1).buyInsurance(positionSize, leverage, liquidationPrice, {
                    value: premium
                });
            }

            expect(await registry.getUserPoliciesCount(user1.address)).to.equal(5);
        });

        it("should track premiums per policy ID correctly", async function () {
            const premium1 = await pricing.premiumAmount(positionSize, leverage, 0);
            const premium2 = await pricing.premiumAmount(positionSize * 2n, leverage, 0);

            await pool.connect(user1).buyInsurance(positionSize, leverage, liquidationPrice, {
                value: premium1
            });
            await pool.connect(user1).buyInsurance(positionSize * 2n, leverage, liquidationPrice, {
                value: premium2
            });

            expect(await pool.policyPremiums(0)).to.equal(premium1);
            expect(await pool.policyPremiums(1)).to.equal(premium2);
        });
    });

    describe("submitClaim - With Policy Index", function () {
        const lossAmount = ethers.parseEther("100");
        const expectedPayout = lossAmount * 5000n / 10000n; // 50%

        beforeEach(async function () {
            const premium = await pricing.premiumAmount(positionSize, leverage, 0);

            // User buys 3 policies
            await pool.connect(user1).buyInsurance(positionSize, leverage, liquidationPrice, { value: premium });
            await pool.connect(user1).buyInsurance(positionSize * 2n, leverage, liquidationPrice, { value: premium * 2n });
            await pool.connect(user1).buyInsurance(positionSize * 3n, leverage, liquidationPrice, { value: premium * 3n });
        });

        it("should pay out claim for specific policy by index", async function () {
            const userBalanceBefore = await ethers.provider.getBalance(user1.address);

            await pool.submitClaim(user1.address, 1, lossAmount);

            const userBalanceAfter = await ethers.provider.getBalance(user1.address);
            expect(userBalanceAfter - userBalanceBefore).to.equal(expectedPayout);
        });

        it("should emit ClaimPaid event with policy ID", async function () {
            await expect(pool.submitClaim(user1.address, 1, lossAmount))
                .to.emit(pool, "ClaimPaid")
                .withArgs(user1.address, 1, lossAmount, expectedPayout);
        });

        it("should mark only the claimed policy as claimed", async function () {
            await pool.submitClaim(user1.address, 1, lossAmount);

            // Policy 1 should be claimed
            expect(await registry.isPolicyActive(user1.address, 0)).to.equal(true);
            expect(await registry.isPolicyActive(user1.address, 1)).to.equal(false);
            expect(await registry.isPolicyActive(user1.address, 2)).to.equal(true);
        });

        it("should track claims per policy ID", async function () {
            await pool.submitClaim(user1.address, 0, lossAmount);

            expect(await pool.policyClaimed(0)).to.equal(true);
            expect(await pool.policyClaimed(1)).to.equal(false);
            expect(await pool.policyClaimed(2)).to.equal(false);
        });

        it("should allow claiming different policies for same user", async function () {
            await pool.submitClaim(user1.address, 0, lossAmount);
            await pool.submitClaim(user1.address, 2, lossAmount);

            expect(await pool.policyClaimed(0)).to.equal(true);
            expect(await pool.policyClaimed(1)).to.equal(false);
            expect(await pool.policyClaimed(2)).to.equal(true);

            expect(await registry.getActivePoliciesCount()).to.equal(1);
        });

        it("should revert if policy already claimed", async function () {
            await pool.submitClaim(user1.address, 1, lossAmount);

            await expect(pool.submitClaim(user1.address, 1, lossAmount))
                .to.be.revertedWith("InsurancePool: no active policy at this index");
        });

        it("should revert for invalid policy index", async function () {
            await expect(pool.submitClaim(user1.address, 10, lossAmount))
                .to.be.revertedWith("InsurancePool: no active policy at this index");
        });

        it("should revert if caller is not admin", async function () {
            await expect(pool.connect(attacker).submitClaim(user1.address, 0, lossAmount))
                .to.be.revertedWith("InsurancePool: caller is not admin");
        });

        it("should revert for zero user address", async function () {
            await expect(pool.submitClaim(ethers.ZeroAddress, 0, lossAmount))
                .to.be.revertedWith("InsurancePool: invalid user address");
        });

        it("should revert for zero loss amount", async function () {
            await expect(pool.submitClaim(user1.address, 0, 0))
                .to.be.revertedWith("InsurancePool: loss amount must be > 0");
        });
    });

    describe("STRESS TEST: High Volume Scenarios", function () {
        it("should handle user buying 10 policies and claiming half", async function () {
            const premium = await pricing.premiumAmount(positionSize, leverage, 0);

            // Buy 10 policies
            for (let i = 0; i < 10; i++) {
                await pool.connect(user1).buyInsurance(positionSize, leverage, liquidationPrice, {
                    value: premium
                });
            }

            expect(await registry.getUserPoliciesCount(user1.address)).to.equal(10);

            // Claim even-indexed policies (0, 2, 4, 6, 8)
            const lossAmount = ethers.parseEther("10"); // Smaller loss to avoid draining pool
            for (let i = 0; i < 10; i += 2) {
                await pool.submitClaim(user1.address, i, lossAmount);
            }

            expect(await registry.getActivePoliciesCount()).to.equal(5);

            // Verify correct policies are claimed
            for (let i = 0; i < 10; i++) {
                if (i % 2 === 0) {
                    expect(await pool.policyClaimed(i)).to.equal(true);
                } else {
                    expect(await pool.policyClaimed(i)).to.equal(false);
                }
            }
        });

        it("should handle multiple users with multiple policies", async function () {
            const premium = await pricing.premiumAmount(positionSize, leverage, 0);

            // 3 users, 5 policies each
            await Promise.all([
                (async () => {
                    for (let i = 0; i < 5; i++) {
                        await pool.connect(user1).buyInsurance(positionSize, leverage, liquidationPrice, { value: premium });
                    }
                })(),
                (async () => {
                    for (let i = 0; i < 5; i++) {
                        await pool.connect(user2).buyInsurance(positionSize, leverage, liquidationPrice, { value: premium });
                    }
                })(),
                (async () => {
                    for (let i = 0; i < 5; i++) {
                        await pool.connect(user3).buyInsurance(positionSize, leverage, liquidationPrice, { value: premium });
                    }
                })()
            ]);

            expect(await registry.getActivePoliciesCount()).to.equal(15);
        });

        it("should handle buy-claim-buy cycle correctly", async function () {
            const premium = await pricing.premiumAmount(positionSize, leverage, 0);
            const lossAmount = ethers.parseEther("50");

            for (let cycle = 0; cycle < 3; cycle++) {
                // Buy
                await pool.connect(user1).buyInsurance(positionSize, leverage, liquidationPrice, {
                    value: premium
                });

                // Claim
                const policyIndex = Number(await registry.getUserPoliciesCount(user1.address)) - 1;
                await pool.submitClaim(user1.address, policyIndex, lossAmount);
            }

            // All 3 policies should exist but be claimed
            expect(await registry.getUserPoliciesCount(user1.address)).to.equal(3);
            expect(await registry.hasPolicy(user1.address)).to.equal(false); // All claimed
            expect(await registry.getActivePoliciesCount()).to.equal(0);

            // Buy one more
            await pool.connect(user1).buyInsurance(positionSize, leverage, liquidationPrice, {
                value: premium
            });

            expect(await registry.hasPolicy(user1.address)).to.equal(true);
            expect(await registry.getActivePoliciesCount()).to.equal(1);
        });
    });

    describe("Pool Accounting with Multiple Policies", function () {
        it("should correctly accumulate premiums from multiple policies", async function () {
            const premium = await pricing.premiumAmount(positionSize, leverage, 0);
            const initialBalance = await pool.poolBalance();

            // Buy 5 policies
            for (let i = 0; i < 5; i++) {
                await pool.connect(user1).buyInsurance(positionSize, leverage, liquidationPrice, {
                    value: premium
                });
            }

            expect(await pool.poolBalance()).to.equal(initialBalance + premium * 5n);
            expect(await pool.totalPremiumsCollected()).to.equal(premium * 5n);
        });

        it("should correctly track claims paid from multiple policies", async function () {
            const premium = await pricing.premiumAmount(positionSize, leverage, 0);
            const lossAmount = ethers.parseEther("50");
            const expectedPayout = lossAmount * 5000n / 10000n;

            // Buy 3 policies
            for (let i = 0; i < 3; i++) {
                await pool.connect(user1).buyInsurance(positionSize, leverage, liquidationPrice, {
                    value: premium
                });
            }

            // Claim 2 policies
            await pool.submitClaim(user1.address, 0, lossAmount);
            await pool.submitClaim(user1.address, 2, lossAmount);

            expect(await pool.totalClaimsPaid()).to.equal(expectedPayout * 2n);
        });

        it("should correctly report pool status with multiple policies", async function () {
            const premium = await pricing.premiumAmount(positionSize, leverage, 0);
            const lossAmount = ethers.parseEther("50");
            const expectedPayout = lossAmount * 5000n / 10000n;

            // Buy 4 policies
            for (let i = 0; i < 4; i++) {
                await pool.connect(user1).buyInsurance(positionSize, leverage, liquidationPrice, {
                    value: premium
                });
            }

            // Claim 1 policy
            await pool.submitClaim(user1.address, 1, lossAmount);

            const [balance, totalPremiums, totalClaims, activePolicies] = await pool.getPoolStatus();

            expect(totalPremiums).to.equal(premium * 4n);
            expect(totalClaims).to.equal(expectedPayout);
            expect(activePolicies).to.equal(3);
            expect(balance).to.equal(poolFunding + premium * 4n - expectedPayout);
        });
    });

    describe("Edge Cases", function () {
        it("should handle claiming all policies of a user", async function () {
            const premium = await pricing.premiumAmount(positionSize, leverage, 0);
            const lossAmount = ethers.parseEther("20");

            // Buy 3 policies
            for (let i = 0; i < 3; i++) {
                await pool.connect(user1).buyInsurance(positionSize, leverage, liquidationPrice, {
                    value: premium
                });
            }

            // Claim all
            for (let i = 0; i < 3; i++) {
                await pool.submitClaim(user1.address, i, lossAmount);
            }

            expect(await registry.hasPolicy(user1.address)).to.equal(false);
            expect(await registry.getActivePoliciesCount()).to.equal(0);

            // User can still buy new policy
            await pool.connect(user1).buyInsurance(positionSize, leverage, liquidationPrice, {
                value: premium
            });

            expect(await registry.hasPolicy(user1.address)).to.equal(true);
        });

        it("should handle pool draining scenario with multiple claims", async function () {
            const premium = await pricing.premiumAmount(positionSize, leverage, 0);

            // Buy 2 policies
            await pool.connect(user1).buyInsurance(positionSize, leverage, liquidationPrice, { value: premium });
            await pool.connect(user2).buyInsurance(positionSize, leverage, liquidationPrice, { value: premium });

            const poolBalance = await pool.poolBalance();
            const maxLoss = poolBalance * 10000n / 5000n; // Double pool balance to get 50% payout = pool balance

            // First claim drains the pool
            await pool.submitClaim(user1.address, 0, maxLoss);
            expect(await pool.poolBalance()).to.equal(0);

            // Second claim should fail - insufficient balance
            await expect(pool.submitClaim(user2.address, 0, ethers.parseEther("1")))
                .to.be.revertedWith("InsurancePool: insufficient pool balance");
        });

        it("should allow claims even when paused (admin action)", async function () {
            const premium = await pricing.premiumAmount(positionSize, leverage, 0);

            await pool.connect(user1).buyInsurance(positionSize, leverage, liquidationPrice, {
                value: premium
            });

            await pool.pause();

            // Claims should still work when paused
            await expect(pool.submitClaim(user1.address, 0, ethers.parseEther("50")))
                .to.emit(pool, "ClaimPaid");
        });

        it("should block new purchases when paused", async function () {
            const premium = await pricing.premiumAmount(positionSize, leverage, 0);

            await pool.pause();

            await expect(pool.connect(user1).buyInsurance(positionSize, leverage, liquidationPrice, {
                value: premium
            })).to.be.revertedWith("InsurancePool: pool is paused");
        });
    });

    describe("Admin Functions", function () {
        it("should allow admin change", async function () {
            await pool.changeAdmin(user1.address);
            expect(await pool.admin()).to.equal(user1.address);
        });

        it("should allow new admin to submit claims", async function () {
            const premium = await pricing.premiumAmount(positionSize, leverage, 0);
            await pool.connect(user2).buyInsurance(positionSize, leverage, liquidationPrice, { value: premium });

            await pool.changeAdmin(user1.address);

            // New admin can submit claim
            await expect(pool.connect(user1).submitClaim(user2.address, 0, ethers.parseEther("50")))
                .to.emit(pool, "ClaimPaid");
        });

        it("should prevent old admin from submitting claims after change", async function () {
            const premium = await pricing.premiumAmount(positionSize, leverage, 0);
            await pool.connect(user2).buyInsurance(positionSize, leverage, liquidationPrice, { value: premium });

            await pool.changeAdmin(user1.address);

            // Old admin (owner) cannot submit claim
            await expect(pool.connect(owner).submitClaim(user2.address, 0, ethers.parseEther("50")))
                .to.be.revertedWith("InsurancePool: caller is not admin");
        });

        it("should allow emergency withdraw", async function () {
            const withdrawAmount = ethers.parseEther("100");
            const adminBalanceBefore = await ethers.provider.getBalance(owner.address);

            const tx = await pool.emergencyWithdraw(withdrawAmount);
            const receipt = await tx.wait();
            const gasUsed = receipt.gasUsed * receipt.gasPrice;

            const adminBalanceAfter = await ethers.provider.getBalance(owner.address);
            expect(adminBalanceAfter).to.be.closeTo(
                adminBalanceBefore + withdrawAmount - gasUsed,
                ethers.parseEther("0.001")
            );
        });
    });

    describe("Input Validation", function () {
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

        it("should revert if premium is insufficient", async function () {
            const premium = await pricing.premiumAmount(positionSize, leverage, 0);
            const insufficientPremium = premium - 1n;

            await expect(pool.connect(user1).buyInsurance(positionSize, leverage, liquidationPrice, {
                value: insufficientPremium
            })).to.be.revertedWith("InsurancePool: insufficient premium");
        });
    });
});
