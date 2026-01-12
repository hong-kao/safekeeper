import { walletClient, publicClient } from '../config/viem.js';
import { INSURANCE_POOL_ABI } from '../config/contractABIs.js';

const POOL_ADDRESS = process.env.INSURANCE_POOL_ADDRESS || '0x0000000000000000000000000000000000000000';
const MOCK_MODE = process.env.MOCK_WEB3 !== 'false'; // Default to mock for now

/**
 * Submit a claim to InsurancePool contract
 */
export async function submitClaimOnChain(userAddress, lossAmount) {
    if (MOCK_MODE) {
        return mockClaimSubmission(userAddress, lossAmount);
    }

    // [INTEGRATION-READY] Real Logic
    try {
        console.log(`[CLAIM] Submitting claim for ${userAddress} on-chain...`);
        const txHash = await walletClient.writeContract({
            address: POOL_ADDRESS,
            abi: INSURANCE_POOL_ABI,
            functionName: 'submitClaim',
            args: [userAddress, BigInt(lossAmount)],
        });
        console.log(`[CLAIM] ✅ TX submitted: ${txHash}`);
        return { txHash };
    } catch (error) {
        console.error(`[CLAIM] ❌ Error submitting claim:`, error.message);
        throw error;
    }
}

/**
 * Get current pool status from contract
 */
export async function getPoolStatus() {
    if (MOCK_MODE) {
        return {
            poolBalance: "50000000000000000000", // 50 ETH
            totalPremiums: "1000000000000000000", // 1 ETH 
            totalClaims: "0",
            activePolicies: "5"
        };
    }

    // [INTEGRATION-READY] Real Logic
    try {
        const [balance, totalPremiums, totalClaims, activePolicies] =
            await publicClient.readContract({
                address: POOL_ADDRESS,
                abi: INSURANCE_POOL_ABI,
                functionName: 'getPoolStatus',
            });

        return {
            poolBalance: balance.toString(),
            totalPremiums: totalPremiums.toString(),
            totalClaims: totalClaims.toString(),
            activePolicies: activePolicies.toString(),
        };
    } catch (error) {
        console.error('[POOL] Error fetching pool status:', error);
        return null;
    }
}

function mockClaimSubmission(userAddress, lossAmount) {
    const fakeTxHash = `0x${Math.random().toString(16).slice(2).padStart(64, '0')}`;
    console.log(`[MOCK-CLAIM] Simulated claim for ${userAddress}. Fake TX: ${fakeTxHash}`);
    return { txHash: fakeTxHash };
}
