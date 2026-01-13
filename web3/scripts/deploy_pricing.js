const hre = require("hardhat");

async function main() {
    console.log("Deploying Pricing.sol to", hre.network.name);
    console.log("-------------------------------------------");

    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying with account:", deployer.address);

    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log("Account balance:", hre.ethers.formatEther(balance), "ETH");

    console.log("\n1. Deploying Pricing.sol...");
    const Pricing = await hre.ethers.getContractFactory("Pricing");
    const pricing = await Pricing.deploy();
    await pricing.waitForDeployment();
    const pricingAddress = await pricing.getAddress();

    console.log("\n-------------------------------------------");
    console.log("PRICING DEPLOYMENT COMPLETE!");
    console.log("-------------------------------------------");
    console.log(`SHARDEUM_PRICING_ADDRESS=${pricingAddress}`);
    console.log("\nNext Step: Copy the address above and run:");
    console.log(`SHARDEUM_PRICING_ADDRESS=${pricingAddress} npx hardhat run scripts/deploy_pool.js --network ${hre.network.name}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
