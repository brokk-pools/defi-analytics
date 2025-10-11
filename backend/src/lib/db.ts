import pkg from 'pg';
const { Pool: PgPool } = pkg;

export const db = new PgPool({
  host: 'localhost',
  port: 5432,
  database: 'orca_mvp',
  user: 'postgres',
  password: 'postgres',
  ssl: false
});

export async function query(q: string, params?: any[]) {
  const res = await db.query(q, params);
  return res.rows;
}

export interface PoolData {
  id: string;
  token_a: string;
  token_b: string;
  fee_bps: number;
  tick_spacing: number;
  whirlpool_pubkey: string;
  last_slot_indexed: bigint;
}

export interface Event {
  id: string;
  pool_id: string;
  slot: bigint;
  ts: Date;
  sig: string;
  kind: 'swap' | 'inc_liq' | 'dec_liq' | 'collect';
  raw_json: any;
}

export interface Position {
  nft_mint: string;
  owner: string;
  pool_id: string;
  tick_lower: number;
  tick_upper: number;
  liquidity: string;
  created_slot: bigint;
  closed_slot?: bigint;
}

export interface PositionFees {
  nft_mint: string;
  token_a_fees: string;
  token_b_fees: string;
  last_updated: Date;
}