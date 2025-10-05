import { Router, Request, Response } from 'express';
import { makeConnection, getPositionsByOwner, getPositionData, calculateEstimatedFees, getTokenMetadata, isPositionInRange } from '../lib/orca.js';
import { query } from '../lib/db.js';
import { WalletPositionsResponse, PositionInfo } from '../lib/types.js';
import { asyncHandler, NotFoundError, ExternalServiceError, ValidationError } from '../lib/errors.js';
import { validatePublicKey } from '../lib/validation.js';

const router = Router();

router.get('/:publicKey', asyncHandler(async (req: Request, res: Response) => {
  const { publicKey } = req.params;
  
  if (!publicKey) {
    throw new ValidationError('Public key parameter is required');
  }
  
  // Validate public key format
  const validatedPubkey = validatePublicKey(publicKey);
    
  const connection = makeConnection();
  
  try {
    
    // Get positions owned by this wallet
    const positions = await getPositionsByOwner(connection, validatedPubkey.toString());
    
    const positionInfos: PositionInfo[] = [];
    
    for (const position of positions) {
      try {
        // Get detailed position data
        const positionData = await getPositionData(connection, position.mint);
        
        if (positionData && positionData.whirlpoolData) {
          // Get token metadata
          const tokenAMeta = await getTokenMetadata(connection, positionData.whirlpoolData.tokenMintA);
          const tokenBMeta = await getTokenMetadata(connection, positionData.whirlpoolData.tokenMintB);
          
          // Calculate estimated fees
          const fees = calculateEstimatedFees(positionData);
          
          // Check if position is in range
          const inRange = isPositionInRange(positionData);
          
          // Calculate current price from sqrt price
          const sqrtPrice = BigInt(positionData.whirlpoolData.sqrtPrice);
          const price = Number(sqrtPrice * sqrtPrice) / (2 ** 128); // Simplified price calculation
          
          positionInfos.push({
            nftMint: position.mint,
            poolAddress: positionData.poolAddress,
            tokenA: tokenAMeta.symbol,
            tokenB: tokenBMeta.symbol,
            tickLower: positionData.tickLower,
            tickUpper: positionData.tickUpper,
            liquidity: positionData.liquidity,
            currentPrice: price,
            inRange,
            estimatedFeesA: fees.tokenA,
            estimatedFeesB: fees.tokenB
          });
        }
      } catch (error) {
        console.error(`Error processing position ${position.mint}:`, error);
      }
    }
    
    // Also check database for stored position data
    const dbPositions = await query(
      'SELECT * FROM positions WHERE owner = $1 AND closed_slot IS NULL',
      [validatedPubkey.toString()]
    );
    
    const response: WalletPositionsResponse = {
      wallet: validatedPubkey.toString(),
      positions: positionInfos
    };
    
    res.json(response);
  } catch (error) {
    if ((error as Error).message.includes('fetch positions')) {
      throw new ExternalServiceError('Unable to fetch position data from Solana network');
    }
    throw error;
  }

}));

export default router;