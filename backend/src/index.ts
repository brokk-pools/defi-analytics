import express from 'express';
import dotenv from 'dotenv';
import morgan from 'morgan';
// import { initializeOrcaConfig } from './lib/orca.js'; // Removed - no longer needed
import { runMigrations } from './lib/migrations.js';
import { errorHandler } from './lib/errors.js';
import { validateRequiredEnvVars } from './lib/validation.js';
import { logger, createHttpLogger } from './lib/logger.js';
import {
  generalRateLimit,
  webhookRateLimit,
  securityMiddleware,
  corsMiddleware,
  compressionMiddleware,
  sessionMiddleware,
  trustProxyMiddleware,
  requestLoggingMiddleware,
  webhookSignatureMiddleware
} from './lib/security.js';

import webhookRoutes from './routes/webhook.js';
import walletRoutes from './routes/wallet.js';
import positionRoutes from './routes/position.js';
import liquidityRoutes from './routes/liquidity.js';
import poolsRoutes from './routes/pools.js';
import poolsDetailsRoutes from './routes/pools-details.js';
import topPositionsRoutes from './routes/top-positions.js';
import feesRoutes from './routes/fees.js';
import brokkAnalyticsRoutes from './routes/brokk-analytics.js';
import transactionsRoutes from './routes/transactions.js';
import populateTokensRoutes from './routes/populate-tokens-coingecko.js';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3001');
const HOST = process.env.HOST || 'localhost';

// Trust proxy configuration (must be first)
app.use(trustProxyMiddleware);

// Security middleware
app.use(securityMiddleware);
app.use(corsMiddleware);
app.use(compressionMiddleware);

// Session middleware
if (process.env.SESSION_SECRET) {
  app.use(sessionMiddleware);
}

// Request logging
if (process.env.NODE_ENV === 'production') {
  const httpLogger = createHttpLogger();
  app.use(morgan('combined', {
    stream: {
      write: (message: string) => {
        httpLogger.info(message.trim());
      }
    }
  }));
} else {
  app.use(morgan('dev'));
}

app.use(requestLoggingMiddleware);

// Rate limiting
app.use(generalRateLimit);

// Body parsing middleware
app.use(express.json({ 
  limit: process.env.MAX_REQUEST_SIZE || '10mb',
  verify: (req, res, buf) => {
    (req as any).rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes with specific middleware
app.use('/webhook', webhookRateLimit, webhookSignatureMiddleware, webhookRoutes);
app.use('/wallet', walletRoutes);
app.use('/position', positionRoutes);
app.use('/liquidity', liquidityRoutes);
app.use('/pools', poolsRoutes);
app.use('/poolsdetails', poolsDetailsRoutes);
app.use('/top-positions', topPositionsRoutes);
app.use('/fees', feesRoutes);
app.use('/brokk-analytics', brokkAnalyticsRoutes);
app.use('/transactions', transactionsRoutes);
app.use('/populate-tokens-coingecko', populateTokensRoutes);

// Health check endpoint with detailed status
app.get('/health', (req, res) => {
  const healthStatus = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'orca-whirlpools-backend',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    uptime: Math.floor(process.uptime()),
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      rss: Math.round(process.memoryUsage().rss / 1024 / 1024)
    },
    system: {
      platform: process.platform,
      nodeVersion: process.version,
      pid: process.pid
    }
  };

  logger.debug('Health check requested', { ip: req.ip });
  res.json(healthStatus);
});

// Metrics endpoint (production only)
app.get('/metrics', (req, res) => {
  if (process.env.NODE_ENV !== 'production') {
    return res.status(403).json({ error: 'Metrics endpoint only available in production' });
  }

  const metrics = {
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
    version: process.version,
    environment: process.env.NODE_ENV
  };

  res.json(metrics);
});

// Root endpoint
app.get('/', (req, res) => {
  const info = {
    message: 'Orca Whirlpools MVP Backend',
    version: '1.0.0',
    network: process.env.NODE_ENV === 'production' ? 'solana-mainnet' : 'solana-devnet',
    environment: process.env.NODE_ENV || 'development',
    endpoints: {
      health: '/health',
      webhook: '/webhook/helius',
      wallet: '/wallet/:publicKey',
      position: '/position/:nftMint',
      liquidity: '/liquidity/:owner',
      pools: '/pools',
      poolsById: '/pools/:poolId',
      poolsDetails: '/poolsdetails/:poolid?showpositions=true&saveFile=true',
      topPositions: '/top-positions?limit=10',
      fees: '/fees/:poolId/:owner',
      feesLegacy: '/fees/position/:positionId/:poolId',
      brokkAnalytics: '/brokk-analytics/:poolId/:owner',
      transactions: '/transactions/:owner/:positionMint',
      populateTokens: '/populate-tokens-coingecko',
    },
    documentation: 'https://docs.orca.so/',
    support: 'https://discord.gg/orcaprotocol'
  };

  logger.info('Root endpoint accessed', { ip: req.ip });
  res.json(info);
});

// 404 handler
app.use((req, res) => {
  logger.warn('Route not found', { 
    path: req.originalUrl, 
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString(),
    availableEndpoints: {
      health: '/health',
      wallet: '/wallet/:publicKey',
      position: '/position/:nftMint',
      webhook: '/webhook/helius',
      liquidity: '/liquidity/:owner',
      pools: '/pools',
      poolsById: '/pools/:poolId',
      poolsDetails: '/poolsdetails/:poolid?showpositions=true&saveFile=true',
      topPositions: '/top-positions?limit=10',
      fees: '/fees/:poolId/:owner',
      feesLegacy: '/fees/position/:positionId/:poolId',
      brokkAnalytics: '/brokk-analytics/:poolId/:owner',
    }
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

async function startServer() {
  try {
    logger.info('Starting Orca Whirlpools MVP Backend...');

    // Validate required environment variables
    validateRequiredEnvVars();
    logger.info('Environment variables validated');
    
    // Run DB migrations (commented out for now)
    // await runMigrations();
    // logger.info('Database migrations applied');

    // Orca SDK is now configured automatically when needed
    logger.info('Orca SDK ready for use');
    
    // Start the server
    const server = app.listen(PORT, HOST, () => {
      const networkType = process.env.NODE_ENV === 'production' ? 'Mainnet' : 'Devnet';
      
      logger.info('🚀 Orca Whirlpools MVP Backend Started', {
        port: PORT,
        host: HOST,
        environment: process.env.NODE_ENV || 'development',
        network: networkType,
        nodeVersion: process.version,
        pid: process.pid
      });

      if (process.env.NODE_ENV !== 'production') {
        console.log('🚀 Orca Whirlpools MVP Backend Started');
        console.log(`📊 Health check: http://${HOST}:${PORT}/health`);
        console.log(`💼 Wallet endpoint: http://${HOST}:${PORT}/wallet/:publicKey`);
        console.log(`🎯 Position endpoint: http://${HOST}:${PORT}/position/:nftMint`);
        console.log(`🔗 Webhook endpoint: http://${HOST}:${PORT}/webhook/helius`);
        console.log(`💧 Liquidity endpoint: http://${HOST}:${PORT}/liquidity/:owner`);
        console.log(`🏊 Pools endpoint: http://${HOST}:${PORT}/pools`);
        console.log(`🏊 Pool by ID: http://${HOST}:${PORT}/pools/:poolId`);
        console.log(`🔍 Pool details: http://${HOST}:${PORT}/poolsdetails/:poolid`);
        console.log(`🏆 Top positions: http://${HOST}:${PORT}/top-positions?limit=10`);
        console.log(`💰 Fees calculation: http://${HOST}:${PORT}/fees/:poolId/:owner`);
        console.log(`💰 Fees calculation (legacy): http://${HOST}:${PORT}/fees/position/:positionId/:poolId`);
        console.log(`📊 Brokk Analytics: http://${HOST}:${PORT}/brokk-analytics/:poolId/:owner`);
        console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`📈 Metrics: http://${HOST}:${PORT}/metrics`);
      }
    });

    // Graceful shutdown handlers
    const gracefulShutdown = (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully...`);
      
      server.close(() => {
        logger.info('HTTP server closed');
        
        // Close database connections if any
        // closeDbConnections();
        
        logger.info('Server shutdown complete');
        process.exit(0);
      });

      // Force close server after 30 seconds
      setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      gracefulShutdown('UNCAUGHT_EXCEPTION');
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at Promise:', { reason, promise });
      gracefulShutdown('UNHANDLED_REJECTION');
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer().catch((error) => {
  logger.error('Startup error:', error);
  process.exit(1);
});