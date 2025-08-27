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

export class HeavenEventParser extends BaseEventParser {

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
      discriminators: [DISCRIMINATORS.HEAVEN.BUY],
      slice: 8,
      decode: this.decodeBuyEvent.bind(this),
    },
    SELL: {
      discriminators: [DISCRIMINATORS.HEAVEN.SELL],
      slice: 8,
      decode: this.decodeSellEvent.bind(this),
    },
    INITIAL_BUY: {
      discriminators: [
        DISCRIMINATORS.HEAVEN.CREATE_POOL,
      ],
      slice: 8,
      decode: this.decodeInitialBuyEvent.bind(this),
    },
    CREATE: {
      discriminators: [
        DISCRIMINATORS.METAPLEX.CREATE_MINT,
      ],
      slice: 1,
      decode: this.decodeCreateEvent.bind(this),
    },
  };

  public processEvents(): MemeEvent[] {
    const instructions = new InstructionClassifier(this.adapter).getMultiInstructions([DEX_PROGRAMS.HEAVEN.id, METAPLEX_PROGRAM_ID]);
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

  private decodeInitialBuyEvent(data: Buffer, options: any): MemeEvent {

    const accounts = this.adapter.getInstructionAccounts(options.instruction);

    const bondingCurve = accounts[10];
    const userAccount = accounts[4];
    const inputMint = accounts[6]; //quoteMint
    const outputMint = accounts[5]; // baseMint

    const event = {
      protocol: DEX_PROGRAMS.HEAVEN.name,
      type: 'BUY',
      baseMint: outputMint,    // base_mint
      quoteMint: inputMint,   // quote_mint
      bondingCurve: bondingCurve, // pool
      pool: bondingCurve, // pool
      user: userAccount,
      platformConfig: accounts[11]
    } as MemeEvent;

    return this.utils.processMemeTransferData(options, event, outputMint, false, 1, this.transferActions);
  }


  private decodeBuyEvent(data: Buffer, options: any): MemeEvent {
    const reader = new BinaryReader(data);
    const accounts = this.adapter.getInstructionAccounts(options.instruction);

    const inputAmount = reader.readU64();
    const outputAmount = reader.readU64();

    const bondingCurve = accounts[4];
    const userAccount = accounts[5];
    const outputMint = accounts[6]; // baseMint
    const inputMint = accounts[7]; //quoteMint

    const event = {
      protocol: DEX_PROGRAMS.HEAVEN.name,
      type: 'BUY',
      baseMint: outputMint,    // base_mint
      quoteMint: inputMint,   // quote_mint
      bondingCurve: bondingCurve, // pool
      pool: bondingCurve, // pool
      user: userAccount,
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

    return this.utils.processMemeTransferData(options, event, outputMint, true, 0, this.transferActions);
  }

  private decodeSellEvent(data: Buffer, options: any): MemeEvent {
    const reader = new BinaryReader(data);
    const accounts = this.adapter.getInstructionAccounts(options.instruction);

    const inputAmount = reader.readU64();
    const outputAmount = reader.readU64();

    const bondingCurve = accounts[4];
    const userAccount = accounts[5];
    const inputMint = accounts[6]; // baseMint 
    const outputMint = accounts[7]; // quoteMint

    const event = {
      protocol: DEX_PROGRAMS.HEAVEN.name,
      type: 'SELL',
      baseMint: inputMint,    // base_mint
      quoteMint: outputMint,   // quote_mint
      bondingCurve: bondingCurve, // pool
      pool: bondingCurve, // pool
      user: userAccount,
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

    return this.utils.processMemeTransferData(options, event, inputMint, true, 0, this.transferActions);
  }

  private decodeCreateEvent(data: Buffer, options: any): MemeEvent | null {

    if (options.programId != METAPLEX_PROGRAM_ID) {
      return null;
    }

    const reader = new BinaryReader(data);
    const accounts = this.adapter.getInstructionAccounts(options.instruction);

    reader.readU8(); // skip
    const name = reader.readString();
    const symbol = reader.readString();
    const uri = reader.readString();

    const baseMint = accounts[2];
    const user = accounts[4];

    return {
      protocol: DEX_PROGRAMS.HEAVEN.name,
      type: 'CREATE',
      timestamp: this.adapter.blockTime,
      user: user,
      baseMint: baseMint,
      quoteMint: TOKENS.SOL,
      name: name,
      symbol: symbol,
      uri: uri,
      decimals: 9,
      totalSupply: 1000000000
    } as MemeEvent
  }
}
