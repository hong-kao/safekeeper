const hre = require("hardhat");

async function main() {
    console.log("Deploying SafeKeeper contracts to", hre.network.name);
    console.log("-------------------------------------------");

    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying with account:", deployer.address);

    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log("Account balance:", hre.ethers.formatEther(balance), "ETH");
    console.log("-------------------------------------------");

    //deploy pricing first (no dependencies)
    console.log("\n1. Deploying Pricing.sol...");
    const Pricing = await hre.ethers.getContractFactory("Pricing");
    const pricing = await Pricing.deploy();
    await pricing.waitForDeployment();
    const pricingAddress = await pricing.getAddress();
    console.log("   Pricing deployed to:", pricingAddress);

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
    console.log("DEPLOYMENT COMPLETE!");
    console.log("-------------------------------------------");
    console.log("\nContract Addresses:");
    console.log("  PRICING_ADDRESS=" + pricingAddress);
    console.log("  INSURANCE_POOL_ADDRESS=" + insurancePoolAddress);
    console.log("  POLICY_REGISTRY_ADDRESS=" + policyRegistryAddress);
    console.log("\nUpdate your .env files with these addresses.");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
