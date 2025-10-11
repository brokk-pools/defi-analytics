import { Router } from 'express';
import { fetchPoolsFromOrcaAPI } from '../lib/orca.js';
import { logger } from '../lib/logger.js';

const router = Router();

// Rota para buscar pools
router.get('/', async (req, res) => {
  try {
    const { poolId, sortBy, sortDirection } = req.query;
    
    logger.info('🔍 Buscando pools da Orca via API oficial...');
    
    const data = await fetchPoolsFromOrcaAPI(
      poolId as string, 
      sortBy as string, 
      sortDirection as string
    );
    
    // A API da Orca v2 retorna { data: [...], meta: {...} }
    const pools = data.data || data;
    const totalPools = Array.isArray(pools) ? pools.length : 1;
    
    const result = {
      timestamp: new Date().toISOString(),
      method: 'Orca API',
      source: 'https://api.orca.so/v2/solana/pools',
      totalPools: totalPools,
      hasMore: data.hasMore || false,
      queryParams: {
        sortBy: sortBy || null,
        sortDirection: sortDirection || null
      },
      data: pools
    };
    
    logger.info(`✅ Pools obtidas com sucesso: ${totalPools} pools encontradas`);
    res.json(result);
    
  } catch (error) {
    logger.error('❌ Erro na rota pools:', error);
    res.status(500).json({ 
      error: 'Failed to fetch pools from Orca API',
      message: (error as Error).message 
    });
  }
});

// Rota para buscar pool específica por ID
router.get('/:poolId', async (req, res) => {
  try {
    const { poolId } = req.params;
    
    logger.info(`🔍 Buscando pool específica: ${poolId}`);
    
    const data = await fetchPoolsFromOrcaAPI(poolId);
    
    const result = {
      timestamp: new Date().toISOString(),
      method: 'Orca API',
      source: `https://api.orca.so/v2/solana/pools`,
      totalPools: 1,
      data: data
    };
    
    logger.info(`✅ Pool específica obtida com sucesso: ${poolId}`);
    res.json(result);
    
  } catch (error) {
    logger.error('❌ Erro na rota pools por ID:', error);
    res.status(500).json({ 
      error: 'Failed to fetch pool from Orca API',
      message: (error as Error).message 
    });
  }
});

export default router;