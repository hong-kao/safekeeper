//hyperliquid service for real position monitoring
//supports both mock mode (demo) and real hyperliquid api

import dotenv from 'dotenv';
dotenv.config();

const HYPERLIQUID_API = process.env.HYPERLIQUID_API_URL || 'https://api.hyperliquid.xyz';
const MOCK_MODE = process.env.MOCK_HYPERLIQUID === 'true';

console.log(`[HL] Hyperliquid service initialized (${MOCK_MODE ? 'MOCK' : 'REAL'} mode)`);

/**
 * check if a user's position on hyperliquid is liquidated
 * @param {string} userAddress - user's hyperliquid wallet address
 * @param {object} policy - policy from db { liquidationPrice, positionSize, coin }
 * @returns {Promise<object>} { isLiquidated, currentPrice, position, marginInfo }
 */
export async function checkHyperliquidPosition(userAddress, policy) {
    if (MOCK_MODE) {
        return mockHyperliquidCheck(userAddress, policy);
    }

    try {
        console.log(`[HL] Checking position for ${userAddress}`);

        //call hyperliquid info endpoint with clearinghouseState
        const response = await fetch(`${HYPERLIQUID_API}/info`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'clearinghouseState',
                user: userAddress,
            }),
        });

        if (!response.ok) {
            throw new Error(`Hyperliquid API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        //extract margin summary
        const marginSummary = data.marginSummary || {};
        const accountValue = parseFloat(marginSummary.accountValue || '0');
        const totalMarginUsed = parseFloat(marginSummary.totalMarginUsed || '0');

        //extract positions (can be multiple)
        const positions = data.assetPositions || [];

        if (positions.length === 0) {
            console.log(`[HL] No active positions for ${userAddress}`);
            return {
                isLiquidated: true,
                reason: 'no_positions',
                currentPrice: null,
                position: null,
                marginInfo: { accountValue, totalMarginUsed },
            };
        }

        //find the position that matches the policy (by coin if specified, otherwise first)
        const targetCoin = policy.coin || 'ETH';
        let position = positions.find(p => p.position?.coin === targetCoin);

        //fallback to first position if specific coin not found
        if (!position && positions.length > 0) {
            position = positions[0];
        }

        if (!position || !position.position) {
            console.log(`[HL] No ${targetCoin} position found for ${userAddress}`);
            return {
                isLiquidated: true,
                reason: 'position_not_found',
                currentPrice: null,
                position: null,
                marginInfo: { accountValue, totalMarginUsed },
            };
        }

        const posData = position.position;
        const currentPrice = parseFloat(posData.entryPx || '0');
        const liquidationPx = parseFloat(posData.liquidationPx || '0');
        const markPx = await getMarkPrice(posData.coin);

        //use mark price for comparison if available, otherwise entry price
        const priceToCompare = markPx || currentPrice;

        //check if liquidation price has been breached
        //for long positions: liquidated when mark price <= liquidation price
        //for short positions: liquidated when mark price >= liquidation price
        const positionSize = parseFloat(posData.szi || '0');
        const isLong = positionSize > 0;
        const isLiquidated = isLong
            ? priceToCompare <= liquidationPx
            : priceToCompare >= liquidationPx;

        if (isLiquidated) {
            console.log(`[HL] 🔴 LIQUIDATION DETECTED: ${userAddress}`);
            console.log(`     Coin: ${posData.coin}, Side: ${isLong ? 'LONG' : 'SHORT'}`);
            console.log(`     Mark Price: $${markPx}, Liquidation Price: $${liquidationPx}`);
        }

        return {
            isLiquidated,
            currentPrice: markPx,
            position: {
                coin: posData.coin,
                szi: posData.szi,
                entryPx: posData.entryPx,
                liquidationPx: posData.liquidationPx,
                positionValue: posData.positionValue,
                unrealizedPnl: posData.unrealizedPnl,
                marginUsed: posData.marginUsed,
                leverage: position.position.leverage?.value,
                isLong,
            },
            marginInfo: {
                accountValue,
                totalMarginUsed,
                availableBalance: accountValue - totalMarginUsed,
            },
        };

    } catch (error) {
        console.error(`[HL] Error checking position for ${userAddress}:`, error.message);
        return {
            isLiquidated: false,
            error: error.message,
        };
    }
}

/**
 * get current mark price for an asset
 */
async function getMarkPrice(coin) {
    try {
        const response = await fetch(`${HYPERLIQUID_API}/info`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'allMids' }),
        });

        if (!response.ok) return null;

        const mids = await response.json();
        return parseFloat(mids[coin] || '0');
    } catch {
        return null;
    }
}

/**
 * get all asset prices from hyperliquid
 */
export async function getAllAssetPrices() {
    if (MOCK_MODE) {
        return {
            ETH: 3000 + Math.random() * 100,
            BTC: 45000 + Math.random() * 1000,
        };
    }

    try {
        const response = await fetch(`${HYPERLIQUID_API}/info`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'allMids' }),
        });

        if (!response.ok) throw new Error(`API error: ${response.status}`);

        return await response.json();
    } catch (error) {
        console.error('[HL] Error fetching all prices:', error.message);
        return null;
    }
}

/**
 * get current price for a specific asset
 */
export async function getAssetPrice(coin = 'ETH') {
    if (MOCK_MODE) {
        const prices = { ETH: 3000, BTC: 45000, SOL: 100 };
        const base = prices[coin] || 1000;
        return { price: base + Math.random() * (base * 0.02) };
    }

    try {
        const mids = await getAllAssetPrices();
        if (!mids || !mids[coin]) return null;

        return { price: parseFloat(mids[coin]) };
    } catch (error) {
        console.error(`[HL] Error fetching ${coin} price:`, error.message);
        return null;
    }
}

/**
 * get user's full account state from hyperliquid
 */
export async function getUserAccountState(userAddress) {
    if (MOCK_MODE) {
        return mockUserAccountState(userAddress);
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

        if (!response.ok) throw new Error(`API error: ${response.status}`);

        return await response.json();
    } catch (error) {
        console.error(`[HL] Error fetching account state for ${userAddress}:`, error.message);
        return null;
    }
}

/**
 * get user's open orders
 */
export async function getUserOpenOrders(userAddress) {
    if (MOCK_MODE) return [];

    try {
        const response = await fetch(`${HYPERLIQUID_API}/info`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'openOrders',
                user: userAddress,
            }),
        });

        if (!response.ok) throw new Error(`API error: ${response.status}`);

        return await response.json();
    } catch (error) {
        console.error(`[HL] Error fetching open orders for ${userAddress}:`, error.message);
        return [];
    }
}

/**
 * get user's recent fills (trades)
 */
export async function getUserFills(userAddress) {
    if (MOCK_MODE) return [];

    try {
        const response = await fetch(`${HYPERLIQUID_API}/info`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'userFills',
                user: userAddress,
            }),
        });

        if (!response.ok) throw new Error(`API error: ${response.status}`);

        return await response.json();
    } catch (error) {
        console.error(`[HL] Error fetching fills for ${userAddress}:`, error.message);
        return [];
    }
}

//=== MOCK FUNCTIONS FOR DEMO ===

/**
 * mock hyperliquid check for demo/testing
 */
function mockHyperliquidCheck(userAddress, policy) {
    //5% chance of liquidation every check (for demo)
    const shouldLiquidate = Math.random() < 0.05;

    const baseLiqPrice = parseFloat(policy.liquidationPrice) / 1e18 || 2850;

    if (shouldLiquidate) {
        const droppedPrice = baseLiqPrice * 0.99;
        console.log(`[MOCK] 🔴 Liquidation triggered for ${userAddress}`);

        return {
            isLiquidated: true,
            currentPrice: droppedPrice,
            position: {
                coin: policy.coin || 'ETH',
                szi: policy.positionSize,
                entryPx: (baseLiqPrice * 1.1).toFixed(2),
                liquidationPx: baseLiqPrice.toFixed(2),
                positionValue: policy.positionSize,
                unrealizedPnl: '-' + (parseFloat(policy.positionSize) * 0.1).toFixed(2),
                isLong: true,
            },
            marginInfo: {
                accountValue: 1000,
                totalMarginUsed: 800,
                availableBalance: 200,
            },
        };
    }

    //otherwise, price is safe (5% above liquidation)
    const safePrice = baseLiqPrice * 1.05;

    return {
        isLiquidated: false,
        currentPrice: safePrice,
        position: {
            coin: policy.coin || 'ETH',
            szi: policy.positionSize,
            entryPx: (baseLiqPrice * 1.1).toFixed(2),
            liquidationPx: baseLiqPrice.toFixed(2),
            positionValue: policy.positionSize,
            unrealizedPnl: (parseFloat(policy.positionSize) * 0.05).toFixed(2),
            isLong: true,
        },
        marginInfo: {
            accountValue: 1500,
            totalMarginUsed: 500,
            availableBalance: 1000,
        },
    };
}

/**
 * mock user account state
 */
function mockUserAccountState(userAddress) {
    return {
        marginSummary: {
            accountValue: '1500.00',
            totalMarginUsed: '500.00',
            totalRawUsd: '1500.00',
        },
        assetPositions: [
            {
                position: {
                    coin: 'ETH',
                    szi: '0.5',
                    entryPx: '3100.00',
                    liquidationPx: '2850.00',
                    positionValue: '1550.00',
                    unrealizedPnl: '50.00',
                    marginUsed: '155.00',
                    leverage: { value: 10 },
                },
            },
        ],
    };
}
