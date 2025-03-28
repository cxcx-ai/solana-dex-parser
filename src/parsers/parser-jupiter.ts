import { PublicKey } from '@solana/web3.js';
import { deserializeUnchecked } from 'borsh';
import { DEX_PROGRAMS, DISCRIMINATORS } from '../constants';
import { DexInfo, TradeInfo, TransferData } from '../types';
import { getAMMs, getInstructionData, getTradeType } from '../utils';
import { TransactionAdapter } from '../transaction-adapter';
import { TransactionUtils } from '../transaction-utils';

/**
 * Interface for Jupiter swap event data
 */
export interface JupiterSwapEvent {
  amm: PublicKey;
  inputMint: PublicKey;
  inputAmount: bigint;
  outputMint: PublicKey;
  outputAmount: bigint;
}

/**
 * Extended Jupiter swap event data with decimals and index
 */
export interface JupiterSwapEventData extends JupiterSwapEvent {
  inputMintDecimals: number;
  outputMintDecimals: number;
  idx: string;
}

/**
 * Borsh layout for Jupiter swap events
 */
class JupiterLayout {
  amm: Uint8Array;
  inputMint: Uint8Array;
  inputAmount: bigint;
  outputMint: Uint8Array;
  outputAmount: bigint;

  constructor(fields: {
    amm: Uint8Array;
    inputMint: Uint8Array;
    inputAmount: bigint;
    outputMint: Uint8Array;
    outputAmount: bigint;
  }) {
    this.amm = fields.amm;
    this.inputMint = fields.inputMint;
    this.inputAmount = fields.inputAmount;
    this.outputMint = fields.outputMint;
    this.outputAmount = fields.outputAmount;
  }

  static schema = new Map([
    [
      JupiterLayout,
      {
        kind: 'struct',
        fields: [
          ['amm', [32]],
          ['inputMint', [32]],
          ['inputAmount', 'u64'],
          ['outputMint', [32]],
          ['outputAmount', 'u64'],
        ],
      },
    ],
  ]);

  toSwapEvent(): JupiterSwapEvent {
    return {
      amm: new PublicKey(this.amm),
      inputMint: new PublicKey(this.inputMint),
      inputAmount: this.inputAmount,
      outputMint: new PublicKey(this.outputMint),
      outputAmount: this.outputAmount,
    };
  }
}

/**
 * Intermediate swap info for processing Jupiter events
 */
export interface JupiterSwapInfo {
  amms: string[];
  tokenIn: Map<string, bigint>;
  tokenOut: Map<string, bigint>;
  decimals: Map<string, number>;
  idx: string;
}

/**
 * Parser for Jupiter DEX transactions
 */
export class JupiterParser {
  private readonly utils: TransactionUtils;

  constructor(
    private readonly adapter: TransactionAdapter,
    private readonly dexInfo: DexInfo,
    private readonly transferActions: Record<string, TransferData[]>
  ) {
    this.utils = new TransactionUtils(adapter);
  }

  /**
   * Process trades from transaction
   */
  public processTrades(): TradeInfo[] {
    const trades: TradeInfo[] = [];

    this.adapter.instructions.forEach((ix: any, idx: number) => {
      if (this.isTradeInstruction(ix)) {
        const trade = this.processInstruction(ix, idx);
        trades.push(...trade);
      }
    });

    return trades;
  }

  /**
   * Process instruction
   */
  private processInstruction(instruction: any, idx: number): TradeInfo[] {
    try {
      const events = this.processJupiterSwaps(idx);
      const data = this.processSwapData(events);
      return data ? [data] : [];
    } catch (error) {
      console.error('Process instruction error:', error);
      return [];
    }
  }

  /**
   * Check if instruction is a trade instruction
   */
  private isTradeInstruction(instruction: any): boolean {
    const programId = this.adapter.getInstructionProgramId(instruction);
    return [DEX_PROGRAMS.JUPITER.id, DEX_PROGRAMS.JUPITER_DCA.id].includes(programId);
  }

  /**
   * Process Jupiter swap events
   */
  private processJupiterSwaps(instructionIndex: number): JupiterSwapEventData[] {
    const innerInstructions = this.adapter.innerInstructions;
    if (!innerInstructions) return [];

    return innerInstructions
      .filter((set) => set.index === instructionIndex)
      .flatMap((set) =>
        set.instructions
          .filter((ix) => this.isJupiterRouteEventInstruction(ix))
          .map((ix, idx) => this.parseJupiterRouteEventInstruction(ix, `${instructionIndex}-${idx}`))
          .filter((event): event is JupiterSwapEventData => event !== null)
      );
  }

  /**
   * Check if instruction is a Jupiter route event
   */
  private isJupiterRouteEventInstruction(instruction: any): boolean {
    const programId = this.adapter.getInstructionProgramId(instruction);
    if (programId !== DEX_PROGRAMS.JUPITER.id) return false;

    const data = getInstructionData(instruction);
    if (!data || data.length < 16) return false;

    return Buffer.from(data.slice(0, 16)).equals(Buffer.from(DISCRIMINATORS.JUPITER.ROUTE_EVENT));
  }

  /**
   * Parse Jupiter route event instruction
   */
  private parseJupiterRouteEventInstruction(instruction: any, idx: string): JupiterSwapEventData | null {
    try {
      const data = getInstructionData(instruction);
      if (!data) return null;

      if (data.length < 16) return null;

      const eventData = data.slice(16);
      const layout = deserializeUnchecked(JupiterLayout.schema, JupiterLayout, Buffer.from(eventData));
      const swapEvent = layout.toSwapEvent();

      return {
        ...swapEvent,
        inputMintDecimals: this.adapter.getTokenDecimals(swapEvent.inputMint.toBase58()) || 0,
        outputMintDecimals: this.adapter.getTokenDecimals(swapEvent.outputMint.toBase58()) || 0,
        idx,
      };
    } catch (error) {
      console.error('Parse Jupiter route event error:', error);
      return null;
    }
  }

  /**
   * Process swap data from events
   */
  private processSwapData(events: JupiterSwapEventData[]): TradeInfo | null {
    if (events.length === 0) return null;

    const intermediateInfo: JupiterSwapInfo = {
      amms: [],
      tokenIn: new Map(),
      tokenOut: new Map(),
      decimals: new Map(),
      idx: '',
    };

    // Process events
    for (const event of events) {
      const inputMint = event.inputMint.toBase58();
      const outputMint = event.outputMint.toBase58();

      const inputAmount = BigInt(event.inputAmount.toString());
      const outputAmount = BigInt(event.outputAmount.toString());

      intermediateInfo.tokenIn.set(
        inputMint,
        (intermediateInfo.tokenIn.get(inputMint) || BigInt(0)) + inputAmount
      );
      intermediateInfo.tokenOut.set(
        outputMint,
        (intermediateInfo.tokenOut.get(outputMint) || BigInt(0)) + outputAmount
      );

      intermediateInfo.decimals.set(inputMint, event.inputMintDecimals);
      intermediateInfo.decimals.set(outputMint, event.outputMintDecimals);
      intermediateInfo.idx = event.idx;
    }

    // Remove intermediate tokens
    for (const [mint, inAmount] of intermediateInfo.tokenIn.entries()) {
      const outAmount = intermediateInfo.tokenOut.get(mint);
      if (outAmount && inAmount === outAmount) {
        intermediateInfo.tokenIn.delete(mint);
        intermediateInfo.tokenOut.delete(mint);
      }
    }

    return intermediateInfo.tokenIn.size > 0 && intermediateInfo.tokenOut.size > 0
      ? this.convertToTradeInfo(intermediateInfo)
      : null;
  }

  /**
   * Convert swap info to trade info
   */
  private convertToTradeInfo(info: JupiterSwapInfo): TradeInfo | null {
    if (info.tokenIn.size !== 1 || info.tokenOut.size !== 1) return null;

    const [[inMint, inAmount]] = Array.from(info.tokenIn.entries());
    const [[outMint, outAmount]] = Array.from(info.tokenOut.entries());
    const inDecimals = info.decimals.get(inMint) || 0;
    const outDecimals = info.decimals.get(outMint) || 0;

    const signerIndex = this.containsDCAProgram() ? 2 : 0;
    const signer = this.adapter.getAccountKey(signerIndex);

    const trade = {
      type: getTradeType(inMint, outMint),
      inputToken: {
        mint: inMint,
        amount: Number(inAmount) / 10 ** inDecimals,
        decimals: inDecimals,
      },
      outputToken: {
        mint: outMint,
        amount: Number(outAmount) / 10 ** outDecimals,
        decimals: outDecimals,
      },
      user: signer,
      programId: this.dexInfo.programId,
      amm: this.dexInfo.amm || getAMMs(Object.keys(this.transferActions))?.[0] || '',
      route: this.dexInfo.route || '',
      slot: this.adapter.slot,
      timestamp: this.adapter.blockTime,
      signature: this.adapter.signature,
      idx: info.idx,
    };

    return this.utils.attachTokenTransferInfo(trade, this.transferActions);
  }

  /**
   * Check if transaction contains DCA program
   */
  private containsDCAProgram(): boolean {
    return this.adapter.accountKeys.some((key) => key === DEX_PROGRAMS.JUPITER_DCA.id);
  }

  /**
   * Parse transfer actions
   */
  public parseTransferAction(transfer: [string, TransferData[]]): TradeInfo[] {
    const [, transfers] = transfer;
    if (transfers.length < 2) return [];

    const trade = this.utils.processSwapData(transfers, this.dexInfo);
    return trade ? [trade] : [];
  }
}
