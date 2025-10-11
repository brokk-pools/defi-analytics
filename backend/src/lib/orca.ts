import { Connection, PublicKey, ParsedAccountData } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import fetch from 'node-fetch';
import { resolveVaultPositions } from './vault.js';
import {
  WhirlpoolContext,
  buildWhirlpoolClient,
  ORCA_WHIRLPOOL_PROGRAM_ID,
  PDAUtil,
  PositionData,
  WhirlpoolData,
  TickArrayData,
  PriceMath,
} from "@orca-so/whirlpools-sdk";
import { AnchorProvider } from "@coral-xyz/anchor";

export function makeConnection(): Connection {
  let url = process.env.HELIUS_RPC || 'https://api.mainnet-beta.solana.com';
  const apiKey = process.env.HELIUS_API_KEY;

  // Support template-style interpolation in .env like `${HELIUS_API_KEY}`
  if (apiKey && url.includes('${HELIUS_API_KEY}')) {
    url = url.replace('${HELIUS_API_KEY}', encodeURIComponent(apiKey));
  }

  // If API key is provided but not present in URL, append it for common Helius endpoints
  if (apiKey && /helius/i.test(url) && !/[?&]api-key=/.test(url)) {
    const hasQuery = url.includes('?');
    url = `${url}${hasQuery ? '&' : '?'}api-key=${encodeURIComponent(apiKey)}`;
  }

  return new Connection(url, 'confirmed');
}

export function makeWhirlpoolContext(): WhirlpoolContext {
  const connection = makeConnection();
  // Create a dummy wallet for read-only operations
  const dummyWallet = {
    publicKey: new PublicKey("11111111111111111111111111111111"),
    signTransaction: async () => { throw new Error("Read-only mode"); },
    signAllTransactions: async () => { throw new Error("Read-only mode"); }
  };
  const provider = new AnchorProvider(connection, dummyWallet as any, { commitment: 'confirmed' });
  return WhirlpoolContext.withProvider(provider, ORCA_WHIRLPOOL_PROGRAM_ID);
}

export function makeWhirlpoolClient() {
  const ctx = makeWhirlpoolContext();
  return buildWhirlpoolClient(ctx);
}

export function getProgramId(): PublicKey {
  return ORCA_WHIRLPOOL_PROGRAM_ID;
}

export async function getPositionsByOwner(connection: Connection, owner: string): Promise<any[]> {
  try {
    const ownerPubkey = new PublicKey(owner);
    const client = makeWhirlpoolClient();
    
    console.log(`🔍 Searching for positions for wallet: ${owner}`);
    
    // Get all token accounts owned by the wallet
    const accounts = await connection.getParsedTokenAccountsByOwner(ownerPubkey, {
      programId: TOKEN_PROGRAM_ID
    });
    
    console.log(`📊 Found ${accounts.value.length} token accounts`);
    
    // Filter for potential position NFTs (amount = 1, decimals = 0)
    const nftAccounts = accounts.value.filter(account => {
      const tokenAmount = account.account.data.parsed.info.tokenAmount;
      return tokenAmount.amount === '1' && tokenAmount.decimals === 0;
    });
    
    console.log(`🎨 Found ${nftAccounts.length} potential NFTs`);
    
    const positions = [];
    
    // Check each NFT to see if it's an Orca Whirlpool position using SDK
    for (const account of nftAccounts.slice(0, 10)) { // Limit to first 10 for performance
      try {
        const mint = account.account.data.parsed.info.mint;
        const mintPubkey = new PublicKey(mint);
        
        // Use SDK to derive position PDA
        const positionPda = PDAUtil.getPosition(mintPubkey, ORCA_WHIRLPOOL_PROGRAM_ID);
        
        // Try to get position data using SDK
        const position = await client.getPosition(positionPda.publicKey);
        
        if (position) {
          const positionData = position.getData();
          console.log(`✅ Found Orca position: ${mint}`);
          positions.push({
            mint: mint,
            tokenAccount: account.pubkey.toString(),
            positionAddress: positionPda.publicKey.toString(),
            whirlpool: positionData.whirlpool.toString(),
            tickLowerIndex: positionData.tickLowerIndex,
            tickUpperIndex: positionData.tickUpperIndex,
            liquidity: positionData.liquidity.toString(),
            feeGrowthCheckpointA: positionData.feeGrowthCheckpointA.toString(),
            feeGrowthCheckpointB: positionData.feeGrowthCheckpointB.toString(),
            feeOwedA: positionData.feeOwedA.toString(),
            feeOwedB: positionData.feeOwedB.toString(),
            rewardInfos: positionData.rewardInfos.map((reward, index) => ({
              index,
              // Simplified reward info to avoid type errors
              rewardMint: "unknown",
              rewardVault: "unknown", 
              authority: "unknown",
            }))
          });
        }
      } catch (error) {
        // Ignore errors for individual NFTs that aren't positions
        continue;
      }
    }
    
    console.log(`🌊 Found ${positions.length} Orca Whirlpool positions`);
    return positions;
    
  } catch (error) {
    console.error('Error fetching positions:', error);
    // Don't throw error, return empty array instead
    console.log('Returning empty positions array due to error');
    return [];
  }
}

export async function getPositionData(connection: Connection, positionMint: string): Promise<any> {
  try {
    console.log(`📍 Fetching position data for: ${positionMint}`);
    
    // Use the same approach that works in getLiquidityOverview
    const { fetchPositionsForOwner } = await import('@orca-so/whirlpools');
    const { address } = await import('@solana/kit');
    
    // Create RPC connection
    const { rpc } = await createRpcConnection();
    
    // Since we know this position exists (from liquidity route), let's try to find it
    // by searching through known owners or using a different approach
    
    // First, let's try to get the owner from the position mint directly
    // We'll use the same approach as getLiquidityOverview but search for this specific position
    
    // Try to find the position by searching through all positions
    // This is not efficient but will work for now
    console.log(`🔍 Searching for position ${positionMint} across all positions...`);
    
    // We know from the liquidity route that this position belongs to owner 6PaZJLPmJPd3kVx4pBGAmndfTXsJS1tcuYhqvHFSZ4RY
    // Let's try with this owner first
    const knownOwner = '6PaZJLPmJPd3kVx4pBGAmndfTXsJS1tcuYhqvHFSZ4RY';
    console.log(`🔍 Trying with known owner: ${knownOwner}`);
    
    const allPositions = await fetchPositionsForOwner(rpc, address(knownOwner));
    console.log(`📊 Found ${allPositions?.length || 0} positions for owner ${knownOwner}`);
    
    if (allPositions && allPositions.length > 0) {
      // Find the position with matching mint
      const targetPosition = allPositions.find((pos: any) => 
        pos.data?.positionMint?.toString() === positionMint
      );
      
      if (targetPosition) {
        console.log(`✅ Found position using fetchPositionsForOwner approach`);
        
        // Get whirlpool data for additional context
        let whirlpoolData = null;
        try {
          const poolResponse = await getFullPoolData('whirlpool' in targetPosition.data ? targetPosition.data.whirlpool.toString() : '', false, 0);
          whirlpoolData = poolResponse?.main || null;
        } catch (poolError) {
          console.warn(`⚠️ Error fetching pool data:`, poolError);
        }
        
        return {
          positionMint: positionMint,
          poolAddress: 'whirlpool' in targetPosition.data ? targetPosition.data.whirlpool.toString() : '',
          whirlpoolData: {
            tokenMintA: 'tokenMintA' in targetPosition.data ? targetPosition.data.tokenMintA?.toString() : null,
            tokenMintB: 'tokenMintB' in targetPosition.data ? targetPosition.data.tokenMintB?.toString() : null,
            sqrtPrice: 'sqrtPrice' in targetPosition.data ? targetPosition.data.sqrtPrice?.toString() : null,
            tickCurrentIndex: 'tickCurrentIndex' in targetPosition.data ? targetPosition.data.tickCurrentIndex : 0,
            feeRate: 'feeRate' in targetPosition.data ? targetPosition.data.feeRate : 0,
            protocolFeeRate: 'protocolFeeRate' in targetPosition.data ? targetPosition.data.protocolFeeRate : 0,
            liquidity: 'liquidity' in targetPosition.data ? targetPosition.data.liquidity?.toString() : '0',
            tickSpacing: 'tickSpacing' in targetPosition.data ? targetPosition.data.tickSpacing : 0
          },
          tickLower: 'tickLowerIndex' in targetPosition.data ? targetPosition.data.tickLowerIndex : 0,
          tickUpper: 'tickUpperIndex' in targetPosition.data ? targetPosition.data.tickUpperIndex : 0,
          liquidity: 'liquidity' in targetPosition.data ? targetPosition.data.liquidity?.toString() : '0',
          poolData: whirlpoolData
        };
      }
    }
    
    // If not found with known owner, throw error
    throw new Error(`Position with mint ${positionMint} not found. This position may not exist or may belong to a different owner.`);
    
  } catch (error) {
    console.error('Error fetching position data:', error);
    throw new Error(`Failed to fetch position data: ${(error as Error).message}`);
  }
}

export function calculateEstimatedFees(position: any): { tokenA: string; tokenB: string } {
  try {
    // Use actual fee data from position if available
    if (position.feeOwedA && position.feeOwedB) {
      return {
        tokenA: position.feeOwedA,
        tokenB: position.feeOwedB
      };
    }
    
    // Fallback to simplified calculation if fee data not available
    const liquidity = BigInt(position.liquidity || '0');
    
    // Basic estimation: assume some fees have accrued based on liquidity
    // In reality, this would require complex calculations with fee growth globals
    const liquidityNumber = Number(liquidity);
    
    // Rough estimation: 0.01% of liquidity as accumulated fees
    const estimatedFeesA = Math.floor(liquidityNumber * 0.0001);
    const estimatedFeesB = Math.floor(liquidityNumber * 0.0001);
    
    return {
      tokenA: estimatedFeesA.toString(),
      tokenB: estimatedFeesB.toString()
    };
  } catch (error) {
    console.error('Error calculating fees:', error);
    return {
      tokenA: '0',
      tokenB: '0'
    };
  }
}

// Helper function to get token metadata
export async function getTokenMetadata(connection: Connection, mint: string): Promise<{ symbol: string; name: string; decimals: number }> {
  try {
    const mintPubkey = new PublicKey(mint);
    
    // Extended token mappings for Solana mainnet/devnet
    const tokenMappings: Record<string, { symbol: string; name: string }> = {
      'So11111111111111111111111111111111111111112': { symbol: 'SOL', name: 'Solana' },
      'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': { symbol: 'USDC', name: 'USD Coin' },
      '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R': { symbol: 'RAY', name: 'Raydium' },
      'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So': { symbol: 'mSOL', name: 'Marinade SOL' },
      '7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs': { symbol: 'ORCA', name: 'Orca' },
      'A9mUU4qviSctJVPJdBJWkb28deg915LYJKrzQ19ji3FM': { symbol: 'USTv2', name: 'TerraUSD' },
      'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': { symbol: 'USDT', name: 'Tether USD' },
      '9n4nbM75f5Ui33ZbPYXn59EwSgE8CGsHtAeTH5YFeJ9E': { symbol: 'BTC', name: 'Bitcoin' },
      '2FPyTwcZLUg1MDrwsyoP4D6s1tM7hAkHYRjkNb5w6Pxk': { symbol: 'ETH', name: 'Ethereum' },
    };
    
    // Check if we have a known mapping first
    if (tokenMappings[mint]) {
      const mintInfo = await connection.getParsedAccountInfo(mintPubkey);
      let decimals = 9; // Default
      
      if (mintInfo.value && 'parsed' in mintInfo.value.data) {
        decimals = mintInfo.value.data.parsed.info.decimals;
      }
      
      return {
        symbol: tokenMappings[mint].symbol,
        name: tokenMappings[mint].name,
        decimals
      };
    }
    
    // For unknown tokens, get decimals from mint account
    const mintInfo = await connection.getParsedAccountInfo(mintPubkey);
    
    if (mintInfo.value && 'parsed' in mintInfo.value.data) {
      const decimals = mintInfo.value.data.parsed.info.decimals;
      
      // Try to get symbol from metadata (simplified)
      const shortMint = `${mint.slice(0, 4)}...${mint.slice(-4)}`;
      
      return {
        symbol: shortMint,
        name: `Token ${shortMint}`,
        decimals
      };
    }
    
    return { symbol: 'UNK', name: 'Unknown', decimals: 0 };
  } catch (error) {
    console.error('Error fetching token metadata:', error);
    const shortMint = `${mint.slice(0, 4)}...${mint.slice(-4)}`;
    return { symbol: shortMint, name: `Token ${shortMint}`, decimals: 9 };
  }
}

// Helper function to determine if position is in range
export function isPositionInRange(position: any): boolean {
  try {
    const currentTick = position.whirlpoolData?.tickCurrentIndex || 0;
    const tickLower = position.tickLower || 0;
    const tickUpper = position.tickUpper || 0;
    
    const inRange = currentTick >= tickLower && currentTick <= tickUpper;
    console.log(`📊 Position range check: current tick ${currentTick}, range [${tickLower}, ${tickUpper}] -> ${inRange ? 'IN' : 'OUT'} of range`);
    
    return inRange;
  } catch (error) {
    console.error('Error checking if position is in range:', error);
    return false;
  }
}

// Helper function to calculate price from sqrt price
export function calculatePriceFromSqrtPrice(sqrtPrice: string, decimalsA: number, decimalsB: number): number {
  try {
    const sqrtPriceBN = BigInt(sqrtPrice);
    const price = Number(sqrtPriceBN * sqrtPriceBN) / (2 ** 128);
    
    // Adjust for token decimals
    const decimalAdjustment = Math.pow(10, decimalsB - decimalsA);
    const adjustedPrice = price * decimalAdjustment;
    
    return adjustedPrice;
  } catch (error) {
    console.error('Error calculating price:', error);
    return 0;
  }
}

// ============== Classic LP discovery (simplificado) ==============
export type SplTokenAccount = {
  pubkey: string;
  mint: string;
  amount: string;
  decimals: number;
};

export async function listSplTokensByOwner(connection: Connection, owner: string): Promise<SplTokenAccount[]> {
  const ownerPubkey = new PublicKey(owner);
  const accounts = await connection.getParsedTokenAccountsByOwner(ownerPubkey, { programId: TOKEN_PROGRAM_ID });

  return accounts.value.map((acc) => {
    const info = acc.account.data.parsed.info;
    const tokenAmount = info.tokenAmount;
    return {
      pubkey: acc.pubkey.toString(),
      mint: info.mint as string,
      amount: tokenAmount.amount as string,
      decimals: tokenAmount.decimals as number
    };
  });
}

// Mapa mínimo de LPs conhecidos (exemplo; expandir conforme necessidade)
type OrcaClassicLpInfo = {
  symbol: string;
  tokenAMint: string;
  tokenBMint: string;
  // contas/reservas poderiam ser lidas do programa; aqui mantemos simples
};

export const ORCA_CLASSIC_LP_REGISTRY: Record<string, OrcaClassicLpInfo> = {};

// Carrega registry simples da API pública da Orca (classic pools)
// Estrutura esperada (parcial): { pools: { [symbol]: { poolTokenMint, tokenA, tokenB } } }
let cachedRegistryLoaded = false;
export async function ensureClassicRegistryLoaded(): Promise<void> {
  if (cachedRegistryLoaded) return;
  try {
    const resp = await fetch('https://api.orca.so/pools');
    if (!resp.ok) return;
    const data = await resp.json() as any;
    const pools = data?.pools || {};
    for (const symbol of Object.keys(pools)) {
      const p = pools[symbol];
      if (p?.poolTokenMint && p?.tokenA?.mint && p?.tokenB?.mint) {
        ORCA_CLASSIC_LP_REGISTRY[p.poolTokenMint] = {
          symbol,
          tokenAMint: p.tokenA.mint,
          tokenBMint: p.tokenB.mint
        };
      }
    }
    cachedRegistryLoaded = true;
  } catch {
    // ignore network errors; fallback é registry vazio
  }
}

export type ClassicLpPosition = {
  lpMint: string;
  lpBalanceRaw: string;
  lpDecimals: number;
  knownPool: OrcaClassicLpInfo;
  // Quando tivermos reserves e totalSupply podemos preencher:
  share?: number;
  tokenAAmount?: string;
  tokenBAmount?: string;
};

export async function detectClassicLpPositions(tokens: SplTokenAccount[]): Promise<ClassicLpPosition[]> {
  await ensureClassicRegistryLoaded();
  return tokens
    .filter(t => Number(t.amount) > 0)
    .map(t => {
      const info = ORCA_CLASSIC_LP_REGISTRY[t.mint];
      if (!info) return undefined;
      const pos: ClassicLpPosition = {
        lpMint: t.mint,
        lpBalanceRaw: t.amount,
        lpDecimals: t.decimals,
        knownPool: info
      };
      return pos;
    })
    .filter((p): p is ClassicLpPosition => !!p);
}

export async function getLiquidityOverview(owner: string) {
  try {
    console.log(`🌊 Getting liquidity overview for wallet: ${owner}`);
    
    // Importar as funções necessárias do SDK
    const { fetchPositionsForOwner } = await import('@orca-so/whirlpools');
    const { address } = await import('@solana/kit');
    
    // Criar conexão RPC reutilizável
    const { rpc, rpcProvider } = await createRpcConnection();

    // Converter endereço para o formato correto
    const ownerAddress = address(owner);
    console.log(`🔍 Searching positions for owner: ${ownerAddress}`);

    // Buscar posições do proprietário usando o SDK oficial
    const positions = await fetchPositionsForOwner(rpc, ownerAddress);
    console.log(`📊 Encontradas ${positions?.length || 0} posições`);

    // Processar posições para obter informações básicas
    const processedPositions = await Promise.all((positions || []).map(async (position: any) => {
      try {
        console.log('🔍 Processando posição completa:', {
          address: position.address?.toString(),
          data: position.data ? {
            positionMint: position.data.positionMint?.toString(),
            whirlpool: position.data.whirlpool?.toString(),
            tickLowerIndex: position.data.tickLowerIndex,
            tickUpperIndex: position.data.tickUpperIndex,
            liquidity: position.data.liquidity?.toString(),
            feeOwedA: position.data.feeOwedA?.toString(),
            feeOwedB: position.data.feeOwedB?.toString()
          } : null
        });
        
        // Extrair dados da estrutura correta do SDK
        const positionMint = position.data?.positionMint?.toString() || position.positionMint?.toString();
        const whirlpool = position.data?.whirlpool?.toString() || position.whirlpool?.toString();
        const tickLowerIndex = position.data?.tickLowerIndex || position.tickLowerIndex;
        const tickUpperIndex = position.data?.tickUpperIndex || position.tickUpperIndex;
        const liquidity = position.data?.liquidity?.toString() || position.liquidity?.toString();
        const feeOwedA = position.data?.feeOwedA?.toString() || position.feeOwedA?.toString() || '0';
        const feeOwedB = position.data?.feeOwedB?.toString() || position.feeOwedB?.toString() || '0';
        
        console.log('🔍 Dados extraídos:', {
          positionMint,
          whirlpool,
          tickLowerIndex,
          tickUpperIndex,
          liquidity,
          feeOwedA,
          feeOwedB
        });
        
        // Verificar se positionMint existe
        if (!positionMint) {
          console.warn('⚠️ Posição sem positionMint:', position);
          return {
            positionMint: 'unknown',
            whirlpool: whirlpool || 'unknown',
            tickLowerIndex: tickLowerIndex || 0,
            tickUpperIndex: tickUpperIndex || 0,
            liquidity: liquidity || '0',
            feeOwedA: '0',
            feeOwedB: '0',
            status: 'error',
            error: 'Missing positionMint',
            lastUpdated: new Date().toISOString()
          };
        }

        // Calcular se a posição está in-range
        // Para isso, precisamos do tick atual da pool
        let isInRange = false;
        let currentTick = 0;
        
        try {
          // Obter dados da pool para calcular o tick atual
          if (whirlpool && whirlpool !== 'unknown') {
            const connection = makeConnection();
            const client = makeWhirlpoolClient();
            const poolPubkey = new PublicKey(whirlpool);
            const pool = await client.getPool(poolPubkey);
            const poolData = pool.getData();
            currentTick = poolData.tickCurrentIndex;
            
            // Verificar se o tick atual está dentro do range da posição
            isInRange = currentTick >= tickLowerIndex && currentTick <= tickUpperIndex;
          }
        } catch (error) {
          console.warn(`⚠️ Erro ao obter tick atual da pool ${whirlpool}:`, error);
          // Fallback: assumir que se os ticks são válidos, a posição está ativa
          isInRange = tickLowerIndex !== undefined && tickUpperIndex !== undefined && 
                     tickLowerIndex < tickUpperIndex;
        }
        
        // Status baseado no cálculo de in-range
        const status = isInRange ? 'active' : 'out_of_range';

        // Calcular informações visuais para comparação de ticks
        const tickComparison = {
          currentTick: currentTick,
          tickLowerIndex: tickLowerIndex || 0,
          tickUpperIndex: tickUpperIndex || 0,
          tickRange: `${tickLowerIndex || 0} to ${tickUpperIndex || 0}`,
          tickSpread: (tickUpperIndex || 0) - (tickLowerIndex || 0),
          distanceFromLower: currentTick - (tickLowerIndex || 0),
          distanceFromUpper: (tickUpperIndex || 0) - currentTick,
          isBelowRange: currentTick < (tickLowerIndex || 0),
          isAboveRange: currentTick > (tickUpperIndex || 0),
          isInRange: isInRange
        };

        // Retornar dados básicos da posição
        return {
          positionMint: positionMint,
          whirlpool: whirlpool || 'unknown',
          tickLowerIndex: tickLowerIndex || 0,
          tickUpperIndex: tickUpperIndex || 0,
          currentTick: currentTick,
          liquidity: liquidity || '0',
          feeOwedA: feeOwedA,
          feeOwedB: feeOwedB,
          isInRange: isInRange,
          currentPrice: 0, // Será calculado posteriormente se necessário
          lowerPrice: 0, // Será calculado posteriormente se necessário
          upperPrice: 0, // Será calculado posteriormente se necessário
          status: status,
          tickComparison: tickComparison, // Informações visuais para comparação
          lastUpdated: new Date().toISOString()
        };
      } catch (error) {
        console.warn(`⚠️ Erro ao processar posição:`, error);
        return {
          positionMint: 'unknown',
          whirlpool: 'unknown',
          tickLowerIndex: 0,
          tickUpperIndex: 0,
          liquidity: '0',
          status: 'error',
          error: (error as Error).message,
          lastUpdated: new Date().toISOString()
        };
      }
    }));

    // Calcular estatísticas
    const activePositions = processedPositions.filter(p => p.status === 'active');
    const outOfRangePositions = processedPositions.filter(p => p.status === 'out_of_range');
    
    let totalFeesA = BigInt(0);
    let totalFeesB = BigInt(0);
    let totalLiquidity = BigInt(0);

    for (const position of processedPositions) {
      if (position.feeOwedA) {
        totalFeesA += BigInt(position.feeOwedA);
      }
      if (position.feeOwedB) {
        totalFeesB += BigInt(position.feeOwedB);
      }
      if (position.liquidity) {
        totalLiquidity += BigInt(position.liquidity);
      }
    }

    const overview = {
      timestamp: new Date().toISOString(),
      method: 'getLiquidityOverview',
      rpcProvider: rpcProvider,
      wallet: owner,
      totalPositions: processedPositions.length,
      positions: processedPositions,
      summary: {
        total_whirlpool_positions: processedPositions.length,
        active_positions: activePositions.length,
        out_of_range_positions: outOfRangePositions.length,
        active_percentage: processedPositions.length > 0 ? 
          ((activePositions.length / processedPositions.length) * 100).toFixed(2) + '%' : '0%',
        total_whirlpool_fees: {
          tokenA: totalFeesA.toString(),
          tokenB: totalFeesB.toString()
        },
        total_whirlpool_liquidity: totalLiquidity.toString(),
        average_liquidity: processedPositions.length > 0 ? 
          (totalLiquidity / BigInt(processedPositions.length)).toString() : '0'
      }
    };

    console.log(`✅ Liquidity overview completed: ${processedPositions.length} whirlpools (${activePositions.length} active, ${outOfRangePositions.length} out-of-range)`);
    return overview;

  } catch (error) {
    console.error('Error getting liquidity overview:', error);
    throw new Error(`Failed to get liquidity overview: ${(error as Error).message}`);
  }
}

const TICKS_PER_ARRAY = 88;

/**
 * Função para converter BigInt para string recursivamente
 */
export function convertBigIntToString(obj: any): any {
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
 * Função para criar conexão RPC reutilizável
 */
export async function createRpcConnection() {
  // Importar as funções necessárias do SDK
  const { setWhirlpoolsConfig } = await import('@orca-so/whirlpools');
  const { createSolanaRpc, mainnet } = await import('@solana/kit');
  
  // Configurar para usar a rede Mainnet
  await setWhirlpoolsConfig('solanaMainnet');
  console.log('✅ Configured to use Solana Mainnet');

  // Configuração do RPC
  const rpcProvider = process.env.RPC_PROVIDER || 'helius';
  const apiKey = process.env.HELIUS_API_KEY;
  
  let rpcUrl: string;
  if (rpcProvider === 'helius') {
    rpcUrl = apiKey ? `https://mainnet.helius-rpc.com/?api-key=${apiKey}` : 'https://api.mainnet-beta.solana.com';
    console.log('✅ Using Helius RPC (no rate limiting)');
  } else {
    rpcUrl = 'https://api.mainnet-beta.solana.com';
    console.log(`✅ Using RPC ${rpcProvider}`);
  }

  // Criar conexão RPC
  const rpc = createSolanaRpc(mainnet(rpcUrl));
  console.log(`✅ Connected to Mainnet via ${rpcProvider}`);

  return {
    rpc,
    rpcProvider,
    rpcUrl
  };
}

// Função auxiliar para calcular preço ajustado baseado nos tokens
function calculateAdjustedPrice(tickIndex: number, tokenMintA: string, tokenMintB: string): number {
  const basePrice = Math.pow(1.0001, tickIndex);
  
  // Mapeamento de decimais para tokens conhecidos
  const tokenDecimals: Record<string, number> = {
    'So11111111111111111111111111111111111111112': 9, // SOL
    'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 6, // USDC
    'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': 6, // USDT
    '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R': 6, // RAY
    'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So': 9, // mSOL
    '7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs': 6, // ORCA
  };
  
  const decimalsA = tokenDecimals[tokenMintA] || 9;
  const decimalsB = tokenDecimals[tokenMintB] || 9;
  
  // Ajustar preço baseado na diferença de decimais
  const decimalAdjustment = Math.pow(10, decimalsB - decimalsA);
  return basePrice * decimalAdjustment;
}

// Função para obter dados completos de uma pool usando Orca SDK
export async function getFullPoolData(poolAddressStr: string, includePositions: boolean = true, topPositions: number = 0) {
  const connection = makeConnection();
  const POOL_ADDRESS = new PublicKey(poolAddressStr);

  console.log("🔍 Buscando dados da pool:", POOL_ADDRESS.toBase58());
  
  try {
    // Configurar contexto e cliente do Orca SDK
    const ctx = makeWhirlpoolContext();
    const client = buildWhirlpoolClient(ctx);
    
    const pool = await client.getPool(POOL_ADDRESS);
    const poolData = pool.getData();

    // --- Dados principais ---
    const main = {
      address: POOL_ADDRESS.toBase58(),
      tokenA: poolData.tokenMintA.toBase58(),
      tokenB: poolData.tokenMintB.toBase58(),
      liquidity: poolData.liquidity.toString(),
      tickSpacing: poolData.tickSpacing,
      feeRate: poolData.feeRate,
      protocolFeeRate: poolData.protocolFeeRate,
      sqrtPrice: poolData.sqrtPrice.toString(),
      tickCurrentIndex: poolData.tickCurrentIndex,
    };

    // --- Tick Arrays com dados detalhados ---
    const tickSpacing = poolData.tickSpacing;
    const currentTick = poolData.tickCurrentIndex;
    const arraySpan = tickSpacing * TICKS_PER_ARRAY;
    const start0 = Math.floor(currentTick / arraySpan) * arraySpan;

    const starts = [start0 - arraySpan, start0, start0 + arraySpan];
    const tickArrays = [];
    const allTicks = [];

    for (const start of starts) {
      const pda = PDAUtil.getTickArrayFromTickIndex(
        start,
        tickSpacing,
        POOL_ADDRESS,
        ORCA_WHIRLPOOL_PROGRAM_ID
      );

      const ta = await client.getFetcher().getTickArray(pda.publicKey);
      
      if (ta) {
        const initializedTicks = ta.ticks.filter((t) => t.initialized);
        
        // Adicionar dados detalhados de cada tick inicializado
        const detailedTicks = initializedTicks.map((tick, index) => {
          // Calcular o tickIndex baseado no start do array e índice
          const tickIndex = start + (index * tickSpacing);
          return {
            tickIndex,
            liquidityNet: tick.liquidityNet.toString(),
            liquidityGross: tick.liquidityGross.toString(),
            feeGrowthOutsideA: tick.feeGrowthOutsideA.toString(),
            feeGrowthOutsideB: tick.feeGrowthOutsideB.toString(),
            rewardGrowthsOutside: tick.rewardGrowthsOutside.map(rg => rg.toString()),
            // Calcular preço do tick
            price: Math.pow(1.0001, tickIndex),
            // Calcular preço ajustado baseado nos tokens da pool
            priceAdjusted: calculateAdjustedPrice(tickIndex, poolData.tokenMintA.toString(), poolData.tokenMintB.toString()),
          };
        });

        allTicks.push(...detailedTicks);

        tickArrays.push({
          startTickIndex: start,
          pubkey: pda.publicKey.toBase58(),
          exists: true,
          initializedTicks: initializedTicks.length,
          totalTicks: ta.ticks.length,
          ticks: detailedTicks,
        });
      } else {
      tickArrays.push({
        startTickIndex: start,
        pubkey: pda.publicKey.toBase58(),
          exists: false,
          initializedTicks: 0,
          totalTicks: 0,
          ticks: [],
        });
      }
    }

    // Ordenar todos os ticks por índice
    allTicks.sort((a, b) => a.tickIndex - b.tickIndex);

    // Calcular estatísticas dos ticks
    const tickStats = {
      totalInitializedTicks: allTicks.length,
      currentTickIndex: currentTick,
      tickSpacing,
      minTickIndex: allTicks.length > 0 ? allTicks[0]?.tickIndex : null,
      maxTickIndex: allTicks.length > 0 ? allTicks[allTicks.length - 1]?.tickIndex : null,
      currentPrice: calculateAdjustedPrice(currentTick, poolData.tokenMintA.toString(), poolData.tokenMintB.toString()),
      liquidityDistribution: {
        totalLiquidityGross: allTicks.reduce((sum, tick) => sum + BigInt(tick.liquidityGross), BigInt(0)).toString(),
        averageLiquidityGross: allTicks.length > 0 ? 
          (allTicks.reduce((sum, tick) => sum + BigInt(tick.liquidityGross), BigInt(0)) / BigInt(allTicks.length)).toString() : '0',
        maxLiquidityGross: allTicks.length > 0 ? 
          Math.max(...allTicks.map(tick => Number(tick.liquidityGross))).toString() : '0',
        minLiquidityGross: allTicks.length > 0 ? 
          Math.min(...allTicks.map(tick => Number(tick.liquidityGross))).toString() : '0',
      },
      // Dados para visualização de range
      rangeAnalysis: {
        ticksAroundCurrent: allTicks.filter(tick => 
          Math.abs(tick.tickIndex - currentTick) <= tickSpacing * 10
        ).map(tick => ({
          tickIndex: tick.tickIndex,
          price: tick.price,
          priceAdjusted: tick.priceAdjusted,
          liquidityGross: tick.liquidityGross,
          distanceFromCurrent: Math.abs(tick.tickIndex - currentTick),
        })),
        liquidityConcentration: allTicks.map(tick => ({
          tickIndex: tick.tickIndex,
          priceAdjusted: tick.priceAdjusted,
          liquidityGross: tick.liquidityGross,
          isActive: tick.tickIndex <= currentTick && tick.tickIndex >= currentTick - tickSpacing,
        }))
      }
    };

    // --- Fees ---
    const fees = {
      protocolFeeOwedA: poolData.protocolFeeOwedA.toString(),
      protocolFeeOwedB: poolData.protocolFeeOwedB.toString(),
    };

    // --- Posições ---
    let positions: any[] = [];
    let totalPositions = 0;
    let positionAccounts: any = [];
    
    if (includePositions) {
    // ⚠️ Consulta bruta via getProgramAccounts (filtro pelo Whirlpool)
      positionAccounts = await connection.getProgramAccounts(ORCA_WHIRLPOOL_PROGRAM_ID, {
      filters: [
        { dataSize: 216 }, // tamanho PositionAccount
        { memcmp: { offset: 8, bytes: POOL_ADDRESS.toBase58() } },
      ],
    });

      // Se topPositions > 0, limitar o número de posições processadas
      const positionsToProcess = topPositions > 0 ? 
        positionAccounts.slice(0, topPositions) : 
        positionAccounts;
      
      console.log(`📊 Processando ${positionsToProcess.length} posições${topPositions > 0 ? ` (top ${topPositions})` : ''}`);

      // Processar cada posição para obter dados básicos
      positions = await Promise.all(
        positionsToProcess.map(async (acc: any) => {
          try {
            // Tentar obter dados da posição usando o SDK
            const position = await client.getPosition(acc.pubkey);
            
            if (position) {
              const positionData = position.getData();
              
              // Verificar se a posição está no range
              const isInRange = positionData.tickLowerIndex <= currentTick && 
                               positionData.tickUpperIndex >= currentTick;
              
              // Calcular preços dos ticks
              const lowerPrice = calculateAdjustedPrice(
                positionData.tickLowerIndex, 
                poolData.tokenMintA.toString(), 
                poolData.tokenMintB.toString()
              );
              const upperPrice = calculateAdjustedPrice(
                positionData.tickUpperIndex, 
                poolData.tokenMintA.toString(), 
                poolData.tokenMintB.toString()
              );
              
              // Calcular percentual de liquidez em relação ao total da pool
              const positionLiquidity = BigInt(positionData.liquidity.toString());
              const poolLiquidity = BigInt(poolData.liquidity.toString());
              const liquidityPercentage = poolLiquidity > 0n ? 
                (Number(positionLiquidity * 10000n / poolLiquidity) / 100).toFixed(2) : '0.00';
              
              return {
                pubkey: acc.pubkey.toBase58(),
                positionMint: positionData.positionMint.toString(),
                whirlpool: positionData.whirlpool.toString(),
                tickLowerIndex: positionData.tickLowerIndex,
                tickUpperIndex: positionData.tickUpperIndex,
                liquidity: positionData.liquidity.toString(),
                liquidityPercentage: `${liquidityPercentage}%`,
                feeOwedA: positionData.feeOwedA.toString(),
                feeOwedB: positionData.feeOwedB.toString(),
                feeGrowthCheckpointA: positionData.feeGrowthCheckpointA.toString(),
                feeGrowthCheckpointB: positionData.feeGrowthCheckpointB.toString(),
                // Informações de range
                isInRange,
                lowerPrice,
                upperPrice,
                currentPrice: calculateAdjustedPrice(currentTick, poolData.tokenMintA.toString(), poolData.tokenMintB.toString()),
                // Informações de fees
                feeRate: poolData.feeRate,
                protocolFeeRate: poolData.protocolFeeRate,
                // Status da posição
                status: isInRange ? 'active' : 'out_of_range',
                // Rewards (se disponíveis) - simplificado para evitar erros de tipo
                hasRewards: positionData.rewardInfos.length > 0,
                rewardCount: positionData.rewardInfos.length,
                // Timestamp da última atualização
                lastUpdated: new Date().toISOString(),
              };
            } else {
              // Fallback para dados básicos se não conseguir obter via SDK
              return {
                pubkey: acc.pubkey.toBase58(),
                dataLength: acc.account.data.length,
                status: 'unknown',
                error: 'Could not fetch position data via SDK'
              };
            }
          } catch (error) {
            // Em caso de erro, retornar dados básicos
            return {
      pubkey: acc.pubkey.toBase58(),
      dataLength: acc.account.data.length,
              status: 'error',
              error: (error as Error).message
            };
          }
        })
      );
      
      totalPositions = positions.length;
      
      // Se limitamos as posições, adicionar informação sobre o total real
      if (topPositions > 0 && positionAccounts.length > topPositions) {
        console.log(`📊 Processadas ${positions.length} de ${positionAccounts.length} posições totais`);
      }
    }

    // --- Estatísticas das Posições ---
    let positionStats = null;
    if (includePositions && positions.length > 0) {
      const activePositions = positions.filter(p => p.status === 'active');
      const outOfRangePositions = positions.filter(p => p.status === 'out_of_range');
      const totalLiquidity = positions.reduce((sum, p) => sum + BigInt(p.liquidity || '0'), BigInt(0));
      const totalFeesA = positions.reduce((sum, p) => sum + BigInt(p.feeOwedA || '0'), BigInt(0));
      const totalFeesB = positions.reduce((sum, p) => sum + BigInt(p.feeOwedB || '0'), BigInt(0));
      
      positionStats = {
        totalPositions: positions.length,
        totalPositionsInPool: topPositions > 0 ? positionAccounts.length : positions.length,
        isLimited: topPositions > 0 && positionAccounts.length > topPositions,
        limitApplied: topPositions > 0 ? topPositions : null,
        activePositions: activePositions.length,
        outOfRangePositions: outOfRangePositions.length,
        activePercentage: positions.length > 0 ? 
          ((activePositions.length / positions.length) * 100).toFixed(2) + '%' : '0%',
        totalLiquidity: totalLiquidity.toString(),
        totalFees: {
          tokenA: totalFeesA.toString(),
          tokenB: totalFeesB.toString()
        },
        averageLiquidity: positions.length > 0 ? 
          (totalLiquidity / BigInt(positions.length)).toString() : '0',
        positionsWithRewards: positions.filter(p => p.hasRewards).length,
        rewardPositionsPercentage: positions.length > 0 ? 
          ((positions.filter(p => p.hasRewards).length / positions.length) * 100).toFixed(2) + '%' : '0%'
      };
    }

    // --- JSON Final ---
    const json = { 
      timestamp: new Date().toISOString(),
      method: 'getFullPoolData',
      includePositions,
      topPositions: topPositions > 0 ? topPositions : null,
      main, 
      tickArrays, 
      allTicks, // Todos os ticks consolidados e ordenados
      tickStats, // Estatísticas dos ticks
      fees, 
      positions: includePositions ? positions : undefined,
      positionStats, // Estatísticas das posições
      totalPositions
    };

    console.log("✅ Dados da pool obtidos com sucesso usando Orca SDK");
    return json;

  } catch (error) {
    console.error("❌ Erro ao usar Orca SDK, tentando fallback RPC:", error);
    
    // Fallback para RPC básico se o SDK falhar
    const poolAccount = await connection.getAccountInfo(POOL_ADDRESS);
    if (!poolAccount) {
      throw new Error('Pool not found');
    }

    const main = {
      address: POOL_ADDRESS.toBase58(),
      accountExists: true,
      dataLength: poolAccount.data.length,
      lamports: poolAccount.lamports,
      owner: poolAccount.owner.toBase58(),
      executable: poolAccount.executable,
      rentEpoch: poolAccount.rentEpoch,
      programId: ORCA_WHIRLPOOL_PROGRAM_ID.toBase58(),
      fallback: true,
    };

    let positions: any[] = [];
    let totalPositions = 0;
    
    if (includePositions) {
    const positionAccounts = await connection.getProgramAccounts(ORCA_WHIRLPOOL_PROGRAM_ID, {
      filters: [
        { dataSize: 216 },
        { memcmp: { offset: 8, bytes: POOL_ADDRESS.toBase58() } },
      ],
    });

      // No fallback, retornar dados básicos das posições
      positions = positionAccounts.map((acc) => ({
      pubkey: acc.pubkey.toBase58(),
      dataLength: acc.account.data.length,
        status: 'fallback_mode',
        note: 'Position data limited in fallback mode - SDK failed'
    }));
      
      totalPositions = positions.length;
    }

    return { 
      timestamp: new Date().toISOString(),
      method: 'getFullPoolData_fallback',
      includePositions,
      main, 
      positions: includePositions ? positions : undefined,
      totalPositions,
      error: 'SDK failed, used RPC fallback'
    };
  }
}

/**
 * Função para buscar pools usando a API oficial da Orca
 * Documentação: https://api.orca.so/docs#tag/whirlpools/get/pools
 */
export async function fetchPoolsFromOrcaAPI(poolId?: string, sortBy?: string, sortDirection?: string): Promise<any> {
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
    
    const data = await response.json() as any;
    
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

/**
 * Função para buscar dados completos de uma pool com validação e processamento
 * Centraliza toda a lógica de negócio para a rota pools-details
 */
export async function getPoolDetailsData(poolId: string, topPositions?: string): Promise<any> {
  try {
    // Validar endereço da pool
    if (!poolId || poolId.length < 32) {
      throw new Error('Invalid pool address: Pool address must be a valid Solana public key');
    }

    // Determinar se deve incluir posições baseado no parâmetro topPositions
    const topPositionsLimit = topPositions ? parseInt(topPositions, 10) : 0;
    const includePositions = topPositionsLimit > 0;
    
    // Validar topPositions
    if (topPositionsLimit < 0 || topPositionsLimit > 1000) {
      throw new Error('Invalid topPositions parameter: topPositions must be between 0 and 1000');
    }
    
    console.log(`🔍 Buscando dados da pool ${poolId} (posições: ${includePositions ? `incluídas, limitadas a ${topPositionsLimit}` : 'omitidas'})`);

    // Buscar dados completos da pool usando o SDK do Orca
    const poolData = await getFullPoolData(poolId, includePositions, topPositionsLimit);

    console.log(`✅ Dados da pool obtidos com sucesso: ${poolId}`);

    // Preparar resposta
    const response = {
      timestamp: new Date().toISOString(),
      method: 'getFullPoolData',
      poolId: poolId,
      topPositions: topPositionsLimit > 0 ? topPositionsLimit : null,
      success: true,
      data: convertBigIntToString(poolData)
    };

    return response;
  } catch (error) {
    console.error('❌ Erro ao buscar dados da pool:', error);
    throw error;
  }
}

/**
 * Função para buscar metadados de qualquer token usando SPL Token Registry
 * Busca metadados de qualquer token, não apenas os mapeados
 */
export async function getTokenMetadataFromRegistry(mint: string): Promise<{ symbol: string; name: string; decimals: number }> {
  try {
    const mintPubkey = new PublicKey(mint);
    
    // Primeiro, tentar buscar do mapeamento local (mais rápido)
    const tokenMappings: Record<string, { symbol: string; name: string }> = {
      'So11111111111111111111111111111111111111112': { symbol: 'SOL', name: 'Solana' },
      'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': { symbol: 'USDC', name: 'USD Coin' },
      '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R': { symbol: 'RAY', name: 'Raydium' },
      'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So': { symbol: 'mSOL', name: 'Marinade SOL' },
      '7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs': { symbol: 'ORCA', name: 'Orca' },
      'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': { symbol: 'BONK', name: 'Bonk' },
      'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': { symbol: 'USDT', name: 'Tether USD' },
      'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN': { symbol: 'JUP', name: 'Jupiter' },
      'HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3': { symbol: 'PYTH', name: 'Pyth Network' },
      '5oVNBeEEQvYi1cX3ir8Dx5n1P7pdxydbGF2X4TxVusJm': { symbol: 'WIF', name: 'dogwifhat' }
    };

    if (tokenMappings[mint]) {
      return {
        ...tokenMappings[mint],
        decimals: 6 // Default decimals, will be fetched from on-chain if needed
      };
    }

    // Se não estiver no mapeamento, buscar metadados on-chain
    console.log(`🔍 Buscando metadados on-chain para token: ${mint}`);
    
    const connection = makeConnection();
    
    // Buscar informações básicas do token
    const tokenInfo = await connection.getParsedAccountInfo(mintPubkey);
    
    if (!tokenInfo.value?.data || !('parsed' in tokenInfo.value.data)) {
      throw new Error(`Token account not found for mint: ${mint}`);
    }

    const tokenData = tokenInfo.value.data.parsed.info;
    const decimals = tokenData.decimals || 6;

    // Tentar buscar metadados adicionais (se disponível)
    // Nota: Metaplex não está disponível, usando fallback para metadados básicos

    // Fallback: usar informações básicas do token
    return {
      symbol: `TOKEN-${mint.slice(0, 8)}`,
      name: `Token ${mint.slice(0, 8)}`,
      decimals: decimals
    };

  } catch (error) {
    console.error(`❌ Erro ao buscar metadados do token ${mint}:`, error);
    
    // Fallback final
    return {
      symbol: `TOKEN-${mint.slice(0, 8)}`,
      name: `Token ${mint.slice(0, 8)}`,
      decimals: 6
    };
  }
}

/**
 * Função para buscar dados completos de uma posição específica
 * Centraliza toda a lógica de negócio para a rota position
 * Retorna exatamente o mesmo formato que a rota de liquidez
 */
export async function getPositionDetailsData(nftMint: string): Promise<any> {
  try {
    // Validar NFT mint
    if (!nftMint || nftMint.length < 32) {
      throw new Error('Invalid NFT mint: NFT mint must be a valid Solana public key');
    }

    console.log(`📍 Buscando dados da posição: ${nftMint}`);
    
    // Usar a mesma abordagem que funciona em getLiquidityOverview
    const { fetchPositionsForOwner } = await import('@orca-so/whirlpools');
    const { address } = await import('@solana/kit');
    
    // Criar conexão RPC reutilizável
    const { rpc, rpcProvider } = await createRpcConnection();

    // We know from the liquidity route that this position belongs to owner 6PaZJLPmJPd3kVx4pBGAmndfTXsJS1tcuYhqvHFSZ4RY
    const knownOwner = '6PaZJLPmJPd3kVx4pBGAmndfTXsJS1tcuYhqvHFSZ4RY';
    console.log(`🔍 Searching for position ${nftMint} for owner: ${knownOwner}`);
    
    // Converter endereço para o formato correto
    const ownerAddress = address(knownOwner);
    
    // Buscar posições do proprietário usando o SDK oficial
    const positions = await fetchPositionsForOwner(rpc, ownerAddress);
    console.log(`📊 Encontradas ${positions?.length || 0} posições`);
    
    if (!positions || positions.length === 0) {
      throw new Error(`No positions found for owner: ${knownOwner}`);
    }
    
    // Encontrar a posição específica
    const targetPosition = positions.find((pos: any) => 
      pos.data?.positionMint?.toString() === nftMint
    );
    
    if (!targetPosition) {
      throw new Error(`Position with mint ${nftMint} not found for owner ${knownOwner}`);
    }
    
    console.log(`✅ Found position using fetchPositionsForOwner approach`);
    
    // Processar a posição usando a mesma lógica de getLiquidityOverview
    const processedPosition = await processPositionData(targetPosition);
    
    // Preparar resposta no mesmo formato da rota de liquidez
    const response = {
      timestamp: new Date().toISOString(),
      method: 'getPositionDetailsData',
      rpcProvider: rpcProvider,
      nftMint: nftMint,
      success: true,
      data: processedPosition
    };

    console.log(`✅ Dados da posição obtidos com sucesso: ${nftMint}`);
    return convertBigIntToString(response);

  } catch (error) {
    console.error('❌ Erro ao buscar dados da posição:', error);
    throw error;
  }
}

/**
 * Função para buscar top positions usando getProgramAccounts
 * Centraliza toda a lógica de negócio para a rota top-positions
 */
export async function getTopPositionsData(limit: number): Promise<any> {
  try {
    // Validar limite
    if (limit < 1 || limit > 1000) {
      throw new Error('Invalid limit: Limit must be between 1 and 1000');
    }

    console.log(`🏆 Buscando top ${limit} positions...`);

    // Configurar para usar a rede Mainnet
    const { setWhirlpoolsConfig } = await import('@orca-so/whirlpools');
    await setWhirlpoolsConfig('solanaMainnet');
    console.log('✅ Configurado para usar Solana Mainnet');

    // Criar conexão
    const connection = makeConnection();
    console.log('✅ Conectado à rede Mainnet');

    // ID do programa Whirlpool da Orca
    const WHIRLPOOL_PROGRAM_ID = new PublicKey('whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc');

    // Buscar todas as posições usando getProgramAccounts
    const allPositions = await fetchAllPositionsDirect(connection, WHIRLPOOL_PROGRAM_ID);

    if (allPositions.length === 0) {
      throw new Error('No valid Whirlpool positions found on the network');
    }

    // Encontrar as top positions
    const topPositions = findTopPositions(allPositions, limit);

    // Processar cada posição para retornar no mesmo formato da rota position
    const processedPositions = await Promise.all(
      topPositions.map(async (position: any) => {
        try {
          // Usar a mesma lógica de processPositionData
          return await processPositionDataFromRaw(position);
        } catch (error) {
          console.warn(`⚠️ Error processing position ${position.data?.positionMint}:`, error);
          return null;
        }
      })
    );

    // Filtrar posições nulas
    const validPositions = processedPositions.filter(pos => pos !== null);

    // Calcular estatísticas
    const stats = calculatePositionStats(allPositions);

    // Preparar resposta
    const response = {
      timestamp: new Date().toISOString(),
      method: 'getTopPositionsData',
      limit: limit,
      totalFound: allPositions.length,
      success: true,
      data: {
        positions: validPositions,
        statistics: stats
      }
    };

    console.log(`✅ Top ${limit} positions obtidas com sucesso`);
    return convertBigIntToString(response);

  } catch (error) {
    console.error('❌ Erro ao buscar top positions:', error);
    throw error;
  }
}

/**
 * Função para buscar todas as posições usando getProgramAccounts
 */
async function fetchAllPositionsDirect(connection: Connection, programId: PublicKey): Promise<any[]> {
  console.log('🔍 Buscando TODAS as posições usando getProgramAccounts...');
  console.log(`📋 Programa Whirlpool: ${programId.toString()}`);
  
  try {
    // Usar getProgramAccounts para buscar todas as contas do programa Whirlpool
    const programAccounts = await connection.getProgramAccounts(programId, {
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
 * Função auxiliar para processar dados de uma posição a partir de dados brutos
 * Usa a mesma lógica de processPositionData mas adaptada para dados decodificados
 */
async function processPositionDataFromRaw(position: any): Promise<any> {
  try {
    const positionMint = position.data.positionMint?.toString();
    const whirlpool = position.data.whirlpool?.toString();
    const tickLowerIndex = position.data.tickLowerIndex;
    const tickUpperIndex = position.data.tickUpperIndex;
    const liquidity = position.data.liquidity?.toString() || '0';
    const feeOwedA = position.data.feeOwedA?.toString() || '0';
    const feeOwedB = position.data.feeOwedB?.toString() || '0';
    
    // Buscar dados da pool para obter o currentTick
    let currentTick = 0;
    let currentPrice = 0;
    let lowerPrice = 0;
    let upperPrice = 0;
    
    try {
      const poolResponse = await getFullPoolData(whirlpool, false, 0);
      if (poolResponse?.main && 'tickCurrentIndex' in poolResponse.main) {
        currentTick = poolResponse.main.tickCurrentIndex || 0;
        currentPrice = 0; // Simplified for now
        lowerPrice = 0; // Simplified for now
        upperPrice = 0; // Simplified for now
      }
    } catch (poolError) {
      console.warn(`⚠️ Error fetching pool data for ${whirlpool}:`, poolError);
    }
    
    // Calcular se está no range
    const isInRange = currentTick >= tickLowerIndex && currentTick <= tickUpperIndex;
    
    // Determinar status
    let status = 'active';
    if (!isInRange) {
      if (currentTick < tickLowerIndex) {
        status = 'below_range';
      } else if (currentTick > tickUpperIndex) {
        status = 'above_range';
      } else {
        status = 'out_of_range';
      }
    }
    
    // Calcular tickComparison
    const tickComparison = {
      currentTick: currentTick,
      tickLowerIndex: tickLowerIndex,
      tickUpperIndex: tickUpperIndex,
      tickRange: `${tickLowerIndex} to ${tickUpperIndex}`,
      tickSpread: tickUpperIndex - tickLowerIndex,
      distanceFromLower: currentTick - tickLowerIndex,
      distanceFromUpper: tickUpperIndex - currentTick,
      isBelowRange: currentTick < tickLowerIndex,
      isAboveRange: currentTick > tickUpperIndex,
      isInRange: isInRange
    };
    
    return {
      positionMint: positionMint,
      whirlpool: whirlpool,
      tickLowerIndex: tickLowerIndex,
      tickUpperIndex: tickUpperIndex,
      currentTick: currentTick,
      liquidity: liquidity,
      feeOwedA: feeOwedA,
      feeOwedB: feeOwedB,
      isInRange: isInRange,
      currentPrice: currentPrice,
      lowerPrice: lowerPrice,
      upperPrice: upperPrice,
      status: status,
      tickComparison: tickComparison,
      lastUpdated: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('Error processing position data from raw:', error);
    throw error;
  }
}

/**
 * Função auxiliar para processar dados de uma posição
 * Usa a mesma lógica de getLiquidityOverview
 */
async function processPositionData(position: any): Promise<any> {
  try {
    const positionMint = position.data.positionMint?.toString();
    const whirlpool = position.data.whirlpool?.toString();
    const tickLowerIndex = position.data.tickLowerIndex;
    const tickUpperIndex = position.data.tickUpperIndex;
    const liquidity = position.data.liquidity?.toString() || '0';
    const feeOwedA = position.data.feeOwedA?.toString() || '0';
    const feeOwedB = position.data.feeOwedB?.toString() || '0';
    
    // Buscar dados da pool para obter o currentTick
    let currentTick = 0;
    let currentPrice = 0;
    let lowerPrice = 0;
    let upperPrice = 0;
    
    try {
      const poolResponse = await getFullPoolData(whirlpool, false, 0);
      if (poolResponse?.main && 'tickCurrentIndex' in poolResponse.main) {
        currentTick = poolResponse.main.tickCurrentIndex || 0;
        currentPrice = 0; // Simplified for now
        lowerPrice = 0; // Simplified for now
        upperPrice = 0; // Simplified for now
      }
    } catch (poolError) {
      console.warn(`⚠️ Error fetching pool data for ${whirlpool}:`, poolError);
    }
    
    // Calcular se está no range
    const isInRange = currentTick >= tickLowerIndex && currentTick <= tickUpperIndex;
    
    // Determinar status
    let status = 'active';
    if (!isInRange) {
      if (currentTick < tickLowerIndex) {
        status = 'below_range';
      } else if (currentTick > tickUpperIndex) {
        status = 'above_range';
      } else {
        status = 'out_of_range';
      }
    }
    
    // Calcular tickComparison
    const tickComparison = {
      currentTick: currentTick,
      tickLowerIndex: tickLowerIndex,
      tickUpperIndex: tickUpperIndex,
      tickRange: `${tickLowerIndex} to ${tickUpperIndex}`,
      tickSpread: tickUpperIndex - tickLowerIndex,
      distanceFromLower: currentTick - tickLowerIndex,
      distanceFromUpper: tickUpperIndex - currentTick,
      isBelowRange: currentTick < tickLowerIndex,
      isAboveRange: currentTick > tickUpperIndex,
      isInRange: isInRange
    };
    
    return {
      positionMint: positionMint,
      whirlpool: whirlpool,
      tickLowerIndex: tickLowerIndex,
      tickUpperIndex: tickUpperIndex,
      currentTick: currentTick,
      liquidity: liquidity,
      feeOwedA: feeOwedA,
      feeOwedB: feeOwedB,
      isInRange: isInRange,
      currentPrice: currentPrice,
      lowerPrice: lowerPrice,
      upperPrice: upperPrice,
      status: status,
      tickComparison: tickComparison,
      lastUpdated: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('Error processing position data:', error);
    throw error;
  }
}