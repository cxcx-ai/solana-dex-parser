import { DEX_PROGRAMS, FEE_ACCOUNTS, SYSTEM_PROGRAMS, TOKENS } from './constants';
import { InstructionClassifier } from './instruction-classifier';
import { TransactionAdapter } from './transaction-adapter';
import {
  isCompiledExtraAction,
  isCompiledNativeTransfer,
  isCompiledTransfer,
  isCompiledTransferCheck,
  processCompiledExtraAction,
  processCompiledNatvieTransfer,
  processCompiledTransfer,
  processCompiledTransferCheck,
} from './transfer-compiled-utils';
import {
  isExtraAction,
  isNativeTransfer,
  isTransfer,
  isTransferCheck,
  processExtraAction,
  processNatvieTransfer,
  processTransfer,
  processTransferCheck,
} from './transfer-utils';
import { convertToUiAmount, DexInfo, PoolEvent, TokenInfo, TradeInfo, TransferData, TransferInfo } from './types';
import { getTradeType } from './utils';

export class TransactionUtils {
  constructor(private adapter: TransactionAdapter) { }

  /**
   * Get DEX information from transaction
   */
  getDexInfo(classifier: InstructionClassifier): DexInfo {
    const programIds = classifier.getAllProgramIds();
    if (!programIds.length) return {};

    for (const programId of programIds) {
      const dexProgram = Object.values(DEX_PROGRAMS).find((dex) => dex.id === programId);
      if (dexProgram) {
        const isRoute = !dexProgram.tags.includes('amm');
        return {
          programId: dexProgram.id,
          route: isRoute ? dexProgram.name : undefined,
          amm: !isRoute ? dexProgram.name : undefined,
        };
      }
    }

    return { programId: programIds[0] };
  }

  /**
   * Get transfer actions from transaction
   */
  getTransferActions(extraTypes?: string[]): Record<string, TransferData[]> {
    const actions: Record<string, TransferData[]> = {};
    const innerInstructions = this.adapter.innerInstructions;

    let groupKey = '';

    // process transfers of program instructions
    innerInstructions?.forEach((set) => {
      const outerIndex = set.index;
      const outerInstruction = this.adapter.instructions[outerIndex];
      const outerProgramId = this.adapter.getInstructionProgramId(outerInstruction);
      if (SYSTEM_PROGRAMS.includes(outerProgramId)) return;
      groupKey = `${outerProgramId}:${outerIndex}`;

      set.instructions.forEach((ix, innerIndex) => {
        const innerProgramId = this.adapter.getInstructionProgramId(ix);

        // Special case for meteora vault
        if (!SYSTEM_PROGRAMS.includes(innerProgramId) && !this.isIgnoredProgram(innerProgramId)) {
          groupKey = `${innerProgramId}:${outerIndex}-${innerIndex}`;
          return;
        }

        const transferData = this.parseInstructionAction(ix, `${outerIndex}-${innerIndex}`, extraTypes);
        if (transferData) {
          if (
            FEE_ACCOUNTS.some((it) => [transferData.info.destination, transferData.info.destinationOwner].includes(it))
          ) {
            transferData.isFee = true;
          }
          if (actions[groupKey]) {
            actions[groupKey].push(transferData);
          } else {
            actions[groupKey] = [transferData];
          }
        }
      });
    });

    // process transfers without program
    groupKey = 'transfer';
    this.adapter.instructions?.forEach((ix: any, outerIndex: any) => {
      const transferData = this.parseInstructionAction(ix, `${outerIndex}`, extraTypes);
      if (transferData) {
        if (actions[groupKey]) {
          actions[groupKey].push(transferData);
        } else {
          actions[groupKey] = [transferData];
        }
      }
    });

    return actions;
  }

  processTransferInstructions(outerIndex: number, extraTypes?: string[]): TransferData[] {
    const innerInstructions = this.adapter.innerInstructions;
    if (!innerInstructions) return [];

    return innerInstructions
      .filter((set) => set.index === outerIndex)
      .flatMap((set) =>
        set.instructions
          .map((instruction, idx) => {
            const items = this.parseInstructionAction(instruction, `${outerIndex}-${idx}`, extraTypes);
            return items;
          })
          .filter((transfer): transfer is TransferData => transfer !== null)
      );
  }

  /**
   * Parse instruction actions (both parsed and compiled)
   * actions: transfer/transferCheced/mintTo/burn
   */
  parseInstructionAction(instruction: any, idx: string, extraTypes?: string[]): TransferData | null {
    const ix = this.adapter.getInstruction(instruction);

    // Handle parsed instruction
    if (ix.parsed) {
      return this.parseParsedInstructionAction(ix, idx, extraTypes);
    }

    // Handle compiled instruction
    return this.parseCompiledInstructionAction(ix, idx, extraTypes);
  }

  /**
   * Parse parsed instruction
   */
  parseParsedInstructionAction(instruction: any, idx: string, extraTypes?: string[]): TransferData | null {
    if (isTransfer(instruction)) {
      return processTransfer(instruction, idx, this.adapter);
    }
    if (isNativeTransfer(instruction)) {
      return processNatvieTransfer(instruction, idx, this.adapter);
    }
    if (isTransferCheck(instruction)) {
      return processTransferCheck(instruction, idx, this.adapter);
    }
    if (extraTypes) {
      const actions = extraTypes
        .map((it) => {
          if (isExtraAction(instruction, it)) {
            return processExtraAction(instruction, idx, this.adapter, it);
          }
        })
        .filter((it) => !!it);
      return actions.length > 0 ? actions[0] : null;
    }

    return null;
  }

  /**
   * Parse compiled instruction
   */
  parseCompiledInstructionAction(instruction: any, idx: string, extraTypes?: string[]): TransferData | null {
    if (isCompiledTransfer(instruction)) {
      return processCompiledTransfer(instruction, idx, this.adapter);
    }
    if (isCompiledNativeTransfer(instruction)) {
      return processCompiledNatvieTransfer(instruction, idx, this.adapter);
    }
    if (isCompiledTransferCheck(instruction)) {
      return processCompiledTransferCheck(instruction, idx, this.adapter);
    }
    if (extraTypes) {
      const actions = extraTypes
        .map((it) => {
          if (isCompiledExtraAction(instruction, it)) {
            return processCompiledExtraAction(instruction, idx, this.adapter, it);
          }
        })
        .filter((it) => !!it);
      return actions.length > 0 ? actions[0] : null;
    }

    return null;
  }

  /**
   * Get mint from instruction
   */
  getMintFromInstruction(ix: any, info: any): string | undefined {
    let mint = this.adapter.splTokenMap.get(info.destination)?.mint;
    if (!mint) mint = this.adapter.splTokenMap.get(info.source)?.mint;
    if (!mint && ix.programId === TOKENS.NATIVE) mint = TOKENS.SOL;
    return mint;
  }

  /**
   * Get token amount from instruction info
   */
  getTokenAmount(info: any, decimals: number) {
    if (info.tokenAmount) return info.tokenAmount;

    const amount = info.amount || info.lamports || '0';
    return {
      amount,
      decimals,
      uiAmount: Number(amount) / Math.pow(10, decimals),
    };
  }

  /**
   * Check if program should be ignored for grouping
   */
  isIgnoredProgram(programId: string): boolean {
    return Object.values(DEX_PROGRAMS)
      .filter((it) => it.tags.includes('vault'))
      .map((it) => it.id)
      .includes(programId);
  }

  /**
   * Get transfer info from transfer data
   */
  getTransferInfo(transferData: TransferData, timestamp: number, signature: string): TransferInfo | null {
    const { info } = transferData;
    if (!info || !info.tokenAmount) return null;

    const tokenInfo: TokenInfo = {
      mint: info.mint || '',
      amount: info.tokenAmount.uiAmount,
      amountRaw: info.tokenAmount.amount,
      decimals: info.tokenAmount.decimals,
    };

    return {
      type: info.source === info.authority ? 'TRANSFER_OUT' : 'TRANSFER_IN',
      token: tokenInfo,
      from: info.source,
      to: info.destination,
      timestamp,
      signature,
    };
  }

  /**
   * Get transfer info list from transfer data
   */
  getTransferInfoList(transferDataList: TransferData[]): TransferInfo[] {
    const timestamp = this.adapter.blockTime || 0;
    const signature = this.adapter.signature;

    return transferDataList
      .map((data) => this.getTransferInfo(data, timestamp, signature))
      .filter((info): info is TransferInfo => info !== null);
  }

  /**
   * Process swap data from transfers
   */
  processSwapData(transfers: TransferData[], dexInfo: DexInfo): TradeInfo | null {
    if (!transfers.length) {
      throw new Error('No swap data provided');
    }

    const uniqueTokens = this.extractUniqueTokens(transfers);
    if (uniqueTokens.length < 2) {
      return null;
      // throw `Insufficient unique tokens for swap`;
    }

    const signer = this.getSwapSigner();
    const { inputToken, outputToken, feeTransfer } = this.calculateTokenAmounts(signer, transfers, uniqueTokens);

    const trade = {
      type: getTradeType(inputToken.mint, outputToken.mint),
      inputToken,
      outputToken,
      user: signer,
      programId: dexInfo.programId,
      amm: dexInfo.amm,
      route: dexInfo.route || '',
      slot: this.adapter.slot,
      timestamp: this.adapter.blockTime || 0,
      signature: this.adapter.signature,
      idx: transfers[0].idx,
    } as TradeInfo;

    if (feeTransfer) {
      trade.fee = {
        mint: feeTransfer.info.mint,
        amount: feeTransfer.info.tokenAmount.uiAmount,
        amountRaw: feeTransfer.info.tokenAmount.amount,
        decimals: feeTransfer.info.tokenAmount.decimals,
      };
    }

    return trade;
  }

  /**
   * Get signer for swap transaction
   */
  getSwapSigner(): string {
    const defaultSigner = this.adapter.accountKeys[0];

    // Check for Jupiter DCA program
    const isDCAProgram = this.adapter.accountKeys.find((key) => key === DEX_PROGRAMS.JUPITER_DCA.id);

    return isDCAProgram ? this.adapter.accountKeys[2] : defaultSigner;
  }

  /**
   * Extract unique tokens from transfers
   */
  private extractUniqueTokens(transfers: TransferData[]): TokenInfo[] {
    const uniqueTokens: TokenInfo[] = [];
    const seenTokens = new Set<string>();

    transfers.forEach((transfer) => {
      const tokenInfo = this.getTransferTokenInfo(transfer);
      if (tokenInfo && !seenTokens.has(tokenInfo.mint)) {
        uniqueTokens.push(tokenInfo);
        seenTokens.add(tokenInfo.mint);
      }
    });

    return uniqueTokens;
  }

  /**
   * Calculate token amounts for swap
   */
  private calculateTokenAmounts(signer: string, transfers: TransferData[], uniqueTokens: TokenInfo[]) {
    let inputToken = uniqueTokens[0];
    let outputToken = uniqueTokens[uniqueTokens.length - 1];

    if (outputToken.source == signer || outputToken.authority == signer) {
      [inputToken, outputToken] = [outputToken, inputToken];
    }

    const { inputAmount, inputAmountRaw, outputAmount, outputAmountRaw, feeTransfer } = this.sumTokenAmounts(
      transfers,
      inputToken.mint,
      outputToken.mint
    );

    return {
      inputToken: {
        ...inputToken,
        amount: inputAmount,
        amountRaw: inputAmountRaw.toString(),
      } as TokenInfo,
      outputToken: {
        ...outputToken,
        amount: outputAmount,
        amountRaw: outputAmountRaw.toString(),
      },
      feeTransfer,
    };
  }

  /**
   * Sum token amounts from transfers
   */
  private sumTokenAmounts(transfers: TransferData[], inputMint: string, outputMint: string) {
    const seenTransfers = new Set<string>();
    let inputAmount: number = 0;
    let outputAmount: number = 0;
    let inputAmountRaw: bigint = 0n;
    let outputAmountRaw: bigint = 0n;
    let feeTransfer: TransferData | undefined;

    transfers.forEach((transfer) => {
      const tokenInfo = this.getTransferTokenInfo(transfer);
      if (!tokenInfo) return;

      const destination = tokenInfo.destinationOwner || tokenInfo.destination || '';
      if (FEE_ACCOUNTS.includes(destination)) {
        feeTransfer = transfer;
        return; // skip fee transfer
      }

      const key = `${tokenInfo.amount}-${tokenInfo.mint}`;
      if (seenTransfers.has(key)) return;
      seenTransfers.add(key);

      if (tokenInfo.mint === inputMint) {
        inputAmount += tokenInfo.amount;
        inputAmountRaw += BigInt(tokenInfo.amountRaw);
      }
      if (tokenInfo.mint === outputMint) {
        outputAmount += tokenInfo.amount;
        outputAmountRaw += BigInt(tokenInfo.amountRaw);
      }
    });

    return { inputAmount, inputAmountRaw, outputAmount, outputAmountRaw, feeTransfer };
  }

  /**
   * Get token info from transfer data
   */
  getTransferTokenInfo(transfer: TransferData): TokenInfo | null {
    return transfer?.info
      ? {
        mint: transfer.info.mint,
        amount: transfer.info.tokenAmount.uiAmount,
        amountRaw: transfer.info.tokenAmount.amount,
        decimals: transfer.info.tokenAmount.decimals,
        authority: transfer.info.authority,
        destination: transfer.info.destination,
        destinationOwner: transfer.info.destinationOwner,
        destinationBalance: transfer.info.destinationBalance,
        destinationPreBalance: transfer.info.destinationPreBalance,
        source: transfer.info.source,
        sourceBalance: transfer.info.sourceBalance,
        sourcePreBalance: transfer.info.sourcePreBalance,
      }
      : null;
  }

  /**
   * Sort and get LP tokens
   * make sure token0 is SPL Token, token1 is SOL/USDC/USDT
   * SOL,USDT > buy
   * SOL,DDD > buy
   * USDC,USDT/DDD > buy
   * USDT,USDC
   * DDD,USDC > sell
   * USDC,SOL > sell
   * USDT,SOL > sell
   * @param transfers
   * @returns
   */
  getLPTransfers = (transfers: TransferData[]) => {
    const tokens = transfers.filter((it) => it.type.includes('transfer'));
    if (tokens.length >= 2) {
      if (
        tokens[0].info.mint == TOKENS.SOL ||
        (this.adapter.isSupportedToken(tokens[0].info.mint) && !this.adapter.isSupportedToken(tokens[1].info.mint))
      ) {
        return [tokens[1], tokens[0]];
      }
    }
    return tokens;
  };

  attachTokenTransferInfo = (trade: TradeInfo, transferActions: Record<string, TransferData[]>): TradeInfo => {
    const inputTransfer = Object.values(transferActions)
      .flat()
      .find((it) => it.info.mint == trade.inputToken.mint && it.info.tokenAmount?.amount == trade.inputToken.amountRaw);

    const outputTransfer = Object.values(transferActions)
      .flat()
      .find(
        (it) => it.info.mint == trade.outputToken.mint && it.info.tokenAmount?.amount == trade.outputToken.amountRaw
      );

    const [solChanges, tokenChanges] = [
      this.adapter.getAccountSolBalanceChanges(false),
      this.adapter.getAccountTokenBalanceChanges(true),
    ];
    const inputAmt =
      trade.inputToken.mint == TOKENS.SOL
        ? solChanges.get(trade.user)
        : tokenChanges.get(trade.user)?.get(trade.inputToken.mint);
    const outputAmt =
      trade.outputToken.mint == TOKENS.SOL
        ? solChanges.get(trade.user)
        : tokenChanges.get(trade.user)?.get(trade.outputToken.mint);

    trade.inputToken.balanceChange = (inputAmt?.change?.amount || trade.inputToken.amountRaw).replace('-', ''); // abs value
    trade.outputToken.balanceChange = outputAmt?.change?.amount || trade.outputToken.amountRaw;

    if (inputTransfer) {
      trade.inputToken.authority = inputTransfer.info.authority;
      trade.inputToken.source = inputTransfer.info.source;
      trade.inputToken.destination = inputTransfer.info.destination;
      trade.inputToken.destinationOwner = inputTransfer.info.destinationOwner;
      trade.inputToken.destinationBalance = inputTransfer.info.destinationBalance;
      trade.inputToken.destinationPreBalance = inputTransfer.info.destinationPreBalance;
      trade.inputToken.sourceBalance = inputTransfer.info.sourceBalance;
      trade.inputToken.sourcePreBalance = inputTransfer.info.sourcePreBalance;
    } else {
      trade.inputToken.sourceBalance = inputAmt?.post;
      trade.inputToken.sourcePreBalance = inputAmt?.pre;
    }

    if (outputTransfer) {
      trade.outputToken.authority = outputTransfer.info.authority;
      trade.outputToken.source = outputTransfer.info.source;
      trade.outputToken.destination = outputTransfer.info.destination;
      trade.outputToken.destinationOwner = outputTransfer.info.destinationOwner;
      trade.outputToken.destinationBalance = outputTransfer.info.destinationBalance;
      trade.outputToken.destinationPreBalance = outputTransfer.info.destinationPreBalance;
      trade.outputToken.sourceBalance = outputTransfer.info.sourceBalance;
      trade.outputToken.sourcePreBalance = outputTransfer.info.sourcePreBalance;
    } else {
      trade.outputToken.destinationBalance = outputAmt?.post;
      trade.outputToken.destinationPreBalance = outputAmt?.pre;
    }

    trade.signer = this.adapter.signers;

    return trade;
  };

  attachUserBalanceToLPs = (liquidities: PoolEvent[]): PoolEvent[] => {
    liquidities.forEach((it) => {
      const [solChanges, tokenChanges] = [
        this.adapter.getAccountSolBalanceChanges(false),
        this.adapter.getAccountTokenBalanceChanges(true),
      ];
      const solAmt = solChanges.get(it.user);
      const [token0Amt, token1Amt] = [
        it.token0Mint == TOKENS.SOL ? solAmt : tokenChanges.get(it.user)?.get(it.token0Mint!),
        it.token1Mint == TOKENS.SOL ? solAmt : tokenChanges.get(it.user)?.get(it.token1Mint!),
      ];

      it.token0BalanceChange = token0Amt?.change?.amount || it.token0AmountRaw;
      it.token1BalanceChange = token1Amt?.change?.amount || it.token1AmountRaw;

      it.signer = this.adapter.signers;
    });

    return liquidities;
  };

  attachTradeFee(trade: TradeInfo | null) {
    if (trade) {
      if (!trade.fee) {
        const mint = trade.outputToken.mint;

        const token =
          mint == TOKENS.SOL
            ? this.adapter.getAccountSolBalanceChanges(true).get(trade.user)
            : this.adapter.getAccountTokenBalanceChanges(true).get(trade.user)?.get(mint);

        if (token) {
          const feeAmount = BigInt(trade.outputToken.amountRaw) - BigInt(token.change.amount);
          if (feeAmount > 0n) {
            const feeUiAmount = convertToUiAmount(feeAmount, trade.outputToken.decimals);
            // add fee
            trade.fee = {
              mint,
              amount: feeUiAmount,
              amountRaw: feeAmount.toString(),
              decimals: trade.outputToken.decimals,
            };
            // update outAmount
            trade.outputToken.balanceChange = token.change.amount;
          }
        }
      }

      if (trade.inputToken.mint == TOKENS.SOL) {
        const token = this.adapter.getAccountSolBalanceChanges(true).get(trade.user);
        if (token) {
          if (Math.abs(token.change.uiAmount || 0) > trade.inputToken.amount) {
            trade.inputToken.balanceChange = token.change.amount;
          }
        }
      }
    }
    return trade;
  }
}
