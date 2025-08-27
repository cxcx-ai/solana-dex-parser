import { Buffer } from 'buffer';
import { DEX_PROGRAMS, DISCRIMINATORS, METAPLEX_PROGRAM_ID, TOKENS } from '../../constants';
import { InstructionClassifier } from '../../instruction-classifier';
import {
  ClassifiedInstruction, EventsParser,
  TransferData
} from '../../types';
import { MemeEvent } from '../../types/meme';
import { getInstructionData, sortByIdx } from '../../utils';
import { BaseEventParser } from '../base-event-parser';
import { BinaryReader } from '../binary-reader';
import { TransactionAdapter } from '../../transaction-adapter';
import { TransactionUtils } from '../../transaction-utils';

export class SugarEventParser extends BaseEventParser {

  protected utils: TransactionUtils;

  constructor(
    protected adapter: TransactionAdapter,
    protected transferActions: Record<string, TransferData[]>
  ) {
    super(adapter, transferActions);
    this.utils = new TransactionUtils(adapter);
  }

  private readonly eventParsers: Record<string, EventsParser<any>> = {
    BUY: {
      discriminators: [
        DISCRIMINATORS.SUGAR.BUY_EXACT_IN,
        DISCRIMINATORS.SUGAR.BUY_EXACT_OUT,
        DISCRIMINATORS.SUGAR.BUY_MAX_OUT,
      ],
      slice: 8,
      decode: this.decodeBuyEvent.bind(this),
    },
    SELL: {
      discriminators: [
        DISCRIMINATORS.SUGAR.SELL_EXACT_IN,
        DISCRIMINATORS.SUGAR.SELL_EXACT_OUT,
      ],
      slice: 8,
      decode: this.decodeSellEvent.bind(this),
    },
    CREATE: {
      discriminators: [
        DISCRIMINATORS.SUGAR.CREATE,
      ],
      slice: 8,
      decode: this.decodeCreateEvent.bind(this),
    },
    MIGRATE: {
      discriminators: [
        DISCRIMINATORS.SUGAR.MIGRATE_TO_RADIUM,
      ],
      slice: 8,
      decode: this.decodeMigrateEvent.bind(this),
    },
  };

  public processEvents(): MemeEvent[] {
    const instructions = new InstructionClassifier(this.adapter).getMultiInstructions([DEX_PROGRAMS.SUGAR.id, METAPLEX_PROGRAM_ID]);
    return this.parseInstructions(instructions);
  }

  public parseInstructions(instructions: ClassifiedInstruction[]): MemeEvent[] {
    return sortByIdx(
      instructions
        .map(({ programId, instruction, outerIndex, innerIndex }) => {
          try {
            const data = getInstructionData(instruction);

            for (const [_, parser] of Object.entries(this.eventParsers)) {
              const discriminator = Buffer.from(data.slice(0, parser.slice));
              if (parser.discriminators.some((it) => discriminator.equals(it))) {
                const options = {
                  instruction,
                  programId,
                  outerIndex,
                  innerIndex,
                };
                const memeEvent = parser.decode(data.slice(parser.slice), options);
                if (!memeEvent) return null;

                memeEvent.signature = this.adapter.signature;
                memeEvent.slots = this.adapter.slot;
                memeEvent.timestamp = this.adapter.blockTime;
                memeEvent.idx = `${outerIndex}-${innerIndex ?? 0}`;
                return memeEvent;
              }
            }
          } catch (error) {
            console.error('Failed to parse Meteora DBC event:', error);
            throw error;
          }
          return null;
        })
        .filter((event): event is MemeEvent => event !== null)
    );
  }

  private decodeBuyEvent(data: Buffer, options: any): MemeEvent {
    const reader = new BinaryReader(data);
    const accounts = this.adapter.getInstructionAccounts(options.instruction);

    reader.readU16(); // skip
    const inputAmount = reader.readU64();
    const outputAmount = reader.readU64();

    const [baseMint, pool, user] = [accounts[1], accounts[2], accounts[6]];
    const inputMint = TOKENS.SOL;
    const outputMint = baseMint

    const event = {
      protocol: DEX_PROGRAMS.SUGAR.name,
      type: 'BUY',
      baseMint: outputMint,    // base_mint
      quoteMint: inputMint,   // quote_mint
      bondingCurve: pool, // pool
      pool: pool, // pool
      user: user,
      inputToken: {
        mint: inputMint,
        amountRaw: inputAmount.toString(),
      },
      outputToken: {
        mint: outputMint,
        amountRaw: outputAmount.toString(),
      },
      platformConfig: accounts[12]
    } as MemeEvent;

    return this.utils.processMemeTransferData(options, event, outputMint, false, 0, this.transferActions);
  }

  private decodeSellEvent(data: Buffer, options: any): MemeEvent {
    const reader = new BinaryReader(data);
    const accounts = this.adapter.getInstructionAccounts(options.instruction);

    reader.readU16(); // skip
    const inputAmount = reader.readU64();
    const outputAmount = reader.readU64();

    const [baseMint, pool, user] = [accounts[1], accounts[2], accounts[6]];
    const inputMint = baseMint;
    const outputMint = TOKENS.SOL;

    const event = {
      protocol: DEX_PROGRAMS.SUGAR.name,
      type: 'SELL',
      baseMint: inputMint,    // base_mint
      quoteMint: outputMint,   // quote_mint
      bondingCurve: pool, // pool
      pool: pool, // pool
      user: user,
      inputToken: {
        mint: inputMint,
        amountRaw: inputAmount.toString(),
      },
      outputToken: {
        mint: outputMint,
        amountRaw: outputAmount.toString(),
      },
      platformConfig: accounts[12]
    } as MemeEvent;

    return this.utils.processMemeTransferData(options, event, inputMint, false, 0, this.transferActions);
  }

  private decodeCreateEvent(data: Buffer, options: any): MemeEvent | null {
    const reader = new BinaryReader(data);
    const accounts = this.adapter.getInstructionAccounts(options.instruction);

    const name = reader.readString();
    const symbol = reader.readString();
    const uri = reader.readString();

    const [pool, baseMint, user] = [accounts[2], accounts[3], accounts[6]];

    return {
      protocol: DEX_PROGRAMS.SUGAR.name,
      type: 'CREATE',
      timestamp: this.adapter.blockTime,
      pool: pool,
      bondingCurve: pool,
      user: user,
      creator: user,
      baseMint: baseMint,
      quoteMint: TOKENS.SOL,
      name: name,
      symbol: symbol,
      uri: uri,
      decimals: 6,
      totalSupply: 1000000000
    } as MemeEvent
  }

  private decodeMigrateEvent(data: Buffer, options: any): MemeEvent | null {
    const accounts = this.adapter.getInstructionAccounts(options.instruction);

    const [pool, bondingCurve, baseMint, user] = [accounts[15], accounts[3], accounts[1], accounts[12]];

    return {
      protocol: DEX_PROGRAMS.SUGAR.name,
      type: 'MIGRATE',
      timestamp: this.adapter.blockTime,
      pool: pool,
      bondingCurve: bondingCurve,
      user: user,
      creator: user,
      baseMint: baseMint,
      quoteMint: TOKENS.SOL,
    } as MemeEvent
  }
}
