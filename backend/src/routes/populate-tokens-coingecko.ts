import { Router } from 'express';
import { db } from '../lib/db.js';
import { logger } from '../lib/logger.js';

const router = Router();

interface CoinGeckoToken {
  id: string;
  symbol: string;
  name: string;
  platforms: {
    solana?: string;
    [key: string]: string | undefined;
  };
}

/**
 * Rota para popular a tabela token_metadata com dados do CoinGecko
 * GET /populate-tokens-coingecko
 * 
 * Esta rota:
 * 1. Apaga todos os dados da tabela token_metadata
 * 2. Busca todos os tokens da API do CoinGecko
 * 3. Filtra apenas tokens que têm platform "solana"
 * 4. Insere os tokens filtrados na tabela
 */
router.get('/', async (req, res) => {
  try {
    logger.info('🔄 Iniciando população de tokens do CoinGecko...');

    // 1. Apagar toda a tabela token_metadata
    logger.info('🗑️ Apagando dados existentes da tabela token_metadata...');
    await db.query('DELETE FROM token_metadata');
    
    // 2. Buscar dados da API do CoinGecko
    logger.info('📡 Buscando dados da API do CoinGecko...');
    const response = await fetch('https://api.coingecko.com/api/v3/coins/list?include_platform=true');
    
    if (!response.ok) {
      throw new Error(`Erro na API do CoinGecko: ${response.status} ${response.statusText}`);
    }
    
    const tokens: CoinGeckoToken[] = await response.json();
    logger.info(`📊 Recebidos ${tokens.length} tokens da API do CoinGecko`);

    // 3. Filtrar tokens que têm platform "solana"
    const solanaTokens = tokens.filter(token => 
      token.platforms && 
      token.platforms.solana && 
      token.platforms.solana.trim().length > 0
    );
    
    logger.info(`🔍 Encontrados ${solanaTokens.length} tokens com platform Solana`);

    if (solanaTokens.length === 0) {
      return res.json({
        success: true,
        message: 'Nenhum token Solana encontrado',
        stats: {
          totalTokens: tokens.length,
          solanaTokens: 0,
          inserted: 0
        }
      });
    }

    // 4. Inserir tokens filtrados na tabela
    logger.info('💾 Inserindo tokens na tabela token_metadata...');
    
    let insertedCount = 0;
    const batchSize = 100; // Processar em lotes para evitar problemas de memória
    
    for (let i = 0; i < solanaTokens.length; i += batchSize) {
      const batch = solanaTokens.slice(i, i + batchSize);
      
      // Inserir um por vez para evitar problemas com placeholders
      for (const token of batch) {
        try {
          await db.query(`
            INSERT INTO token_metadata (token, symbol, coingecko_id)
            VALUES ($1, $2, $3)
            ON CONFLICT (token) DO UPDATE SET
              symbol = EXCLUDED.symbol,
              coingecko_id = EXCLUDED.coingecko_id,
              updated_at = NOW()
          `, [
            token.platforms.solana!, // token address
            token.symbol,            // symbol
            token.id                 // coingecko_id
          ]);
          
          insertedCount++;
        } catch (error) {
          logger.warn(`⚠️ Erro ao inserir token ${token.symbol}:`, error);
        }
      }
      
      logger.info(`📝 Processados ${insertedCount}/${solanaTokens.length} tokens`);
    }

    logger.info(`✅ População concluída! ${insertedCount} tokens inseridos/atualizados`);

    res.json({
      success: true,
      message: 'Tokens do CoinGecko populados com sucesso',
      stats: {
        totalTokens: tokens.length,
        solanaTokens: solanaTokens.length,
        inserted: insertedCount
      },
      sampleTokens: solanaTokens.slice(0, 5).map(token => ({
        token: token.platforms.solana,
        symbol: token.symbol,
        coingecko_id: token.id,
        name: token.name
      }))
    });

  } catch (error: any) {
    logger.error('❌ Erro ao popular tokens do CoinGecko:', error);
    res.status(500).json({
      success: false,
      error: 'Falha ao popular tokens do CoinGecko',
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
