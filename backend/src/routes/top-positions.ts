import { Router } from 'express';
import { getTopPositionsData } from '../lib/orca.js';
import { logger } from '../lib/logger.js';

const router = Router();

/**
 * Rota para buscar top positions
 * GET /top-positions?limit=10
 * 
 * Retorna as posições com maior liquidez no mesmo formato da rota position
 */
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    
    logger.info(`🏆 Buscando top ${limit} positions...`);

    // Usar função centralizada do orca.ts para toda a lógica de negócio
    const response = await getTopPositionsData(limit);
    
    logger.info(`✅ Top ${limit} positions obtidas com sucesso`);
    res.json(response);

  } catch (error: any) {
    logger.error('❌ Erro ao buscar top positions:', error);
    
    let errorResponse: any = {
      error: 'Failed to fetch top positions',
      message: error.message || 'Unknown error',
      timestamp: new Date().toISOString()
    };

    if (error.message?.includes('Invalid limit')) {
      errorResponse.statusCode = 400;
      errorResponse.suggestions = [
        'Limit must be between 1 and 1000',
        'Use a valid number for the limit parameter'
      ];
    } else if (error.message?.includes('No valid Whirlpool positions found')) {
      errorResponse.statusCode = 404;
      errorResponse.suggestions = [
        'No valid Whirlpool positions found on the network',
        'The network may be experiencing issues',
        'Try again later'
      ];
    } else if (error.message?.includes('getProgramAccounts')) {
      errorResponse.statusCode = 503;
      errorResponse.suggestions = [
        'RPC does not support getProgramAccounts',
        'Configure a Helius API key for better RPC support',
        'Try using a different RPC endpoint'
      ];
    } else if (error.message?.includes('Rate limit')) {
      errorResponse.statusCode = 429;
      errorResponse.suggestions = [
        'Rate limit exceeded',
        'Wait a moment before trying again',
        'Configure a Helius API key to avoid rate limits'
      ];
    } else {
      errorResponse.statusCode = 500;
      errorResponse.suggestions = [
        'Check if the network is accessible',
        'Verify if dependencies are up to date',
        'Configure a Helius API key for better performance'
      ];
    }

    res.status(errorResponse.statusCode || 500).json(errorResponse);
  }
});

export default router;
