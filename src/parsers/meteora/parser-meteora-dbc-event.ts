import { Buffer } from 'buffer';
import { DEX_PROGRAMS, DISCRIMINATORS } from '../../constants';
import { InstructionClassifier } from '../../instruction-classifier';
import {
  ClassifiedInstruction, EventsParser,
  TransferData
} from '../../types';
import { MemeEvent } from '../../types/meme';
import { GetAccountTradeType, getInstructionData, sortByIdx } from '../../utils';
import { BaseEventParser } from '../base-event-parser';
import { BinaryReader } from '../binary-reader';
import { PublicKey } from '@solana/web3.js';
import { TransactionAdapter } from '../../transaction-adapter';
import { TransactionUtils } from '../../transaction-utils';

export class MeteoraDBCEventParser extends BaseEventParser {

  protected utils: TransactionUtils;

  constructor(
    protected adapter: TransactionAdapter,
    protected transferActions: Record<string, TransferData[]>
  ) {
    super(adapter, transferActions);
    this.utils = new TransactionUtils(adapter);
  }

  private readonly eventParsers: Record<string, EventsParser<any>> = {
    TRADE: {
      discriminators: [DISCRIMINATORS.METEORA_DBC.SWAP, DISCRIMINATORS.METEORA_DBC.SWAP_V2],
      slice: 8,
      decode: this.decodeTradeEvent.bind(this),
    },
    CREATE: {
      discriminators: [
        DISCRIMINATORS.METEORA_DBC.INITIALIZE_VIRTUAL_POOL_WITH_SPL_TOKEN,
        DISCRIMINATORS.METEORA_DBC.INITIALIZE_VIRTUAL_POOL_WITH_TOKEN2022,
      ],
      slice: 8,
      decode: this.decodeCreateEvent.bind(this),
    },
    MICRATE: {
      discriminators: [
        DISCRIMINATORS.METEORA_DBC.METEORA_DBC_MIGRATE_DAMM,
      ],
      slice: 8,
      decode: this.decodeDBCMigrateDammEvent.bind(this),
    },
    MICRATE_V2: {
      discriminators: [
        DISCRIMINATORS.METEORA_DBC.METEORA_DBC_MIGRATE_DAMM_V2,
      ],
      slice: 8,
      decode: this.decodeDBCMigrateDammV2Event.bind(this),
    },
  };

  public processEvents(): MemeEvent[] {
    const instructions = new InstructionClassifier(this.adapter).getInstructions(DEX_PROGRAMS.METEORA_DBC.id);
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
                const memeEvent: MemeEvent = parser.decode(data.slice(parser.slice), options);
                if (!memeEvent) return null;

                memeEvent.protocol = DEX_PROGRAMS.METEORA_DBC.name;
                memeEvent.signature = this.adapter.signature;
                memeEvent.slot = this.adapter.slot;
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

  private decodeTradeEvent(data: Buffer, options: any): MemeEvent {
    const reader = new BinaryReader(data);
    const accounts = this.adapter.getInstructionAccounts(options.instruction);

    const inputAmount = reader.readU64();
    const outputAmount = reader.readU64();

    const userAccount = accounts[9];
    const baseMint = accounts[7];
    const quoteMint = accounts[8];
    const inputTokenAccount = accounts[3];
    const outputTokenAccount = accounts[4];

    var inputMint, outputMint;
    var tradeType = GetAccountTradeType(new PublicKey(userAccount), new PublicKey(baseMint), new PublicKey(inputTokenAccount), new PublicKey(outputTokenAccount))
    if (tradeType == 'SELL') {
      inputMint = baseMint;
      outputMint = quoteMint;
    } else {
      inputMint = quoteMint;
      outputMint = baseMint;
    }

    const event = {
      type: tradeType,
      baseMint: baseMint,    // base_mint
      quoteMint: quoteMint,   // quote_mint
      bondingCurve: accounts[2], // pool
      pool: accounts[2], // pool
      user: userAccount,
      inputToken: {
        mint: inputMint,
        amountRaw: inputAmount.toString(),
      },
      outputToken: {
        mint: outputMint,
        amountRaw: outputAmount.toString(),
      },
    } as MemeEvent;

    const transfers = this.getTransfersForInstruction(options.programId, options.outerIndex, options.innerIndex);

    if (transfers.length >= 2) {
      const trade = this.utils.processSwapData(transfers.slice(0, 2), {
      });
      if (trade) {
        event.inputToken = trade.inputToken;
        event.outputToken = trade.outputToken;
      }
    }

    return event;
  }

  private decodeCreateEvent(data: Buffer, options: any): MemeEvent {

    const reader = new BinaryReader(data);
    const accounts = this.adapter.getInstructionAccounts(options.instruction);

    // Validate minimum account count
    if (accounts.length < 10) {
      throw Error("insufficient accounts for init_pool_spl instruction: need at least 16")
    }

    const name = reader.readString();
    const symbol = reader.readString();
    const uri = reader.readString();

    return {
      type: 'CREATE',
      name: name,
      symbol: symbol,
      uri: uri,
      user: accounts[2],
      baseMint: accounts[3],
      quoteMint: accounts[4],
      pool: accounts[5],
      bondingCurve: accounts[5],
      platformConfig: accounts[0],
    } as MemeEvent
  }

  private decodeDBCMigrateDammEvent(data: Buffer, options: any): MemeEvent {
    const accounts = this.adapter.getInstructionAccounts(options.instruction);

    return {
      type: 'MIGRATE',
      baseMint: accounts[7],
      quoteMint: accounts[8],
      platformConfig: accounts[2],
      bondingCurve: accounts[0],
      pool: accounts[4],
      poolDex: DEX_PROGRAMS.METEORA_DAMM.name
    } as MemeEvent
  }

  private decodeDBCMigrateDammV2Event(data: Buffer, options: any): MemeEvent {
    const accounts = this.adapter.getInstructionAccounts(options.instruction);

    return {
      type: 'MIGRATE',
      baseMint: accounts[13],
      quoteMint: accounts[14],
      platformConfig: accounts[2],
      bondingCurve: accounts[0],
      pool: accounts[4],
      poolDex: DEX_PROGRAMS.METEORA_DAMM_V2.name
    } as MemeEvent
  }
}
