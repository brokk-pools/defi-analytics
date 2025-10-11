import express from 'express';
import { getFullPoolData } from '../lib/orca.js';
import { logger } from '../lib/logger.js';

const router = express.Router();

/**
 * Rota para obter dados detalhados de uma pool específica
 */
router.get('/:poolid', async (req, res) => {
  try {
    const { poolid } = req.params;

    logger.info(`🔍 Buscando dados detalhados da pool: ${poolid}`);

    // Validar endereço da pool
    if (!poolid || poolid.length < 32) {
      return res.status(400).json({ 
        error: 'Invalid pool ID',
        message: 'Pool ID must be a valid Solana public key'
      });
    }

    // Buscar dados completos da pool
    const poolData = await getFullPoolData(poolid);

    logger.info(`✅ Dados da pool ${poolid} obtidos com sucesso`);

    res.json(poolData);

  } catch (error: any) {
    logger.error('❌ Erro ao buscar dados da pool:', error);

    let errorResponse: any = {
      error: 'Failed to fetch pool details',
      message: error.message || 'Unknown error',
      timestamp: new Date().toISOString()
    };

    if (error.message?.includes('Invalid public key')) {
      errorResponse.suggestions = [
        'Verifique se o endereço da pool está correto',
        'O endereço deve ser uma chave pública válida do Solana'
      ];
    } else if (error.message?.includes('Account does not exist')) {
      errorResponse.suggestions = [
        'A pool pode não existir na rede Mainnet',
        'Verifique se o endereço está correto',
        'A pool pode ter sido removida ou migrada'
      ];
    } else {
      errorResponse.suggestions = [
        'Verifique se a pool existe na rede Mainnet',
        'Confirme se a rede está acessível',
        'Verifique se as dependências estão atualizadas'
      ];
    }

    res.status(500).json(errorResponse);
  }
});

export default router;
