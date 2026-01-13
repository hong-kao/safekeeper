//safekeeper backend server

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { PrismaClient } from '@prisma/client';
import { startWebSocketServer } from './websocket/server.js';
import insuranceRoutes from './routes/insurance.js';
import poolRoutes from './routes/pool.js';
import authRoutes from './routes/auth.js';
import claimsRoutes from './routes/claims.js';
import debugRoutes from './routes/debug.js';
import liquidityRoutes from './routes/liquidity.js';
import { startLiquidationMonitor, stopLiquidationMonitor } from './jobs/liquidationMonitor.js';
import { publicClient } from './config/viem.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const prisma = new PrismaClient();

//middleware
app.use(cors());
app.use(express.json());

//routes
app.use('/api/insurance', insuranceRoutes);
app.use('/api/pool', poolRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/claims', claimsRoutes);
app.use('/api/debug', debugRoutes);
app.use('/api/lp', liquidityRoutes);

//health check endpoint
app.get('/health', async (req, res) => {
    try {
        //check db connection
        await prisma.$queryRaw`SELECT 1`;

        //check blockchain connection
        let blockNumber = null;
        try {
            blockNumber = await publicClient.getBlockNumber();
        } catch (e) {
            //blockchain not connected
        }

        res.json({
            status: 'healthy',
            db: 'connected',
            blockchain: blockNumber ? 'connected' : 'disconnected',
            blockNumber: blockNumber ? Number(blockNumber) : null,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        res.status(500).json({
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString(),
        });
    }
});

//start websocket server
const broadcastToFrontend = startWebSocketServer(httpServer);

//start liquidation monitor
startLiquidationMonitor(broadcastToFrontend);

//graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down...');
    stopLiquidationMonitor();
    await prisma.$disconnect();
    httpServer.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', async () => {
    console.log('SIGINT received, shutting down...');
    stopLiquidationMonitor();
    await prisma.$disconnect();
    httpServer.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

//start server
const PORT = process.env.PORT || 8080;
httpServer.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`   - REST API: http://localhost:${PORT}/api`);
    console.log(`   - WebSocket: ws://localhost:${PORT}`);
    console.log(`   - Health: http://localhost:${PORT}/health`);
});
