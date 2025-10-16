import {
  WhirlpoolContext,
  buildWhirlpoolClient,
  ORCA_WHIRLPOOL_PROGRAM_ID,
  PDAUtil,
} from "@orca-so/whirlpools-sdk";
import { Connection, PublicKey } from "@solana/web3.js";
import { makeConnection, makeWhirlpoolContext, GetInnerTransactionsFromPosition, getOutstandingFeesForPositionById, GetGasInPosition, getQtyNowFromPosition, tickToSqrtPrice, q64ToFloat } from './orca.js';
import { Decimal } from 'decimal.js';

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
    
    // Se positionId foi fornecido, buscar dados da posição específica
    if (positionId) {
      const positionMintPk = new PublicKey(positionId);
      const positionPda = PDAUtil.getPosition(ORCA_WHIRLPOOL_PROGRAM_ID, positionMintPk);
      const positionPdaPk = positionPda.publicKey;

      const position = await client.getPosition(positionPdaPk);
      const positionData = position.getData();

      const { liquidity, tickLowerIndex, tickUpperIndex } = positionData;

      const sqrtPriceX64 = poolData.sqrtPrice;
      const sqrtP = q64ToFloat(sqrtPriceX64);
      const sqrtPL = tickToSqrtPrice(tickLowerIndex);
      const sqrtPU = tickToSqrtPrice(tickUpperIndex);
      
      const mintA = poolData.tokenMintA.toBase58();
      const mintB = poolData.tokenMintB.toBase58();

      // Buscar decimais dos tokens
      const [tokenInfoA, tokenInfoB] = await Promise.all([
        connection.getParsedAccountInfo(new PublicKey(mintA)),
        connection.getParsedAccountInfo(new PublicKey(mintB))
      ]);
      
      const decA = (tokenInfoA.value?.data as any)?.parsed?.info?.decimals || 6;
      const decB = (tokenInfoB.value?.data as any)?.parsed?.info?.decimals || 6;

      // Converter sqrt prices para preços reais com ajuste de decimais
      const basePriceLower = sqrtPL.pow(2);
      const basePriceUpper = sqrtPU.pow(2);
      const baseCurrentPrice = sqrtP.pow(2);
      
      // O preço no Orca é sempre tokenB/tokenA
      // Aplicar ajuste de decimais correto usando valor absoluto
      const decimalAdjustment = Math.pow(10, Math.abs(decB - decA));
      const priceLower = basePriceLower.mul(decimalAdjustment);
      const priceUpper = basePriceUpper.mul(decimalAdjustment);
      const currentPrice = baseCurrentPrice.mul(decimalAdjustment);
      
      // Calcular preços inversos (tokenA/tokenB)
      const inversePriceLower = new Decimal(1).div(priceLower);
      const inversePriceUpper = new Decimal(1).div(priceUpper);
      const inverseCurrentPrice = new Decimal(1).div(currentPrice);
      
      // Para debug: mostrar qual token tem mais decimais
      const tokenWithMoreDecimals = decB > decA ? 'tokenB' : 'tokenA';
      const [investmentResult, feesCollectedResult, withdrawResult] = await Promise.all([
        GetInnerTransactionsFromPosition(positionId, ['INCREASE_LIQUIDITY'], startUtcIso, endUtcIso),
        GetInnerTransactionsFromPosition(positionId, ['COLLECT_FEES'], startUtcIso, endUtcIso),
        GetInnerTransactionsFromPosition(positionId, ['DECREASE_LIQUIDITY'], startUtcIso, endUtcIso)
      ]);

      // Buscar fees uncollected
      const outstandingFees = await getOutstandingFeesForPositionById(positionId);
      
      // Calcular totais
      const investment = {
        A: investmentResult.items.reduce((sum, item) => sum + parseFloat(item.amounts.A) / 10 ** decA, 0),  
        B: investmentResult.items.reduce((sum, item) => sum + parseFloat(item.amounts.B) / 10 ** decB, 0),
        A_USD: investmentResult.items.reduce((sum, item) => sum + (item.amounts.A_USD || 0), 0),
        B_USD: investmentResult.items.reduce((sum, item) => sum + (item.amounts.B_USD || 0), 0)
      };

      const feesCollected = {
        A: feesCollectedResult.items.reduce((sum, item) => sum + parseFloat(item.amounts.A) / 10 ** decA, 0),
        B: feesCollectedResult.items.reduce((sum, item) => sum + parseFloat(item.amounts.B) / 10 ** decB, 0),
        A_USD: feesCollectedResult.items.reduce((sum, item) => sum + (item.amounts.A_USD || 0), 0),
        B_USD: feesCollectedResult.items.reduce((sum, item) => sum + (item.amounts.B_USD || 0), 0)
      };

      const withdraw = {
        A: withdrawResult.items.reduce((sum, item) => sum + parseFloat(item.amounts.A) / 10 ** decA, 0),
        B: withdrawResult.items.reduce((sum, item) => sum + parseFloat(item.amounts.B) / 10 ** decB, 0),
        A_USD: withdrawResult.items.reduce((sum, item) => sum + (item.amounts.A_USD || 0), 0),
        B_USD: withdrawResult.items.reduce((sum, item) => sum + (item.amounts.B_USD || 0), 0)
      };

      // Calcular fees uncollected em USD
      const [priceA, priceB] = await Promise.all([
        getTokenPriceUSD(investmentResult.metadata.tokenA.mint),
        getTokenPriceUSD(investmentResult.metadata.tokenB.mint)
      ]);
      
      const feesUncollected = {
        A: parseFloat(outstandingFees.totals.A) / 10 ** decA,
        B: parseFloat(outstandingFees.totals.B) / 10 ** decB,
        A_USD: Number(outstandingFees.totals.A_USD),
        B_USD: Number(outstandingFees.totals.B_USD)
      };

      // Ja esta pegando em Solana (Convertido para 9 decimais)
      const gas = await GetGasInPosition(positionId, false);

      // Toda a Regra de Calculo de Analytics
      const qtyA =  (investment.A ?? 0);
      const qtyB =  (investment.B ?? 0);

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
      const {qtyA_now: qtyA_now_temp, qtyB_now: qtyB_now_temp} = await getQtyNowFromPosition(positionId);
      const qtyA_now = parseFloat(qtyA_now_temp) / 10 ** decA;
      const qtyB_now = parseFloat(qtyB_now_temp) / 10 ** decB;

      // Precos atuais dos Ativos no Pool
      const pxA_now = priceA;
      const pxB_now = priceB;

      // Valor da posição atual (USD)
      const V_pos = (qtyA_now * pxA_now) + (qtyB_now * pxB_now);

      // Valor se tivesse segurado. Quantidaddes do aporte x novos valors
      const V_HODL = (qtyA * pxA_now) + (qtyB * pxB_now);

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
      const nowUTC = new Date();
      const openedAtUTC = investmentResult.items.length > 0 
        ? new Date(Math.min(...investmentResult.items.map(item => new Date(item.datetimeUTC).getTime())))
        : nowUTC;
      const t_age = (nowUTC.getTime() - openedAtUTC.getTime()) / (1000 * 60 * 60 * 24); // Converter para dias

      // Valor reebido até agora (USD)
      const V_received = F_col + W; 

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
          tokenB: { mint: investmentResult.metadata.tokenB.mint, decimals: investmentResult.metadata.tokenB.decimals },
          priceDirection: "tokenB/tokenA (Orca standard)",
          decimalAdjustment: `10^(${decB} - ${decA}) = ${decimalAdjustment}`,
          debug: {
            tokenA_decimals: decA,
            tokenB_decimals: decB,
            tokenWithMoreDecimals,
            decimalAdjustment,
            note: "currentPrice should now be close to expected value (194)"
          }
        },
        analytics: {
          // Variables used in calculations
          variables: {

            sqrtP:{
              value: sqrtP,
              description: "Square root of price"
            } ,
            sqrtPL:{
              value: sqrtPL,
              description: "Square root of price lower"
            } ,
            sqrtPU:{
              value: sqrtPU,
              description: "Square root of price upper"
            } ,
            priceLower: {
              value: priceLower,
              description: "Real price at lower tick"
            },
            priceUpper: {
              value: priceUpper,
              description: "Real price at upper tick"
            },
            currentPrice: {
              value: currentPrice,
              description: "Current real price (tokenB/tokenA)"
            },
            baseCurrentPrice: {
              value: baseCurrentPrice,
              description: "Current base price (without decimal adjustment)"
            },
            basePriceLower: {
              value: basePriceLower,
              description: "Base price at lower tick (without decimal adjustment)"
            },
            basePriceUpper: {
              value: basePriceUpper,
              description: "Base price at upper tick (without decimal adjustment)"
            },
            decimalAdjustment: {
              value: decimalAdjustment,
              description: `Decimal adjustment factor (10^${decB - decA})`
            },
            inverseCurrentPrice: {
              value: inverseCurrentPrice,
              description: "Inverse current price (tokenA/tokenB)"
            },
            inversePriceLower: {
              value: inversePriceLower,
              description: "Inverse price at lower tick (tokenA/tokenB)"
            },
            inversePriceUpper: {
              value: inversePriceUpper,
              description: "Inverse price at upper tick (tokenA/tokenB)"
            },
            qtyA: {
              value: qtyA,
              description: "Quantity of token A at deposit"
            },
            qtyB: {
              value: qtyB,
              description: "Quantity of token B at deposit"
            },
            pxA: {
              value: pxA,
              description: "Price of token A at deposit (USD)"
            },
            pxB: {
              value: pxB,
              description: "Price of token B at deposit (USD)"
            },
            V_0: {
              value: V_0,
              description: "Total initial investment (USD)"
            },
            qtyA_now: {
              value: qtyA_now,
              description: "Current quantity of token A in position"
            },
            qtyB_now: {
              value: qtyB_now,
              description: "Current quantity of token B in position"
            },
            pxA_now: {
              value: pxA_now,
              description: "Current price of token A (USD)"
            },
            pxB_now: {
              value: pxB_now,
              description: "Current price of token B (USD)"
            },
            V_pos: {
              value: V_pos,
              description: "Current position value (USD)"
            },
            V_HODL: {
              value: V_HODL,
              description: "HODL value (My initial contribution with updated price values)"
            },
            F_uncol: {
              value: F_uncol,
              description: "Uncollected fees (USD)"
            },
            F_col: {
              value: F_col,
              description: "Collected fees (USD)"
            },
            F_total: {
              value: F_total,
              description: "Total fees (collected + uncollected) (USD)"
            },
            W: {
              value: W,
              description: "Total withdrawn from position (USD)"
            },
            Gas: {
              value: Gas,
              description: "Total gas costs paid (USD)"
            },
            t_age: {
              value: t_age,
              description: "Position age in days"
            },
            V_received: {
              value: V_received,
              description: "Total received value (fees + withdrawals) (USD)"
            },
            PoolPnL_exGas: {
              value: PoolPnL_exGas,
              description: "Pool PnL excluding gas costs (USD)"
            },
            PoolPnL_fee_exGas: {
              value: PoolPnL_fee_exGas,
              description: "Pool PnL from fees only, excluding gas (USD)"
            },
            PnL: {
              value: PnL,
              description: "Total PnL after gas costs (USD)"
            },
            PnL_fee: {
              value: PnL_fee,
              description: "PnL from fees only, after gas costs (USD)"
            },
            ROI: {
              value: ROI,
              description: "Return on Investment (percentage)"
            },
            ROI_exGas: {
              value: ROI_exGas,
              description: "Return on Investment excluding gas (percentage)"
            },
            ROI_fee_exGas: {
              value: ROI_fee_exGas,
              description: "Return on Investment from fees only, excluding gas (percentage)"
            },
            ROI_fee: {
              value: ROI_fee,
              description: "Return on Investment from fees only, after gas (percentage)"
            },
            TotalAPR: {
              value: TotalAPR,
              description: "Total Annualized Percentage Rate"
            },
            PoolAPR_exGas: {
              value: PoolAPR_exGas,
              description: "Pool APR excluding gas costs"
            },
            FeeAPR_exGas: {
              value: FeeAPR_exGas,
              description: "Fee APR excluding gas costs"
            },
            FeeAPR: {
              value: FeeAPR,
              description: "Fee APR after gas costs"
            },
            IL: {
              value: IL,
              description: "Impermanent Loss (USD)"
            },
            IL_percent: {
              value: IL_percent,
              description: "Impermanent Loss percentage"
            }
          },
          
          investment,
          feesCollected,
          feesUncollected,
          withdraw,
          gas: gas
        }
      };
    }

    throw new Error('A positionId was not provided');
    
  } catch (error) {
    console.error('❌ Error calculating analytics:', error);
    throw error;
  }
}