import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initializeOrcaConfig } from './lib/orca.js';
import { errorHandler } from './lib/errors.js';
import { validateRequiredEnvVars } from './lib/validation.js';

import webhookRoutes from './routes/webhook.js';
import walletRoutes from './routes/wallet-demo.js';
import positionRoutes from './routes/position.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/webhook', webhookRoutes);
app.use('/wallet', walletRoutes);
app.use('/position', positionRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'orca-whirlpools-backend'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Orca Whirlpools MVP Backend',
    version: '1.0.0',
    network: 'solana-devnet',
    endpoints: {
      health: '/health',
      webhook: '/webhook/helius',
      wallet: '/wallet/:publicKey',
      position: '/position/:nftMint'
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl,
    availableEndpoints: {
      health: '/health',
      wallet: '/wallet/:publicKey',
      position: '/position/:nftMint',
      webhook: '/webhook/helius'
    }
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

async function startServer() {
  try {
    // Validate required environment variables
    validateRequiredEnvVars();
    console.log('✅ Environment variables validated');
    
    // Initialize Orca configuration
    await initializeOrcaConfig();
    console.log('✅ Orca SDK configured for Solana Devnet');
    
    app.listen(PORT, () => {
      console.log('🚀 Orca Whirlpools MVP Backend Started');
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`💼 Wallet endpoint: http://localhost:${PORT}/wallet/:publicKey`);
      console.log(`🎯 Position endpoint: http://localhost:${PORT}/position/:nftMint`);
      console.log(`🔗 Webhook endpoint: http://localhost:${PORT}/webhook/helius`);
      console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();