//claim submission service for on-chain transactions

import { walletClient, publicClient } from '../config/viem.js';
import { INSURANCE_POOL_ABI, CONTRACTS } from '../config/contractABIs.js';

/**
 * submit a claim to insurancepool contract
 * @param {string} userAddress - user who should receive payout
 * @param {number} policyIndex - on-chain policy index (0-based)
 * @param {string} lossAmount - loss amount (in wei)
 * @returns {Promise<object>} { txHash, blockNumber, gasUsed }
 */
export async function submitClaimOnChain(userAddress, policyIndex, lossAmount) {
    // Check MOCK_MODE at runtime (not module load time)
    const MOCK_MODE = process.env.MOCK_WEB3 === 'true';
    console.log(`[CLAIM] MOCK_WEB3 env: ${process.env.MOCK_WEB3}, MOCK_MODE: ${MOCK_MODE}`);

    if (MOCK_MODE) {
        return mockClaimSubmission(userAddress, lossAmount);
    }

    try {
        console.log(`[CLAIM] Submitting claim for ${userAddress}`);
        console.log(`[CLAIM] Policy Index: ${policyIndex}`);
        console.log(`[CLAIM] Loss amount: ${lossAmount} wei`);
        console.log(`[CLAIM] Pool address: ${CONTRACTS.insurancePool}`);

        //validate inputs
        if (!userAddress || userAddress === '0x0000000000000000000000000000000000000000') {
            throw new Error('Invalid user address');
        }

        if (BigInt(lossAmount) <= 0n) {
            throw new Error('Loss amount must be > 0');
        }

        //call submitClaim on contract with policyIndex
        const txHash = await walletClient.writeContract({
            address: CONTRACTS.insurancePool,
            abi: INSURANCE_POOL_ABI,
            functionName: 'submitClaim',
            args: [userAddress, BigInt(policyIndex), BigInt(lossAmount)],
        });

        console.log(`[CLAIM] ✅ TX submitted: ${txHash}`);

        //wait for confirmation
        const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

        if (receipt.status !== 'success') {
            throw new Error(`Transaction failed: ${receipt.status}`);
        }

        console.log(`[CLAIM] ✅ TX confirmed in block ${receipt.blockNumber}`);

        return {
            txHash,
            blockNumber: Number(receipt.blockNumber),
            gasUsed: Number(receipt.gasUsed),
        };
    } catch (error) {
        console.error(`[CLAIM] ❌ Error submitting claim:`, error.message);
        throw error;
    }
}

/**
 * mock claim submission for mvp without live contracts
 */
function mockClaimSubmission(userAddress, lossAmount) {
    const fakeTxHash = `0x${Math.random().toString(16).slice(2).padStart(64, '0')}`;

    console.log(`[MOCK-CLAIM] Simulated claim for ${userAddress}`);
    console.log(`[MOCK-CLAIM] Fake TX: ${fakeTxHash}`);

    return {
        txHash: fakeTxHash,
        blockNumber: Math.floor(Math.random() * 1000000),
        gasUsed: 150000,
    };
}

/**
 * get current pool status from contract
 */
export async function getPoolStatus() {
    const MOCK_MODE = process.env.MOCK_WEB3 === 'true';
    if (MOCK_MODE) {
        return {
            poolBalance: '50000000000000000000',
            totalPremiums: '1000000000000000000',
            totalClaims: '0',
            activePolicies: '5',
        };
    }

    try {
        const [balance, totalPremiums, totalClaims, activePolicies] =
            await publicClient.readContract({
                address: CONTRACTS.insurancePool,
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
        console.error('[POOL] Error fetching pool status:', error.message);
        return null;
    }
}

/**
 * check if pool is paused
 */
export async function isPoolPaused() {
    const MOCK_MODE = process.env.MOCK_WEB3 === 'true';
    if (MOCK_MODE) return false;

    try {
        const paused = await publicClient.readContract({
            address: CONTRACTS.insurancePool,
            abi: INSURANCE_POOL_ABI,
            functionName: 'paused',
        });
        return paused;
    } catch (error) {
        console.error('[POOL] Error checking paused status:', error);
        return false;
    }
}
