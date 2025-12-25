// backend/server.js (MAIN SERVER WITH WEBSOCKET - CORRECTED)
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');

const db = require('./config/db');
const wsManager = require('./config/websocket');
const apiRoutes = require('./routes/api');
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./config/swagger');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');
const { validateEnv } = require('./utils/envValidator');
const cookieParser = require('cookie-parser');
const { csrfProtection, getCsrfToken } = require('./middleware/csrf');

// Validate environment variables on startup
validateEnv();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || [
    'http://localhost:3000',  // Admin Portal (React)
    'http://localhost:3001',  // TTE Portal (old port)
    'http://localhost:3002',  // Passenger Portal (old port)
    'http://localhost:5173',  // Frontend (Vite)
    'http://localhost:5174',  // TTE Portal (Vite)
    'http://localhost:5175'   // Passenger Portal (Vite)
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token']
}));


app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// CSRF Protection - applies to state-changing requests
app.use(csrfProtection);

// Rate limiting - applies to all /api routes
app.use('/api', apiLimiter);

// Request logging middleware (development only)
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// Create HTTP Server
const httpServer = http.createServer(app);

// CSRF Token endpoint - must be before API routes
app.get('/api/csrf-token', getCsrfToken);

// API Routes
app.use('/api', apiRoutes);

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs, {
  swaggerOptions: {
    persistAuthorization: true
  }
}));

// Root route
app.get('/', (req, res) => {
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

// Health check with cache metrics
const CacheService = require('./services/CacheService');

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    websocket: {
      connectedClients: wsManager.getClientCount()
    },
    cache: CacheService.getMetrics()
  });
});

// 404 handler (must be after all routes)
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

// Start server
async function startServer() {
  try {
    // ═══════════════════════════════════════════════════════════
    // AUTO-CONFIGURATION FROM ENVIRONMENT VARIABLES
    // If .env has database config, use it automatically
    // ═══════════════════════════════════════════════════════════
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;

    if (mongoUri && !global.RAC_CONFIG) {
      console.log('\n🔧 Auto-configuring from environment variables...\n');

      global.RAC_CONFIG = {
        mongoUri: mongoUri,
        stationsDb: process.env.STATIONS_DB || 'rac',
        passengersDb: process.env.PASSENGERS_DB || 'PassengersDB',
        trainDetailsDb: process.env.TRAIN_DETAILS_DB || 'rac',
        stationsCollection: process.env.STATIONS_COLLECTION || '17225',
        passengersCollection: process.env.PASSENGERS_COLLECTION || 'P_1',
        trainDetailsCollection: process.env.TRAIN_DETAILS_COLLECTION || 'Trains_Details',
        trainNo: process.env.DEFAULT_TRAIN_NO || '17225',
        journeyDate: process.env.DEFAULT_JOURNEY_DATE || '2025-11-15'
      };

      console.log('✅ Auto-configuration loaded:');
      console.log(`   📦 Stations: ${global.RAC_CONFIG.stationsDb}/${global.RAC_CONFIG.stationsCollection}`);
      console.log(`   📦 Passengers: ${global.RAC_CONFIG.passengersDb}/${global.RAC_CONFIG.passengersCollection}`);
      console.log(`   🚂 Train: ${global.RAC_CONFIG.trainNo}`);
      console.log(`   📅 Date: ${global.RAC_CONFIG.journeyDate}\n`);
    }

    // Try DB connect using global config (may be absent on first boot)
    try {
      await db.connect(global.RAC_CONFIG);

      // ═══════════════════════════════════════════════════════════
      // CLEANUP OLD SESSION DATA ON SERVER START
      // This ensures no duplicate reallocations from previous sessions
      // ═══════════════════════════════════════════════════════════
      try {
        // Use passengersDb where station_reallocations is stored
        const passengersDb = db.getPassengersDb();

        // Clear all pending station reallocations
        const stationReallocations = passengersDb.collection('station_reallocations');
        const reallocResult = await stationReallocations.deleteMany({});
        if (reallocResult.deletedCount > 0) {
          console.log(`🗑️ Server start: Cleared ${reallocResult.deletedCount} old reallocations`);
        }

        // Clear all upgrade notifications
        const upgradeNotifications = passengersDb.collection('upgrade_notifications');
        const notifResult = await upgradeNotifications.deleteMany({});
        if (notifResult.deletedCount > 0) {
          console.log(`🗑️ Server start: Cleared ${notifResult.deletedCount} old notifications`);
        }

        console.log('✅ Old session data cleared - fresh start');
      } catch (cleanupErr) {
        console.warn('⚠️ Could not clear old data on startup:', cleanupErr.message);
      }

    } catch (error) {
      console.warn('⚠️ DB not connected at startup:', error.message);
      console.warn('You can POST /api/config/setup to configure runtime.');
    }

    // Initialize WebSocket (independent of DB) and start server
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

  } catch (error) {
    console.error('❌ Unexpected error in startServer:', error.message);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');

  // Close WebSocket connections
  wsManager.closeAll();

  // Close MongoDB connections
  await db.close();

  // Close HTTP server
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

// Unhandled rejection handler
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

// Uncaught exception handler
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Start the server
startServer();