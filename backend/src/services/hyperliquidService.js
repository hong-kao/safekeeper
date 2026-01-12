import fetch from 'node-fetch';

const HYPERLIQUID_API = process.env.HYPERLIQUID_API_URL || 'https://api.hyperliquid.xyz';
const MOCK_MODE = process.env.MOCK_HYPERLIQUID !== 'false'; // Default to mock

/**
 * Check if a user's position on Hyperliquid is liquidated
 */
export async function checkHyperliquidPosition(userAddress, policy) {
    if (MOCK_MODE) {
        return mockHyperliquidCheck(userAddress, policy);
    }

    try {
        const response = await fetch(`${HYPERLIQUID_API}/info`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'clearinghouseState',
                user: userAddress,
            }),
        });

        if (!response.ok) throw new Error(`Hyperliquid API error: ${response.status}`);
        const data = await response.json();
        const position = data.positions?.[0]; // Assume 1st position for MVP

        if (!position) {
            // Position gone = Liquidated or Closed
            return { isLiquidated: true, currentPrice: 0, reason: 'no_position' };
        }

        const currentPrice = parseFloat(position.px);
        const liquidationPrice = parseFloat(policy.liquidationPrice);

        return {
            isLiquidated: currentPrice <= liquidationPrice,
            currentPrice,
            position
        };

    } catch (error) {
        console.error(`[HL] Error for ${userAddress}:`, error.message);
        return { isLiquidated: false, error: error.message };
    }
}

function mockHyperliquidCheck(userAddress, policy) {
    // 5% chance of liquidation for demo purposes
    const isLiquidated = Math.random() < 0.05;
    return {
        isLiquidated,
        currentPrice: isLiquidated ? parseFloat(policy.liquidationPrice) - 10 : parseFloat(policy.liquidationPrice) + 100
    };
}
