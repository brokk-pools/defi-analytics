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
    const mintPubkey = new PublicKey(positionMint);
    const client = makeWhirlpoolClient();
    
    console.log(`📍 Fetching position data for: ${positionMint}`);
    
    // Use SDK to derive position PDA
    const positionPda = PDAUtil.getPosition(mintPubkey, ORCA_WHIRLPOOL_PROGRAM_ID);
    
    // Get position data using SDK
    const position = await client.getPosition(positionPda.publicKey);
    
    if (!position) {
      throw new Error('Position not found');
    }
    
    const positionData = position.getData();
    
    // Get whirlpool data using SDK
    const whirlpool = await client.getPool(positionData.whirlpool);
    const whirlpoolData = whirlpool.getData();
    
    console.log(`🪙 Token A: ${whirlpoolData.tokenMintA.toString()}`);
    console.log(`🪙 Token B: ${whirlpoolData.tokenMintB.toString()}`);
    console.log(`📊 Position: ticks [${positionData.tickLowerIndex}, ${positionData.tickUpperIndex}], liquidity: ${positionData.liquidity.toString()}`);
    
    // Calculate current price using SDK (simplified for now)
    // const currentPrice = PriceMath.sqrtPriceX64ToPrice(
    //   whirlpoolData.sqrtPrice,
    //   whirlpoolData.tokenMintA,
    //   whirlpoolData.tokenMintB
    // );
    
    return {
      mint: positionMint,
      positionAddress: positionPda.publicKey.toString(),
      poolAddress: positionData.whirlpool.toString(),
      tickLower: positionData.tickLowerIndex,
      tickUpper: positionData.tickUpperIndex,
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
      })),
      whirlpoolData: {
        tokenMintA: whirlpoolData.tokenMintA.toString(),
        tokenMintB: whirlpoolData.tokenMintB.toString(),
        tickCurrentIndex: whirlpoolData.tickCurrentIndex,
        sqrtPrice: whirlpoolData.sqrtPrice.toString(),
        feeRate: whirlpoolData.feeRate,
        protocolFeeRate: whirlpoolData.protocolFeeRate,
        liquidity: whirlpoolData.liquidity.toString(),
        tickSpacing: whirlpoolData.tickSpacing,
        // currentPrice: currentPrice.toString(),
        protocolFeeOwedA: whirlpoolData.protocolFeeOwedA.toString(),
        protocolFeeOwedB: whirlpoolData.protocolFeeOwedB.toString(),
      }
    };
    
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

export async function getLiquidityOverview(connection: Connection, owner: string) {
  try {
    console.log(`🌊 Getting liquidity overview for wallet: ${owner}`);
    
    // Get all position types using SDK-enhanced functions
    const whirlpoolNfts = await getPositionsByOwner(connection, owner);
    const splTokens = await listSplTokensByOwner(connection, owner);
    const classicLps = await detectClassicLpPositions(splTokens);
    const vaultPositions = await resolveVaultPositions(connection, owner);

    // Calculate total value and fees for whirlpool positions
    let totalWhirlpoolFeesA = '0';
    let totalWhirlpoolFeesB = '0';
    let totalWhirlpoolLiquidity = '0';

    for (const position of whirlpoolNfts) {
      if (position.feeOwedA) {
        totalWhirlpoolFeesA = (BigInt(totalWhirlpoolFeesA) + BigInt(position.feeOwedA)).toString();
      }
      if (position.feeOwedB) {
        totalWhirlpoolFeesB = (BigInt(totalWhirlpoolFeesB) + BigInt(position.feeOwedB)).toString();
      }
      if (position.liquidity) {
        totalWhirlpoolLiquidity = (BigInt(totalWhirlpoolLiquidity) + BigInt(position.liquidity)).toString();
      }
    }

    const overview = {
      timestamp: new Date().toISOString(),
      wallet: owner,
      whirlpools_positions: whirlpoolNfts,
      classic_pools_positions: classicLps,
      vault_positions: vaultPositions,
      summary: {
        total_whirlpool_positions: whirlpoolNfts.length,
        total_classic_lp_positions: classicLps.length,
        total_vault_positions: vaultPositions.length,
        total_whirlpool_fees: {
          tokenA: totalWhirlpoolFeesA,
          tokenB: totalWhirlpoolFeesB
        },
        total_whirlpool_liquidity: totalWhirlpoolLiquidity
      }
    };

    console.log(`✅ Liquidity overview completed: ${whirlpoolNfts.length} whirlpools, ${classicLps.length} classic LPs, ${vaultPositions.length} vaults`);
    return overview;

  } catch (error) {
    console.error('Error getting liquidity overview:', error);
    throw new Error(`Failed to get liquidity overview: ${(error as Error).message}`);
  }
}

const TICKS_PER_ARRAY = 88;

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
export async function getFullPoolData(poolAddressStr: string, includePositions: boolean = true) {
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
    
    if (includePositions) {
      // ⚠️ Consulta bruta via getProgramAccounts (filtro pelo Whirlpool)
      const positionAccounts = await connection.getProgramAccounts(ORCA_WHIRLPOOL_PROGRAM_ID, {
        filters: [
          { dataSize: 216 }, // tamanho PositionAccount
          { memcmp: { offset: 8, bytes: POOL_ADDRESS.toBase58() } },
        ],
      });

      positions = positionAccounts.map((acc) => ({
        pubkey: acc.pubkey.toBase58(),
        dataLength: acc.account.data.length,
      }));
      
      totalPositions = positions.length;
    }

    // --- JSON Final ---
    const json = { 
      timestamp: new Date().toISOString(),
      method: 'getFullPoolData',
      includePositions,
      main, 
      tickArrays, 
      allTicks, // Todos os ticks consolidados e ordenados
      tickStats, // Estatísticas dos ticks
      fees, 
      positions: includePositions ? positions : undefined,
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

      positions = positionAccounts.map((acc) => ({
        pubkey: acc.pubkey.toBase58(),
        dataLength: acc.account.data.length,
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