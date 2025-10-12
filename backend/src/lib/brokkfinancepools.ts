import {
  WhirlpoolContext,
  buildWhirlpoolClient,
  ORCA_WHIRLPOOL_PROGRAM_ID,
  PDAUtil,
  PriceMath,
  PoolUtil,
} from "@orca-so/whirlpools-sdk";
import { Connection, PublicKey } from "@solana/web3.js";
import { makeConnection, makeWhirlpoolContext } from './orca.js';

/* ================================
 * 0) ORACLE PRICE PROVIDER
 * ================================ */

// Price Provider usando Helius API
const HELIUS_PRICE_PROVIDER = {
  async getCurrentPrice(mint: string, baseCurrency: string = 'USDT'): Promise<number> {
    try {
      // Se for a própria moeda base, retorna 1
      if (mint === baseCurrency) {
        return 1;
      }

      // Usar timestamp atual para preço atual
      const currentTimestamp = Math.floor(Date.now() / 1000);
      return await this.getHistoricalPrice(mint, currentTimestamp, baseCurrency);
    } catch (error) {
      console.error(`❌ Erro ao buscar preço atual para ${mint}:`, error);
      return 1; // Default em caso de erro
    }
  },

  // Função específica para buscar preços por par com data/hora
  async getPriceByPair(tokenA: string, tokenB: string, timestamp?: number): Promise<{ priceA: number; priceB: number; pairPrice: number }> {
    try {
      const ts = timestamp || Math.floor(Date.now() / 1000);
      
      // Buscar preços individuais
      const [priceA, priceB] = await Promise.all([
        this.getHistoricalPrice(tokenA, ts, 'USD'),
        this.getHistoricalPrice(tokenB, ts, 'USD')
      ]);

      // Calcular preço do par (A/B)
      const pairPrice = priceB > 0 ? priceA / priceB : 0;

      return {
        priceA,
        priceB,
        pairPrice
      };
    } catch (error) {
      console.error(`❌ Erro ao buscar preço do par ${tokenA}/${tokenB}:`, error);
      return { priceA: 1, priceB: 1, pairPrice: 1 };
    }
  },
  
  async getHistoricalPrice(mint: string, tsSec: number, baseCurrency: string = 'USDT'): Promise<number> {
    try {
      // Se for a própria moeda base, retorna 1
      if (mint === baseCurrency) {
        return 1;
      }

      // Obter API key da Helius do .env
      const heliusApiKey = process.env.HELIUS_API_KEY;
      if (!heliusApiKey) {
        console.warn('⚠️ HELIUS_API_KEY não configurada, usando preço padrão');
        return 1;
      }

      // Converter timestamp para formato ISO
      const date = new Date(tsSec * 1000).toISOString();
      
      // Chamar API da Helius para preço histórico
      const response = await fetch(`https://api.helius.xyz/v0/token-metadata?api-key=${heliusApiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mintAccounts: [mint],
          includeOffChain: true,
          disableCache: false
        })
      });

      if (!response.ok) {
        throw new Error(`Helius API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data && data.length > 0 && data[0].offChainMetadata) {
        const tokenData = data[0];
        
        // Tentar obter preço do Pyth (se disponível)
        if (tokenData.offChainMetadata.pyth && tokenData.offChainMetadata.pyth.price) {
          const pythPrice = tokenData.offChainMetadata.pyth.price;
          console.log(`✅ Preço Pyth encontrado para ${mint}: ${pythPrice}`);
          return pythPrice;
        }
        
        // Tentar obter preço do Jupiter (se disponível)
        if (tokenData.offChainMetadata.jupiter && tokenData.offChainMetadata.jupiter.price) {
          const jupiterPrice = tokenData.offChainMetadata.jupiter.price;
          console.log(`✅ Preço Jupiter encontrado para ${mint}: ${jupiterPrice}`);
          return jupiterPrice;
        }
      }

      // Fallback: usar API de preços da Helius
      const priceResponse = await fetch(`https://api.helius.xyz/v0/token-prices?api-key=${heliusApiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mints: [mint]
        })
      });

      if (priceResponse.ok) {
        const priceData = await priceResponse.json();
        if (priceData && priceData.length > 0 && priceData[0].price) {
          const price = priceData[0].price;
          console.log(`✅ Preço Helius encontrado para ${mint}: ${price}`);
          return price;
        }
      }

      console.warn(`⚠️ Preço não encontrado para ${mint} na Helius`);
      return 1; // Default
    } catch (error) {
      console.error(`❌ Erro ao buscar preço histórico para ${mint}:`, error);
      return 1; // Default em caso de erro
    }
  }
};

// Função utilitária para buscar preços de um par específico
export async function getPairPrice(tokenA: string, tokenB: string, timestamp?: number): Promise<{ priceA: number; priceB: number; pairPrice: number }> {
  return await HELIUS_PRICE_PROVIDER.getPriceByPair(tokenA, tokenB, timestamp);
}

// Função utilitária para buscar preço de um token específico
export async function getTokenPrice(mint: string, baseCurrency: string = 'USD', timestamp?: number): Promise<number> {
  const ts = timestamp || Math.floor(Date.now() / 1000);
  return await HELIUS_PRICE_PROVIDER.getHistoricalPrice(mint, ts, baseCurrency);
}

// Função para formatar resposta do brokk-analytics
export function formatBrokkAnalyticsResponse(roiData: any, parameters: any): any {
  return {
    // Metadados da resposta
    success: true,
    timestamp: new Date().toISOString(),
    method: 'calculatePoolROI',
    version: '1.6.0',
    
    // Parâmetros da requisição
    parameters: {
      poolId: parameters.poolId,
      owner: parameters.owner,
      positionId: parameters.positionId || null,
      startUtc: parameters.startUtc || null,
      endUtc: parameters.endUtc || null,
      showHistory: parameters.showHistory || false,
      baseCurrency: parameters.baseCurrency || 'USDT'
    },
    
    // Resumo executivo
    summary: {
      totalPositions: roiData.positions?.length || 0,
      totalInvestedUSD: roiData.aggregated?.totalInvestedUSD || 0,
      totalCurrentValueUSD: roiData.aggregated?.totalCurrentValueUSD || 0,
      totalFeesCollectedUSD: roiData.aggregated?.totalFeesCollectedUSD || 0,
      totalFeesUncollectedUSD: roiData.aggregated?.totalFeesUncollectedUSD || 0,
      totalRewardsUSD: roiData.aggregated?.totalRewardsUSD || 0,
      totalGasCostsUSD: roiData.aggregated?.totalGasCostsUSD || 0,
      netPnLUSD: roiData.aggregated?.netPnLUSD || 0,
      totalROI: roiData.aggregated?.totalROI || 0,
      totalAPR: roiData.aggregated?.totalAPR || 0,
      impermanentLoss: roiData.aggregated?.impermanentLoss || 0
    },
    
    // Dados detalhados por posição
    positions: roiData.positions?.map((pos: any) => ({
      positionMint: pos.positionMint,
      poolId: pos.poolId,
      tokenA: pos.tokenA,
      tokenB: pos.tokenB,
      currentTick: pos.currentTick,
      tickLowerIndex: pos.tickLowerIndex,
      tickUpperIndex: pos.tickUpperIndex,
      isInRange: pos.isInRange,
      status: pos.status,
      
      // Valores financeiros
      financials: {
        investedUSD: pos.investedUSD || 0,
        currentValueUSD: pos.currentValueUSD || 0,
        feesCollectedUSD: pos.feesCollectedUSD || 0,
        feesUncollectedUSD: pos.feesUncollectedUSD || 0,
        rewardsUSD: pos.rewardsUSD || 0,
        gasCostsUSD: pos.gasCostsUSD || 0,
        netPnLUSD: pos.netPnLUSD || 0,
        roi: pos.roi || 0,
        apr: pos.apr || 0,
        impermanentLoss: pos.impermanentLoss || 0
      },
      
      // Dados de liquidez
      liquidity: {
        currentLiquidity: pos.currentLiquidity || '0',
        tokenAAmount: pos.tokenAAmount || '0',
        tokenBAmount: pos.tokenBAmount || '0'
      },
      
      // Timestamps
      timestamps: {
        createdAt: pos.createdAt || null,
        lastUpdated: pos.lastUpdated || new Date().toISOString()
      }
    })) || [],
    
    // Estatísticas agregadas
    aggregated: roiData.aggregated ? {
      totalPositions: roiData.aggregated.totalPositions || 0,
      totalInvestedUSD: roiData.aggregated.totalInvestedUSD || 0,
      totalCurrentValueUSD: roiData.aggregated.totalCurrentValueUSD || 0,
      totalFeesCollectedUSD: roiData.aggregated.totalFeesCollectedUSD || 0,
      totalFeesUncollectedUSD: roiData.aggregated.totalFeesUncollectedUSD || 0,
      totalRewardsUSD: roiData.aggregated.totalRewardsUSD || 0,
      totalGasCostsUSD: roiData.aggregated.totalGasCostsUSD || 0,
      netPnLUSD: roiData.aggregated.netPnLUSD || 0,
      totalROI: roiData.aggregated.totalROI || 0,
      totalAPR: roiData.aggregated.totalAPR || 0,
      impermanentLoss: roiData.aggregated.impermanentLoss || 0,
      
      // Métricas adicionais
      averageROI: roiData.aggregated.averageROI || 0,
      bestPositionROI: roiData.aggregated.bestPositionROI || 0,
      worstPositionROI: roiData.aggregated.worstPositionROI || 0,
      activePositions: roiData.aggregated.activePositions || 0,
      outOfRangePositions: roiData.aggregated.outOfRangePositions || 0
    } : null,
    
    // Dados da pool
    pool: roiData.pool ? {
      address: roiData.pool.address,
      tokenA: roiData.pool.tokenA,
      tokenB: roiData.pool.tokenB,
      feeRate: roiData.pool.feeRate,
      tickSpacing: roiData.pool.tickSpacing,
      currentTick: roiData.pool.currentTick,
      sqrtPrice: roiData.pool.sqrtPrice
    } : null,
    
    // Metadados de processamento
    processing: {
      calculationTime: roiData.processing?.calculationTime || null,
      dataSource: 'Helius API + Orca SDK',
      priceProvider: 'Helius (Pyth/Jupiter)',
      baseCurrency: parameters.baseCurrency || 'USDT'
    }
  };
}

/* ================================
 * 1) TIPOS DE APOIO (contratos)
 * ================================ */

export type PriceProvider = {
  /** Preço ATUAL para um mint em uma moeda base específica (ex.: via Pyth/Jupiter/Helius). */
  getCurrentPrice(mint: string, baseCurrency?: string): Promise<number>;
  /** Preço HISTÓRICO para um mint em uma moeda base específica em um timestamp (segundos Epoch UTC). */
  getHistoricalPrice(mint: string, tsSec: number, baseCurrency?: string): Promise<number>;
  /** Preços por par com data/hora específica (opcional) */
  getPriceByPair?(tokenA: string, tokenB: string, timestamp?: number): Promise<{ priceA: number; priceB: number; pairPrice: number }>;
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
  poolId: string;          // whirlpool address (base58)
  owner: string;           // carteira do LP
  positionId?: string | undefined;     // position mint (NFT). Se omitido/null → agregar todas as posições do owner nessa pool
  startUtcIso?: string | undefined;    // para janelas de consulta (fees coletadas, gas, etc.)
  endUtcIso?: string | undefined;
  showHistory?: boolean | undefined;   // repassar para feesCollectedInRange
  baseCurrency?: string;   // moeda base para preços (ex: 'USDT', 'USDC', 'USD') - padrão: 'USDT'
  priceProvider?: PriceProvider;
  // ==== Resultados pré-calculados (opcionais) ====
  preCalculatedOutstandingFees?: OutstandingFeesResult | null;
  preCalculatedCollectedFees?: CollectedFeesResult | null;
  // ==== Resultados pré-calculados (obrigatórios) ====
  // As funções não são mais necessárias, apenas os resultados
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
    poolId, owner, positionId, startUtcIso, endUtcIso, showHistory = false,
    baseCurrency = 'USDT', // Moeda base padrão
    priceProvider = HELIUS_PRICE_PROVIDER, // Usar Helius por padrão
    preCalculatedOutstandingFees,
    preCalculatedCollectedFees,
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
    priceProvider.getCurrentPrice(mintA, baseCurrency),
    priceProvider.getCurrentPrice(mintB, baseCurrency),
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
    // Usar resultado pré-calculado (obrigatório)
    if (!preCalculatedOutstandingFees) {
      throw new Error(`Outstanding fees not provided for position ${posMint}`);
    }
    console.log(`✅ [DEBUG] Usando fees pendentes pré-calculadas`);
    outstandingFees = preCalculatedOutstandingFees;
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
    // Usar resultado pré-calculado (obrigatório)
    if (!preCalculatedCollectedFees) {
      throw new Error(`Collected fees not provided for position ${posMint}`);
    }
    console.log(`✅ [DEBUG] Usando fees coletadas pré-calculadas`);
    collectedFees = preCalculatedCollectedFees;
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
      const p = await priceProvider.getCurrentPrice(r.mint, baseCurrency);
      unclaimedRewardsUsd += Number(r.amountRaw) * p;
    }
    let claimedRewardsUsd = 0;
    for (const r of rewards.claimed) {
      const p = await priceProvider.getHistoricalPrice(r.mint, r.ts, baseCurrency);
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
        priceProvider.getHistoricalPrice(mintA, ev.ts, baseCurrency),
        priceProvider.getHistoricalPrice(mintB, ev.ts, baseCurrency),
      ]);
      investUsdAtDeposit += Number(ev.tokenA) * pa + Number(ev.tokenB) * pb;
    }

    // Somatório dos DECREASES (withdrawn principal)
    let withdrawnARaw = 0n, withdrawnBRaw = 0n, withdrawnUsd = 0;
    for (const ev of liqEvents.filter(e => e.kind === "decrease")) {
      withdrawnARaw += ev.tokenA;
      withdrawnBRaw += ev.tokenB;
      const [pa, pb] = await Promise.all([
        priceProvider.getHistoricalPrice(mintA, ev.ts, baseCurrency),
        priceProvider.getHistoricalPrice(mintB, ev.ts, baseCurrency),
      ]);
      withdrawnUsd += Number(ev.tokenA) * pa + Number(ev.tokenB) * pb;
    }

    // ===== (F) GAS COSTS =====
    const gasEvents = await getGasEvents(connection, poolId, owner, startTs, endTs, posMint);
    const totalLamports = gasEvents.reduce((acc, g) => acc + g.lamportsFee, 0n);
    const solNowPrice = await priceProvider.getCurrentPrice("So11111111111111111111111111111111111111112", baseCurrency); // wSOL mint
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
