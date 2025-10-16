import {
  WhirlpoolContext,
  buildWhirlpoolClient,
  ORCA_WHIRLPOOL_PROGRAM_ID,
  PDAUtil,
  PriceMath,
  PoolUtil,
} from "@orca-so/whirlpools-sdk";
import { Connection, PublicKey } from "@solana/web3.js";
import { makeConnection, makeWhirlpoolContext, GetInnerTransactionsFromPosition, getOutstandingFeesForPositionById, GetGasInPosition, getQtyNowFromPosition } from './orca.js';

/* ================================
 * 0) ORACLE PRICE PROVIDER
 * ================================ */


// Removido - agora está centralizado no CalculationPrice.ts

// Função utilitária para buscar preço de um token em USD via CoinGecko
export async function getTokenPriceUSD(mint: string, timestamp?: number): Promise<number> {
  const { getPriceUSD } = await import('./CalculationPrice.js');
  return await getPriceUSD(mint, timestamp);
}

// Função utilitária para buscar preço de um token específico em relação a outro
export async function getTokenPrice(tokenA: string, tokenB: string, timestamp?: number): Promise<number> {
  // Se tokenA e tokenB são iguais, retorna 1
  if (tokenA === tokenB) {
    return 1;
  }
  
  // Buscar preços de ambos os tokens em USD via CoinGecko
  const [priceA, priceB] = await Promise.all([
    getTokenPriceUSD(tokenA, timestamp),
    getTokenPriceUSD(tokenB, timestamp)
  ]);
  
  // Se algum preço não foi encontrado, retorna 0
  if (priceA === 0 || priceB === 0) {
    console.warn(`⚠️ Preço não encontrado: tokenA=${tokenA} (${priceA}), tokenB=${tokenB} (${priceB})`);
    return 0;
  }
  // Retorna o preço de tokenA em termos de tokenB
  return priceA / priceB;
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



// Nova função para calcular analytics usando GetInnerTransactionsFromPosition
export async function calculateAnalytics(
  poolId: string,
  owner: string,
  positionId?: string,
  startUtcIso?: string,
  endUtcIso?: string
): Promise<any> {
  try {
    const connection = await makeConnection();
    const ctx = makeWhirlpoolContext();
    const client = buildWhirlpoolClient(ctx);

    const poolPk = new PublicKey(poolId);
    const pool = await client.getPool(poolPk);
    const poolData = pool.getData();

    const mintA = poolData.tokenMintA.toBase58();
    const mintB = poolData.tokenMintB.toBase58();

    // Buscar decimais dos tokens
    const [tokenInfoA, tokenInfoB] = await Promise.all([
      connection.getParsedAccountInfo(new PublicKey(mintA)),
      connection.getParsedAccountInfo(new PublicKey(mintB))
    ]);
    
    const decA = (tokenInfoA.value?.data as any)?.parsed?.info?.decimals || 6;
    const decB = (tokenInfoB.value?.data as any)?.parsed?.info?.decimals || 6;

    // Se positionId foi fornecido, calcular analytics para essa posição específica
    if (positionId) {
      // Para posição específica
      const [investmentResult, feesCollectedResult, withdrawResult] = await Promise.all([
        GetInnerTransactionsFromPosition(positionId, ['INCREASE_LIQUIDITY'], startUtcIso, endUtcIso),
        GetInnerTransactionsFromPosition(positionId, ['COLLECT_FEES'], startUtcIso, endUtcIso),
        GetInnerTransactionsFromPosition(positionId, ['DECREASE_LIQUIDITY'], startUtcIso, endUtcIso)
      ]);

      // Buscar fees uncollected
      const outstandingFees = await getOutstandingFeesForPositionById(positionId);
      
      // Calcular totais
      const investment = {
        A: investmentResult.items.reduce((sum, item) => sum + Number(item.amounts.A), 0),
        B: investmentResult.items.reduce((sum, item) => sum + Number(item.amounts.B), 0),
        A_USD: investmentResult.items.reduce((sum, item) => sum + (item.amounts.A_USD || 0), 0),
        B_USD: investmentResult.items.reduce((sum, item) => sum + (item.amounts.B_USD || 0), 0)
      };

      const feesCollected = {
        A: feesCollectedResult.items.reduce((sum, item) => sum + Number(item.amounts.A), 0),
        B: feesCollectedResult.items.reduce((sum, item) => sum + Number(item.amounts.B), 0),
        A_USD: feesCollectedResult.items.reduce((sum, item) => sum + (item.amounts.A_USD || 0), 0),
        B_USD: feesCollectedResult.items.reduce((sum, item) => sum + (item.amounts.B_USD || 0), 0)
      };

      const withdraw = {
        A: withdrawResult.items.reduce((sum, item) => sum + Number(item.amounts.A), 0),
        B: withdrawResult.items.reduce((sum, item) => sum + Number(item.amounts.B), 0),
        A_USD: withdrawResult.items.reduce((sum, item) => sum + (item.amounts.A_USD || 0), 0),
        B_USD: withdrawResult.items.reduce((sum, item) => sum + (item.amounts.B_USD || 0), 0)
      };

      // Calcular fees uncollected em USD
      const [priceA, priceB] = await Promise.all([
        getTokenPriceUSD(investmentResult.metadata.tokenA.mint),
        getTokenPriceUSD(investmentResult.metadata.tokenB.mint)
      ]);
      
      const feesUncollected = {
        A: Number(outstandingFees.totals.A),
        B: Number(outstandingFees.totals.B),
        A_USD: Number(outstandingFees.totals.A_USD),
        B_USD: Number(outstandingFees.totals.B_USD)
      };

      const gas = await GetGasInPosition(positionId, false);

      // Toda a Regra de Calculo de Analytics
      const qtyA =  (investment.A ?? 0);
      const qtyB =  (investment.A ?? 0);

      const pxA =  (investment.A_USD ?? 0) / (investment.A ?? 0);
      const pxB =  (investment.B_USD ?? 0) / (investment.B ?? 0);

      // Total Investido (USD)
      const V_0 = (investment.A_USD ?? 0) + (investment.B_USD ?? 0);
      
      // LP Tokens
      //reserveX × (lp_balance_user / lp_total_supply)

      // Pool Concentrados 
      //qtyX_now = L × (√P_upper − √P_current) / (√P_current × √P_upper) 

      // No Caso da Orca podemos pegar pelo SDK da Orca
      // Quantidades atuais dos Ativos no Pool
      const {qtyA_now, qtyB_now} = await getQtyNowFromPosition(positionId);

      // Precos atuais dos Ativos no Pool
      const pxA_now = priceA;
      const pxB_now = priceB;
      // Valor da posição atual (USD)
      const V_pos = (qtyA_now * pxA_now) + (qtyB_now * pxB_now);
      const V_HODL = V_pos;

      // Fees não Coletadas
      const F_uncol = (feesUncollected.A_USD ?? 0) + (feesUncollected.B_USD ?? 0);

      // Fees não Coletadas
      const F_col = (feesCollected.A_USD ?? 0) + (feesCollected.B_USD ?? 0);

      // total de  feea
      const F_total = F_col + F_uncol;

      // Valor ja sacado da posição
      const W = (withdraw.A_USD ?? 0) + (withdraw.B_USD ?? 0);

      // Custo total de taxas on-chain pagas (USD)
      const Gas = (gas.A_USD ?? 0) + (gas.B_USD ?? 0);

      // Idade da posição (em dias)
      const t_age = 0;
      //(nowUTC − openedAtUTC) / 1 dia

      // Valor reebido até agora (USD)
      const V_recebido = F_col + W; 

      // Lucro/perda bruta sem descontar gas (USD)
      const PoolPnL_exGas = (V_pos + F_col + F_uncol + W) - V_0;

      // Lucro apenas de taxas, sem valorização dos tokens
      const PoolPnL_fee_exGas = F_col + F_uncol

      // PnL após custos on-chain
      const PnL = (V_pos + F_col + F_uncol + W) - V_0 - Gas;

      // Somente o efeito das fees descontando gas
      const PnL_fee = (F_col + F_uncol) - Gas;

      // Retorno percentual líquido
      const ROI = PnL / V_0

      // Retorno bruto sem custos de gas
      const ROI_exGas = PoolPnL_exGas / V_0;

      //Retorno só das taxas (bruto)
      const ROI_fee_exGas = (F_col + F_uncol) / V_0;

      // Retorno só das taxas (líquido)
      const ROI_fee = (F_col + F_uncol - Gas) / V_0;

      // ROI Anualizado
      const TotalAPR = ROI * (365 / t_age)

      // Retorno bruto anualizado
      const PoolAPR_exGas = ROI_exGas * (365 / t_age);

      //Retorno só de fees anualizado (bruto)
      const FeeAPR_exGas = ROI_fee_exGas * (365 / t_age);

      //Retorno só de fees anualizado (líquido)
      const FeeAPR = ROI_fee * (365 / t_age)

      // Impermanent Loss - Diferença entre valor LP e HODL
      const IL = V_pos - V_HODL;
      const IL_percent = IL / V_HODL;

      return {
        success: true,
        timestamp: new Date().toISOString(),
        method: 'calculateAnalytics',
        parameters: {
          poolId,
          owner,
          positionId,
          startUtc: startUtcIso || null,
          endUtc: endUtcIso || null
        },
        metadata: {
          pool: poolId,
          tokenA: { mint: investmentResult.metadata.tokenA.mint, decimals: investmentResult.metadata.tokenA.decimals },
          tokenB: { mint: investmentResult.metadata.tokenB.mint, decimals: investmentResult.metadata.tokenB.decimals }
        },
        analytics: {
          ///feesUncollected.A_USD e feesUncollected.B_USD          
          UnclaimedRewards: 0,
          ClaimedRewards: 0,
          TotalFees: (feesCollected.A_USD ?? 0) + (feesCollected.B_USD ?? 0),
          TotalRewards: 0,
          TotalWithdraw: (withdraw.A_USD ?? 0) + (withdraw.B_USD ?? 0),
          TotalInvest: (investment.A_USD ?? 0) + (investment.B_USD ?? 0),

          investment,
          feesCollected,
          feesUncollected,
          withdraw,
          gas: gas
        }
      };
    }

    // Se não há positionId, buscar todas as posições do owner na pool
    const ownerPk = new PublicKey(owner);
    const positionAccounts = await connection.getProgramAccounts(ORCA_WHIRLPOOL_PROGRAM_ID, {
      filters: [
        { dataSize: 2168 }, // Tamanho da conta Position
        { memcmp: { offset: 8, bytes: poolPk.toBase58() } }, // Pool
        { memcmp: { offset: 40, bytes: ownerPk.toBase58() } } // Owner
      ]
    });

    if (positionAccounts.length === 0) {
      throw new Error('No positions found for this owner in the specified pool');
    }

    // Calcular analytics para todas as posições
    const allAnalytics = await Promise.all(
      positionAccounts.map(async (account) => {
        const positionMint = (account.account.data as any)?.positionMint?.toString();
        if (!positionMint) return null;
        
        // Calcular analytics diretamente
        const [investmentResult, feesCollectedResult, withdrawResult] = await Promise.all([
          GetInnerTransactionsFromPosition(positionMint, ['INCREASE_LIQUIDITY'], startUtcIso, endUtcIso),
          GetInnerTransactionsFromPosition(positionMint, ['COLLECT_FEES'], startUtcIso, endUtcIso),
          GetInnerTransactionsFromPosition(positionMint, ['DECREASE_LIQUIDITY'], startUtcIso, endUtcIso)
        ]);

        const analytics = {
          investment: {
            A: investmentResult.items.reduce((sum, item) => sum + Number(item.amounts.A), 0),
            B: investmentResult.items.reduce((sum, item) => sum + Number(item.amounts.B), 0),
            A_USD: investmentResult.items.reduce((sum, item) => sum + (item.amounts.A_USD || 0), 0),
            B_USD: investmentResult.items.reduce((sum, item) => sum + (item.amounts.B_USD || 0), 0)
          },
          feesCollected: {
            A: feesCollectedResult.items.reduce((sum, item) => sum + Number(item.amounts.A), 0),
            B: feesCollectedResult.items.reduce((sum, item) => sum + Number(item.amounts.B), 0),
            A_USD: feesCollectedResult.items.reduce((sum, item) => sum + (item.amounts.A_USD || 0), 0),
            B_USD: feesCollectedResult.items.reduce((sum, item) => sum + (item.amounts.B_USD || 0), 0)
          },
          withdraw: {
            A: withdrawResult.items.reduce((sum, item) => sum + Number(item.amounts.A), 0),
            B: withdrawResult.items.reduce((sum, item) => sum + Number(item.amounts.B), 0),
            A_USD: withdrawResult.items.reduce((sum, item) => sum + (item.amounts.A_USD || 0), 0),
            B_USD: withdrawResult.items.reduce((sum, item) => sum + (item.amounts.B_USD || 0), 0)
          }
        };
        const outstandingFees = await getOutstandingFeesForPositionById(positionMint);
        
        const [priceA, priceB] = await Promise.all([
          getTokenPriceUSD(mintA),
          getTokenPriceUSD(mintB)
        ]);
        
        const feesUncollected = {
          A: Number(outstandingFees.feeOwedAComputedNow || "0") / Math.pow(10, decA),
          B: Number(outstandingFees.feeOwedBComputedNow || "0") / Math.pow(10, decB),
          A_USD: (Number(outstandingFees.feeOwedAComputedNow || "0") / Math.pow(10, decA)) * priceA,
          B_USD: (Number(outstandingFees.feeOwedBComputedNow || "0") / Math.pow(10, decB)) * priceB
        };

        return {
          positionMint,
          analytics: {
            investment: analytics.investment,
            feesCollected: analytics.feesCollected,
            feesUncollected: feesUncollected,
            withdraw: analytics.withdraw,
            gas: await GetGasInPosition(positionMint, false)
          }
        };
      })
    );

    // Filtrar posições válidas
    const validPositions = allAnalytics.filter(pos => pos !== null);

    // Calcular totais agregados
    const aggregated = validPositions.reduce((acc, pos) => {
      acc.investment.A += pos.analytics.investment.A;
      acc.investment.B += pos.analytics.investment.B;
      acc.investment.A_USD += pos.analytics.investment.A_USD;
      acc.investment.B_USD += pos.analytics.investment.B_USD;
      
      acc.feesCollected.A += pos.analytics.feesCollected.A;
      acc.feesCollected.B += pos.analytics.feesCollected.B;
      acc.feesCollected.A_USD += pos.analytics.feesCollected.A_USD;
      acc.feesCollected.B_USD += pos.analytics.feesCollected.B_USD;
      
      acc.feesUncollected.A += pos.analytics.feesUncollected.A;
      acc.feesUncollected.B += pos.analytics.feesUncollected.B;
      acc.feesUncollected.A_USD += pos.analytics.feesUncollected.A_USD;
      acc.feesUncollected.B_USD += pos.analytics.feesUncollected.B_USD;
      
      acc.withdraw.A += pos.analytics.withdraw.A;
      acc.withdraw.B += pos.analytics.withdraw.B;
      acc.withdraw.A_USD += pos.analytics.withdraw.A_USD;
      acc.withdraw.B_USD += pos.analytics.withdraw.B_USD;
      
      return acc;
    }, {
      investment: { A: 0, B: 0, A_USD: 0, B_USD: 0 },
      feesCollected: { A: 0, B: 0, A_USD: 0, B_USD: 0 },
      feesUncollected: { A: 0, B: 0, A_USD: 0, B_USD: 0 },
      withdraw: { A: 0, B: 0, A_USD: 0, B_USD: 0 },
      gas: { A: 0, B: 0, A_USD: 0, B_USD: 0 } // TODO: Implementar cálculo de gas agregado
    });

    return {
      success: true,
      timestamp: new Date().toISOString(),
      method: 'calculateAnalytics',
      parameters: {
        poolId,
        owner,
        positionId: null,
        startUtc: startUtcIso || null,
        endUtc: endUtcIso || null
      },
      metadata: {
        pool: poolId,
        tokenA: { mint: mintA, decimals: decA },
        tokenB: { mint: mintB, decimals: decB }
      },
      positions: validPositions,
      aggregated
    };

  } catch (error) {
    console.error('❌ Error calculating analytics:', error);
    throw error;
  }
}

export async function calculatePoolROI(params: CalculatePoolRoiParams): Promise<CalculatePoolRoiResult> {
  const {
    poolId, owner, positionId, startUtcIso, endUtcIso, showHistory = false,
    baseCurrency = 'USDT', // Moeda base padrão
    priceProvider = undefined, // Não usar provider externo, usar Pyth diretamente
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

  // Buscar decimais dos tokens para cálculos de preço
  const [tokenInfoA, tokenInfoB] = await Promise.all([
    connection.getParsedAccountInfo(new PublicKey(mintA)),
    connection.getParsedAccountInfo(new PublicKey(mintB))
  ]);
  
  const decA = (tokenInfoA.value?.data as any)?.parsed?.info?.decimals || 6;
  const decB = (tokenInfoB.value?.data as any)?.parsed?.info?.decimals || 6;
  
  console.log(`🔢 [DEBUG] Decimais dos tokens:`, { 
    tokenA: { mint: mintA, decimals: decA }, 
    tokenB: { mint: mintB, decimals: decB } 
  });

  // Preço ATUAL (USDT) dos mints A/B — necessário para "Current USD", fees uncollected USD, etc.
  console.log(`💱 [DEBUG] Buscando preços atuais para tokens:`, { mintA, mintB });
  const [priceNowA, priceNowB] = await Promise.all([
    getTokenPriceUSD(mintA, Math.floor(Date.now() / 1000)),
    getTokenPriceUSD(mintB, Math.floor(Date.now() / 1000)),
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
    // Calcular preços reais usando PriceMath do SDK do Orca
    const currentTickIndex = poolData.tickCurrentIndex;
    
    // Preço atual da pool (tokenB/tokenA)
    const currentPrice = Number(PriceMath.sqrtPriceX64ToPrice(poolData.sqrtPrice, decA, decB).toFixed());
    
    // Preços dos limites da posição (tokenB/tokenA)
    const lowerPrice = Number(PriceMath.tickIndexToPrice(tickLower, decA, decB).toFixed());
    const upperPrice = Number(PriceMath.tickIndexToPrice(tickUpper, decA, decB).toFixed());
    
    // Determinar min/max baseado na direção do par
    const minPrice = Math.min(lowerPrice, upperPrice);
    const maxPrice = Math.max(lowerPrice, upperPrice);
    
    console.log(`💰 [DEBUG] Preços calculados para posição ${posMint}:`, {
      currentPrice,
      lowerPrice,
      upperPrice,
      minPrice,
      maxPrice,
      currentTickIndex,
      tickLower,
      tickUpper
    });

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
    
    if (preCalculatedOutstandingFees) {
      // Usar resultado pré-calculado (quando positionId específico foi fornecido)
      console.log(`✅ [DEBUG] Usando fees pendentes pré-calculadas`);
      outstandingFees = preCalculatedOutstandingFees;
    } else {
      // Calcular fees internamente (quando analisando todas as posições do owner)
      console.log(`🔍 [DEBUG] Calculando fees pendentes internamente para posição ${posMint}`);
      const { getOutstandingFeesForPosition } = await import('./orca.js');
      // Usar o PDA da posição (posPda) em vez do NFT mint (posMint)
      outstandingFees = await getOutstandingFeesForPosition(poolId, posPda.toBase58());
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
      const p = await getTokenPriceUSD(r.mint, Math.floor(Date.now() / 1000));
      unclaimedRewardsUsd += Number(r.amountRaw) * p;
    }
    let claimedRewardsUsd = 0;
    for (const r of rewards.claimed) {
      const p = await getTokenPriceUSD(r.mint, r.ts);
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
        getTokenPriceUSD(mintA, ev.ts),
        getTokenPriceUSD(mintB, ev.ts),
      ]);
      investUsdAtDeposit += Number(ev.tokenA) * pa + Number(ev.tokenB) * pb;
    }

    // Somatório dos DECREASES (withdrawn principal)
    let withdrawnARaw = 0n, withdrawnBRaw = 0n, withdrawnUsd = 0;
    for (const ev of liqEvents.filter(e => e.kind === "decrease")) {
      withdrawnARaw += ev.tokenA;
      withdrawnBRaw += ev.tokenB;
      const [pa, pb] = await Promise.all([
        getTokenPriceUSD(mintA, ev.ts),
        getTokenPriceUSD(mintB, ev.ts),
      ]);
      withdrawnUsd += Number(ev.tokenA) * pa + Number(ev.tokenB) * pb;
    }

    // ===== (F) GAS COSTS =====
    const gasEvents = await getGasEvents(connection, poolId, owner, startTs, endTs, posMint);
    const totalLamports = gasEvents.reduce((acc, g) => acc + g.lamportsFee, 0n);
    const solNowPrice = await getTokenPriceUSD("So11111111111111111111111111111111111111112", Math.floor(Date.now() / 1000)); // wSOL mint
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
  connection: Connection,
  pool: string,
  positionMint: string,
  owner: string,
  startTs?: number,
  endTs?: number
): Promise<LiquidityEvent[]> {
  try {
    console.log(`🔍 [DEBUG] Buscando eventos de liquidez para posição: ${positionMint}`);
    
    // Buscar dados da pool para obter os mints dos tokens
    const { makeWhirlpoolContext } = await import('./orca.js');
    const { PublicKey } = await import('@solana/web3.js');
    
    const ctx = await makeWhirlpoolContext();
    const poolPk = new PublicKey(pool);
    const poolData = await ctx.fetcher.getPool(poolPk);
    
    if (!poolData) {
      console.warn(`⚠️ [DEBUG] Pool data not found for pool: ${pool}`);
  return [];
    }
    
    console.log(`🔍 [DEBUG] Pool data:`, {
      tokenMintA: poolData.tokenMintA.toBase58(),
      tokenMintB: poolData.tokenMintB.toBase58()
    });
    
    // Buscar transações do owner que interagem com o programa Orca Whirlpools
    const ownerPk = new PublicKey(owner);
    const signatures = await connection.getSignaturesForAddress(ownerPk, {
      limit: 1000
    });
    
    const events: LiquidityEvent[] = [];
    
    for (const sig of signatures) {
      const bt = sig.blockTime ?? null;
      
      // Filtrar por período se especificado
      if (startTs && bt && bt < startTs) continue;
      if (endTs && bt && bt > endTs) continue;
      
      try {
        const tx = await connection.getParsedTransaction(sig.signature, {
          maxSupportedTransactionVersion: 0,
        });
        
        if (!tx || !tx.meta) continue;
        
        // Verificar se a transação interage com o Whirlpools Program
        const hasOrcaIx = tx.transaction.message.accountKeys
          .some(k => k.pubkey.toBase58() === ORCA_WHIRLPOOL_PROGRAM_ID.toBase58());
        if (!hasOrcaIx) continue;
        
        // Verificar se envolve a posição específica (usar PDA da posição)
        const accountKeys = tx.transaction.message.accountKeys.map(k => k.pubkey.toBase58());
        
        // Derivar PDA da posição a partir do NFT mint
        const { PDAUtil } = await import('@orca-so/whirlpools-sdk');
        const posMintPk = new PublicKey(positionMint);
        const posPda = PDAUtil.getPosition(ORCA_WHIRLPOOL_PROGRAM_ID, posMintPk).publicKey;
        
        if (!accountKeys.includes(posPda.toBase58())) continue;
        
        // Analisar logs para detectar increase/decrease
        const logMessages = tx.meta.logMessages || [];
        
        // Detectar increase liquidity
        if (logMessages.some(log => log.includes("Instruction: IncreaseLiquidity"))) {
          console.log(`📈 [DEBUG] Found increase liquidity in transaction: ${sig.signature}`);
          
          // Analisar inner instructions para detectar transferências de tokens
          const innerInstructions = tx.meta.innerInstructions || [];
          let tokenAAmount = 0n;
          let tokenBAmount = 0n;
          
          console.log(`🔍 [DEBUG] Analyzing inner instructions for increase liquidity in tx: ${sig.signature}`);
          
          for (const group of innerInstructions) {
            for (const instruction of group.instructions as any[]) {
              if (instruction.program === "spl-token" && instruction.parsed?.type === "transfer") {
                const amount = BigInt(instruction.parsed.info.amount);
                const source = instruction.parsed.info.source;
                const destination = instruction.parsed.info.destination;
                const mint = instruction.parsed.info.mint;
                
                console.log(`🔍 [DEBUG] Found transfer: ${amount} from ${source} to ${destination}, mint: ${mint}`);
                
                // Para increase liquidity, procuramos transferências que vão PARA a pool (vaults)
                // ou que vêm DO owner (investimento)
                if (source === owner || destination.includes('vault') || destination.includes('pool')) {
                  // Determinar se é token A ou B baseado no mint
                  if (mint) {
                    // Comparar com os mints da pool para determinar qual é A ou B
                    if (mint === poolData.tokenMintA.toBase58()) {
                      tokenAAmount += amount;
                      console.log(`🔍 [DEBUG] Token A amount: ${tokenAAmount}`);
                    } else if (mint === poolData.tokenMintB.toBase58()) {
                      tokenBAmount += amount;
                      console.log(`🔍 [DEBUG] Token B amount: ${tokenBAmount}`);
                    }
                  }
                }
              }
            }
          }
          
          if (tokenAAmount > 0n || tokenBAmount > 0n) {
            events.push({
              kind: "increase",
              tokenA: tokenAAmount,
              tokenB: tokenBAmount,
              ts: bt || Math.floor(Date.now() / 1000),
              sig: sig.signature
            });
          }
        }
        
        // Detectar decrease liquidity
        if (logMessages.some(log => log.includes("Instruction: DecreaseLiquidity"))) {
          console.log(`📉 [DEBUG] Found decrease liquidity in transaction: ${sig.signature}`);
          
          // Similar logic for decrease
          const innerInstructions = tx.meta.innerInstructions || [];
          let tokenAAmount = 0n;
          let tokenBAmount = 0n;
          
          for (const group of innerInstructions) {
            for (const instruction of group.instructions as any[]) {
              if (instruction.program === "spl-token" && instruction.parsed?.type === "transfer") {
                const amount = BigInt(instruction.parsed.info.amount);
                const destination = instruction.parsed.info.destination;
                
                // Verificar se é transferência para o owner (retirada)
                if (destination === owner) {
                  const mint = instruction.parsed.info.mint;
                  if (mint) {
                    if (tokenAAmount === 0n) {
                      tokenAAmount = amount;
                    } else if (tokenBAmount === 0n) {
                      tokenBAmount = amount;
                    }
                  }
                }
              }
            }
          }
          
          if (tokenAAmount > 0n || tokenBAmount > 0n) {
            events.push({
              kind: "decrease",
              tokenA: tokenAAmount,
              tokenB: tokenBAmount,
              ts: bt || Math.floor(Date.now() / 1000),
              sig: sig.signature
            });
          }
        }
        
      } catch (error) {
        console.warn(`⚠️ [DEBUG] Error processing transaction ${sig.signature}:`, error);
        continue;
      }
    }
    
    console.log(`📊 [DEBUG] Found ${events.length} liquidity events for position ${positionMint}`);
    return events;
    
  } catch (error) {
    console.warn('Error getting liquidity events:', error);
  return [];
  }
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
