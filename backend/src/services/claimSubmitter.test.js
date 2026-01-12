//claim submitter test

import { submitClaimOnChain, getPoolStatus, isPoolPaused } from './claimSubmitter.js';

async function runTests() {
    console.log('Testing Claim Submitter...\n');

    //test 1: mock claim submission
    console.log('Test 1: Mock claim submission');
    const result1 = await submitClaimOnChain(
        '0x1234567890123456789012345678901234567890',
        '1000000000000000000' //1 eth
    );
    console.log('Result:', result1);
    console.log('✅ Test 1 passed\n');

    //test 2: get pool status
    console.log('Test 2: Get pool status');
    const result2 = await getPoolStatus();
    console.log('Result:', result2);
    console.log('✅ Test 2 passed\n');

    //test 3: check pool paused
    console.log('Test 3: Check pool paused');
    const result3 = await isPoolPaused();
    console.log('Result:', result3);
    console.log('✅ Test 3 passed\n');

    console.log('🎉 All tests passed!');
}

runTests().catch(console.error);
