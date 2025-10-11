# Orca Whirlpools MVP Backend

Backend para análise e visualização de dados de pools do Orca Whirlpools na rede Solana Mainnet.

## 📚 Documentação da API

Para documentação completa da API com exemplos detalhados, parâmetros e respostas, consulte:
**[📖 Documentação Completa da API](./README.md#-apis-e-endpoints)**

## 🎯 Visão Geral

Este backend fornece APIs RESTful para análise de dados do Orca Whirlpools, incluindo:
- Análise de pools e posições de liquidez
- Dados de ticks para visualizações de range
- Overview consolidado de posições por carteira
- Integração com SDK oficial do Orca
- Webhooks da Helius para atualizações em tempo real

## ⚡ Quick Start

```bash
# 1. Clone e instale
git clone https://github.com/brokk-pools/defi-analytics.git
cd defi-analytics/backend
npm install

# 2. Configure (opcional - funciona sem API key)
cp .env.example .env
# Edite .env com sua HELIUS_API_KEY para melhor performance

# 3. Execute
npm run dev

# 4. Teste
curl http://localhost:3001/health
curl http://localhost:3001/liquidity/6PaZJLPmJPd3kVx4pBGAmndfTXsJS1tcuYhqvHFSZ4RY
```

**🎯 Pronto!** O servidor estará rodando em `http://localhost:3001` com todas as APIs disponíveis.

## 🚀 Funcionalidades

### 📊 Análise de Pools
- **Dados completos de pools** com informações detalhadas de ticks e liquidez
- **Análise de range** para visualizações de concentração de liquidez
- **Estatísticas de liquidez** com métricas de distribuição
- **Cálculo de preços precisos** ajustados para diferentes tokens

### 🎯 Posições e Liquidez
- **Busca de posições por proprietário** usando SDK oficial do Orca
- **Dados detalhados de posições** com informações de fees e rewards
- **Overview de liquidez** consolidando diferentes tipos de posições
- **Detecção de classic LPs** e vaults

### 🔍 APIs e Endpoints

#### Health Check
```bash
GET /health
```
Retorna status do serviço e métricas do sistema.

#### Wallet Positions
```bash
GET /wallet/:publicKey
```
Busca posições de liquidez para uma carteira específica.

**Parâmetros:**
- `publicKey` (obrigatório): Endereço da carteira Solana

#### Position Details
```bash
GET /position/:nftMint
```
Retorna detalhes de uma posição específica usando o NFT mint.

**Parâmetros:**
- `nftMint` (obrigatório): Endereço do NFT da posição

#### Liquidity Overview
```bash
GET /liquidity/:owner?saveFile=true
```
Retorna overview consolidado de todas as posições de liquidez do proprietário usando SDK oficial do Orca.

**Parâmetros:**
- `owner` (obrigatório): Endereço da carteira
- `saveFile` (opcional): `true` para salvar resultado em arquivo JSON

**Dados retornados:**
- `positions`: Array de posições com dados detalhados
- `summary`: Estatísticas consolidadas
- `tickComparison`: Dados de comparação de ticks para visualização
- `isInRange`: Status de cada posição (ativa/fora do range)

#### Pools (API Orca)
```bash
GET /pools?sortBy=volume&sortDirection=desc
GET /pools/:poolId
```
Busca dados de pools usando a API oficial da Orca.

**Parâmetros:**
- `sortBy` (opcional): Campo para ordenação (volume, liquidity, etc.)
- `sortDirection` (opcional): `asc` ou `desc`
- `poolId` (obrigatório para rota específica): ID da pool

#### Pool Details
```bash
GET /poolsdetails/:poolid?showpositions=true&topPositions=10&saveFile=true
```
Retorna dados completos de uma pool com análise detalhada de ticks e posições.

**Parâmetros:**
- `poolid` (obrigatório): Endereço da pool
- `showpositions` (opcional): `true` para incluir posições, qualquer outro valor para omitir
- `topPositions` (opcional): número (ex: 10) para limitar a N posições com maior liquidez (0-1000)
- `saveFile` (opcional): `true` para salvar resultado em arquivo JSON

**Dados retornados:**
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
      "whirlpool": "2mu3kyTmEvdjPUeb9CPHMqDWT7jZEWqiyqtrJyMHHhuc",
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

### Core (Orca & Solana)
- **@orca-so/whirlpools-sdk** `^0.16.0`: SDK oficial do Orca para interação com pools
- **@orca-so/whirlpools** `^4.0.0`: Biblioteca principal do Orca Whirlpools
- **@orca-so/common-sdk** `^0.6.11`: SDK comum do Orca
- **@coral-xyz/anchor** `^0.29.0`: Framework Anchor para Solana
- **@solana/web3.js** `^1.98.4`: SDK oficial da Solana
- **@solana/spl-token** `^0.4.14`: Tokens SPL da Solana
- **@solana/kit** `^2.3.0`: Kit de utilitários Solana

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
curl "http://localhost:3001/poolsdetails/2mu3kyTmEvdjPUeb9CPHMqDWT7jZEWqiyqtrJyMHHhuc"

# Incluir todas as posições
curl "http://localhost:3001/poolsdetails/2mu3kyTmEvdjPUeb9CPHMqDWT7jZEWqiyqtrJyMHHhuc?showpositions=true"

# Incluir apenas as top 10 posições (mais leve)
curl "http://localhost:3001/poolsdetails/2mu3kyTmEvdjPUeb9CPHMqDWT7jZEWqiyqtrJyMHHhuc?showpositions=true&topPositions=10"

# Salvar resultado em arquivo
curl "http://localhost:3001/poolsdetails/2mu3kyTmEvdjPUeb9CPHMqDWT7jZEWqiyqtrJyMHHhuc?showpositions=true&topPositions=20&saveFile=true"
```

### 3. Posições de uma Carteira
```bash
# Buscar posições de uma carteira específica
curl "http://localhost:3001/wallet/6PaZJLPmJPd3kVx4pBGAmndfTXsJS1tcuYhqvHFSZ4RY"
```

### 4. Detalhes de uma Posição Específica
```bash
# Buscar detalhes de uma posição usando o NFT mint
curl "http://localhost:3001/position/3xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
```

### 5. Pools da Orca
```bash
# Listar todas as pools
curl "http://localhost:3001/pools"

# Buscar pool específica
curl "http://localhost:3001/pools/2mu3kyTmEvdjPUeb9CPHMqDWT7jZEWqiyqtrJyMHHhuc"

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
- **`showpositions=false`**: Resposta mais rápida, apenas dados da pool
- **`topPositions=N`**: Foca nas N posições com maior liquidez
- **`saveFile=true`**: Salva resultado em arquivo JSON para análise offline
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

## 🆘 Suporte

- **Documentação Orca**: https://docs.orca.so/
- **Discord Orca**: https://discord.gg/orcaprotocol
- **Issues**: Use o sistema de issues do GitHub

## 🔄 Changelog

### v1.2.0 (Atual)
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
- ✅ Rotas: `/wallet`, `/position`, `/liquidity`, `/pools`, `/poolsdetails`, `/top-positions`, `/webhook`
