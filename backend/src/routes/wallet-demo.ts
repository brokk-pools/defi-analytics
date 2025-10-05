import { Router, Request, Response } from 'express';
import { WalletPositionsResponse, PositionInfo } from '../lib/types.js';
import { asyncHandler, ValidationError } from '../lib/errors.js';
import { validatePublicKey } from '../lib/validation.js';

const router = Router();

router.get('/:publicKey', asyncHandler(async (req: Request, res: Response) => {
  const { publicKey } = req.params;
  
  if (!publicKey) {
    throw new ValidationError('Public key parameter is required');
  }
  
  // Validate public key format
  const validatedPubkey = validatePublicKey(publicKey);
  
  // Return demo data for MVP demonstration
  const positionInfos: PositionInfo[] = [
    {
      nftMint: 'DemoPosition1234567890abcdef',
      poolAddress: 'DemoPool1234567890abcdef',
      tokenA: 'SOL',
      tokenB: 'USDC',
      tickLower: -29760,
      tickUpper: 29760,
      liquidity: '1000000000',
      currentPrice: 98.45,
      inRange: true,
      estimatedFeesA: '0.125',
      estimatedFeesB: '12.34'
    },
    {
      nftMint: 'DemoPosition0987654321fedcba',
      poolAddress: 'DemoPool0987654321fedcba',
      tokenA: 'USDC',
      tokenB: 'RAY',
      tickLower: -1000,
      tickUpper: 1000,
      liquidity: '500000000',
      currentPrice: 2.15,
      inRange: false,
      estimatedFeesA: '5.67',
      estimatedFeesB: '0.089'
    }
  ];
  
  const response: WalletPositionsResponse = {
    wallet: validatedPubkey.toString(),
    positions: positionInfos
  };
  
  res.json(response);
}));

export default router;