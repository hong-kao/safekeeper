import { createPublicClient, createWalletClient, http, custom, defineChain } from 'viem';
import { hardhat, arbitrumSepolia } from 'viem/chains';

const rpcUrl = import.meta.env.VITE_RPC_URL || 'http://127.0.0.1:8545';
const chainId = parseInt(import.meta.env.VITE_CHAIN_ID || '31337');

// Define chain based on environment
let chain;
if (chainId === 31337) {
    chain = hardhat;
} else if (chainId === 421614) {
    chain = arbitrumSepolia;
} else {
    // Custom chain (e.g., Tenderly Virtual TestNet)
    chain = defineChain({
        id: chainId,
        name: import.meta.env.VITE_CHAIN_NAME || 'Tenderly Virtual TestNet',
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
        rpcUrls: {
            default: { http: [rpcUrl] },
        },
    });
}

export const publicClient = createPublicClient({
    chain,
    transport: http(rpcUrl),
});

// Export chain info for switching
export const targetChain = chain;
export const targetChainId = chainId;

// Helper function to switch wallet to correct chain
export const switchToCorrectChain = async () => {
    if (typeof window === 'undefined' || !window.ethereum) return false;

    try {
        await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: `0x${chainId.toString(16)}` }],
        });
        return true;
    } catch (switchError) {
        // Chain doesn't exist, try to add it
        if (switchError.code === 4902) {
            try {
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [{
                        chainId: `0x${chainId.toString(16)}`,
                        chainName: chain.name || 'Tenderly Virtual TestNet',
                        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
                        rpcUrls: [rpcUrl],
                    }],
                });
                return true;
            } catch (addError) {
                console.error('Failed to add chain:', addError);
                return false;
            }
        }
        console.error('Failed to switch chain:', switchError);
        return false;
    }
};

export let walletClient = null;

export const initWalletClient = async () => {
    if (typeof window !== 'undefined' && window.ethereum) {
        walletClient = createWalletClient({
            chain,
            transport: custom(window.ethereum),
        });
        return walletClient;
    }
    return null;
};

export const INSURANCE_POOL_ABI = [
    {
        name: 'buyInsurance',
        type: 'function',
        inputs: [
            { name: 'positionSize', type: 'uint256' },
            { name: 'leverage', type: 'uint256' },
            { name: 'liquidationPrice', type: 'uint256' },
        ],
        outputs: [],
        stateMutability: 'payable',
    },
    {
        name: 'getPoolStatus',
        type: 'function',
        inputs: [],
        outputs: [
            { name: 'balance', type: 'uint256' },
            { name: 'totalPremiums', type: 'uint256' },
            { name: 'totalClaims', type: 'uint256' },
            { name: 'activePolicies', type: 'uint256' },
        ],
        stateMutability: 'view',
    },
    {
        name: 'poolBalance',
        type: 'function',
        inputs: [],
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
    },
];

export const PRICING_ABI = [
    {
        name: 'premiumAmount',
        type: 'function',
        inputs: [
            { name: 'positionSize', type: 'uint256' },
            { name: 'leverage', type: 'uint256' },
            { name: 'volatility', type: 'uint256' },
        ],
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'pure',
    },
    {
        name: 'calculatePremium',
        type: 'function',
        inputs: [
            { name: 'leverage', type: 'uint256' },
            { name: 'volatility', type: 'uint256' },
        ],
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'pure',
    },
];

export const POLICY_REGISTRY_ABI = [
    {
        name: 'getPolicy',
        type: 'function',
        inputs: [{ name: 'user', type: 'address' }],
        outputs: [
            {
                name: '',
                type: 'tuple',
                components: [
                    { name: 'user', type: 'address' },
                    { name: 'positionSize', type: 'uint256' },
                    { name: 'leverage', type: 'uint256' },
                    { name: 'liquidationPrice', type: 'uint256' },
                    { name: 'premiumPaid', type: 'uint256' },
                    { name: 'createdAt', type: 'uint256' },
                    { name: 'claimed', type: 'bool' },
                    { name: 'claimedAt', type: 'uint256' },
                ],
            },
        ],
        stateMutability: 'view',
    },
    {
        name: 'hasPolicy',
        type: 'function',
        inputs: [{ name: 'user', type: 'address' }],
        outputs: [{ name: '', type: 'bool' }],
        stateMutability: 'view',
    },
];

export const CONTRACTS = {
    insurancePool: import.meta.env.VITE_INSURANCE_POOL_ADDRESS,
    pricing: import.meta.env.VITE_PRICING_ADDRESS,
    policyRegistry: import.meta.env.VITE_POLICY_REGISTRY_ADDRESS,
};
