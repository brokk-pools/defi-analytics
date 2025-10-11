import { Router } from 'express';
import { Connection, PublicKey } from '@solana/web3.js';
import { setWhirlpoolsConfig } from '@orca-so/whirlpools';
import { makeConnection } from '../lib/orca.js';

const router = Router();

// ID do programa Whirlpool da Orca
const WHIRLPOOL_PROGRAM_ID = new PublicKey('whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc');

/**
 * Função para decodificar os bytes da posição usando o layout exato da Orca
 * Layout: 216 bytes total
 */
function decodePositionData(rawData: Buffer): any {
  try {
    // Verificar se tem o tamanho correto
    if (rawData.length !== 216) {
      throw new Error(`Tamanho incorreto: esperado 216 bytes, recebido ${rawData.length}`);
    }

    // Verificar discriminator (primeiros 8 bytes)
    const discriminator = rawData.slice(0, 8);
    const expectedDiscriminator = Buffer.from([0xaa, 0xbc, 0x8f, 0xe4, 0x7a, 0x40, 0xf7, 0xd0]);
    
    if (!discriminator.equals(expectedDiscriminator)) {
      throw new Error('Discriminator inválido - não é uma conta de posição válida');
    }

    // Decodificar campos usando little-endian
    const decoded = {
      discriminator: Array.from(discriminator),
      
      // Offset 8: whirlpool (32 bytes)
      whirlpool: new PublicKey(rawData.slice(8, 40)).toString(),
      
      // Offset 40: positionMint (32 bytes)
      positionMint: new PublicKey(rawData.slice(40, 72)).toString(),
      
      // Offset 72: liquidity (16 bytes, u128 LE)
      liquidity: rawData.readBigUInt64LE(72) + (rawData.readBigUInt64LE(80) << 64n),
      
      // Offset 88: tickLowerIndex (4 bytes, i32 LE)
      tickLowerIndex: rawData.readInt32LE(88),
      
      // Offset 92: tickUpperIndex (4 bytes, i32 LE)
      tickUpperIndex: rawData.readInt32LE(92),
      
      // Offset 96: feeGrowthCheckpointA (16 bytes, u128 LE)
      feeGrowthCheckpointA: rawData.readBigUInt64LE(96) + (rawData.readBigUInt64LE(104) << 64n),
      
      // Offset 112: feeOwedA (8 bytes, u64 LE)
      feeOwedA: rawData.readBigUInt64LE(112),
      
      // Offset 120: feeGrowthCheckpointB (16 bytes, u128 LE)
      feeGrowthCheckpointB: rawData.readBigUInt64LE(120) + (rawData.readBigUInt64LE(128) << 64n),
      
      // Offset 136: feeOwedB (8 bytes, u64 LE)
      feeOwedB: rawData.readBigUInt64LE(136),
      
      // Offset 144: rewardInfos[3] (24 bytes cada = 72 bytes total)
      rewardInfos: [] as any[]
    };

    // Decodificar rewardInfos (3 estruturas de 24 bytes cada)
    for (let i = 0; i < 3; i++) {
      const offset = 144 + (i * 24);
      const rewardInfo = {
        // growthInsideCheckpoint (16 bytes, u128 LE)
        growthInsideCheckpoint: rawData.readBigUInt64LE(offset) + (rawData.readBigUInt64LE(offset + 8) << 64n),
        // amountOwed (8 bytes, u64 LE)
        amountOwed: rawData.readBigUInt64LE(offset + 16)
      };
      decoded.rewardInfos.push(rewardInfo);
    }

    return decoded;
  } catch (error) {
    console.error('Erro ao decodificar dados da posição:', error);
    return null;
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
 * Função para buscar todas as posições usando getProgramAccounts
 */
async function fetchAllPositionsDirect(connection: Connection): Promise<any[]> {
  console.log('🔍 Buscando TODAS as posições usando getProgramAccounts...');
  console.log(`📋 Programa Whirlpool: ${WHIRLPOOL_PROGRAM_ID.toString()}`);
  
  try {
    // Usar getProgramAccounts para buscar todas as contas do programa Whirlpool
    const programAccounts = await connection.getProgramAccounts(WHIRLPOOL_PROGRAM_ID, {
      // Filtrar apenas contas de posição (tamanho específico)
      filters: [
        {
          dataSize: 216, // Tamanho de uma conta de posição Whirlpool
        }
      ]
    });

    console.log(`📊 Total de contas encontradas: ${programAccounts.length}`);
    
    const positions: any[] = [];
    
    for (const account of programAccounts) {
      try {
        // Verificar se é uma conta de posição válida
        const accountInfo = account.account;
        
        if (accountInfo.data.length === 216) {
          // Decodificar os dados da posição
          const decodedData = decodePositionData(accountInfo.data);
          
          if (decodedData) {
            // Criar objeto de posição com dados decodificados
            const position = {
              executable: accountInfo.executable,
              lamports: accountInfo.lamports,
              programAddress: accountInfo.owner.toString(),
              space: accountInfo.data.length,
              address: account.pubkey.toString(),
              data: decodedData, // Dados decodificados em vez de bytes brutos
              exists: true,
              tokenProgram: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",
              isPositionBundle: false
            };
            
            positions.push(position);
          }
        }
      } catch (error) {
        console.log(`⚠️  Erro ao processar conta ${account.pubkey.toString()}:`, error);
      }
    }
    
    console.log(`✅ Posições válidas encontradas: ${positions.length}`);
    return positions;
    
  } catch (error) {
    console.error('❌ Erro ao buscar posições:', error);
    return [];
  }
}

/**
 * Função para encontrar top posições sem ordenar tudo (otimizada para evitar stack overflow)
 */
function findTopPositions(positions: any[], count: number): any[] {
  if (positions.length <= count) {
    return positions;
  }
  
  console.log(`🔍 Encontrando top ${count} posições de ${positions.length} total...`);
  
  // Usar uma abordagem mais eficiente: processar em lotes pequenos
  const batchSize = 1000;
  let topPositions: any[] = [];
  
  for (let i = 0; i < positions.length; i += batchSize) {
    const batch = positions.slice(i, i + batchSize);
    
    // Processar lote atual
    for (const position of batch) {
      if (topPositions.length < count) {
        topPositions.push(position);
      } else {
        // Encontrar a posição com menor liquidez na lista atual
        let minIndex = 0;
        for (let j = 1; j < topPositions.length; j++) {
          const jLiquidity = BigInt(topPositions[j].data?.liquidity || 0);
          const minLiquidity = BigInt(topPositions[minIndex].data?.liquidity || 0);
          
          if (jLiquidity < minLiquidity) {
            minIndex = j;
          }
        }
        
        // Se a posição atual tem mais liquidez que a menor da lista, substituir
        const currentLiquidity = BigInt(position.data?.liquidity || 0);
        const minLiquidity = BigInt(topPositions[minIndex].data?.liquidity || 0);
        
        if (currentLiquidity > minLiquidity) {
          topPositions[minIndex] = position;
        }
      }
    }
    
    // Log de progresso
    if (i % 10000 === 0) {
      console.log(`   Processado ${i + batchSize} de ${positions.length} posições...`);
    }
  }
  
  console.log(`✅ Encontradas ${topPositions.length} top posições`);
  
  // Ordenar apenas as top posições encontradas por liquidez
  return topPositions.sort((a, b) => {
    const aLiquidity = BigInt(a.data?.liquidity || 0);
    const bLiquidity = BigInt(b.data?.liquidity || 0);
    return aLiquidity > bLiquidity ? -1 : aLiquidity < bLiquidity ? 1 : 0;
  });
}

/**
 * Função para calcular estatísticas das posições
 */
function calculatePositionStats(positions: any[]): any {
  if (positions.length === 0) {
    return {
      totalPositions: 0,
      totalLamports: 0,
      averageLamports: 0,
      maxLamports: 0,
      minLamports: 0
    };
  }

  console.log(`📊 Calculando estatísticas de ${positions.length} posições...`);
  
  let totalLamports = 0;
  let maxLamports = 0;
  let minLamports = positions[0].lamports;
  
  for (const position of positions) {
    totalLamports += position.lamports;
    if (position.lamports > maxLamports) {
      maxLamports = position.lamports;
    }
    if (position.lamports < minLamports) {
      minLamports = position.lamports;
    }
  }

  return {
    totalPositions: positions.length,
    totalLamports: totalLamports,
    averageLamports: Math.round(totalLamports / positions.length),
    maxLamports: maxLamports,
    minLamports: minLamports
  };
}

/**
 * Rota para buscar top positions
 * GET /top-positions?limit=10
 */
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    
    // Validar limite
    if (limit < 1 || limit > 1000) {
      return res.status(400).json({
        error: 'Invalid limit',
        message: 'Limit must be between 1 and 1000'
      });
    }

    console.log(`🏆 Buscando top ${limit} positions...`);

    // Configurar para usar a rede Mainnet
    await setWhirlpoolsConfig('solanaMainnet');
    console.log('✅ Configurado para usar Solana Mainnet');

    // Criar conexão usando nossa função
    const connection = makeConnection();
    console.log('✅ Conectado à rede Mainnet');

    // Buscar todas as posições diretamente
    const allPositions = await fetchAllPositionsDirect(connection);

    if (allPositions.length === 0) {
      return res.status(404).json({
        error: 'No positions found',
        message: 'No valid Whirlpool positions found on the network'
      });
    }

    // Encontrar as top positions
    const topPositions = findTopPositions(allPositions, limit);

    // Calcular estatísticas
    const stats = calculatePositionStats(allPositions);

    // Converter BigInt para string
    const convertedPositions = convertBigIntToString(topPositions);

    const result = {
      timestamp: new Date().toISOString(),
      method: 'getProgramAccounts',
      limit: limit,
      totalFound: allPositions.length,
      topPositions: convertedPositions,
      statistics: stats
    };

    res.json(result);

  } catch (error: any) {
    console.error('❌ Erro ao buscar top positions:', error);
    
    let errorMessage = 'Failed to fetch top positions';
    let statusCode = 500;
    
    if (error.message?.includes('getProgramAccounts')) {
      errorMessage = 'RPC does not support getProgramAccounts';
      statusCode = 503;
    } else if (error.message?.includes('Rate limit')) {
      errorMessage = 'Rate limit exceeded';
      statusCode = 429;
    }
    
    res.status(statusCode).json({
      error: errorMessage,
      message: error.message || 'Unknown error occurred'
    });
  }
});

export default router;
