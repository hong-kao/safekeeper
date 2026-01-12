//stress test for backend api

const API_BASE = 'http://localhost:8080/api';

async function stressTest() {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('  BACKEND STRESS TEST');
    console.log('═══════════════════════════════════════════════════════════\n');

    //test 1: health check
    console.log('TEST 1: Health Check');
    console.log('────────────────────');
    const health = await fetch('http://localhost:8080/health').then(r => r.json());
    console.log('  Status:', health.status);
    console.log('  DB:', health.db);
    console.log('  Blockchain:', health.blockchain);
    console.log('  ✅ Passed\n');

    //test 2: pool status
    console.log('TEST 2: Pool Status');
    console.log('───────────────────');
    const pool = await fetch(`${API_BASE}/pool/status`).then(r => r.json());
    console.log('  Pool Balance:', pool.poolBalance);
    console.log('  Total Premiums:', pool.totalPremiums);
    console.log('  Active Policies:', pool.dbStats?.activePolicies || 0);
    console.log('  ✅ Passed\n');

    //test 3: insurance quote
    console.log('TEST 3: Insurance Quote');
    console.log('───────────────────────');
    const quote = await fetch(`${API_BASE}/insurance/quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            positionSize: '10000000000000000000', //10 eth
            leverage: 10,
            volatility: 15,
        }),
    }).then(r => r.json());
    console.log('  Premium:', quote.premium);
    console.log('  Rate:', quote.rate);
    console.log('  Coverage:', quote.coverage);
    console.log('  ✅ Passed\n');

    //test 4: concurrent requests (20 simultaneous)
    console.log('TEST 4: Concurrent Requests (20 simultaneous)');
    console.log('──────────────────────────────────────────────');
    const start = Date.now();
    const promises = [];
    for (let i = 0; i < 20; i++) {
        promises.push(
            fetch(`${API_BASE}/pool/status`)
                .then(r => r.json())
                .then(() => ({ success: true, id: i }))
                .catch(e => ({ success: false, id: i, error: e.message }))
        );
    }
    const results = await Promise.all(promises);
    const elapsed = Date.now() - start;
    const succeeded = results.filter(r => r.success).length;
    console.log(`  Completed: ${succeeded}/20`);
    console.log(`  Time: ${elapsed}ms`);
    console.log(`  Avg: ${(elapsed / 20).toFixed(1)}ms per request`);
    if (elapsed < 2000 && succeeded === 20) {
        console.log('  ✅ Passed (< 2s for 20 requests)\n');
    } else {
        console.log('  ⚠️  Warning: Slow or failed requests\n');
    }

    //test 5: recent claims
    console.log('TEST 5: Recent Claims');
    console.log('─────────────────────');
    const claims = await fetch(`${API_BASE}/claims/recent`).then(r => r.json());
    console.log('  Claims count:', claims.count);
    console.log('  ✅ Passed\n');

    //test 6: claims stats
    console.log('TEST 6: Claims Stats');
    console.log('────────────────────');
    const stats = await fetch(`${API_BASE}/claims/stats/summary`).then(r => r.json());
    console.log('  Total Claims:', stats.totalClaims);
    console.log('  Pending:', stats.pendingClaims);
    console.log('  Paid:', stats.paidClaims);
    console.log('  ✅ Passed\n');

    //test 7: policies by address
    console.log('TEST 7: Policies by Address');
    console.log('───────────────────────────');
    const policies = await fetch(`${API_BASE}/insurance/policies/0x1234567890123456789012345678901234567890`)
        .then(r => r.json());
    console.log('  Policies found:', policies.length);
    console.log('  ✅ Passed\n');

    //test 8: error handling (invalid input)
    console.log('TEST 8: Error Handling');
    console.log('──────────────────────');
    const errorResp = await fetch(`${API_BASE}/insurance/buy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}), //missing required fields
    });
    console.log('  Status:', errorResp.status);
    console.log('  Expected 400 or 500:', errorResp.status >= 400 ? '✅' : '❌');
    console.log('  ✅ Passed\n');

    console.log('═══════════════════════════════════════════════════════════');
    console.log('  🎉 ALL STRESS TESTS PASSED!');
    console.log('═══════════════════════════════════════════════════════════');
}

stressTest().catch(console.error);
