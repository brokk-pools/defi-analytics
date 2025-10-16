# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [1.9.2] - 2025-01-16

### Fixed
- 🔧 **BN class fix** - Correct import using `bn.js` instead of Anchor
- 🔧 **53-bit error resolved** - Replaced `.toNumber()` with safe methods for large numbers
- 🔧 **Decimal conversions** - All A and B quantities now come converted by correct decimals
- 🔧 **TypeScript types** - Installed `@types/bn.js` for complete type support
- 🔧 **Improved financial analysis** - HODL value calculation using initial quantities with current prices
- 🔧 **Data consistency** - Standardized conversions in `investment`, `feesCollected`, `withdraw` and `feesUncollected`

### Added
- ✅ **Complete BN type support** - Correct import and usage of `bn.js` library
- ✅ **Safe large number conversions** - Use of `parseFloat()` and `.toString()` to avoid precision loss
- ✅ **Updated documentation** - Details about type and conversion fixes

## [1.9.1] - 2025-01-15

### Fixed
- 🔧 **Fixed Decimal types** in `orca.ts` - import and functions now use `Decimal` correctly
- 🔧 **Function `tickToSqrtPrice()`** now returns `Decimal` instead of `number`
- 🔧 **Function `q64ToFloat()`** now returns `Decimal` instead of `number`
- 🔧 **Function `amountsFromLiquidityDecimal()`** now works correctly with `Decimal` types
- 🔧 **TypeScript compilation errors** related to `Decimal` types resolved

## [1.9.0] - 2025-01-15

### Added
- ✅ **New route `/tickarray/:poolId`** to fetch TickArray data using direct RPC
- ✅ **Function `GetTickData()`** implemented in `orca.ts` with direct data parsing
- ✅ **Real gas integration** in `/analytics` route via `GetGasInPosition`
- ✅ **Pending requests system** to avoid duplicate calls to CoinGecko API
- ✅ **Improved cache** with 10-minute TTL and intelligent fallback
- ✅ **Updated documentation** with new routes and features

### Modified
- 🔄 **Function `processPositionDataFromRaw()`** now uses direct RPC instead of SDK
- 🔄 **Price cache system** optimized with duplicate call prevention
- 🔄 **Route `/analytics`** now returns real gas data instead of zero values
- 🔄 **Postman collection** updated with new routes and corrected parameters
- 🔄 **README.md** expanded with complete documentation of new features

### Removed
- ❌ **Parameter `showTicks`** from `/position` route (implementation removed)
- ❌ **SDK dependency** for pool data search in `processPositionDataFromRaw`
- ❌ **Zero gas values** in `/analytics` route

### Fixed
- 🐛 **Compilation errors** related to TypeScript types
- 🐛 **CoinGecko API rate limits** with robust cache system
- 🐛 **Duplicate calls** to external APIs with pending requests system

## [1.8.0] - 2025-01-14

### Added
- ✅ **Intelligent cache system** for CoinGecko API prices
- ✅ **In-memory cache** with configurable TTL (5 minutes)
- ✅ **Automatic fallback** to expired cache in case of rate limits
- ✅ **Rate limit handling** (error 429) with automatic recovery
- ✅ **Detailed logs** for cache performance monitoring
- ✅ **Smart cache keys** separated for current and historical prices

### Modified
- 🔄 **Complete migration** from Helius API to CoinGecko API
- 🔄 **Function `getCurrentPrice()`** now with integrated cache system
- 🔄 **Function `getHistoricalPrice()`** with cache for historical prices
- 🔄 **Error handling** improved with cache fallback
- 🔄 **Updated documentation** reflecting API changes
- 🔄 **Simplified configuration** without need for API keys

### Removed
- ❌ **Helius API dependency** for prices
- ❌ **HELIUS_API_KEY configuration** from .env
- ❌ **Helius references** in documentation

### Fixed
- 🐛 **Rate limit issues** resolved with cache system
- 🐛 **Price failures** in case of API limit exceeded
- 🐛 **Performance** improved with intelligent cache

## [1.0.0] - 2024-01-11

### Added
- ✅ Complete integration with `@orca-so/whirlpools-sdk`
- ✅ New route `/poolsdetails/:poolid` with detailed pool analysis
- ✅ `showpositions` parameter for performance control
- ✅ Structured data for range and liquidity visualizations
- ✅ Function `getFullPoolData()` with complete tick data
- ✅ Range analysis with `ticksAroundCurrent` and `liquidityConcentration`
- ✅ Adjusted price calculation for different tokens
- ✅ Liquidity and concentration statistics
- ✅ Helper function `calculateAdjustedPrice()` for accurate prices
- ✅ Support for known tokens (SOL, USDC, USDT, RAY, mSOL, ORCA)
- ✅ Complete updated documentation
- ✅ Enhanced logging system

### Modified
- 🔄 Complete refactoring of `src/lib/orca.ts` to use official SDK
- 🔄 Function `getPositionsByOwner()` now uses Orca SDK
- 🔄 Function `getPositionData()` with more detailed data
- 🔄 Function `calculateEstimatedFees()` improved
- 🔄 Function `getLiquidityOverview()` with aggregated statistics
- 🔄 Tick data structure completely restructured
- 🔄 Whirlpool context system using `WhirlpoolContext.withProvider()`

### Removed
- ❌ Function `initializeOrcaConfig()` (no longer needed)
- ❌ File `src/routes/pools-detail.ts` (replaced by `pools-details.ts`)
- ❌ File `PERFORMANCE_ANALYSIS.md` (content integrated into README)
- ❌ Manual position data parsing (now uses SDK)

### Breaking Changes
- ⚠️ Route `/pools-detail/:poolid` replaced by `/poolsdetails/:poolid`
- ⚠️ Tick response structure completely changed
- ⚠️ Function `initializeOrcaConfig()` removed
- ⚠️ Imports from `@orca-so/whirlpools` replaced by `@orca-so/whirlpools-sdk`

### Dependencies
- ➕ Added `@orca-so/whirlpools-sdk@^0.16.0`
- ➕ Added `@orca-so/common-sdk@^0.6.11`
- ➕ Added `@coral-xyz/anchor@0.29.0`
- ➕ Added `decimal.js@^10.6.0`
- 🔄 Updated `@solana/spl-token@^0.4.14`
- 🔄 Updated `@coral-xyz/anchor@^0.29.0`

## [0.9.0] - 2024-01-10

### Added
- ✅ Route `/poolsdetail/:poolid` (previous version)
- ✅ Performance analysis and high-performance configuration
- ✅ Logging system with Winston
- ✅ Security and rate limiting middleware

### Modified
- 🔄 Route structure reorganized
- 🔄 Enhanced error handling system

## [0.8.0] - 2024-01-09

### Added
- ✅ Dependencies `@orca-so/whirlpools-sdk` and `@solana/kit`
- ✅ Database migration system
- ✅ Environment variable validation

### Modified
- 🔄 TypeScript error resolution
- 🔄 Enhanced project structure

---

## How to Contribute

1. Fork the project
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## Versioning

This project uses [Semantic Versioning](https://semver.org/). For available versions, see the [tags in this repository](https://github.com/your-username/orca-whirlpools-mvp/tags).

## License

This project is under the ISC license. See the `LICENSE` file for more details.