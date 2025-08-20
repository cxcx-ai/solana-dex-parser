import base58 from 'bs58';
import { DEX_PROGRAMS, TOKENS } from './constants';
import { convertToUiAmount, DexInfo, TradeInfo, TradeType } from './types';
import { PublicKey } from '@solana/web3.js';

/**
 * Get instruction data
 */
export const getInstructionData = (instruction: any): Buffer => {
  if ('data' in instruction) {
    return decodeInstructionData(instruction.data);
  }
  return instruction.data;
};

export const decodeInstructionData = (data: any): Buffer => {
  if (typeof data === 'string') return Buffer.from(base58.decode(data)); // compatible with both bs58 v4.0.1 and v6.0.0
  if (data instanceof Uint8Array) return Buffer.from(data);
  if ('type' in data && data.type == 'Buffer') return Buffer.from(data.data);
  return data;
};

/**
 * Get the name of a program by its ID
 * @param programId - The program ID to look up
 * @returns The name of the program or 'Unknown' if not found
 */
export const getProgramName = (programId: string): string =>
  Object.values(DEX_PROGRAMS).find((dex) => dex.id === programId)?.name || 'Unknown';

/**
 * Convert a hex string to Uint8Array
 * @param hex - Hex string to convert
 * @returns Uint8Array representation of the hex string
 */
export const hexToUint8Array = (hex: string): Uint8Array =>
  new Uint8Array(hex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)));

export const absBigInt = (value: bigint): bigint => {
  return value < 0n ? -value : value;
};

export const getTradeType = (inMint: string, outMint: string): TradeType => {
  if (inMint == TOKENS.SOL) return 'BUY';
  if (outMint == TOKENS.SOL) return 'SELL';
  if (Object.values(TOKENS).includes(inMint)) return 'BUY';
  return 'SELL';
};

export const getAMMs = (transferActionKeys: string[]) => {
  const amms = Object.values(DEX_PROGRAMS).filter((it) => it.tags.includes('amm'));
  return transferActionKeys
    .map((it) => {
      const item = Object.values(amms).find((amm) => it.split(':')[0] == amm.id);
      if (item) return item.name;
      return null;
    })
    .filter((it) => it != null);
};

export const getTranferTokenMint = (token1?: string, token2?: string): string | undefined => {
  if (token1 == token2) return token1;
  if (token1 && token1 != TOKENS.SOL) return token1;
  if (token2 && token2 != TOKENS.SOL) return token2;
  return token1 || token2;
};

export const getPubkeyString = (value: any): string => {
  if (typeof value === 'string') return value;
  if (value instanceof PublicKey) return value.toBase58();
  if ('type' in value && value.type == 'Buffer') return base58.encode(value.data);
  if (value instanceof Buffer) return base58.encode(value);
  return value;
};

// ... existing code ...

/**
 * Sort an array of TradeInfo objects by their idx field
 * The idx format is 'main-sub', such as '1-0', '2-1', etc.
 * @param items The TradeInfo array to be sorted
 * @returns The sorted TradeInfo array
 */
export const sortByIdx = <T extends { idx: string }>(items: T[]): T[] => {
  return items && items.length > 1
    ? [...items].sort((a, b) => {
      const [aMain, aSub = '0'] = a.idx.split('-');
      const [bMain, bSub = '0'] = b.idx.split('-');
      const mainDiff = parseInt(aMain) - parseInt(bMain);
      if (mainDiff !== 0) return mainDiff;
      return parseInt(aSub) - parseInt(bSub);
    })
    : items;
};

export const getFinalSwap = (trades: TradeInfo[], dexInfo?: DexInfo): TradeInfo | null => {
  if (trades.length == 1) return trades[0];
  if (trades.length >= 2) {
    // sort by idx
    if (trades.length > 2) {
      trades = sortByIdx(trades);
    }

    const inputTrade = trades[0];
    const outputTrade = trades[trades.length - 1];
    const pools: string[] = [];

    if (trades.length >= 2) {
      // Merge trades
      let [inputAmount, outputAmount] = [0n, 0n];
      for (const trade of trades) {
        if (trade.inputToken.mint == inputTrade.inputToken.mint) {
          inputAmount += BigInt(trade.inputToken.amountRaw);
        }
        if (trade.outputToken.mint == outputTrade.outputToken.mint) {
          outputAmount += BigInt(trade.outputToken.amountRaw);
        }
        if (trade.Pool && trade.Pool.length > 0 && !pools.includes(trade.Pool[0])) {
          pools.push(trade.Pool[0]);
        }
      }

      inputTrade.inputToken.amountRaw = inputAmount.toString();
      inputTrade.inputToken.amount = convertToUiAmount(inputAmount, inputTrade.inputToken.decimals);

      outputTrade.outputToken.amountRaw = outputAmount.toString();
      outputTrade.outputToken.amount = convertToUiAmount(outputAmount, outputTrade.outputToken.decimals);

    }

    return {
      type: getTradeType(inputTrade.inputToken.mint, outputTrade.outputToken.mint),
      Pool: pools,
      inputToken: inputTrade.inputToken,
      outputToken: outputTrade.outputToken,
      user: inputTrade.user,
      programId: inputTrade.programId,
      amm: dexInfo?.amm || inputTrade.amm,
      route: dexInfo?.route || inputTrade.route || '',
      slot: inputTrade.slot,
      timestamp: inputTrade.timestamp,
      signature: inputTrade.signature,
      idx: inputTrade.idx,
    } as TradeInfo;
  }
  return null;
};
