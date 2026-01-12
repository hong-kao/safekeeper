import express from 'express';
import { PrismaClient } from '@prisma/client';
import { getPoolStatus } from '../services/claimSubmitter.js'; // From Track 1

const router = express.Router();
const prisma = new PrismaClient(); // Reuse or import singleton ideally

// GET /api/pool/status
router.get('/status', async (req, res) => {
    try {
        // 1. Get on-chain status
        const onChainStatus = await getPoolStatus();

        // 2. Get DB stats
        const totalClaims = await prisma.claim.count();
        const activePolicies = await prisma.policy.count({ where: { status: 'ACTIVE' } });

        res.json({
            ...onChainStatus,
            dbStats: {
                totalClaims,
                activePolicies
            }
        });
    } catch (error) {
        console.error('Error fetching pool status:', error);
        res.status(500).json({ error: 'Failed to fetch pool status' });
    }
});

export default router;
