import { deserializeUnchecked } from 'borsh';
import { Buffer } from 'buffer';
import { DEX_PROGRAMS, DISCRIMINATORS } from '../../constants';
import { InstructionClassifier } from '../../instruction-classifier';
import { TransactionAdapter } from '../../transaction-adapter';
import {
  ClassifiedInstruction,
  EventsParser,
  MemeEvent, TransferData,
  convertToUiAmount
} from '../../types';
import { getInstructionData, sortByIdx } from '../../utils';
import { PoolCreateEventLayout } from './layouts/raydium-lcp-create.layout';
import { RaydiumLCPTradeLayout } from './layouts/raydium-lcp-trade.layout';
import { RaydiumLCPTradeV2Layout } from './layouts/raydium-lcp-trade_v2.layout';

export class RaydiumLaunchpadEventParser {
  constructor(private readonly adapter: TransactionAdapter,
    private readonly transferActions: Record<string, TransferData[]>) { }

  private readonly EventsParsers: Record<string, EventsParser<any>> = {
    CREATE: {
      discriminators: [DISCRIMINATORS.RAYDIUM_LCP.CREATE_EVENT],
      slice: 16,
      decode: this.decodeCreateEvent.bind(this),
    },
    TRADE: {
      discriminators: [
        DISCRIMINATORS.RAYDIUM_LCP.BUY_EXACT_IN,
        DISCRIMINATORS.RAYDIUM_LCP.BUY_EXACT_OUT,
        DISCRIMINATORS.RAYDIUM_LCP.SELL_EXACT_IN,
        DISCRIMINATORS.RAYDIUM_LCP.SELL_EXACT_OUT,
      ],
      slice: 8,
      decode: this.decodeTradeInstruction.bind(this),
    },
    COMPLETE: {
      discriminators: [DISCRIMINATORS.RAYDIUM_LCP.MIGRATE_TO_AMM, DISCRIMINATORS.RAYDIUM_LCP.MIGRATE_TO_CPSWAP],
      slice: 8,
      decode: this.decodeCompleteInstruction.bind(this),
    },
  };

  public processEvents(): MemeEvent[] {
    const instructions = new InstructionClassifier(this.adapter).getInstructions(DEX_PROGRAMS.RAYDIUM_LCP.id);
    return this.parseInstructions(instructions);
  }

  public parseInstructions(instructions: ClassifiedInstruction[]): MemeEvent[] {
    return sortByIdx(
      instructions
        .map(({ instruction, outerIndex, innerIndex }) => {
          try {
            const data = getInstructionData(instruction);

            for (const [type, parser] of Object.entries(this.EventsParsers)) {
              const discriminator = Buffer.from(data.slice(0, parser.slice));
              if (parser.discriminators.some((it) => discriminator.equals(it))) {
                const options = {
                  instruction,
                  outerIndex,
                  innerIndex,
                };
                const memeEvent = parser.decode(data, options);
                if (!memeEvent) return null;

                memeEvent.signature = this.adapter.signature;
                memeEvent.slots = this.adapter.slot;
                memeEvent.timestamp = this.adapter.blockTime;
                memeEvent.idx = `${outerIndex}-${innerIndex ?? 0}`;
                return memeEvent;
              }
            }
          } catch (error) {
            console.error('Failed to parse RaydiumLCP event:', error);
            throw error;
          }
          return null;
        })
        .filter((event): event is MemeEvent => event !== null)
    );
  }

  private decodeTradeInstruction(data: Buffer, options: any): MemeEvent {
    const eventInstruction = this.adapter.getInnerInstruction(
      options.outerIndex,
      options.innerIndex == undefined ? 0 : options.innerIndex + 1
    ); // find inner instruction
    if (!eventInstruction) {
      throw new Error('Event instruction not found');
    }

    // get event data from inner instruction

    const eventData = getInstructionData(eventInstruction).slice(16);
    const isNewVersion = eventData.length > 130; // 146
    const layout =
      isNewVersion
        ? deserializeUnchecked(RaydiumLCPTradeV2Layout.schema, RaydiumLCPTradeV2Layout, Buffer.from(eventData))
        : deserializeUnchecked(RaydiumLCPTradeLayout.schema, RaydiumLCPTradeLayout, Buffer.from(eventData));
    const evt = layout.toObject();
    // get instruction accounts
    const accounts = this.adapter.getInstructionAccounts(options.instruction);
    evt.user = accounts[0];
    evt.baseMint = accounts[9];
    evt.quoteMint = accounts[10];

    let inputMint, outputMint;
    let inputAmount, outputAmount;
    let inputDecimals, outputDecimals;
    if (evt.tradeDirection == 0) {
      inputMint = evt.quoteMint;
      inputAmount = evt.amountIn;
      inputDecimals = 9;

      outputMint = evt.baseMint;
      outputAmount = evt.amountOut;
      outputDecimals = 6;
    }
    else {
      inputMint = evt.baseMint;
      inputAmount = evt.amountIn;
      inputDecimals = 6;
      outputMint = evt.quoteMint;
      outputAmount = evt.amountOut;
      outputDecimals = 9;
    }

    return {
      protocol: DEX_PROGRAMS.RAYDIUM_LCP.name,
      type: evt.tradeDirection === 0 ? 'BUY' : 'SELL',
      bondingCurve: evt.poolState,
      baseMint: evt.baseMint,
      quoteMint: evt.quoteMint,
      user: evt.user,
      inputToken: {
        mint: inputMint,
        amountRaw: inputAmount.toString(),
        amount: convertToUiAmount(inputAmount, inputDecimals),
        decimals: inputDecimals,
      },
      outputToken: {
        mint: outputMint,
        amountRaw: outputAmount.toString(),
        amount: convertToUiAmount(outputAmount, outputDecimals),
        decimals: outputDecimals,
      },
      fee: Number(evt.protocolFee),
      platformFee: Number(evt.platformFee),
      shareFee: Number(evt.shareFee),
      creatorFee: evt.creatorFee,
    } as MemeEvent;
  }

  private decodeCreateEvent(data: Buffer, options: any): MemeEvent {
    const eventInstruction = this.adapter.instructions[options.outerIndex]; // find outer instruction
    if (!eventInstruction) {
      throw new Error('Event instruction not found');
    }
    // parse event data
    const eventData = data.slice(16);
    const evt = PoolCreateEventLayout.deserialize(eventData).toObject();

    // get instruction accounts
    const accounts = this.adapter.getInstructionAccounts(eventInstruction);
    evt.baseMint = accounts[6];
    evt.quoteMint = accounts[7];

    return {
      protocol: DEX_PROGRAMS.RAYDIUM_LCP.name,
      type: 'CREATE',
      timestamp: this.adapter.blockTime,
      user: evt.creator,
      baseMint: evt.baseMint,
      quoteMint: evt.quoteMint,
      name: evt.baseMintParam.name,
      symbol: evt.baseMintParam.symbol,
      uri: evt.baseMintParam.uri,
      decimals: evt.baseMintParam.decimals,
      bondingCurve: evt.poolState,
      creator: evt.creator,
    } as MemeEvent;
  }

  private decodeCompleteInstruction(data: Buffer, options: any): MemeEvent {
    const discriminator = Buffer.from(data.slice(0, 8));
    const accounts = this.adapter.getInstructionAccounts(options.instruction);
    const [baseMint, quoteMint, poolMint, lpMint] = discriminator.equals(DISCRIMINATORS.RAYDIUM_LCP.MIGRATE_TO_AMM)
      ? [accounts[1], accounts[2], accounts[13], accounts[16]]
      : [accounts[1], accounts[2], accounts[5], accounts[7]];
    const amm = discriminator.equals(DISCRIMINATORS.RAYDIUM_LCP.MIGRATE_TO_AMM)
      ? DEX_PROGRAMS.RAYDIUM_V4.name
      : DEX_PROGRAMS.RAYDIUM_CPMM.name;

    return {
      protocol: DEX_PROGRAMS.RAYDIUM_LCP.name,
      type: 'MIGRATE',
      timestamp: this.adapter.blockTime,
      baseMint: baseMint,
      quoteMint: quoteMint,
      pool: poolMint,
      poolDex: amm
    } as MemeEvent
  }
}
