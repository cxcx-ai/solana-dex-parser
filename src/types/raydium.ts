export interface MintParams {
  decimals: number;
  name: string;
  symbol: string;
  uri: string;
}

export interface ConstantCurve {
  supply: bigint;
  totalBaseSell: bigint;
  totalQuoteFundRaising: bigint;
  migrateType: number;
}

export interface FixedCurve {
  supply: bigint;
  totalQuoteFundRaising: bigint;
  migrateType: number;
}

export interface LinearCurve {
  supply: bigint;
  totalQuoteFundRaising: bigint;
  migrateType: number;
}

export interface CurveParams {
  variant: string; // e.g., "Constant", "Fixed", "Linear"
  data: ConstantCurve | FixedCurve | LinearCurve;
}

export interface VestingParams {
  totalLockedAmount: bigint;
  cliffPeriod: bigint;
  unlockPeriod: bigint;
}

export enum TradeDirection {
  Buy = 0,
  Sell = 1,
}

export enum PoolStatus {
  Fund = 0,
  Migrate = 1,
  Trade = 2,
}

export enum CurveType {
  Constant = 0,
  Fixed = 1,
  Linear = 2,
}

export interface RaydiumLCPCreateEvent {
  poolState: string;
  creator: string;
  config: string;
  baseMintParam: MintParams;
  curveParam: CurveParams;
  vestingParam: VestingParams;
  baseMint: string;
  quoteMint: string;
}

export interface RaydiumLCPTradeEvent {
  poolState: string;
  totalBaseSell: bigint;
  virtualBase: bigint;
  virtualQuote: bigint;
  realBaseBefore: bigint;
  realQuoteBefore: bigint;
  realBaseAfter: bigint;
  amountIn: bigint;
  amountOut: bigint;
  protocolFee: bigint;
  platformFee: bigint;
  creatorFee?: bigint;
  shareFee: bigint;
  tradeDirection: TradeDirection;
  poolStatus: PoolStatus;
  user: string;
  baseMint: string;
  quoteMint: string;
}

export interface RaydiumLCPCompleteEvent {
  baseMint: string; // token mint
  quoteMint: string; // token mint
  poolMint: string;
  lpMint: string;
  amm: string; // RaydiumV4 or RaydiumCPMM
}

export interface RaydiumLCPEvent {
  type: 'TRADE' | 'CREATE' | 'COMPLETE';
  data: RaydiumLCPTradeEvent | RaydiumLCPCreateEvent | RaydiumLCPCompleteEvent;
  slot: number;
  timestamp: number;
  signature: string;
  idx: string; // instruction indexes
}
