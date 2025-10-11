import { db } from './db.js';

export async function runMigrations(): Promise<void> {
  // vault_program: programas custodians (farms/vaults etc.)
  await db.query(`
    CREATE TABLE IF NOT EXISTS vault_program (
      id SERIAL PRIMARY KEY,
      program_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      protocol TEXT NOT NULL,
      kind TEXT NOT NULL,
      active BOOLEAN NOT NULL DEFAULT TRUE
    );
  `);

  // vault_pool: pools/estratégias dentro de um programa de vault
  await db.query(`
    CREATE TABLE IF NOT EXISTS vault_pool (
      id SERIAL PRIMARY KEY,
      vault_program_id INTEGER NOT NULL REFERENCES vault_program(id) ON DELETE CASCADE,
      pool_id_or_pda TEXT NOT NULL,
      whirlpool_program_id TEXT,
      whirlpool_address TEXT,
      lp_mint TEXT,
      UNIQUE (vault_program_id, pool_id_or_pda)
    );
  `);

  // vault_resolver: metadados para varrer depósitos e resolver dono -> posição
  await db.query(`
    CREATE TABLE IF NOT EXISTS vault_resolver (
      id SERIAL PRIMARY KEY,
      vault_program_id INTEGER NOT NULL REFERENCES vault_program(id) ON DELETE CASCADE,
      resolver_kind TEXT NOT NULL,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb
    );
  `);

  // user_position_cache: cache de posições resolvidas por owner
  await db.query(`
    CREATE TABLE IF NOT EXISTS user_position_cache (
      id SERIAL PRIMARY KEY,
      owner TEXT NOT NULL,
      source TEXT NOT NULL,
      position_mint TEXT,
      whirlpool_address TEXT,
      lp_mint TEXT,
      last_seen_slot BIGINT,
      payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}



