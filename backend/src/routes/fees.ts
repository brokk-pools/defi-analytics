import { Router } from 'express';
import { getOutstandingFeesForPosition, getOutstandingFeesForOwner, feesCollectedInRange } from '../lib/orca.js';
import { logger } from '../lib/logger.js';

const router = Router();

/**
 * Rota para calcular fees pendentes de um owner em uma pool específica
 * GET /fees/:poolId/:owner
 */
router.get('/:poolId/:owner', async (req, res) => {
  try {
    const { poolId, owner } = req.params;
    const { positionId, showPositions } = req.query;

    logger.info(`💰 Calculating outstanding fees for owner: ${owner} in pool: ${poolId}${positionId ? ` for position: ${positionId}` : ''}`);

    // Validar parâmetros obrigatórios
    if (!poolId || poolId.length < 32) {
      return res.status(400).json({
        error: 'Invalid pool ID',
        message: 'Pool ID must be a valid Solana public key'
      });
    }

    if (!owner || owner.length < 32) {
      return res.status(400).json({
        error: 'Invalid owner address',
        message: 'Owner address must be a valid Solana public key'
      });
    }

    // Processar parâmetros opcionais
    const positionIdStr = positionId as string || undefined;
    const showPositionsBool = showPositions === 'true';

    // Validar positionId se fornecido
    if (positionIdStr && positionIdStr.length < 32) {
      return res.status(400).json({
        error: 'Invalid position ID',
        message: 'Position ID must be a valid Solana public key (NFT mint)'
      });
    }

    // Calcular fees pendentes
    const outstandingFeesData = await getOutstandingFeesForOwner(
      poolId,
      owner,
      positionIdStr,
      showPositionsBool
    );

    // Preparar resposta
    const response = {
      ...outstandingFeesData,
      success: true
    };

    res.json(response);

  } catch (error: any) {
    logger.error('❌ Error calculating outstanding fees:', error);

    let errorResponse: any = {
      error: 'Failed to calculate outstanding fees',
      message: error.message || 'Unknown error',
      timestamp: new Date().toISOString()
    };

    if (error.message?.includes('Pool not found')) {
      errorResponse.statusCode = 404;
      errorResponse.suggestions = [
        'Verify if the pool ID is correct',
        'Check if the pool exists on the network',
        'Ensure you are using the correct network (Mainnet/Devnet)'
      ];
    } else if (error.message?.includes('Position not found')) {
      errorResponse.statusCode = 404;
      errorResponse.suggestions = [
        'Verify if the position ID is correct',
        'Check if the position exists on the network',
        'Ensure the position belongs to the specified pool'
      ];
    } else if (error.message?.includes('No positions found')) {
      errorResponse.statusCode = 404;
      errorResponse.suggestions = [
        'Verify if the owner address is correct',
        'Check if the owner has any positions in the specified pool'
      ];
    } else {
      errorResponse.statusCode = 500;
      errorResponse.suggestions = [
        'Verify if both pool ID and owner address are correct',
        'Check if the owner has any positions in the specified pool',
        'Ensure the network is accessible',
        'Try again in a few moments'
      ];
    }

    res.status(errorResponse.statusCode || 500).json(errorResponse);
  }
});

/**
 * Rota para calcular fees pendentes de uma posição específica (mantida para compatibilidade)
 * GET /fees/position/:positionId/:poolId
 */
router.get('/position/:positionId/:poolId', async (req, res) => {
  try {
    const { positionId, poolId } = req.params;

    logger.info(`💰 Calculating outstanding fees for position: ${positionId} in pool: ${poolId}`);

    // Validar parâmetros
    if (!positionId || positionId.length < 32) {
      return res.status(400).json({ 
        error: 'Invalid position ID',
        message: 'Position ID must be a valid Solana public key'
      });
    }

    if (!poolId || poolId.length < 32) {
      return res.status(400).json({ 
        error: 'Invalid pool ID',
        message: 'Pool ID must be a valid Solana public key'
      });
    }

    // Calcular fees pendentes
    const feesData = await getOutstandingFeesForPosition(poolId, positionId);

    // Preparar resposta
    const response = {
      ...feesData,
      success: true
    };

    res.json(response);

  } catch (error: any) {
    logger.error('❌ Error calculating outstanding fees:', error);

    let errorResponse: any = {
      error: 'Failed to calculate outstanding fees',
      message: error.message || 'Unknown error',
      timestamp: new Date().toISOString()
    };

    if (error.message?.includes('Position not found')) {
      errorResponse.statusCode = 404;
      errorResponse.suggestions = [
        'Verify if the position ID is correct',
        'Check if the position exists on the network',
        'Ensure the position belongs to the specified pool'
      ];
    } else if (error.message?.includes('Pool not found')) {
      errorResponse.statusCode = 404;
      errorResponse.suggestions = [
        'Verify if the pool ID is correct',
        'Check if the pool exists on the network',
        'Ensure you are using the correct network (Mainnet/Devnet)'
      ];
    } else if (error.message?.includes('TickArray not initialized')) {
      errorResponse.statusCode = 500;
      errorResponse.suggestions = [
        'The position may be in a range with uninitialized ticks',
        'Try with a different position or pool',
        'This is a known limitation for certain tick ranges'
      ];
    } else {
      errorResponse.statusCode = 500;
      errorResponse.suggestions = [
        'Verify if both position and pool IDs are correct',
        'Check if the position belongs to the specified pool',
        'Ensure the network is accessible',
        'Try again in a few moments'
      ];
    }

    res.status(errorResponse.statusCode || 500).json(errorResponse);
  }
});

/**
 * Rota para calcular fees já coletadas por um usuário em uma pool específica
 * GET /fees/collected/:poolId/:owner
 */
router.get('/collected/:poolId/:owner', async (req, res) => {
  try {
    const { poolId, owner } = req.params;
    const { startUtc, endUtc, showHistory, positionId } = req.query;

    logger.info(`💰 Calculating collected fees for owner: ${owner} in pool: ${poolId}${positionId ? ` for position: ${positionId}` : ''}`);

    // Validar parâmetros obrigatórios
    if (!poolId || poolId.length < 32) {
      return res.status(400).json({ 
        error: 'Invalid pool ID',
        message: 'Pool ID must be a valid Solana public key'
      });
    }

    if (!owner || owner.length < 32) {
      return res.status(400).json({ 
        error: 'Invalid owner address',
        message: 'Owner address must be a valid Solana public key'
      });
    }

    // Processar parâmetros opcionais
    const startUtcIso = startUtc as string || undefined;
    const endUtcIso = endUtc as string || undefined;
    const showHistoryBool = showHistory === 'true';
    const positionIdStr = positionId as string || undefined;

    // Validar positionId se fornecido
    if (positionIdStr && positionIdStr.length < 32) {
      return res.status(400).json({
        error: 'Invalid position ID',
        message: 'Position ID must be a valid Solana public key (NFT mint)'
      });
    }

    // Validar formato de datas se fornecidas
    if (startUtcIso) {
      const startDate = new Date(startUtcIso);
      if (isNaN(startDate.getTime())) {
        return res.status(400).json({
          error: 'Invalid start date format',
          message: 'Start date must be in ISO 8601 format (e.g., 2025-10-01T00:00:00Z)'
        });
      }
    }

    if (endUtcIso) {
      const endDate = new Date(endUtcIso);
      if (isNaN(endDate.getTime())) {
        return res.status(400).json({
          error: 'Invalid end date format',
          message: 'End date must be in ISO 8601 format (e.g., 2025-10-12T23:59:59Z)'
        });
      }
    }

    // Calcular fees coletadas
    const collectedFeesData = await feesCollectedInRange(
      poolId,
      owner,
      startUtcIso,
      endUtcIso,
      showHistoryBool,
      positionIdStr
    );

    // Preparar resposta
    const response = {
      ...collectedFeesData,
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

    if (error.message?.includes('endUtc < startUtc')) {
      errorResponse.statusCode = 400;
      errorResponse.suggestions = [
        'Ensure end date is after start date',
        'Check date format (ISO 8601)',
        'Verify timezone is UTC'
      ];
    } else if (error.message?.includes('Invalid UTC date')) {
      errorResponse.statusCode = 400;
      errorResponse.suggestions = [
        'Use ISO 8601 format for dates',
        'Example: 2025-10-01T00:00:00Z',
        'Ensure dates are in UTC timezone'
      ];
    } else if (error.message?.includes('Pool not found')) {
      errorResponse.statusCode = 404;
      errorResponse.suggestions = [
        'Verify if the pool ID is correct',
        'Check if the pool exists on the network',
        'Ensure you are using the correct network (Mainnet/Devnet)'
      ];
    } else {
      errorResponse.statusCode = 500;
      errorResponse.suggestions = [
        'Verify if both pool ID and owner address are correct',
        'Check if the owner has any positions in the specified pool',
        'Ensure the network is accessible',
        'Try with a smaller date range',
        'Try again in a few moments'
      ];
    }

    res.status(errorResponse.statusCode || 500).json(errorResponse);
  }
});

export default router;
