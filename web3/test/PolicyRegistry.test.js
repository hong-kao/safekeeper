const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PolicyRegistry", function () {
    let registry;
    let owner, pool, user1, user2, attacker;

    beforeEach(async function () {
        [owner, pool, user1, user2, attacker] = await ethers.getSigners();

        const PolicyRegistry = await ethers.getContractFactory("PolicyRegistry");
        registry = await PolicyRegistry.deploy(pool.address);
        await registry.waitForDeployment();
    });

    describe("Deployment", function () {
        it("should set the insurance pool address correctly", async function () {
            expect(await registry.insurancePool()).to.equal(pool.address);
        });

        it("should revert if initialized with zero address", async function () {
            const PolicyRegistry = await ethers.getContractFactory("PolicyRegistry");
            await expect(PolicyRegistry.deploy(ethers.ZeroAddress))
                .to.be.revertedWith("PolicyRegistry: invalid pool address");
        });
    });

    describe("createPolicy", function () {
        const positionSize = ethers.parseEther("50000");
        const leverage = 10n;
        const liquidationPrice = ethers.parseEther("2850");
        const premium = ethers.parseEther("500");

        it("should create a policy successfully", async function () {
            await registry.connect(pool).createPolicy(
                user1.address, positionSize, leverage, liquidationPrice, premium
            );

            const policy = await registry.getPolicy(user1.address);
            expect(policy.user).to.equal(user1.address);
            expect(policy.positionSize).to.equal(positionSize);
            expect(policy.leverage).to.equal(leverage);
            expect(policy.liquidationPrice).to.equal(liquidationPrice);
            expect(policy.premiumPaid).to.equal(premium);
            expect(policy.claimed).to.equal(false);
        });

        it("should emit PolicyCreated event", async function () {
            await expect(registry.connect(pool).createPolicy(
                user1.address, positionSize, leverage, liquidationPrice, premium
            ))
                .to.emit(registry, "PolicyCreated")
                .withArgs(user1.address, positionSize, leverage, premium);
        });

        it("should mark user as having active policy", async function () {
            await registry.connect(pool).createPolicy(
                user1.address, positionSize, leverage, liquidationPrice, premium
            );
            expect(await registry.hasPolicy(user1.address)).to.equal(true);
        });

        it("should increment active policies count", async function () {
            expect(await registry.getActivePoliciesCount()).to.equal(0);

            await registry.connect(pool).createPolicy(
                user1.address, positionSize, leverage, liquidationPrice, premium
            );
            expect(await registry.getActivePoliciesCount()).to.equal(1);

            await registry.connect(pool).createPolicy(
                user2.address, positionSize, leverage, liquidationPrice, premium
            );
            expect(await registry.getActivePoliciesCount()).to.equal(2);
        });

        it("should revert on double creation for same user", async function () {
            await registry.connect(pool).createPolicy(
                user1.address, positionSize, leverage, liquidationPrice, premium
            );

            await expect(registry.connect(pool).createPolicy(
                user1.address, positionSize, leverage, liquidationPrice, premium
            )).to.be.revertedWith("PolicyRegistry: user already has an active policy");
        });

        it("should revert if caller is not the pool", async function () {
            await expect(registry.connect(attacker).createPolicy(
                user1.address, positionSize, leverage, liquidationPrice, premium
            )).to.be.revertedWith("PolicyRegistry: caller is not the insurance pool");
        });

        it("should revert for zero address user", async function () {
            await expect(registry.connect(pool).createPolicy(
                ethers.ZeroAddress, positionSize, leverage, liquidationPrice, premium
            )).to.be.revertedWith("PolicyRegistry: invalid user address");
        });
    });

    describe("markClaimed", function () {
        const positionSize = ethers.parseEther("50000");
        const leverage = 10n;
        const liquidationPrice = ethers.parseEther("2850");
        const premium = ethers.parseEther("500");

        beforeEach(async function () {
            await registry.connect(pool).createPolicy(
                user1.address, positionSize, leverage, liquidationPrice, premium
            );
        });

        it("should mark policy as claimed", async function () {
            await registry.connect(pool).markClaimed(user1.address);

            const policy = await registry.getPolicy(user1.address);
            expect(policy.claimed).to.equal(true);
            expect(policy.claimedAt).to.be.gt(0);
        });

        it("should emit PolicyClaimed event", async function () {
            await expect(registry.connect(pool).markClaimed(user1.address))
                .to.emit(registry, "PolicyClaimed");
        });

        it("should remove user from active policies", async function () {
            expect(await registry.hasPolicy(user1.address)).to.equal(true);
            await registry.connect(pool).markClaimed(user1.address);
            expect(await registry.hasPolicy(user1.address)).to.equal(false);
        });

        it("should decrement active policies count", async function () {
            expect(await registry.getActivePoliciesCount()).to.equal(1);
            await registry.connect(pool).markClaimed(user1.address);
            expect(await registry.getActivePoliciesCount()).to.equal(0);
        });

        it("should revert if policy already claimed", async function () {
            await registry.connect(pool).markClaimed(user1.address);

            await expect(registry.connect(pool).markClaimed(user1.address))
                .to.be.revertedWith("PolicyRegistry: no active policy for user");
        });

        it("should revert if user has no policy", async function () {
            await expect(registry.connect(pool).markClaimed(user2.address))
                .to.be.revertedWith("PolicyRegistry: no active policy for user");
        });

        it("should revert if caller is not the pool", async function () {
            await expect(registry.connect(attacker).markClaimed(user1.address))
                .to.be.revertedWith("PolicyRegistry: caller is not the insurance pool");
        });
    });

    describe("hasPolicy", function () {
        it("should return false for user with no policy", async function () {
            expect(await registry.hasPolicy(user1.address)).to.equal(false);
        });

        it("should return true for user with active policy", async function () {
            await registry.connect(pool).createPolicy(
                user1.address, ethers.parseEther("50000"), 10, ethers.parseEther("2850"), ethers.parseEther("500")
            );
            expect(await registry.hasPolicy(user1.address)).to.equal(true);
        });

        it("should return false after policy is claimed", async function () {
            await registry.connect(pool).createPolicy(
                user1.address, ethers.parseEther("50000"), 10, ethers.parseEther("2850"), ethers.parseEther("500")
            );
            await registry.connect(pool).markClaimed(user1.address);
            expect(await registry.hasPolicy(user1.address)).to.equal(false);
        });
    });

    describe("getPolicy", function () {
        it("should return empty policy for non-existent user", async function () {
            const policy = await registry.getPolicy(user1.address);
            expect(policy.user).to.equal(ethers.ZeroAddress);
            expect(policy.positionSize).to.equal(0);
        });

        it("should return full policy struct", async function () {
            const positionSize = ethers.parseEther("50000");
            const leverage = 10n;
            const liquidationPrice = ethers.parseEther("2850");
            const premium = ethers.parseEther("500");

            await registry.connect(pool).createPolicy(
                user1.address, positionSize, leverage, liquidationPrice, premium
            );

            const policy = await registry.getPolicy(user1.address);
            expect(policy.user).to.equal(user1.address);
            expect(policy.positionSize).to.equal(positionSize);
            expect(policy.leverage).to.equal(leverage);
            expect(policy.liquidationPrice).to.equal(liquidationPrice);
            expect(policy.premiumPaid).to.equal(premium);
            expect(policy.createdAt).to.be.gt(0);
            expect(policy.claimed).to.equal(false);
            expect(policy.claimedAt).to.equal(0);
        });
    });

    describe("getActivePoliciesCount", function () {
        it("should return 0 initially", async function () {
            expect(await registry.getActivePoliciesCount()).to.equal(0);
        });

        it("should correctly track multiple policies", async function () {
            await registry.connect(pool).createPolicy(
                user1.address, ethers.parseEther("50000"), 10, ethers.parseEther("2850"), ethers.parseEther("500")
            );
            await registry.connect(pool).createPolicy(
                user2.address, ethers.parseEther("100000"), 20, ethers.parseEther("2800"), ethers.parseEther("1000")
            );
            expect(await registry.getActivePoliciesCount()).to.equal(2);
        });

        it("should update after claims", async function () {
            await registry.connect(pool).createPolicy(
                user1.address, ethers.parseEther("50000"), 10, ethers.parseEther("2850"), ethers.parseEther("500")
            );
            await registry.connect(pool).createPolicy(
                user2.address, ethers.parseEther("100000"), 20, ethers.parseEther("2800"), ethers.parseEther("1000")
            );

            await registry.connect(pool).markClaimed(user1.address);
            expect(await registry.getActivePoliciesCount()).to.equal(1);

            await registry.connect(pool).markClaimed(user2.address);
            expect(await registry.getActivePoliciesCount()).to.equal(0);
        });
    });

    describe("setInsurancePool", function () {
        it("should update insurance pool address", async function () {
            const newPool = attacker.address; // just using another address for testing
            await registry.connect(pool).setInsurancePool(newPool);
            expect(await registry.insurancePool()).to.equal(newPool);
        });

        it("should emit InsurancePoolSet event", async function () {
            const newPool = attacker.address;
            await expect(registry.connect(pool).setInsurancePool(newPool))
                .to.emit(registry, "InsurancePoolSet")
                .withArgs(newPool);
        });

        it("should revert if caller is not current pool", async function () {
            await expect(registry.connect(attacker).setInsurancePool(attacker.address))
                .to.be.revertedWith("PolicyRegistry: caller is not the insurance pool");
        });

        it("should revert if new pool is zero address", async function () {
            await expect(registry.connect(pool).setInsurancePool(ethers.ZeroAddress))
                .to.be.revertedWith("PolicyRegistry: invalid pool address");
        });
    });

    describe("Edge Cases & Stress Tests", function () {
        it("should handle multiple users sequentially", async function () {
            const addresses = [];
            for (let i = 0; i < 10; i++) {
                const signer = ethers.getAddress("0x" + (i + 1).toString().padStart(40, "0"));
                addresses.push(signer);
            }

            // Create 10 policies
            for (let i = 0; i < 10; i++) {
                await registry.connect(pool).createPolicy(
                    addresses[i],
                    ethers.parseEther("50000"),
                    10,
                    ethers.parseEther("2850"),
                    ethers.parseEther("500")
                );
            }

            expect(await registry.getActivePoliciesCount()).to.equal(10);

            // Mark some as claimed
            await registry.connect(pool).markClaimed(addresses[0]);
            await registry.connect(pool).markClaimed(addresses[5]);
            expect(await registry.getActivePoliciesCount()).to.equal(8);

            // Verify others still active
            expect(await registry.hasPolicy(addresses[1])).to.equal(true);
            expect(await registry.hasPolicy(addresses[0])).to.equal(false);
        });

        it("should handle claimed policy re-creation (new policy after claim)", async function () {
            // Create, claim, then create again for same user
            await registry.connect(pool).createPolicy(
                user1.address, ethers.parseEther("50000"), 10, ethers.parseEther("2850"), ethers.parseEther("500")
            );

            await registry.connect(pool).markClaimed(user1.address);
            expect(await registry.hasPolicy(user1.address)).to.equal(false);

            // User can create a new policy after claim
            await registry.connect(pool).createPolicy(
                user1.address, ethers.parseEther("100000"), 20, ethers.parseEther("2800"), ethers.parseEther("1000")
            );

            const policy = await registry.getPolicy(user1.address);
            expect(policy.positionSize).to.equal(ethers.parseEther("100000"));
            expect(policy.claimed).to.equal(false);
        });

        it("should preserve policy data correctly after getPolicy", async function () {
            const positionSize = ethers.parseEther("50000");
            const leverage = 15n;
            const liquidationPrice = ethers.parseEther("2950");
            const premium = ethers.parseEther("750");

            await registry.connect(pool).createPolicy(
                user1.address, positionSize, leverage, liquidationPrice, premium
            );

            const policy1 = await registry.getPolicy(user1.address);
            const policy2 = await registry.getPolicy(user1.address);

            // Should be identical
            expect(policy1.user).to.equal(policy2.user);
            expect(policy1.positionSize).to.equal(policy2.positionSize);
            expect(policy1.leverage).to.equal(policy2.leverage);
            expect(policy1.liquidationPrice).to.equal(policy2.liquidationPrice);
            expect(policy1.premiumPaid).to.equal(policy2.premiumPaid);
        });

        it("should correctly track createdAt timestamp", async function () {
            const blockBefore = await ethers.provider.getBlock("latest");

            await registry.connect(pool).createPolicy(
                user1.address, ethers.parseEther("50000"), 10, ethers.parseEther("2850"), ethers.parseEther("500")
            );

            const blockAfter = await ethers.provider.getBlock("latest");
            const policy = await registry.getPolicy(user1.address);

            // createdAt should be between blockBefore and blockAfter timestamps
            expect(policy.createdAt).to.be.gte(blockBefore.timestamp);
            expect(policy.createdAt).to.be.lte(blockAfter.timestamp);
        });

        it("should correctly track claimedAt timestamp", async function () {
            await registry.connect(pool).createPolicy(
                user1.address, ethers.parseEther("50000"), 10, ethers.parseEther("2850"), ethers.parseEther("500")
            );

            const blockBefore = await ethers.provider.getBlock("latest");

            await registry.connect(pool).markClaimed(user1.address);

            const blockAfter = await ethers.provider.getBlock("latest");
            const policy = await registry.getPolicy(user1.address);

            // claimedAt should be between blockBefore and blockAfter timestamps
            expect(policy.claimedAt).to.be.gte(blockBefore.timestamp);
            expect(policy.claimedAt).to.be.lte(blockAfter.timestamp);
        });

        it("should handle zero premium edge case", async function () {
            await registry.connect(pool).createPolicy(
                user1.address, ethers.parseEther("50000"), 10, ethers.parseEther("2850"), 0
            );

            const policy = await registry.getPolicy(user1.address);
            expect(policy.premiumPaid).to.equal(0);
            expect(policy.claimed).to.equal(false);
        });

        it("should handle very large premium", async function () {
            const hugePremium = ethers.parseEther("1000000");

            await registry.connect(pool).createPolicy(
                user1.address, ethers.parseEther("50000"), 10, ethers.parseEther("2850"), hugePremium
            );

            const policy = await registry.getPolicy(user1.address);
            expect(policy.premiumPaid).to.equal(hugePremium);
        });

        it("should handle liquidation price edge cases", async function () {
            // Very small liquidation price
            await registry.connect(pool).createPolicy(
                user1.address, ethers.parseEther("50000"), 10, ethers.parseEther("0.001"), ethers.parseEther("500")
            );

            const policy1 = await registry.getPolicy(user1.address);
            expect(policy1.liquidationPrice).to.equal(ethers.parseEther("0.001"));

            await registry.connect(pool).markClaimed(user1.address);

            // Very large liquidation price
            await registry.connect(pool).createPolicy(
                user1.address, ethers.parseEther("50000"), 10, ethers.parseEther("999999"), ethers.parseEther("500")
            );

            const policy2 = await registry.getPolicy(user1.address);
            expect(policy2.liquidationPrice).to.equal(ethers.parseEther("999999"));
        });

        it("should maintain consistency across multiple claims", async function () {
            // Create 3 policies
            await registry.connect(pool).createPolicy(
                user1.address, ethers.parseEther("50000"), 10, ethers.parseEther("2850"), ethers.parseEther("500")
            );
            await registry.connect(pool).createPolicy(
                user2.address, ethers.parseEther("100000"), 20, ethers.parseEther("2800"), ethers.parseEther("1000")
            );
            await registry.connect(pool).createPolicy(
                attacker.address, ethers.parseEther("75000"), 15, ethers.parseEther("2900"), ethers.parseEther("750")
            );

            expect(await registry.getActivePoliciesCount()).to.equal(3);

            // Claim first
            await registry.connect(pool).markClaimed(user1.address);
            expect(await registry.getActivePoliciesCount()).to.equal(2);
            expect(await registry.hasPolicy(user1.address)).to.equal(false);
            expect(await registry.hasPolicy(user2.address)).to.equal(true);

            // Claim second
            await registry.connect(pool).markClaimed(user2.address);
            expect(await registry.getActivePoliciesCount()).to.equal(1);
            expect(await registry.hasPolicy(user2.address)).to.equal(false);
            expect(await registry.hasPolicy(attacker.address)).to.equal(true);

            // Claim third
            await registry.connect(pool).markClaimed(attacker.address);
            expect(await registry.getActivePoliciesCount()).to.equal(0);
            expect(await registry.hasPolicy(attacker.address)).to.equal(false);
        });
    });
});
