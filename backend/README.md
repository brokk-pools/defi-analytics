# Orca Whirlpools MVP Backend

A comprehensive backend API for Orca Whirlpools analytics and position management on Solana. This project provides powerful endpoints to fetch, analyze, and manage liquidity positions across Orca's Whirlpools ecosystem.

## 🚀 Features

### Core Functionality
- **Position Analytics**: Fetch and analyze Whirlpool positions by owner
- **Pool Information**: Get comprehensive data about Orca Whirlpools
- **Top Positions**: Find the highest liquidity positions across all pools
- **Unified Liquidity View**: Aggregate all position types (Whirlpools, Classic LPs, Vault positions)
- **Real-time Data**: Live data from Solana blockchain via Helius RPC
- **File Export**: Export position data to JSON files

### Supported Position Types
- **Whirlpool NFTs**: Concentrated liquidity positions
- **Classic LP Tokens**: Traditional liquidity pool positions
- **Vault Positions**: Custodied positions in farming programs

## 📋 API Endpoints

### Health & Status
- `GET /health` - Health check endpoint
- `GET /` - API information and available endpoints

### Position Management
- `GET /position/:nftMint` - Get specific position by NFT mint
- `GET /positionsByOwner/:owner` - Get all positions for a wallet owner
- `GET /positionsByOwner/:owner?saveFile=true` - Get positions and save to JSON file

### Pool Analytics
- `GET /pools` - Get all Orca Whirlpools
- `GET /pools/:poolId` - Get specific pool by ID
- `GET /pools?sortBy=volume&sortDirection=desc` - Get pools with sorting

### Advanced Analytics
- `GET /top-positions?limit=10` - Get top N positions by liquidity
- `GET /liquidity/:owner` - Get unified liquidity overview for owner

### Wallet & Webhook
- `GET /wallet/:publicKey` - Get wallet information
- `POST /webhook/helius` - Helius webhook endpoint

## 🛠️ Installation

### Prerequisites
- Node.js 18+ 
- npm or yarn
- PostgreSQL (optional, for vault tracking)
- Helius API key (recommended)

### Setup

1. **Clone the repository**
```bash
git clone https://github.com/brokk-pools/defi-analytics.git
cd defi-analytics/backend
```

2. **Install dependencies**
```bash
npm install
```

3. **Environment Configuration**
Create a `.env` file in the root directory:

```env
# Required
HELIUS_API_KEY=your_helius_api_key_here
ORCA_WHIRLPOOLS_PROGRAM_ID=whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc

# Optional
PORT=3001
HOST=localhost
NODE_ENV=development
RPC_PROVIDER=helius

# Database (optional)
DATABASE_URL=postgresql://user:password@localhost:5432/orca_analytics

# Helius RPC (optional, will use API key if provided)
HELIUS_RPC=https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}
```

4. **Start the development server**
```bash
npm run dev
```

The server will start on `http://localhost:3001` by default.

## 🔧 Development

### Available Scripts

```bash
# Development with hot reload
npm run dev

# Build TypeScript
npm run build

# Start production server
npm start

# Debug mode
npm run dev:debug
```

### Project Structure

```
src/
├── index.ts                 # Main server entry point
├── lib/
│   ├── orca.ts             # Orca SDK integration
│   ├── vault.ts            # Vault position handling
│   ├── migrations.ts       # Database migrations
│   ├── validation.ts       # Environment validation
│   ├── logger.ts           # Winston logging
│   ├── security.ts         # Security middleware
│   └── types.ts            # TypeScript definitions
└── routes/
    ├── position.ts         # Position endpoints
    ├── positions-by-owner.ts # Owner position queries
    ├── pools.ts            # Pool information
    ├── top-positions.ts    # Top positions analytics
    ├── liquidity.ts        # Unified liquidity view
    ├── wallet.ts           # Wallet endpoints
    └── webhook.ts          # Webhook handlers
```

## 📊 Usage Examples

### Get All Positions for a Wallet

```bash
curl "http://localhost:3001/positionsByOwner/2mu3kyTmEvdjPUeb9CPHMqDWT7jZEWqiyqtrJyMHHhuc"
```

### Get Top 10 Positions by Liquidity

```bash
curl "http://localhost:3001/top-positions?limit=10"
```

### Get All Pools with Volume Sorting

```bash
curl "http://localhost:3001/pools?sortBy=volume&sortDirection=desc"
```

### Export Positions to File

```bash
curl "http://localhost:3001/positionsByOwner/2mu3kyTmEvdjPUeb9CPHMqDWT7jZEWqiyqtrJyMHHhuc?saveFile=true"
```

## 🔍 Data Models

### Position Response
```json
{
  "timestamp": "2025-10-11T03:31:31.231Z",
  "method": "fetchPositionsForOwner",
  "rpcProvider": "helius",
  "owner": "2mu3kyTmEvdjPUeb9CPHMqDWT7jZEWqiyqtrJyMHHhuc",
  "totalPositions": 1,
  "positions": [
    {
      "address": "APNnhsnAL49HeQpKkQEWcHCp1gh9biDagabMrUc3NC83",
      "whirlpool": "Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE",
      "liquidity": "768138776",
      "tickLowerIndex": -14644,
      "tickUpperIndex": -14392,
      "feeOwedA": "0",
      "feeOwedB": "0"
    }
  ]
}
```

### Pool Response
```json
{
  "timestamp": "2025-10-11T03:31:31.231Z",
  "method": "Orca API",
  "source": "https://api.orca.so/v2/solana/pools",
  "totalPools": 50,
  "hasMore": true,
  "data": [
    {
      "address": "Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE",
      "tokenA": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      "tokenB": "So11111111111111111111111111111111111111112",
      "tvl": "1250000.50",
      "volume24h": "45000.25"
    }
  ]
}
```

## 🏗️ Architecture

### Technology Stack
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Blockchain**: Solana Web3.js
- **Orca Integration**: @orca-so/whirlpools SDK
- **RPC Provider**: Helius (with fallback to public RPC)
- **Database**: PostgreSQL (optional)
- **Logging**: Winston
- **Security**: Helmet, CORS, Rate Limiting

### Key Components

1. **Orca Integration** (`src/lib/orca.ts`)
   - RPC connection management
   - Position fetching and parsing
   - Classic LP detection
   - Vault position resolution

2. **Vault System** (`src/lib/vault.ts`)
   - Custodied position tracking
   - Multi-program support
   - Share mint resolution

3. **Security Layer** (`src/lib/security.ts`)
   - Rate limiting
   - Request validation
   - Webhook signature verification

## 🔒 Security

- **Rate Limiting**: Prevents API abuse
- **CORS**: Configurable cross-origin requests
- **Helmet**: Security headers
- **Input Validation**: Parameter sanitization
- **Webhook Verification**: Signature validation for webhooks

## 📈 Performance

- **RPC Optimization**: Uses Helius for better performance
- **Batch Processing**: Efficient token metadata fetching
- **Caching**: Database caching for vault configurations
- **Compression**: Response compression enabled

## 🐳 Docker Support

### Development
```bash
docker build -f Dockerfile -t orca-backend-dev .
docker run -p 3001:3001 orca-backend-dev
```

### Production
```bash
docker build -f Dockerfile.prod -t orca-backend-prod .
docker run -p 3001:3001 orca-backend-prod
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [Orca Documentation](https://docs.orca.so/)
- **Discord**: [Orca Protocol Discord](https://discord.gg/orcaprotocol)
- **Issues**: [GitHub Issues](https://github.com/brokk-pools/defi-analytics/issues)

## 🔗 Related Projects

- [Orca Protocol](https://orca.so/)
- [Helius](https://helius.xyz/)
- [Solana Web3.js](https://solana-labs.github.io/solana-web3.js/)

## 📊 API Status

The API provides real-time data from the Solana blockchain. All endpoints return JSON responses with proper error handling and status codes.

### Rate Limits
- Default: 100 requests per 15 minutes per IP
- Webhook endpoints: 10 requests per minute per IP

### Error Handling
All endpoints return consistent error responses:
```json
{
  "error": "Error type",
  "message": "Detailed error message",
  "timestamp": "2025-10-11T03:31:31.231Z"
}
```

---

**Built with ❤️ for the Orca ecosystem**
