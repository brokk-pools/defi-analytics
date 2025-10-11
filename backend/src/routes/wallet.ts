import { Router, Request, Response } from 'express';
import { getLiquidityOverview } from '../lib/orca.js';
import { logger } from '../lib/logger.js';

const router = Router();

/**
 * Rota para buscar posições de uma carteira específica
 * GET /wallet/:publicKey
 * 
 * Retorna as posições da carteira no mesmo formato das outras rotas de posição
 */
router.get('/:publicKey', async (req: Request, res: Response) => {
  try {
    const { publicKey } = req.params;
    
    logger.info(`🔍 Buscando posições da carteira: ${publicKey}`);
    
    if (!publicKey || publicKey.length < 32) {
      return res.status(400).json({
        error: 'Invalid public key',
        message: 'Public key must be a valid Solana public key'
      });
    }
    
    // Usar função centralizada do orca.ts para toda a lógica de negócio
    const response = await getLiquidityOverview(publicKey);
    
    logger.info(`✅ Posições da carteira obtidas com sucesso: ${publicKey}`);
    res.json(response);
    
  } catch (error: any) {
    logger.error('❌ Erro ao buscar posições da carteira:', error);
    
    let errorResponse: any = {
      error: 'Failed to fetch wallet positions',
      message: error.message || 'Unknown error',
      timestamp: new Date().toISOString(),
      wallet: req.params.publicKey
    };

    if (error.message?.includes('Invalid owner address')) {
      errorResponse.statusCode = 400;
      errorResponse.suggestions = [
        'Verifique se o endereço da carteira está correto',
        'O endereço deve ser uma chave pública Solana válida'
      ];
    } else if (error.message?.includes('No liquidity positions found')) {
      errorResponse.statusCode = 404;
      errorResponse.suggestions = [
        'Esta carteira não possui posições de liquidez no Orca Whirlpools',
        'Verifique se o endereço está correto',
        'A carteira pode não ter posições ativas'
      ];
    } else if (error.context?.statusCode === 429) {
      errorResponse.statusCode = 429;
      errorResponse.suggestions = [
        'Rate limit exceeded',
        'Wait a moment before trying again',
        'Configure a Helius API key to avoid rate limits'
      ];
    } else {
      errorResponse.statusCode = 500;
      errorResponse.suggestions = [
        'Verifique se o endereço da carteira está correto',
        'Confirme se a rede Mainnet está acessível',
        'Verifique se as dependências estão atualizadas',
        'Configure uma chave de API da Helius para melhor performance'
      ];
    }

    res.status(errorResponse.statusCode || 500).json(errorResponse);
  }
});

export default router;