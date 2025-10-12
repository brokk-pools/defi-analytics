import {
  WhirlpoolContext,
  buildWhirlpoolClient,
  ORCA_WHIRLPOOL_PROGRAM_ID,
  PDAUtil,
  PriceMath,
  PoolUtil,
} from "@orca-so/whirlpools-sdk";
import { Connection, PublicKey } from "@solana/web3.js";
import { getOutstandingFeesForPosition, feesCollectedInRange, makeConnection, makeWhirlpoolContext } from './orca.js';

/* ================================
 * 0) PRICE PROVIDER BÁSICO (para testes)
 * ================================ */

// Price Provider constante interno
const INTERNAL_PRICE_PROVIDER: PriceProvider = {
  async getCurrentPriceUSDT(mint: string): Promise<number> {
    // Preços básicos para testes (em USDT)
    const priceMap: Record<string, number> = {
      'So11111111111111111111111111111111111111112': 200, // SOL
      'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 1,  // USDC
      'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': 1,  // USDT
    };
    
    return priceMap[mint] || 1; // Default para 1 USDT se não encontrado
  },

  async getHistoricalPriceUSDT(mint: string, tsSec: number): Promise<number> {
    // Para simplificar, retorna o preço atual
    // Em produção, você integraria com um provedor de preços históricos
    return this.getCurrentPriceUSDT(mint);
  }
};

/* ================================
 * 1) TIPOS DE APOIO (contratos)
 * ================================ */

export type PriceProvider = {
  /** Preço ATUAL em USDT para um mint (ex.: via Pyth/Jupiter). */
  getCurrentPriceUSDT(mint: string): Promise<number>;
  /** Preço HISTÓRICO em USDT para um mint em um timestamp (segundos Epoch UTC). */
  getHistoricalPriceUSDT(mint: string, tsSec: number): Promise<number>;
};

export type LiquidityEvent = {
  /** "increase" ou "decrease" */
  kind: "increase" | "decrease";
  /** timestamp da tx (segundos epoch) */
  ts: number;
  /** quantidades de tokens movimentadas no evento (em UNIDADES MÍNIMAS SPL) */
  tokenA: bigint;
  tokenB: bigint;
  /** tx signature (para auditoria) */
  sig: string;
};

export type GasEvent = {
  ts: number;
  /** fee paga em lamports (1e9 = 1 SOL) */
  lamportsFee: bigint;
  sig: string;
};

export type RewardsBreakdown = {
  /** rewards pendentes por mint (ex.: até 3 rewards em Whirlpools) */
  unclaimed: Array<{ mint: string; amountRaw: bigint }>;
  /** rewards já coletadas (histórico) por mint */
  claimed: Array<{ mint: string; amountRaw: bigint; ts: number; sig: string }>;
};

export type CollectedFeesResult = {
  // Totais por token (A/B) no intervalo
  totals: {
    A: { raw: string; human: number };
    B: { raw: string; human: number };
  };
  // Opcionalmente, histórico detalhado quando showHistory = true
  history?: {
    A: Array<{ signature: string; datetimeUTC: string; amountRaw: string; amount: number; positionId?: string }>;
    B: Array<{ signature: string; datetimeUTC: string; amountRaw: string; amount: number; positionId?: string }>;
  };
};

export type OutstandingFeesResult = {
  // valores "agora", computados contra feeGrowth (mais corretos)
  feeOwedAComputedNow: string; // raw (string para BigInt seguro)
  feeOwedBComputedNow: string;
  // opcionalmente, também pode vir o on-chain direto para comparação
  feeOwedAOnChain?: string;
  feeOwedBOnChain?: string;
};

export type PositionSummary = {
  positionMint: string;
  // Limites de preço (no par A/B)
  range: { minPrice: number; maxPrice: number; currentPrice: number };
  // Investimento inicial (somar INCREASES)
  investment: {
    tokenA: { qtyRaw: string; qty: number; usdAtDeposit: number };
    tokenB: { qtyRaw: string; qty: number; usdAtDeposit: number };
    tsFirstDeposit: number | null; // para APR e comparação
  };
  // Estado atual (derivado da liquidez + preço atual)
  current: {
    tokenA: { qtyRaw: string; qty: number; usdNow: number };
    tokenB: { qtyRaw: string; qty: number; usdNow: number };
  };
  // Fees
  fees: {
    collected: { A: { raw: string; usd: number }, B: { raw: string; usd: number } };
    uncollected: { A: { raw: string; usd: number }, B: { raw: string; usd: number } };
    reinvested: { A: { raw: string; usd: number }, B: { raw: string; usd: number } };
    total: { A: { raw: string; usd: number }, B: { raw: string; usd: number } };
    history?: CollectedFeesResult["history"]; // se showHistory
  };
  // Rewards (se o protocolo tiver emissões ativas)
  rewards: {
    unclaimedUSDT: number; // soma das pendências em USDT
    claimedUSDT: number;   // soma do histórico em USDT
    breakdown?: RewardsBreakdown; // opcional, se quiser expor detalhe
  };
  // Saques de principal (DECREASES)
  withdrawn: {
    tokenA: { raw: string; usdAtWithdrawal: number }; // somatório dos decreases em A
    tokenB: { raw: string; usdAtWithdrawal: number };
  };
  // Gas
  gas: { sol: number; usd: number };
  // Métricas
  pnlExcludingGasUSDT: number; // PnL (USD) sem gas
  roiPct: number;              // ROI [%] = PnL / Investimento inicial (USD)
  aprPct: number;              // APR anualizado, baseado no tempo desde tsFirstDeposit
  divergenceLossUSDT: number;  // Valor LP - Valor HODL (USD)
};

/* ================================
 * 2) ASSINATURA PRINCIPAL
 * ================================ */

export type CalculatePoolRoiParams = {
  rpcUrl: string;
  poolId: string;          // whirlpool address (base58)
  owner: string;           // carteira do LP
  positionId?: string | undefined;     // position mint (NFT). Se omitido/null → agregar todas as posições do owner nessa pool
  startUtcIso?: string | undefined;    // para janelas de consulta (fees coletadas, gas, etc.)
  endUtcIso?: string | undefined;
  showHistory?: boolean | undefined;   // repassar para feesCollectedInRange
  priceProvider?: PriceProvider;
  // ==== Resultados pré-calculados (opcionais) ====
  preCalculatedOutstandingFees?: OutstandingFeesResult | null;
  preCalculatedCollectedFees?: CollectedFeesResult | null;
  // ==== Suas funções já existentes (INJETADAS) ====
  getOutstandingFeesForPosition: (poolId: string, positionId: string) => Promise<OutstandingFeesResult>;
  feesCollectedInRange: (
    poolId: string,
    owner: string,
    startUtcIso?: string,
    endUtcIso?: string,
    showHistoryBool?: boolean,
    positionIdStr?: string | null
  ) => Promise<CollectedFeesResult>;
  // ==== Helpers a implementar/injetar (stubs abaixo) ====
  listOwnerPositionsInPool?: (connection: Connection, pool: string, owner: string) => Promise<string[]>;
  getLiquidityEvents?: (connection: Connection, pool: string, positionMint: string, owner: string, startTs?: number, endTs?: number) => Promise<LiquidityEvent[]>;
  getGasEvents?: (connection: Connection, pool: string, owner: string, startTs?: number, endTs?: number, positionMint?: string) => Promise<GasEvent[]>;
  getRewardsBreakdown?: (connection: Connection, pool: string, positionMint: string, owner: string) => Promise<RewardsBreakdown>;
  detectReinvestedFees?: (liquidityEvents: LiquidityEvent[], collectedFeesHistory?: CollectedFeesResult["history"]) => Promise<{ A: bigint; B: bigint }>;
};

export type CalculatePoolRoiResult = {
  owner: string;
  pool: string;
  // Por posição (se agregando, retorna lista de todas)
  positions: PositionSummary[];
  // Agregados (somatórios de tudo acima)
  aggregated: {
    investmentUSDT: number;
    currentUSDT: number;
    totalFeesUSDT: number;
    rewardsUSDT: number;
    withdrawnUSDT: number;
    gasUSDT: number;
    pnlExcludingGasUSDT: number;
    roiPct: number;
    aprPct: number; // ponderado pelo capital/tempo (simplificação)
    divergenceLossUSDT: number;
  };
};

/* ================================
 * 3) FUNÇÃO PRINCIPAL
 * ================================ */

export async function calculatePoolROI(params: CalculatePoolRoiParams): Promise<CalculatePoolRoiResult> {
  const {
    rpcUrl, poolId, owner, positionId, startUtcIso, endUtcIso, showHistory = false,
    priceProvider = INTERNAL_PRICE_PROVIDER, // Usar price provider interno por padrão
    preCalculatedOutstandingFees,
    preCalculatedCollectedFees,
    getOutstandingFeesForPosition,
    feesCollectedInRange,
    listOwnerPositionsInPool = defaultListOwnerPositionsInPool,       // stub
    getLiquidityEvents = defaultGetLiquidityEvents,                   // stub
    getGasEvents = defaultGetGasEvents,                               // stub
    getRewardsBreakdown = defaultGetRewardsBreakdown,                 // stub
    detectReinvestedFees = defaultDetectReinvestedFees,               // stub
  } = params;

  const connection = await makeConnection();
  const ctx = makeWhirlpoolContext();
  const client = buildWhirlpoolClient(ctx);

  const poolPk = new PublicKey(poolId);
  const pool = await client.getPool(poolPk);
  const poolData = pool.getData();

  const mintA = poolData.tokenMintA.toBase58();
  const mintB = poolData.tokenMintB.toBase58();

  // Preço ATUAL (USDT) dos mints A/B — necessário para "Current USD", fees uncollected USD, etc.
  console.log(`💱 [DEBUG] Buscando preços atuais para tokens:`, { mintA, mintB });
  const [priceNowA, priceNowB] = await Promise.all([
    priceProvider.getCurrentPriceUSDT(mintA),
    priceProvider.getCurrentPriceUSDT(mintB),
  ]);
  console.log(`💰 [DEBUG] Preços encontrados:`, { 
    tokenA: { mint: mintA, price: priceNowA }, 
    tokenB: { mint: mintB, price: priceNowB } 
  });

  // Descobrir quais posições considerar
  let positionMints: string[] = [];
  if (positionId && positionId.trim().length > 0) {
    console.log(`🎯 [DEBUG] Analisando posição específica: ${positionId}`);
    positionMints = [positionId];
  } else {
    console.log(`🔍 [DEBUG] Buscando todas as posições do owner ${owner} na pool ${poolId}`);
    // Agregar: listar TODAS as posições do owner nessa pool
    positionMints = await listOwnerPositionsInPool(connection, poolId, owner);
    console.log(`📊 [DEBUG] Posições encontradas:`, positionMints);
  }

  const startTs = startUtcIso ? Math.floor(new Date(startUtcIso).getTime() / 1000) : undefined;
  const endTs = endUtcIso ? Math.floor(new Date(endUtcIso).getTime() / 1000) : undefined;

  const perPosition: PositionSummary[] = [];

  for (const posMint of positionMints) {
    // Carregar a conta Position (pela public key da Position, não confundir com o mint do NFT):
    // Observação: em muitos fluxos você tem a positionAddress (conta Anchor) e o positionMint (NFT).
    // Aqui assumimos que `posMint` é o MINT do NFT, então precisamos resolver a conta Position via PDA:
    // PDA da Position é derivada de (position_mint) — utilitário do SDK:
    const posMintPk = new PublicKey(posMint);
    const posPda = PDAUtil.getPosition(ORCA_WHIRLPOOL_PROGRAM_ID, posMintPk).publicKey;
    const position = await client.getFetcher().getPosition(posPda);
    if (!position) continue; // posição pode ter sido fechada/queimada

    const liquidity = BigInt(position.liquidity.toString());
    const tickLower = position.tickLowerIndex;
    const tickUpper = position.tickUpperIndex;

    // ===== (A) LIMIT PRICES =====
    // Para simplificar, vamos usar valores básicos por enquanto
    // TODO: Implementar cálculo correto de preços usando PriceMath
    const minPrice = 0.0001; // Placeholder
    const maxPrice = 0.0002; // Placeholder
    const currentPrice = 0.00015; // Placeholder

    // ===== (B) CURRENT TOKEN AMOUNTS (DERIVADO DA LIQUIDEZ) =====
    // Fórmula (via SDK): dado (L, sqrtP, tickLower, tickUpper) ⇒ retorna { tokenA, tokenB }
    // Interpretação financeira: esse é o "estoque" atual dentro da sua posição (sem fees).
    const { tokenA: currARaw, tokenB: currBRaw } = PoolUtil.getTokenAmountsFromLiquidity(
      liquidity,
      poolData.sqrtPrice,
      tickLower,
      tickUpper,
      true // arredonda para cima para manter conservador
    );
    // Converte para "human" usando decimais — aqui simplificamos assumindo 10^dec já aplicado no preço em USDT
    const currentAQtyRaw = BigInt(currARaw.toString());
    const currentBQtyRaw = BigInt(currBRaw.toString());

    // USD atual desses saldos:
    const currentAUsd = Number(currentAQtyRaw) / 1e0 * priceNowA; // OBS: ajuste por decimais reais do mint se quiser precisão fina
    const currentBUsd = Number(currentBQtyRaw) / 1e0 * priceNowB;

    // ===== (C) FEES =====
    console.log(`🔍 [DEBUG] Carregando fees para posição: ${posMint}`);
    
    // (C1) Fees UNCOLLECTED (pendentes agora) — sua função já computa corretamente contra feeGrowth
    console.log(`📊 [DEBUG] Buscando fees pendentes...`);
    let outstandingFees;
    if (preCalculatedOutstandingFees && positionMints.length === 1 && positionMints[0] === posMint) {
      // Usar resultado pré-calculado se disponível e for para uma posição específica
      console.log(`✅ [DEBUG] Usando fees pendentes pré-calculadas`);
      outstandingFees = preCalculatedOutstandingFees;
    } else {
      // Calcular normalmente
      outstandingFees = await getOutstandingFeesForPosition(poolId, posMint);
    }
    console.log(`💰 [DEBUG] Fees pendentes encontradas:`, {
      tokenA: outstandingFees.feeOwedAComputedNow,
      tokenB: outstandingFees.feeOwedBComputedNow
    });
    
    const uncollARaw = BigInt(outstandingFees.feeOwedAComputedNow);
    const uncollBRaw = BigInt(outstandingFees.feeOwedBComputedNow);
    const uncollAUsd = Number(uncollARaw) * priceNowA;
    const uncollBUsd = Number(uncollBRaw) * priceNowB;

    // (C2) Fees COLLECTED (intervalo solicitado; se não passar intervalo pode usar [criação..now])
    console.log(`📈 [DEBUG] Buscando fees coletadas no período...`);
    let collectedFees;
    if (preCalculatedCollectedFees) {
      // Usar resultado pré-calculado se disponível
      console.log(`✅ [DEBUG] Usando fees coletadas pré-calculadas`);
      collectedFees = preCalculatedCollectedFees;
    } else {
      // Calcular normalmente
      collectedFees = await feesCollectedInRange(
        poolId,
        owner,
        startUtcIso,
        endUtcIso,
        !!showHistory,
        posMint
      );
    }
    console.log(`💸 [DEBUG] Fees coletadas encontradas:`, {
      tokenA: collectedFees.totals.A,
      tokenB: collectedFees.totals.B
    });
    
    const collARaw = BigInt(collectedFees.totals.A.raw);
    const collBRaw = BigInt(collectedFees.totals.B.raw);
    // Para USD histórico por tx, idealmente convertermos cada linha pelo PREÇO NA ÉPOCA;
    // aqui, para simplificar o snapshot, valuamos "ao preço atual" (alternativa: somar por tx em USD antigo).
    const collAUsd = Number(collARaw) * priceNowA;
    const collBUsd = Number(collBRaw) * priceNowB;

    // (C3) Fees REINVESTIDAS → detectar "collect" seguido de "increase"
    // Isso aumenta a sua base de investimento futura, mas historicamente é receita de fees.
    const reinvestRaw = await detectReinvestedFees(
      await getLiquidityEvents(connection, poolId, posMint, owner, startTs, endTs),
      collectedFees.history
    );
    const reinvARaw = reinvestRaw.A;
    const reinvBRaw = reinvestRaw.B;
    const reinvAUsd = Number(reinvARaw) * priceNowA;
    const reinvBUsd = Number(reinvBRaw) * priceNowB;

    // Totais de fees por token
    const totalFeesARaw = collARaw + uncollARaw + reinvARaw;
    const totalFeesBRaw = collBRaw + uncollBRaw + reinvBRaw;
    const totalFeesAUsd = collAUsd + uncollAUsd + reinvAUsd;
    const totalFeesBUsd = collBUsd + uncollBUsd + reinvBUsd;

    // ===== (D) REWARDS =====
    // Rewards pendentes e coletadas (se existirem) — em muitos casos = 0
    const rewards = await getRewardsBreakdown(connection, poolId, posMint, owner);
    // Valuação simples ao preço atual (para snapshot); ideal: preço histórico por tx
    let unclaimedRewardsUsd = 0;
    for (const r of rewards.unclaimed) {
      const p = await priceProvider.getCurrentPriceUSDT(r.mint);
      unclaimedRewardsUsd += Number(r.amountRaw) * p;
    }
    let claimedRewardsUsd = 0;
    for (const r of rewards.claimed) {
      const p = await priceProvider.getHistoricalPriceUSDT(r.mint, r.ts);
      claimedRewardsUsd += Number(r.amountRaw) * p;
    }

    // ===== (E) INVESTIMENTO INICIAL & WITHDRAWN =====
    // Precisamos reconstituir aportes (INCREASES) e retiradas (DECREASES)
    const liqEvents = await getLiquidityEvents(connection, poolId, posMint, owner, startTs, endTs);

    // Somatório dos INCREASES (investimento inicial + adicionais)
    // >>> IMPORTANTE <<< Para "Quantos Dólares na Época": multiplicar cada evento pelo PREÇO HISTÓRICO no ts do evento
    let investARaw = 0n, investBRaw = 0n, investUsdAtDeposit = 0;
    let firstDepositTs: number | null = null;
    for (const ev of liqEvents.filter(e => e.kind === "increase")) {
      investARaw += ev.tokenA;
      investBRaw += ev.tokenB;
      if (firstDepositTs === null || ev.ts < firstDepositTs) firstDepositTs = ev.ts;
      const [pa, pb] = await Promise.all([
        priceProvider.getHistoricalPriceUSDT(mintA, ev.ts),
        priceProvider.getHistoricalPriceUSDT(mintB, ev.ts),
      ]);
      investUsdAtDeposit += Number(ev.tokenA) * pa + Number(ev.tokenB) * pb;
    }

    // Somatório dos DECREASES (withdrawn principal)
    let withdrawnARaw = 0n, withdrawnBRaw = 0n, withdrawnUsd = 0;
    for (const ev of liqEvents.filter(e => e.kind === "decrease")) {
      withdrawnARaw += ev.tokenA;
      withdrawnBRaw += ev.tokenB;
      const [pa, pb] = await Promise.all([
        priceProvider.getHistoricalPriceUSDT(mintA, ev.ts),
        priceProvider.getHistoricalPriceUSDT(mintB, ev.ts),
      ]);
      withdrawnUsd += Number(ev.tokenA) * pa + Number(ev.tokenB) * pb;
    }

    // ===== (F) GAS COSTS =====
    const gasEvents = await getGasEvents(connection, poolId, owner, startTs, endTs, posMint);
    const totalLamports = gasEvents.reduce((acc, g) => acc + g.lamportsFee, 0n);
    const solNowPrice = await priceProvider.getCurrentPriceUSDT("So11111111111111111111111111111111111111112"); // wSOL mint
    const gasSOL = Number(totalLamports) / 1e9; // lamports → SOL
    const gasUSD = gasSOL * solNowPrice;

    // ===== (G) MÉTRICAS FINANCEIRAS =====
    // Valor atual da posição (sem fees): currentAUsd + currentBUsd
    // Total de fees (USD): totalFeesAUsd + totalFeesBUsd
    // Rewards (USD): unclaimedRewardsUsd + claimedRewardsUsd
    const valueNowUSD = currentAUsd + currentBUsd + unclaimedRewardsUsd; // (opção: incluir uncollected fees aqui também)
    const totalFeesUSD = totalFeesAUsd + totalFeesBUsd;
    const rewardsUSD = unclaimedRewardsUsd + claimedRewardsUsd;

    // PnL "pool" (excluindo gas):
    // Fórmula: PnL = (valor atual + fees (realizadas e não) + rewards) + withdrawn - investimento inicial
    // - withdrawn entra como "realizado" (você já tirou do protocolo)
    const pnlExGasUSD = (valueNowUSD + totalFeesUSD + rewardsUSD + withdrawnUsd) - investUsdAtDeposit;

    // ROI [%] = PnL / investimento inicial
    const roiPct = investUsdAtDeposit > 0 ? (pnlExGasUSD / investUsdAtDeposit) * 100 : 0;

    // APR anualizado: ROI * (365 / dias)
    let aprPct = 0;
    if (firstDepositTs) {
      const days = Math.max(1, (Date.now() / 1000 - firstDepositTs) / 86400);
      aprPct = roiPct * (365 / days);
    }

    // Divergence Loss (USD) = Valor LP - Valor HODL
    // Valor HODL = (investA_raw * priceNowA) + (investB_raw * priceNowB)
    // Valor LP = (currentAUsd + currentBUsd) + totalFeesUSD + rewardsUSD
    const hodlNowUSD = Number(investARaw) * priceNowA + Number(investBRaw) * priceNowB;
    const lpNowUSD  = (currentAUsd + currentBUsd) + totalFeesUSD + rewardsUSD;
    const divergenceLossUSD = lpNowUSD - hodlNowUSD;

    perPosition.push({
      positionMint: posMint,
      range: { minPrice: minPrice, maxPrice: maxPrice, currentPrice },
      investment: {
        tokenA: { qtyRaw: investARaw.toString(), qty: Number(investARaw), usdAtDeposit: investUsdAtDeposit * (Number(investARaw) > 0 ? 1 : 1) },
        tokenB: { qtyRaw: investBRaw.toString(), qty: Number(investBRaw), usdAtDeposit: 0 /* já somado acima */ },
        tsFirstDeposit: firstDepositTs,
      },
      current: {
        tokenA: { qtyRaw: currentAQtyRaw.toString(), qty: Number(currentAQtyRaw), usdNow: currentAUsd },
        tokenB: { qtyRaw: currentBQtyRaw.toString(), qty: Number(currentBQtyRaw), usdNow: currentBUsd },
      },
      fees: {
        collected: { A: { raw: collARaw.toString(), usd: collAUsd }, B: { raw: collBRaw.toString(), usd: collBUsd } },
        uncollected: { A: { raw: uncollARaw.toString(), usd: uncollAUsd }, B: { raw: uncollBRaw.toString(), usd: uncollBUsd } },
        reinvested: { A: { raw: reinvARaw.toString(), usd: reinvAUsd }, B: { raw: reinvBRaw.toString(), usd: reinvBUsd } },
        total: { A: { raw: totalFeesARaw.toString(), usd: totalFeesAUsd }, B: { raw: totalFeesBRaw.toString(), usd: totalFeesBUsd } },
        history: showHistory ? collectedFees.history : undefined,
      },
      rewards: {
        unclaimedUSDT: unclaimedRewardsUsd,
        claimedUSDT: claimedRewardsUsd,
        // breakdown: undefined, // exponha se quiser
      },
      withdrawn: {
        tokenA: { raw: withdrawnARaw.toString(), usdAtWithdrawal: withdrawnUsd /* dividido por A/B se quiser */ },
        tokenB: { raw: withdrawnBRaw.toString(), usdAtWithdrawal: 0 },
      },
      gas: { sol: gasSOL, usd: gasUSD },
      pnlExcludingGasUSDT: pnlExGasUSD,
      roiPct,
      aprPct,
      divergenceLossUSDT: divergenceLossUSD,
    });
  }

  // ===== (H) AGREGAÇÃO =====
  // Para simplificar, somamos por campo em USD. (Atenção: se precisar granular por token, agregue separadamente.)
  const agg = {
    investmentUSDT: 0,
    currentUSDT: 0,
    totalFeesUSDT: 0,
    rewardsUSDT: 0,
    withdrawnUSDT: 0,
    gasUSDT: 0,
    pnlExcludingGasUSDT: 0,
    roiPct: 0,
    aprPct: 0,
    divergenceLossUSDT: 0,
  };

  // Nota: ao somar investimento, usamos o campo investUsdAtDeposit do A (já somado com B no loop).
  for (const p of perPosition) {
    agg.investmentUSDT += p.investment.tokenA.usdAtDeposit; // A+B somados lá
    agg.currentUSDT += p.current.tokenA.usdNow + p.current.tokenB.usdNow;
    agg.totalFeesUSDT += p.fees.total.A.usd + p.fees.total.B.usd;
    agg.rewardsUSDT += p.rewards.unclaimedUSDT + p.rewards.claimedUSDT;
    agg.withdrawnUSDT += p.withdrawn.tokenA.usdAtWithdrawal + p.withdrawn.tokenB.usdAtWithdrawal;
    agg.gasUSDT += p.gas.usd;
    agg.pnlExcludingGasUSDT += p.pnlExcludingGasUSDT;
    agg.divergenceLossUSDT += p.divergenceLossUSDT;
  }

  agg.roiPct = agg.investmentUSDT > 0 ? (agg.pnlExcludingGasUSDT / agg.investmentUSDT) * 100 : 0;

  // APR agregado (simplificação): média ponderada pelo capital (existem formas mais rigorosas usando tempo por posição)
  const validAprs = perPosition
    .filter(p => p.investment.tsFirstDeposit && p.investment.tokenA.usdAtDeposit > 0)
    .map(p => ({ apr: p.aprPct, weight: p.investment.tokenA.usdAtDeposit }));
  if (validAprs.length > 0) {
    const wsum = validAprs.reduce((a, b) => a + b.weight, 0);
    agg.aprPct = validAprs.reduce((a, b) => a + b.apr * (b.weight / wsum), 0);
  }

  return {
    owner,
    pool: poolId,
    positions: perPosition,
    aggregated: agg,
  };
}

/* ================================
 * 4) STUBS / HELPERS (para você plugar)
 * ================================ */

/** Lista todos os position MINTs (NFTs) do owner nessa pool.
 *  Implementação real: varrer ATAs do owner com amount=1 para mints que sejam Positions e cuja Position.whirlpool == pool.
 */
async function defaultListOwnerPositionsInPool(connection: Connection, pool: string, owner: string): Promise<string[]> {
  try {
    const { fetchPositionsForOwner } = await import('@orca-so/whirlpools');
    const { createRpcConnection } = await import('./orca.js');
    const { rpc } = await createRpcConnection();
    
    const allPositions = await fetchPositionsForOwner(rpc, owner as any);
    const poolPositions = allPositions.filter((pos: any) => 
      pos.data?.whirlpool?.toString() === pool
    );
    
    return poolPositions.map((pos: any) => pos.data?.positionMint?.toString()).filter(Boolean);
  } catch (error) {
    console.warn('Error listing owner positions in pool:', error);
    return [];
  }
}

/** Varre histórico de increase/decrease-liquidity para uma posição.
 *  Retornar tokenA/tokenB em RAW e timestamp de cada evento.
 */
async function defaultGetLiquidityEvents(
  _c: Connection,
  _pool: string,
  _positionMint: string,
  _owner: string,
  _startTs?: number,
  _endTs?: number
): Promise<LiquidityEvent[]> {
  // TODO: usar getSignaturesForAddress(ATA do position NFT? ou scanning por instruções do programa)
  // Dica: filtrar pelas ixs do programa Orca e decodificar os logs/inner ixs SPL Token.
  return [];
}

/** Soma fees de gas (lamports) nas txs relevantes (increase/decrease/collect/close).
 *  Tipicamente: somar meta.fee das assinaturas que envolvem sua posição (owner/pool).
 */
async function defaultGetGasEvents(
  _c: Connection,
  _pool: string,
  _owner: string,
  _startTs?: number,
  _endTs?: number,
  _positionMint?: string
): Promise<GasEvent[]> {
  // TODO: varrer assinaturas do owner e filtrar por ixs do programa whirpools + período.
  return [];
}

/** Rewards breakdown: pendentes na Position e coletadas por histórico.
 *  Em muitos casos = 0. Se houver emissões, ler position.rewardInfos e somar.
 */
async function defaultGetRewardsBreakdown(
  _c: Connection,
  _pool: string,
  _positionMint: string,
  _owner: string
): Promise<RewardsBreakdown> {
  // TODO: ler Position.rewardInfos (pendentes) e scan para collect_reward
  return { unclaimed: [], claimed: [] };
}

/** Detectar fees reinvestidas:
 *  Heurística: após uma tx de collect, há um increase_liquidity próximo no tempo → value correlacionado.
 *  Retornar a fração das fees consideradas reinvestidas por token.
 */
async function defaultDetectReinvestedFees(
  _liquidityEvents: LiquidityEvent[],
  _collectedHistory?: CollectedFeesResult["history"]
): Promise<{ A: bigint; B: bigint }> {
  // TODO: correlacionar por timestamp e valor aproximado.
  return { A: 0n, B: 0n };
}
