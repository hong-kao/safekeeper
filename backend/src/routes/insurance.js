import express from 'express';
import { PrismaClient } from '@prisma/client';
import { PRICING_ABI } from '../config/contractABIs.js'; // From Track 1
import { publicClient } from '../config/viem.js'; // From Track 1

const router = express.Router();
const prisma = new PrismaClient({
    log: [
        { level: 'query', emit: 'event' },
        { level: 'info', emit: 'stdout' },
        { level: 'warn', emit: 'stdout' },
        { level: 'error', emit: 'stdout' },
    ],
});

// Prisma query logging
prisma.$on('query', (e) => {
    console.log(`[PRISMA] Query: ${e.query.slice(0, 150)}${e.query.length > 150 ? '...' : ''}`);
    console.log(`[PRISMA] Duration: ${e.duration}ms`);
});

// POST /api/insurance/quote
router.post('/quote', async (req, res) => {
    const { positionSize, leverage, volatility = 10 } = req.body;

    console.log(`[QUOTE] ═══════════════════════════════════════`);
    console.log(`[QUOTE] Request: positionSize=${positionSize}, leverage=${leverage}, volatility=${volatility}`);

    try {
        // Simple mock calculation if contract call fails or for speed
        // Formula: (Size * Leverage * Volatility) / 10000
        const bps = 50 + (leverage * 10) + (volatility * 5);
        const premium = (parseFloat(positionSize) * bps) / 10000;

        console.log(`[QUOTE] Calculated: bps=${bps}, premium=${premium} ETH, rate=${bps / 100}%`);
        console.log(`[QUOTE] ═══════════════════════════════════════`);

        res.json({
            premium: premium.toString(),
            rate: bps / 100 + "%",
            coverage: 0.5 // 50%
        });
    } catch (error) {
        console.error(`[QUOTE] ❌ Error:`, error.message);
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
        // Status values: ACTIVE (ongoing), CLAIMED (liquidated + paid), EXPIRED (unused)
        const policy = await prisma.policy.create({
            data: {
                userAddress,
                coin,
                positionSize: (positionSize ?? '0').toString(),
                leverage: parseInt(leverage) || 1,
                liquidationPrice: (liquidationPrice ?? '0').toString(),
                premiumPaid: (premiumPaid ?? '0').toString(),
                txHash: txHash || `manual-${Date.now()}`,
                status: 'ACTIVE' // ACTIVE → CLAIMED (on liquidation) or EXPIRED
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

    console.log(`[POLICIES] Fetching policies for: ${user}`);

    try {
        const policies = await prisma.policy.findMany({
            where: { userAddress: user },
            orderBy: { createdAt: 'desc' }
        });

        console.log(`[POLICIES] Found ${policies.length} policies`);
        policies.forEach((p, i) => {
            console.log(`[POLICIES]   ${i + 1}. ${p.coin} | ${p.positionSize} | Status: ${p.status}`);
        });

        res.json({ policies });
    } catch (error) {
        console.error(`[POLICIES] ❌ Error:`, error.message);
        res.status(500).json({ error: 'Failed to fetch policies' });
    }
});

// POST /api/insurance/force-crash (Testing endpoint)
router.post('/force-crash', async (req, res) => {
    console.log(`[FORCE-CRASH] 📉 Triggering price crash for testing...`);

    try {
        const { forceMockPriceCrash } = await import('../services/hyperliquidService.js');
        const newPrice = forceMockPriceCrash('ETH', 0.15); // 15% crash

        console.log(`[FORCE-CRASH] ✅ ETH price crashed to: $${newPrice.toFixed(2)}`);

        res.json({ success: true, newPrice });
    } catch (error) {
        console.error(`[FORCE-CRASH] ❌ Error:`, error.message);
        res.status(500).json({ error: error.message });
    }
});

export default router;
