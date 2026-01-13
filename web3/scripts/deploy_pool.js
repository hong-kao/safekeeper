const hre = require("hardhat");

async function main() {
    const pricingAddress = process.env.SHARDEUM_PRICING_ADDRESS;

    if (!pricingAddress) {
        console.error("❌ Error: SHARDEUM_PRICING_ADDRESS environment variable is not set.");
        console.error("Please run deploy_pricing.js first, or set the variable manually.");
        console.error("Example: SHARDEUM_PRICING_ADDRESS=0x... npx hardhat run scripts/deploy_pool.js");
        process.exit(1);
    }

    console.log("Deploying Pool to", hre.network.name);
    console.log("Using Pricing Address:", pricingAddress);
    console.log("-------------------------------------------");

    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying with account:", deployer.address);

    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log("Account balance:", hre.ethers.formatEther(balance), "ETH");

    //deploy insurancepool (which deploys policyregistry internally)
    console.log("\n2. Deploying InsurancePool.sol...");
    const InsurancePool = await hre.ethers.getContractFactory("InsurancePool");
    const insurancePool = await InsurancePool.deploy(pricingAddress);
    await insurancePool.waitForDeployment();
    const insurancePoolAddress = await insurancePool.getAddress();
    console.log("   InsurancePool deployed to:", insurancePoolAddress);

    //get policyregistry address from insurancepool
    const policyRegistryAddress = await insurancePool.policyRegistry();
    console.log("   PolicyRegistry deployed to:", policyRegistryAddress);

    console.log("\n-------------------------------------------");
    console.log("POOL DEPLOYMENT COMPLETE!");
    console.log("-------------------------------------------");
    console.log(`SHARDEUM_INSURANCE_POOL_ADDRESS=${insurancePoolAddress}`);
    console.log(`SHARDEUM_POLICY_REGISTRY_ADDRESS=${policyRegistryAddress}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
