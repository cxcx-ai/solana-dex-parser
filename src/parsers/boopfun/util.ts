import { DEX_PROGRAMS, TOKENS } from '../../constants';
import { BoopfunTradeEvent, DexInfo, TradeInfo, TradeType, convertToUiAmount } from '../../types';

export const getBoopfunTradeInfo = (
  event: BoopfunTradeEvent,
  info: {
    slot: number;
    signature: string;
    timestamp: number;
    idx?: string;
    dexInfo?: DexInfo;
  }
): TradeInfo => {
  const tradeType: TradeType = event.isBuy ? 'BUY' : 'SELL';
  const isBuy = tradeType === 'BUY';
  return {
    type: tradeType,
    Pool: [event.bondingCurve],
    inputToken: {
      mint: isBuy ? TOKENS.SOL : event.mint,
      amount: isBuy ? convertToUiAmount(event.solAmount) : convertToUiAmount(event.tokenAmount, 6),
      amountRaw: isBuy ? event.solAmount.toString() : event.tokenAmount.toString(),
      decimals: isBuy ? 9 : 6,
    },
    outputToken: {
      mint: isBuy ? event.mint : TOKENS.SOL,
      amount: isBuy ? convertToUiAmount(event.tokenAmount, 6) : convertToUiAmount(event.solAmount),
      amountRaw: isBuy ? event.tokenAmount.toString() : event.solAmount.toString(),
      decimals: isBuy ? 6 : 9,
    },
    user: event.user,
    programId: DEX_PROGRAMS.BOOP_FUN.id,
    amm: info.dexInfo?.amm || DEX_PROGRAMS.BOOP_FUN.name,
    route: info.dexInfo?.route || '',
    slot: info.slot,
    timestamp: info.timestamp,
    signature: info.signature,
    idx: info.idx || '',
  };
};
