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

### 📊 Liquidity Operations
```
GET /liquidity/:publicKey
```

**Purpose**: Get comprehensive liquidity overview for a wallet address including all Orca Whirlpool positions.

**Parameters**:
- `publicKey`: Wallet address to query positions for

**Features**:
- Real-time position data with current tick information
- Fee calculations (collected, pending, total)
- Reward information and growth tracking
- Range status monitoring (in-range/out-of-range)
- Tick comparison and distance calculations

**Example Request**:
```bash
curl "http://localhost:3001/liquidity/2mu3kyTmEvdjPUeb9CPHMqDWT7jZEWqiyqtrJyMHHhuc"
```

### 💰 Outstanding Fees Calculation (Primary)
```
GET /fees/:poolId/:owner
```

**Purpose**: Calculate outstanding (uncollected) fees for an owner across all positions in a specific Orca Whirlpool pool.

**Parameters**:
- `poolId` (required): Whirlpool address where the positions exist
- `owner` (required): Owner wallet address
- `positionId` (optional): Specific position identifier (NFT mint address) to filter results
- `showPositions` (optional): If `true`, returns detailed breakdown by position

**Features**:
- Aggregates fees from all positions of the owner in the specified pool
- Real-time calculation using Orca's official algorithm
- Proper decimal handling for different token types
- Support for filtering by specific position
- Detailed position breakdown when requested

**Example Request**:
```bash
# Get outstanding fees for all positions of an owner in a pool
curl "http://localhost:3001/fees/Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE/2mu3kyTmEvdjPUeb9CPHMqDWT7jZEWqiyqtrJyMHHhuc"

# Get outstanding fees for a specific position
curl "http://localhost:3001/fees/Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE/2mu3kyTmEvdjPUeb9CPHMqDWT7jZEWqiyqtrJyMHHhuc?positionId=6TKDPz14cZZ6yGAEzqB7GodX8R32zf5NcnnZeRovCbQH"

# Get detailed breakdown by position
curl "http://localhost:3001/fees/Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE/2mu3kyTmEvdjPUeb9CPHMqDWT7jZEWqiyqtrJyMHHhuc?showPositions=true"
```

**Response Format**:
```json
{
  "timestamp": "2025-10-13T13:59:24.000Z",
  "method": "getOutstandingFeesForOwner",
  "pool": "Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE",
  "owner": "2mu3kyTmEvdjPUeb9CPHMqDWT7jZEWqiyqtrJyMHHhuc",
  "positionId": null,
  "totalPositions": 1,
  "positionAddresses": ["APNnhsnAL49HeQpKkQEWcHCp1gh9biDagabMrUc3NC83"],
  "tokenA": { 
    "mint": "So11111111111111111111111111111111111111112",
    "decimals": 9
  },
  "tokenB": { 
    "mint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    "decimals": 6
  },
  "totals": {
    "A": { "raw": "0", "human": 0 },
    "B": { "raw": "0", "human": 0 },
    "note": "A+B sum has no single unit (distinct tokens)."
  },
  "positions": [
    {
      "positionId": "6TKDPz14cZZ6yGAEzqB7GodX8R32zf5NcnnZeRovCbQH",
      "positionAddress": "APNnhsnAL49HeQpKkQEWcHCp1gh9biDagabMrUc3NC83",
      "fees": {
        "feeOwedAComputedNow": "0",
        "feeOwedBComputedNow": "0",
        "currentTick": -17145,
        "tickLowerIndex": -14644,
        "tickUpperIndex": -14392
      }
    }
  ],
  "success": true
}
```

**Field Descriptions**:
- `totalPositions`: Number of positions found for the owner in the pool
- `positionAddresses`: Array of position PDA addresses
- `tokenA/tokenB`: Token information including mint addresses and decimal places
- `totals`: Aggregated outstanding fees for all positions (raw values in smallest units, human values converted)
- `positions` (if `showPositions=true`): Detailed breakdown by position with individual fee calculations

### 💰 Outstanding Fees Calculation (Legacy)
```
GET /fees/position/:positionId/:poolId
```

**Purpose**: Calculate outstanding fees for a specific Orca Whirlpool position (legacy endpoint maintained for compatibility).

**Parameters**:
- `positionId`: Position identifier (can be either NFT mint address or position PDA address)
- `poolId`: Whirlpool address where the position exists

**Features**:
- Direct position fee calculation using Orca's official algorithm
- Support for both NFT mint and position PDA addresses
- Real-time tick data and fee growth calculations
- Detailed calculation breakdown for debugging

**Example Request**:
```bash
curl "http://localhost:3001/fees/position/6TKDPz14cZZ6yGAEzqB7GodX8R32zf5NcnnZeRovCbQH/Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE"
```

### 📈 Collected Fees History
```
GET /fees/collected/:poolId/:owner
```

**Purpose**: Query on-chain collected fees for an owner in a specific Orca Whirlpool pool within a UTC time range.

**Parameters**:
- `poolId` (required): Whirlpool address where the positions exist
- `owner` (required): Owner wallet address
- `startUtc` (optional): Start date in ISO 8601 format (default: 1900-01-01T00:00:00Z)
- `endUtc` (optional): End date in ISO 8601 format (default: tomorrow)
- `positionId` (optional): Specific position identifier (NFT mint address) to filter results
- `showHistory` (optional): If `true`, returns detailed transaction history

**Features**:
- On-chain transaction analysis for fee collection events
- Flexible time range with sensible defaults
- Position-specific filtering capability
- Detailed transaction history with position IDs
- Proper decimal handling for different token types
- Real-time blockchain data analysis

**Example Requests**:
```bash
# Get all collected fees for an owner in a pool (all time)
curl "http://localhost:3001/fees/collected/Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE/2mu3kyTmEvdjPUeb9CPHMqDWT7jZEWqiyqtrJyMHHhuc"

# Get collected fees for a specific time range
curl "http://localhost:3001/fees/collected/Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE/2mu3kyTmEvdjPUeb9CPHMqDWT7jZEWqiyqtrJyMHHhuc?startUtc=2025-10-01T00:00:00Z&endUtc=2025-10-12T23:59:59Z"

# Get collected fees for a specific position with history
curl "http://localhost:3001/fees/collected/Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE/2mu3kyTmEvdjPUeb9CPHMqDWT7jZEWqiyqtrJyMHHhuc?positionId=6TKDPz14cZZ6yGAEzqB7GodX8R32zf5NcnnZeRovCbQH&showHistory=true"
```

**Response Format**:
```json
{
  "timestamp": "2025-10-13T13:59:24.000Z",
  "method": "feesCollectedInRange",
  "pool": "Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE",
  "owner": "2mu3kyTmEvdjPUeb9CPHMqDWT7jZEWqiyqtrJyMHHhuc",
  "positionId": null,
  "positionAddress": null,
  "totalPositions": 1,
  "positionAddresses": ["APNnhsnAL49HeQpKkQEWcHCp1gh9biDagabMrUc3NC83"],
  "interval_utc": {
    "start": "1900-01-01T00:00:00.000Z",
    "end": "2025-10-13T13:59:24.000Z"
  },
  "tokenA": { 
    "mint": "So11111111111111111111111111111111111111112",
    "ata": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL",
    "decimals": 9
  },
  "tokenB": { 
    "mint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    "ata": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL",
    "decimals": 6
  },
  "totals": {
    "A": { "raw": "0", "human": 0 },
    "B": { "raw": "0", "human": 0 },
    "note": "A+B sum has no single unit (distinct tokens)."
  },
  "history": {
    "A": [],
    "B": [
      {
        "token": "B",
        "signature": "5JsuEa9LJ6ExMmXsUBxgyPYe3rYgQpuRoxt3zdU6nSW6bLowB26U821kZnofN247qc7no3Jv6DU3LMXFF4bwX4M8",
        "datetimeUTC": "2025-10-12T13:38:07.000Z",
        "amountRaw": "39646",
        "amount": 0.039646,
        "positionId": "6TKDPz14cZZ6yGAEzqB7GodX8R32zf5NcnnZeRovCbQH"
      }
    ]
  },
  "success": true
}
```

**Field Descriptions**:
- `interval_utc`: Time range used for the query
- `tokenA/tokenB`: Token information including mint addresses, ATAs, and decimal places
- `totals`: Aggregated collected fees for all positions (raw values in smallest units, human values converted)
- `history` (if `showHistory=true`): Detailed transaction history with position IDs, signatures, and amounts
- `totalPositions`: Number of positions found for the owner in the pool
- `positionAddresses`: Array of position PDA addresses

### 📊 Brokk Analytics (Pool ROI Analysis)
```
GET /brokk-analytics/:poolId/:owner
```

**Purpose**: Comprehensive financial analysis of LP performance in Orca Whirlpools (Revert Finance style).

**Parameters**:
- `poolId` (required): Whirlpool address where the positions exist
- `owner` (required): Owner wallet address
- `positionId` (optional): Specific position identifier (NFT mint address) to filter results
- `startUtc` (optional): Start date in ISO 8601 format for analysis period
- `endUtc` (optional): End date in ISO 8601 format for analysis period
- `showHistory` (optional): If `true`, returns detailed transaction history

**Features**:
- Complete financial snapshot of LP performance
- Position-level metrics (range, investment, current state, fees/rewards, PnL/ROI/APR/IL)
- Aggregated metrics across all positions
- Real-time price integration with configurable price providers
- Historical analysis with proper USD valuation
- Gas cost tracking and PnL calculations
- Divergence loss analysis (LP vs HODL comparison)

**Example Requests**:
```bash
# Complete ROI analysis for all positions of an owner in a pool
curl "http://localhost:3001/brokk-analytics/Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE/2mu3kyTmEvdjPUeb9CPHMqDWT7jZEWqiyqtrJyMHHhuc"

# ROI analysis for a specific position
curl "http://localhost:3001/brokk-analytics/Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE/2mu3kyTmEvdjPUeb9CPHMqDWT7jZEWqiyqtrJyMHHhuc?positionId=6TKDPz14cZZ6yGAEzqB7GodX8R32zf5NcnnZeRovCbQH"

# ROI analysis with specific time range and history
curl "http://localhost:3001/brokk-analytics/Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE/2mu3kyTmEvdjPUeb9CPHMqDWT7jZEWqiyqtrJyMHHhuc?startUtc=2025-10-01T00:00:00Z&endUtc=2025-10-12T23:59:59Z&showHistory=true"
```

**Response Format**:
```json
{
  "owner": "2mu3kyTmEvdjPUeb9CPHMqDWT7jZEWqiyqtrJyMHHhuc",
  "pool": "Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE",
  "positions": [
    {
      "positionMint": "6TKDPz14cZZ6yGAEzqB7GodX8R32zf5NcnnZeRovCbQH",
      "range": {
        "minPrice": 0.0001,
        "maxPrice": 0.0002,
        "currentPrice": 0.00015
      },
      "investment": {
        "tokenA": { "qtyRaw": "1000000000", "qty": 1, "usdAtDeposit": 200 },
        "tokenB": { "qtyRaw": "1000000", "qty": 1, "usdAtDeposit": 1 },
        "tsFirstDeposit": 1697123456
      },
      "current": {
        "tokenA": { "qtyRaw": "950000000", "qty": 0.95, "usdNow": 190 },
        "tokenB": { "qtyRaw": "1050000", "qty": 1.05, "usdNow": 1.05 }
      },
      "fees": {
        "collected": { "A": { "raw": "5000000", "usd": 1 }, "B": { "raw": "1000", "usd": 0.001 } },
        "uncollected": { "A": { "raw": "2000000", "usd": 0.4 }, "B": { "raw": "500", "usd": 0.0005 } },
        "reinvested": { "A": { "raw": "0", "usd": 0 }, "B": { "raw": "0", "usd": 0 } },
        "total": { "A": { "raw": "7000000", "usd": 1.4 }, "B": { "raw": "1500", "usd": 0.0015 } }
      },
      "rewards": {
        "unclaimedUSDT": 0,
        "claimedUSDT": 0
      },
      "withdrawn": {
        "tokenA": { "raw": "0", "usdAtWithdrawal": 0 },
        "tokenB": { "raw": "0", "usdAtWithdrawal": 0 }
      },
      "gas": { "sol": 0.001, "usd": 0.2 },
      "pnlExcludingGasUSDT": -8.35,
      "roiPct": -4.15,
      "aprPct": -15.12,
      "divergenceLossUSDT": -0.5
    }
  ],
  "aggregated": {
    "investmentUSDT": 201,
    "currentUSDT": 191.05,
    "totalFeesUSDT": 1.4015,
    "rewardsUSDT": 0,
    "withdrawnUSDT": 0,
    "gasUSDT": 0.2,
    "pnlExcludingGasUSDT": -8.35,
    "roiPct": -4.15,
    "aprPct": -15.12,
    "divergenceLossUSDT": -0.5
  },
  "success": true,
  "timestamp": "2025-10-13T14:00:00.000Z",
  "method": "calculatePoolROI"
}
```

**Field Descriptions**:
- `positions[]`: Array of position-level financial analysis
- `range`: Price range (min/max/current) for the position
- `investment`: Initial investment amounts and USD values at deposit time
- `current`: Current token amounts and USD values
- `fees`: Collected, uncollected, reinvested, and total fees in USD
- `rewards`: Unclaimed and claimed rewards in USD
- `withdrawn`: Principal withdrawals in USD
- `gas`: Gas costs in SOL and USD
- `pnlExcludingGasUSDT`: Profit/Loss excluding gas costs
- `roiPct`: Return on Investment percentage
- `aprPct`: Annualized Percentage Rate
- `divergenceLossUSDT`: Impermanent Loss (LP value vs HODL value)
- `aggregated`: Sum of all positions' metrics

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

**Purpose**: Query on-chain collected fees for a specific user in a pool within a UTC time range.

**Parameters**:
- `poolId`: Whirlpool address (required)
- `owner`: User wallet address (required)
- `startUtc`: Start date in ISO 8601 format (optional, defaults to pool creation)
- `endUtc`: End date in ISO 8601 format (optional, defaults to now)
- `showHistory`: Include detailed transaction history (optional, boolean)
- `positionId`: Specific position NFT mint to filter by (optional, if empty returns all positions)

**Example Requests**:
```bash
# All positions for user in pool
curl "http://localhost:3001/fees/collected/Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE/2mu3kyTmEvdjPUeb9CPHMqDWT7jZEWqiyqtrJyMHHhuc"

# Specific position with date range and history
curl "http://localhost:3001/fees/collected/Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE/2mu3kyTmEvdjPUeb9CPHMqDWT7jZEWqiyqtrJyMHHhuc?startUtc=2025-10-01T00:00:00Z&endUtc=2025-10-12T23:59:59Z&showHistory=true&positionId=6TKDPz14cZZ6yGAEzqB7GodX8R32zf5NcnnZeRovCbQH"
```

**Response Format**:
```json
{
  "timestamp": "2025-10-12T13:34:20.086Z",
  "method": "feesCollectedInRange",
  "pool": "Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE",
  "owner": "2mu3kyTmEvdjPUeb9CPHMqDWT7jZEWqiyqtrJyMHHhuc",
  "positionId": "6TKDPz14cZZ6yGAEzqB7GodX8R32zf5NcnnZeRovCbQH",
  "positionAddress": "APNnhsnAL49HeQpKkQEWcHCp1gh9biDagabMrUc3NC83",
  "interval_utc": {
    "start": "2025-10-12T13:33:27.000Z",
    "end": "2025-10-12T13:34:19.000Z"
  },
  "tokenA": {
    "mint": "So11111111111111111111111111111111111111112",
    "ata": "2f36BK4QuMJoKpuzUGaG6Tr43VpaSEBC3RqiSYa9mzAM",
    "decimals": 9
  },
  "tokenB": {
    "mint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    "ata": "6Fx6SycLt9h2c7D6jFYAFudm23iJDjuSRs975ZSH9K3t",
    "decimals": 6
  },
  "totals": {
    "A": { "raw": "0", "human": 0 },
    "B": { "raw": "0", "human": 0 },
    "note": "A+B sum has no single unit (distinct tokens)."
  },
  "history": {
    "A": [],
    "B": []
  },
  "success": true
}
```

**Field Descriptions**:

**Basic Information**:
- `timestamp`: ISO timestamp of the calculation
- `method`: Method name used for the calculation
- `pool`: Whirlpool address
- `owner`: User wallet address
- `positionId`: Position NFT mint (null if filtering all positions)
- `positionAddress`: Position PDA address (null if filtering all positions)
- `success`: Boolean indicating if the calculation was successful

**Time Range**:
- `interval_utc.start`: Start of the time range (ISO 8601)
- `interval_utc.end`: End of the time range (ISO 8601)

**Token Information**:
- `tokenA`/`tokenB`: Token details including mint address, ATA address, and decimals

**Collected Fees**:
- `totals.A.raw`: Total collected fees for token A (string, smallest units)
- `totals.A.human`: Total collected fees for token A (number, human-readable)
- `totals.B.raw`: Total collected fees for token B (string, smallest units)
- `totals.B.human`: Total collected fees for token B (number, human-readable)

**Transaction History** (if `showHistory=true`):
- `history.A`/`history.B`: Array of transaction details including signature, datetime, amounts, and positionId

**Usage Examples**:

```javascript
// Get collected fees for a user in a pool
const response = await fetch('/fees/collected/Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE/2mu3kyTmEvdjPUeb9CPHMqDWT7jZEWqiyqtrJyMHHhuc');
const data = await response.json();

console.log(`Collected fees: ${data.totals.A.human} SOL, ${data.totals.B.human} USDC`);

// Get fees with date range and history
const responseWithHistory = await fetch('/fees/collected/Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE/2mu3kyTmEvdjPUeb9CPHMqDWT7jZEWqiyqtrJyMHHhuc?startUtc=2025-10-01T00:00:00Z&endUtc=2025-10-12T23:59:59Z&showHistory=true');
const dataWithHistory = await responseWithHistory.json();

console.log(`Total transactions: ${dataWithHistory.history.A.length + dataWithHistory.history.B.length}`);

// Get fees for a specific position
const responseSpecific = await fetch('/fees/collected/Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE/2mu3kyTmEvdjPUeb9CPHMqDWT7jZEWqiyqtrJyMHHhuc?positionId=6TKDPz14cZZ6yGAEzqB7GodX8R32zf5NcnnZeRovCbQH&showHistory=true');
const dataSpecific = await responseSpecific.json();

console.log(`Position ID: ${dataSpecific.positionId}`);
console.log(`Position Address: ${dataSpecific.positionAddress}`);
console.log(`Collected fees for this position: ${dataSpecific.totals.A.human} SOL, ${dataSpecific.totals.B.human} USDC`);
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