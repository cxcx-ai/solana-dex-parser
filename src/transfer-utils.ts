import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import { ParsedInstruction, ParsedTransactionWithMeta } from '@solana/web3.js';
import { TOKENS, DEX_PROGRAMS } from './constants';
import { TokenInfo, TransferData, convertToUiAmount, TradeInfo, DexInfo } from './types';
import { isSupportedToken } from './utils';

export const isTransferCheck = (instruction: ParsedInstruction): boolean => {
  return (
    (instruction.programId.equals(TOKEN_PROGRAM_ID) || instruction.programId.equals(TOKEN_2022_PROGRAM_ID)) &&
    instruction.parsed.type.includes('transferChecked')
  );
};

export const isTransfer = (instruction: ParsedInstruction): boolean => {
  return (
    instruction.program === 'spl-token' &&
    instruction.programId.equals(TOKEN_PROGRAM_ID) &&
    instruction.parsed.type === 'transfer'
  );
};

export const processTransfer = (
  instruction: ParsedInstruction,
  idx: string,
  splTokenMap: Map<string, TokenInfo>,
  splDecimalsMap: Map<string, number>
): TransferData | null => {
  const { info } = instruction.parsed;
  if (!info) return null;

  const mint = splTokenMap.get(info.destination)?.mint;
  if (!mint) return null;

  const decimals = splDecimalsMap.get(mint);
  if (typeof decimals === 'undefined') return null;

  return {
    type: 'transfer',
    info: {
      authority: info.authority || '',
      destination: info.destination || '',
      mint,
      source: info.source || '',
      tokenAmount: {
        amount: info.amount,
        decimals,
        uiAmount: convertToUiAmount(info.amount, decimals),
      },
    },
    idx: idx,
  };
};

export const isExtraAction = (instruction: ParsedInstruction, type: string): boolean => {
  return (
    instruction.program === 'spl-token' &&
    instruction.programId.equals(TOKEN_PROGRAM_ID) &&
    instruction.parsed.type === type
  );
};

export const processExtraAction = (
  instruction: ParsedInstruction,
  idx: string,
  splTokenMap: Map<string, TokenInfo>,
  splDecimalsMap: Map<string, number>,
  type: string
): TransferData | null => {
  const { info } = instruction.parsed;
  if (!info) return null;

  const mint = info.mint || splTokenMap.get(info.destination)?.mint;
  if (!mint) return null;

  const decimals = splDecimalsMap.get(mint);
  if (typeof decimals === 'undefined') return null;

  return {
    type: type,
    info: {
      authority: info.authority || info.mintAuthority || '',
      destination: info.destination || '',
      mint,
      source: info.source || '',
      tokenAmount: {
        amount: info.amount,
        decimals,
        uiAmount: convertToUiAmount(info.amount, decimals),
      },
    },
    idx: idx,
  };
};

export const processTransferCheck = (
  instruction: ParsedInstruction,
  idx: string,
  splDecimalsMap: Map<string, number>
): TransferData | null => {
  const { info } = instruction.parsed;
  if (!info) return null;

  const decimals = splDecimalsMap.get(info.mint);
  if (typeof decimals === 'undefined') return null;

  return {
    type: 'transferChecked',
    info: {
      authority: info.authority || '',
      destination: info.destination || '',
      mint: info.mint || '',
      source: info.source || '',
      tokenAmount: info.tokenAmount || {
        amount: info.amount,
        decimals,
        uiAmount: convertToUiAmount(info.amount, decimals),
      },
    },
    idx,
  };
};

export const processSwapData = (
  txWithMeta: ParsedTransactionWithMeta,
  transfers: TransferData[],
  dexInfo: DexInfo
): TradeInfo => {
  if (!transfers.length) {
    throw new Error('No swap data provided');
  }

  const uniqueTokens = extractUniqueTokens(transfers);
  if (uniqueTokens.length < 2) {
    throw new Error(`Insufficient unique tokens for swap > ${txWithMeta.transaction.signatures[0]}`);
  }

  const { inputToken, outputToken } = calculateTokenAmounts(transfers, uniqueTokens);
  const tradeType = Object.values(TOKENS).includes(inputToken.mint) ? 'BUY' : 'SELL';

  let signer = txWithMeta.transaction.message.accountKeys[0].pubkey.toBase58();

  // containsDCAProgram checks if the transaction contains the Jupiter DCA program.
  if (txWithMeta.transaction.message.accountKeys.find((it) => it.pubkey.toBase58() == DEX_PROGRAMS.JUPITER_DCA.id)) {
    signer = txWithMeta.transaction.message.accountKeys[2].pubkey.toBase58();
  }

  return {
    type: tradeType,
    inputToken,
    outputToken,
    user: signer,
    programId: dexInfo.programId,
    amm: dexInfo.amm,
    slot: txWithMeta.slot,
    timestamp: txWithMeta.blockTime || 0,
    signature: txWithMeta.transaction.signatures[0],
    idx: transfers[0].idx,
  };
};

export const extractUniqueTokens = (transfers: TransferData[]): TokenInfo[] => {
  const uniqueTokens: TokenInfo[] = [];
  const seenTokens = new Set<string>();

  transfers.forEach((transfer) => {
    const tokenInfo = getTransferTokenInfo(transfer);
    if (tokenInfo && !seenTokens.has(tokenInfo.mint)) {
      uniqueTokens.push(tokenInfo);
      seenTokens.add(tokenInfo.mint);
    }
  });

  return uniqueTokens;
};

export const calculateTokenAmounts = (transfers: TransferData[], uniqueTokens: TokenInfo[]) => {
  const inputToken = uniqueTokens[0];
  const outputToken = uniqueTokens[uniqueTokens.length - 1];

  const amounts = sumTokenAmounts(transfers, inputToken.mint, outputToken.mint);

  return {
    inputToken: {
      mint: inputToken.mint,
      amount: amounts.inputAmount,
      decimals: inputToken.decimals,
    },
    outputToken: {
      mint: outputToken.mint,
      amount: amounts.outputAmount,
      decimals: outputToken.decimals,
    },
  };
};

export const sumTokenAmounts = (transfers: TransferData[], inputMint: string, outputMint: string) => {
  const seenTransfers = new Set<string>();
  let inputAmount = 0;
  let outputAmount = 0;

  transfers.forEach((transfer) => {
    const tokenInfo = getTransferTokenInfo(transfer);
    if (!tokenInfo) return;

    const key = `${tokenInfo.amount}-${tokenInfo.mint}`;
    if (seenTransfers.has(key)) return;
    seenTransfers.add(key);

    if (tokenInfo.mint === inputMint) {
      inputAmount += tokenInfo.amount;
    }
    if (tokenInfo.mint === outputMint) {
      outputAmount += tokenInfo.amount;
    }
  });

  return { inputAmount, outputAmount };
};

export const getTransferTokenInfo = (transfer: TransferData): TokenInfo | null => {
  return transfer?.info
    ? {
        mint: transfer.info.mint,
        amount: transfer.info.tokenAmount.uiAmount,
        decimals: transfer.info.tokenAmount.decimals,
      }
    : null;
};

export const processTransferInnerInstruction = (
  txWithMeta: ParsedTransactionWithMeta,
  instructionIndex: number,
  splTokenMap: Map<string, TokenInfo>,
  splDecimalsMap: Map<string, number>,
  extraTypes?: string[]
): TransferData[] => {
  const innerInstructions = txWithMeta.meta?.innerInstructions;
  if (!innerInstructions) return [];

  return innerInstructions
    .filter((set) => set.index === instructionIndex)
    .flatMap((set) =>
      set.instructions
        .map((instruction, idx) => {
          const items = processTransferInstruction(
            instruction as ParsedInstruction,
            `${instructionIndex}-${idx}`,
            splTokenMap,
            splDecimalsMap,
            extraTypes
          );

          return items;
        })
        .filter((transfer): transfer is TransferData => transfer !== null)
    );
};

export const processTransferInstruction = (
  instruction: ParsedInstruction,
  idx: string,
  splTokenMap: Map<string, TokenInfo>,
  splDecimalsMap: Map<string, number>,
  extraTypes?: string[]
): TransferData | null => {
  if (isTransfer(instruction)) {
    return processTransfer(instruction, idx, splTokenMap, splDecimalsMap);
  }
  if (isTransferCheck(instruction)) {
    return processTransferCheck(instruction, idx, splDecimalsMap);
  }
  if (extraTypes) {
    const actions = extraTypes
      .map((it) => {
        if (isExtraAction(instruction, it)) {
          return processExtraAction(instruction, idx, splTokenMap, splDecimalsMap, it);
        }
      })
      .filter((it) => !!it);
    return actions.length > 0 ? actions[0] : null;
  }

  return null;
};

/**
 * Sort and get LP tokens
 * make sure token0 is SPL Token, token1 is SOL/USDC/USDT
 * SOL,USDT
 * SOL,DDD
 * USDC,USDT/DDD
 * USDT,USDC
 * USDC,SOL
 * USDT,SOL
 * @param transfers
 * @returns
 */
export const getLPTransfers = (transfers: TransferData[]) => {
  const tokens = transfers.filter((it) => it.type.includes('transfer'));
  if (tokens.length == 2) {
    if (
      tokens[0].info.mint == TOKENS.SOL ||
      (isSupportedToken(tokens[0].info.mint) && !isSupportedToken(tokens[1].info.mint))
    ) {
      return [tokens[1], tokens[0]];
    }
  }
  return tokens;
};
