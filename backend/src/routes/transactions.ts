import { Router } from 'express';
import { GetInnerTransactionsFromPosition } from '../lib/orca.js';
import type { OnChainOperationsPositions } from '../lib/orca.js';
import { logger } from '../lib/logger.js';

const router = Router();

// GET /transactions/:positionMint?operations=op1,op2&startUtc=...&endUtc=...
router.get('/:positionMint', async (req, res) => {
  try {
    const { positionMint } = req.params;
    const { operations, startUtc, endUtc } = req.query as {
      operations?: string;
      startUtc?: string;
      endUtc?: string;
    };

    // Validações básicas
    if (!positionMint || positionMint.length < 32) {
      return res.status(400).json({
        error: 'Invalid position mint',
        message: 'Position mint must be a valid Solana public key',
      });
    }

    let opsList: OnChainOperationsPositions[] | undefined = undefined;
    if (operations && operations.trim().length > 0) {
      opsList = operations.split(',').map((s) => s.trim().toUpperCase()) as OnChainOperationsPositions[];
    }

    logger.info('🔎 Transactions route called', {
      positionMint,
      operations: opsList || 'ALL',
      startUtc: startUtc || null,
      endUtc: endUtc || null,
    });

    const data = await GetInnerTransactionsFromPosition(
      positionMint,
      opsList || ['COLLECT_FEES','INCREASE_LIQUIDITY','DECREASE_LIQUIDITY','OPEN_POSITION'],
      startUtc,
      endUtc
    );

    return res.json({ success: true, ...data });
  } catch (error: any) {
    logger.error('❌ Error in transactions route:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch transactions',
      message: error?.message || 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;


