const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface PositionInfo {
  nftMint: string;
  poolAddress: string;
  tokenA: string;
  tokenB: string;
  tickLower: number;
  tickUpper: number;
  liquidity: string;
  currentPrice: number;
  inRange: boolean;
  estimatedFeesA: string;
  estimatedFeesB: string;
}

export interface WalletPositionsResponse {
  wallet: string;
  positions: PositionInfo[];
}

export interface PositionDetailsResponse extends PositionInfo {
  owner: string;
  createdSlot: bigint;
  lastUpdated: Date;
}

export async function fetchWalletPositions(publicKey: string): Promise<WalletPositionsResponse> {
  const response = await fetch(`${API_BASE_URL}/wallet/${publicKey}`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch wallet positions: ${response.statusText}`);
  }
  
  return response.json();
}

export async function fetchPositionDetails(nftMint: string): Promise<PositionDetailsResponse> {
  const response = await fetch(`${API_BASE_URL}/position/${nftMint}`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch position details: ${response.statusText}`);
  }
  
  return response.json();
}

export async function checkApiHealth(): Promise<{ status: string; timestamp: string }> {
  const response = await fetch(`${API_BASE_URL}/health`);
  
  if (!response.ok) {
    throw new Error(`API health check failed: ${response.statusText}`);
  }
  
  return response.json();
}