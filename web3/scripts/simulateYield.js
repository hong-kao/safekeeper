const hre = require("hardhat");

async function main() {
    const [signer] = await hre.ethers.getSigners();
    const poolAddress = process.env.INSURANCE_POOL_ADDRESS || "0x03761c03b47001daF26Fdd4FF2eb0B777a60bD04";
    const amount = process.env.YIELD_AMOUNT || "2.0";

    console.log(`\n💰 Simulating Yield Generation...`);
    console.log(`   Network: ${hre.network.name}`);
    console.log(`   Pool:    ${poolAddress}`);
    console.log(`   Amount:  ${amount} ETH`);
    console.log(`   Sender:  ${signer.address}\n`);

    const tx = await signer.sendTransaction({
        to: poolAddress,
        value: hre.ethers.parseEther(amount)
    });

    console.log(`⏳ Transaction sent: ${tx.hash}`);
    await tx.wait();

    console.log(`✅ Yield Simulated Successfully!`);
    console.log(`   The pool's "Underlying Balance" has increased.`);
    console.log(`   LPs should now see increased value in their positions.\n`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
