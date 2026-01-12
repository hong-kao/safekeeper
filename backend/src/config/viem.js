import { createPublicClient, createWalletClient, http } from 'viem';
import { arbitrumSepolia } from 'viem/chains';
import dotenv from 'dotenv';
dotenv.config();

const rpcUrl = process.env.RPC_URL || 'http://127.0.0.1:8545';

// [INTEGRATION-READY]
// This client reads data from the blockchain
export const publicClient = createPublicClient({
    chain: arbitrumSepolia,
    transport: http(rpcUrl),
});

// [INTEGRATION-READY]
// This client signs transactions (requires PRIVATE_KEY)
// We default to a dummy account if key is missing to avoid crashes before integration
export const walletClient = createWalletClient({
    chain: arbitrumSepolia,
    transport: http(rpcUrl),
    account: process.env.ADMIN_PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
});

console.log('✅ VIEM clients initialized (Integration Ready)');
