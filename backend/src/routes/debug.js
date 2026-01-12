//debug routes for testing (mock price control)

import express from 'express';
import { setMockPrice, resetMockPrices, forceMockPriceCrash } from '../services/hyperliquidService.js';

const router = express.Router();

//check if in development mode
const isDev = process.env.NODE_ENV !== 'production';

//POST /api/debug/set-price
router.post('/set-price', (req, res) => {
    if (!isDev) {
        return res.status(403).json({ error: 'Debug endpoints disabled in production' });
    }

    const { coin = 'ETH', price } = req.body;

    if (!price || typeof price !== 'number') {
        return res.status(400).json({ error: 'price (number) is required' });
    }

    setMockPrice(coin, price);
    res.json({ success: true, coin, price, message: `${coin} price set to $${price}` });
});

//POST /api/debug/crash-price
router.post('/crash-price', (req, res) => {
    if (!isDev) {
        return res.status(403).json({ error: 'Debug endpoints disabled in production' });
    }

    const { coin = 'ETH', crashPercent = 0.15 } = req.body;

    const newPrice = forceMockPriceCrash(coin, crashPercent);
    res.json({ success: true, coin, crashPercent, newPrice, message: `${coin} crashed ${crashPercent * 100}% to $${newPrice.toFixed(2)}` });
});

//POST /api/debug/reset-prices
router.post('/reset-prices', (req, res) => {
    if (!isDev) {
        return res.status(403).json({ error: 'Debug endpoints disabled in production' });
    }

    resetMockPrices();
    res.json({ success: true, message: 'All mock prices reset' });
});

//GET /api/debug/status
router.get('/status', (req, res) => {
    res.json({
        isDev,
        mockMode: process.env.MOCK_HYPERLIQUID === 'true',
        endpoints: isDev ? ['/set-price', '/crash-price', '/reset-prices'] : [],
    });
});

export default router;
