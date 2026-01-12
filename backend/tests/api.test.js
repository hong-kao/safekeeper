import assert from 'assert';
import { generateNonce, SiweMessage } from 'siwe';

const BASE_URL = 'http://localhost:3000';

async function runTests() {
    console.log('🚀 Starting Updated API Tests...\n');

    try {
        // Test 1: Health Check (Sanity)
        console.log('Test 1: GET /health');
        const healthRes = await fetch(`${BASE_URL}/health`);
        assert.strictEqual(healthRes.status, 200);
        console.log('✅ Passed\n');

        // Test 2: Pool Status (Sanity)
        console.log('Test 2: GET /api/pool/status');
        const poolRes = await fetch(`${BASE_URL}/api/pool/status`);
        assert.strictEqual(poolRes.status, 200);
        console.log('✅ Passed\n');

        // Test 3: Auth Flow (Nonce)
        console.log('Test 3: GET /api/auth/nonce');
        const nonceRes = await fetch(`${BASE_URL}/api/auth/nonce`);
        const nonce = await nonceRes.text();
        assert.strictEqual(nonceRes.status, 200);
        assert.ok(nonce.length > 8, 'Nonce should be a string');
        console.log(`✅ Passed (Nonce: ${nonce})\n`);

        // Test 4: Verify Auth (Mock SIWE)
        // Note: To truly test verify, we need a real private key which is hard in this script without ethers/wallet
        // We will test the "input validation" part for now to confirm the endpoint is reachable
        console.log('Test 4: POST /api/auth/verify (Validation Check)');
        const verifyRes = await fetch(`${BASE_URL}/api/auth/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: "MissingSignature",
                signature: "" // Intentionally empty to trigger validation error
            })
        });
        // We expect 400 because signature is missing, which proves the endpoint works and handles input
        assert.strictEqual(verifyRes.status, 400);
        console.log('✅ Passed (Correctly rejected invalid input)\n');

        // --- Existing Functionality Tests ---

        // Test 5: Get Quote
        console.log('Test 5: POST /api/insurance/quote');
        const quoteRes = await fetch(`${BASE_URL}/api/insurance/quote`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                positionSize: '1000',
                leverage: 10,
                volatility: 5
            })
        });
        const quoteData = await quoteRes.json();
        assert.strictEqual(quoteRes.status, 200);
        assert.ok(quoteData.premium);
        console.log('✅ Passed\n');

        console.log('🎉 ALL TESTS PASSED!');

    } catch (error) {
        console.error('❌ Test Failed:', error.message);
        process.exit(1);
    }
}

runTests();
