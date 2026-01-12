//liquidation monitor cron job

import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { checkHyperliquidPosition } from '../services/hyperliquidService.js';
import { submitClaimOnChain, getPoolStatus, isPoolPaused } from '../services/claimSubmitter.js';
import { calculatePayout } from '../utils/web3.js';

const prisma = new PrismaClient();
let isRunning = false;
let monitorTask = null;

/**
 * start liquidation monitor cron job
 * runs every 10 seconds in mvp
 */
export function startLiquidationMonitor(broadcastToWebSocket) {
    console.log('[MONITOR] Starting liquidation monitor...');

    monitorTask = cron.schedule('*/10 * * * * *', async () => {
        if (isRunning) {
            console.log('[MONITOR] ⏳ Previous check still running, skipping...');
            return;
        }

        isRunning = true;

        try {
            await checkAllPolicies(broadcastToWebSocket);
        } catch (error) {
            console.error('[MONITOR] ❌ Critical error:', error.message);

            //log error to db
            try {
                await prisma.errorLog.create({
                    data: {
                        errorType: 'MONITOR_CRITICAL',
                        message: error.message,
                        stack: error.stack,
                    },
                });
            } catch (dbError) {
                console.error('[MONITOR] Failed to log error:', dbError.message);
            }
        } finally {
            isRunning = false;
        }
    });

    console.log('[MONITOR] ✅ Liquidation monitor started (every 10s)');
}

/**
 * stop liquidation monitor
 */
export function stopLiquidationMonitor() {
    if (monitorTask) {
        monitorTask.stop();
        console.log('[MONITOR] Stopped');
    }
}

/**
 * check all active policies for liquidations
 */
async function checkAllPolicies(broadcastToWebSocket) {
    //check if pool is paused
    const paused = await isPoolPaused();
    if (paused) {
        console.log('[MONITOR] Pool is paused, skipping checks');
        return;
    }

    const activePolicies = await prisma.policy.findMany({
        where: { status: 'ACTIVE' },
    });

    if (activePolicies.length > 0) {
        console.log(`[MONITOR] Checking ${activePolicies.length} active policies...`);
    }

    for (const policy of activePolicies) {
        try {
            await checkAndProcessLiquidation(policy, broadcastToWebSocket);
        } catch (error) {
            console.error(`[MONITOR] Error processing policy ${policy.id}:`, error.message);

            //log per-policy error
            await prisma.errorLog.create({
                data: {
                    userAddress: policy.userAddress,
                    errorType: 'POLICY_CHECK',
                    message: error.message,
                },
            }).catch(() => { });

            //continue with next policy
        }
    }

    //periodically broadcast pool status
    const poolStatus = await getPoolStatus();
    if (poolStatus) {
        broadcastToWebSocket('pool_updates', {
            type: 'POOL_UPDATED',
            ...poolStatus,
            timestamp: new Date().toISOString(),
        });
    }
}

/**
 * check single policy and submit claim if liquidated
 */
async function checkAndProcessLiquidation(policy, broadcastToWebSocket) {
    const result = await checkHyperliquidPosition(policy.userAddress, {
        liquidationPrice: policy.liquidationPrice,
        positionSize: policy.positionSize,
    });

    if (result.error) {
        console.warn(`[MONITOR] Skipping ${policy.userAddress} (API error: ${result.error})`);
        return;
    }

    if (!result.isLiquidated) {
        return; //position is safe
    }

    console.log(`[MONITOR] 🔴 LIQUIDATION DETECTED: ${policy.userAddress}`);

    //check if claim already exists
    const existingClaim = await prisma.claim.findUnique({
        where: { policyId: policy.id },
    });

    if (existingClaim) {
        console.log(`[MONITOR] Claim already exists for policy ${policy.id}, skipping`);
        return;
    }

    //broadcast liquidation detected
    broadcastToWebSocket('liquidations', {
        type: 'LIQUIDATION_DETECTED',
        userAddress: policy.userAddress,
        positionSize: policy.positionSize,
        currentPrice: result.currentPrice,
        timestamp: new Date().toISOString(),
    });

    //calculate payout (50% coverage)
    const payoutAmount = calculatePayout(policy.positionSize);

    //create claim in db
    const claim = await prisma.claim.create({
        data: {
            userAddress: policy.userAddress,
            policyId: policy.id,
            lossAmount: policy.positionSize,
            payoutAmount,
            status: 'PENDING',
        },
    });

    console.log(`[MONITOR] 💾 Claim created: ${claim.id}`);

    //broadcast claim submitted
    broadcastToWebSocket('claims', {
        type: 'CLAIM_SUBMITTED',
        userAddress: policy.userAddress,
        lossAmount: policy.positionSize,
        payoutAmount: claim.payoutAmount,
        timestamp: new Date().toISOString(),
    });

    try {
        //submit claim on-chain
        const txResult = await submitClaimOnChain(policy.userAddress, claim.lossAmount);

        //update claim with tx
        await prisma.claim.update({
            where: { id: claim.id },
            data: {
                txHash: txResult.txHash,
                status: 'PAID',
                paidAt: new Date(),
            },
        });

        //mark policy as claimed
        await prisma.policy.update({
            where: { id: policy.id },
            data: { status: 'CLAIMED' },
        });

        console.log(`[MONITOR] ✅ Claim paid: ${txResult.txHash}`);

        //broadcast claim paid
        broadcastToWebSocket('claims', {
            type: 'CLAIM_PAID',
            userAddress: policy.userAddress,
            payoutAmount: claim.payoutAmount,
            txHash: txResult.txHash,
            timestamp: new Date().toISOString(),
        });

    } catch (error) {
        console.error(`[MONITOR] ❌ Failed to submit claim:`, error.message);

        await prisma.claim.update({
            where: { id: claim.id },
            data: { status: 'FAILED' },
        });

        broadcastToWebSocket('claims', {
            type: 'CLAIM_FAILED',
            userAddress: policy.userAddress,
            error: error.message,
            timestamp: new Date().toISOString(),
        });
    }
}
