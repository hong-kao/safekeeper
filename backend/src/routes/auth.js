import express from 'express';
import { generateNonce, SiweMessage } from 'siwe';
import jwt from 'jsonwebtoken';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_123';

// Store nonces temporarily (in-memory for simple MVP, use Redis for prod)
const nonces = new Map();

// GET /api/auth/nonce
router.get('/nonce', (req, res) => {
    const nonce = generateNonce();
    // We should ideally session-bind this, but for simple stateless API we return it
    // Frontend sends it back with signature
    res.setHeader('Content-Type', 'text/plain');
    res.send(nonce);
});

// POST /api/auth/verify
router.post('/verify', async (req, res) => {
    const { message, signature } = req.body;

    if (!message || !signature) {
        return res.status(400).json({ error: 'Missing message or signature' });
    }

    try {
        const siweMessage = new SiweMessage(message);
        const result = await siweMessage.verify({ signature });

        // In a real app, verify nonce match here if we stored it in session
        // if (result.data.nonce !== storedNonce) throw ...

        if (!result.success) throw new Error('Verification failed');

        // Generate JWT
        const token = jwt.sign(
            { address: result.data.address },
            JWT_SECRET,
            { expiresIn: '1d' }
        );

        res.json({ success: true, token, address: result.data.address });

    } catch (error) {
        console.error('Auth error:', error);
        res.status(401).json({ error: 'Invalid signature', details: error.message });
    }
});

export default router;
