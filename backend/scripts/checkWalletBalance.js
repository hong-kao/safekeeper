import { createPublicClient, http, formatEther } from 'viem';
import chalk from 'chalk';

// Default user address - can be overridden by argument
const DEFAULT_USER = '0xd59c68120cc66f7fb5de7fba60356a1b782c2630';
const USER_ADDRESS = process.argv[2] || DEFAULT_USER;

const client = createPublicClient({
    transport: http('https://virtual.arbitrum.eu.rpc.tenderly.co/ff28be66-f799-4f55-9170-1cd3377aed28')
});

async function main() {
    console.log(chalk.blue('═══════════════════════════════════════════'));
    console.log(chalk.bold('💰 Checking Wallet Balance'));
    console.log(chalk.blue('═══════════════════════════════════════════'));
    console.log(`User: ${chalk.cyan(USER_ADDRESS)}`);

    try {
        const balance = await client.getBalance({ address: USER_ADDRESS });
        const ethBalance = formatEther(balance);

        console.log(`Balance: ${chalk.green.bold(ethBalance)} ETH`);

        // Format for readability if large
        const num = parseFloat(ethBalance);
        if (num > 1000000) {
            console.log(`Readable: ${chalk.yellow((num / 1000000).toFixed(2) + ' Million')} ETH`);
        }
    } catch (error) {
        console.error(chalk.red('❌ Error fetching balance:'), error.message);
    }
    console.log(chalk.blue('═══════════════════════════════════════════'));
}

main();
