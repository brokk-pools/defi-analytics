import express from 'express';
import { getPoolDetailsData } from '../lib/orca.js';
import { logger } from '../lib/logger.js';

const router = express.Router();

/**
 * Rota para buscar dados completos de uma pool específica
 * GET /poolsdetails/:poolid
 * 
 * Query Parameters:
 * - topPositions: número (ex: 10) para limitar a N posições com maior liquidez. Se > 0, inclui posições
 * 
 * Dados retornados para visualizações:
 * - allTicks: Array de todos os ticks com dados detalhados (tickIndex, price, priceAdjusted, liquidityGross, etc.)
 * - tickStats: Estatísticas dos ticks incluindo análise de range e concentração de liquidez
 * - tickStats.rangeAnalysis.ticksAroundCurrent: Ticks próximos ao preço atual para análise de range
 * - tickStats.rangeAnalysis.liquidityConcentration: Distribuição de liquidez por tick
 * - tickStats.currentPrice: Preço atual ajustado para os tokens da pool
 * - tickStats.liquidityDistribution: Estatísticas de distribuição de liquidez (total, média, min, max)
 * 
 * Dados das posições (quando topPositions > 0):
 * - positions: Array de posições com dados básicos (liquidez, fees, range, status)
 * - positionStats: Estatísticas agregadas das posições (ativas, fora do range, fees totais)
 * - Cada posição inclui: pubkey, tickLower/Upper, liquidez, fees, isInRange, preços, status
 */
router.get('/:poolid', async (req, res) => {
  try {
    const { poolid } = req.params;
    const { topPositions } = req.query;

    logger.info(`🔍 Buscando dados completos da pool: ${poolid}`);

    // Usar função centralizada do orca.ts para toda a lógica de negócio
    const response = await getPoolDetailsData(poolid, topPositions as string);

    logger.info(`✅ Dados da pool obtidos com sucesso: ${poolid}`);
    res.json(response);

  } catch (error: any) {
    logger.error('❌ Erro ao buscar dados da pool:', error);

    let errorResponse: any = {
      error: 'Failed to fetch pool details',
      message: error.message || 'Unknown error',
      timestamp: new Date().toISOString(),
      poolId: req.params.poolid
    };

    if (error.message?.includes('Invalid pool address')) {
      errorResponse.statusCode = 400;
      errorResponse.suggestions = [
        'Verifique se o endereço da pool está correto',
        'O endereço deve ser uma chave pública Solana válida'
      ];
    } else if (error.message?.includes('Invalid topPositions parameter')) {
      errorResponse.statusCode = 400;
      errorResponse.suggestions = [
        'topPositions deve ser um número entre 0 e 1000',
        'Use 0 para omitir posições ou um número > 0 para incluir posições'
      ];
    } else if (error.message?.includes('Pool not found')) {
      errorResponse.statusCode = 404;
      errorResponse.suggestions = [
        'Verifique se o endereço da pool está correto',
        'Confirme se a pool existe na rede Mainnet',
        'A pool pode ter sido removida ou não estar ativa'
      ];
    } else if (error.message?.includes('SDK failed')) {
      errorResponse.statusCode = 503;
      errorResponse.suggestions = [
        'O SDK do Orca pode estar temporariamente indisponível',
        'Tente novamente em alguns minutos',
        'Verifique se a conexão com a rede Solana está estável'
      ];
    } else {
      errorResponse.statusCode = 500;
      errorResponse.suggestions = [
        'Verifique se o endereço da pool está correto',
        'Confirme se a rede Mainnet está acessível',
        'Verifique se as dependências estão atualizadas',
        'Configure uma chave de API da Helius para melhor performance'
      ];
    }

    res.status(errorResponse.statusCode || 500).json(errorResponse);
  }
});

export default router;
