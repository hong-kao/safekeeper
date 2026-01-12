// [INTEGRATION-READY]
// Replace these empty arrays with the real JSON ABI from your Hardhat/Foundry build artifacts
// e.g. import InsurancePool from '../../web3/artifacts/contracts/InsurancePool.sol/InsurancePool.json';

export const INSURANCE_POOL_ABI = [
    // Placeholder ABI - Replace with Real ABI
    {
        name: 'submitClaim',
        type: 'function',
        inputs: [
            { name: 'user', type: 'address' },
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
];

export const PRICING_ABI = [
    // Placeholder ABI - Replace with Real ABI
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
];

export const POLICY_REGISTRY_ABI = [
    // Placeholder ABI - Replace with Real ABI
];
