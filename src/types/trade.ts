import { ParsedTransactionWithMeta, TransactionResponse, VersionedTransactionResponse } from '@solana/web3.js';

/**
 * Union type for different Solana transaction formats
 * Supports both parsed and compiled transaction types
 */
export type SolanaTransaction =
  | ParsedTransactionWithMeta
  | VersionedTransactionResponse
  | (TransactionResponse & VersionedTransactionResponse);

/**
 * Configuration options for transaction parsing
 */
export interface ParseConfig {
  /**
   * If true, will try to parse unknown DEXes, results may be inaccurate
   * @default true
   */
  tryUnknowDEX?: boolean;

  /**
   * If set, will only parse transactions from these programIds
   * @default undefined
   */
  programIds?: string[];

  /**
   * If set, will ignore transactions from these programIds
   * @default undefined
   */
  ignoreProgramIds?: string[];

  /**
   * If true, will throw an error if parsing fails
   * @default false
   */
  throwError?: boolean;

  /**
   * If true, will return the finalSwap record instead of the detail route trades
   * Only works for Jupiter
   * @default true
   */
  aggregateTrades?: boolean;
}

/**
 * Basic DEX protocol information
 */
export interface DexInfo {
  programId?: string; // DEX program ID on Solana
  amm?: string; // Automated Market Maker name
  route?: string; // Router or aggregator name
}

/**
 * Token information including balances and accounts
 */
export interface TokenInfo {
  mint: string; // Token mint address
  amount: number; // Token uiAmount
  amountRaw: string; // Raw token amount
  decimals: number; // Token decimals
  authority?: string; // Token authority (if applicable)
  destination?: string; // Destination token account
  destinationOwner?: string; // Owner of destination account
  destinationBalance?: TokenAmount; // Balance after transfer
  destinationPreBalance?: TokenAmount; // Balance before transfer
  source?: string; // Source token account
  sourceBalance?: TokenAmount; // Source balance after transfer
  sourcePreBalance?: TokenAmount; // Source balance before transfer
  balanceChange?: string; // Raw user balance change amount, may differ from the amountRaw in some cases
}

/**
 * Standard token amount format with both raw and UI amounts
 */
export interface TokenAmount {
  amount: string; // Raw token amount
  uiAmount: number | null; // Human-readable amount
  decimals: number; // Token decimals
}

/**
 * Transfer information for tracking token movements
 */
export interface TransferInfo {
  type: 'TRANSFER_IN' | 'TRANSFER_OUT'; // Transfer direction
  token: TokenInfo; // Token details
  from: string; // Source address
  to: string; // Destination address
  timestamp: number; // Unix timestamp
  signature: string; // Transaction signature
}

/**
 * Detailed transfer data including account information
 */
export interface TransferData {
  type: 'transfer' | 'transferChecked' | string; // Transfer instruction type
  programId: string; // Token program ID
  info: {
    authority?: string; // Transfer authority
    destination: string; // Destination account
    destinationOwner?: string; // Owner of destination account
    mint: string; // Token mint address
    source: string; // Source account
    tokenAmount: {
      amount: string; // Raw amount
      uiAmount: number; // Human-readable amount
      decimals: number; // Token decimals
    };
    sourceBalance?: TokenAmount; // Source balance after transfer
    sourcePreBalance?: TokenAmount; // Source balance before transfer
    destinationBalance?: TokenAmount; // Balance after transfer
    destinationPreBalance?: TokenAmount; // Balance before transfer
    solBalanceChange?: string; // Raw user balance change amount
  };
  idx: string; // Instruction index
  timestamp: number; // Unix timestamp
  signature: string; // Transaction signature
  isFee?: boolean; // Whether it's a fee transfer
}

/**
 * Trade direction type
 */
export type TradeType = 'BUY' | 'SELL' | 'SWAP' | 'CREATE' | 'MIGRATE' | 'COMPLETE' | 'ADD' | 'REMOVE' | 'LOCK' | 'BURN';

export interface FeeInfo {
  mint: string; // Fee token mint address
  amount: number; // Fee amount in UI format
  amountRaw: string; // Raw fee amount
  decimals: number; // Fee token decimals
  dex?: string; // DEX name (e.g., 'Raydium', 'Meteora')
  type?: string; // Fee type (e.g., 'protocol', 'coinCreator')
  recipient?: string; // Fee recipient account
}

/**
 * Comprehensive trade information
 */
export interface TradeInfo {
  user: string; // Signer address (trader)
  type: TradeType; // Trade direction (BUY/SELL)
  Pool: string[]; // Pool address
  inputToken: TokenInfo; // Token being sold
  outputToken: TokenInfo; // Token being bought
  slippageBps?: number; // Slippage in basis points
  fee?: FeeInfo; // Fee information (if applicable)
  fees?: FeeInfo[]; // List of fees (if multiple)
  programId?: string; // DEX program ID
  amm?: string; // AMM type (e.g., 'RaydiumV4', 'Meteora')
  amms?: string[]; // List of AMMs (if multiple)
  route?: string; // Router or Bot (e.g., 'Jupiter','OKX','BananaGun')
  slot: number; // Block slot number
  timestamp: number; // Unix timestamp
  signature: string; // Transaction signature
  idx: string; // Instruction indexes
  signer?: string[]; // Orignal signer
}

/**
 * Converts raw token amount to human-readable format
 * @param amount Raw amount in bigint or string format
 * @param decimals Token decimals (defaults to 9)
 * @returns Human-readable amount as number
 */
export const convertToUiAmount = (amount: bigint | string, decimals?: number) => {
  if (decimals === 0) return Number(amount);
  return Number(amount) / Math.pow(10, decimals || 9);
};
