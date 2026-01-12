import { WebSocketServer } from 'ws';

let wss;

export function startWebSocketServer(httpServer) {
    wss = new WebSocketServer({ server: httpServer });

    wss.on('connection', (ws) => {
        console.log('[WS] Client connected');

        ws.on('message', (message) => {
            try {
                const data = JSON.parse(message);
                if (data.type === 'subscribe') {
                    console.log(`[WS] Client subscribed: ${data.channel}`);
                }
            } catch (e) {
                console.error('[WS] Error parsing message:', e);
            }
        });

        ws.on('close', () => {
            console.log('[WS] Client disconnected');
        });
    });

    console.log('✅ WebSocket server initialized');

    // Return function to broadcast messages
    return (channel, data) => {
        broadcast(channel, data);
    };
}

export function broadcast(channel, data) {
    if (!wss) return;

    const message = JSON.stringify({ channel, ...data });

    wss.clients.forEach((client) => {
        if (client.readyState === 1) { // 1 = OPEN
            client.send(message);
        }
    });
}
