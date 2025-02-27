import { ParsedTransactionWithMeta, PartiallyDecodedInstruction, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import { DEX_PROGRAMS, DISCRIMINATORS, TOKENS } from '../constants';
import { deserializeUnchecked } from 'borsh';
import { convertToUiAmount, DexInfo, TradeInfo } from '../types';
import { TokenInfoExtractor } from '../token-extractor';

export interface JupiterSwapEvent {
  amm: PublicKey;
  inputMint: PublicKey;
  inputAmount: bigint;
  outputMint: PublicKey;
  outputAmount: bigint;
}

export interface JupiterSwapEventData extends JupiterSwapEvent {
  inputMintDecimals: number;
  outputMintDecimals: number;
  idx: string;
}

// Borsh class definition for Jupiter events
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

export interface JupiterSwapInfo {
  amms: string[];
  tokenIn: Map<string, bigint>;
  tokenOut: Map<string, bigint>;
  decimals: Map<string, number>;
  idx: string;
}

export class JupiterParser {
  private readonly splDecimalsMap: Map<string, number>;

  constructor(
    private readonly txWithMeta: ParsedTransactionWithMeta,
    private readonly dexInfo: DexInfo
  ) {
    const tokenExtractor = new TokenInfoExtractor(txWithMeta);
    this.splDecimalsMap = tokenExtractor.extractDecimals();
  }

  public processTrades(): TradeInfo[] {
    return this.txWithMeta.transaction.message.instructions.reduce(
      (trades: TradeInfo[], instruction: any, index: number) => {
        if (this.isTradeInstruction(instruction)) {
          const instructionTrades = this.processInstructionTrades(index);
          trades.push(...instructionTrades);
        }
        return trades;
      },
      []
    );
  }

  public processInstructionTrades(instructionIndex: number): TradeInfo[] {
    try {
      const events = this.processJupiterSwaps(instructionIndex);
      const data = this.processSwapData(events);
      return data ? [data] : [];
    } catch (error) {
      console.log('Error processing Jupiter trades:', error, this.txWithMeta.transaction.signatures[0]);
      return [];
    }
  }

  public isTradeInstruction(instruction: any): boolean {
    return [DEX_PROGRAMS.JUPITER.id, DEX_PROGRAMS.JUPITER_DCA.id].includes(instruction.programId.toBase58());
  }

  private processJupiterSwaps(instructionIndex: number): JupiterSwapEventData[] {
    const innerInstructions = this.txWithMeta.meta?.innerInstructions;
    if (!innerInstructions) return [];

    return innerInstructions
      .filter((set) => set.index === instructionIndex)
      .flatMap((set) =>
        set.instructions
          .filter((instruction) => this.isJupiterRouteEventInstruction(instruction as PartiallyDecodedInstruction))
          .map((instruction, idx) =>
            this.parseJupiterRouteEventInstruction(
              instruction as PartiallyDecodedInstruction,
              `${instructionIndex}-${idx}`
            )
          )
          .filter((transfer): transfer is JupiterSwapEventData => transfer !== null)
      );
  }

  private isJupiterRouteEventInstruction(instruction: PartiallyDecodedInstruction): boolean {
    if (instruction.programId.toBase58() != DEX_PROGRAMS.JUPITER.id || instruction.data?.length < 16) {
      return false;
    }

    const decodedData = bs58.decode(instruction.data.toString());
    return Buffer.from(decodedData.slice(0, 16)).equals(Buffer.from(DISCRIMINATORS.JUPITER.ROUTE_EVENT));
  }

  private parseJupiterRouteEventInstruction(
    instruction: PartiallyDecodedInstruction,
    idx: string
  ): JupiterSwapEventData | null {
    try {
      const decodedData = bs58.decode(instruction.data.toString());
      const eventData = decodedData.slice(16); // Skip discriminator

      const layout = deserializeUnchecked(JupiterLayout.schema, JupiterLayout, Buffer.from(eventData));

      const swapEvent = layout.toSwapEvent();

      return {
        ...swapEvent,
        inputMintDecimals: this.splDecimalsMap.get(swapEvent.inputMint.toBase58()) || 0,
        outputMintDecimals: this.splDecimalsMap.get(swapEvent.outputMint.toBase58()) || 0,
        idx,
      };
    } catch (error) {
      throw `Failed to parse Jupiter route event: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  private processSwapData(events: JupiterSwapEventData[]): TradeInfo | null {
    if (events.length === 0) {
      return null; // throw "No events provided";
    }

    const intermediateInfo: JupiterSwapInfo = {
      amms: [],
      tokenIn: new Map(),
      tokenOut: new Map(),
      decimals: new Map(),
      idx: '',
    };

    for (const jupiterEvent of events) {
      const inputMint = jupiterEvent.inputMint.toBase58();
      const outputMint = jupiterEvent.outputMint.toBase58();

      // Update token amounts
      intermediateInfo.tokenIn.set(
        inputMint,
        (intermediateInfo.tokenIn.get(inputMint) || BigInt(0)) + jupiterEvent.inputAmount
      );
      intermediateInfo.tokenOut.set(
        outputMint,
        (intermediateInfo.tokenOut.get(outputMint) || BigInt(0)) + jupiterEvent.outputAmount
      );

      // Store decimals
      intermediateInfo.decimals.set(inputMint, jupiterEvent.inputMintDecimals);
      intermediateInfo.decimals.set(outputMint, jupiterEvent.outputMintDecimals);

      intermediateInfo.idx = jupiterEvent.idx;
    }

    // Remove intermediate tokens
    for (const [mint, inAmount] of intermediateInfo.tokenIn.entries()) {
      const outAmount = intermediateInfo.tokenOut.get(mint);
      if (outAmount && inAmount === outAmount) {
        intermediateInfo.tokenIn.delete(mint);
        intermediateInfo.tokenOut.delete(mint);
      }
    }

    if (intermediateInfo.tokenIn.size === 0 || intermediateInfo.tokenOut.size === 0) {
      throw 'Invalid swap: all tokens were removed as intermediates';
    }

    return this.convertToSwapInfo(intermediateInfo);
  }

  private convertToSwapInfo(intermediateInfo: JupiterSwapInfo): TradeInfo | null {
    if (intermediateInfo.tokenIn.size !== 1 || intermediateInfo.tokenOut.size !== 1) {
      //throw `Invalid swap: expected 1 input and 1 output token, got ${intermediateInfo.tokenIn.size} input(s) and ${intermediateInfo.tokenOut.size} output(s)`;
      return null;
    }

    const [inMintEntry] = Array.from(intermediateInfo.tokenIn.entries());
    const [outMintEntry] = Array.from(intermediateInfo.tokenOut.entries());

    if (!inMintEntry || !outMintEntry) {
      throw 'Missing input or output token information';
    }

    const [inMint, inAmount] = inMintEntry;
    const [outMint, outAmount] = outMintEntry;
    const inMintDecimals = intermediateInfo.decimals.get(inMint) || 0;
    const outMintDecimals = intermediateInfo.decimals.get(inMint) || 0;
    // Determine signer based on DCA program presence
    const signerIndex = this.containsDCAProgram() ? 2 : 0;
    const signer = this.txWithMeta.transaction.message.accountKeys[signerIndex].pubkey.toBase58();
    const tradeType = Object.values(TOKENS).includes(inMint) ? 'BUY' : 'SELL';
    return {
      type: tradeType,
      inputToken: {
        mint: inMint,
        amount: convertToUiAmount(inAmount, inMintDecimals),
        decimals: inMintDecimals,
      },
      outputToken: {
        mint: outMint,
        amount: convertToUiAmount(outAmount, outMintDecimals),
        decimals: outMintDecimals,
      },
      user: signer,
      programId: this.dexInfo.programId,
      amm: this.dexInfo.amm,
      slot: this.txWithMeta.slot,
      timestamp: this.txWithMeta.blockTime || 0,
      signature: this.txWithMeta.transaction.signatures[0],
      idx: intermediateInfo.idx,
    };
  }

  private containsDCAProgram(): boolean {
    return this.txWithMeta.transaction.message.accountKeys.some(
      (key) => key.pubkey.toBase58() == DEX_PROGRAMS.JUPITER_DCA.id
    );
  }
}
