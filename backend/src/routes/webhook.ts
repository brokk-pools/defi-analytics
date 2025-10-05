import { Router, Request, Response } from 'express';
import { query } from '../lib/db.js';
import { HeliusWebhookEvent } from '../lib/types.js';

const router = Router();

router.post('/helius', async (req: Request, res: Response) => {
  try {
    const events: HeliusWebhookEvent[] = Array.isArray(req.body) ? req.body : [req.body];
    
    for (const event of events) {
      await processHeliusEvent(event);
    }
    
    res.status(200).json({ success: true, processed: events.length });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

async function processHeliusEvent(event: HeliusWebhookEvent) {
  const { signature, slot, timestamp, instructions, description } = event;
  
  // Check if this is an Orca Whirlpools transaction
  const orcaInstructions = instructions.filter(
    inst => inst.programId === process.env.ORCA_WHIRLPOOLS_PROGRAM_ID
  );
  
  if (orcaInstructions.length === 0) {
    return; // Not an Orca transaction
  }
  
  // Determine event type based on instruction data or description
  let eventKind = 'unknown';
  if (description.includes('swap')) eventKind = 'swap';
  else if (description.includes('increase') || description.includes('add')) eventKind = 'inc_liq';
  else if (description.includes('decrease') || description.includes('remove')) eventKind = 'dec_liq';
  else if (description.includes('collect')) eventKind = 'collect';
  
  // Store the raw event
  await query(
    `INSERT INTO events (id, pool_id, slot, ts, sig, kind, raw_json) 
     VALUES ($1, $2, $3, $4, $5, $6, $7) 
     ON CONFLICT (id) DO NOTHING`,
    [
      signature,
      'unknown_pool', // Would extract from instruction data in real implementation
      slot,
      new Date(timestamp * 1000),
      signature,
      eventKind,
      JSON.stringify(event)
    ]
  );
  
  // Process specific event types
  switch (eventKind) {
    case 'inc_liq':
    case 'dec_liq':
      await processLiquidityEvent(event, eventKind);
      break;
    case 'collect':
      await processCollectEvent(event);
      break;
    case 'swap':
      await processSwapEvent(event);
      break;
  }
}

async function processLiquidityEvent(event: HeliusWebhookEvent, kind: string) {
  // Extract position mint and liquidity data from the event
  // This would require parsing the instruction data properly
  
  // For MVP, we'll store basic information
  console.log(`Processing ${kind} event:`, event.signature);
}

async function processCollectEvent(event: HeliusWebhookEvent) {
  // Extract fee collection data and update position_fees table
  console.log('Processing collect event:', event.signature);
}

async function processSwapEvent(event: HeliusWebhookEvent) {
  // Track swap events for analytics
  console.log('Processing swap event:', event.signature);
}

export default router;