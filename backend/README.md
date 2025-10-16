# 🐋 Orca Whirlpools Analytics Backend

Complete backend for advanced analysis of Orca Whirlpools pools and positions on Solana, with real-time price integration via CoinGecko API, intelligent caching system, and detailed financial analysis.

## 📚 API Documentation

For complete API documentation with detailed examples, parameters, and responses, see:
**[📖 Complete API Documentation](./README.md#-apis-and-endpoints)**

## 🔧 Latest Updates

### v1.9.2 - Type and Conversion Fixes (2025-01-16)
- ✅ **BN class fix** - Correct import using `bn.js` instead of Anchor
- ✅ **53-bit error resolved** - Replaced `.toNumber()` with safe methods for large numbers
- ✅ **Decimal conversions** - All A and B quantities now come converted by correct decimals
- ✅ **TypeScript types** - Installed `@types/bn.js` for complete type support
- ✅ **Improved financial analysis** - HODL value calculation using initial quantities with current prices
- ✅ **Data consistency** - Standardized conversions in `investment`, `feesCollected`, `withdraw` and `feesUncollected`

### v1.9.1 - Type Fixes (2025-01-15)
- ✅ **Fixed Decimal types** - Import and functions now use `Decimal` correctly
- ✅ **Calculation functions** - `tickToSqrtPrice()` and `q64ToFloat()` now return `Decimal`
- ✅ **Clean compilation** - All TypeScript errors related to `Decimal` types resolved
- ✅ **Mathematical precision** - Liquidity calculations now use complete decimal precision

### 🧪 Postman Collection

To facilitate local testing, use the Postman collection available in the repository:

- [postman/Brokk-local.postman_collection.json](./postman/Brokk-local.postman_collection.json)

Import this file into Postman to have access to all routes with ready examples.

### 🔗 Integration with Original Orca API

This backend integrates directly with the **official Orca API** to provide updated and accurate data. For complete reference of the original API, see:

**[🌐 Official Orca API Documentation](https://api.orca.so/docs)**

**Main endpoints used:**
- **[Pools API](https://api.orca.so/docs#tag/whirlpools/get/pools)** - Pool list and market data
- **[Pool by Address](https://api.orca.so/docs#tag/whirlpools/get/pools/{address})** - Specific pool data
- **[Lock API](https://api.orca.so/docs#tag/whirlpools/get/lock/{address})** - Lock and staking data
- **V2 API** - Updated pool data and statistics

**Integration features:**
- ✅ **Transparent parameter passing** - All Orca API query parameters are supported
- ✅ **Automatic fallback** - In case of error, retries without parameters
- ✅ **Rate limiting** - Respects Orca API limits
- ✅ **Intelligent cache** - Optimizes performance when possible

**Usage example with Orca API parameters:**
```bash
# All these parameters are passed directly to the Orca API
curl "http://localhost:3001/pools?sortBy=volume&sortDirection=desc&stats=5m&includeBlocked=true&limit=10"

# For a specific pool with additional parameters
curl "http://localhost:3001/pools/Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE?stats=5m&includeBlocked=true"
```

## 🎯 Overview

This backend provides RESTful APIs for Orca Whirlpools data analysis, including:
- Pool and liquidity position analysis
- Tick data for range visualizations
- Consolidated position overview by wallet
- Integration with official Orca SDK
- Helius webhooks for real-time updates

## ⚡ Quick Start

### Prerequisites
- **Node.js 20+** (recommended 20.18.0+)
- **PostgreSQL 14+** 
- **Internet connection** (for prices via CoinGecko API)
- **Git** for repository cloning

### Quick Installation
```bash
# 1. Clone the repository
git clone https://github.com/brokk-pools/defi-analytics.git
cd defi-analytics/backend

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env
# Edit .env with your settings (see section below)

# 4. Run the server
npm run dev
```

### Detailed .env Configuration
```bash
# ===========================================
# REQUIRED SETTINGS
# ===========================================

# PostgreSQL Database
DATABASE_URL=postgresql://username:password@localhost:5432/orca_whirlpools

# CoinGecko API (automatic, no key required)
# Cache system implemented to optimize performance

# ===========================================
# SERVER SETTINGS
# ===========================================

# Server port
PORT=3001

# Execution environment
NODE_ENV=development

# ===========================================
# OPTIONAL SETTINGS
# ===========================================

# Redis (for cache, if available)
REDIS_URL=redis://localhost:6379

# Logs
LOG_LEVEL=info
```

### Installation Verification
```bash
# Test if the server is working
curl http://localhost:3001/health

# Test a basic route
curl http://localhost:3001/pools

# Test liquidity analysis
curl http://localhost:3001/liquidity/6PaZJLPmJPd3kVx4pBGAmndfTXsJS1tcuYhqvHFSZ4RY
```

**🎯 Ready!** The server will be running at `http://localhost:3001` with all APIs available.

## 💰 Price and Cache System

### CoinGecko API Integration

The system uses the **CoinGecko API** for real-time prices with:
- **Intelligent cache** with 5-minute TTL
- **Automatic fallback** in case of rate limits
- **Historical prices** with support for specific dates
- **Fault tolerance** with emergency cache

### Cache System

**Features:**
- ✅ **In-memory cache** with configurable TTL (5 minutes)
- ✅ **Smart keys** separated for current and historical prices
- ✅ **Fallback to expired cache** when API fails
- ✅ **Detailed logs** for performance monitoring
- ✅ **Rate limit handling** (error 429) with automatic recovery

**Configuration:**
```typescript
// Cache TTL: 5 minutes
const CACHE_TTL = 5 * 60 * 1000;

// Cache keys:
// - Current prices: tokenAddress
// - Historical prices: tokenAddress_date
```

### Enabled features:
- ✅ **Real-time prices** for all tokens
- ✅ **Historical analysis** with accurate prices
- ✅ **ROI/APR calculation** with real data
- ✅ **Impermanent loss analysis**
- ✅ **Financial metrics** in USD
- ✅ **Optimized performance** with cache

## 🚀 Features

### 📊 Advanced Pool Analysis
- **Complete pool data** with detailed tick and liquidity information
- **Range analysis** for liquidity concentration visualizations
- **Liquidity statistics** with distribution metrics
- **Accurate price calculation** via CoinGecko API with intelligent cache
- **Historical price support** with specific timestamp
- **Pair analysis** with relative price calculation

### 🎯 Position and Liquidity Management
- **Position search by owner** using official Orca SDK
- **Individual position data** with range and status information
- **Consolidated overview** of all positions in a wallet
- **Tick analysis** for range visualizations
- **Position status** (active, out of range, below/above)
- **Current liquidity calculation** and USD values

### 💰 Complete Financial Analysis (Brokk Analytics)
- **ROI and APR** calculated with precision
- **Fee analysis** collected and pending
- **PnL calculation** (Profit and Loss)
- **Impermanent loss analysis**
- **Gas cost tracking**
- **Aggregated metrics** across multiple positions
- **Historical analysis** with proper USD valuation

### 🔄 Integration and Performance
- **Official Orca SDK** for accurate and updated data
- **CoinGecko API** for real-time prices with cache system
- **Optimized RPC connection** with support for multiple providers
- **Rate limiting** for protection against abuse
- **Structured logging** for monitoring and debugging
- **Intelligent cache** for performance optimization

### 🔍 APIs and Endpoints

#### 🏥 Health Check
```bash
GET /health
```
**Description:** Checks if the server is working and returns system status.

**Response:**
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
**Description:** Positions of a specific wallet (same format as `/liquidity`).

**Parameters:**
- `publicKey` (required): Solana wallet address

**Returned Data:**
- **Standardized format:** same format as other position routes
- **Consolidated data:** overview of all wallet positions
- **Range analysis:** position status relative to current tick

**Example:**
```bash
curl "http://localhost:3001/wallet/6PaZJLPmJPd3kVx4pBGAmndfTXsJS1tcuYhqvHFSZ4RY"
```

#### 🎯 Position Details
```bash
GET /position/:nftMint
```
**Description:** Complete data of a specific position by NFT mint.

**Parameters:**
- `nftMint` (required): Position NFT address

**Returned Data:**
- **Position information:** range, liquidity, status
- **Pool data:** tokens, fees, current tick
- **Financial analysis:** USD values, pending fees
- **Metadata:** timestamps, last update

**Example:**
```bash
curl "http://localhost:3001/position/77mnr1C294q2eHSuxxaM3R44ZWwJ89FztcwDB3EcaBR"
```

#### 💧 Liquidity Overview
```bash
GET /liquidity/:owner?saveFile=true
```
**Description:** Consolidated overview of all liquidity positions of an owner.

**Parameters:**
- `owner` (required): Address of the position owner
- `saveFile` (optional): saves result to JSON file

**Returned Data:**
- **Positions:** list of all positions with detailed data
- **Statistics:** liquidity totals, fees, active/inactive positions
- **Range analysis:** positions within/outside current range
- **USD values:** calculated via CoinGecko API with cache
- **Tick comparison:** data for range visualization

**Example:**
```bash
curl "http://localhost:3001/liquidity/6PaZJLPmJPd3kVx4pBGAmndfTXsJS1tcuYhqvHFSZ4RY"
```

#### Outstanding Fees Calculation (Primary)
```bash
GET /fees/:poolId/:owner
```
Calculates outstanding (uncollected) fees for an owner in a specific pool in real-time using Orca's official algorithm.

**Features:**
- Aggregates fees from all owner positions in the specified pool
- Real-time calculation using Orca's official algorithm
- Proper decimal handling for different token types
- Support for filtering by specific position
- Detailed breakdown by position when requested

**Parameters:**
- `poolId` (required): Whirlpool pool address
- `owner` (required): Owner wallet address
- `positionId` (optional): Specific position identifier (NFT mint)
- `showPositions` (optional): If `true`, returns details by position

**Examples:**
```bash
# Fees from all owner positions in the pool
curl "http://localhost:3001/fees/Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE/2mu3kyTmEvdjPUeb9CPHMqDWT7jZEWqiyqtrJyMHHhuc"

# Fees from a specific position
curl "http://localhost:3001/fees/Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE/2mu3kyTmEvdjPUeb9CPHMqDWT7jZEWqiyqtrJyMHHhuc?positionId=6TKDPz14cZZ6yGAEzqB7GodX8R32zf5NcnnZeRovCbQH"

# Details by position
curl "http://localhost:3001/fees/Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE/2mu3kyTmEvdjPUeb9CPHMqDWT7jZEWqiyqtrJyMHHhuc?showPositions=true"
```

**Returned data:**
- `totalPositions`: Number of positions found for the owner in the pool
- `positionAddresses`: Array of position PDA addresses
- `tokenA/tokenB`: Token information including mint addresses and decimals
- `totals`: Aggregated outstanding fees (raw values in smallest units, human values converted)
- `positions` (if `showPositions=true`): Detailed breakdown by position with individual fee calculations

#### Outstanding Fees Calculation (Legacy)
```bash
GET /fees/position/:positionId/:poolId
```
Calculates outstanding fees for a specific position (maintained for compatibility).

**Parameters:**
- `positionId` (required): Position identifier (can be NFT mint or position address)
- `poolId` (required): Whirlpool pool address

**Example:**
```bash
curl "http://localhost:3001/fees/position/6TKDPz14cZZ6yGAEzqB7GodX8R32zf5NcnnZeRovCbQH/Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE"
```

**Returned data:**
- `feeOwedAOnChain`: Fees already recorded on-chain for token A (smallest units)
- `feeOwedBOnChain`: Fees already recorded on-chain for token B (smallest units)
- `feeOwedAComputedNow`: Total fees for token A including pending (smallest units)
- `feeOwedBComputedNow`: Total fees for token B including pending (smallest units)
- `calculations`: Detailed intermediate calculations (Q64.64 format)
- `currentTick`: Current pool tick
- `tickLowerIndex`/`tickUpperIndex`: Position range
- `tokenMintA`/`tokenMintB`: Token addresses

**Important notes:**
- All fee values are in smallest token units
- To display readable values, divide by `10^decimals` of the token
- Q64.64 values are for internal calculations, don't need to be displayed
- The difference between `ComputedNow` and `OnChain` represents pending fees

#### Collected Fees History
```bash
GET /fees/collected/:poolId/:owner
```
Queries on-chain collected fees for a user in a specific pool within a UTC time range.

**Features:**
- On-chain transaction analysis for fee collection events
- Flexible time range with sensible defaults (1900-01-01 to tomorrow if not specified)
- Position-specific filtering capability
- Detailed transaction history with position IDs
- Proper decimal handling for different token types
- Real-time blockchain data analysis

**Parameters:**
- `poolId` (required): Whirlpool pool address
- `owner` (required): User wallet address
- `startUtc` (optional): Start date/time in ISO 8601 format (default: 1900-01-01T00:00:00Z)
- `endUtc` (optional): End date/time in ISO 8601 format (default: tomorrow)
- `showHistory` (optional): Include detailed transaction history (boolean)
- `positionId` (optional): Specific position NFT mint to filter by (if empty, returns all positions)

**Examples:**
```bash
# All collected fees (full history)
curl "http://localhost:3001/fees/collected/Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE/2mu3kyTmEvdjPUeb9CPHMqDWT7jZEWqiyqtrJyMHHhuc"

# Collected fees in a specific period
curl "http://localhost:3001/fees/collected/Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE/2mu3kyTmEvdjPUeb9CPHMqDWT7jZEWqiyqtrJyMHHhuc?startUtc=2025-10-01T00:00:00Z&endUtc=2025-10-12T23:59:59Z"

# With detailed history
curl "http://localhost:3001/fees/collected/Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE/2mu3kyTmEvdjPUeb9CPHMqDWT7jZEWqiyqtrJyMHHhuc?showHistory=true"

# For a specific position with history
curl "http://localhost:3001/fees/collected/Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE/2mu3kyTmEvdjPUeb9CPHMqDWT7jZEWqiyqtrJyMHHhuc?positionId=6TKDPz14cZZ6yGAEzqB7GodX8R32zf5NcnnZeRovCbQH&showHistory=true"
```

**Returned data:**
- `positionId`: Position NFT mint (null if filtering all positions)
- `positionAddress`: Position PDA address (null if filtering all positions)
- `totalPositions`: Number of positions found for the owner in the pool
- `positionAddresses`: Array of position PDA addresses
- `totals.A.raw`: Total collected fees for token A (smallest units)
- `totals.A.human`: Total collected fees for token A (readable format)
- `totals.B.raw`: Total collected fees for token B (smallest units)
- `totals.B.human`: Total collected fees for token B (readable format)
- `interval_utc`: Time range queried
- `tokenA`/`tokenB`: Token information (mint, ATA, decimals)
- `history`: Detailed transaction history (if `showHistory=true`)

**Important notes:**
- Queries Solana blockchain directly via RPC
- Analyzes owner transactions (not ATAs) for better performance
- Filters only transactions related to Orca Whirlpools program
- Detects collected fees through Anchor logs (`"Instruction: CollectFees"`)
- Analyzes inner instructions to detect transfers from pool vaults
- Detects transfers of both tokens (A and B) in the same transaction
- If `positionId` is provided, filters only transactions from that specific position
- If `positionId` is empty, returns fees from all user positions in the pool
- Values in raw and human-readable format
- History includes signature, datetime, values and positionId of each transaction

#### Pools (Orca API)
```bash
GET /pools?sortBy=volume&sortDirection=desc
GET /pools/:poolId
```
Searches pool data using the official Orca API.

**Original API reference:**
- **[Pools API](https://api.orca.so/docs#tag/whirlpools/get/pools)** - Pool list
- **[Pool by Address](https://api.orca.so/docs#tag/whirlpools/get/pools/{address})** - Specific pool

**Parameters:**
- `sortBy` (optional): Field for sorting (volume, liquidity, etc.)
- `sortDirection` (optional): `asc` or `desc`
- `poolId` (required for specific route): Pool ID
- **All Orca API parameters** are automatically supported

#### Pool Details
```bash
GET /poolsdetails/:poolid?topPositions=10
```
Returns complete pool data with detailed tick and position analysis.

**Parameters:**
- `poolid` (required): Pool address
- `topPositions` (optional): number (e.g. 10) to limit to N positions with highest liquidity (0-1000). If > 0, includes positions

#### Position Details
```bash
GET /position/:nftMint
```
Returns complete data of a specific position in the same format as the liquidity route.

**Parameters:**
- `nftMint` (required): Position NFT address

**Returned data:**
- `positionMint`: Position NFT address
- `whirlpool`: Associated pool address
- `tickLowerIndex`: Lower tick index
- `tickUpperIndex`: Upper tick index
- `currentTick`: Current pool tick
- `liquidity`: Position liquidity
- `feeOwedA`: Token A fees owed
- `feeOwedB`: Token B fees owed
- `isInRange`: If position is in current range
- `currentPrice`: Current price (simplified)
- `lowerPrice`: Lower price (simplified)
- `upperPrice`: Upper price (simplified)
- `status`: Position status (active, below_range, above_range, out_of_range)
- `tickComparison`: Object with detailed tick comparisons for visualization
- `lastUpdated`: Last update timestamp

#### Top Positions
```bash
GET /top-positions?limit=10
```
Returns positions with highest liquidity in the same format as the position route.

**Parameters:**
- `limit` (optional): Number of positions to return (1-1000, default: 10)

**Returned data:**
- `positions`: Array of positions in the same format as the position route
- `statistics`: Position statistics (total, lamports, etc.)
- `totalFound`: Total positions found on the network
- `limit`: Requested limit

**Returned data (Pool Details):**
- `allTicks`: Array of all ticks with detailed data
- `tickStats`: Tick statistics and range analysis
- `tickStats.rangeAnalysis.ticksAroundCurrent`: Ticks near current price
- `tickStats.rangeAnalysis.liquidityConcentration`: Liquidity distribution
- `tickStats.currentPrice`: Adjusted current price
- `tickStats.liquidityDistribution`: Distribution statistics
- `positions`: Array of positions (if `showpositions=true`)
- `positionStats`: Aggregated position statistics

#### Top Positions
```bash
GET /top-positions?limit=10
```
Returns top positions by volume or liquidity.

**Parameters:**
- `limit` (optional): Number of positions to return (default: 10)

#### 🎯 TickArray Data
```bash
GET /tickarray/:poolId
```
**Description:** Returns complete TickArray data for a specific pool using direct RPC.

**Parameters:**
- `poolId` (required): Whirlpool address

**Returned Data:**
- `pool`: Pool address
- `totalArrays`: Total number of TickArrays found
- `tickArrays`: Array with data from each TickArray
  - `address`: TickArray address
  - `startTickIndex`: Initial tick index
  - `whirlpool`: Associated pool address
  - `ticksCount`: Number of ticks with liquidity
  - `ticks`: Array of ticks with detailed data

**Example:**
```bash
curl "http://localhost:3001/tickarray/FwewVm8u6tFPGewAyHmWAqad9hmF7mvqxK4mJ7iNqqGC"
```

#### ⛽ Gas Calculation
```bash
GET /gas/:positionId?showHistory=false
```
**Description:** Calculates total gas fees for a specific position.

**Parameters:**
- `positionId` (required): Position NFT address
- `showHistory` (optional): If `true`, returns detailed transaction history

**Returned Data:**
- `totalFeeLamports`: Total fees in lamports
- `totalFeeSol`: Total fees in SOL
- `totalFeeUSD`: Total fees in USD
- `history` (if `showHistory=true`): Array with details of each transaction

**Example:**
```bash
curl "http://localhost:3001/gas/G6yv54g3R2NjGrJXENHG6iRRCqiCw28ySmS7SR6SP5pF"
```

#### 📊 Analytics
```bash
GET /analytics/:poolId/:owner?positionId=POSITION_MINT
```
**Description:** Complete financial analysis of positions with real gas data.

**Parameters:**
- `poolId` (required): Pool address
- `owner` (required): Owner address
- `positionId` (optional): Specific position NFT mint

**Returned Data:**
- `investment`: Initial investment data
- `feesCollected`: Collected fees
- `feesUncollected`: Pending fees
- `withdraw`: Withdrawn values
- `gas`: **Real gas data** calculated via `GetGasInPosition`

**Example:**
```bash
curl "http://localhost:3001/analytics/FwewVm8u6tFPGewAyHmWAqad9hmF7mvqxK4mJ7iNqqGC/6PaZJLPmJPd3kVx4pBGAmndfTXsJS1tcuYhqvHFSZ4RY?positionId=G6yv54g3R2NjGrJXENHG6iRRCqiCw28ySmS7SR6SP5pF"
```

#### Webhook (Helius)
```bash
POST /webhook/helius
```
Endpoint to receive Helius webhooks with position events.

**Headers:**
- `Content-Type: application/json`
- `X-Helius-Signature`: Webhook signature (if configured)

#### Metrics (Production)
```bash
GET /metrics
```
Returns system metrics (available only in production).

**Example response from `/liquidity/:owner` route:**
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

## 🛠️ Installation and Configuration

### Prerequisites
- **Node.js >= 20.17.0** (recommended: 20.18.0+)
- **npm** (included with Node.js)
- **Helius API key** (recommended for better performance)
- **PostgreSQL** (optional, for persistent data)

### Quick Installation
```bash
# Clone the repository
git clone https://github.com/brokk-pools/defi-analytics.git
cd defi-analytics/backend

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit the .env file with your settings
```

### Environment Configuration
```bash
# RPC Configuration (Helius recommended)
HELIUS_RPC=https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}
HELIUS_API_KEY=your_helius_api_key_here

# Server Configuration
PORT=3001
HOST=localhost
NODE_ENV=development

# Orca Configuration
ORCA_NETWORK=mainnet
ORCA_WHIRLPOOLS_PROGRAM_ID=whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc

# Database (optional)
DATABASE_URL=postgres://user:password@localhost:5432/orca_mvp
```

### Execution
```bash
# Development (with hot reload)
npm run dev

# Production
npm run build
npm start

# Debug (with debugger)
npm run dev:debug
```

### Installation Verification
```bash
# Test if the server is working
curl http://localhost:3001/health

# Should return "ok" status and system metrics
```

## 📦 Main Dependencies

### 🔧 Core (Orca & Solana)
- **@orca-so/whirlpools-sdk** `^0.16.0`: Official Orca SDK for pool interaction
- **@orca-so/whirlpools** `^4.0.0`: Main Orca Whirlpools library
- **@orca-so/common-sdk** `^0.6.11`: Orca common SDK
- **@coral-xyz/anchor** `^0.29.0`: Anchor framework for Solana
- **@solana/web3.js** `^1.98.4`: Official Solana SDK
- **@solana/spl-token** `^0.4.8`: Solana SPL tokens
- **@solana/kit** `^2.3.0`: Solana utility kit

### 🌐 APIs and Integration
- **Helius API**: Real-time prices via Pyth and Jupiter
- **Orca API**: Official pool and token data
- **PostgreSQL**: Database for cache and persistence
- **Redis**: Cache for performance optimization (optional)

### 🛠️ Utilities
- **decimal.js** `^10.6.0`: Precise decimal calculations
- **winston** `^3.15.0`: Structured logging system
- **express** `^5.1.0`: Web framework for REST APIs
- **helmet** `^8.0.0`: HTTP security
- **cors** `^2.8.5`: Cross-Origin Resource Sharing
- **compression** `^1.7.4`: Response compression

### Backend (Express & Utils)
- **express** `^5.1.0`: Modern web framework
- **winston** `^3.15.0`: Structured logging system
- **helmet** `^8.0.0`: HTTP security
- **cors** `^2.8.5`: Cross-Origin Resource Sharing
- **compression** `^1.7.4`: Response compression
- **express-rate-limit** `^7.4.1`: Rate limiting
- **express-session** `^1.18.1`: Session management
- **pg** `^8.16.3`: PostgreSQL client
- **ioredis** `^5.4.1`: Redis client
- **decimal.js** `^10.6.0`: Decimal precision for financial calculations

### Development
- **typescript** `^5.9.3`: Static typing
- **tsx** `^4.20.6`: TypeScript execution
- **@types/***: Type definitions for all dependencies

## 🎯 Use Cases for Frontend

### 1. Liquidity Chart by Price
Use `allTicks` with `priceAdjusted` and `liquidityGross` to create liquidity distribution visualizations.

### 2. Current Range Analysis
Use `ticksAroundCurrent` to show range near current price, highlighting active ticks.

### 3. Pool Statistics
Use `liquidityDistribution` for general metrics and liquidity concentration.

### 4. Price Analysis
Use `currentPrice` for current price and compare with `priceAdjusted` from ticks.

### 5. Position Analysis
Use `positions` and `positionStats` for position analysis:
- **Position status**: `active` vs `out_of_range`
- **Accumulated fees**: `feeOwedA` and `feeOwedB` per position
- **Liquidity per position**: `liquidity` and `liquidityPercentage`
- **Price range**: `lowerPrice` and `upperPrice` vs `currentPrice`
- **Aggregated statistics**: `positionStats` with totals and percentages

## 🔧 Architecture

### File Structure
```
src/
├── lib/
│   ├── orca.ts          # Main Orca SDK functions
│   ├── logger.ts        # Logging system
│   ├── security.ts      # Security middleware
│   ├── errors.ts        # Error handling
│   ├── db.ts            # Database configuration
│   ├── types.ts         # TypeScript definitions
│   ├── validation.ts    # Environment variable validation
│   └── vault.ts         # Vault resolver functions
├── routes/
│   ├── webhook.ts       # Helius webhook
│   ├── wallet.ts        # Positions by wallet
│   ├── position.ts      # Specific position details
│   ├── liquidity.ts     # Liquidity overview (Orca SDK)
│   ├── pools.ts         # Pools via Orca API
│   ├── pools-details.ts # Complete pool details
│   └── top-positions.ts # Top positions by volume/liquidity
└── index.ts             # Main server
```

### Data Flow
1. **Request** → Security and rate limiting middleware
2. **Validation** → Parameters and addresses
3. **Orca SDK** → Data search using official SDK
4. **Processing** → Price calculations and statistics
5. **Response** → Structured data for frontend

## 🚀 Usage Examples

### 1. Wallet Liquidity Overview
```bash
# Search all liquidity positions of a wallet
curl "http://localhost:3001/liquidity/6PaZJLPmJPd3kVx4pBGAmndfTXsJS1tcuYhqvHFSZ4RY"

# Save result to file
curl "http://localhost:3001/liquidity/6PaZJLPmJPd3kVx4pBGAmndfTXsJS1tcuYhqvHFSZ4RY?saveFile=true"
```

### 2. Complete Pool Details
```bash
# Basic pool data (without positions)
curl "http://localhost:3001/poolsdetails/Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE"

# Include only top 10 positions (lighter)
curl "http://localhost:3001/poolsdetails/Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE?topPositions=10"

# Include only top 20 positions
curl "http://localhost:3001/poolsdetails/Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE?topPositions=20"
```

### 3. Specific Position Details
```bash
# Search complete data of a position (same format as liquidity route)
curl "http://localhost:3001/position/77mnr1C294q2eHSuxxaM3R44ZWwJ89FztcwDB3EcaBR"
```

### 4. Top Positions (Highest Liquidity Positions)
```bash
# Search top 10 positions with highest liquidity
curl "http://localhost:3001/top-positions?limit=10"

# Search top 50 positions
curl "http://localhost:3001/top-positions?limit=50"
```

### 5. Wallet Positions
```bash
# Search positions of a specific wallet (same format as other routes)
curl "http://localhost:3001/wallet/6PaZJLPmJPd3kVx4pBGAmndfTXsJS1tcuYhqvHFSZ4RY"
```

### 6. Specific Position Details
```bash
# Search position details using NFT mint
curl "http://localhost:3001/position/3xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
```

### 7. Orca Pools
```bash
# List all pools
curl "http://localhost:3001/pools"

# Search specific pool
curl "http://localhost:3001/pools/Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE"

# Sort by volume
curl "http://localhost:3001/pools?sortBy=volume&sortDirection=desc"
```

### 8. Top Positions
```bash
# Top 10 positions
curl "http://localhost:3001/top-positions?limit=10"

# Top 50 positions
curl "http://localhost:3001/top-positions?limit=50"
```

### 9. Health Check and Metrics
```bash
# Service status
curl "http://localhost:3001/health"

# Metrics (production only)
curl "http://localhost:3001/metrics"
```

### Performance Parameter Benefits
- **`topPositions=0` (default)**: Faster response, pool data only
- **`topPositions=N`**: Focus on N positions with highest liquidity
- **Scalability**: Works well even with pools with thousands of positions

## 🚀 Performance

### Implemented Optimizations
- **Rate limiting** to prevent overload
- **HTTP response compression**
- **Pool data cache** when possible
- **Query parallelization** when appropriate
- **Fallback** to basic RPC if SDK fails

### Monitoring
- **Health check** with system metrics
- **Structured logging** with Winston
- **Error tracking** with detailed context

## 📝 Logs

The system uses Winston for structured logging:
- **Info**: Normal operations
- **Warn**: Attention situations
- **Error**: Errors and exceptions
- **Debug**: Detailed information (development)

## 🤝 Contributing

1. Fork the project
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is under the ISC license. See the `LICENSE` file for more details.

## 🎯 Practical Usage Examples

### 📊 Complete Portfolio Analysis
```bash
# 1. Check system health
curl http://localhost:3001/health

# 2. Search all positions of a wallet
curl "http://localhost:3001/liquidity/6PaZJLPmJPd3kVx4pBGAmndfTXsJS1tcuYhqvHFSZ4RY"

# 3. Analyze detailed ROI of a specific pool
curl "http://localhost:3001/brokk-analytics/Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE/6PaZJLPmJPd3kVx4pBGAmndfTXsJS1tcuYhqvHFSZ4RY"

# 4. See details of a specific position
curl "http://localhost:3001/position/77mnr1C294q2eHSuxxaM3R44ZWwJ89FztcwDB3EcaBR"

# 5. Find top positions on the network
curl "http://localhost:3001/top-positions?limit=20"
```

### 💰 Advanced Financial Analysis
```bash
# Analysis with specific period
curl "http://localhost:3001/brokk-analytics/Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE/6PaZJLPmJPd3kVx4pBGAmndfTXsJS1tcuYhqvHFSZ4RY?startUtc=2024-01-01T00:00:00Z&endUtc=2024-01-31T23:59:59Z&showHistory=true"

# Specific position analysis
curl "http://localhost:3001/brokk-analytics/Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE/6PaZJLPmJPd3kVx4pBGAmndfTXsJS1tcuYhqvHFSZ4RY?positionId=77mnr1C294q2eHSuxxaM3R44ZWwJ89FztcwDB3EcaBR"
```

### 🔍 Pool Exploration
```bash
# List all pools
curl "http://localhost:3001/pools"

# Complete pool details with top positions
curl "http://localhost:3001/poolsdetails/Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE?topPositions=10"

# Position fee analysis
curl "http://localhost:3001/fees/Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE/6PaZJLPmJPd3kVx4pBGAmndfTXsJS1tcuYhqvHFSZ4RY"
```

## 🆘 Support

- **Orca Documentation**: https://docs.orca.so/
- **Orca Discord**: https://discord.gg/orcaprotocol
- **Issues**: Use the GitHub issues system

## 🔄 Changelog

### v1.7.1 (Current)
- ✅ **Critical fix in collected fees detection** - now correctly detects both tokens (A and B)
- ✅ **Improved transaction analysis** - searches by owner instead of ATAs for better performance
- ✅ **Detection via Anchor logs** - uses `"Instruction: CollectFees"` to identify relevant transactions
- ✅ **Inner instruction analysis** - detects transfers from pool vaults regardless of destination
- ✅ **Updated documentation** with details about the new fee detection algorithm

### v1.7.0
- ✅ **Helius price provider implemented** with Pyth/Jupiter integration
- ✅ **Historical price support** with specific timestamp
- ✅ **Utility functions** to fetch token and pair prices
- ✅ **Helius API configuration** for real-time prices
- ✅ **Completely updated documentation** with detailed examples
- ✅ **Improved API structure** with detailed descriptions and parameters
- ✅ **Usage examples** for all main routes

### v1.6.0
- ✅ **Refactored brokk-analytics route** to remove price provider dependency
- ✅ **Renamed BrokkFinancePools.ts file** to brokkfinancepools.ts (lowercase)
- ✅ **Simplified brokk-analytics route** removing rpcUrl and leaving provider to brokkfinancepools
- ✅ **Consistent use of orca.ts** in all analysis routes
- ✅ **Updated documentation** reflecting changes in brokk-analytics route

### v1.5.0
- ✅ **Refactored wallet route** to use getLiquidityOverview and return standardized format
- ✅ **Total consistency** between all position routes: `/wallet`, `/liquidity`, `/position`, `/top-positions`
- ✅ **Simplified wallet route** from 116 to 76 lines with centralized logic
- ✅ **Updated documentation** with wallet route response example
- ✅ **Improved error handling** with specific messages for wallets

### v1.4.0
- ✅ **Refactored top-positions route** with all business logic migrated to orca.ts
- ✅ **Data consistency** between routes `/top-positions`, `/position/:nftMint` and `/liquidity/:owner`
- ✅ **Created getTopPositionsData function** to centralize top positions search logic
- ✅ **Standardized processing** using processPositionDataFromRaw for same format
- ✅ **Updated documentation** with new top-positions route and usage examples
- ✅ **Performance optimization** with batch processing for large volumes

### v1.3.0
- ✅ **Refactored position route** to return exactly the same format as liquidity route
- ✅ **Data consistency** between routes `/position/:nftMint` and `/liquidity/:owner`
- ✅ **Created processPositionData function** to standardize position processing
- ✅ **Updated documentation** with complete details of returned fields
- ✅ **Response examples** added to documentation
- ✅ **Improved error handling** with specific messages for different scenarios

### v1.2.0
- ✅ **Updated README** with basic information and API documentation reference
- ✅ **Improved installation instructions** with updated commands
- ✅ **Updated dependencies** with specific versions
- ✅ **More detailed environment configuration**
- ✅ **Installation verification** with test commands

### v1.1.0
- ✅ **Complete refactoring of `/liquidity` route** with official Orca SDK
- ✅ **Reusable `createRpcConnection()` function** for RPC connections
- ✅ **Moved `convertBigIntToString()` utility function** to `orca.ts`
- ✅ **Precise in-range/out-of-range calculation** with tick comparison data
- ✅ **Translated messages to English** in all routes
- ✅ **Removed `positions-by-owner` route** (eliminated duplication)
- ✅ **Fixed PostgreSQL configuration** to avoid SASL/SCRAM errors
- ✅ **Better error handling and structured logging**
- ✅ **`tickComparison` data** for frontend visualizations
- ✅ **Complete API documentation** with practical examples

### v1.0.0
- ✅ Complete integration with @orca-so/whirlpools-sdk
- ✅ `/poolsdetails/:poolid` route with tick analysis
- ✅ Detailed data for range visualizations
- ✅ `showpositions` and `topPositions` parameters for performance control
- ✅ Adjusted price calculation for different tokens
- ✅ Liquidity and concentration statistics
- ✅ Logging and monitoring system
- ✅ Rate limiting and security
- ✅ Routes: `/wallet`, `/position`, `/liquidity`, `/pools`, `/poolsdetails`, `/top-positions`, `/webhook`, `/fees`, `/brokk-analytics`

#### 💰 Brokk Analytics (Complete Financial Analysis)
```bash
GET /brokk-analytics/:poolId/:owner?positionId=xxx&startUtc=2024-01-01T00:00:00Z&endUtc=2024-01-31T23:59:59Z&showHistory=true
```
**Description:** Complete financial analysis of LP performance in Orca Whirlpools (Revert Finance style).

**Parameters:**
- `poolId` (required): Whirlpool pool address
- `owner` (required): Owner wallet address
- `positionId` (optional): Specific position identifier (NFT mint)
- `startUtc` (optional): Start date for historical analysis (ISO 8601)
- `endUtc` (optional): End date for historical analysis (ISO 8601)
- `showHistory` (optional): Include detailed transaction history

**Features:**
- **ROI and APR** calculated with precision via Helius API
- **Fee analysis** collected and pending
- **Detailed PnL calculation** (Profit and Loss)
- **Impermanent loss analysis**
- **Gas cost tracking**
- **Aggregated metrics** across multiple positions
- **Historical analysis** with proper USD valuation

**Examples:**
```bash
# Complete ROI analysis for all owner positions in the pool
curl "http://localhost:3001/brokk-analytics/Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE/2mu3kyTmEvdjPUeb9CPHMqDWT7jZEWqiyqtrJyMHHhuc"

# ROI analysis for a specific position
curl "http://localhost:3001/brokk-analytics/Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE/2mu3kyTmEvdjPUeb9CPHMqDWT7jZEWqiyqtrJyMHHhuc?positionId=6TKDPz14cZZ6yGAEzqB7GodX8R32zf5NcnnZeRovCbQH"

# ROI analysis with specific period and history
curl "http://localhost:3001/brokk-analytics/Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE/2mu3kyTmEvdjPUeb9CPHMqDWT7jZEWqiyqtrJyMHHhuc?startUtc=2025-10-01T00:00:00Z&endUtc=2025-10-12T23:59:59Z&showHistory=true"
```

**Returned data:**
- `positions[]`: Array of financial analysis by position
- `range`: Price range (min/max/current) for the position
- `investment`: Initial investment values and USD values at deposit time
- `current`: Current token quantities and USD values
- `fees`: Collected, uncollected, reinvested, and total fees in USD
- `rewards`: Unclaimed and claimed rewards in USD
- `withdrawn`: Principal withdrawals in USD
- `gas`: Gas costs in SOL and USD
- `pnlExcludingGasUSDT`: Profit/Loss excluding gas costs
- `roiPct`: Return on Investment percentage
- `aprPct`: Annualized Percentage Rate
- `divergenceLossUSDT`: Impermanent Loss (LP value vs HODL value)
- `aggregated`: Sum of all position metrics

**Important notes:**
- Integrates with existing orca.ts functions (getOutstandingFeesForPosition, feesCollectedInRange)
- Uses basic price provider for testing (configurable for production)
- Calculates complete financial metrics including PnL, ROI, APR and IL
- Support for single position analysis or multiple position aggregation
- Historical analysis with proper USD valuation by timestamp