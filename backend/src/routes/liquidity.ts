import { Router } from 'express';
import { getLiquidityOverview, convertBigIntToString } from '../lib/orca.js';
import { logger } from '../lib/logger.js';

const router = Router();


/**
 * Rota para buscar overview de liquidez de um proprietário
 */
router.get('/:owner', async (req, res) => {
  try {
    const { owner } = req.params;
    const { saveFile } = req.query;

    logger.info(`🌊 Searching liquidity overview for owner: ${owner}`);

    // Validar endereço do proprietário
    if (!owner || owner.length < 32) {
      return res.status(400).json({ 
        error: 'Invalid owner address',
        message: 'Owner address must be a valid Solana public key'
      });
    }

    // Buscar overview de liquidez usando a nova implementação
    const data = await getLiquidityOverview(owner);

    // Preparar resposta
    const response: any = {
      ...data,
      success: true
    };

    if (data.positions && data.positions.length > 0) {
      res.json(convertBigIntToString(response));
    } else {
      res.status(404).json({
        ...convertBigIntToString(response),
        message: 'No liquidity positions found for this owner',
        possibleReasons: [
          'The owner does not have positions on Mainnet',
          'The address may be incorrect',
          'Positions may be on a different network'
        ]
      });
    }

  } catch (error: any) {
    logger.error('❌ Error fetching liquidity overview:', error);

    let errorResponse: any = {
      error: 'Failed to fetch liquidity overview',
      message: error.message || 'Unknown error',
      timestamp: new Date().toISOString()
    };

    if (error.context?.statusCode === 429) {
      errorResponse.rateLimitExceeded = true;
      errorResponse.suggestions = [
        'The public Solana API has request limits',
        'Consider using Helius API to avoid rate limiting',
        'Configure HELIUS_API_KEY in the .env file'
      ];
    } else if (error instanceof Error) {
      errorResponse.suggestions = [
        'Verify if the owner address is correct',
        'Confirm if Mainnet network is accessible',
        'Check if dependencies are up to date',
        'Configure a Helius API key'
      ];
    }

    res.status(500).json(errorResponse);
  }
});

export default router;



