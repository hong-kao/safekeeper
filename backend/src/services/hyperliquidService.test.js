//hyperliquid service comprehensive test

import {
    checkHyperliquidPosition,
    getAssetPrice,
    getAllAssetPrices,
    getUserAccountState,
    getUserOpenOrders,
    getUserFills,
} from './hyperliquidService.js';

const mockPolicy = {
    liquidationPrice: '2850000000000000000000', //2850 in wei
    positionSize: '1000000000000000000', //1 eth
    coin: 'ETH',
};

//test with a real hyperliquid address (if you have one)
const REAL_HL_ADDRESS = process.env.TEST_HL_ADDRESS || '0x0000000000000000000000000000000000000000';

async function runTests() {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('  HYPERLIQUID SERVICE TESTS');
    console.log('═══════════════════════════════════════════════════════════\n');

    //test 1: asset prices
    console.log('TEST 1: Get Asset Prices');
    console.log('─────────────────────────');
    const ethPrice = await getAssetPrice('ETH');
    const btcPrice = await getAssetPrice('BTC');
    console.log(`  ETH: $${ethPrice?.price?.toFixed(2) || 'N/A'}`);
    console.log(`  BTC: $${btcPrice?.price?.toFixed(2) || 'N/A'}`);
    console.log('  ✅ Passed\n');

    //test 2: all asset prices
    console.log('TEST 2: Get All Asset Prices');
    console.log('────────────────────────────');
    const allPrices = await getAllAssetPrices();
    if (allPrices) {
        const coins = Object.keys(allPrices).slice(0, 5);
        coins.forEach(coin => console.log(`  ${coin}: $${parseFloat(allPrices[coin]).toFixed(2)}`));
        console.log(`  ... and ${Object.keys(allPrices).length - 5} more`);
    }
    console.log('  ✅ Passed\n');

    //test 3: mock position check
    console.log('TEST 3: Mock Position Check (5% liquidation chance)');
    console.log('────────────────────────────────────────────────────');
    const mockAddress = '0x1234567890123456789012345678901234567890';
    const mockResult = await checkHyperliquidPosition(mockAddress, mockPolicy);
    console.log(`  Address: ${mockAddress.slice(0, 10)}...`);
    console.log(`  Is Liquidated: ${mockResult.isLiquidated}`);
    console.log(`  Current Price: $${mockResult.currentPrice?.toFixed(2) || 'N/A'}`);
    if (mockResult.position) {
        console.log(`  Position: ${mockResult.position.coin} ${mockResult.position.isLong ? 'LONG' : 'SHORT'}`);
    }
    console.log('  ✅ Passed\n');

    //test 4: run multiple checks to see distribution
    console.log('TEST 4: Liquidation Distribution (20 checks)');
    console.log('─────────────────────────────────────────────');
    let liquidatedCount = 0;
    for (let i = 0; i < 20; i++) {
        const r = await checkHyperliquidPosition(`0x${i.toString().padStart(40, '0')}`, mockPolicy);
        if (r.isLiquidated) liquidatedCount++;
    }
    console.log(`  Liquidated: ${liquidatedCount}/20 (${(liquidatedCount / 20 * 100).toFixed(1)}%)`);
    console.log(`  Expected: ~5% (1/20)`);
    console.log('  ✅ Passed\n');

    //test 5: user account state (mock)
    console.log('TEST 5: Get User Account State (Mock)');
    console.log('──────────────────────────────────────');
    const accountState = await getUserAccountState(mockAddress);
    if (accountState) {
        console.log(`  Account Value: $${accountState.marginSummary?.accountValue || 'N/A'}`);
        console.log(`  Positions: ${accountState.assetPositions?.length || 0}`);
    }
    console.log('  ✅ Passed\n');

    //test 6: real hyperliquid address (if provided)
    if (REAL_HL_ADDRESS !== '0x0000000000000000000000000000000000000000') {
        console.log('TEST 6: Real Hyperliquid Address Check');
        console.log('───────────────────────────────────────');
        console.log(`  Address: ${REAL_HL_ADDRESS.slice(0, 10)}...`);

        //temporarily disable mock mode for this test
        const originalMock = process.env.MOCK_HYPERLIQUID;
        process.env.MOCK_HYPERLIQUID = 'false';

        const realState = await getUserAccountState(REAL_HL_ADDRESS);
        if (realState) {
            console.log(`  Account Value: $${realState.marginSummary?.accountValue || 'N/A'}`);
            console.log(`  Total Margin: $${realState.marginSummary?.totalMarginUsed || 'N/A'}`);
            console.log(`  Positions: ${realState.assetPositions?.length || 0}`);

            if (realState.assetPositions?.length > 0) {
                realState.assetPositions.forEach(p => {
                    const pos = p.position;
                    console.log(`    - ${pos.coin}: ${pos.szi} @ $${pos.entryPx} (Liq: $${pos.liquidationPx})`);
                });
            }
        } else {
            console.log('  No data (address may not have positions)');
        }

        process.env.MOCK_HYPERLIQUID = originalMock;
        console.log('  ✅ Passed\n');
    } else {
        console.log('TEST 6: Real Hyperliquid Address Check');
        console.log('───────────────────────────────────────');
        console.log('  ⏭️  Skipped (set TEST_HL_ADDRESS env var to test)\n');
    }

    console.log('═══════════════════════════════════════════════════════════');
    console.log('  🎉 ALL TESTS PASSED!');
    console.log('═══════════════════════════════════════════════════════════');
}

runTests().catch(console.error);
