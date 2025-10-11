import { Router } from 'express';

const router = Router();

/**
 * Função para buscar pools usando a API oficial da Orca
 * Documentação: https://api.orca.so/docs#tag/whirlpools/get/pools
 */
async function fetchPoolsFromOrcaAPI(poolId?: string, sortBy?: string, sortDirection?: string): Promise<any> {
  try {
    let url = 'https://api.orca.so/v2/solana/pools';
    
    if (poolId) {
      // Para pool específico, usar API v2 e filtrar depois
      url = 'https://api.orca.so/v2/solana/pools';
    } else {
      // Adicionar parâmetros de query para a lista de pools
      const queryParams = new URLSearchParams();
      
      if (sortBy) {
        queryParams.append('sortBy', sortBy);
        // Se sortBy é fornecido, sempre incluir sortDirection (padrão: desc)
        queryParams.append('sortDirection', sortDirection || 'desc');
      }
      
      // Parâmetros mínimos para não filtrar resultados
      queryParams.append('stats', '5m');
      queryParams.append('includeBlocked', 'true');
      
      if (queryParams.toString()) {
        url += `?${queryParams.toString()}`;
      }
    }
    
    console.log(`🌐 Buscando dados da API da Orca: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'orca-whirlpools-mvp/1.0'
      }
    });
    
    if (!response.ok) {
      throw new Error(`API da Orca retornou status ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Verificar se a resposta contém erro
    if (data.lasterror) {
      console.warn(`⚠️ API da Orca retornou erro: ${data.lasterror}`);
      // Se há parâmetros de query, tentar novamente sem eles
      if (sortBy || sortDirection) {
        console.log('🔄 Tentando novamente sem parâmetros de ordenação...');
        const fallbackUrl = 'https://api.orca.so/v2/solana/pools';
        const fallbackResponse = await fetch(fallbackUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'orca-whirlpools-mvp/1.0'
          }
        });
        
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          console.log(`✅ Dados recebidos da API da Orca (fallback sem parâmetros)`);
          return fallbackData;
        }
      }
      throw new Error(`API da Orca retornou erro: ${data.lasterror}`);
    }
    
        console.log(`✅ Dados recebidos da API da Orca`);
        
        // Se foi solicitado um pool específico, filtrar os resultados
        if (poolId && data.data) {
          const specificPool = data.data.find((pool: any) => pool.address === poolId);
          if (specificPool) {
            return {
              data: [specificPool],
              meta: data.meta
            };
          } else {
            throw new Error(`Pool com ID ${poolId} não encontrado`);
          }
        }
        
        return data;
  } catch (error) {
    console.error('❌ Erro ao buscar dados da API da Orca:', error);
    throw new Error(`Erro na API da Orca: ${(error as Error).message}`);
  }
}

// Rota para buscar pools
router.get('/', async (req, res) => {
  try {
    const { poolId, sortBy, sortDirection } = req.query;
    
    console.log('🔍 Buscando pools da Orca via API oficial...');
    
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
    
    res.json(result);
    
  } catch (error) {
    console.error('❌ Erro na rota pools:', error);
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
    
    console.log(`🔍 Buscando pool específica: ${poolId}`);
    
    const data = await fetchPoolsFromOrcaAPI(poolId);
    
    const result = {
      timestamp: new Date().toISOString(),
      method: 'Orca API',
      source: `https://api.orca.so/v1/whirlpool/${poolId}`,
      totalPools: 1,
      data: data
    };
    
    res.json(result);
    
  } catch (error) {
    console.error('❌ Erro na rota pools por ID:', error);
    res.status(500).json({ 
      error: 'Failed to fetch pool from Orca API',
      message: (error as Error).message 
    });
  }
});

export default router;