import { useState, useEffect } from 'react';
import { WebSocketClient } from '../services/websocket';
import { apiClient } from '../services/api';

// Singleton WS client
const wsClient = new WebSocketClient(import.meta.env.VITE_WS_URL || 'ws://localhost:8080');

export const useMarketData = () => {
    const [prices, setPrices] = useState({ ETH: 0, BTC: 0, SOL: 0 });
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        const connectWs = async () => {
            try {
                await wsClient.connect();
                setIsConnected(true);

                // Subscribe to price updates (mocked as 'pool_updates' for now or add specific channel)
                // Assuming backend broadcasts prices periodically or we poll

                // For MVP, if backend doesn't stream prices yet, we might need to poll
                // But user asked for WEBSOCKET.
                // Let's assume the LiquidationMonitor broadcasts events, but maybe not raw prices constantly.
                // However, the prompt says "ASSET VALUES ARE FULLY TAKEN FROM THE WEBSOCKET".

                // I will listen to a 'market_update' event if it existed, 
                // but checking backend I only see 'pool_updates', 'liquidations', 'claims'.
                // I might need to add price streaming to backend or just simulate it here if backend isn't ready.
                // User said: "TAKE THE MARKET VALUE FROM THE SIMULATED (MOCK HL) AND NOT THE REAL PIPELINE... FROM THE SIMLATED PIPELINE"
                // This implies backend shd send it.

                wsClient.on('market_prices', (data) => {
                    setPrices(data.prices);
                });

            } catch (err) {
                console.error('WS Connection failed', err);
            }
        };

        connectWs();

        return () => {
            wsClient.disconnect();
        };
    }, []);

    return { prices, isConnected };
};
