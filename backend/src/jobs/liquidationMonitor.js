import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { checkHyperliquidPosition } from '../services/hyperliquidService.js';
import { submitClaimOnChain, getPoolStatus } from '../services/claimSubmitter.js';

const prisma = new PrismaClient();
let isRunning = false;

// [INTEGRATION-READY]
export function startLiquidationMonitor(broadcastToWebSocket) {
    console.log('[MONITOR] Starting liquidation monitor...');

    // Run every 10 seconds
    cron.schedule('*/10 * * * * *', async () => {
        if (isRunning) return;
        isRunning = true;

        try {
            const activePolicies = await prisma.policy.findMany({
                where: { status: 'ACTIVE' },
                include: { user: true } // Assuming 'user' relation exists properly
            });

            if (activePolicies.length > 0) console.log(`[MONITOR] Checking ${activePolicies.length} active policies...`);

            for (const policy of activePolicies) {
                // 1. Check Hyperliquid
                const result = await checkHyperliquidPosition(policy.userAddress, policy);

                if (result.isLiquidated) {
                    console.log(`[MONITOR] 🚨 LIQUIDATION DETECTED for ${policy.userAddress}`);

                    // 2. Notify Frontend
                    broadcastToWebSocket('liquidations', {
                        type: 'LIQUIDATION_DETECTED',
                        userAddress: policy.userAddress,
                        lossAmount: policy.positionSize
                    });

                    // 3. Mark Policy & Create Claim
                    // In real app, check if claim already exists first
                    await prisma.policy.update({ where: { id: policy.id }, data: { status: 'CLAIMED' } });

                    const claim = await prisma.claim.create({
                        data: {
                            userAddress: policy.userAddress,
                            policyId: policy.id,
                            lossAmount: policy.positionSize,
                            payoutAmount: (BigInt(policy.positionSize) / 2n).toString(), // 50%
                            status: 'SUBMITTED'
                        }
                    });

                    // 4. Submit Claim On-Chain
                    const { txHash } = await submitClaimOnChain(policy.userAddress, claim.lossAmount);

                    // 5. Update Claim with TX
                    await prisma.claim.update({ where: { id: claim.id }, data: { txHash, status: 'PAID' } }); // Assuming instant pay for mock

                    broadcastToWebSocket('claims', {
                        type: 'CLAIM_PAID',
                        userAddress: policy.userAddress,
                        txHash
                    });
                }
            }

        } catch (error) {
            console.error('[MONITOR] Error:', error.message);
        } finally {
            isRunning = false;
        }
    });
}
