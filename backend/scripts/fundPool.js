// Script to fund the InsurancePool by sending ETH (triggers receive() function)
import { createWalletClient, createPublicClient, http, parseEther, formatEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

const POOL_ADDRESS = '0xd617201175a75573B978bcEff63aABa111077b22';
const RPC_URL = 'https://virtual.arbitrum.eu.rpc.tenderly.co/ff28be66-f799-4f55-9170-1cd3377aed28';
const PRIVATE_KEY = '0x' + '0c3a82ad1cb35a4d8b1e02d9d51b8a7bc6e4c03c2c2d58127ae3e5d3b9e27b6f'.padStart(64, '0'); // Your deployer key

async function main() {
    const account = privateKeyToAccount(process.env.PRIVATE_KEY || PRIVATE_KEY);

    const publicClient = createPublicClient({
        transport: http(RPC_URL)
    });

    const walletClient = createWalletClient({
        account,
        transport: http(RPC_URL)
    });

    console.log('Sender:', account.address);

    // Check current balances
    const poolEthBalance = await publicClient.getBalance({ address: POOL_ADDRESS });
    console.log('Pool ETH Balance:', formatEther(poolEthBalance), 'ETH');

    const poolBalanceAbi = [{ name: 'poolBalance', type: 'function', inputs: [], outputs: [{ type: 'uint256' }], stateMutability: 'view' }];
    const poolBalance = await publicClient.readContract({
        address: POOL_ADDRESS,
        abi: poolBalanceAbi,
        functionName: 'poolBalance'
    });
    console.log('Pool Internal Balance:', formatEther(poolBalance), 'ETH');

    // Send 300000 ETH to the pool (this will trigger receive() and update poolBalance)
    console.log('\nSending 300000 ETH to pool...');
    const hash = await walletClient.sendTransaction({
        to: POOL_ADDRESS,
        value: parseEther('300000')
    });
    console.log('TX Hash:', hash);

    // Wait for confirmation
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log('TX Confirmed in block:', receipt.blockNumber);

    // Check new balance
    const newPoolBalance = await publicClient.readContract({
        address: POOL_ADDRESS,
        abi: poolBalanceAbi,
        functionName: 'poolBalance'
    });
    console.log('\nNew Pool Internal Balance:', formatEther(newPoolBalance), 'ETH');
}

main().catch(console.error);
