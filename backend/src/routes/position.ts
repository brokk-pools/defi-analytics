import { Router, Request, Response } from 'express';
import { makeConnection, getPositionData, calculateEstimatedFees, getTokenMetadata, isPositionInRange } from '../lib/orca.js';
import { query } from '../lib/db.js';
import { PositionDetailsResponse } from '../lib/types.js';
import { asyncHandler, NotFoundError, ExternalServiceError, ValidationError } from '../lib/errors.js';
import { validateNFTMint } from '../lib/validation.js';

const router = Router();

router.get('/:nftMint', asyncHandler(async (req: Request, res: Response) => {
  const { nftMint } = req.params;
  
  if (!nftMint) {
    throw new ValidationError('NFT mint parameter is required');
  }
  
  // Validate NFT mint format
  const validatedMint = validateNFTMint(nftMint);
    
  const connection = makeConnection();
  
  try {
    // Get position data from Orca
    const positionData = await getPositionData(connection, validatedMint.toString());
    
    if (!positionData || !positionData.whirlpoolData) {
      throw new NotFoundError('Position not found or is not a valid Orca Whirlpool position');
    }
    
    // Get token metadata
    const tokenAMeta = await getTokenMetadata(connection, positionData.whirlpoolData.tokenMintA);
    const tokenBMeta = await getTokenMetadata(connection, positionData.whirlpoolData.tokenMintB);
    
    // Get additional data from database
    const dbPosition = await query(
      'SELECT * FROM positions WHERE nft_mint = $1',
      [validatedMint.toString()]
    );
    
    const dbFees = await query(
      'SELECT * FROM position_fees WHERE nft_mint = $1',
      [validatedMint.toString()]
    );
    
    // Calculate estimated fees
    const fees = calculateEstimatedFees(positionData);
    
    // Check if position is in range
    const inRange = isPositionInRange(positionData);
    
    // Calculate current price from sqrt price
    const sqrtPrice = BigInt(positionData.whirlpoolData.sqrtPrice);
    const price = Number(sqrtPrice * sqrtPrice) / (2 ** 128);
    
    // Determine owner from database or derive from on-chain data
    const owner = dbPosition[0]?.owner || 'unknown';
    
    const response: PositionDetailsResponse = {
      nftMint: validatedMint.toString(),
      poolAddress: positionData.poolAddress,
      tokenA: tokenAMeta.symbol,
      tokenB: tokenBMeta.symbol,
      tickLower: positionData.tickLower,
      tickUpper: positionData.tickUpper,
      liquidity: positionData.liquidity,
      currentPrice: price,
      inRange,
      estimatedFeesA: dbFees[0]?.token_a_fees || fees.tokenA,
      estimatedFeesB: dbFees[0]?.token_b_fees || fees.tokenB,
      owner,
      createdSlot: dbPosition[0]?.created_slot || BigInt(0),
      lastUpdated: dbFees[0]?.last_updated || new Date()
    };
    
    res.json(response);
  } catch (error) {
    if ((error as Error).message.includes('fetch position data')) {
      throw new ExternalServiceError('Unable to fetch position data from Solana network');
    }
    throw error;
  }
}));

export default router;