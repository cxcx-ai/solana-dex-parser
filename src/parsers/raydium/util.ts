import { DEX_PROGRAMS } from '../../constants';
import { convertToUiAmount, DexInfo, MemeEvent, RaydiumLCPTradeEvent, TradeDirection, TradeInfo } from '../../types';

export const getRaydiumTradeInfo = (
  event: MemeEvent,
  inputToken: {
    mint: string;
    decimals: number;
  },
  outputToken: {
    mint: string;
    decimals: number;
  },
  info: {
    slot: number;
    signature: string;
    timestamp: number;
    idx?: string;
    dexInfo?: DexInfo;
  }
): TradeInfo => {
  const { mint: inputMint, decimals: inputDecimal } = inputToken;
  const { mint: outputMint, decimals: ouptDecimal } = outputToken;
  const isBuy = event.type === 'BUY';
  const fee = BigInt(event.protocolFee ?? 0) + BigInt(event.creatorFee ?? 0) + BigInt(event.platformFee ?? 0);
  return {
    type: isBuy ? 'BUY' : 'SELL',
    Pool: event.pool ? [event.pool] : [],
    inputToken: event.inputToken!,
    outputToken: event.outputToken!,
    fee: {
      mint: isBuy ? inputMint : outputMint,
      amount: convertToUiAmount(fee, isBuy ? inputDecimal : ouptDecimal),
      amountRaw: fee.toString(),
      decimals: isBuy ? inputDecimal : ouptDecimal,
    },
    user: event.user,
    programId: info.dexInfo?.programId || DEX_PROGRAMS.RAYDIUM_LCP.id,
    amm: DEX_PROGRAMS.RAYDIUM_LCP.name,
    route: info.dexInfo?.route || '',
    slot: info.slot,
    timestamp: info.timestamp,
    signature: info.signature,
    idx: info.idx || '',
  };
};
