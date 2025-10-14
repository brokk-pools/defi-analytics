# 🐋 Orca Whirlpools Analytics Backend

Backend completo para análise avançada de pools e posições do Orca Whirlpools na Solana, com integração de preços em tempo real via CoinGecko API, sistema de cache inteligente e análise financeira detalhada.

## 📚 Documentação da API

Para documentação completa da API com exemplos detalhados, parâmetros e respostas, consulte:
**[📖 Documentação Completa da API](./README.md#-apis-e-endpoints)**

### 🔗 Integração com API Original da Orca

Este backend integra diretamente com a **API oficial da Orca** para fornecer dados atualizados e precisos. Para referência completa da API original, consulte:

**[🌐 Documentação Oficial da API da Orca](https://api.orca.so/docs)**

**Endpoints principais utilizados:**
- **[Pools API](https://api.orca.so/docs#tag/whirlpools/get/pools)** - Lista de pools e dados de mercado
- **[Pool by Address](https://api.orca.so/docs#tag/whirlpools/get/pools/{address})** - Dados específicos de uma pool
- **[Lock API](https://api.orca.so/docs#tag/whirlpools/get/lock/{address})** - Dados de lock e staking
- **V2 API** - Dados atualizados de pools e estatísticas

**Funcionalidades da integração:**
- ✅ **Passagem transparente de parâmetros** - Todos os query parameters da API da Orca são suportados
- ✅ **Fallback automático** - Em caso de erro, tenta novamente sem parâmetros
- ✅ **Rate limiting** - Respeita os limites da API da Orca
- ✅ **Cache inteligente** - Otimiza performance quando possível

**Exemplo de uso com parâmetros da API da Orca:**
```bash
# Todos estes parâmetros são passados diretamente para a API da Orca
curl "http://localhost:3001/pools?sortBy=volume&sortDirection=desc&stats=5m&includeBlocked=true&limit=10"

# Para uma pool específica com parâmetros adicionais
curl "http://localhost:3001/pools/Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE?stats=5m&includeBlocked=true"
```

## 🎯 Visão Geral

Este backend fornece APIs RESTful para análise de dados do Orca Whirlpools, incluindo:
- Análise de pools e posições de liquidez
- Dados de ticks para visualizações de range
- Overview consolidado de posições por carteira
- Integração com SDK oficial do Orca
- Webhooks da Helius para atualizações em tempo real

## ⚡ Quick Start

### Pré-requisitos
- **Node.js 20+** (recomendado 20.18.0+)
- **PostgreSQL 14+** 
- **Conexão com internet** (para preços via CoinGecko API)
- **Git** para clonagem do repositório

### Instalação Rápida
```bash
# 1. Clone o repositório
git clone https://github.com/brokk-pools/defi-analytics.git
cd defi-analytics/backend

# 2. Instale as dependências
npm install

# 3. Configure as variáveis de ambiente
cp .env.example .env
# Edite o .env com suas configurações (veja seção abaixo)

# 4. Execute o servidor
npm run dev
```

### Configuração Detalhada do .env
```bash
# ===========================================
# CONFIGURAÇÕES OBRIGATÓRIAS
# ===========================================

# Database PostgreSQL
DATABASE_URL=postgresql://username:password@localhost:5432/orca_whirlpools

# CoinGecko API (automática, sem chave necessária)
# Sistema de cache implementado para otimizar performance

# ===========================================
# CONFIGURAÇÕES DO SERVIDOR
# ===========================================

# Porta do servidor
PORT=3001

# Ambiente de execução
NODE_ENV=development

# ===========================================
# CONFIGURAÇÕES OPCIONAIS
# ===========================================

# Redis (para cache, se disponível)
REDIS_URL=redis://localhost:6379

# Logs
LOG_LEVEL=info
```

### Verificação da Instalação
```bash
# Teste se o servidor está funcionando
curl http://localhost:3001/health

# Teste uma rota básica
curl http://localhost:3001/pools

# Teste análise de liquidez
curl http://localhost:3001/liquidity/6PaZJLPmJPd3kVx4pBGAmndfTXsJS1tcuYhqvHFSZ4RY
```

**🎯 Pronto!** O servidor estará rodando em `http://localhost:3001` com todas as APIs disponíveis.

## 💰 Sistema de Preços e Cache

### Integração com CoinGecko API

O sistema utiliza a **CoinGecko API** para preços em tempo real com:
- **Cache inteligente** com TTL de 5 minutos
- **Fallback automático** em caso de rate limits
- **Preços históricos** com suporte a datas específicas
- **Resistência a falhas** com cache de emergência

### Sistema de Cache

**Características:**
- ✅ **Cache em memória** com TTL configurável (5 minutos)
- ✅ **Chaves inteligentes** separadas para preços atuais e históricos
- ✅ **Fallback para cache expirado** quando API falha
- ✅ **Logs detalhados** para monitoramento de performance
- ✅ **Tratamento de rate limits** (erro 429) com recuperação automática

**Configuração:**
```typescript
// Cache TTL: 5 minutos
const CACHE_TTL = 5 * 60 * 1000;

// Chaves de cache:
// - Preços atuais: tokenAddress
// - Preços históricos: tokenAddress_date
```

### Funcionalidades habilitadas:
- ✅ **Preços em tempo real** para todos os tokens
- ✅ **Análise histórica** com preços precisos
- ✅ **Cálculo de ROI/APR** com dados reais
- ✅ **Análise de impermanent loss**
- ✅ **Métricas financeiras** em USD
- ✅ **Performance otimizada** com cache

## 🚀 Funcionalidades

### 📊 Análise Avançada de Pools
- **Dados completos de pools** com informações detalhadas de ticks e liquidez
- **Análise de range** para visualizações de concentração de liquidez
- **Estatísticas de liquidez** com métricas de distribuição
- **Cálculo de preços precisos** via CoinGecko API com cache inteligente
- **Suporte a preços históricos** com timestamp específico
- **Análise de pares** com cálculo de preços relativos

### 🎯 Gestão de Posições e Liquidez
- **Busca de posições por proprietário** usando SDK oficial do Orca
- **Dados de posições individuais** com informações de range e status
- **Overview consolidado** de todas as posições de uma carteira
- **Análise de ticks** para visualizações de range
- **Status de posições** (ativa, fora do range, abaixo/acima)
- **Cálculo de liquidez atual** e valores em USD

### 💰 Análise Financeira Completa (Brokk Analytics)
- **ROI e APR** calculados com precisão
- **Análise de fees** coletadas e pendentes
- **Cálculo de PnL** (Profit and Loss)
- **Análise de impermanent loss**
- **Rastreamento de custos de gas**
- **Métricas agregadas** entre múltiplas posições
- **Análise histórica** com valorização USD adequada

### 🔄 Integração e Performance
- **SDK oficial do Orca** para dados precisos e atualizados
- **CoinGecko API** para preços em tempo real com sistema de cache
- **Conexão RPC otimizada** com suporte a múltiplos provedores
- **Rate limiting** para proteção contra abuso
- **Logs estruturados** para monitoramento e debugging
- **Cache inteligente** para otimização de performance

### 🔍 APIs e Endpoints

#### 🏥 Health Check
```bash
GET /health
```
**Descrição:** Verifica se o servidor está funcionando e retorna status do sistema.

**Resposta:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600,
  "version": "1.7.0"
}
```

#### 💼 Wallet Positions
```bash
GET /wallet/:publicKey
```
**Descrição:** Posições de uma carteira específica (mesmo formato que `/liquidity`).

**Parâmetros:**
- `publicKey` (obrigatório): Endereço da carteira Solana

**Dados Retornados:**
- **Formato padronizado:** mesmo formato das outras rotas de posição
- **Dados consolidados:** overview de todas as posições da carteira
- **Análise de range:** status das posições em relação ao tick atual

**Exemplo:**
```bash
curl "http://localhost:3001/wallet/6PaZJLPmJPd3kVx4pBGAmndfTXsJS1tcuYhqvHFSZ4RY"
```

#### 🎯 Position Details
```bash
GET /position/:nftMint
```
**Descrição:** Dados completos de uma posição específica por NFT mint.

**Parâmetros:**
- `nftMint` (obrigatório): Endereço do NFT da posição

**Dados Retornados:**
- **Informações da posição:** range, liquidez, status
- **Dados da pool:** tokens, fees, tick atual
- **Análise financeira:** valores em USD, fees pendentes
- **Metadados:** timestamps, última atualização

**Exemplo:**
```bash
curl "http://localhost:3001/position/77mnr1C294q2eHSuxxaM3R44ZWwJ89FztcwDB3EcaBR"
```

#### 💧 Liquidity Overview
```bash
GET /liquidity/:owner?saveFile=true
```
**Descrição:** Overview consolidado de todas as posições de liquidez de um proprietário.

**Parâmetros:**
- `owner` (obrigatório): Endereço do proprietário das posições
- `saveFile` (opcional): salva resultado em arquivo JSON

**Dados Retornados:**
- **Posições:** lista de todas as posições com dados detalhados
- **Estatísticas:** totais de liquidez, fees, posições ativas/inativas
- **Análise de range:** posições dentro/fora do range atual
- **Valores em USD:** calculados via CoinGecko API com cache
- **Tick comparison:** dados para visualização de range

**Exemplo:**
```bash
curl "http://localhost:3001/liquidity/6PaZJLPmJPd3kVx4pBGAmndfTXsJS1tcuYhqvHFSZ4RY"
```

#### Outstanding Fees Calculation (Primary)
```bash
GET /fees/:poolId/:owner
```
Calcula fees pendentes (não coletadas) para um owner em uma pool específica em tempo real usando o algoritmo oficial do Orca.

**Funcionalidades:**
- Agrega fees de todas as posições do owner na pool especificada
- Cálculo em tempo real usando o algoritmo oficial do Orca
- Tratamento correto de decimais para diferentes tipos de token
- Suporte para filtro por posição específica
- Breakdown detalhado por posição quando solicitado

**Parâmetros:**
- `poolId` (obrigatório): Endereço da pool Whirlpool
- `owner` (obrigatório): Endereço da carteira do owner
- `positionId` (opcional): Identificador da posição específica (NFT mint)
- `showPositions` (opcional): Se `true`, retorna detalhes por posição

**Exemplos:**
```bash
# Fees de todas as posições do owner na pool
curl "http://localhost:3001/fees/Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE/2mu3kyTmEvdjPUeb9CPHMqDWT7jZEWqiyqtrJyMHHhuc"

# Fees de uma posição específica
curl "http://localhost:3001/fees/Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE/2mu3kyTmEvdjPUeb9CPHMqDWT7jZEWqiyqtrJyMHHhuc?positionId=6TKDPz14cZZ6yGAEzqB7GodX8R32zf5NcnnZeRovCbQH"

# Detalhes por posição
curl "http://localhost:3001/fees/Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE/2mu3kyTmEvdjPUeb9CPHMqDWT7jZEWqiyqtrJyMHHhuc?showPositions=true"
```

**Dados retornados:**
- `totalPositions`: Número de posições encontradas para o owner na pool
- `positionAddresses`: Array de endereços PDA das posições
- `tokenA/tokenB`: Informações dos tokens incluindo endereços mint e decimais
- `totals`: Fees pendentes agregadas (valores raw em unidades mínimas, valores human convertidos)
- `positions` (se `showPositions=true`): Breakdown detalhado por posição com cálculos individuais de fees

#### Outstanding Fees Calculation (Legacy)
```bash
GET /fees/position/:positionId/:poolId
```
Calcula fees pendentes de uma posição específica (mantido para compatibilidade).

**Parâmetros:**
- `positionId` (obrigatório): Identificador da posição (pode ser NFT mint ou endereço da posição)
- `poolId` (obrigatório): Endereço da pool Whirlpool

**Exemplo:**
```bash
curl "http://localhost:3001/fees/position/6TKDPz14cZZ6yGAEzqB7GodX8R32zf5NcnnZeRovCbQH/Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE"
```

**Dados retornados:**
- `feeOwedAOnChain`: Fees já registradas on-chain para token A (unidades mínimas)
- `feeOwedBOnChain`: Fees já registradas on-chain para token B (unidades mínimas)
- `feeOwedAComputedNow`: Total de fees para token A incluindo pendentes (unidades mínimas)
- `feeOwedBComputedNow`: Total de fees para token B incluindo pendentes (unidades mínimas)
- `calculations`: Cálculos intermediários detalhados (Q64.64 format)
- `currentTick`: Tick atual da pool
- `tickLowerIndex`/`tickUpperIndex`: Range da posição
- `tokenMintA`/`tokenMintB`: Endereços dos tokens

**Notas importantes:**
- Todos os valores de fees estão em unidades mínimas dos tokens
- Para exibir valores legíveis, divida por `10^decimals` do token
- Valores Q64.64 são para cálculos internos, não precisam ser exibidos
- A diferença entre `ComputedNow` e `OnChain` representa fees pendentes

#### Collected Fees History
```bash
GET /fees/collected/:poolId/:owner
```
Consulta fees já coletadas on-chain por um usuário em uma pool específica dentro de um intervalo de tempo UTC.

**Funcionalidades:**
- Análise de transações on-chain para eventos de coleta de fees
- Intervalo de tempo flexível com padrões sensatos (1900-01-01 até amanhã se não especificado)
- Capacidade de filtro por posição específica
- Histórico detalhado de transações com position IDs
- Tratamento correto de decimais para diferentes tipos de token
- Análise de dados blockchain em tempo real

**Parâmetros:**
- `poolId` (obrigatório): Endereço da pool Whirlpool
- `owner` (obrigatório): Endereço da carteira do usuário
- `startUtc` (opcional): Data/hora inicial em formato ISO 8601 (padrão: 1900-01-01T00:00:00Z)
- `endUtc` (opcional): Data/hora final em formato ISO 8601 (padrão: amanhã)
- `showHistory` (opcional): Incluir histórico detalhado de transações (boolean)
- `positionId` (opcional): NFT mint da posição específica para filtrar (se vazio, retorna todas as posições)

**Exemplos:**
```bash
# Todas as fees coletadas (todo o histórico)
curl "http://localhost:3001/fees/collected/Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE/2mu3kyTmEvdjPUeb9CPHMqDWT7jZEWqiyqtrJyMHHhuc"

# Fees coletadas em um período específico
curl "http://localhost:3001/fees/collected/Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE/2mu3kyTmEvdjPUeb9CPHMqDWT7jZEWqiyqtrJyMHHhuc?startUtc=2025-10-01T00:00:00Z&endUtc=2025-10-12T23:59:59Z"

# Com histórico detalhado
curl "http://localhost:3001/fees/collected/Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE/2mu3kyTmEvdjPUeb9CPHMqDWT7jZEWqiyqtrJyMHHhuc?showHistory=true"

# Para uma posição específica com histórico
curl "http://localhost:3001/fees/collected/Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE/2mu3kyTmEvdjPUeb9CPHMqDWT7jZEWqiyqtrJyMHHhuc?positionId=6TKDPz14cZZ6yGAEzqB7GodX8R32zf5NcnnZeRovCbQH&showHistory=true"
```

**Dados retornados:**
- `positionId`: NFT mint da posição (null se filtrando todas as posições)
- `positionAddress`: Endereço PDA da posição (null se filtrando todas as posições)
- `totalPositions`: Número de posições encontradas para o owner na pool
- `positionAddresses`: Array de endereços PDA das posições
- `totals.A.raw`: Total de fees coletadas para token A (unidades mínimas)
- `totals.A.human`: Total de fees coletadas para token A (formato legível)
- `totals.B.raw`: Total de fees coletadas para token B (unidades mínimas)
- `totals.B.human`: Total de fees coletadas para token B (formato legível)
- `interval_utc`: Intervalo de tempo consultado
- `tokenA`/`tokenB`: Informações dos tokens (mint, ATA, decimais)
- `history`: Histórico detalhado de transações (se `showHistory=true`)

**Notas importantes:**
- Consulta diretamente a blockchain Solana via RPC
- Analisa transações do owner (não das ATAs) para melhor performance
- Filtra apenas transações relacionadas ao programa Orca Whirlpools
- Detecta fees coletadas através de logs do Anchor (`"Instruction: CollectFees"`)
- Analisa inner instructions para detectar transferências dos vaults da pool
- Detecta transferências de ambos os tokens (A e B) na mesma transação
- Se `positionId` for fornecido, filtra apenas transações dessa posição específica
- Se `positionId` for vazio, retorna fees de todas as posições do usuário na pool
- Valores em formato raw e human-readable
- Histórico inclui signature, datetime, valores e positionId de cada transação

#### Pools (API Orca)
```bash
GET /pools?sortBy=volume&sortDirection=desc
GET /pools/:poolId
```
Busca dados de pools usando a API oficial da Orca.

**Referência da API original:**
- **[Pools API](https://api.orca.so/docs#tag/whirlpools/get/pools)** - Lista de pools
- **[Pool by Address](https://api.orca.so/docs#tag/whirlpools/get/pools/{address})** - Pool específica

**Parâmetros:**
- `sortBy` (opcional): Campo para ordenação (volume, liquidity, etc.)
- `sortDirection` (opcional): `asc` ou `desc`
- `poolId` (obrigatório para rota específica): ID da pool
- **Todos os parâmetros da API da Orca** são suportados automaticamente

#### Pool Details
```bash
GET /poolsdetails/:poolid?topPositions=10
```
Retorna dados completos de uma pool com análise detalhada de ticks e posições.

**Parâmetros:**
- `poolid` (obrigatório): Endereço da pool
- `topPositions` (opcional): número (ex: 10) para limitar a N posições com maior liquidez (0-1000). Se > 0, inclui posições

#### Position Details
```bash
GET /position/:nftMint
```
Retorna dados completos de uma posição específica no mesmo formato da rota de liquidez.

**Parâmetros:**
- `nftMint` (obrigatório): Endereço do NFT da posição

**Dados retornados:**
- `positionMint`: Endereço do NFT da posição
- `whirlpool`: Endereço da pool associada
- `tickLowerIndex`: Índice do tick inferior
- `tickUpperIndex`: Índice do tick superior
- `currentTick`: Tick atual da pool
- `liquidity`: Liquidez da posição
- `feeOwedA`: Taxas devidas do token A
- `feeOwedB`: Taxas devidas do token B
- `isInRange`: Se a posição está no range atual
- `currentPrice`: Preço atual (simplificado)
- `lowerPrice`: Preço inferior (simplificado)
- `upperPrice`: Preço superior (simplificado)
- `status`: Status da posição (active, below_range, above_range, out_of_range)
- `tickComparison`: Objeto com comparações detalhadas de ticks para visualização
- `lastUpdated`: Timestamp da última atualização

#### Top Positions
```bash
GET /top-positions?limit=10
```
Retorna as posições com maior liquidez no mesmo formato da rota position.

**Parâmetros:**
- `limit` (opcional): Número de posições a retornar (1-1000, padrão: 10)

**Dados retornados:**
- `positions`: Array de posições no mesmo formato da rota position
- `statistics`: Estatísticas das posições (total, lamports, etc.)
- `totalFound`: Total de posições encontradas na rede
- `limit`: Limite solicitado

**Dados retornados (Pool Details):**
- `allTicks`: Array de todos os ticks com dados detalhados
- `tickStats`: Estatísticas dos ticks e análise de range
- `tickStats.rangeAnalysis.ticksAroundCurrent`: Ticks próximos ao preço atual
- `tickStats.rangeAnalysis.liquidityConcentration`: Distribuição de liquidez
- `tickStats.currentPrice`: Preço atual ajustado
- `tickStats.liquidityDistribution`: Estatísticas de distribuição
- `positions`: Array de posições (se `showpositions=true`)
- `positionStats`: Estatísticas agregadas das posições

#### Top Positions
```bash
GET /top-positions?limit=10
```
Retorna as principais posições por volume ou liquidez.

**Parâmetros:**
- `limit` (opcional): Número de posições a retornar (padrão: 10)

#### Webhook (Helius)
```bash
POST /webhook/helius
```
Endpoint para receber webhooks da Helius com eventos de posições.

**Headers:**
- `Content-Type: application/json`
- `X-Helius-Signature`: Assinatura do webhook (se configurada)

#### Metrics (Produção)
```bash
GET /metrics
```
Retorna métricas do sistema (disponível apenas em produção).

**Exemplo de resposta da rota `/liquidity/:owner`:**
```json
{
  "timestamp": "2024-01-01T00:00:00.000Z",
  "method": "getLiquidityOverview",
  "rpcProvider": "helius",
  "wallet": "6PaZJLPmJPd3kVx4pBGAmndfTXsJS1tcuYhqvHFSZ4RY",
  "totalPositions": 3,
  "positions": [
    {
      "positionMint": "3xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
      "whirlpool": "Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE",
      "tickLowerIndex": -443700,
      "tickUpperIndex": -443600,
      "currentTick": -443636,
      "liquidity": "1000000000",
      "feeOwedA": "500000",
      "feeOwedB": "2500000",
      "isInRange": true,
      "status": "active",
      "tickComparison": {
        "currentTick": -443636,
        "tickLowerIndex": -443700,
        "tickUpperIndex": -443600,
        "tickRange": "-443700 to -443600",
        "tickSpread": 100,
        "distanceFromLower": 64,
        "distanceFromUpper": 36,
        "isBelowRange": false,
        "isAboveRange": false,
        "isInRange": true
      },
      "lastUpdated": "2024-01-11T12:00:00.000Z"
    }
  ],
  "summary": {
    "total_whirlpool_positions": 3,
    "active_positions": 2,
    "out_of_range_positions": 1,
    "active_percentage": "66.67%",
    "total_whirlpool_fees": {
      "tokenA": "1500000",
      "tokenB": "7500000"
    },
    "total_whirlpool_liquidity": "3000000000",
    "average_liquidity": "1000000000"
  },
  "success": true
}
```

## 🛠️ Instalação e Configuração

### Pré-requisitos
- **Node.js >= 20.17.0** (recomendado: 20.18.0+)
- **npm** (incluído com Node.js)
- **Chave de API da Helius** (recomendada para melhor performance)
- **PostgreSQL** (opcional, para dados persistentes)

### Instalação Rápida
```bash
# Clonar o repositório
git clone https://github.com/brokk-pools/defi-analytics.git
cd defi-analytics/backend

# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env
# Edite o arquivo .env com suas configurações
```

### Configuração de Ambiente
```bash
# RPC Configuration (Helius recomendado)
HELIUS_RPC=https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}
HELIUS_API_KEY=your_helius_api_key_here

# Server Configuration
PORT=3001
HOST=localhost
NODE_ENV=development

# Orca Configuration
ORCA_NETWORK=mainnet
ORCA_WHIRLPOOLS_PROGRAM_ID=whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc

# Database (opcional)
DATABASE_URL=postgres://user:password@localhost:5432/orca_mvp
```

### Execução
```bash
# Desenvolvimento (com hot reload)
npm run dev

# Produção
npm run build
npm start

# Debug (com debugger)
npm run dev:debug
```

### Verificação da Instalação
```bash
# Testar se o servidor está funcionando
curl http://localhost:3001/health

# Deve retornar status "ok" e métricas do sistema
```

## 📦 Dependências Principais

### 🔧 Core (Orca & Solana)
- **@orca-so/whirlpools-sdk** `^0.16.0`: SDK oficial do Orca para interação com pools
- **@orca-so/whirlpools** `^4.0.0`: Biblioteca principal do Orca Whirlpools
- **@orca-so/common-sdk** `^0.6.11`: SDK comum do Orca
- **@coral-xyz/anchor** `^0.29.0`: Framework Anchor para Solana
- **@solana/web3.js** `^1.98.4`: SDK oficial da Solana
- **@solana/spl-token** `^0.4.8`: Tokens SPL da Solana
- **@solana/kit** `^2.3.0`: Kit de utilitários Solana

### 🌐 APIs e Integração
- **Helius API**: Preços em tempo real via Pyth e Jupiter
- **Orca API**: Dados oficiais de pools e tokens
- **PostgreSQL**: Banco de dados para cache e persistência
- **Redis**: Cache para otimização de performance (opcional)

### 🛠️ Utilitários
- **decimal.js** `^10.6.0`: Cálculos precisos com decimais
- **winston** `^3.15.0`: Sistema de logging estruturado
- **express** `^5.1.0`: Framework web para APIs REST
- **helmet** `^8.0.0`: Segurança HTTP
- **cors** `^2.8.5`: Cross-Origin Resource Sharing
- **compression** `^1.7.4`: Compressão de respostas

### Backend (Express & Utils)
- **express** `^5.1.0`: Framework web moderno
- **winston** `^3.15.0`: Sistema de logging estruturado
- **helmet** `^8.0.0`: Segurança HTTP
- **cors** `^2.8.5`: Cross-Origin Resource Sharing
- **compression** `^1.7.4`: Compressão de respostas
- **express-rate-limit** `^7.4.1`: Rate limiting
- **express-session** `^1.18.1`: Gerenciamento de sessões
- **pg** `^8.16.3`: Cliente PostgreSQL
- **ioredis** `^5.4.1`: Cliente Redis
- **decimal.js** `^10.6.0`: Precisão decimal para cálculos financeiros

### Desenvolvimento
- **typescript** `^5.9.3`: Tipagem estática
- **tsx** `^4.20.6`: Execução de TypeScript
- **@types/***: Definições de tipos para todas as dependências

## 🎯 Casos de Uso para Frontend

### 1. Gráfico de Liquidez por Preço
Use `allTicks` com `priceAdjusted` e `liquidityGross` para criar visualizações de distribuição de liquidez.

### 2. Análise de Range Atual
Use `ticksAroundCurrent` para mostrar range próximo ao preço atual, destacando ticks ativos.

### 3. Estatísticas de Pool
Use `liquidityDistribution` para métricas gerais e concentração de liquidez.

### 4. Análise de Preços
Use `currentPrice` para preço atual e compare com `priceAdjusted` dos ticks.

### 5. Análise de Posições
Use `positions` e `positionStats` para análise de posições:
- **Status das posições**: `active` vs `out_of_range`
- **Fees acumulados**: `feeOwedA` e `feeOwedB` por posição
- **Liquidez por posição**: `liquidity` e `liquidityPercentage`
- **Range de preços**: `lowerPrice` e `upperPrice` vs `currentPrice`
- **Estatísticas agregadas**: `positionStats` com totais e percentuais

## 🔧 Arquitetura

### Estrutura de Arquivos
```
src/
├── lib/
│   ├── orca.ts          # Funções principais do Orca SDK
│   ├── logger.ts        # Sistema de logging
│   ├── security.ts      # Middleware de segurança
│   ├── errors.ts        # Tratamento de erros
│   ├── db.ts            # Configuração do banco de dados
│   ├── types.ts         # Definições de tipos TypeScript
│   ├── validation.ts    # Validação de variáveis de ambiente
│   └── vault.ts         # Funções de vault resolvers
├── routes/
│   ├── webhook.ts       # Webhook da Helius
│   ├── wallet.ts        # Posições por carteira
│   ├── position.ts      # Detalhes de posição específica
│   ├── liquidity.ts     # Overview de liquidez (SDK Orca)
│   ├── pools.ts         # Pools via API Orca
│   ├── pools-details.ts # Detalhes completos de pool
│   └── top-positions.ts # Top posições por volume/liquidez
└── index.ts             # Servidor principal
```

### Fluxo de Dados
1. **Requisição** → Middleware de segurança e rate limiting
2. **Validação** → Parâmetros e endereços
3. **SDK Orca** → Busca dados usando SDK oficial
4. **Processamento** → Cálculos de preços e estatísticas
5. **Resposta** → Dados estruturados para frontend

## 🚀 Exemplos de Uso

### 1. Overview de Liquidez de uma Carteira
```bash
# Buscar todas as posições de liquidez de uma carteira
curl "http://localhost:3001/liquidity/6PaZJLPmJPd3kVx4pBGAmndfTXsJS1tcuYhqvHFSZ4RY"

# Salvar resultado em arquivo
curl "http://localhost:3001/liquidity/6PaZJLPmJPd3kVx4pBGAmndfTXsJS1tcuYhqvHFSZ4RY?saveFile=true"
```

### 2. Detalhes Completos de uma Pool
```bash
# Dados básicos da pool (sem posições)
curl "http://localhost:3001/poolsdetails/Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE"

# Incluir apenas as top 10 posições (mais leve)
curl "http://localhost:3001/poolsdetails/Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE?topPositions=10"

# Incluir apenas as top 20 posições
curl "http://localhost:3001/poolsdetails/Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE?topPositions=20"
```

### 3. Detalhes de uma Posição Específica
```bash
# Buscar dados completos de uma posição (mesmo formato da rota de liquidez)
curl "http://localhost:3001/position/77mnr1C294q2eHSuxxaM3R44ZWwJ89FztcwDB3EcaBR"

# Exemplo de resposta (formato idêntico à rota de liquidez):
# {
#   "positionMint": "77mnr1C294q2eHSuxxaM3R44ZWwJ89FztcwDB3EcaBR",
#   "whirlpool": "FwewVm8u6tFPGewAyHmWAqad9hmF7mvqxK4mJ7iNqqGC",
#   "tickLowerIndex": -15294,
#   "tickUpperIndex": -14782,
#   "currentTick": -17001,
#   "liquidity": "370987889",
#   "feeOwedA": "0",
#   "feeOwedB": "0",
#   "isInRange": false,
#   "status": "below_range",
#   "tickComparison": { ... }
# }
```

### 4. Top Positions (Maiores Posições por Liquidez)
```bash
# Buscar top 10 posições com maior liquidez
curl "http://localhost:3001/top-positions?limit=10"

# Buscar top 50 posições
curl "http://localhost:3001/top-positions?limit=50"

# Exemplo de resposta:
# {
#   "timestamp": "2025-01-11T...",
#   "method": "getTopPositionsData",
#   "limit": 10,
#   "totalFound": 12345,
#   "success": true,
#   "data": {
#     "positions": [
#       {
#         "positionMint": "...",
#         "whirlpool": "...",
#         "tickLowerIndex": -1000,
#         "tickUpperIndex": 1000,
#         "currentTick": 500,
#         "liquidity": "1000000000",
#         "feeOwedA": "1000",
#         "feeOwedB": "2000",
#         "isInRange": true,
#         "status": "active",
#         "tickComparison": { ... }
#       }
#     ],
#     "statistics": {
#       "totalPositions": 12345,
#       "totalLamports": 5000000000,
#       "averageLamports": 405000,
#       "maxLamports": 10000000,
#       "minLamports": 100000
#     }
#   }
# }
```

### 5. Posições de uma Carteira
```bash
# Buscar posições de uma carteira específica (mesmo formato das outras rotas)
curl "http://localhost:3001/wallet/6PaZJLPmJPd3kVx4pBGAmndfTXsJS1tcuYhqvHFSZ4RY"

# Exemplo de resposta (formato idêntico à rota de liquidez):
# {
#   "timestamp": "2025-01-11T...",
#   "method": "getLiquidityOverview",
#   "rpcProvider": "mainnet",
#   "owner": "6PaZJLPmJPd3kVx4pBGAmndfTXsJS1tcuYhqvHFSZ4RY",
#   "success": true,
#   "data": {
#     "positions": [
#       {
#         "positionMint": "77mnr1C294q2eHSuxxaM3R44ZWwJ89FztcwDB3EcaBR",
#         "whirlpool": "FwewVm8u6tFPGewAyHmWAqad9hmF7mvqxK4mJ7iNqqGC",
#         "tickLowerIndex": -15294,
#         "tickUpperIndex": -14782,
#         "currentTick": -17001,
#         "liquidity": "370987889",
#         "feeOwedA": "0",
#         "feeOwedB": "0",
#         "isInRange": false,
#         "status": "below_range",
#         "tickComparison": { ... }
#       }
#     ],
#     "summary": {
#       "totalPositions": 1,
#       "activePositions": 0,
#       "outOfRangePositions": 1,
#       "totalLiquidity": "370987889"
#     }
#   }
# }
```

### 6. Detalhes de uma Posição Específica
```bash
# Buscar detalhes de uma posição usando o NFT mint
curl "http://localhost:3001/position/3xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
```

### 5. Pools da Orca
```bash
# Listar todas as pools
curl "http://localhost:3001/pools"

# Buscar pool específica
curl "http://localhost:3001/pools/Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE"

# Ordenar por volume
curl "http://localhost:3001/pools?sortBy=volume&sortDirection=desc"
```

### 6. Top Posições
```bash
# Top 10 posições
curl "http://localhost:3001/top-positions?limit=10"

# Top 50 posições
curl "http://localhost:3001/top-positions?limit=50"
```

### 7. Health Check e Métricas
```bash
# Status do serviço
curl "http://localhost:3001/health"

# Métricas (apenas em produção)
curl "http://localhost:3001/metrics"
```

### Benefícios dos Parâmetros de Performance
- **`topPositions=0` (padrão)**: Resposta mais rápida, apenas dados da pool
- **`topPositions=N`**: Foca nas N posições com maior liquidez
- **Escalabilidade**: Funciona bem mesmo com pools com milhares de posições

## 🚀 Performance

### Otimizações Implementadas
- **Rate limiting** para evitar sobrecarga
- **Compressão** de respostas HTTP
- **Cache** de dados de pools quando possível
- **Paralelização** de consultas quando apropriado
- **Fallback** para RPC básico se SDK falhar

### Monitoramento
- **Health check** com métricas do sistema
- **Logging** estruturado com Winston
- **Error tracking** com contexto detalhado

## 📝 Logs

O sistema usa Winston para logging estruturado:
- **Info**: Operações normais
- **Warn**: Situações de atenção
- **Error**: Erros e exceções
- **Debug**: Informações detalhadas (desenvolvimento)

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença ISC. Veja o arquivo `LICENSE` para mais detalhes.

## 🎯 Exemplos de Uso Prático

### 📊 Análise de Portfolio Completa
```bash
# 1. Verificar saúde do sistema
curl http://localhost:3001/health

# 2. Buscar todas as posições de uma carteira
curl "http://localhost:3001/liquidity/6PaZJLPmJPd3kVx4pBGAmndfTXsJS1tcuYhqvHFSZ4RY"

# 3. Analisar ROI detalhado de uma pool específica
curl "http://localhost:3001/brokk-analytics/Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE/6PaZJLPmJPd3kVx4pBGAmndfTXsJS1tcuYhqvHFSZ4RY"

# 4. Ver detalhes de uma posição específica
curl "http://localhost:3001/position/77mnr1C294q2eHSuxxaM3R44ZWwJ89FztcwDB3EcaBR"

# 5. Encontrar as top posições da rede
curl "http://localhost:3001/top-positions?limit=20"
```

### 💰 Análise Financeira Avançada
```bash
# Análise com período específico
curl "http://localhost:3001/brokk-analytics/Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE/6PaZJLPmJPd3kVx4pBGAmndfTXsJS1tcuYhqvHFSZ4RY?startUtc=2024-01-01T00:00:00Z&endUtc=2024-01-31T23:59:59Z&showHistory=true"

# Análise de posição específica
curl "http://localhost:3001/brokk-analytics/Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE/6PaZJLPmJPd3kVx4pBGAmndfTXsJS1tcuYhqvHFSZ4RY?positionId=77mnr1C294q2eHSuxxaM3R44ZWwJ89FztcwDB3EcaBR"
```

### 🔍 Exploração de Pools
```bash
# Listar todas as pools
curl "http://localhost:3001/pools"

# Detalhes completos de uma pool com top posições
curl "http://localhost:3001/poolsdetails/Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE?topPositions=10"

# Análise de fees de uma posição
curl "http://localhost:3001/fees/Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE/6PaZJLPmJPd3kVx4pBGAmndfTXsJS1tcuYhqvHFSZ4RY"
```

## 🆘 Suporte

- **Documentação Orca**: https://docs.orca.so/
- **Discord Orca**: https://discord.gg/orcaprotocol
- **Issues**: Use o sistema de issues do GitHub

## 🔄 Changelog

### v1.7.1 (Atual)
- ✅ **Correção crítica na detecção de fees coletadas** - agora detecta corretamente ambos os tokens (A e B)
- ✅ **Melhoria na análise de transações** - busca por owner em vez de ATAs para melhor performance
- ✅ **Detecção via logs do Anchor** - usa `"Instruction: CollectFees"` para identificar transações relevantes
- ✅ **Análise de inner instructions** - detecta transferências dos vaults da pool independente do destino
- ✅ **Documentação atualizada** com detalhes sobre o novo algoritmo de detecção de fees

### v1.7.0
- ✅ **Provedor de preços Helius implementado** com integração Pyth/Jupiter
- ✅ **Suporte a preços históricos** com timestamp específico
- ✅ **Funções utilitárias** para buscar preços de tokens e pares
- ✅ **Configuração Helius API** para preços em tempo real
- ✅ **Documentação completamente atualizada** com exemplos detalhados
- ✅ **Estrutura de APIs melhorada** com descrições e parâmetros detalhados
- ✅ **Exemplos de uso** para todas as rotas principais

### v1.6.0
- ✅ **Rota brokk-analytics refatorada** para remover dependência de provedor de preços
- ✅ **Arquivo BrokkFinancePools.ts renomeado** para brokkfinancepools.ts (minúsculo)
- ✅ **Simplificação da rota brokk-analytics** removendo rpcUrl e deixando provedor para brokkfinancepools
- ✅ **Uso consistente do orca.ts** em todas as rotas de análise
- ✅ **Documentação atualizada** refletindo mudanças na rota brokk-analytics

### v1.5.0
- ✅ **Rota wallet refatorada** para usar getLiquidityOverview e retornar formato padronizado
- ✅ **Consistência total** entre todas as rotas de posição: `/wallet`, `/liquidity`, `/position`, `/top-positions`
- ✅ **Simplificação da rota wallet** de 116 para 76 linhas com lógica centralizada
- ✅ **Documentação atualizada** com exemplo de resposta da rota wallet
- ✅ **Tratamento de erros melhorado** com mensagens específicas para carteiras

### v1.4.0
- ✅ **Rota top-positions refatorada** com toda lógica de negócio migrada para orca.ts
- ✅ **Consistência de dados** entre rotas `/top-positions`, `/position/:nftMint` e `/liquidity/:owner`
- ✅ **Função getTopPositionsData** criada para centralizar lógica de busca de top positions
- ✅ **Processamento padronizado** usando processPositionDataFromRaw para mesmo formato
- ✅ **Documentação atualizada** com nova rota top-positions e exemplos de uso
- ✅ **Otimização de performance** com processamento em lotes para grandes volumes

### v1.3.0
- ✅ **Rota position refatorada** para retornar exatamente o mesmo formato da rota de liquidez
- ✅ **Consistência de dados** entre rotas `/position/:nftMint` e `/liquidity/:owner`
- ✅ **Função processPositionData** criada para padronizar o processamento de posições
- ✅ **Documentação atualizada** com detalhes completos dos campos retornados
- ✅ **Exemplos de resposta** adicionados na documentação
- ✅ **Tratamento de erros melhorado** com mensagens específicas para diferentes cenários

### v1.2.0
- ✅ **README atualizado** com informações básicas e referência à documentação da API
- ✅ **Instruções de instalação melhoradas** com comandos atualizados
- ✅ **Dependências atualizadas** com versões específicas
- ✅ **Configuração de ambiente** mais detalhada
- ✅ **Verificação de instalação** com comandos de teste

### v1.1.0
- ✅ **Refatoração completa da rota `/liquidity`** com SDK oficial do Orca
- ✅ **Função `createRpcConnection()` reutilizável** para conexões RPC
- ✅ **Função `convertBigIntToString()` utilitária** movida para `orca.ts`
- ✅ **Cálculo preciso de in-range/out-of-range** com dados de tick comparison
- ✅ **Mensagens traduzidas para inglês** em todas as rotas
- ✅ **Rota `positions-by-owner` removida** (duplicação eliminada)
- ✅ **Configuração PostgreSQL corrigida** para evitar erros SASL/SCRAM
- ✅ **Melhor tratamento de erros e logging** estruturado
- ✅ **Dados de `tickComparison`** para visualizações frontend
- ✅ **Documentação completa da API** com exemplos práticos

### v1.0.0
- ✅ Integração completa com @orca-so/whirlpools-sdk
- ✅ Rota `/poolsdetails/:poolid` com análise de ticks
- ✅ Dados detalhados para visualizações de range
- ✅ Parâmetro `showpositions` e `topPositions` para controle de performance
- ✅ Cálculo de preços ajustados para diferentes tokens
- ✅ Estatísticas de liquidez e concentração
- ✅ Sistema de logging e monitoramento
- ✅ Rate limiting e segurança
- ✅ Rotas: `/wallet`, `/position`, `/liquidity`, `/pools`, `/poolsdetails`, `/top-positions`, `/webhook`, `/fees`, `/brokk-analytics`

#### 💰 Brokk Analytics (Análise Financeira Completa)
```bash
GET /brokk-analytics/:poolId/:owner?positionId=xxx&startUtc=2024-01-01T00:00:00Z&endUtc=2024-01-31T23:59:59Z&showHistory=true
```
**Descrição:** Análise financeira completa do desempenho de LP na Orca Whirlpools (estilo Revert Finance).

**Parâmetros:**
- `poolId` (obrigatório): Endereço da pool Whirlpool
- `owner` (obrigatório): Endereço da carteira do owner
- `positionId` (opcional): Identificador da posição específica (NFT mint)
- `startUtc` (opcional): Data de início para análise histórica (ISO 8601)
- `endUtc` (opcional): Data de fim para análise histórica (ISO 8601)
- `showHistory` (opcional): Incluir histórico detalhado de transações

**Funcionalidades:**
- **ROI e APR** calculados com precisão via Helius API
- **Análise de fees** coletadas e pendentes
- **Cálculo de PnL** (Profit and Loss) detalhado
- **Análise de impermanent loss**
- **Rastreamento de custos de gas**
- **Métricas agregadas** entre múltiplas posições
- **Análise histórica** com valorização USD adequada

**Exemplos:**
```bash
# Análise ROI completa para todas as posições do owner na pool
curl "http://localhost:3001/brokk-analytics/Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE/2mu3kyTmEvdjPUeb9CPHMqDWT7jZEWqiyqtrJyMHHhuc"

# Análise ROI para uma posição específica
curl "http://localhost:3001/brokk-analytics/Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE/2mu3kyTmEvdjPUeb9CPHMqDWT7jZEWqiyqtrJyMHHhuc?positionId=6TKDPz14cZZ6yGAEzqB7GodX8R32zf5NcnnZeRovCbQH"

# Análise ROI com período específico e histórico
curl "http://localhost:3001/brokk-analytics/Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE/2mu3kyTmEvdjPUeb9CPHMqDWT7jZEWqiyqtrJyMHHhuc?startUtc=2025-10-01T00:00:00Z&endUtc=2025-10-12T23:59:59Z&showHistory=true"
```

**Dados retornados:**
- `positions[]`: Array de análise financeira por posição
- `range`: Faixa de preço (min/max/atual) para a posição
- `investment`: Valores de investimento inicial e valores USD na época do depósito
- `current`: Quantidades atuais de tokens e valores USD
- `fees`: Fees coletadas, não coletadas, reinvestidas e totais em USD
- `rewards`: Rewards não reivindicados e reivindicados em USD
- `withdrawn`: Saques de principal em USD
- `gas`: Custos de gas em SOL e USD
- `pnlExcludingGasUSDT`: Lucro/Perda excluindo custos de gas
- `roiPct`: Percentual de Retorno sobre Investimento
- `aprPct`: Taxa Percentual Anualizada
- `divergenceLossUSDT`: Perda Impermanente (valor LP vs valor HODL)
- `aggregated`: Soma de todas as métricas das posições

**Notas importantes:**
- Integra com funções existentes do orca.ts (getOutstandingFeesForPosition, feesCollectedInRange)
- Usa provedor de preços básico para testes (configurável para produção)
- Calcula métricas financeiras completas incluindo PnL, ROI, APR e IL
- Suporte para análise de posição única ou agregação de múltiplas posições
- Análise histórica com valorização USD adequada por timestamp
