import express from 'express';
import { getFullPoolData } from '../lib/orca.js';
import { logger } from '../lib/logger.js';

const router = express.Router();

/**
 * Função para converter BigInt para string recursivamente
 */
function convertBigIntToString(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === 'bigint') {
    return obj.toString();
  }
  
  if (Array.isArray(obj)) {
    return obj.map(convertBigIntToString);
  }
  
  if (typeof obj === 'object') {
    const converted: any = {};
    for (const [key, value] of Object.entries(obj)) {
      converted[key] = convertBigIntToString(value);
    }
    return converted;
  }
  
  return obj;
}

/**
 * Rota para buscar dados completos de uma pool específica
 * GET /poolsdetails/:poolid
 * 
 * Query Parameters:
 * - showpositions: 'true' para incluir detalhes das posições, qualquer outro valor para omitir
 * - saveFile: 'true' para salvar resultado em arquivo JSON
 * 
 * Dados retornados para visualizações:
 * - allTicks: Array de todos os ticks com dados detalhados (tickIndex, price, priceAdjusted, liquidityGross, etc.)
 * - tickStats: Estatísticas dos ticks incluindo análise de range e concentração de liquidez
 * - tickStats.rangeAnalysis.ticksAroundCurrent: Ticks próximos ao preço atual para análise de range
 * - tickStats.rangeAnalysis.liquidityConcentration: Distribuição de liquidez por tick
 * - tickStats.currentPrice: Preço atual ajustado para os tokens da pool
 * - tickStats.liquidityDistribution: Estatísticas de distribuição de liquidez (total, média, min, max)
 */
router.get('/:poolid', async (req, res) => {
  try {
    const { poolid } = req.params;
    const { saveFile, showpositions } = req.query;

    logger.info(`🔍 Buscando dados completos da pool: ${poolid}`);

    // Validar endereço da pool
    if (!poolid || poolid.length < 32) {
      return res.status(400).json({ 
        error: 'Invalid pool address',
        message: 'Pool address must be a valid Solana public key'
      });
    }

    // Determinar se deve incluir posições baseado no parâmetro showpositions
    const includePositions = showpositions === 'true';
    
    logger.info(`🔍 Buscando dados da pool ${poolid} (posições: ${includePositions ? 'incluídas' : 'omitidas'})`);

    // Buscar dados completos da pool usando o SDK do Orca
    const poolData = await getFullPoolData(poolid, includePositions);

    logger.info(`✅ Dados da pool obtidos com sucesso: ${poolid}`);

    // Preparar resposta
    const response: any = {
      timestamp: new Date().toISOString(),
      method: 'getFullPoolData',
      poolId: poolid,
      showPositions: includePositions,
      success: true,
      data: convertBigIntToString(poolData)
    };

    // Salvar arquivo se solicitado
    if (saveFile === 'true') {
      try {
        const fs = await import('fs');
        const path = await import('path');
        
        // Criar pasta resultfiles se não existir
        const resultDir = path.join(process.cwd(), 'resultfiles');
        if (!fs.existsSync(resultDir)) {
          fs.mkdirSync(resultDir, { recursive: true });
        }

        // Gerar timestamp no formato yyyymmddhhmmss
        const now = new Date();
        const timestamp = now.getFullYear().toString() +
          (now.getMonth() + 1).toString().padStart(2, '0') +
          now.getDate().toString().padStart(2, '0') +
          now.getHours().toString().padStart(2, '0') +
          now.getMinutes().toString().padStart(2, '0') +
          now.getSeconds().toString().padStart(2, '0');

        // Nome do arquivo
        const filename = `pool_details_${poolid}_${timestamp}.json`;
        const filepath = path.join(resultDir, filename);

        // Salvar arquivo
        fs.writeFileSync(filepath, JSON.stringify(response, null, 2), 'utf8');
        
        response.savedFile = filepath;
        logger.info(`💾 Dados da pool salvos em: ${filepath}`);
      } catch (fileError) {
        logger.warn('⚠️ Erro ao salvar arquivo:', fileError);
        response.fileError = 'Failed to save file';
      }
    }

    res.json(response);

  } catch (error: any) {
    logger.error('❌ Erro ao buscar dados da pool:', error);

    let errorResponse: any = {
      error: 'Failed to fetch pool details',
      message: error.message || 'Unknown error',
      timestamp: new Date().toISOString(),
      poolId: req.params.poolid
    };

    if (error.message?.includes('Pool not found')) {
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
