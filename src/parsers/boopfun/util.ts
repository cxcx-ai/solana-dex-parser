import { DEX_PROGRAMS, TOKENS } from '../../constants';
import { MemeEvent, DexInfo, TradeInfo, TradeType, convertToUiAmount } from '../../types';

export const getBoopfunTradeInfo = (
  event: MemeEvent,
  info: {
    slot: number;
    signature: string;
    timestamp: number;
    idx?: string;
    dexInfo?: DexInfo;
  }
): TradeInfo => {

  const isBuy = event.type === 'BUY';
  return {
    type: event.type,
    Pool: event.bondingCurve ? [event.bondingCurve] : [],
    inputToken: event.inputToken!,
    outputToken: event.outputToken!,
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
