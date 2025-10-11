import { Connection, PublicKey } from '@solana/web3.js';
import { query } from './db.js';

type ResolverKind = 'share_mint' | 'deposit_account_scan';

export type VaultResolverRow = {
  id: number;
  program_id: string;
  name: string;
  protocol: string;
  kind: string;
  resolver_kind: ResolverKind;
  metadata: any;
};

export type VaultDiscoveredPosition = {
  source: string; // `${protocol}:${name}`
  vaultProgramId: string;
  // Se conhecido
  positionMint?: string;
  // Para LP clássico via vault (opcional)
  lpMint?: string;
  // Informações úteis de diagnóstico
  details?: any;
};

async function loadResolvers(): Promise<VaultResolverRow[]> {
  const rows = await query(
    `SELECT vr.id,
            vp.program_id,
            vp.name,
            vp.protocol,
            vp.kind,
            vr.resolver_kind,
            vr.metadata
       FROM vault_resolver vr
       JOIN vault_program vp ON vp.id = vr.vault_program_id
      WHERE vp.active = TRUE`
  );
  return rows as VaultResolverRow[];
}

async function resolveByShareMint(connection: Connection, owner: string, r: VaultResolverRow): Promise<VaultDiscoveredPosition[]> {
  const results: VaultDiscoveredPosition[] = [];
  const meta = r.metadata || {};
  const shareMint: string | undefined = meta.share_mint;
  if (!shareMint) return results;

  const ownerPk = new PublicKey(owner);
  const mintPk = new PublicKey(shareMint);

  // Busca contas do usuário para o share mint do vault
  const tokenAccounts = await connection.getTokenAccountsByOwner(ownerPk, { mint: mintPk });

  for (const acc of tokenAccounts.value) {
    const amount = acc.account.data.length > 0 ? acc.account.data : undefined;
    // Não temos parsing aqui; para não depender do parsed, assumimos que se existe conta, vamos registrar.
    // Opcionalmente, meta.min_balance para filtrar zero.
    const pos: VaultDiscoveredPosition = {
      source: `${r.protocol}:${r.name}`,
      vaultProgramId: r.program_id,
      details: { shareMint, accountPubkey: acc.pubkey.toString() }
    };

    // Se fornecido: obter posição custodiada lendo uma conta de estado do vault e extraindo o mint
    if (meta.vault_state_pubkey && typeof meta.position_mint_offset === 'number') {
      try {
        const statePk = new PublicKey(meta.vault_state_pubkey as string);
        const info = await connection.getAccountInfo(statePk);
        if (info?.data && info.data.length >= meta.position_mint_offset + 32) {
          const buf = info.data.slice(meta.position_mint_offset, meta.position_mint_offset + 32);
          pos.positionMint = new PublicKey(buf).toString();
        }
      } catch {}
    }

    results.push(pos);
  }

  return results;
}

async function resolveByDepositScan(connection: Connection, owner: string, r: VaultResolverRow): Promise<VaultDiscoveredPosition[]> {
  const results: VaultDiscoveredPosition[] = [];
  const meta = r.metadata || {};
  // Espera-se: memcmp offset para owner
  const ownerOffset: number | undefined = meta.owner_offset;
  if (typeof ownerOffset !== 'number') return results;

  const filters = [
    { memcmp: { offset: ownerOffset, bytes: owner } }
  ] as any[];

  try {
    const programPk = new PublicKey(r.program_id);
    const accounts = await connection.getProgramAccounts(programPk, { filters });
    for (const acc of accounts) {
      const pos: VaultDiscoveredPosition = {
        source: `${r.protocol}:${r.name}`,
        vaultProgramId: r.program_id,
        details: { depositAccount: acc.pubkey.toString() }
      };

      if (typeof meta.position_mint_offset === 'number') {
        const off = meta.position_mint_offset as number;
        if (acc.account.data.length >= off + 32) {
          pos.positionMint = new PublicKey(acc.account.data.slice(off, off + 32)).toString();
        }
      }

      if (typeof meta.lp_mint_offset === 'number') {
        const off = meta.lp_mint_offset as number;
        if (acc.account.data.length >= off + 32) {
          pos.lpMint = new PublicKey(acc.account.data.slice(off, off + 32)).toString();
        }
      }

      results.push(pos);
    }
  } catch {
    // Ignora erros para um resolver
  }

  return results;
}

export async function resolveVaultPositions(connection: Connection, owner: string): Promise<VaultDiscoveredPosition[]> {
  const resolvers = await loadResolvers();
  const all: VaultDiscoveredPosition[] = [];
  for (const r of resolvers) {
    if (r.resolver_kind === 'share_mint') {
      all.push(...await resolveByShareMint(connection, owner, r));
    } else if (r.resolver_kind === 'deposit_account_scan') {
      all.push(...await resolveByDepositScan(connection, owner, r));
    }
  }
  return all;
}



