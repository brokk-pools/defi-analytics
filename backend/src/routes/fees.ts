import { Router } from 'express';
import { getOutstandingFeesForPositionById, getCollectedFeesForPositionById } from '../lib/orca.js';
import { logger } from '../lib/logger.js';

const router = Router();

/**
 * Rota para calcular fees coletadas (collected) de uma posição específica
 * GET /fees/collected/:positionId
 */
router.get('/collected/:positionId', async (req, res) => {
  try {
    const { positionId } = req.params;
    const { startUtc, endUtc } = req.query;

    logger.info(`💰 Calculating collected fees for position: ${positionId}`);

    // Validar parâmetros
    if (!positionId || positionId.length < 32) {
      return res.status(400).json({ 
        error: 'Invalid position ID',
        message: 'Position ID must be a valid Solana public key (NFT mint)'
      });
    }

    // Calcular fees coletadas usando apenas o positionId
    const feesData = await getCollectedFeesForPositionById(
      positionId,
      startUtc as string,
      endUtc as string
    );

    // Preparar resposta
    const response = {
      ...feesData,
      success: true
    };

    res.json(response);

  } catch (error: any) {
    logger.error('❌ Error calculating collected fees:', error);

    let errorResponse: any = {
      error: 'Failed to calculate collected fees',
      message: error.message || 'Unknown error',
      timestamp: new Date().toISOString()
    };

    if (error.message?.includes('Position not found')) {
      errorResponse.statusCode = 404;
      errorResponse.suggestions = [
        'Verify if the position ID is correct',
        'Check if the position exists on the network',
        'Ensure the position is valid'
      ];
    } else {
      errorResponse.statusCode = 500;
      errorResponse.suggestions = [
        'Verify if the position ID is correct',
        'Check if the position exists on the network',
        'Ensure the network is accessible',
        'Try again in a few moments'
      ];
    }

    res.status(errorResponse.statusCode || 500).json(errorResponse);
  }
});

/**
 * Rota para calcular fees não coletadas (uncollected) de uma posição específica
 * GET /fees/uncollected/:positionId
 */
router.get('/uncollected/:positionId', async (req, res) => {
  try {
    const { positionId } = req.params;

    logger.info(`💰 Calculating uncollected fees for position: ${positionId}`);

    // Validar parâmetros
    if (!positionId || positionId.length < 32) {
      return res.status(400).json({ 
        error: 'Invalid position ID',
        message: 'Position ID must be a valid Solana public key (NFT mint)'
      });
    }

    // Calcular fees não coletadas usando apenas o positionId
    const feesData = await getOutstandingFeesForPositionById(positionId);

    // Preparar resposta
    const response = {
      ...feesData,
      success: true
    };

    res.json(response);

  } catch (error: any) {
    logger.error('❌ Error calculating uncollected fees:', error);

    let errorResponse: any = {
      error: 'Failed to calculate uncollected fees',
      message: error.message || 'Unknown error',
      timestamp: new Date().toISOString()
    };

    if (error.message?.includes('Position not found')) {
      errorResponse.statusCode = 404;
      errorResponse.suggestions = [
        'Verify if the position ID is correct',
        'Check if the position exists on the network',
        'Ensure the position is valid'
      ];
    } else if (error.message?.includes('Pool not found')) {
      errorResponse.statusCode = 404;
      errorResponse.suggestions = [
        'Verify if the position belongs to a valid pool',
        'Check if the pool exists on the network',
        'Ensure you are using the correct network (Mainnet/Devnet)'
      ];
    } else if (error.message?.includes('TickArray not initialized')) {
      errorResponse.statusCode = 500;
      errorResponse.suggestions = [
        'The position may be in a range with uninitialized ticks',
        'Try with a different position',
        'This is a known limitation for certain tick ranges'
      ];
    } else {
      errorResponse.statusCode = 500;
      errorResponse.suggestions = [
        'Verify if the position ID is correct',
        'Check if the position exists on the network',
        'Ensure the network is accessible',
        'Try again in a few moments'
      ];
    }

    res.status(errorResponse.statusCode || 500).json(errorResponse);
  }
});

export default router;