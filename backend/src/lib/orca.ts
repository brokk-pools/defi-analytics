import { Connection, PublicKey, ParsedAccountData } from '@solana/web3.js';
import { setWhirlpoolsConfig } from '@orca-so/whirlpools';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import fetch from 'node-fetch';
import { resolveVaultPositions } from './vault.js';

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

export function getProgramId(): PublicKey {
  const pid = process.env.ORCA_WHIRLPOOLS_PROGRAM_ID || 'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc';
  return new PublicKey(pid);
}

export async function initializeOrcaConfig() {
  const network = process.env.ORCA_NETWORK || (process.env.NODE_ENV === 'production' ? 'mainnet' : 'devnet');
  const configName = network.toLowerCase() === 'mainnet' ? 'solanaMainnet' : 'solanaDevnet';
  await setWhirlpoolsConfig(configName);
}

export async function getPositionsByOwner(connection: Connection, owner: string): Promise<any[]> {
  try {
    const ownerPubkey = new PublicKey(owner);
    
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
    
    // Check each NFT to see if it's an Orca Whirlpool position
    for (const account of nftAccounts.slice(0, 10)) { // Limit to first 10 for performance
      try {
        const mint = account.account.data.parsed.info.mint;
        const mintPubkey = new PublicKey(mint);
        
        // Try to derive the position account address
        const whirlpoolsProgramId = getProgramId();
        const [positionPda] = PublicKey.findProgramAddressSync(
          [Buffer.from('position'), mintPubkey.toBuffer()],
          whirlpoolsProgramId
        );
        
        // Check if this position account exists
        const positionAccount = await connection.getAccountInfo(positionPda);
        
        if (positionAccount && positionAccount.data.length > 0) {
          console.log(`✅ Found Orca position: ${mint}`);
          positions.push({
            mint: mint,
            tokenAccount: account.pubkey.toString(),
            positionAddress: positionPda.toString()
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
    
    console.log(`📍 Fetching position data for: ${positionMint}`);
    
    // Derive the position account address
    const whirlpoolsProgramId = getProgramId();
    const [positionPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('position'), mintPubkey.toBuffer()],
      whirlpoolsProgramId
    );
    
    // Get the position account data
    const positionAccount = await connection.getAccountInfo(positionPda);
    
    if (!positionAccount || positionAccount.data.length === 0) {
      throw new Error('Position account not found');
    }
    
    // Parse position data (simplified version)
    // In a full implementation, you would use the Orca SDK's deserializer
    const data = positionAccount.data;
    
    // Extract basic data from the account (this is simplified)
    // Real implementation would use proper borsh deserialization
    const whirlpoolOffset = 8; // Skip discriminator
    const whirlpoolBuffer = data.slice(whirlpoolOffset, whirlpoolOffset + 32);
    const whirlpoolAddress = new PublicKey(whirlpoolBuffer).toString();
    
    // Get whirlpool data
    const whirlpoolPubkey = new PublicKey(whirlpoolAddress);
    const whirlpoolAccount = await connection.getAccountInfo(whirlpoolPubkey);
    
    let tokenMintA = 'So11111111111111111111111111111111111111112'; // Default to SOL
    let tokenMintB = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'; // Default to USDC
    let tickCurrentIndex = 0;
    let sqrtPrice = '79228162514264337593543950336';
    let feeRate = 300;
    
    if (whirlpoolAccount && whirlpoolAccount.data.length > 0) {
      // Extract token mints from whirlpool data (simplified)
      const whirlpoolData = whirlpoolAccount.data;
      const tokenMintAOffset = 8; // Skip discriminator 
      const tokenMintBOffset = 8 + 32; // After tokenMintA
      
      tokenMintA = new PublicKey(whirlpoolData.slice(tokenMintAOffset, tokenMintAOffset + 32)).toString();
      tokenMintB = new PublicKey(whirlpoolData.slice(tokenMintBOffset, tokenMintBOffset + 32)).toString();
      
      console.log(`🪙 Token A: ${tokenMintA}`);
      console.log(`🪙 Token B: ${tokenMintB}`);
    }
    
    // Extract position-specific data (simplified)
    const tickLowerOffset = 8 + 32; // After whirlpool address
    const tickUpperOffset = tickLowerOffset + 4;
    const liquidityOffset = tickUpperOffset + 4;
    
    // Read as little-endian integers (simplified)
    const tickLower = data.readInt32LE(tickLowerOffset);
    const tickUpper = data.readInt32LE(tickUpperOffset);
    
    // Liquidity is u128, but we'll read as BigInt for simplicity
    const liquidityBuffer = data.slice(liquidityOffset, liquidityOffset + 16);
    const liquidity = Buffer.from(liquidityBuffer).readBigUInt64LE(0).toString();
    
    console.log(`📊 Position: ticks [${tickLower}, ${tickUpper}], liquidity: ${liquidity}`);
    
    return {
      mint: positionMint,
      poolAddress: whirlpoolAddress,
      tickLower,
      tickUpper,
      liquidity,
      feeGrowthInside: {
        tokenA: '0', // Would need proper parsing
        tokenB: '0'
      },
      whirlpoolData: {
        tokenMintA,
        tokenMintB,
        tickCurrentIndex,
        sqrtPrice,
        feeRate
      }
    };
    
  } catch (error) {
    console.error('Error fetching position data:', error);
    throw new Error(`Failed to fetch position data: ${(error as Error).message}`);
  }
}

export function calculateEstimatedFees(position: any): { tokenA: string; tokenB: string } {
  try {
    // Simplified fee calculation based on position data
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
  const whirlpoolNfts = await getPositionsByOwner(connection, owner);
  const splTokens = await listSplTokensByOwner(connection, owner);
  const classicLps = await detectClassicLpPositions(splTokens);
  const vaultPositions = await resolveVaultPositions(connection, owner);

  return {
    whirlpools_positions: whirlpoolNfts,
    classic_pools_positions: classicLps,
    vault_positions: vaultPositions
  };
}