/**
 * server.ts
 * Main Express server with WebSocket support
 */

import dotenv from 'dotenv';
import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import http from 'http';

dotenv.config();

const db = require('./config/db');
const wsManager = require('./config/websocket');
const apiRoutes = require('./routes/api');
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./config/swagger');
const { errorHandler } = require('./utils/error-handler');

const app: Application = express();
const PORT: number = parseInt(process.env.PORT || '5000', 10);

// Middleware
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:3002',
        'http://localhost:5174',
        'http://localhost:5173'
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware (development only)
if (process.env.NODE_ENV === 'development') {
    app.use((req: Request, res: Response, next: NextFunction) => {
        console.log(`${req.method} ${req.path}`);
        next();
    });
}

// Create HTTP Server
const httpServer = http.createServer(app);

// API Routes
app.use('/api', apiRoutes);

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs, {
    swaggerOptions: {
        persistAuthorization: true
    }
}));

// Root route
app.get('/', (req: Request, res: Response) => {
    res.json({
        message: 'RAC Reallocation API Server',
        version: '2.0.0',
        status: 'running',
        features: [
            'Two Database Architecture (rac + PassengerDB)',
            'WebSocket Real-time Updates',
            'Segment-based Vacancy Tracking',
            'Dynamic RAC Allocation',
            'Station Event Processing'
        ],
        endpoints: {
            health: 'GET /api/health',
            train: {
                initialize: 'POST /api/train/initialize',
                startJourney: 'POST /api/train/start-journey',
                state: 'GET /api/train/state',
                nextStation: 'POST /api/train/next-station',
                reset: 'POST /api/train/reset',
                stats: 'GET /api/train/stats'
            },
            reallocation: {
                markNoShow: 'POST /api/passenger/no-show',
                racQueue: 'GET /api/train/rac-queue',
                vacantBerths: 'GET /api/train/vacant-berths',
                searchPassenger: 'GET /api/passenger/search/:pnr',
                eligibility: 'GET /api/reallocation/eligibility',
                apply: 'POST /api/reallocation/apply'
            },
            passengers: {
                all: 'GET /api/passengers/all',
                byStatus: 'GET /api/passengers/status/:status',
                counts: 'GET /api/passengers/counts'
            },
            visualization: {
                segmentMatrix: 'GET /api/visualization/segment-matrix',
                graph: 'GET /api/visualization/graph',
                heatmap: 'GET /api/visualization/heatmap',
                berthTimeline: 'GET /api/visualization/berth-timeline/:coach/:berth',
                vacancyMatrix: 'GET /api/visualization/vacancy-matrix'
            }
        },
        websocket: {
            url: `ws://localhost:${PORT}`,
            connectedClients: wsManager.getClientCount(),
            events: [
                'TRAIN_UPDATE',
                'STATION_ARRIVAL',
                'RAC_REALLOCATION',
                'NO_SHOW',
                'STATS_UPDATE'
            ]
        }
    });
});

// Health check
app.get('/api/health', (req: Request, res: Response) => {
    res.json({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        websocket: {
            connectedClients: wsManager.getClientCount()
        }
    });
});

// 404 handler
app.use((req: Request, res: Response) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint not found',
        path: req.path
    });
});

// Global error handler (must be last)
app.use(errorHandler);

// Start server
async function startServer(): Promise<void> {
    try {
        try {
            await db.connect((global as any).RAC_CONFIG);
        } catch (error: any) {
            console.warn('⚠️ DB not connected at startup:', error.message);
            console.warn('You can POST /api/config/setup to configure runtime.');
        }

        wsManager.initialize(httpServer);

        httpServer.listen(PORT, () => {
            const config = db.getConfig();

            console.log('');
            console.log('╔════════════════════════════════════════════╗');
            console.log('║   🚂 RAC REALLOCATION API SERVER V2.0    ║');
            console.log('╚════════════════════════════════════════════╝');
            console.log(`✅ HTTP Server:    http://localhost:${PORT}`);
            console.log(`✅ WebSocket:      ws://localhost:${PORT}`);
            console.log(`✅ Environment:    ${process.env.NODE_ENV || 'development'}`);
            console.log(`✅ Node Version:   ${process.version}`);
            console.log('');
            console.log('📊 Active Configuration:');
            console.log(`   Stations DB:     ${config.stationsDb}`);
            console.log(`   Stations Coll:   ${config.stationsCollection}`);
            console.log(`   Passengers DB:   ${config.passengersDb}`);
            console.log(`   Passengers Coll: ${config.passengersCollection}`);
            console.log(`   Train Number:    ${config.trainNo}`);
            console.log('');
            console.log(`📡 WebSocket Server: Ready (${wsManager.getClientCount()} clients)`);
            console.log('');
            console.log('🎯 Ready to accept requests!');
            console.log('');
            console.log('Try:');
            console.log(`  curl http://localhost:${PORT}/`);
            console.log(`  curl http://localhost:${PORT}/api/health`);
            console.log('');
        });

    } catch (error: any) {
        console.error('❌ Unexpected error in startServer:', error.message);
    }
}

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down gracefully...');

    wsManager.closeAll();
    await db.close();

    httpServer.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});

process.on('SIGTERM', async () => {
    console.log('\n🛑 SIGTERM received. Shutting down...');
    wsManager.closeAll();
    await db.close();
    process.exit(0);
});

process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error: Error) => {
    console.error('❌ Uncaught Exception:', error);
    process.exit(1);
});

// Start the server
startServer();
