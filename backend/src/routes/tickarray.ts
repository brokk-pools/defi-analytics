import { Router } from 'express';
import { GetTickData } from '../lib/orca.js';
import { logger } from '../lib/logger.js';

const router = Router();

/**
 * Rota para buscar dados dos TickArrays de uma pool específica
 * GET /tickarray/:poolId
 * 
 * Parâmetros:
 * - poolId (obrigatório): Endereço da Whirlpool
 * 
 * Dados retornados:
 * - pool: Endereço da pool
 * - tickSpacing: Espaçamento entre ticks
 * - tickCurrentIndex: Tick atual da pool
 * - totalArrays: Número total de TickArrays encontrados
 * - tickArrays: Array com dados de cada TickArray
 */
router.get('/:poolId', async (req, res) => {
  try {
    const { poolId } = req.params;
    
    logger.info(`🔍 Buscando dados dos TickArrays para pool: ${poolId}`);
    
    if (!poolId) {
      return res.status(400).json({
        error: 'Pool ID parameter is required',
        message: 'Pool ID must be provided in the URL path'
      });
    }
    
    // Validar se o poolId é um endereço válido
    if (poolId.length < 32) {
      return res.status(400).json({
        error: 'Invalid pool ID',
        message: 'Pool ID must be a valid Solana public key'
      });
    }
    
    // Usar função centralizada do orca.ts para buscar dados dos TickArrays
    const response = await GetTickData(poolId);
    
    logger.info(`✅ Dados dos TickArrays obtidos com sucesso: ${poolId} (${response.totalArrays} arrays)`);
    res.json(response);
    
  } catch (error: any) {
    logger.error('❌ Erro ao buscar dados dos TickArrays:', error);
    
    let errorResponse: any = {
      error: 'Failed to fetch TickArray data',
      message: error.message || 'Unknown error',
      timestamp: new Date().toISOString(),
      poolId: req.params.poolId
    };

    if (error.message?.includes('Pool não encontrada') || error.message?.includes('Pool not found')) {
      errorResponse.statusCode = 404;
      errorResponse.suggestions = [
        'Verifique se o endereço da pool está correto',
        'Confirme se a pool existe na rede Mainnet',
        'O endereço deve ser uma Whirlpool válida do Orca'
      ];
    } else if (error.message?.includes('Invalid pool ID')) {
      errorResponse.statusCode = 400;
      errorResponse.suggestions = [
        'O endereço da pool deve ser uma chave pública Solana válida',
        'Verifique se o formato do endereço está correto'
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
