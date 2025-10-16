# Orca Whirlpools Analytics Platform

A comprehensive **DeFi Analytics** platform for **Orca Whirlpools** on the **Solana** network, providing detailed financial insights on liquidity positions, fee calculations, ROI analysis, and performance metrics.

## 🎯 Overview

This platform offers a robust API for financial analysis of liquidity positions in the Orca Whirlpools protocol, similar to Revert Finance, but specifically optimized for Solana. The system uses **Helius RPC** and the **official Orca SDK** to provide accurate and real-time data.

### 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React Frontend │    │  Express Backend │    │  PostgreSQL DB  │
│   (In Development) │◄──►│   (Node.js TS)   │◄──►│    (Docker)     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                               ▲
                               │
                    ┌──────────────────┐
                    │  Helius RPC      │
                    │  Orca SDK        │
                    │  (Solana)        │
                    └──────────────────┘
```

## 🚀 Core Technologies

- **Blockchain**: Solana (Devnet/Mainnet)
- **RPC Provider**: Helius (high performance and reliability)
- **SDK**: Official Orca Whirlpools SDK
- **Backend**: Node.js + TypeScript + Express
- **Database**: PostgreSQL
- **Frontend**: React + TypeScript + Vite (in development)

## 📊 Main Features

### 💰 **Fee Analysis**
- **Outstanding Fees**: Real-time calculation of uncollected fees
- **Collected Fees**: Complete history of already collected fees
- **Temporal Analysis**: Queries for specific time periods
- **Multiple Positions**: Support for aggregated analysis

### 📈 **Financial Analytics (Brokk Analytics)**
- **Complete ROI**: Return on investment analysis
- **PnL Tracking**: Profit and loss tracking
- **APR Calculation**: Annualized percentage rate
- **Impermanent Loss**: Impermanent loss analysis
- **Gas Cost Tracking**: Transaction cost tracking

### 🎯 **Position Management**
- **Range Monitoring**: In-range/out-of-range status
- **Liquidity Tracking**: Liquidity monitoring
- **Reward Analysis**: Rewards and incentives analysis
- **Position History**: Complete operation history

## 🔧 Quick Start

### Prerequisites
- Node.js 20+
- Docker & Docker Compose
- Helius API Key (free tier available)

### 1. Initial Setup
```bash
git clone <repository-url>
cd orca-whirlpools-mvp
```

### 2. Database
```bash
cd infra
docker compose up -d
```

### 3. Backend
```bash
cd ../backend
cp .env.example .env
# Configure your Helius API key in .env
npm install
npm run dev
```

### 4. Frontend (In Development)
```bash
cd ../frontend
npm install
npm run dev
# ⚠️ Frontend is still in development
```

## 📡 Main API Endpoints

### 🏥 Health Check
```
GET /health
```

### 💰 Fees Analytics
```
GET /fees/:poolId/:owner                    # Outstanding fees (all positions)
GET /fees/position/:positionId/:poolId      # Outstanding fees (specific position)
GET /fees/collected/:poolId/:owner          # Collected fees (history)
```

### 📊 Brokk Analytics (ROI Analysis)
```
GET /brokk-analytics/:poolId/:owner         # Complete financial analysis
```

### 🎯 Position Management
```
GET /wallet/:publicKey                      # Wallet positions
GET /position/:nftMint                      # Position details
GET /liquidity/:publicKey                   # Liquidity overview
```

### 🏊 Pool Information
```
GET /pools                                  # Pool list
GET /pools/:poolId                          # Pool details
GET /poolsdetails/:poolId                   # Detailed information
```

## 🔑 Environment Configuration

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

## 📖 Detailed Documentation

For complete technical documentation, usage examples, response schemas, and integration guides, see:

### 📚 **[Backend Documentation](./backend/README.md)**
- Complete API documentation
- Request and response examples
- Database schemas
- Configuration guides
- Troubleshooting

### 🔧 **Configuration Files**
- [TypeScript Config](./backend/tsconfig.json)
- [Package.json](./backend/package.json)
- [Dockerfile](./backend/Dockerfile)

### 💻 **Source Code**
- [Routes](./backend/src/routes/) - API endpoints
- [Lib](./backend/src/lib/) - Utilities and integrations
- [Types](./backend/src/lib/types.ts) - TypeScript definitions

## 🧪 Testing the API

```bash
# Health check
curl http://localhost:3001/health

# Fees for a wallet
curl "http://localhost:3001/fees/Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE/2mu3kyTmEvdjPUeb9CPHMqDWT7jZEWqiyqtrJyMHHhuc"

# Brokk Analytics (complete ROI)
curl "http://localhost:3001/brokk-analytics/Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE/2mu3kyTmEvdjPUeb9CPHMqDWT7jZEWqiyqtrJyMHHhuc"
```

## 🚀 Deployment

### Production
1. Configure environment variables for production
2. Configure SSL/TLS for webhook endpoints
3. Use production database
4. Configure Helius webhook with production URL

### VPS
```bash
# On your VPS
git clone <repository-url>
cd orca-whirlpools-mvp

# Start database
cd infra
docker compose up -d

# Build and start backend
cd ../backend
npm install
npm run build
npm start
```

## 📋 Project Status

- ✅ **Backend**: Fully functional with REST APIs
- ✅ **Database**: PostgreSQL configured and working
- ✅ **Analytics**: Brokk Analytics implemented
- ✅ **Fees Calculation**: Accurate fee calculation
- 🚧 **Frontend**: In development (basic structure)
- ✅ **Documentation**: Complete documentation available

## 🛠️ Next Steps

1. **Complete Frontend**: React interface for data visualization
2. **Real-time Updates**: WebSocket for real-time updates
3. **Advanced Analytics**: More advanced metrics and comparisons
4. **Multi-DEX Support**: Support for other Solana DEXs
5. **Production Features**: Rate limiting, monitoring, logging

## 📖 Additional Resources

- [Orca Whirlpools Documentation](https://dev.orca.so/)
- [Helius Documentation](https://docs.helius.dev/)
- [Solana Web3.js Guide](https://solana-labs.github.io/solana-web3.js/)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

---

**For complete technical documentation and detailed examples, see [Backend Documentation](./backend/README.md)**