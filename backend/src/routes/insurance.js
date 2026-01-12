import express from 'express';
import { PrismaClient } from '@prisma/client';
import { PRICING_ABI } from '../config/contractABIs.js'; // From Track 1
import { publicClient } from '../config/viem.js'; // From Track 1

const router = express.Router();
const prisma = new PrismaClient();

// POST /api/insurance/quote
router.post('/quote', async (req, res) => {
    const { positionSize, leverage, volatility = 10 } = req.body;

    try {
        // Simple mock calculation if contract call fails or for speed
        // Formula: (Size * Leverage * Volatility) / 10000
        const bps = 50 + (leverage * 10) + (volatility * 5);
        const premium = (parseFloat(positionSize) * bps) / 10000;

        res.json({
            premium: premium.toString(),
            rate: bps / 100 + "%",
            coverage: 0.5 // 50%
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/insurance/buy
router.post('/buy', async (req, res) => {
    const { userAddress, positionSize, leverage, liquidationPrice, premiumPaid, txHash } = req.body;

    try {
        // 1. Create or Find User
        let user = await prisma.user.findUnique({ where: { address: userAddress } });
        if (!user) {
            user = await prisma.user.create({ data: { address: userAddress } });
        }

        // 2. Create Policy
        const policy = await prisma.policy.create({
            data: {
                userAddress,
                positionSize: positionSize.toString(),
                leverage: parseInt(leverage),
                liquidationPrice: liquidationPrice.toString(),
                premiumPaid: premiumPaid.toString(),
                txHash,
                status: 'ACTIVE'
            }
        });

        res.json({ success: true, policy });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to purchase policy' });
    }
});

// GET /api/insurance/policies/:user
router.get('/policies/:user', async (req, res) => {
    const { user } = req.params;

    try {
        const policies = await prisma.policy.findMany({
            where: { userAddress: user },
            orderBy: { createdAt: 'desc' }
        });
        res.json(policies);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch policies' });
    }
});

export default router;
