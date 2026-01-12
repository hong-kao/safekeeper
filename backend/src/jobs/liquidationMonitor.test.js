//integration test for liquidation flow

import { PrismaClient } from '@prisma/client';
import { submitClaimOnChain } from '../services/claimSubmitter.js';
import { checkHyperliquidPosition } from '../services/hyperliquidService.js';
import { calculatePayout } from '../utils/web3.js';

const prisma = new PrismaClient();

async function testLiquidationFlow() {
    console.log('Starting liquidation flow integration test...\n');

    try {
        //clean up any existing test data
        const testAddress = '0xTEST000000000000000000000000000000000001';
        await prisma.claim.deleteMany({ where: { userAddress: testAddress } }).catch(() => { });
        await prisma.policy.deleteMany({ where: { userAddress: testAddress } }).catch(() => { });
        await prisma.user.deleteMany({ where: { address: testAddress } }).catch(() => { });

        //1. create test user
        console.log('1. Creating test user...');
        const user = await prisma.user.create({
            data: { address: testAddress },
        });
        console.log(`   ✅ User created: ${user.id}`);

        //2. create test policy
        console.log('2. Creating test policy...');
        const policy = await prisma.policy.create({
            data: {
                userAddress: user.address,
                positionSize: '100000000000000000000', //100 eth
                leverage: 10,
                liquidationPrice: '2850000000000000000000', //$2850
                premiumPaid: '1500000000000000000', //1.5 eth
                txHash: '0xtest1234567890',
                status: 'ACTIVE',
            },
        });
        console.log(`   ✅ Policy created: ${policy.id}`);

        //3. simulate hyperliquid check
        console.log('3. Checking Hyperliquid position...');
        const hlResult = await checkHyperliquidPosition(user.address, {
            liquidationPrice: policy.liquidationPrice,
            positionSize: policy.positionSize,
        });
        console.log(`   Result: ${hlResult.isLiquidated ? 'LIQUIDATED' : 'SAFE'}`);

        //4. calculate payout
        console.log('4. Calculating payout...');
        const payout = calculatePayout(policy.positionSize);
        console.log(`   ✅ Payout (50%): ${payout} wei`);

        //5. create claim
        console.log('5. Creating claim...');
        const claim = await prisma.claim.create({
            data: {
                userAddress: user.address,
                policyId: policy.id,
                lossAmount: policy.positionSize,
                payoutAmount: payout,
                status: 'PENDING',
            },
        });
        console.log(`   ✅ Claim created: ${claim.id}`);

        //6. submit claim on-chain (mock)
        console.log('6. Submitting claim on-chain (mock)...');
        const txResult = await submitClaimOnChain(user.address, claim.lossAmount);
        console.log(`   ✅ TX submitted: ${txResult.txHash}`);

        //7. update claim with tx
        console.log('7. Updating claim status...');
        await prisma.claim.update({
            where: { id: claim.id },
            data: { txHash: txResult.txHash, status: 'PAID', paidAt: new Date() },
        });

        //8. update policy status
        await prisma.policy.update({
            where: { id: policy.id },
            data: { status: 'CLAIMED' },
        });
        console.log('   ✅ Policy marked as claimed');

        //9. verify final state
        console.log('8. Verifying final state...');
        const finalPolicy = await prisma.policy.findUnique({ where: { id: policy.id } });
        const finalClaim = await prisma.claim.findUnique({ where: { id: claim.id } });

        console.log(`   Policy status: ${finalPolicy.status}`);
        console.log(`   Claim status: ${finalClaim.status}`);
        console.log(`   Claim txHash: ${finalClaim.txHash}`);

        if (finalPolicy.status === 'CLAIMED' && finalClaim.status === 'PAID') {
            console.log('\n🎉 INTEGRATION TEST PASSED!');
        } else {
            console.log('\n❌ INTEGRATION TEST FAILED!');
        }

        //cleanup
        console.log('\nCleaning up test data...');
        await prisma.claim.delete({ where: { id: claim.id } });
        await prisma.policy.delete({ where: { id: policy.id } });
        await prisma.user.delete({ where: { id: user.id } });
        console.log('✅ Cleanup complete');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error(error.stack);
    } finally {
        await prisma.$disconnect();
    }
}

testLiquidationFlow();
