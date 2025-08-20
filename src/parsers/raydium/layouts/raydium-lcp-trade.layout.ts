import base58 from 'bs58';
import { PoolStatus, RaydiumLCPTradeEvent, TradeDirection } from '../../../types/raydium';

export class RaydiumLCPTradeLayout {
  poolState: Uint8Array;
  totalBaseSell: bigint;
  virtualBase: bigint;
  virtualQuote: bigint;
  realBaseBefore: bigint;
  realQuoteBefore: bigint;
  realBaseAfter: bigint;
  realQuoteAfter: bigint;
  amountIn: bigint;
  amountOut: bigint;
  protocolFee: bigint;
  platformFee: bigint;
  creatorFee: bigint;
  shareFee: bigint;
  tradeDirection: TradeDirection;
  poolStatus: PoolStatus;

  constructor(fields: {
    poolState: Uint8Array;
    totalBaseSell: bigint;
    virtualBase: bigint;
    virtualQuote: bigint;
    realBaseBefore: bigint;
    realQuoteBefore: bigint;
    realBaseAfter: bigint;
    realQuoteAfter: bigint;
    amountIn: bigint;
    amountOut: bigint;
    protocolFee: bigint;
    platformFee: bigint;
    creatorFee: bigint;
    shareFee: bigint;
    tradeDirection: TradeDirection;
    poolStatus: PoolStatus;
  }) {
    this.poolState = fields.poolState;
    this.totalBaseSell = fields.totalBaseSell;
    this.virtualBase = fields.virtualBase;
    this.virtualQuote = fields.virtualQuote;
    this.realBaseBefore = fields.realBaseBefore;
    this.realQuoteBefore = fields.realQuoteBefore;
    this.realBaseAfter = fields.realBaseAfter;
    this.realQuoteAfter = fields.realQuoteAfter;
    this.amountIn = fields.amountIn;
    this.amountOut = fields.amountOut;
    this.protocolFee = fields.protocolFee;
    this.platformFee = fields.platformFee;
    this.creatorFee = fields.creatorFee;
    this.shareFee = fields.shareFee;
    this.tradeDirection = fields.tradeDirection;
    this.poolStatus = fields.poolStatus;
  }

  static schema = new Map([
    [
      RaydiumLCPTradeLayout,
      {
        kind: 'struct',
        fields: [
          ['poolState', [32]],
          ['totalBaseSell', 'u64'],
          ['virtualBase', 'u64'],
          ['virtualQuote', 'u64'],
          ['realBaseBefore', 'u64'],
          ['realQuoteBefore', 'u64'],
          ['realBaseAfter', 'u64'],
          ['realQuoteAfter', 'u64'],
          ['amountIn', 'u64'],
          ['amountOut', 'u64'],
          ['protocolFee', 'u64'],
          ['platformFee', 'u64'],
          ['creatorFee', 'u64'],
          ['shareFee', 'u64'],
          ['tradeDirection', 'u8'],
          ['poolStatus', 'u8'],
        ],
      },
    ],
  ]);

  toObject(): RaydiumLCPTradeEvent {
    return {
      poolState: base58.encode(this.poolState),
      totalBaseSell: BigInt(this.totalBaseSell),
      virtualBase: BigInt(this.virtualBase),
      virtualQuote: BigInt(this.virtualQuote),
      realBaseBefore: BigInt(this.realBaseBefore),
      realQuoteBefore: BigInt(this.realQuoteBefore),
      realBaseAfter: BigInt(this.realBaseAfter),
      amountIn: BigInt(this.amountIn),
      amountOut: BigInt(this.amountOut),
      protocolFee: BigInt(this.protocolFee),
      platformFee: BigInt(this.platformFee),
      creatorFee: BigInt(this.creatorFee),
      shareFee: BigInt(this.shareFee),
      tradeDirection: this.tradeDirection,
      poolStatus: this.poolStatus,
      baseMint: '',
      quoteMint: '',
      user: '',
    };
  }
}
