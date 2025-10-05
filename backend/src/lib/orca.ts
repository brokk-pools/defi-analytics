import { Connection, PublicKey } from '@solana/web3.js';
import { setWhirlpoolsConfig } from '@orca-so/whirlpools';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';

export function makeConnection(): Connection {
  const url = process.env.HELIUS_RPC || 'https://api.devnet.solana.com';
  return new Connection(url, 'confirmed');
}

export function getProgramId(): PublicKey {
  const pid = process.env.ORCA_WHIRLPOOLS_PROGRAM_ID || 'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc';
  return new PublicKey(pid);
}

export async function initializeOrcaConfig() {
  await setWhirlpoolsConfig("solanaDevnet");
}

export async function getPositionsByOwner(connection: Connection, owner: string): Promise<any[]> {
  try {
    const ownerPubkey = new PublicKey(owner);
    
    // Get all token accounts owned by the wallet
    const accounts = await connection.getParsedTokenAccountsByOwner(ownerPubkey, {
      programId: TOKEN_PROGRAM_ID
    });
    
    // Filter for potential position NFTs (amount = 1, decimals = 0)
    const nftAccounts = accounts.value.filter(account => {
      const tokenAmount = account.account.data.parsed.info.tokenAmount;
      return tokenAmount.amount === '1' && tokenAmount.decimals === 0;
    });
    
    // For now, return simplified position data
    // In a full implementation, you would check each NFT to see if it's an Orca position
    return nftAccounts.slice(0, 5).map(account => ({
      mint: account.account.data.parsed.info.mint,
      tokenAccount: account.pubkey.toString(),
      positionAddress: 'demo_position_address'
    }));
    
  } catch (error) {
    console.error('Error fetching positions:', error);
    throw new Error(`Failed to fetch positions: ${(error as Error).message}`);
  }
}

export async function getPositionData(connection: Connection, positionMint: string): Promise<any> {
  try {
    // For now, return mock data with realistic structure
    // In a full implementation, you would use the Orca SDK to fetch real position data
    
    const mockData = {
      mint: positionMint,
      poolAddress: 'DemoPoolAddress1234567890',
      tickLower: -29760,
      tickUpper: 29760,
      liquidity: '1000000000',
      feeGrowthInside: {
        tokenA: '100000',
        tokenB: '50000'
      },
      whirlpoolData: {
        tokenMintA: 'So11111111111111111111111111111111111111112', // SOL
        tokenMintB: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
        tickCurrentIndex: 0,
        sqrtPrice: '79228162514264337593543950336', // Price around $100
        feeRate: 300 // 0.3%
      }
    };
    
    return mockData;
  } catch (error) {
    console.error('Error fetching position data:', error);
    throw new Error(`Failed to fetch position data: ${(error as Error).message}`);
  }
}

export function calculateEstimatedFees(position: any): { tokenA: string; tokenB: string } {
  try {
    // Calculate fees based on fee growth inside the position
    // This is a simplified calculation - in production you'd want more sophisticated math
    
    const liquidity = BigInt(position.liquidity || '0');
    const feeGrowthA = BigInt(position.feeGrowthInside?.tokenA || '0');
    const feeGrowthB = BigInt(position.feeGrowthInside?.tokenB || '0');
    
    // Rough estimation: multiply liquidity by fee growth and divide by a large number
    // This is not the exact Orca formula but gives a reasonable estimate
    const estimatedFeesA = liquidity * feeGrowthA / BigInt(2 ** 64);
    const estimatedFeesB = liquidity * feeGrowthB / BigInt(2 ** 64);
    
    return {
      tokenA: estimatedFeesA.toString(),
      tokenB: estimatedFeesB.toString()
    };
  } catch (error) {
    console.error('Error calculating fees:', error);
    // Return minimal values if calculation fails
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
    const mintInfo = await connection.getParsedAccountInfo(mintPubkey);
    
    if (mintInfo.value && 'parsed' in mintInfo.value.data) {
      const decimals = mintInfo.value.data.parsed.info.decimals;
      
      // Common devnet token mappings
      const tokenMappings: Record<string, { symbol: string; name: string }> = {
        'So11111111111111111111111111111111111111112': { symbol: 'SOL', name: 'Solana' },
        'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': { symbol: 'USDC', name: 'USD Coin' },
        // Add more token mappings as needed
      };
      
      const mapping = tokenMappings[mint] || { symbol: 'UNK', name: 'Unknown' };
      
      return {
        symbol: mapping.symbol,
        name: mapping.name,
        decimals
      };
    }
    
    return { symbol: 'UNK', name: 'Unknown', decimals: 0 };
  } catch (error) {
    console.error('Error fetching token metadata:', error);
    return { symbol: 'UNK', name: 'Unknown', decimals: 0 };
  }
}

// Helper function to determine if position is in range
export function isPositionInRange(position: any): boolean {
  try {
    const currentTick = position.whirlpoolData?.tickCurrentIndex || 0;
    const tickLower = position.tickLower;
    const tickUpper = position.tickUpper;
    
    return currentTick >= tickLower && currentTick <= tickUpper;
  } catch (error) {
    console.error('Error checking if position is in range:', error);
    return false;
  }
}