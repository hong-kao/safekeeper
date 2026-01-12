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
    const { userAddress, positionSize, leverage, liquidationPrice, premiumPaid, txHash, coin = 'ETH' } = req.body;

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('[BUY] 🛡️ New Insurance Purchase Request');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`[BUY] User: ${userAddress}`);
    console.log(`[BUY] Coin: ${coin}`);
    console.log(`[BUY] Position Size: ${positionSize} wei`);
    console.log(`[BUY] Leverage: ${leverage}x`);
    console.log(`[BUY] Liquidation Price: ${liquidationPrice} wei`);
    console.log(`[BUY] Premium Paid: ${premiumPaid} wei`);
    console.log(`[BUY] TX Hash: ${txHash}`);

    try {
        // 1. Create or Find User
        let user = await prisma.user.findUnique({ where: { address: userAddress } });
        if (!user) {
            user = await prisma.user.create({ data: { address: userAddress } });
            console.log(`[BUY] ✅ Created new user: ${userAddress}`);
        } else {
            console.log(`[BUY] 👤 User exists: ${userAddress}`);
        }

        // 2. Create Policy
        const policy = await prisma.policy.create({
            data: {
                userAddress,
                coin,
                positionSize: positionSize.toString(),
                leverage: parseInt(leverage),
                liquidationPrice: liquidationPrice.toString(),
                premiumPaid: premiumPaid.toString(),
                txHash,
                status: 'ACTIVE'
            }
        });

        console.log(`[BUY] ✅ Policy created successfully!`);
        console.log(`[BUY] 📋 Policy ID: ${policy.id}`);
        console.log(`[BUY] 📊 Status: ${policy.status}`);
        console.log('═══════════════════════════════════════════════════════════\n');

        res.json({ success: true, policy });
    } catch (error) {
        console.error(`[BUY] ❌ Error: ${error.message}`);
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
