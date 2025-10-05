CREATE TABLE IF NOT EXISTS pools (
  id TEXT PRIMARY KEY,
  token_a TEXT,
  token_b TEXT,
  fee_bps INTEGER,
  tick_spacing INTEGER,
  whirlpool_pubkey TEXT,
  last_slot_indexed BIGINT
);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  pool_id TEXT,
  slot BIGINT,
  ts TIMESTAMP,
  sig TEXT,
  kind TEXT, -- swap|inc_liq|dec_liq|collect
  raw_json JSON
);

CREATE TABLE IF NOT EXISTS positions (
  nft_mint TEXT PRIMARY KEY,
  owner TEXT,
  pool_id TEXT,
  tick_lower INTEGER,
  tick_upper INTEGER,
  liquidity NUMERIC,
  created_slot BIGINT,
  closed_slot BIGINT
);

CREATE TABLE IF NOT EXISTS position_fees (
  nft_mint TEXT PRIMARY KEY,
  token_a_fees NUMERIC DEFAULT 0,
  token_b_fees NUMERIC DEFAULT 0,
  last_updated TIMESTAMP DEFAULT now()
);