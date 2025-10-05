export interface HeliusWebhookEvent {
  accountData: {
    account: string;
    nativeBalanceChange: number;
    tokenBalanceChanges: Array<{
      mint: string;
      rawTokenAmount: {
        tokenAmount: string;
        decimals: number;
      };
      userAccount: string;
    }>;
  }[];
  description: string;
  events: any;
  fee: number;
  feePayer: string;
  instructions: Array<{
    accounts: string[];
    data: string;
    programId: string;
    innerInstructions: any[];
  }>;
  nativeTransfers: any[];
  signature: string;
  slot: number;
  source: string;
  timestamp: number;
  tokenTransfers: any[];
  transactionError: null | string;
  type: string;
}

export interface WalletPositionsResponse {
  wallet: string;
  positions: PositionInfo[];
}

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

export interface PositionDetailsResponse extends PositionInfo {
  owner: string;
  createdSlot: bigint;
  lastUpdated: Date;
}