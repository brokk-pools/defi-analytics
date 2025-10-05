import { Router, Request, Response } from 'express';
import { makeConnection, getPositionsByOwner, getPositionData, calculateEstimatedFees, getTokenMetadata, isPositionInRange, calculatePriceFromSqrtPrice } from '../lib/orca.js';
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
    console.log(`🔍 Starting wallet search for: ${validatedPubkey.toString()}`);
    
    // Get positions owned by this wallet
    const positions = await getPositionsByOwner(connection, validatedPubkey.toString());
    
    console.log(`🌊 Found ${positions.length} Orca positions to process`);
    
    const positionInfos: PositionInfo[] = [];
    
    // Only process if we have positions
    if (positions.length > 0) {
      for (const position of positions) {
        try {
          console.log(`📍 Processing position: ${position.mint}`);
          
          // Get detailed position data
          const positionData = await getPositionData(connection, position.mint);
          
          if (positionData && positionData.whirlpoolData) {
            console.log(`✅ Position data retrieved for ${position.mint}`);
            
            // Get token metadata
            const tokenAMeta = await getTokenMetadata(connection, positionData.whirlpoolData.tokenMintA);
            const tokenBMeta = await getTokenMetadata(connection, positionData.whirlpoolData.tokenMintB);
            
            console.log(`🪙 Tokens: ${tokenAMeta.symbol}/${tokenBMeta.symbol}`);
            
            // Calculate estimated fees
            const fees = calculateEstimatedFees(positionData);
            
            // Check if position is in range
            const inRange = isPositionInRange(positionData);
            
            // Calculate current price from sqrt price
            const price = calculatePriceFromSqrtPrice(
              positionData.whirlpoolData.sqrtPrice,
              tokenAMeta.decimals,
              tokenBMeta.decimals
            );
            
            console.log(`💰 Price: ${price.toFixed(6)}, In Range: ${inRange}`);
            
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
            
            console.log(`✅ Position ${position.mint} processed successfully`);
          } else {
            console.log(`⚠️ No whirlpool data for position ${position.mint}`);
          }
        } catch (error) {
          console.error(`❌ Error processing position ${position.mint}:`, error);
          // Continue processing other positions
        }
      }
    }
    
    console.log(`🎉 Processed ${positionInfos.length} positions successfully`);
    
    if (positionInfos.length === 0) {
      console.log(`💭 No Orca positions found for wallet ${validatedPubkey.toString()}`);
    }
    
    const response: WalletPositionsResponse = {
      wallet: validatedPubkey.toString(),
      positions: positionInfos
    };
    
    res.json(response);
  } catch (error) {
    console.error('❌ Error in wallet route:', error);
    
    // Return empty positions instead of throwing error
    const response: WalletPositionsResponse = {
      wallet: validatedPubkey.toString(),
      positions: []
    };
    
    res.json(response);
  }

}));

export default router;