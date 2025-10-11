import express from 'express';
import { fetchPositionsForOwner, setWhirlpoolsConfig } from '@orca-so/whirlpools';
import { createSolanaRpc, mainnet, address } from '@solana/kit';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../lib/logger';

dotenv.config();

const router = express.Router();

/**
 * Função para obter URL do RPC baseado no provider
 */
function getRpcUrl(provider: 'helius' | 'alchemy' | 'quicknode', network: 'mainnet' | 'devnet'): string {
  const apiKey = process.env.HELIUS_API_KEY;
  
  switch (provider) {
    case 'helius':
      if (network === 'mainnet') {
        return apiKey ? `https://mainnet.helius-rpc.com/?api-key=${apiKey}` : 'https://api.mainnet-beta.solana.com';
      } else {
        return apiKey ? `https://devnet.helius-rpc.com/?api-key=${apiKey}` : 'https://api.devnet.solana.com';
      }
    case 'alchemy':
      return network === 'mainnet' ? 'https://solana-mainnet.g.alchemy.com/v2/demo' : 'https://solana-devnet.g.alchemy.com/v2/demo';
    case 'quicknode':
      return network === 'mainnet' ? 'https://api.mainnet-beta.solana.com' : 'https://api.devnet.solana.com';
    default:
      return network === 'mainnet' ? 'https://api.mainnet-beta.solana.com' : 'https://api.devnet.solana.com';
  }
}

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
 * Função para salvar posições como arquivo JSON
 */
function savePositionsToFile(positions: any[], owner: string): string {
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
  const filename = `positions_${owner}_${timestamp}.json`;
  const filepath = path.join(resultDir, filename);

  // Converter BigInt para string antes de salvar
  const convertedPositions = convertBigIntToString(positions);

  // Dados para salvar
  const dataToSave = {
    timestamp: now.toISOString(),
    owner: owner,
    totalPositions: positions.length,
    positions: convertedPositions
  };

  // Salvar arquivo
  fs.writeFileSync(filepath, JSON.stringify(dataToSave, null, 2), 'utf8');
  
  return filepath;
}

/**
 * Rota para buscar posições de um proprietário
 */
router.get('/:owner', async (req, res) => {
  try {
    const { owner } = req.params;
    const { saveFile } = req.query;

    logger.info(`🔍 Buscando posições para o proprietário: ${owner}`);

    // Validar endereço do proprietário
    if (!owner || owner.length < 32) {
      return res.status(400).json({ 
        error: 'Invalid owner address',
        message: 'Owner address must be a valid Solana public key'
      });
    }

    // Configurar para usar a rede Mainnet
    await setWhirlpoolsConfig('solanaMainnet');
    logger.info('✅ Configurado para usar Solana Mainnet');

    // Configuração do RPC usando a função de configuração
    const rpcProvider = process.env.RPC_PROVIDER || 'helius';
    const rpcUrl = getRpcUrl(rpcProvider as 'helius' | 'alchemy' | 'quicknode', 'mainnet');
    
    if (rpcProvider === 'helius') {
      logger.info('✅ Usando Helius RPC (sem rate limiting)');
    } else {
      logger.info(`✅ Usando RPC ${rpcProvider}`);
    }

    // Criar conexão RPC
    const rpc = createSolanaRpc(mainnet(rpcUrl));
    logger.info(`✅ Conectado à rede Mainnet via ${rpcProvider}`);

    // Converter endereço para o formato correto
    const ownerAddress = address(owner);
    logger.info(`🔍 Buscando posições para o proprietário: ${ownerAddress}`);

    // Buscar posições do proprietário
    const positions = await fetchPositionsForOwner(rpc, ownerAddress);

    logger.info(`📊 Encontradas ${positions?.length || 0} posições`);

    // Preparar resposta
    const response = {
      timestamp: new Date().toISOString(),
      method: 'fetchPositionsForOwner',
      rpcProvider: rpcProvider,
      owner: owner,
      totalPositions: positions?.length || 0,
      positions: convertBigIntToString(positions || [])
    };

    // Salvar arquivo se solicitado
    if (saveFile === 'true' && positions && positions.length > 0) {
      try {
        const savedFilePath = savePositionsToFile(positions, owner);
        response.savedFile = savedFilePath;
        logger.info(`💾 Posições salvas em: ${savedFilePath}`);
      } catch (fileError) {
        logger.warn('⚠️ Erro ao salvar arquivo:', fileError);
        response.fileError = 'Failed to save file';
      }
    }

    if (positions && positions.length > 0) {
      res.json(response);
    } else {
      res.status(404).json({
        ...response,
        message: 'Nenhuma posição encontrada para este proprietário',
        possibleReasons: [
          'O proprietário não possui posições na rede Mainnet',
          'O endereço pode estar incorreto',
          'As posições podem estar em uma rede diferente'
        ]
      });
    }

  } catch (error: any) {
    logger.error('❌ Erro ao buscar posições:', error);

    let errorResponse: any = {
      error: 'Failed to fetch positions',
      message: error.message || 'Unknown error',
      timestamp: new Date().toISOString()
    };

    if (error.context?.statusCode === 429) {
      errorResponse.rateLimitExceeded = true;
      errorResponse.suggestions = [
        'A API pública da Solana tem limites de requisição',
        'Considere usar a API da Helius para evitar rate limiting',
        'Configure HELIUS_API_KEY no arquivo .env'
      ];
    } else if (error instanceof Error) {
      errorResponse.suggestions = [
        'Verifique se o endereço do proprietário está correto',
        'Confirme se a rede Mainnet está acessível',
        'Verifique se as dependências estão atualizadas',
        'Configure uma chave de API da Helius'
      ];
    }

    res.status(500).json(errorResponse);
  }
});

export default router;
