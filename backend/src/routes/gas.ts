import { Router } from 'express';
import { GetGasInPosition } from '../lib/orca.js';

const router = Router();

// GET /gas/:positionId?showHistory=true|false
router.get('/:positionId', async (req, res) => {
  try {
    const { positionId } = req.params;
    const showHistoryParam = String(req.query.showHistory || 'false').toLowerCase();
    const showHistory = showHistoryParam === 'true';

    if (!positionId) {
      return res.status(400).json({ error: 'positionId is required' });
    }

    const result = await GetGasInPosition(positionId, showHistory);
    return res.json(result);
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to calculate gas for position',
      message: (error as Error).message
    });
  }
});

export default router;


