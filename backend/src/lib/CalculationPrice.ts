import { db } from './db.js';

// Cache simples para preços (TTL: 10 minutos)
const priceCache = new Map<string, { price: number; timestamp: number }>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutos em millisegundos

// Cache de requisições em andamento para evitar chamadas duplicadas
const pendingRequests = new Map<string, Promise<number>>();

interface CoinGeckoCurrentPrice {
  [coingeckoId: string]: {
    usd: number;
  };
}

interface CoinGeckoHistoricalPrice {
  id: string;
  symbol: string;
  name: string;
  market_data: {
    current_price: {
      usd: number;
    };
  };
}

/**
 * Busca o ID do CoinGecko para um token Solana na tabela token_metadata
 */
async function getCoinGeckoId(tokenAddress: string): Promise<string | null> {
  try {
    const result = await db.query(
      'SELECT coingecko_id FROM token_metadata WHERE token = $1',
      [tokenAddress]
    );
    
    if (result.rows.length === 0) {
      console.warn(`⚠️ Token ${tokenAddress} não encontrado na tabela token_metadata`);
      return null;
    }
    
    return result.rows[0].coingecko_id;
  } catch (error) {
    console.error(`❌ Erro ao buscar CoinGecko ID para ${tokenAddress}:`, error);
    return null;
  }
}

/**
 * 1) Função para obter preço atual de um token em USD via CoinGecko
 * @param tokenAddress - Endereço do token Solana
 * @returns Preço atual em USD ou 0 se não encontrado
 */
export async function getCurrentPrice(tokenAddress: string): Promise<number> {
  try {
    // Verificar cache primeiro
    const cached = priceCache.get(tokenAddress);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      console.log(`📦 Preço em cache para ${tokenAddress}: $${cached.price}`);
      return cached.price;
    }
    
    // Verificar se já existe uma requisição em andamento para este token
    if (pendingRequests.has(tokenAddress)) {
      console.log(`⏳ Aguardando requisição em andamento para ${tokenAddress}`);
      return await pendingRequests.get(tokenAddress)!;
    }
    
    // Criar nova requisição
    const requestPromise = fetchCurrentPrice(tokenAddress);
    pendingRequests.set(tokenAddress, requestPromise);
    
    try {
      const price = await requestPromise;
      return price;
    } finally {
      // Limpar a requisição pendente
      pendingRequests.delete(tokenAddress);
    }
    
  } catch (error) {
    console.error(`❌ Erro ao buscar preço atual para ${tokenAddress}:`, error);
    
    // Se temos cache, usar mesmo que expirado
    const cached = priceCache.get(tokenAddress);
    if (cached) {
      console.log(`📦 Usando cache de fallback para ${tokenAddress}: $${cached.price}`);
      return cached.price;
    }
    
    return 0;
  }
}

async function fetchCurrentPrice(tokenAddress: string): Promise<number> {
  // Buscar o ID do CoinGecko na tabela token_metadata
  const coingeckoId = await getCoinGeckoId(tokenAddress);
  if (!coingeckoId) {
    return 0;
  }
  
  // Buscar preço atual na API do CoinGecko
  const response = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${coingeckoId}&vs_currencies=usd`
  );
  
  if (!response.ok) {
    if (response.status === 429) {
      console.warn(`⚠️ Rate limit excedido na CoinGecko. Usando cache se disponível.`);
      // Se temos cache antigo, usar ele mesmo expirado
      const cached = priceCache.get(tokenAddress);
      if (cached) {
        console.log(`📦 Usando cache expirado para ${tokenAddress}: $${cached.price}`);
        return cached.price;
      }
      // Se não temos cache, aguardar um pouco e tentar novamente
      console.log(`⏳ Aguardando 2 segundos antes de retornar 0...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      return 0;
    }
    throw new Error(`Erro na API do CoinGecko: ${response.status} ${response.statusText}`);
  }
  
  const data: CoinGeckoCurrentPrice = await response.json();
  
  if (!data[coingeckoId] || !data[coingeckoId].usd) {
    console.warn(`⚠️ Preço não encontrado para ${coingeckoId} na API do CoinGecko`);
    return 0;
  }
  
  const price = data[coingeckoId].usd;
  
  // Salvar no cache
  priceCache.set(tokenAddress, { price, timestamp: Date.now() });
  
  console.log(`✅ Preço atual ${coingeckoId}: $${price} (salvo no cache)`);
  return price;
}

/**
 * 2) Função para obter preço histórico de um token em USD via CoinGecko
 * @param tokenAddress - Endereço do token Solana
 * @param date - Data no formato DD-MM-YYYY (ex: "01-10-2025")
 * @returns Preço histórico em USD ou 0 se não encontrado
 */
export async function getHistoricalPrice(tokenAddress: string, date: string): Promise<number> {
  try {
    // Verificar se a data fornecida é igual à data atual
    const currentDate = new Date();
    const currentDay = String(currentDate.getDate()).padStart(2, '0');
    const currentMonth = String(currentDate.getMonth() + 1).padStart(2, '0');
    const currentYear = currentDate.getFullYear();
    const currentDateString = `${currentDay}-${currentMonth}-${currentYear}`;
    
    if (date === currentDateString) {
      console.log(`📅 Data fornecida (${date}) é igual à data atual, usando getCurrentPrice`);
      return await getCurrentPrice(tokenAddress);
    }
    
    // Verificar cache para preços históricos (chave: tokenAddress_date)
    const cacheKey = `${tokenAddress}_${date}`;
    const cached = priceCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      console.log(`📦 Preço histórico em cache para ${tokenAddress} em ${date}: $${cached.price}`);
      return cached.price;
    }
    
    // Verificar se já existe uma requisição em andamento para este token+data
    if (pendingRequests.has(cacheKey)) {
      console.log(`⏳ Aguardando requisição histórica em andamento para ${tokenAddress} em ${date}`);
      return await pendingRequests.get(cacheKey)!;
    }
    
    // Criar nova requisição
    const requestPromise = fetchHistoricalPrice(tokenAddress, date, cacheKey);
    pendingRequests.set(cacheKey, requestPromise);
    
    try {
      const price = await requestPromise;
      return price;
    } finally {
      // Limpar a requisição pendente
      pendingRequests.delete(cacheKey);
    }
    
  } catch (error) {
    console.error(`❌ Erro ao buscar preço histórico para ${tokenAddress} em ${date}:`, error);
    
    // Se temos cache, usar mesmo que expirado
    const cacheKey = `${tokenAddress}_${date}`;
    const cached = priceCache.get(cacheKey);
    if (cached) {
      console.log(`📦 Usando cache histórico de fallback para ${tokenAddress} em ${date}: $${cached.price}`);
      return cached.price;
    }
    
    return 0;
  }
}

async function fetchHistoricalPrice(tokenAddress: string, date: string, cacheKey: string): Promise<number> {
  // Buscar o ID do CoinGecko na tabela token_metadata
  const coingeckoId = await getCoinGeckoId(tokenAddress);
  if (!coingeckoId) {
    return 0;
  }
  
  // Buscar preço histórico na API do CoinGecko
  const response = await fetch(
    `https://api.coingecko.com/api/v3/coins/${coingeckoId}/history?date=${date}`
  );
  
  if (!response.ok) {
    if (response.status === 429) {
      console.warn(`⚠️ Rate limit excedido na CoinGecko para preço histórico. Usando cache se disponível.`);
      // Se temos cache antigo, usar ele mesmo expirado
      const cached = priceCache.get(cacheKey);
      if (cached) {
        console.log(`📦 Usando cache histórico expirado para ${tokenAddress} em ${date}: $${cached.price}`);
        return cached.price;
      }
      // Se não temos cache, aguardar um pouco e tentar novamente
      console.log(`⏳ Aguardando 3 segundos antes de retornar 0...`);
      await new Promise(resolve => setTimeout(resolve, 3000));
      return 0;
    }
    throw new Error(`Erro na API do CoinGecko: ${response.status} ${response.statusText}`);
  }
  
  const data: CoinGeckoHistoricalPrice = await response.json();
  
  if (!data.market_data || !data.market_data.current_price || !data.market_data.current_price.usd) {
    console.warn(`⚠️ Preço histórico não encontrado para ${coingeckoId} na data ${date}`);
    return 0;
  }
  
  const price = data.market_data.current_price.usd;
  
  // Salvar no cache
  priceCache.set(cacheKey, { price, timestamp: Date.now() });
  
  console.log(`✅ Preço histórico ${coingeckoId} em ${date}: $${price} (salvo no cache)`);
  return price;
}

/**
 * Função auxiliar para obter preço baseado em timestamp
 * Se timestamp for fornecido, busca preço histórico, senão busca preço atual
 */
export async function getPriceUSD(tokenAddress: string, timestamp?: number): Promise<number> {
  if (timestamp) {
    // Converter timestamp para formato DD-MM-YYYY
    const date = new Date(timestamp * 1000);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const dateString = `${day}-${month}-${year}`;
    
    return await getHistoricalPrice(tokenAddress, dateString);
  } else {
    return await getCurrentPrice(tokenAddress);
  }
}
