import { useEffect, useState, useCallback } from 'react';
import { WebSocketClient } from '../services/websocket';

export const useWebSocket = (url = import.meta.env.VITE_WS_URL) => {
    const [wsClient, setWsClient] = useState(null);
    const [connected, setConnected] = useState(false);
    const [events, setEvents] = useState([]);

    useEffect(() => {
        if (!url) return;

        const client = new WebSocketClient(url);

        client.connect()
            .then(() => {
                setConnected(true);
                setWsClient(client);

                client.on('LIQUIDATION_DETECTED', (data) => {
                    setEvents((prev) => [data, ...prev.slice(0, 49)]);
                });

                client.on('CLAIM_SUBMITTED', (data) => {
                    setEvents((prev) => [data, ...prev.slice(0, 49)]);
                });

                client.on('CLAIM_PAID', (data) => {
                    setEvents((prev) => [data, ...prev.slice(0, 49)]);
                });

                client.on('POOL_UPDATED', (data) => {
                    setEvents((prev) => [data, ...prev.slice(0, 49)]);
                });
            })
            .catch((err) => {
                console.error('WebSocket connection failed:', err);
            });

        return () => {
            client.disconnect();
        };
    }, [url]);

    const getLatestEvent = useCallback((eventType) => {
        return events.find((e) => e.type === eventType);
    }, [events]);

    return {
        connected,
        events,
        getLatestEvent,
        wsClient,
    };
};
