export type PoolEventType = 'CREATE' | 'ADD' | 'REMOVE';

export interface PoolEventBase {
  user: string;
  type: PoolEventType;
  programId?: string; // DEX program ID
  amm?: string; // AMM type (e.g., 'Raydiumv4', 'Jupiter')
  slot: number;
  timestamp: number;
  signature: string;
  idx: string; // instruction indexes
  signer?: string[]; // Orignal signer
}

export interface PoolEvent extends PoolEventBase {
  /**
   * AMM pool address (market)
   */
  poolId: string;

  /**
   * Pool config address (platform config)
   */
  config?: string;

  /**
   * LP mint address
   */
  poolLpMint?: string;

  /**
   * Token A mint address (TOKEN)
   */
  token0Mint?: string;

  /**
   * Token A uiAmount (TOKEN)
   */
  token0Amount?: number;

  /**
   * Token A amount (TOKEN)
   */
  token0AmountRaw?: string;

  /**
   * User token0 balance changed amount
   */
  token0BalanceChange?: string;

  /**
   * Token A amount (TOKEN)
   */

  token0Decimals?: number;

  /**
   * Token B mint address (SOL/USDC/USDT)
   */
  token1Mint?: string;

  /**
   * Token B uiAmount (SOL/USDC/USDT)
   */
  token1Amount?: number;

  /**
   * Token B amount (SOL/USDC/USDT)
   */
  token1AmountRaw?: string;

  /**
   * User token1 balance changed amount
   */
  token1BalanceChange?: string;

  token1Decimals?: number;

  /**
   * Lp amount
   */
  lpAmount?: number;

  lpAmountRaw?: string;
}
