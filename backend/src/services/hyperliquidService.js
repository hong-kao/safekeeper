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

//simulated market prices (persisted between calls)
const mockMarketPrices = new Map();
const MOCK_PRICE_VOLATILITY = 0.02; //2% price movement per check

/**
 * get or initialize mock market price for a coin
 */
function getMockMarketPrice(coin = 'ETH', basePrice = 3000) {
    if (!mockMarketPrices.has(coin)) {
        mockMarketPrices.set(coin, basePrice);
    }
    return mockMarketPrices.get(coin);
}

/**
 * simulate price movement (random walk)
 */
function simulatePriceMovement(coin = 'ETH', basePrice = 3000) {
    let currentPrice = getMockMarketPrice(coin, basePrice);

    //random walk: -2% to +2% per check
    const movement = (Math.random() - 0.5) * 2 * MOCK_PRICE_VOLATILITY;
    currentPrice = currentPrice * (1 + movement);

    mockMarketPrices.set(coin, currentPrice);
    return currentPrice;
}

/**
 * force a price crash for demo (call this to trigger liquidation)
 */
export function forceMockPriceCrash(coin = 'ETH', crashPercent = 0.15) {
    const currentPrice = getMockMarketPrice(coin, 3000);
    const crashedPrice = currentPrice * (1 - crashPercent);
    mockMarketPrices.set(coin, crashedPrice);
    console.log(`[MOCK] 📉 Price crash forced: ${coin} dropped to $${crashedPrice.toFixed(2)}`);
    return crashedPrice;
}

/**
 * reset mock market prices
 */
export function resetMockPrices() {
    mockMarketPrices.clear();
    console.log('[MOCK] Prices reset');
}

/**
 * set specific mock price
 */
export function setMockPrice(coin, price) {
    mockMarketPrices.set(coin, price);
    console.log(`[MOCK] ${coin} price set to $${price.toFixed(2)}`);
}

/**
 * mock hyperliquid check for demo/testing
 * NOW PROPERLY SIMULATES PRICE VS LIQUIDATION PRICE
 */
function mockHyperliquidCheck(userAddress, policy) {
    const coin = policy.coin || 'ETH';

    //parse liquidation price (could be in wei or regular number)
    let liquidationPrice = parseFloat(policy.liquidationPrice);
    if (liquidationPrice > 1e10) {
        liquidationPrice = liquidationPrice / 1e18; //convert from wei
    }

    //estimate a reasonable entry price (10% above liquidation for 10x leverage)
    const entryPrice = liquidationPrice * 1.1;

    //simulate price movement
    const currentPrice = simulatePriceMovement(coin, entryPrice);

    //check if price has crossed liquidation threshold
    //for LONG positions: liquidated when price <= liquidationPrice
    const isLong = true; //assume long for now
    const isLiquidated = isLong
        ? currentPrice <= liquidationPrice
        : currentPrice >= liquidationPrice;

    if (isLiquidated) {
        console.log(`[MOCK] 🔴 LIQUIDATION: ${userAddress.slice(0, 10)}...`);
        console.log(`       ${coin} Price: $${currentPrice.toFixed(2)} <= Liquidation: $${liquidationPrice.toFixed(2)}`);
    } else {
        const buffer = ((currentPrice - liquidationPrice) / liquidationPrice * 100).toFixed(1);
        console.log(`[MOCK] 🟢 Safe: ${coin} $${currentPrice.toFixed(2)} (${buffer}% above liq)`);
    }

    return {
        isLiquidated,
        currentPrice,
        position: {
            coin,
            szi: policy.positionSize,
            entryPx: entryPrice.toFixed(2),
            liquidationPx: liquidationPrice.toFixed(2),
            positionValue: policy.positionSize,
            unrealizedPnl: ((currentPrice - entryPrice) * parseFloat(policy.positionSize || 1)).toFixed(2),
            isLong,
        },
        marginInfo: {
            accountValue: isLiquidated ? 0 : 1500,
            totalMarginUsed: 500,
            availableBalance: isLiquidated ? 0 : 1000,
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
