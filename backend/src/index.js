import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { startWebSocketServer } from './websocket/server.js';
import insuranceRoutes from './routes/insurance.js';
import poolRoutes from './routes/pool.js';
import authRoutes from './routes/auth.js';
import { startLiquidationMonitor } from './jobs/liquidationMonitor.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/insurance', insuranceRoutes);
app.use('/api/pool', poolRoutes);
app.use('/api/auth', authRoutes);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

// Start WebSocket Server
const broadcastToFrontend = startWebSocketServer(httpServer);

// Start Liquidation Monitor (Track 1 task, but we start it here)
// Passing broadcast function so it can send alerts to frontend
startLiquidationMonitor(broadcastToFrontend);

// Start Server
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`   - REST API: http://localhost:${PORT}/api`);
    console.log(`   - WebSocket: ws://localhost:${PORT}`);
});
