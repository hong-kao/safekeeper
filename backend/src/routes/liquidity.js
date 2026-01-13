import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Mock ETH price (in real app, fetch from CoinGecko/API)
const getMockEthPrice = () => {
    // Base price + random walk for realism
    const basePrice = 2850;
    const variance = Math.random() * 200 - 100; // ±$100
    return (basePrice + variance).toFixed(2);
};

// Dynamic APR calculation with mock volatility
const calculateDynamicApr = async () => {
    const baseAprBps = 1500; // 15% base APR

    // Calculate utilization (activePolicies * avgPremium / poolBalance)
    // For demo, we'll use a simplified mock
    const utilizationMultiplier = 0.8 + Math.random() * 0.4; // 0.8x - 1.2x

    // Mock volatility random walk
    const volatilityMultiplier = 0.9 + Math.random() * 0.3; // 0.9x - 1.2x

    const effectiveAprBps = Math.round(baseAprBps * utilizationMultiplier * volatilityMultiplier);

    return {
        baseAprBps,
        effectiveAprBps,
        utilizationMultiplier: utilizationMultiplier.toFixed(2),
        volatilityMultiplier: volatilityMultiplier.toFixed(2),
        effectiveAprPercent: (effectiveAprBps / 100).toFixed(1)
    };
};

/**
 * POST /lp/deposit
 * Record an LP deposit after on-chain tx
 */
router.post('/deposit', async (req, res) => {
    try {
        const { userAddress, amount, sharesIssued, txHash } = req.body;

        if (!userAddress || !amount || !sharesIssued || !txHash) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const ethPriceUsd = getMockEthPrice();

        // Ensure user exists
        await prisma.user.upsert({
            where: { address: userAddress.toLowerCase() },
            update: {},
            create: { address: userAddress.toLowerCase() }
        });

        const deposit = await prisma.lpDeposit.create({
            data: {
                userAddress: userAddress.toLowerCase(),
                amount,
                sharesIssued,
                ethPriceUsd,
                txHash
            }
        });

        res.json({
            success: true,
            deposit,
            ethPriceUsd
        });
    } catch (error) {
        console.error('Error recording LP deposit:', error);

        // Handle duplicate txHash
        if (error.code === 'P2002') {
            return res.status(409).json({ error: 'Transaction already recorded' });
        }

        res.status(500).json({ error: 'Failed to record deposit' });
    }
});

/**
 * POST /lp/withdraw
 * Record an LP withdrawal after on-chain tx
 */
router.post('/withdraw', async (req, res) => {
    try {
        const { userAddress, sharesBurned, amountPaid, txHash } = req.body;

        if (!userAddress || !sharesBurned || !amountPaid || !txHash) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const ethPriceUsd = getMockEthPrice();

        const withdrawal = await prisma.lpWithdraw.create({
            data: {
                userAddress: userAddress.toLowerCase(),
                sharesBurned,
                amountPaid,
                ethPriceUsd,
                txHash
            }
        });

        res.json({
            success: true,
            withdrawal,
            ethPriceUsd
        });
    } catch (error) {
        console.error('Error recording LP withdrawal:', error);

        if (error.code === 'P2002') {
            return res.status(409).json({ error: 'Transaction already recorded' });
        }

        res.status(500).json({ error: 'Failed to record withdrawal' });
    }
});

/**
 * GET /lp/history/:address
 * Get LP transaction history for a user
 */
router.get('/history/:address', async (req, res) => {
    try {
        const { address } = req.params;

        const [deposits, withdrawals] = await Promise.all([
            prisma.lpDeposit.findMany({
                where: { userAddress: address.toLowerCase() },
                orderBy: { createdAt: 'desc' }
            }),
            prisma.lpWithdraw.findMany({
                where: { userAddress: address.toLowerCase() },
                orderBy: { createdAt: 'desc' }
            })
        ]);

        // Merge and sort by date
        const history = [
            ...deposits.map(d => ({ ...d, type: 'DEPOSIT' })),
            ...withdrawals.map(w => ({ ...w, type: 'WITHDRAW' }))
        ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        res.json({
            deposits,
            withdrawals,
            history,
            summary: {
                totalDeposits: deposits.length,
                totalWithdrawals: withdrawals.length
            }
        });
    } catch (error) {
        console.error('Error fetching LP history:', error);
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});

/**
 * GET /lp/stats
 * Get dynamic APR and pool utilization stats
 */
router.get('/stats', async (req, res) => {
    try {
        const aprData = await calculateDynamicApr();
        const ethPrice = getMockEthPrice();

        // Get recent activity
        const recentDeposits = await prisma.lpDeposit.count({
            where: {
                createdAt: {
                    gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24h
                }
            }
        });

        const recentWithdrawals = await prisma.lpWithdraw.count({
            where: {
                createdAt: {
                    gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
                }
            }
        });

        res.json({
            ...aprData,
            ethPriceUsd: ethPrice,
            activity24h: {
                deposits: recentDeposits,
                withdrawals: recentWithdrawals
            }
        });
    } catch (error) {
        console.error('Error fetching LP stats:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

export default router;
