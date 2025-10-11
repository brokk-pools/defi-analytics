import { Router } from 'express';
import { makeConnection, getLiquidityOverview } from '../lib/orca.js';

const router = Router();

router.get('/:owner', async (req, res) => {
  try {
    const { owner } = req.params;
    const connection = makeConnection();
    const data = await getLiquidityOverview(connection, owner);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;



