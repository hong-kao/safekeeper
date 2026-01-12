//claims routes

import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

//GET /api/claims/recent - get recent claims
router.get('/recent', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;

        const claims = await prisma.claim.findMany({
            take: limit,
            orderBy: { createdAt: 'desc' },
            include: {
                policy: {
                    select: {
                        positionSize: true,
                        leverage: true,
                        liquidationPrice: true,
                    },
                },
            },
        });

        res.json({
            claims,
            count: claims.length,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error('Error fetching recent claims:', error);
        res.status(500).json({ error: 'Failed to fetch recent claims' });
    }
});

//GET /api/claims/:id - get single claim
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const claim = await prisma.claim.findUnique({
            where: { id },
            include: {
                policy: true,
                user: {
                    select: { address: true, createdAt: true },
                },
            },
        });

        if (!claim) {
            return res.status(404).json({ error: 'Claim not found' });
        }

        res.json(claim);
    } catch (error) {
        console.error('Error fetching claim:', error);
        res.status(500).json({ error: 'Failed to fetch claim' });
    }
});

//GET /api/claims/user/:address - get claims by user address
router.get('/user/:address', async (req, res) => {
    try {
        const { address } = req.params;

        const claims = await prisma.claim.findMany({
            where: { userAddress: address },
            orderBy: { createdAt: 'desc' },
            include: {
                policy: {
                    select: {
                        positionSize: true,
                        leverage: true,
                    },
                },
            },
        });

        res.json(claims);
    } catch (error) {
        console.error('Error fetching user claims:', error);
        res.status(500).json({ error: 'Failed to fetch user claims' });
    }
});

//GET /api/claims/stats - get claim statistics
router.get('/stats/summary', async (req, res) => {
    try {
        const [totalClaims, pendingClaims, paidClaims, failedClaims] = await Promise.all([
            prisma.claim.count(),
            prisma.claim.count({ where: { status: 'PENDING' } }),
            prisma.claim.count({ where: { status: 'PAID' } }),
            prisma.claim.count({ where: { status: 'FAILED' } }),
        ]);

        //sum of all payouts
        const paidClaimsData = await prisma.claim.findMany({
            where: { status: 'PAID' },
            select: { payoutAmount: true },
        });

        const totalPayout = paidClaimsData.reduce((sum, c) => {
            return sum + BigInt(c.payoutAmount || '0');
        }, 0n);

        res.json({
            totalClaims,
            pendingClaims,
            paidClaims,
            failedClaims,
            totalPayoutWei: totalPayout.toString(),
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error('Error fetching claim stats:', error);
        res.status(500).json({ error: 'Failed to fetch claim stats' });
    }
});

export default router;
