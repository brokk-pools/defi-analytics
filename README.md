# Orca Whirlpools MVP

Um MVP completo para rastrear posições de liquidez e taxas do Orca Whirlpools na Solana Devnet. O backend está totalmente funcional com APIs REST e integração com webhooks do Helius. O frontend ainda está em desenvolvimento.

## 📋 Status do Projeto

- ✅ **Backend**: Completamente funcional com APIs REST
- 🚧 **Frontend**: Em desenvolvimento (apenas estrutura básica)
- ✅ **Database**: PostgreSQL configurado e funcionando
- ✅ **Webhooks**: Integração com Helius funcionando

## 🎯 Features do Backend

- **Real-time Position Tracking**: Visualizar todas as posições Orca Whirlpool de qualquer carteira
- **Fee Estimation**: Calcular taxas estimadas ganhas com fornecimento de liquidez
- **Range Monitoring**: Verificar se posições estão dentro ou fora do range
- **Helius Integration**: Eventos de webhook em tempo real para atualizações de posições
- **Devnet Support**: Totalmente configurado para testes na Solana Devnet
- **REST API**: Endpoints completos para consulta de dados
- **Database Integration**: PostgreSQL com schema otimizado para dados do Orca

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React Frontend │    │  Express Backend │    │  PostgreSQL DB  │
│   (Vite + TS)   │◄──►│   (Node.js TS)   │◄──►│    (Docker)     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                               ▲
                               │
                    ┌──────────────────┐
                    │  Helius Webhooks │
                    │  (Solana Devnet) │
                    └──────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- Docker & Docker Compose
- Helius API Key (free tier)

### 1. Clone and Setup
```bash
git clone <your-repo>
cd orca-mvp
```

### 2. Start Database
```bash
cd infra
docker compose up -d
```

### 3. Configure Backend
```bash
cd ../backend
cp .env.example .env
# Edit .env with your Helius API key
npm install
npm run dev
```

### 4. Frontend (Em Desenvolvimento)
```bash
cd ../frontend
npm install
npm run dev
# ⚠️ Frontend ainda está em desenvolvimento - apenas estrutura básica
```

### 5. Configure Helius Webhook
1. Go to [Helius Dashboard](https://dev.helius.xyz)
2. Create a new webhook pointing to: `https://your-domain.com/webhook/helius`
3. Filter for Orca program: `whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc`

## 📁 Project Structure

```
orca-mvp/
├── backend/                 # Express.js backend
│   ├── src/
│   │   ├── routes/         # API endpoints
│   │   │   ├── webhook.ts  # Helius webhook handler
│   │   │   ├── wallet.ts   # Wallet positions API
│   │   │   └── position.ts # Position details API
│   │   ├── lib/
│   │   │   ├── db.ts       # Database utilities
│   │   │   ├── orca.ts     # Orca SDK integration
│   │   │   └── types.ts    # TypeScript interfaces
│   │   └── index.ts        # Express app setup
│   ├── Dockerfile
│   └── .env.example
├── frontend/                # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── WalletConnect.tsx
│   │   │   └── PositionsList.tsx
│   │   ├── api.ts          # Backend API client
│   │   └── App.tsx
│   └── .env
└── infra/                   # Infrastructure
    ├── docker-compose.yml   # PostgreSQL + Adminer
    └── init.sql            # Database schema
```

## 🔧 Environment Variables

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

## 📡 API Endpoints (Backend)

### Health Check
```
GET /health
```

### Wallet Positions
```
GET /wallet/:publicKey
```

### Position Details
```
GET /position/:nftMint
```

### Helius Webhook
```
POST /webhook/helius
```

### Pools Information
```
GET /pools
GET /pools/:poolId
```

### Top Positions
```
GET /top-positions
```

### Liquidity Operations
```
GET /liquidity/:publicKey
```

### Outstanding Fees Calculation
```
GET /fees/:positionId/:poolId
```

**Purpose**: Calculate outstanding fees for a specific Orca Whirlpool position in real-time.

**Parameters**:
- `positionId`: Position identifier (can be either NFT mint address or position PDA address)
- `poolId`: Whirlpool address where the position exists

**Example Request**:
```bash
curl "http://localhost:3001/fees/6TKDPz14cZZ6yGAEzqB7GodX8R32zf5NcnnZeRovCbQH/Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE"
```

**Response Format**:
```json
{
  "timestamp": "2025-10-12T13:11:46.584Z",
  "method": "getOutstandingFeesForPosition",
  "position": "APNnhsnAL49HeQpKkQEWcHCp1gh9biDagabMrUc3NC83",
  "originalPositionParam": "6TKDPz14cZZ6yGAEzqB7GodX8R32zf5NcnnZeRovCbQH",
  "pool": "Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE",
  "currentTick": -17050,
  "tickLowerIndex": -14644,
  "tickUpperIndex": -14392,
  "tokenMintA": "So11111111111111111111111111111111111111112",
  "tokenMintB": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  "feeOwedAOnChain": "0",
  "feeOwedBOnChain": "0",
  "feeOwedAComputedNow": "169616",
  "feeOwedBComputedNow": "39646",
  "liquidity": "768138776",
  "feeGrowthGlobalA": "10622423207700544455",
  "feeGrowthGlobalB": "1421136515907037356",
  "feeGrowthCheckpointA": "566422009244651338",
  "feeGrowthCheckpointB": "140659841755404768",
  "calculations": {
    "feeGrowthInsideA": "570495320585071107",
    "feeGrowthInsideB": "141611953903622772",
    "deltaA": "4073311340419769",
    "deltaB": "952112148218004",
    "variableA": "169616",
    "variableB": "39646",
    "tickLower": {
      "feeGrowthOutsideA": "592600795228215020",
      "feeGrowthOutsideB": "146968036410605518"
    },
    "tickUpper": {
      "feeGrowthOutsideA": "22105474643143913",
      "feeGrowthOutsideB": "5356082506982746"
    }
  },
  "success": true
}
```

**Field Descriptions**:

**Basic Information**:
- `timestamp`: ISO timestamp of the calculation
- `method`: Method name used for the calculation
- `position`: Actual position PDA address (derived if NFT mint was provided)
- `originalPositionParam`: Original parameter passed (NFT mint or position address)
- `pool`: Whirlpool address
- `success`: Boolean indicating if the calculation was successful

**Position Range Information**:
- `currentTick`: Current tick index of the pool (integer)
- `tickLowerIndex`: Lower bound of the position's tick range (integer)
- `tickUpperIndex`: Upper bound of the position's tick range (integer)

**Token Information**:
- `tokenMintA`: Mint address of token A in the pool
- `tokenMintB`: Mint address of token B in the pool

**Fee Information (in smallest token units)**:
- `feeOwedAOnChain`: Fees already recorded on-chain for token A (string, smallest units)
- `feeOwedBOnChain`: Fees already recorded on-chain for token B (string, smallest units)
- `feeOwedAComputedNow`: Total fees owed for token A including pending (string, smallest units)
- `feeOwedBComputedNow`: Total fees owed for token B including pending (string, smallest units)

**Liquidity Information**:
- `liquidity`: Position's liquidity amount (string, raw units)

**Fee Growth Information (Q64.64 format)**:
- `feeGrowthGlobalA`: Global fee growth for token A (string, Q64.64 format)
- `feeGrowthGlobalB`: Global fee growth for token B (string, Q64.64 format)
- `feeGrowthCheckpointA`: Position's fee growth checkpoint for token A (string, Q64.64 format)
- `feeGrowthCheckpointB`: Position's fee growth checkpoint for token B (string, Q64.64 format)

**Detailed Calculations**:
- `calculations.feeGrowthInsideA`: Fee growth inside position range for token A (string, Q64.64 format)
- `calculations.feeGrowthInsideB`: Fee growth inside position range for token B (string, Q64.64 format)
- `calculations.deltaA`: Difference in fee growth for token A (string, Q64.64 format)
- `calculations.deltaB`: Difference in fee growth for token B (string, Q64.64 format)
- `calculations.variableA`: Variable fees for token A (string, smallest units)
- `calculations.variableB`: Variable fees for token B (string, smallest units)
- `calculations.tickLower.feeGrowthOutsideA`: Fee growth outside lower tick for token A (string, Q64.64 format)
- `calculations.tickLower.feeGrowthOutsideB`: Fee growth outside lower tick for token B (string, Q64.64 format)
- `calculations.tickUpper.feeGrowthOutsideA`: Fee growth outside upper tick for token A (string, Q64.64 format)
- `calculations.tickUpper.feeGrowthOutsideB`: Fee growth outside upper tick for token B (string, Q64.64 format)

**Important Notes for Frontend Integration**:

1. **Token Units**: All fee amounts (`feeOwedAOnChain`, `feeOwedBOnChain`, `feeOwedAComputedNow`, `feeOwedBComputedNow`) are in the smallest units of each token. You need to divide by `10^decimals` to get human-readable amounts.

2. **Q64.64 Format**: Fee growth values are in Q64.64 fixed-point format. These are used for internal calculations and typically don't need to be displayed to users.

3. **Position Status**: Check if `currentTick` is between `tickLowerIndex` and `tickUpperIndex` to determine if the position is active (earning fees).

4. **Fee Calculation**: The difference between `feeOwedAComputedNow` and `feeOwedAOnChain` represents the pending fees that haven't been collected yet.

5. **Error Handling**: The API returns appropriate HTTP status codes and error messages for invalid parameters or positions not found.

**Usage Examples**:

```javascript
// Calculate fees for a position
const response = await fetch('/fees/6TKDPz14cZZ6yGAEzqB7GodX8R32zf5NcnnZeRovCbQH/Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE');
const data = await response.json();

// Convert fees to human-readable format (assuming 6 decimals for USDC)
const tokenADecimals = 9; // SOL has 9 decimals
const tokenBDecimals = 6; // USDC has 6 decimals

const feesA = parseFloat(data.feeOwedAComputedNow) / Math.pow(10, tokenADecimals);
const feesB = parseFloat(data.feeOwedBComputedNow) / Math.pow(10, tokenBDecimals);

console.log(`Pending fees: ${feesA} SOL, ${feesB} USDC`);

// Check if position is active
const isActive = data.currentTick >= data.tickLowerIndex && data.currentTick <= data.tickUpperIndex;
console.log(`Position is ${isActive ? 'active' : 'inactive'}`);
```

## 🗄️ Database Schema

```sql
-- Pools table
pools (id, token_a, token_b, fee_bps, tick_spacing, whirlpool_pubkey, last_slot_indexed)

-- Events table (webhook data)
events (id, pool_id, slot, ts, sig, kind, raw_json)

-- Positions table
positions (nft_mint, owner, pool_id, tick_lower, tick_upper, liquidity, created_slot, closed_slot)

-- Position fees table
position_fees (nft_mint, token_a_fees, token_b_fees, last_updated)
```

## 🧪 Testing

### Test Backend
```bash
cd backend
npm run dev

# Test health endpoint
curl http://localhost:3001/health

# Test wallet endpoint (example key)
curl http://localhost:3001/wallet/11111111111111111111111111111112
```

### Test Frontend (Em Desenvolvimento)
```bash
cd frontend
npm run dev
# Visit http://localhost:5173
# ⚠️ Frontend ainda está em desenvolvimento - apenas estrutura básica
```

## 🚀 Deployment

### Production Deployment
1. Update environment variables for production
2. Set up SSL/TLS for webhook endpoints
3. Configure Helius webhook with production URL
4. Use a production database (not Docker for production)

### VPS Deployment
```bash
# On your VPS
git clone <your-repo>
cd orca-mvp

# Start database
cd infra
docker compose up -d

# Build and start backend
cd ../backend
npm install
npm run build
npm start

# Build and serve frontend
cd ../frontend
npm install
npm run build
# Serve dist/ with nginx or similar
```

## 🔍 Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Ensure PostgreSQL is running: `docker compose ps`
   - Check DATABASE_URL in .env file

2. **Helius Webhook Not Working**
   - Verify webhook URL is publicly accessible
   - Check Helius dashboard for webhook status
   - Ensure ngrok is running for local development

3. **No Positions Found**
   - Ensure wallet has positions on Solana Devnet
   - Check if positions are created through Orca UI on devnet
   - Verify Orca SDK configuration

4. **Frontend API Errors**
   - Check backend is running on correct port
   - Verify VITE_API_URL in frontend .env
   - Check CORS configuration in backend

## 📋 MVP Deliverables Checklist

- [x] VPS with Docker + Compose running PostgreSQL + Adminer
- [x] Backend Express in Docker or Node, with .env configured
- [x] Webhook Helius (Devnet) apontando pro backend
- [x] /wallet/:pk retornando lista de NFTs de posição
- [x] Cálculo/quote de fees simples via SDK
- [x] APIs REST completas para todas as operações
- [x] Database schema otimizado para dados do Orca
- [x] Demo ready: 1 carteira com 1+ posições em devnet
- [ ] Frontend React completo (em desenvolvimento)

## 🛠️ Next Steps (Post-MVP)

1. **Enhanced Orca SDK Integration**
   - Real position data fetching
   - Accurate fee calculations
   - Pool metadata integration

2. **Real-time Updates**
   - WebSocket connections
   - Live fee tracking
   - Position change notifications

3. **Advanced Features**
   - Phantom wallet integration
   - Multiple DEX support (Raydium, Meteora)
   - Historical analytics

4. **Production Readiness**
   - Error handling & retry logic
   - Rate limiting
   - Monitoring & logging

## 📖 Documentação do Backend

### Documentação Técnica
- [Backend README](./backend/README.md) - Documentação completa do backend
- [API Documentation](./backend/README.md#api-endpoints) - Endpoints e exemplos de uso
- [Database Schema](./backend/README.md#database-schema) - Estrutura do banco de dados
- [Environment Variables](./backend/README.md#environment-variables) - Configuração de variáveis

### Arquivos de Configuração
- [TypeScript Config](./backend/tsconfig.json) - Configuração do TypeScript
- [Package.json](./backend/package.json) - Dependências e scripts
- [Dockerfile](./backend/Dockerfile) - Configuração do container Docker

### Código Fonte
- [Routes](./backend/src/routes/) - Endpoints da API
  - [Fees Route](./backend/src/routes/fees.ts) - Outstanding fees calculation
  - [Position Route](./backend/src/routes/position.ts) - Position details
  - [Liquidity Route](./backend/src/routes/liquidity.ts) - Liquidity overview
  - [Wallet Route](./backend/src/routes/wallet.ts) - Wallet positions
  - [Pools Route](./backend/src/routes/pools.ts) - Pool information
- [Lib](./backend/src/lib/) - Utilitários e integrações
  - [Orca Integration](./backend/src/lib/orca.ts) - Orca SDK integration and fee calculations
  - [Types](./backend/src/lib/types.ts) - Definições TypeScript

## 📖 Learn More

- [Orca Whirlpools Documentation](https://dev.orca.so/)
- [Helius Webhook Guide](https://docs.helius.dev/webhooks)
- [Solana Web3.js Guide](https://solana-labs.github.io/solana-web3.js/)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.