import { TokenInfo, TradeType } from './trade';

// MemeEvent contains the unified event data
export interface MemeEvent {
  type: TradeType; // Type of the event (create/trade/migrate)
  timestamp: number; // Event timestamp
  idx: string; // Event index
  signature: string; // Event signature

  // Common fields for all events
  user: string; // User/trader address (PublicKey as string)

  baseMint: string; // Token mint address (PublicKey as string)
  quoteMint: string; // Quote mint address (PublicKey as string)

  // Trade-specific fields
  inputToken?: TokenInfo; // Amount in
  outputToken?: TokenInfo; // Min amount out

  // Token creation fields
  name?: string; // Token name
  symbol?: string; // Token symbol
  uri?: string; // Token metadata URI

  // Fee and economic fields
  fee?: number; // Fee (uint64 -> number)
  protocolFee?: number; // Protocol fee
  platformFee?: number; // Platform fee
  shareFee?: number; // Share fee
  creatorFee?: number; // Creator fee

  // Protocol-specific addresses
  protocol?: string; // Protocol name
  platformConfig?: string; // Platform config address (PublicKey as string)
  creator?: string; // Token creator address (PublicKey as string)
  bondingCurve?: string; // Bonding curve address (PublicKey as string)
  pool?: string; // Pool address (PublicKey as string)
}

