import { Router, Request, Response } from 'express';
import { getPositionDetailsData } from '../lib/orca.js';
import { logger } from '../lib/logger.js';

const router = Router();

/**
 * Rota para buscar dados completos de uma posição específica
 * GET /position/:nftMint
 * 
 * Parâmetros:
 * - nftMint (obrigatório): Endereço do NFT da posição
 * 
 * Dados retornados:
 * - position: Dados completos da posição incluindo tokens, ticks, liquidez, fees
 * - pool: Dados básicos da pool associada
 * - Metadados de tokens buscados dinamicamente (não apenas mapeados)
 */
router.get('/:nftMint', async (req: Request, res: Response) => {
  try {
    const { nftMint } = req.params;
    
    logger.info(`📍 Buscando dados da posição: ${nftMint}`);
    
    if (!nftMint) {
      return res.status(400).json({
        error: 'NFT mint parameter is required',
        message: 'NFT mint must be provided in the URL path'
      });
    }
    
    // Usar função centralizada do orca.ts para toda a lógica de negócio
    const response = await getPositionDetailsData(nftMint);
    
    logger.info(`✅ Dados da posição obtidos com sucesso: ${nftMint}`);
    res.json(response);
    
  } catch (error: any) {
    logger.error('❌ Erro ao buscar dados da posição:', error);
    
    let errorResponse: any = {
      error: 'Failed to fetch position details',
      message: error.message || 'Unknown error',
      timestamp: new Date().toISOString(),
      nftMint: req.params.nftMint
    };

    if (error.message?.includes('Invalid NFT mint')) {
      errorResponse.statusCode = 400;
      errorResponse.suggestions = [
        'Verifique se o endereço do NFT está correto',
        'O endereço deve ser uma chave pública Solana válida'
      ];
    } else if (error.message?.includes('Position not found')) {
      errorResponse.statusCode = 404;
      errorResponse.suggestions = [
        'Verifique se o NFT mint está correto',
        'Confirme se a posição existe na rede Mainnet',
        'A posição pode ter sido fechada ou não ser uma posição Orca Whirlpool válida'
      ];
    } else if (error.message?.includes('fetch position data')) {
      errorResponse.statusCode = 503;
      errorResponse.suggestions = [
        'O SDK do Orca pode estar temporariamente indisponível',
        'Tente novamente em alguns minutos',
        'Verifique se a conexão com a rede Solana está estável'
      ];
    } else {
      errorResponse.statusCode = 500;
      errorResponse.suggestions = [
        'Verifique se o endereço do NFT está correto',
        'Confirme se a rede Mainnet está acessível',
        'Verifique se as dependências estão atualizadas',
        'Configure uma chave de API da Helius para melhor performance'
      ];
    }

    res.status(errorResponse.statusCode || 500).json(errorResponse);
  }
});

export default router;