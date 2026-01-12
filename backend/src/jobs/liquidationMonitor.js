//liquidation monitor cron job

import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { checkHyperliquidPosition } from '../services/hyperliquidService.js';
import { submitClaimOnChain, getPoolStatus, isPoolPaused } from '../services/claimSubmitter.js';
import { calculatePayout } from '../utils/web3.js';
import log from '../utils/logger.js';

const prisma = new PrismaClient();
let isRunning = false;
let monitorTask = null;
let priceInterval = null;  // Track price broadcaster for graceful shutdown

/**
 * start liquidation monitor cron job
 * runs every 10 seconds in mvp
 */
export function startLiquidationMonitor(broadcastToWebSocket) {
    log.monitor('Starting liquidation monitor...');

    // Start price broadcaster (every 3s for "real-time" feel)
    priceInterval = setInterval(async () => {
        try {
            const prices = await import('../services/hyperliquidService.js').then(m => m.getAllAssetPrices());
            if (prices) {
                log.price(`ETH=$${prices.ETH?.toFixed(2) || '?'} | BTC=$${prices.BTC?.toFixed(2) || '?'}`);
                broadcastToWebSocket('market_prices', {
                    type: 'MARKET_PRICES',
                    prices,
                    timestamp: new Date().toISOString()
                });
            }
        } catch (err) {
            console.error('[MONITOR] Failed to broadcast prices:', err.message);
        }
    }, 3000);

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
    }
    if (priceInterval) {
        clearInterval(priceInterval);
    }
    console.log('[MONITOR] Stopped');
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
    console.log(`[MONITOR] ───────────────────────────────────────`);
    console.log(`[MONITOR] Checking policy: ${policy.id}`);
    console.log(`[MONITOR]   User: ${policy.userAddress.slice(0, 12)}...`);
    console.log(`[MONITOR]   Coin: ${policy.coin || 'ETH'}`);
    console.log(`[MONITOR]   Position: ${policy.positionSize}`);
    console.log(`[MONITOR]   Liq Price: ${policy.liquidationPrice}`);

    const result = await checkHyperliquidPosition(policy.userAddress, {
        liquidationPrice: policy.liquidationPrice,
        positionSize: policy.positionSize,
        coin: policy.coin,
    });

    if (result.error) {
        console.warn(`[MONITOR] ⚠️ Skipping ${policy.userAddress} (API error: ${result.error})`);
        return;
    }

    if (!result.isLiquidated) {
        return; //position is safe, logging handled in hyperliquidService
    }

    console.log(``);
    console.log(`[MONITOR] 🔴🔴🔴 LIQUIDATION TRIGGERED 🔴🔴🔴`);
    console.log(`[MONITOR]   Policy ID: ${policy.id}`);
    console.log(`[MONITOR]   User: ${policy.userAddress}`);
    console.log(`[MONITOR]   Current Price: $${result.currentPrice?.toFixed(2)}`);
    console.log(`[MONITOR]   Liq Price: ${policy.liquidationPrice}`);
    console.log(``);

    //check if claim already exists
    const existingClaim = await prisma.claim.findUnique({
        where: { policyId: policy.id },
    });

    if (existingClaim) {
        // If claim already succeeded (PAID), skip
        if (existingClaim.status === 'PAID') {
            console.log(`[MONITOR] Claim already PAID for policy ${policy.id}, skipping`);
            return;
        }

        // If claim FAILED, delete it and retry
        if (existingClaim.status === 'FAILED') {
            console.log(`[MONITOR] Previous claim FAILED for policy ${policy.id}, retrying...`);
            await prisma.claim.delete({ where: { id: existingClaim.id } });
        } else {
            // PENDING status - still processing, skip
            console.log(`[MONITOR] Claim ${existingClaim.status} for policy ${policy.id}, skipping`);
            return;
        }
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

    console.log(`[CLAIM] Creating claim in database...`);
    console.log(`[CLAIM]   Policy ID: ${policy.id}`);
    console.log(`[CLAIM]   Loss Amount: ${policy.positionSize}`);
    console.log(`[CLAIM]   Payout (50%): ${payoutAmount}`);

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

    console.log(`[CLAIM] ✅ Claim created: ${claim.id}`);
    console.log(`[CLAIM] DB Row:`, JSON.stringify(claim, null, 2));

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
        console.log(`[CLAIM] Submitting claim on-chain...`);
        console.log(`[CLAIM]   User: ${policy.userAddress}`);
        console.log(`[CLAIM]   Policy Index: 0 (first active policy)`);
        console.log(`[CLAIM]   Loss Amount: ${claim.lossAmount}`);

        // Pass policyIndex=0 (assuming user's first/only active policy)
        const txResult = await submitClaimOnChain(policy.userAddress, 0, claim.lossAmount);

        console.log(`[CLAIM] ✅ On-chain TX submitted!`);
        console.log(`[CLAIM]   TX Hash: ${txResult.txHash}`);
        console.log(`[CLAIM]   Block: ${txResult.blockNumber}`);
        console.log(`[CLAIM]   Gas Used: ${txResult.gasUsed}`);

        //update claim with tx
        console.log(`[CLAIM] Updating claim status in DB → PAID`);
        await prisma.claim.update({
            where: { id: claim.id },
            data: {
                txHash: txResult.txHash,
                status: 'PAID',
                paidAt: new Date(),
            },
        });

        //mark policy as claimed
        console.log(`[CLAIM] Updating policy status in DB → CLAIMED`);
        await prisma.policy.update({
            where: { id: policy.id },
            data: { status: 'CLAIMED' },
        });

        console.log(`[CLAIM] ═══════════════════════════════════════════`);
        console.log(`[CLAIM] ✅✅✅ PAYOUT COMPLETE ✅✅✅`);
        console.log(`[CLAIM]   Recipient: ${policy.userAddress}`);
        console.log(`[CLAIM]   Amount: ${claim.payoutAmount}`);
        console.log(`[CLAIM]   TX: ${txResult.txHash}`);
        console.log(`[CLAIM] ═══════════════════════════════════════════`);

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
