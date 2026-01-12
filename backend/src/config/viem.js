//viem client configuration for tenderly testnet

import { createPublicClient, createWalletClient, http, defineChain } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import dotenv from 'dotenv';

dotenv.config();

//get tenderly rpc url (prioritize TENDERLY_RPC_URL, fallback to RPC_URL)
const rpcUrl = process.env.TENDERLY_RPC_URL || process.env.RPC_URL || 'http://127.0.0.1:8545';
const chainId = parseInt(process.env.TENDERLY_CHAIN_ID || process.env.CHAIN_ID || '73571');

//define tenderly virtual testnet chain
const tenderlyChain = defineChain({
    id: chainId,
    name: 'Tenderly Virtual TestNet',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: {
        default: { http: [rpcUrl] },
    },
});

//public client for reading blockchain data
export const publicClient = createPublicClient({
    chain: tenderlyChain,
    transport: http(rpcUrl),
});

//get private key and ensure 0x prefix
let privateKey = process.env.DEPLOYER_PRIVATE_KEY || process.env.ADMIN_PRIVATE_KEY || '';

//add 0x prefix if missing
if (privateKey && !privateKey.startsWith('0x')) {
    privateKey = '0x' + privateKey;
}

//fallback to hardhat default if no key provided
if (!privateKey || privateKey === '0x') {
    privateKey = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
    console.log('⚠️  Using default Hardhat private key (for testing only)');
}

//create account from private key
const account = privateKeyToAccount(privateKey);

//wallet client for signing transactions
export const walletClient = createWalletClient({
    chain: tenderlyChain,
    transport: http(rpcUrl),
    account,
});

console.log(`✅ VIEM clients initialized`);
console.log(`   RPC: ${rpcUrl.substring(0, 60)}...`);
console.log(`   Chain ID: ${chainId}`);
console.log(`   Admin: ${account.address}`);

export { account };
