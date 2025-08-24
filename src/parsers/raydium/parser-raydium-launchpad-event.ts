import { deserializeUnchecked } from 'borsh';
import { Buffer } from 'buffer';
import { DEX_PROGRAMS, DISCRIMINATORS } from '../../constants';
import { InstructionClassifier } from '../../instruction-classifier';
import { TransactionAdapter } from '../../transaction-adapter';
import {
  ClassifiedInstruction,
  EventsParser,
  RaydiumLCPCompleteEvent,
  RaydiumLCPCreateEvent,
  RaydiumLCPEvent,
  RaydiumLCPTradeEvent,
} from '../../types';
import { getInstructionData, sortByIdx } from '../../utils';
import { PoolCreateEventLayout } from './layouts/raydium-lcp-create.layout';
import { RaydiumLCPTradeLayout } from './layouts/raydium-lcp-trade.layout';
import { RaydiumLCPTradeV2Layout } from './layouts/raydium-lcp-trade_v2.layout';

export class RaydiumLaunchpadEventParser {
  constructor(private readonly adapter: TransactionAdapter) { }

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

  public processEvents(): RaydiumLCPEvent[] {
    const instructions = new InstructionClassifier(this.adapter).getInstructions(DEX_PROGRAMS.RAYDIUM_LCP.id);
    return this.parseInstructions(instructions);
  }

  public parseInstructions(instructions: ClassifiedInstruction[]): RaydiumLCPEvent[] {
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
                const eventData = parser.decode(data, options);
                if (!eventData) return null;

                return {
                  type: type as 'TRADE' | 'CREATE' | 'COMPLETE',
                  data: eventData,
                  slot: this.adapter.slot,
                  timestamp: this.adapter.blockTime || 0,
                  signature: this.adapter.signature,
                  idx: `${outerIndex}-${innerIndex ?? 0}`,
                };
              }
            }
          } catch (error) {
            console.error('Failed to parse RaydiumLCP event:', error);
            throw error;
          }
          return null;
        })
        .filter((event): event is RaydiumLCPEvent => event !== null)
    );
  }

  private decodeTradeInstruction(data: Buffer, options: any): RaydiumLCPTradeEvent {
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
    const event = layout.toObject();
    // get instruction accounts
    const accounts = this.adapter.getInstructionAccounts(options.instruction);
    event.user = accounts[0];
    event.baseMint = accounts[9];
    event.quoteMint = accounts[10];
    return event as RaydiumLCPTradeEvent;
  }

  private decodeCreateEvent(data: Buffer, options: any): RaydiumLCPCreateEvent {
    const eventInstruction = this.adapter.instructions[options.outerIndex]; // find outer instruction
    if (!eventInstruction) {
      throw new Error('Event instruction not found');
    }
    // parse event data
    const eventData = data.slice(16);
    const event = PoolCreateEventLayout.deserialize(eventData).toObject();

    // get instruction accounts
    const accounts = this.adapter.getInstructionAccounts(eventInstruction);
    event.baseMint = accounts[6];
    event.quoteMint = accounts[7];

    return event as RaydiumLCPCreateEvent;
  }

  private decodeCompleteInstruction(data: Buffer, options: any): RaydiumLCPCompleteEvent {
    const discriminator = Buffer.from(data.slice(0, 8));
    const accounts = this.adapter.getInstructionAccounts(options.instruction);
    const [baseMint, quoteMint, poolMint, lpMint] = discriminator.equals(DISCRIMINATORS.RAYDIUM_LCP.MIGRATE_TO_AMM)
      ? [accounts[1], accounts[2], accounts[13], accounts[16]]
      : [accounts[1], accounts[2], accounts[5], accounts[7]];
    const amm = discriminator.equals(DISCRIMINATORS.RAYDIUM_LCP.MIGRATE_TO_AMM)
      ? DEX_PROGRAMS.RAYDIUM_V4.name
      : DEX_PROGRAMS.RAYDIUM_CPMM.name;

    return {
      baseMint,
      quoteMint,
      poolMint,
      lpMint,
      amm,
    };
  }
}
