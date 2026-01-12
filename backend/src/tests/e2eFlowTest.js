//end-to-end liquidation flow test
//tests: create policy -> force crash -> detect liquidation -> claim paid -> websocket broadcast

import { PrismaClient } from '@prisma/client';
import WebSocket from 'ws';

const prisma = new PrismaClient();
const API_BASE = 'http://localhost:8080/api';
const WS_URL = 'ws://localhost:8080';

//test config
const TEST_USER = '0xDEMO00000000000000000000000000000000001';
const POSITION_SIZE = '10000000000000000000'; //10 ETH
const LIQUIDATION_PRICE = 2700; //\$2700

async function runE2ETest() {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('  END-TO-END LIQUIDATION FLOW TEST');
    console.log('═══════════════════════════════════════════════════════════\n');

    const wsEvents = [];
    let ws;

    try {
        //=== STEP 1: Connect WebSocket ===
        console.log('STEP 1: Connect WebSocket');
        console.log('──────────────────────────');

        ws = new WebSocket(WS_URL);

        await new Promise((resolve, reject) => {
            ws.on('open', () => {
                console.log('  ✅ WebSocket connected');

                //subscribe to all channels
                ws.send(JSON.stringify({ type: 'subscribe', channel: 'liquidations' }));
                ws.send(JSON.stringify({ type: 'subscribe', channel: 'claims' }));
                ws.send(JSON.stringify({ type: 'subscribe', channel: 'pool_updates' }));
                console.log('  ✅ Subscribed to liquidations, claims, pool_updates');
                resolve();
            });
            ws.on('error', reject);
            setTimeout(reject, 5000);
        });

        ws.on('message', (data) => {
            const msg = JSON.parse(data.toString());
            console.log(`  📨 WS Event: ${msg.type}`);
            wsEvents.push(msg);
        });
        console.log('');

        //=== STEP 2: Clean up & Create User ===
        console.log('STEP 2: Create Test User & Policy');
        console.log('──────────────────────────────────');

        //cleanup existing test data
        await prisma.claim.deleteMany({ where: { userAddress: TEST_USER } });
        await prisma.policy.deleteMany({ where: { userAddress: TEST_USER } });
        await prisma.user.deleteMany({ where: { address: TEST_USER } });

        //create user
        await prisma.user.create({ data: { address: TEST_USER } });
        console.log('  ✅ User created:', TEST_USER.slice(0, 15) + '...');

        //create policy
        const policy = await prisma.policy.create({
            data: {
                userAddress: TEST_USER,
                positionSize: POSITION_SIZE,
                leverage: 10,
                liquidationPrice: LIQUIDATION_PRICE.toString(),
                premiumPaid: '500000000000000000', //0.5 ETH
                txHash: '0xdemo' + Date.now().toString(16),
                status: 'ACTIVE',
            },
        });
        console.log('  ✅ Policy created:', policy.id.slice(0, 8) + '...');
        console.log('     Position: 10 ETH, Leverage: 10x');
        console.log('     Liquidation Price: \$' + LIQUIDATION_PRICE);
        console.log('');

        //=== STEP 3: Set Safe Price via API ===
        console.log('STEP 3: Set Initial Price (Safe)');
        console.log('─────────────────────────────────');

        await fetch(`${API_BASE}/debug/reset-prices`, { method: 'POST' });
        const setPriceResp = await fetch(`${API_BASE}/debug/set-price`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ coin: 'ETH', price: 3000 }),
        }).then(r => r.json());
        console.log('  ✅', setPriceResp.message);
        console.log('  ⏳ Wait 15 seconds for monitor cycles...');
        console.log('');

        await sleep(15000);

        //=== STEP 4: Force Price Crash via API ===
        console.log('STEP 4: Force Price Crash (Trigger Liquidation)');
        console.log('────────────────────────────────────────────────');

        const crashResp = await fetch(`${API_BASE}/debug/set-price`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ coin: 'ETH', price: 2600 }), //below liq price of 2700
        }).then(r => r.json());
        console.log('  📉', crashResp.message);
        console.log('  ⏳ Wait 15 seconds for liquidation detection...');
        console.log('');

        await sleep(15000);

        //=== STEP 5: Verify Results ===
        console.log('STEP 5: Verify Results');
        console.log('──────────────────────');

        //check claim was created
        const claim = await prisma.claim.findFirst({ where: { userAddress: TEST_USER } });

        if (claim) {
            console.log('  ✅ Claim created!');
            console.log('     ID:', claim.id.slice(0, 8) + '...');
            console.log('     Loss Amount:', claim.lossAmount, 'wei');
            console.log('     Payout (50%):', claim.payoutAmount, 'wei');
            console.log('     Status:', claim.status);

            const payoutETH = parseFloat(claim.payoutAmount) / 1e18;
            const lossETH = parseFloat(claim.lossAmount) / 1e18;
            console.log('');
            console.log('     📊 Summary:');
            console.log('        Loss: ' + lossETH + ' ETH');
            console.log('        Payout: ' + payoutETH + ' ETH (50%)');
        } else {
            console.log('  ❌ No claim found!');
        }

        //check policy status
        const updatedPolicy = await prisma.policy.findUnique({ where: { id: policy.id } });
        console.log('     Policy Status:', updatedPolicy?.status);
        console.log('');

        //check websocket events received
        console.log('STEP 6: WebSocket Events Received');
        console.log('──────────────────────────────────');
        if (wsEvents.length > 0) {
            wsEvents.forEach((e, i) => {
                console.log(`  ${i + 1}. ${e.type} - ${e.userAddress?.slice(0, 10) || 'N/A'}...`);
            });
        } else {
            console.log('  ⚠️  No WebSocket events received');
        }
        console.log('');

        //=== FINAL RESULT ===
        const success = claim && claim.payoutAmount && wsEvents.some(e => e.type === 'LIQUIDATION_DETECTED' || e.type === 'CLAIM_SUBMITTED');

        console.log('═══════════════════════════════════════════════════════════');
        if (success) {
            console.log('  🎉 END-TO-END TEST PASSED!');
        } else if (claim) {
            console.log('  ✅ CLAIM CREATED (WebSocket events may vary)');
        } else {
            console.log('  ❌ TEST INCOMPLETE - Check logs above');
        }
        console.log('═══════════════════════════════════════════════════════════');

    } catch (error) {
        console.error('❌ Test error:', error.message);
    } finally {
        if (ws) ws.close();
        await prisma.$disconnect();
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

runE2ETest();
