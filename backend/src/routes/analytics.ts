import { Router } from 'express';
import { calculateAnalytics } from '../lib/brokkfinancepools.js';
import { logger } from '../lib/logger.js';

const router = Router();


/**
 * Rota para análise financeira completa de um LP na Orca Whirlpools
 * GET /analytics/:poolId/:owner
 */
router.get('/:poolId/:owner', async (req, res) => {
  try {
    const { poolId, owner } = req.params;
    const { positionId, startUtc, endUtc } = req.query;

    logger.info(`📊 Calculating analytics for owner: ${owner} in pool: ${poolId}${positionId ? ` for position: ${positionId}` : ''}`);

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
    const startUtcIso = startUtc as string || undefined;
    const endUtcIso = endUtc as string || undefined;

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

    // Calcular analytics usando a função centralizada
    const analyticsData = await calculateAnalytics(
      poolId,
      owner,
      positionIdStr,
      startUtcIso,
      endUtcIso
    );

    res.json(analyticsData);

  } catch (error: any) {
    logger.error('❌ Error calculating analytics:', error);

    let errorResponse: any = {
      error: 'Failed to calculate analytics',
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
        'Try with a smaller date range',
        'Try again in a few moments'
      ];
    }

    res.status(errorResponse.statusCode || 500).json(errorResponse);
  }
});

export default router;
