# Setup Guide - Orca Whirlpools MVP

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- Docker & Docker Compose
- Git

### 1. Environment Setup

```bash
# Clone the project
git clone <your-repo>
cd orca-mvp

# Configure backend environment variables
cd backend
cp .env.example .env
# Edit .env with your Helius API key (get it at https://dev.helius.xyz)

# Configure frontend environment variables
cd ../frontend
echo "VITE_API_URL=http://localhost:3001" > .env
```

### 2. Database

```bash
# Start PostgreSQL
cd ../infra
docker compose up -d

# Check if it's running
docker compose ps
```

### 3. Backend

```bash
cd ../backend

# Install dependencies
npm install

# Compile TypeScript
npm run build

# Start server
npm start
```

The backend will be available at `http://localhost:3001`

### 4. Frontend

```bash
cd ../frontend

# Install dependencies (if needed)
npm install

# Start development
npm run dev
```

The frontend will be available at `http://localhost:5173`

## 🔧 Helius API Configuration

1. Visit [https://dev.helius.xyz](https://dev.helius.xyz)
2. Create a free account (100k requests/month)
3. Get your API key
4. Update the `backend/.env` file:

```env
HELIUS_API_KEY=your_key_here
```

5. Restart the backend

## 🧪 Testing the Application

### Backend Endpoints

```bash
# Health check
curl http://localhost:3001/health

# Test wallet with demo data
curl http://localhost:3001/wallet/11111111111111111111111111111112

# Returns:
# {"wallet":"11111111111111111111111111111112","positions":[{"nftMint":"DemoPosition1234567890abcdef","poolAddress":"DemoPool1234567890abcdef","tokenA":"SOL","tokenB":"USDC","tickLower":-29760,"tickUpper":29760,"liquidity":"1000000000","currentPrice":98.45,"inRange":true,"estimatedFeesA":"0.125","estimatedFeesB":"12.34"},{"nftMint":"DemoPosition0987654321fedcba","poolAddress":"DemoPool0987654321fedcba","tokenA":"USDC","tokenB":"RAY","tickLower":-1000,"tickUpper":1000,"liquidity":"500000000","currentPrice":2.15,"inRange":false,"estimatedFeesA":"5.67","estimatedFeesB":"0.089"}]}
```

### Frontend

1. Open `http://localhost:5173`
2. Enter any valid public key (e.g., `11111111111111111111111111111112`)
3. Click "Fetch Positions"
4. View the **2 demo positions** with professional design:
   - **SOL/USDC**: In Range, ₹98.45, with estimated fees
   - **USDC/RAY**: Out of Range, ₹2.15, with estimated fees

### ✅ Current Status - Functional MVP Demo

- **Backend**: ✅ Running with realistic mock data
- **Frontend**: ✅ Complete professional interface
- **Database**: ✅ PostgreSQL configured
- **API**: ✅ Endpoints working
- **UX**: ✅ Loading states, validation, responsive design

## 📋 Implemented Features

### Backend
- ✅ REST API with Express.js + TypeScript
- ✅ Orca SDK integration (simplified for MVP)
- ✅ Robust error handling
- ✅ Input validation
- ✅ PostgreSQL connection
- ✅ Helius webhook structure
- ✅ Logging system

### Frontend
- ✅ Modern React interface with Vite
- ✅ Professional design with custom CSS
- ✅ Loading states and skeleton loading
- ✅ Input validation
- ✅ Error handling
- ✅ Mobile responsive

### Infrastructure
- ✅ PostgreSQL via Docker
- ✅ Adminer for DB management
- ✅ Environment configuration
- ✅ Compiled TypeScript

## 🔧 Troubleshooting

### Backend won't start
```bash
# Check environment variables
cd backend && cat .env

# Check if database is running
docker compose ps

# Check logs
docker compose logs db
```

### Frontend won't connect
```bash
# Check API URL
cd frontend && cat .env

# Check if backend is running
curl http://localhost:3001/health
```

### Position errors
- Make sure Helius API key is configured
- Use a wallet that has real positions on Orca Devnet
- Check backend logs for details

## 🚀 Next Steps

For production, consider:
1. Configure real Helius key
2. Implement complete Orca SDK integration
3. Configure Helius webhook
4. Deploy to VPS (see DEPLOYMENT.md)
5. Monitoring and logs
6. Automated tests

## 📚 Additional Documentation

- [README.md](./README.md) - Complete documentation
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment guide
- [Orca SDK](https://dev.orca.so/) - Official documentation
- [Helius API](https://docs.helius.dev/) - Helius documentation