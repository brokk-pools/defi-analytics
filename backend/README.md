# Orca Whirlpools MVP Backend

Backend para análise e visualização de dados de pools do Orca Whirlpools na rede Solana.

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

#### Pools Details
```bash
GET /poolsdetails/:poolid?showpositions=true&topPositions=10&saveFile=true
```

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

**Exemplo de resposta:**
```json
{
  "timestamp": "2024-01-01T00:00:00.000Z",
  "method": "getFullPoolData",
  "poolId": "2mu3kyTmEvdjPUeb9CPHMqDWT7jZEWqiyqtrJyMHHhuc",
  "showPositions": true,
  "success": true,
  "data": {
    "includePositions": true,
    "main": {
      "address": "2mu3kyTmEvdjPUeb9CPHMqDWT7jZEWqiyqtrJyMHHhuc",
      "tokenA": "So11111111111111111111111111111111111111112",
      "tokenB": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      "liquidity": "1000000000",
      "tickSpacing": 64,
      "feeRate": 300,
      "sqrtPrice": "79228162514264337593543950336",
      "tickCurrentIndex": -443636
    },
    "allTicks": [
      {
        "tickIndex": -443636,
        "liquidityNet": "1000000",
        "liquidityGross": "2000000",
        "price": 0.0001,
        "priceAdjusted": 100.0,
        "feeGrowthOutsideA": "0",
        "feeGrowthOutsideB": "0"
      }
    ],
    "tickStats": {
      "currentTickIndex": -443636,
      "currentPrice": 100.0,
      "totalInitializedTicks": 150,
      "liquidityDistribution": {
        "totalLiquidityGross": "300000000",
        "averageLiquidityGross": "2000000",
        "maxLiquidityGross": "10000000",
        "minLiquidityGross": "100000"
      },
      "rangeAnalysis": {
        "ticksAroundCurrent": [
          {
            "tickIndex": -443636,
            "priceAdjusted": 100.0,
            "liquidityGross": "2000000",
            "distanceFromCurrent": 0
          }
        ],
        "liquidityConcentration": [
          {
            "tickIndex": -443636,
            "priceAdjusted": 100.0,
            "liquidityGross": "2000000",
            "isActive": true
          }
        ]
      }
    },
    "positions": [
      {
        "pubkey": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
        "positionMint": "3xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
        "whirlpool": "2mu3kyTmEvdjPUeb9CPHMqDWT7jZEWqiyqtrJyMHHhuc",
        "tickLowerIndex": -443700,
        "tickUpperIndex": -443600,
        "liquidity": "1000000000",
        "liquidityPercentage": "0.15%",
        "feeOwedA": "500000",
        "feeOwedB": "2500000",
        "feeGrowthCheckpointA": "1000000000",
        "feeGrowthCheckpointB": "2000000000",
        "isInRange": true,
        "lowerPrice": 99.5,
        "upperPrice": 100.5,
        "currentPrice": 100.0,
        "feeRate": 300,
        "protocolFeeRate": 300,
        "status": "active",
        "hasRewards": true,
        "rewardCount": 2,
        "lastUpdated": "2024-01-11T12:00:00.000Z"
      }
    ],
    "positionStats": {
      "totalPositions": 150,
      "activePositions": 120,
      "outOfRangePositions": 30,
      "activePercentage": "80.00%",
      "totalLiquidity": "100000000000",
      "totalFees": {
        "tokenA": "50000000",
        "tokenB": "250000000"
      },
      "averageLiquidity": "666666666",
      "positionsWithRewards": 45,
      "rewardPositionsPercentage": "30.00%"
    },
    "totalPositions": 150
  }
}
```

#### Posições por Proprietário
```bash
GET /positionsByOwner/:owner?saveFile=true
```

**Parâmetros:**
- `owner` (obrigatório): Endereço da carteira
- `saveFile` (opcional): `true` para salvar resultado em arquivo

#### Overview de Liquidez
```bash
GET /liquidity/:owner
```

Retorna overview consolidado de todas as posições de liquidez do proprietário.

#### Pools (API Orca)
```bash
GET /pools?sortBy=volume&sortDirection=desc
GET /pools/:poolId
```

Busca dados de pools usando a API oficial da Orca.

#### Top Posições
```bash
GET /top-positions?limit=10
```

Retorna as principais posições por volume ou liquidez.

## 🛠️ Instalação e Configuração

### Pré-requisitos
- Node.js >= 20.17.0
- npm ou yarn
- Chave de API da Helius (opcional, mas recomendada)

### Instalação
```bash
# Clonar o repositório
git clone <repository-url>
cd orca-whirlpools-mvp/backend

# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env
```

### Variáveis de Ambiente
```bash
# RPC Configuration
HELIUS_RPC=https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}
HELIUS_API_KEY=your_helius_api_key

# Server Configuration
PORT=3001
HOST=localhost
NODE_ENV=development

# Orca Configuration
ORCA_NETWORK=mainnet
ORCA_WHIRLPOOLS_PROGRAM_ID=whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc
```

### Execução
```bash
# Desenvolvimento
npm run dev

# Produção
npm run build
npm start

# Debug
npm run dev:debug
```

## 📦 Dependências Principais

### Core
- **@orca-so/whirlpools-sdk**: SDK oficial do Orca para interação com pools
- **@orca-so/common-sdk**: SDK comum do Orca
- **@coral-xyz/anchor**: Framework Anchor para Solana
- **@solana/web3.js**: SDK oficial da Solana
- **@solana/spl-token**: Tokens SPL da Solana

### Backend
- **express**: Framework web
- **winston**: Sistema de logging
- **helmet**: Segurança HTTP
- **cors**: Cross-Origin Resource Sharing
- **compression**: Compressão de respostas
- **express-rate-limit**: Rate limiting

### Desenvolvimento
- **typescript**: Tipagem estática
- **tsx**: Execução de TypeScript
- **@types/***: Definições de tipos

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
│   └── errors.ts        # Tratamento de erros
├── routes/
│   ├── pools-details.ts # Rota de detalhes de pools
│   ├── positions-by-owner.ts # Rota de posições
│   ├── liquidity.ts     # Rota de liquidez
│   └── pools.ts         # Rota de pools (API Orca)
└── index.ts             # Servidor principal
```

### Fluxo de Dados
1. **Requisição** → Middleware de segurança e rate limiting
2. **Validação** → Parâmetros e endereços
3. **SDK Orca** → Busca dados usando SDK oficial
4. **Processamento** → Cálculos de preços e estatísticas
5. **Resposta** → Dados estruturados para frontend

## 🚀 Exemplos de Uso

### Parâmetros de Performance
```bash
# Incluir todas as posições (comportamento padrão)
GET /poolsdetails/2mu3kyTmEvdjPUeb9CPHMqDWT7jZEWqiyqtrJyMHHhuc?showpositions=true

# Incluir apenas as top 10 posições (mais leve)
GET /poolsdetails/2mu3kyTmEvdjPUeb9CPHMqDWT7jZEWqiyqtrJyMHHhuc?showpositions=true&topPositions=10

# Incluir apenas as top 5 posições
GET /poolsdetails/2mu3kyTmEvdjPUeb9CPHMqDWT7jZEWqiyqtrJyMHHhuc?showpositions=true&topPositions=5

# Omitir posições completamente (mais rápido)
GET /poolsdetails/2mu3kyTmEvdjPUeb9CPHMqDWT7jZEWqiyqtrJyMHHhuc?showpositions=false

# Combinar com saveFile
GET /poolsdetails/2mu3kyTmEvdjPUeb9CPHMqDWT7jZEWqiyqtrJyMHHhuc?showpositions=true&topPositions=20&saveFile=true
```

### Benefícios do topPositions
- **Performance**: Reduz drasticamente o tempo de resposta
- **Dados relevantes**: Foca nas posições com maior liquidez
- **Flexibilidade**: Permite ajustar o número conforme necessário
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

### v1.0.0
- ✅ Integração completa com @orca-so/whirlpools-sdk
- ✅ Rota `/poolsdetails/:poolid` com análise de ticks
- ✅ Dados detalhados para visualizações de range
- ✅ Parâmetro `showpositions` para controle de performance
- ✅ Cálculo de preços ajustados para diferentes tokens
- ✅ Estatísticas de liquidez e concentração
- ✅ Sistema de logging e monitoramento
- ✅ Rate limiting e segurança
