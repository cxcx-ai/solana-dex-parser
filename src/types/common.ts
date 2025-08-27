import { MemeEvent } from './meme';
import { PoolEvent } from './pool';
import { TokenAmount, TradeInfo, TransferData } from './trade';

/**
 * Represents a classified instruction with its context information
 */
export interface ClassifiedInstruction {
  /** The raw instruction data */
  instruction: any;
  /** The program ID that owns this instruction */
  programId: string;
  /** The outer instruction index in the transaction */
  outerIndex: number;
  /** The inner instruction index (for CPI calls), optional */
  innerIndex?: number;
}

/**
 * Represents token balance changes before and after transaction execution
 */
export interface BalanceChange {
  /** Token balance before transaction execution */
  pre: TokenAmount;
  /** Token balance after transaction execution */
  post: TokenAmount;
  /** The net change in token balance (post - pre) */
  change: TokenAmount;
}

/**
 * Transaction execution status enumeration
 */
export type TransactionStatus = 'unknown' | 'success' | 'failed';

/**
 * Complete parsing result containing all extracted transaction data
 */
export interface ParseResult {
  /** Parsing success status - true if parsing completed successfully */
  state: boolean;
  /** Transaction gas fee paid in SOL */
  fee: TokenAmount;
  /** Aggregated trade information combining multiple related trades */
  aggregateTrade?: TradeInfo;
  /** Array of individual trade transactions found in the transaction */
  trades: TradeInfo[];
  /** Array of liquidity operations (add/remove/create pool) */
  liquidities: PoolEvent[];
  /** Array of token transfer operations not related to trades */
  transfers: TransferData[];
  /** SOL balance change for the transaction signer */
  solBalanceChange?: BalanceChange;
  /** Token balance changes mapped by token mint address */
  tokenBalanceChange?: Map<string, BalanceChange>;
  /** Meme platform events (create/buy/sell/migrate/complete) */
  memeEvents: MemeEvent[];
  /** Solana slot number where the transaction was included */
  slot: number;
  /** Unix timestamp when the transaction was processed */
  timestamp: number;
  /** Unique transaction signature identifier */
  signature: string;
  /** Array of public keys that signed this transaction */
  signer: string[];
  /** Compute units consumed by the transaction execution */
  computeUnits: number;
  /** Final execution status of the transaction */
  txStatus: TransactionStatus;
  /** Optional error or status message */
  msg?: string;
}

/**
 * Parsing result for shred-stream data (pre-execution instruction analysis)
 */
export interface ParseShredResult {
  /** Parsing success status - true if shred parsing completed successfully */
  state: boolean;
  /** Transaction signature being analyzed */
  signature: string;
  /** Parsed instructions grouped by AMM/DEX name */
  instructions: Record<string, any[]>;
  /** Optional error or status message */
  msg?: string;
}

/**
 * Generic event parser configuration for single discriminator events
 */
export type EventParser<T> = {
  /** Unique byte sequence identifying this event type */
  discriminator: Buffer | Uint8Array;
  /** Function to decode raw event data into typed object */
  decode: (data: Buffer) => T;
};

/**
 * Generic event parser configuration for multiple discriminator events
 */
export type EventsParser<T> = {
  /** Array of byte sequences identifying related event types */
  discriminators: (Buffer | Uint8Array)[];
  /** Number of bytes to slice from the beginning of data */
  slice: number;
  /** Function to decode raw event data with additional options */
  decode: (data: Buffer, options: any) => T;
};

/**
 * Generic instruction parser configuration
 */
export type InstructionParser<T> = {
  /** Unique byte sequence identifying this instruction type */
  discriminator: Buffer | Uint8Array;
  /** Function to decode instruction data with additional options */
  decode: (instruction: any, options: any) => T;
};
