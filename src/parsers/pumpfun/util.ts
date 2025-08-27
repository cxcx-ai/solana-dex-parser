import { DEX_PROGRAMS } from '../../constants';
import {
  DexInfo,
  MemeEvent, PumpswapBuyEvent,
  PumpswapSellEvent,
  TradeInfo, convertToUiAmount
} from '../../types';
import { getTradeType } from '../../utils';

export const getPumpfunTradeInfo = (
  event: MemeEvent,
  info: {
    slot: number;
    signature: string;
    timestamp: number;
    idx?: string;
    dexInfo?: DexInfo;
  }
): TradeInfo => {
 
  return {
    type: event.type,
    Pool: event.bondingCurve ? [event.bondingCurve] : [],
    inputToken: event.inputToken!,
    outputToken: event.outputToken!,
    user: event.user,
    programId: DEX_PROGRAMS.PUMP_FUN.id,
    amm: info.dexInfo?.amm || DEX_PROGRAMS.PUMP_FUN.name,
    route: info.dexInfo?.route || '',
    slot: info.slot,
    timestamp: info.timestamp,
    signature: info.signature,
    idx: info.idx || '',
  };
};

export const getPumpswapBuyInfo = (
  event: PumpswapBuyEvent,
  inputToken: {
    mint: string;
    decimals: number;
  },
  outputToken: {
    mint: string;
    decimals: number;
  },
  feeToken: {
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
  const { mint: feeMint, decimals: feeDecimal } = feeToken;
  const feeAmt = BigInt(event.protocolFee) + BigInt(event.coinCreatorFee);

  const trade = {
    type: getTradeType(inputMint, outputMint),
    Pool: [event.pool],
    inputToken: {
      mint: inputMint,
      amount: convertToUiAmount(event.quoteAmountInWithLpFee, inputDecimal),
      amountRaw: event.quoteAmountInWithLpFee.toString(),
      decimals: inputDecimal,
    },
    outputToken: {
      mint: outputMint,
      amount: convertToUiAmount(event.baseAmountOut, ouptDecimal),
      amountRaw: event.baseAmountOut.toString(),
      decimals: ouptDecimal,
    },
    fee: {
      mint: feeMint,
      amount: convertToUiAmount(feeAmt, feeDecimal),
      amountRaw: feeAmt.toString(),
      decimals: feeDecimal,
    },
    fees: [
      {
        mint: feeMint,
        amount: convertToUiAmount(event.protocolFee, feeDecimal),
        amountRaw: event.protocolFee.toString(),
        decimals: feeDecimal,
        dex: DEX_PROGRAMS.PUMP_SWAP.name,
        type: 'protocol',
        recipient: event.protocolFeeRecipient,
      },
    ],
    user: event.user,
    programId: info.dexInfo?.programId || DEX_PROGRAMS.PUMP_SWAP.id,
    amm: DEX_PROGRAMS.PUMP_SWAP.name,
    route: info.dexInfo?.route || '',
    slot: info.slot,
    timestamp: info.timestamp,
    signature: info.signature,
    idx: info.idx || '',
  } as TradeInfo;

  if (trade.fees && BigInt(event.coinCreatorFee) > 0) {
    trade.fees.push({
      mint: feeMint,
      amount: convertToUiAmount(event.coinCreatorFee, feeDecimal),
      amountRaw: event.coinCreatorFee.toString(),
      decimals: feeDecimal,
      dex: DEX_PROGRAMS.PUMP_SWAP.name,
      type: 'coinCreator',
      recipient: event.coinCreator,
    });
  }
  return trade;
};

export const getPumpswapSellInfo = (
  event: PumpswapSellEvent,
  inputToken: {
    mint: string;
    decimals: number;
  },
  outputToken: {
    mint: string;
    decimals: number;
  },
  feeToken: {
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
  const { mint: feeMint, decimals: feeDecimal } = feeToken;
  const feeAmt = BigInt(event.protocolFee) + BigInt(event.coinCreatorFee);

  const trade = {
    type: getTradeType(inputMint, outputMint),
    Pool: [event.pool],
    inputToken: {
      mint: inputMint,
      amount: convertToUiAmount(event.baseAmountIn, inputDecimal),
      amountRaw: event.baseAmountIn.toString(),
      decimals: inputDecimal,
    },
    outputToken: {
      mint: outputMint,
      amount: convertToUiAmount(event.userQuoteAmountOut, ouptDecimal),
      amountRaw: event.userQuoteAmountOut.toString(),
      decimals: ouptDecimal,
    },
    fee: {
      mint: feeMint,
      amount: convertToUiAmount(feeAmt, feeDecimal),
      amountRaw: event.protocolFee.toString(),
      decimals: feeDecimal,
      dex: DEX_PROGRAMS.PUMP_SWAP.name,
    },
    fees: [
      {
        mint: feeMint,
        amount: convertToUiAmount(event.protocolFee, feeDecimal),
        amountRaw: event.protocolFee.toString(),
        decimals: feeDecimal,
        dex: DEX_PROGRAMS.PUMP_SWAP.name,
        type: 'protocol',
        recipient: event.protocolFeeRecipient,
      },
    ],
    user: event.user,
    programId: info.dexInfo?.programId || DEX_PROGRAMS.PUMP_SWAP.id,
    amm: DEX_PROGRAMS.PUMP_SWAP.name,
    route: info.dexInfo?.route || '',
    slot: info.slot,
    timestamp: info.timestamp,
    signature: info.signature,
    idx: info.idx || '',
  } as TradeInfo;
  if (trade.fees && BigInt(event.coinCreatorFee) > 0) {
    trade.fees.push({
      mint: feeMint,
      amount: convertToUiAmount(event.coinCreatorFee, feeDecimal),
      amountRaw: event.coinCreatorFee.toString(),
      decimals: feeDecimal,
      dex: DEX_PROGRAMS.PUMP_SWAP.name,
      type: 'coinCreator',
      recipient: event.coinCreator,
    });
  }
  return trade;
};
