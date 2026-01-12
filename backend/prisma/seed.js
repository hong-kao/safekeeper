// Seed script to populate test insurance policies
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TEST_ADDRESS = '0x2455e658597167fD94971bA57C42EbBfeFF58a65';

async function main() {
    console.log('🌱 Seeding test data...');

    // 1. Create user if not exists
    let user = await prisma.user.findUnique({ where: { address: TEST_ADDRESS } });
    if (!user) {
        user = await prisma.user.create({ data: { address: TEST_ADDRESS } });
        console.log('✅ Created user:', user.address);
    } else {
        console.log('👤 User already exists:', user.address);
    }

    // 2. Clear existing test policies
    await prisma.claim.deleteMany({ where: { userAddress: TEST_ADDRESS } });
    await prisma.policy.deleteMany({ where: { userAddress: TEST_ADDRESS } });
    console.log('🗑️ Cleared existing policies');

    // 3. Create ACTIVE policies (Current Insurance)
    const activePolicy1 = await prisma.policy.create({
        data: {
            userAddress: TEST_ADDRESS,
            coin: 'ETH',
            positionSize: '50000000000000000000', // 50 ETH
            leverage: 10,
            liquidationPrice: '2800000000000000000000', // $2800
            premiumPaid: '1500000000000000000', // 1.5 ETH
            txHash: `0xactive_eth_${Date.now()}_1`,
            status: 'ACTIVE'
        }
    });
    console.log('✅ Created ACTIVE ETH policy:', activePolicy1.id);

    const activePolicy2 = await prisma.policy.create({
        data: {
            userAddress: TEST_ADDRESS,
            coin: 'ETH',
            positionSize: '25000000000000000000', // 25 ETH
            leverage: 5,
            liquidationPrice: '3200000000000000000000', // $3200
            premiumPaid: '500000000000000000', // 0.5 ETH
            txHash: `0xactive_eth_${Date.now()}_2`,
            status: 'ACTIVE'
        }
    });
    console.log('✅ Created ACTIVE ETH policy 2:', activePolicy2.id);

    // 4. Create CLAIMED policies (Past Insurance)
    const claimedPolicy1 = await prisma.policy.create({
        data: {
            userAddress: TEST_ADDRESS,
            coin: 'ETH',
            positionSize: '100000000000000000000', // 100 ETH
            leverage: 20,
            liquidationPrice: '2500000000000000000000', // $2500
            premiumPaid: '5000000000000000000', // 5 ETH
            txHash: `0xclaimed_eth_${Date.now()}_1`,
            status: 'CLAIMED'
        }
    });
    // Create associated claim
    await prisma.claim.create({
        data: {
            userAddress: TEST_ADDRESS,
            policyId: claimedPolicy1.id,
            lossAmount: '100000000000000000000', // 100 ETH
            payoutAmount: '50000000000000000000', // 50 ETH (50%)
            txHash: `0xclaim_payout_${Date.now()}_1`,
            status: 'PAID',
            paidAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
        }
    });
    console.log('✅ Created CLAIMED policy with claim:', claimedPolicy1.id);

    const claimedPolicy2 = await prisma.policy.create({
        data: {
            userAddress: TEST_ADDRESS,
            coin: 'ETH',
            positionSize: '30000000000000000000', // 30 ETH
            leverage: 15,
            liquidationPrice: '2700000000000000000000', // $2700
            premiumPaid: '1000000000000000000', // 1 ETH
            txHash: `0xclaimed_eth_${Date.now()}_2`,
            status: 'CLAIMED'
        }
    });
    await prisma.claim.create({
        data: {
            userAddress: TEST_ADDRESS,
            policyId: claimedPolicy2.id,
            lossAmount: '30000000000000000000', // 30 ETH
            payoutAmount: '15000000000000000000', // 15 ETH (50%)
            txHash: `0xclaim_payout_${Date.now()}_2`,
            status: 'PAID',
            paidAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) // 5 days ago
        }
    });
    console.log('✅ Created CLAIMED policy with claim 2:', claimedPolicy2.id);

    // 5. Verify
    const allPolicies = await prisma.policy.findMany({
        where: { userAddress: TEST_ADDRESS },
        include: { claim: true },
        orderBy: { createdAt: 'desc' }
    });

    console.log('\n📊 Summary:');
    console.log(`   Active Policies: ${allPolicies.filter(p => p.status === 'ACTIVE').length}`);
    console.log(`   Claimed Policies: ${allPolicies.filter(p => p.status === 'CLAIMED').length}`);
    console.log('\n✅ Seeding complete!');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
