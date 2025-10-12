import { Connection, PublicKey, ParsedAccountData, ParsedTransactionWithMeta } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } from '@solana/spl-token';
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

        // Obter informações completas de rewards e fees
        let rewardInfos: any[] = [];
        let feeGrowthCheckpointA = '0';
        let feeGrowthCheckpointB = '0';
        let rewardGrowthsInside: any[] = [];

        try {
          // Buscar dados completos da posição usando o SDK
          const connection = makeConnection();
          const client = makeWhirlpoolClient();
          const positionMintPubkey = new PublicKey(positionMint);
          const positionPda = PDAUtil.getPosition(positionMintPubkey, ORCA_WHIRLPOOL_PROGRAM_ID);
          const position = await client.getPosition(positionPda.publicKey);
          
          if (position) {
            const positionData = position.getData();
            
            // Extrair informações completas de fees
            feeGrowthCheckpointA = positionData.feeGrowthCheckpointA.toString();
            feeGrowthCheckpointB = positionData.feeGrowthCheckpointB.toString();
            
            // Extrair informações completas de rewards
            rewardInfos = positionData.rewardInfos.map((reward, index) => ({
              index: index,
              growthInsideCheckpoint: reward.growthInsideCheckpoint.toString(),
              amountOwed: reward.amountOwed.toString(),
              hasReward: reward.amountOwed > 0n
            }));
            
            // Calcular reward growths inside (se disponível)
            rewardGrowthsInside = positionData.rewardInfos.map(reward => ({
              growthInsideCheckpoint: reward.growthInsideCheckpoint.toString(),
              amountOwed: reward.amountOwed.toString()
            }));
          }
        } catch (rewardError) {
          console.warn(`⚠️ Erro ao obter dados completos de rewards/fees para posição ${positionMint}:`, rewardError);
        }

        // Calcular fees pendentes (que ainda faltam coletar)
        // Nota: Este é um cálculo simplificado - em produção seria necessário
        // comparar com feeGrowthGlobal da pool para calcular fees acumuladas
        const feesCollected = {
          tokenA: feeOwedA,
          tokenB: feeOwedB
        };

        const feesPending = {
          tokenA: '0', // Seria calculado baseado na diferença entre feeGrowthGlobal e feeGrowthCheckpoint
          tokenB: '0'  // Seria calculado baseado na diferença entre feeGrowthGlobal e feeGrowthCheckpoint
        };

        const totalFees = {
          tokenA: (BigInt(feeOwedA) + BigInt(feesPending.tokenA)).toString(),
          tokenB: (BigInt(feeOwedB) + BigInt(feesPending.tokenB)).toString()
        };

        // Retornar dados completos da posição
        return {
          positionMint: positionMint,
          whirlpool: whirlpool || 'unknown',
          tickLowerIndex: tickLowerIndex || 0,
          tickUpperIndex: tickUpperIndex || 0,
          currentTick: currentTick,
          liquidity: liquidity || '0',
          
          // Informações completas de fees
          fees: {
            collected: feesCollected,
            pending: feesPending,
            total: totalFees,
            feeGrowthCheckpointA: feeGrowthCheckpointA,
            feeGrowthCheckpointB: feeGrowthCheckpointB
          },
          
          // Informações completas de rewards
          rewards: {
            rewardInfos: rewardInfos,
            rewardGrowthsInside: rewardGrowthsInside,
            totalRewardsOwed: rewardInfos.reduce((sum, reward) => sum + BigInt(reward.amountOwed), BigInt(0)).toString(),
            hasActiveRewards: rewardInfos.some(reward => BigInt(reward.amountOwed) > 0n),
            rewardCount: rewardInfos.length
          },
          
          isInRange: isInRange,
          status: status,
          tickComparison: tickComparison,
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
    
    let totalFeesCollectedA = BigInt(0);
    let totalFeesCollectedB = BigInt(0);
    let totalFeesPendingA = BigInt(0);
    let totalFeesPendingB = BigInt(0);
    let totalRewardsOwed = BigInt(0);
    let totalLiquidity = BigInt(0);
    let positionsWithRewards = 0;

    for (const position of processedPositions) {
      // Fees coletadas
      if (position.fees?.collected?.tokenA) {
        totalFeesCollectedA += BigInt(position.fees.collected.tokenA);
      }
      if (position.fees?.collected?.tokenB) {
        totalFeesCollectedB += BigInt(position.fees.collected.tokenB);
      }
      
      // Fees pendentes
      if (position.fees?.pending?.tokenA) {
        totalFeesPendingA += BigInt(position.fees.pending.tokenA);
      }
      if (position.fees?.pending?.tokenB) {
        totalFeesPendingB += BigInt(position.fees.pending.tokenB);
      }
      
      // Rewards
      if (position.rewards?.totalRewardsOwed) {
        totalRewardsOwed += BigInt(position.rewards.totalRewardsOwed);
      }
      if (position.rewards?.hasActiveRewards) {
        positionsWithRewards++;
      }
      
      // Liquidity
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
          collected: {
            tokenA: totalFeesCollectedA.toString(),
            tokenB: totalFeesCollectedB.toString()
          },
          pending: {
            tokenA: totalFeesPendingA.toString(),
            tokenB: totalFeesPendingB.toString()
          },
          total: {
            tokenA: (totalFeesCollectedA + totalFeesPendingA).toString(),
            tokenB: (totalFeesCollectedB + totalFeesPendingB).toString()
          }
        },
        total_whirlpool_rewards: {
          totalRewardsOwed: totalRewardsOwed.toString(),
          positionsWithRewards: positionsWithRewards,
          rewardsPercentage: processedPositions.length > 0 ? 
            ((positionsWithRewards / processedPositions.length) * 100).toFixed(2) + '%' : '0%'
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
    
    // Criar conexão RPC reutilizável
    const { rpcProvider } = await createRpcConnection();

    // Abordagem direta: usar o SDK do Orca para buscar a posição diretamente pelo NFT mint
    const connection = makeConnection();
    const client = makeWhirlpoolClient();
    
    try {
      // Tentar buscar a posição diretamente usando o SDK
      const positionMintPubkey = new PublicKey(nftMint);
      const positionPda = PDAUtil.getPosition(positionMintPubkey, ORCA_WHIRLPOOL_PROGRAM_ID);
      
      console.log(`🔍 Tentando buscar posição diretamente via SDK: ${positionPda.publicKey.toString()}`);
      
      const position = await client.getPosition(positionPda.publicKey);
      
      if (!position) {
        throw new Error(`Position not found at address: ${positionPda.publicKey.toString()}`);
      }
      
      const positionData = position.getData();
      console.log(`✅ Posição encontrada diretamente via SDK`);
      
      // Criar objeto de posição no formato esperado
      const targetPosition = {
        address: positionPda.publicKey.toString(),
        data: {
          positionMint: positionData.positionMint.toString(),
          whirlpool: positionData.whirlpool.toString(),
          tickLowerIndex: positionData.tickLowerIndex,
          tickUpperIndex: positionData.tickUpperIndex,
          liquidity: positionData.liquidity.toString(),
          feeOwedA: positionData.feeOwedA.toString(),
          feeOwedB: positionData.feeOwedB.toString(),
          feeGrowthCheckpointA: positionData.feeGrowthCheckpointA.toString(),
          feeGrowthCheckpointB: positionData.feeGrowthCheckpointB.toString(),
          rewardInfos: positionData.rewardInfos
        }
      };
      
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
      
    } catch (sdkError) {
      console.warn(`⚠️ Erro ao buscar posição via SDK, tentando abordagem alternativa:`, sdkError);
      
      // Fallback: tentar buscar via getProgramAccounts
      console.log(`🔍 Tentando buscar via getProgramAccounts...`);
      
      const programAccounts = await connection.getProgramAccounts(ORCA_WHIRLPOOL_PROGRAM_ID, {
        filters: [
          { dataSize: 216 }, // Tamanho de uma conta de posição Whirlpool
          { memcmp: { offset: 40, bytes: nftMint } }, // Filtrar pelo positionMint (offset 40)
        ],
      });
      
      console.log(`📊 Encontradas ${programAccounts.length} contas de posição`);
      
      if (programAccounts.length === 0) {
        throw new Error(`Position with mint ${nftMint} not found on the network`);
      }
      
      // Usar a primeira conta encontrada (deveria ser única)
      const account = programAccounts[0];
      
      if (!account) {
        throw new Error(`No valid account found for position mint: ${nftMint}`);
      }
      
      // Decodificar os dados da posição
      const decodedData = decodePositionData(account.account.data);
      
      if (!decodedData) {
        throw new Error(`Failed to decode position data for mint: ${nftMint}`);
      }
      
      console.log(`✅ Posição encontrada via getProgramAccounts`);
      
      // Criar objeto de posição no formato esperado
      const targetPosition = {
        address: account.pubkey.toString(),
        data: {
          positionMint: decodedData.positionMint,
          whirlpool: decodedData.whirlpool,
          tickLowerIndex: decodedData.tickLowerIndex,
          tickUpperIndex: decodedData.tickUpperIndex,
          liquidity: decodedData.liquidity.toString(),
          feeOwedA: decodedData.feeOwedA.toString(),
          feeOwedB: decodedData.feeOwedB.toString(),
          feeGrowthCheckpointA: decodedData.feeGrowthCheckpointA.toString(),
          feeGrowthCheckpointB: decodedData.feeGrowthCheckpointB.toString(),
          rewardInfos: decodedData.rewardInfos
        }
      };
      
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

      console.log(`✅ Dados da posição obtidos com sucesso via fallback: ${nftMint}`);
      return convertBigIntToString(response);
    }

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
    
    // Obter informações completas de rewards e fees
    let rewardInfos: any[] = [];
    let feeGrowthCheckpointA = '0';
    let feeGrowthCheckpointB = '0';
    let rewardGrowthsInside: any[] = [];

    try {
      // Buscar dados completos da posição usando o SDK
      const connection = makeConnection();
      const client = makeWhirlpoolClient();
      const positionMintPubkey = new PublicKey(positionMint);
      const positionPda = PDAUtil.getPosition(positionMintPubkey, ORCA_WHIRLPOOL_PROGRAM_ID);
      const position = await client.getPosition(positionPda.publicKey);
      
      if (position) {
        const positionData = position.getData();
        
        // Extrair informações completas de fees
        feeGrowthCheckpointA = positionData.feeGrowthCheckpointA.toString();
        feeGrowthCheckpointB = positionData.feeGrowthCheckpointB.toString();
        
        // Extrair informações completas de rewards
        rewardInfos = positionData.rewardInfos.map((reward, index) => ({
          index: index,
          growthInsideCheckpoint: reward.growthInsideCheckpoint.toString(),
          amountOwed: reward.amountOwed.toString(),
          hasReward: reward.amountOwed > 0n
        }));
        
        // Calcular reward growths inside
        rewardGrowthsInside = positionData.rewardInfos.map(reward => ({
          growthInsideCheckpoint: reward.growthInsideCheckpoint.toString(),
          amountOwed: reward.amountOwed.toString()
        }));
      }
    } catch (rewardError) {
      console.warn(`⚠️ Erro ao obter dados completos de rewards/fees para posição ${positionMint}:`, rewardError);
    }

    // Calcular fees pendentes
    const feesCollected = {
      tokenA: feeOwedA,
      tokenB: feeOwedB
    };

    const feesPending = {
      tokenA: '0', // Seria calculado baseado na diferença entre feeGrowthGlobal e feeGrowthCheckpoint
      tokenB: '0'  // Seria calculado baseado na diferença entre feeGrowthGlobal e feeGrowthCheckpoint
    };

    const totalFees = {
      tokenA: (BigInt(feeOwedA) + BigInt(feesPending.tokenA)).toString(),
      tokenB: (BigInt(feeOwedB) + BigInt(feesPending.tokenB)).toString()
    };

    return {
      positionMint: positionMint,
      whirlpool: whirlpool,
      tickLowerIndex: tickLowerIndex,
      tickUpperIndex: tickUpperIndex,
      currentTick: currentTick,
      liquidity: liquidity,
      
      // Informações completas de fees
      fees: {
        collected: feesCollected,
        pending: feesPending,
        total: totalFees,
        feeGrowthCheckpointA: feeGrowthCheckpointA,
        feeGrowthCheckpointB: feeGrowthCheckpointB
      },
      
      // Informações completas de rewards
      rewards: {
        rewardInfos: rewardInfos,
        rewardGrowthsInside: rewardGrowthsInside,
        totalRewardsOwed: rewardInfos.reduce((sum, reward) => sum + BigInt(reward.amountOwed), BigInt(0)).toString(),
        hasActiveRewards: rewardInfos.some(reward => BigInt(reward.amountOwed) > 0n),
        rewardCount: rewardInfos.length
      },
      
      isInRange: isInRange,
      status: status,
      tickComparison: tickComparison,
      lastUpdated: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('Error processing position data:', error);
    throw error;
  }
}

// ============== Fees Calculation Functions ==============

const Q64 = 1n << 64n;

type BNLike = bigint | number | string;

function toBN(x: BNLike): bigint {
  return typeof x === 'bigint' ? x : BigInt(x);
}

function subMod(a: bigint, b: bigint): bigint {
  // feeGrowth* são u128 em Q64.64; aqui ignoramos wrap/underflow por simplicidade
  return a - b;
}

/**
 * Função para calcular fees pendentes de uma posição específica
 * Baseada no código fornecido pelo usuário
 */
export async function getOutstandingFeesForPosition(
  poolPkStr: string,
  positionPkStr: string
): Promise<any> {
  try {
    console.log(`💰 Calculando fees pendentes para posição: ${positionPkStr} na pool: ${poolPkStr}`);
    
    const connection = makeConnection();
    const ctx = makeWhirlpoolContext();
    const client = buildWhirlpoolClient(ctx);

    const poolPk = new PublicKey(poolPkStr);
    
    // Tentar determinar se positionPkStr é um NFT mint ou endereço da posição
    let posPk: PublicKey;
    let actualPositionPkStr = positionPkStr;
    
    try {
      // Primeiro, tentar usar como endereço da posição diretamente
      posPk = new PublicKey(positionPkStr);
      console.log(`🔍 Tentando usar como endereço da posição: ${positionPkStr}`);
    } catch (error) {
      throw new Error(`Invalid position parameter: ${positionPkStr}`);
    }

    // ----- Pool & Position
    const pool = await client.getPool(poolPk);
    const poolData = pool.getData();
    
    let pos;
    try {
      // Tentar buscar a posição diretamente
      pos = await client.getFetcher().getPosition(posPk);
      if (!pos) {
        throw new Error("Position not found at direct address");
      }
      console.log(`✅ Posição encontrada diretamente: ${positionPkStr}`);
    } catch (directError) {
      console.log(`⚠️ Não foi possível encontrar posição diretamente, tentando buscar via NFT mint...`);
      
      // Se falhar, tentar buscar a posição usando a mesma lógica da rota position
      try {
        console.log(`🔍 Buscando posição via fetchPositionsForOwner para NFT mint: ${positionPkStr}`);
        
        // Usar a mesma abordagem que funciona em getPositionDetailsData
        const { fetchPositionsForOwner } = await import('@orca-so/whirlpools');
        const { address } = await import('@solana/kit');
        
        // Criar conexão RPC reutilizável
        const { rpc } = await createRpcConnection();
        
        // Buscar em owners conhecidos (isso é uma limitação, mas funciona para o MVP)
        const knownOwners = [
          '6PaZJLPmJPd3kVx4pBGAmndfTXsJS1tcuYhqvHFSZ4RY',
          '2mu3kyTmEvdjPUeb9CPHMqDWT7jZEWqiyqtrJyMHHhuc'
        ];
        
        let foundPosition = null;
        
        for (const owner of knownOwners) {
          try {
            console.log(`🔍 Buscando posições para owner: ${owner}`);
            const ownerAddress = address(owner);
            const positions = await fetchPositionsForOwner(rpc, ownerAddress);
            
            if (positions && positions.length > 0) {
              const targetPosition = positions.find((pos: any) => 
                pos.data?.positionMint?.toString() === positionPkStr
              );
              
              if (targetPosition) {
                console.log(`✅ Posição encontrada para owner: ${owner}`);
                foundPosition = targetPosition;
                break;
              }
            }
          } catch (ownerError) {
            console.log(`⚠️ Erro ao buscar posições para owner ${owner}:`, ownerError);
            continue;
          }
        }
        
        if (!foundPosition) {
          throw new Error(`Position with mint ${positionPkStr} not found in any known owner`);
        }
        
        // Usar o endereço da posição encontrada
        posPk = new PublicKey(foundPosition.address.toString());
        actualPositionPkStr = foundPosition.address.toString();
        
        console.log(`🔍 Usando endereço da posição encontrada: ${actualPositionPkStr}`);
        
        pos = await client.getFetcher().getPosition(posPk);
        if (!pos) {
          throw new Error("Position not found after fetching via owner search");
        }
        console.log(`✅ Posição encontrada via busca por owner`);
        
      } catch (searchError) {
        console.log(`❌ Erro na busca por owner:`, searchError);
        throw new Error(`Position not found. Tried direct address and owner search. Original: ${positionPkStr}. Search error: ${(searchError as Error).message}`);
      }
    }

    const {
      liquidity,
      tickLowerIndex,
      tickUpperIndex,
      feeGrowthCheckpointA,
      feeGrowthCheckpointB,
      feeOwedA,
      feeOwedB,
    } = pos;

    const currentTick = poolData.tickCurrentIndex;

    // ----- Carregar ticks lower/upper (pegando os TickArrays corretos)
    function tickArrayStartFor(tickIndex: number, tickSpacing: number) {
      const TICKS_PER_ARRAY = 88;
      const span = tickSpacing * TICKS_PER_ARRAY;
      return Math.floor(tickIndex / span) * span;
    }

    async function loadTick(tickIndex: number) {
      const start = tickArrayStartFor(tickIndex, poolData.tickSpacing);
      const { publicKey } = PDAUtil.getTickArrayFromTickIndex(
        start,
        poolData.tickSpacing,
        poolPk,
        ORCA_WHIRLPOOL_PROGRAM_ID
      );
      const tickArray = await client.getFetcher().getTickArray(publicKey);
      if (!tickArray) throw new Error(`TickArray not initialized at start=${start}`);
      const rel = (tickIndex - start) / poolData.tickSpacing; // 0..87
      const tick = tickArray.ticks[rel];
      if (!tick || !tick.initialized) {
        // Se o tick não estiver inicializado, feeGrowthOutside = 0 por definição
        return {
          feeGrowthOutsideA: 0n,
          feeGrowthOutsideB: 0n,
        };
      }
      return {
        feeGrowthOutsideA: toBN(tick.feeGrowthOutsideA),
        feeGrowthOutsideB: toBN(tick.feeGrowthOutsideB),
      };
    }

    const lower = await loadTick(tickLowerIndex);
    const upper = await loadTick(tickUpperIndex);

    // ----- feeGrowthInside para A e B (Q64.64, u128)
    const gA = toBN(poolData.feeGrowthGlobalA);
    const gB = toBN(poolData.feeGrowthGlobalB);

    function inside(g: bigint, lo: bigint, up: bigint): bigint {
      if (currentTick < tickLowerIndex) {
        return subMod(lo, up);
      } else if (currentTick >= tickUpperIndex) {
        return subMod(up, lo);
      } else {
        return g - lo - up;
      }
    }

    const insideA = inside(gA, lower.feeGrowthOutsideA, upper.feeGrowthOutsideA);
    const insideB = inside(gB, lower.feeGrowthOutsideB, upper.feeGrowthOutsideB);

    // ----- Cálculo dos fees a receber agora
    const L = toBN(liquidity);
    const checkA = toBN(feeGrowthCheckpointA);
    const checkB = toBN(feeGrowthCheckpointB);

    const deltaA = insideA - checkA; // Q64.64
    const deltaB = insideB - checkB; // Q64.64

    const variableA = (L * deltaA) / Q64;
    const variableB = (L * deltaB) / Q64;

    const owedA = toBN(feeOwedA) + (variableA < 0n ? 0n : variableA);
    const owedB = toBN(feeOwedB) + (variableB < 0n ? 0n : variableB);

    const result = {
      timestamp: new Date().toISOString(),
      method: 'getOutstandingFeesForPosition',
      position: actualPositionPkStr,
      originalPositionParam: positionPkStr,
      pool: poolPkStr,
      currentTick,
      tickLowerIndex,
      tickUpperIndex,
      // tokens:
      tokenMintA: poolData.tokenMintA.toBase58(),
      tokenMintB: poolData.tokenMintB.toBase58(),
      // fees pendentes (em unidades mínimas dos tokens):
      feeOwedAOnChain: feeOwedA.toString(),
      feeOwedBOnChain: feeOwedB.toString(),
      feeOwedAComputedNow: owedA.toString(),
      feeOwedBComputedNow: owedB.toString(),
      // Informações adicionais para análise
      liquidity: liquidity.toString(),
      feeGrowthGlobalA: poolData.feeGrowthGlobalA.toString(),
      feeGrowthGlobalB: poolData.feeGrowthGlobalB.toString(),
      feeGrowthCheckpointA: feeGrowthCheckpointA.toString(),
      feeGrowthCheckpointB: feeGrowthCheckpointB.toString(),
      // Cálculos intermediários
      calculations: {
        feeGrowthInsideA: insideA.toString(),
        feeGrowthInsideB: insideB.toString(),
        deltaA: deltaA.toString(),
        deltaB: deltaB.toString(),
        variableA: variableA.toString(),
        variableB: variableB.toString(),
        tickLower: {
          feeGrowthOutsideA: lower.feeGrowthOutsideA.toString(),
          feeGrowthOutsideB: lower.feeGrowthOutsideB.toString()
        },
        tickUpper: {
          feeGrowthOutsideA: upper.feeGrowthOutsideA.toString(),
          feeGrowthOutsideB: upper.feeGrowthOutsideB.toString()
        }
      }
    };

    console.log(`✅ Fees calculadas com sucesso para posição: ${positionPkStr}`);
    return result;

  } catch (error) {
    console.error('❌ Erro ao calcular fees pendentes:', error);
    throw new Error(`Failed to calculate outstanding fees: ${(error as Error).message}`);
  }
}

// ============== Fees Collected Functions ==============

const MAX_SIGS_PER_ATA = Number(process.env.MAX_SIGS || 5000);

function parseUtcToEpochSeconds(isoUtc: string): number {
  const d = new Date(isoUtc);
  if (isNaN(d.getTime())) throw new Error(`Invalid UTC date: ${isoUtc}`);
  return Math.floor(d.getTime() / 1000);
}

function mapDeltaForAccount(tx: ParsedTransactionWithMeta, account: string): bigint {
  const pre = tx.meta?.preTokenBalances ?? [];
  const post = tx.meta?.postTokenBalances ?? [];
    const preMap = new Map(pre.map((b) => [b.accountIndex, BigInt(b.uiTokenAmount.amount)]));
    let delta = 0n;
    for (const pb of post) {
      const idx = pb.accountIndex;
      const afterAmt = BigInt(pb.uiTokenAmount.amount);
      const beforeAmt = preMap.get(idx) ?? 0n;
      const key = tx.transaction.message.accountKeys[idx]?.pubkey.toBase58();
      if (key === account) {
        const change = afterAmt - beforeAmt;
        delta += change; // + received; - sent
      }
    }
  return delta;
}

function mapDeltaForNativeAccount(tx: ParsedTransactionWithMeta, account: string): bigint {
  const preBalances = tx.meta?.preBalances ?? [];
  const postBalances = tx.meta?.postBalances ?? [];
  let delta = 0n;
  
  for (let i = 0; i < postBalances.length; i++) {
    const key = tx.transaction.message.accountKeys[i]?.pubkey.toBase58();
    if (key === account) {
      const afterAmt = BigInt(postBalances[i] ?? 0);
      const beforeAmt = BigInt(preBalances[i] ?? 0);
      const change = afterAmt - beforeAmt;
      delta += change; // + received; - sent
    }
  }
  
  return delta;
}

async function getMintDecimals(conn: Connection, mint: PublicKey): Promise<number> {
  const acc = await conn.getParsedAccountInfo(mint);
  const info = (acc.value as any)?.data?.parsed?.info;
  return typeof info?.decimals === "number" ? info.decimals : 0;
}

function human(amtRaw: bigint, decimals: number): number {
  return Number(amtRaw) / Math.pow(10, decimals);
}

/** First transaction seen at pool address (approximates "creation"). */
async function getPoolCreationTime(conn: Connection, pool: PublicKey): Promise<number | null> {
  // getSignaturesForAddress returns by default most recent first;
  // no native reverse exists; so paginate until last (careful with cost).
  // For simplicity: we use the OLDEST transaction among the first pages via 'before'.
  // Here, as a light heuristic, we take the OLDEST from the first page of 1000 and trust it.
  const sigs = await conn.getSignaturesForAddress(pool, { limit: 1000 });
  if (sigs.length === 0) return null;
  const oldest = sigs[sigs.length - 1];
  return oldest?.blockTime ?? null;
}

/**
 * Calcula fees pendentes (outstanding fees) para um owner em uma pool específica
 * Similar ao feesCollectedInRange, mas para fees que ainda não foram coletadas
 */
export async function getOutstandingFeesForOwner(
  poolPkStr: string,
  ownerStr: string,
  positionId?: string,
  showPositions: boolean = false
) {
  const connection = await makeConnection();
  const ctx = makeWhirlpoolContext();
  const client = buildWhirlpoolClient(ctx);

  const poolPk = new PublicKey(poolPkStr);
  const owner = new PublicKey(ownerStr);

  // Pool data
  const pool = await client.getPool(poolPk);
  const d = pool.getData();
  const mintA = d.tokenMintA;
  const mintB = d.tokenMintB;

  // Obter decimais dos tokens
  const [decA, decB] = await Promise.all([
    getMintDecimals(connection, mintA),
    getMintDecimals(connection, mintB),
  ]);

  // Buscar todas as posições do owner na pool
  const { fetchPositionsForOwner } = await import('@orca-so/whirlpools');
  const { rpc } = await createRpcConnection();
  const allPositions = await fetchPositionsForOwner(rpc, owner.toBase58() as any);
  const poolPositions = allPositions.filter((pos: any) => 
    pos.data?.whirlpool?.toString() === poolPkStr
  );

  if (poolPositions.length === 0) {
    throw new Error("No positions found for this owner in the specified pool");
  }

  // Filtrar por positionId se fornecido
  let targetPositions = poolPositions;
  if (positionId) {
    targetPositions = poolPositions.filter((pos: any) => 
      pos.data?.positionMint?.toString() === positionId
    );
    if (targetPositions.length === 0) {
      throw new Error("Position not found for this owner in the specified pool");
    }
  }

  // Calcular fees pendentes para cada posição
  const positionFees = [];
  let totalFeesA = 0n;
  let totalFeesB = 0n;

  for (const position of targetPositions) {
    try {
      const positionMint = (position.data as any)?.positionMint?.toString();
      if (!positionMint) continue;

      const fees = await getOutstandingFeesForPosition(
        poolPkStr,
        positionMint
      );

      positionFees.push({
        positionId: positionMint,
        positionAddress: position.address.toString(),
        fees: fees
      });

      // Somar fees totais
      const feesA = BigInt(fees.feeOwedAComputedNow || "0");
      const feesB = BigInt(fees.feeOwedBComputedNow || "0");
      totalFeesA += feesA;
      totalFeesB += feesB;

    } catch (error) {
      console.warn(`Failed to get fees for position ${(position.data as any)?.positionMint?.toString()}:`, error);
    }
  }

  // Preparar resultado
  const result: any = {
    timestamp: new Date().toISOString(),
    method: 'getOutstandingFeesForOwner',
    pool: poolPkStr,
    owner: ownerStr,
    positionId: positionId || null,
    totalPositions: targetPositions.length,
    positionAddresses: targetPositions.map((pos: any) => pos.address.toString()),
    tokenA: { mint: mintA.toBase58(), decimals: decA },
    tokenB: { mint: mintB.toBase58(), decimals: decB },
    totals: {
      A: { raw: totalFeesA.toString(), human: Number(totalFeesA) / Math.pow(10, decA) },
      B: { raw: totalFeesB.toString(), human: Number(totalFeesB) / Math.pow(10, decB) },
      note: "A+B sum has no single unit (distinct tokens).",
    },
    success: true
  };

  // Incluir detalhes por posição se solicitado
  if (showPositions) {
    result.positions = positionFees;
  }

  return result;
}

/**
 * Sums collected fees in range [startUtc, endUtc] (UTC).
 * If startUtc empty => uses pool creation; if endUtc empty => now.
 * If showHistory = true, returns detailed history per transaction.
 */
export async function feesCollectedInRange(
  poolPkStr: string,
  ownerStr: string,
  startUtcIso?: string,
  endUtcIso?: string,
  showHistory: boolean = false,
  positionId?: string
): Promise<any> {
  try {
    console.log(`💰 Calculating collected fees for owner: ${ownerStr} in pool: ${poolPkStr}${positionId ? ` for position: ${positionId}` : ''}`);
    console.log(`📅 Range: ${startUtcIso || 'pool creation'} to ${endUtcIso || 'now'}`);
    console.log(`📊 Show history: ${showHistory}`);
    
    const connection = makeConnection();
    const ctx = makeWhirlpoolContext();
    const client = buildWhirlpoolClient(ctx);

    const poolPk = new PublicKey(poolPkStr);
    const owner = new PublicKey(ownerStr);

    // Pool data
    const pool = await client.getPool(poolPk);
    const d = pool.getData();
    const mintA = d.tokenMintA;
    const mintB = d.tokenMintB;
    const vaultA = d.tokenVaultA.toBase58();
    const vaultB = d.tokenVaultB.toBase58();

    // UTC range
    let startSec: number;
    let endSec: number;

    if (!startUtcIso || startUtcIso.trim() === "") {
      // Se não fornecido, usar 1º de janeiro de 1900 (início amplo)
      startSec = parseUtcToEpochSeconds("1900-01-01T00:00:00Z");
    } else {
      startSec = parseUtcToEpochSeconds(startUtcIso);
    }

    if (!endUtcIso || endUtcIso.trim() === "") {
      // Se não fornecido, usar data de hoje + 1 dia (fim amplo)
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      endSec = Math.floor(tomorrow.getTime() / 1000);
    } else {
      endSec = parseUtcToEpochSeconds(endUtcIso);
    }

    if (endSec < startSec) throw new Error("endUtc < startUtc");

    // Owner ATAs
    const ataA = getAssociatedTokenAddressSync(mintA, owner).toBase58();
    const ataB = getAssociatedTokenAddressSync(mintB, owner).toBase58();

    // Buscar posições do owner na pool
    let targetPositionAddresses: string[] = [];
    let allPositions: any[] = [];
    
    try {
      console.log(`🔍 Buscando posições do owner ${ownerStr} na pool ${poolPkStr}`);
      
      // Buscar posições do owner usando a mesma lógica de getLiquidityOverview
      const { fetchPositionsForOwner } = await import('@orca-so/whirlpools');
      const { address } = await import('@solana/kit');
      
      const ownerAddress = address(ownerStr);
      const { rpc } = await createRpcConnection();
      const positions = await fetchPositionsForOwner(rpc, ownerAddress);
      
      if (positions && positions.length > 0) {
        // Filtrar posições que pertencem à pool especificada
        const poolPositions = positions.filter((pos: any) => 
          pos.data?.whirlpool?.toString() === poolPkStr
        );
        
        console.log(`📊 Encontradas ${poolPositions.length} posições do owner na pool`);
        
        if (positionId) {
          // Se positionId foi fornecido, buscar apenas essa posição específica
          const targetPosition = poolPositions.find((pos: any) => 
            pos.data?.positionMint?.toString() === positionId
          );
          
          if (targetPosition) {
            targetPositionAddresses = [targetPosition.address.toString()];
            allPositions = [targetPosition];
            console.log(`✅ Posição específica encontrada: ${positionId} -> ${targetPosition.address.toString()}`);
          } else {
            throw new Error(`Position ${positionId} not found for owner ${ownerStr} in pool ${poolPkStr}`);
          }
        } else {
          // Se positionId não foi fornecido, usar todas as posições do owner na pool
          targetPositionAddresses = poolPositions.map((pos: any) => pos.address.toString());
          allPositions = poolPositions;
          console.log(`✅ Usando todas as ${poolPositions.length} posições do owner na pool`);
        }
      } else {
        throw new Error(`No positions found for owner ${ownerStr}`);
      }
    } catch (error) {
      console.error(`❌ Erro ao buscar posições:`, error);
      throw new Error(`Failed to fetch positions: ${(error as Error).message}`);
    }

    // Decimals
    const [decA, decB] = await Promise.all([
      getMintDecimals(connection, mintA),
      getMintDecimals(connection, mintB),
    ]);

    type HistLine = {
      token: "A" | "B";
      signature: string;
      datetimeUTC: string; // ISO
      amountRaw: string;
      amount: number;
      positionId?: string | undefined; // NFT mint da posição
    };


    // Função auxiliar para extrair positionId de uma transação
    function extractPositionId(tx: any, positions?: any[]): string | undefined {
      // Primeiro, tentar encontrar position mint diretamente nos account keys
      for (const accountKey of tx.transaction.message.accountKeys) {
        const accountStr = accountKey.pubkey.toBase58();
        // Verificar se este account corresponde a algum position mint das posições conhecidas
        const matchingPosition = positions?.find((pos: any) => {
          const positionMint = pos.data?.positionMint?.toString();
          return positionMint === accountStr;
        });
        if (matchingPosition) {
          return accountStr;
        }
      }
      
      // Se não encontrou e há um positionId específico, usar ele
      if (positionId) {
        return positionId;
      } else if (positions && positions.length === 1) {
        // Se há apenas uma posição, usar ela
        return positions[0].data?.positionMint?.toString();
      }
      
      return undefined;
    }

    // Nova abordagem: buscar transações do Owner e filtrar apenas as que interagem com ATAs A ou B
    async function scanTransactionsForBothTokens(
      ataA: string,
      vaultA: string,
      decA: number,
      ataB: string,
      vaultB: string,
      decB: number,
      targetPositionAddrs?: string[],
      positions?: any[]
    ): Promise<[{ totalRaw: bigint; lines: HistLine[] }, { totalRaw: bigint; lines: HistLine[] }]> {
      
      let totalRawA: bigint = 0n;
      let totalRawB: bigint = 0n;
      const linesA: HistLine[] = [];
      const linesB: HistLine[] = [];

      console.log(`🔍 [NEW APPROACH] Scanning transactions for owner: ${ownerStr}`);
      console.log(`🔍 [NEW APPROACH] Looking for interactions with ATA A: ${ataA}`);
      console.log(`🔍 [NEW APPROACH] Looking for interactions with ATA B: ${ataB}`);
      console.log(`🔍 [NEW APPROACH] Looking for transfers from Vault A: ${vaultA}`);
      console.log(`🔍 [NEW APPROACH] Looking for transfers from Vault B: ${vaultB}`);

      // Buscar transações do Owner (não das ATAs)
      const ownerSignatures = await connection.getSignaturesForAddress(
        owner,
        { limit: Math.min(MAX_SIGS_PER_ATA, 1000) }
      );

      console.log(`🔍 [NEW APPROACH] Found ${ownerSignatures.length} transactions for owner`);

      // Processar cada transação do owner
      for (const sig of ownerSignatures) {
        const bt = sig.blockTime ?? null;
        
        if (bt && bt < startSec) continue;
        if (bt && bt > endSec) continue;

        const tx = await connection.getParsedTransaction(sig.signature, {
          maxSupportedTransactionVersion: 0,
        });
        if (!tx || !tx.meta) continue;

        // Verificar se a transação interage com o Whirlpools Program
        const hasOrcaIx = tx.transaction.message.accountKeys
          .some(k => k.pubkey.toBase58() === ORCA_WHIRLPOOL_PROGRAM_ID.toBase58());
        if (!hasOrcaIx) continue;

        // Verificar se a transação contém logs de collect_fees do Anchor
        const hasCollectFeesLog = tx.meta.logMessages?.some(log => 
          log.includes("Instruction: CollectFees")
        );
        
        if (!hasCollectFeesLog) continue;

        console.log(`🔍 [COLLECT FEES] Found collect_fees log in transaction: ${sig.signature}`);

        // Analisar inner instructions para detectar transferências dos vaults para as ATAs
        const innerInstructions = tx.meta?.innerInstructions ?? [];
        let credited = { A: 0n, B: 0n };
        
        for (const group of innerInstructions) {
          for (const instruction of group.instructions as any[]) {
            if (instruction.program !== "spl-token" || instruction.parsed?.type !== "transfer") continue;
            
            const src = instruction.parsed.info.source;
            const dst = instruction.parsed.info.destination;
            const amt = BigInt(instruction.parsed.info.amount);
            
            // Verificar se é transferência do vault A para ATA A
            if (src === vaultA) {
              credited.A += amt;
              console.log(`🔍 [COLLECT FEES] Token A transfer: ${amt} from vault to ATA`);
            }
            
            // Verificar se é transferência do vault B para ATA B
            if (src === vaultB) {
              credited.B += amt;
              console.log(`🔍 [COLLECT FEES] Token B transfer: ${amt} from vault to ATA`);
            }
          }
        }
        
        // Se não houve transferências dos vaults, pular esta transação
        if (credited.A === 0n && credited.B === 0n) continue;

        // Se targetPositionAddrs foi especificado, verificar se a transação envolve alguma dessas posições
        if (targetPositionAddrs && targetPositionAddrs.length > 0) {
          const accountKeys = tx.transaction.message.accountKeys.map(k => k.pubkey.toBase58());
          const hasTargetPosition = accountKeys.some(addr => targetPositionAddrs.includes(addr));
          if (!hasTargetPosition) continue;
        }

        console.log(`🔍 [COLLECT FEES] Transaction ${sig.signature}: creditedA=${credited.A}, creditedB=${credited.B}`);

        // Processar Token A se houver crédito
        if (credited.A > 0n) {
          totalRawA += credited.A;

          if (showHistory) {
            const transactionPositionId = extractPositionId(tx, positions);
            linesA.push({
              token: "A",
              signature: sig.signature,
              datetimeUTC: new Date((bt ?? 0) * 1000).toISOString(),
              amountRaw: credited.A.toString(),
              amount: human(credited.A, decA),
              positionId: transactionPositionId,
            });
          }
        }

        // Processar Token B se houver crédito
        if (credited.B > 0n) {
          totalRawB += credited.B;

          if (showHistory) {
            const transactionPositionId = extractPositionId(tx, positions);
            linesB.push({
              token: "B",
              signature: sig.signature,
              datetimeUTC: new Date((bt ?? 0) * 1000).toISOString(),
              amountRaw: credited.B.toString(),
              amount: human(credited.B, decB),
              positionId: transactionPositionId,
            });
          }
        }
      }

      // Sort history by ascending date (if any)
      if (showHistory) {
        linesA.sort((a, b) => (a.datetimeUTC < b.datetimeUTC ? -1 : 1));
        linesB.sort((a, b) => (a.datetimeUTC < b.datetimeUTC ? -1 : 1));
      }

      console.log(`🔍 [NEW APPROACH] Final results: A=${totalRawA}, B=${totalRawB}`);

      return [
        { totalRaw: totalRawA, lines: linesA },
        { totalRaw: totalRawB, lines: linesB }
      ];
    }

    // Escanear transações uma única vez e analisar ambas as ATAs
    const [resA, resB] = await scanTransactionsForBothTokens(
      ataA, vaultA, decA, 
      ataB, vaultB, decB, 
      targetPositionAddresses, allPositions
    );


    const result: any = {
      timestamp: new Date().toISOString(),
      method: 'feesCollectedInRange',
      pool: poolPkStr,
      owner: ownerStr,
      positionId: positionId || null,
      positionAddress: positionId ? targetPositionAddresses[0] || null : null,
      totalPositions: allPositions.length,
      positionAddresses: targetPositionAddresses,
      interval_utc: {
        start: new Date(startSec * 1000).toISOString(),
        end: new Date(endSec * 1000).toISOString(),
      },
      tokenA: { mint: mintA.toBase58(), ata: ataA, decimals: decA },
      tokenB: { mint: mintB.toBase58(), ata: ataB, decimals: decB },
      totals: {
        A: { raw: resA.totalRaw.toString(), human: human(resA.totalRaw, decA) },
        B: { raw: resB.totalRaw.toString(), human: human(resB.totalRaw, decB) },
        note: "A+B sum has no single unit (distinct tokens).",
      },
      success: true
    };

    if (showHistory) {
      result.history = {
        A: resA.lines,
        B: resB.lines,
      };
    }

    console.log(`✅ Collected fees calculated successfully for owner: ${ownerStr}`);
    return result;

  } catch (error) {
    console.error('❌ Error calculating collected fees:', error);
    throw new Error(`Failed to calculate collected fees: ${(error as Error).message}`);
  }
}