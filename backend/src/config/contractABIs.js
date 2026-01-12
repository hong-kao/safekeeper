//smart contract abis
import dotenv from 'dotenv';
dotenv.config();

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
        name: 'submitClaim',
        type: 'function',
        inputs: [
            { name: 'user', type: 'address' },
            { name: 'policyIndex', type: 'uint256' },
            { name: 'lossAmount', type: 'uint256' },
        ],
        outputs: [],
        stateMutability: 'nonpayable',
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
    {
        name: 'paused',
        type: 'function',
        inputs: [],
        outputs: [{ name: '', type: 'bool' }],
        stateMutability: 'view',
    },
    {
        type: 'event',
        name: 'InsurancePurchased',
        inputs: [
            { name: 'user', type: 'address', indexed: true },
            { name: 'positionSize', type: 'uint256', indexed: false },
            { name: 'premium', type: 'uint256', indexed: false },
        ],
    },
    {
        type: 'event',
        name: 'ClaimPaid',
        inputs: [
            { name: 'user', type: 'address', indexed: true },
            { name: 'lossAmount', type: 'uint256', indexed: false },
            { name: 'payoutAmount', type: 'uint256', indexed: false },
        ],
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
    {
        name: 'BASE_PREMIUM',
        type: 'function',
        inputs: [],
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
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
    {
        name: 'getActivePoliciesCount',
        type: 'function',
        inputs: [],
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
    },
    {
        type: 'event',
        name: 'PolicyCreated',
        inputs: [
            { name: 'user', type: 'address', indexed: true },
            { name: 'positionSize', type: 'uint256', indexed: false },
            { name: 'leverage', type: 'uint256', indexed: false },
            { name: 'premium', type: 'uint256', indexed: false },
        ],
    },
    {
        type: 'event',
        name: 'PolicyClaimed',
        inputs: [
            { name: 'user', type: 'address', indexed: true },
            { name: 'claimedAt', type: 'uint256', indexed: false },
        ],
    },
];

//contract addresses from env
export const CONTRACTS = {
    insurancePool: process.env.INSURANCE_POOL_ADDRESS,
    pricing: process.env.PRICING_ADDRESS,
    policyRegistry: process.env.POLICY_REGISTRY_ADDRESS,
};

console.log(`✅ Contract addresses loaded:`);
console.log(`   InsurancePool: ${CONTRACTS.insurancePool}`);
console.log(`   Pricing: ${CONTRACTS.pricing}`);
console.log(`   PolicyRegistry: ${CONTRACTS.policyRegistry}`);
