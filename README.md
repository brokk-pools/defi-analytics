# Orca Whirlpools Analytics Platform

Uma plataforma completa de **Analytics DeFi** para **Orca Whirlpools** na rede **Solana**, fornecendo insights financeiros detalhados sobre posições de liquidez, cálculo de fees, análise de ROI e métricas de performance.

## 🎯 Visão Geral

Esta plataforma oferece uma API robusta para análise financeira de posições de liquidez no protocolo Orca Whirlpools, similar ao Revert Finance, mas especificamente otimizada para a Solana. O sistema utiliza **RPC Helius** e o **SDK oficial da Orca** para fornecer dados precisos e em tempo real.

### 🏗️ Arquitetura

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React Frontend │    │  Express Backend │    │  PostgreSQL DB  │
│   (Em Desenvolvimento) │◄──►│   (Node.js TS)   │◄──►│    (Docker)     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                               ▲
                               │
                    ┌──────────────────┐
                    │  Helius RPC      │
                    │  Orca SDK        │
                    │  (Solana)        │
                    └──────────────────┘
```

## 🚀 Tecnologias Principais

- **Blockchain**: Solana (Devnet/Mainnet)
- **RPC Provider**: Helius (alta performance e confiabilidade)
- **SDK**: Orca Whirlpools SDK oficial
- **Backend**: Node.js + TypeScript + Express
- **Database**: PostgreSQL
- **Frontend**: React + TypeScript + Vite (em desenvolvimento)

## 📊 Funcionalidades Principais

### 💰 **Análise de Fees**
- **Fees Pendentes**: Cálculo em tempo real de fees não coletadas
- **Fees Coletadas**: Histórico completo de fees já coletadas
- **Análise Temporal**: Consultas por período específico
- **Múltiplas Posições**: Suporte para análise agregada

### 📈 **Analytics Financeiro (Brokk Analytics)**
- **ROI Completo**: Análise de retorno sobre investimento
- **PnL Tracking**: Acompanhamento de lucros e perdas
- **APR Calculation**: Taxa percentual anualizada
- **Impermanent Loss**: Análise de perda impermanente
- **Gas Cost Tracking**: Rastreamento de custos de transação

### 🎯 **Gestão de Posições**
- **Monitoramento de Range**: Status in-range/out-of-range
- **Liquidity Tracking**: Acompanhamento de liquidez
- **Reward Analysis**: Análise de rewards e incentivos
- **Position History**: Histórico completo de operações

## 🔧 Quick Start

### Pré-requisitos
- Node.js 20+
- Docker & Docker Compose
- Helius API Key (tier gratuito disponível)

### 1. Configuração Inicial
```bash
git clone <repository-url>
cd orca-whirlpools-mvp
```

### 2. Banco de Dados
```bash
cd infra
docker compose up -d
```

### 3. Backend
```bash
cd ../backend
cp .env.example .env
# Configure sua Helius API key no .env
npm install
npm run dev
```

### 4. Frontend (Em Desenvolvimento)
```bash
cd ../frontend
npm install
npm run dev
# ⚠️ Frontend ainda está em desenvolvimento
```

## 📡 API Endpoints Principais

### 🏥 Health Check
```
GET /health
```

### 💰 Fees Analytics
```
GET /fees/:poolId/:owner                    # Fees pendentes (todas as posições)
GET /fees/position/:positionId/:poolId      # Fees pendentes (posição específica)
GET /fees/collected/:poolId/:owner          # Fees coletadas (histórico)
```

### 📊 Brokk Analytics (ROI Analysis)
```
GET /brokk-analytics/:poolId/:owner         # Análise financeira completa
```

### 🎯 Position Management
```
GET /wallet/:publicKey                      # Posições de uma carteira
GET /position/:nftMint                      # Detalhes de uma posição
GET /liquidity/:publicKey                   # Overview de liquidez
```

### 🏊 Pool Information
```
GET /pools                                  # Lista de pools
GET /pools/:poolId                          # Detalhes de uma pool
GET /poolsdetails/:poolId                   # Informações detalhadas
```

## 🔑 Configuração de Ambiente

### Backend (.env)
```bash
PORT=3001
HELIUS_API_KEY=your_helius_api_key_here
HELIUS_RPC=https://devnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}
DATABASE_URL=postgres://orca:orca@localhost:5432/orcadata
ORCA_WHIRLPOOLS_PROGRAM_ID=whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc
```

### Frontend (.env)
```bash
VITE_API_URL=http://localhost:3001
```

## 📖 Documentação Detalhada

Para documentação técnica completa, exemplos de uso, schemas de resposta e guias de integração, consulte:

### 📚 **[Backend Documentation](./backend/README.md)**
- Documentação completa da API
- Exemplos de requisições e respostas
- Schemas de banco de dados
- Guias de configuração
- Troubleshooting

### 🔧 **Arquivos de Configuração**
- [TypeScript Config](./backend/tsconfig.json)
- [Package.json](./backend/package.json)
- [Dockerfile](./backend/Dockerfile)

### 💻 **Código Fonte**
- [Routes](./backend/src/routes/) - Endpoints da API
- [Lib](./backend/src/lib/) - Utilitários e integrações
- [Types](./backend/src/lib/types.ts) - Definições TypeScript

## 🧪 Testando a API

```bash
# Health check
curl http://localhost:3001/health

# Fees para uma carteira
curl "http://localhost:3001/fees/Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE/2mu3kyTmEvdjPUeb9CPHMqDWT7jZEWqiyqtrJyMHHhuc"

# Brokk Analytics (ROI completo)
curl "http://localhost:3001/brokk-analytics/Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE/2mu3kyTmEvdjPUeb9CPHMqDWT7jZEWqiyqtrJyMHHhuc"
```

## 🚀 Deployment

### Produção
1. Configure variáveis de ambiente para produção
2. Configure SSL/TLS para endpoints webhook
3. Use banco de dados de produção
4. Configure Helius webhook com URL de produção

### VPS
```bash
# No seu VPS
git clone <repository-url>
cd orca-whirlpools-mvp

# Iniciar banco de dados
cd infra
docker compose up -d

# Build e start do backend
cd ../backend
npm install
npm run build
npm start
```

## 📋 Status do Projeto

- ✅ **Backend**: Completamente funcional com APIs REST
- ✅ **Database**: PostgreSQL configurado e funcionando
- ✅ **Analytics**: Brokk Analytics implementado
- ✅ **Fees Calculation**: Cálculo preciso de fees
- 🚧 **Frontend**: Em desenvolvimento (estrutura básica)
- ✅ **Documentation**: Documentação completa disponível

## 🛠️ Próximos Passos

1. **Frontend Completo**: Interface React para visualização de dados
2. **Real-time Updates**: WebSocket para atualizações em tempo real
3. **Advanced Analytics**: Métricas mais avançadas e comparações
4. **Multi-DEX Support**: Suporte para outros DEXs da Solana
5. **Production Features**: Rate limiting, monitoring, logging

## 📖 Recursos Adicionais

- [Orca Whirlpools Documentation](https://dev.orca.so/)
- [Helius Documentation](https://docs.helius.dev/)
- [Solana Web3.js Guide](https://solana-labs.github.io/solana-web3.js/)

## 🤝 Contribuindo

1. Fork o repositório
2. Crie uma branch para sua feature
3. Faça suas alterações
4. Teste thoroughly
5. Submeta um pull request

## 📄 Licença

MIT License - veja o arquivo LICENSE para detalhes.

---

**Para documentação técnica completa e exemplos detalhados, consulte [Backend Documentation](./backend/README.md)**