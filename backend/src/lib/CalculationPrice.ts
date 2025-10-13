import { Connection, PublicKey, Keypair } from "@solana/web3.js";
import { SwitchboardProgram, AggregatorAccount } from "@switchboard-xyz/solana.js";

// Mapeamento de tokens Solana para aggregators Switchboard USD
const SOLANA_TO_SWITCHBOARD_AGGREGATOR: Record<string, string> = {
  'So11111111111111111111111111111111111111112': 'GvDMxPzN1sCj7L26YDK2HnMRXEQmQ2aemov8YBtPS7vR', // SOL/USD
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': '3vxLXJqLqF3JG5TCbYycbKWRBbCJQLxQmBGCkyqEEefL', // USDT/USD
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 'Gnt27xtC473ZT2Mw5u8wZ68Z3gULkSTb5DuxJy7eJotD', // USDC/USD
  'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': '8ihFLu5FimgTQ1Unh4dVyEHUGodJ5gJQCrQf4KUVB9bN', // BONK/USD
  'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So': 'E4v1BBgoso9s64TQvmy1AgaM3HYxi1GkmTqgXW8dmFf3', // MSOL/USD
  '7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs': 'JBu1AL4obBcCMqKBBxhpWCNUt136ijcuMZLFvTP7iWdB', // ETH/USD
  'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN': 'g6eRCbboSwK4tSWngn773RCMexr1APQr4uA9bGZBYfo', // JUP/USD
};

// Função para obter conexão RPC
function getRpcConnection(): Connection {
  const rpcProvider = process.env.RPC_PROVIDER || 'helius';
  const apiKey = process.env.HELIUS_API_KEY;
  
  let finalRpcUrl: string;
  if (rpcProvider === 'helius') {
    finalRpcUrl = apiKey ? `https://mainnet.helius-rpc.com/?api-key=${apiKey}` : 'https://api.mainnet-beta.solana.com';
    console.log('✅ Using Helius RPC for Switchboard price calculation (no rate limiting)');
  } else {
    finalRpcUrl = process.env.RPC_URL || 'https://api.mainnet-beta.solana.com';
    console.log(`✅ Using RPC ${rpcProvider} for Switchboard price calculation`);
  }
  
  return new Connection(finalRpcUrl, "confirmed");
}

// Função para obter preço USD de um token
export async function getPriceUSD(token: string, timestamp?: number): Promise<number> {
  const aggregator = SOLANA_TO_SWITCHBOARD_AGGREGATOR[token];
  if (!aggregator) {
    console.warn(`⚠️ Aggregator Switchboard não encontrado para ${token}`);
    return 0;
  }
  
  try {
    const connection = getRpcConnection();
    const payer = Keypair.generate(); // Dummy keypair para leitura
    const program = await SwitchboardProgram.load(connection, payer);
    
    const agg = new AggregatorAccount(program, new PublicKey(aggregator));
    const value = await agg.fetchLatestValue();
    
    if (value == null) {
      throw new Error("Valor nulo em aggregator.");
    }
    
    return Number(value);
  } catch (error) {
    console.error(`❌ Erro ao buscar preço USD para ${token}:`, error);
    return 0;
  }
}

// Função para obter preço de um par de tokens (A/B)
export async function getPairPrice(tokenA: string, tokenB: string, timestamp?: number): Promise<{ priceA: number; priceB: number; pairPrice: number }> {
  try {
    const [priceA, priceB] = await Promise.all([
      getPriceUSD(tokenA, timestamp),
      getPriceUSD(tokenB, timestamp)
    ]);
    
    if (priceA === 0 || priceB === 0) {
      console.warn(`⚠️ Preço não encontrado: tokenA=${tokenA} (${priceA}), tokenB=${tokenB} (${priceB})`);
      return { priceA: 0, priceB: 0, pairPrice: 0 };
    }
    
    const pairPrice = priceA / priceB; // A/B = (A/USD) / (B/USD)
    
    return {
      priceA,
      priceB,
      pairPrice
    };
  } catch (error) {
    console.error(`❌ Erro ao buscar preço do par ${tokenA}/${tokenB}:`, error);
    return { priceA: 0, priceB: 0, pairPrice: 0 };
  }
}
