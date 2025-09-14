import base58 from 'bs58';
import { Buffer } from 'buffer';
import { DEX_PROGRAMS, DISCRIMINATORS, TOKENS } from '../../constants';
import { InstructionClassifier } from '../../instruction-classifier';
import { TransactionAdapter } from '../../transaction-adapter';
import {
  ClassifiedInstruction,
  EventParser, MemeEvent, TransferData, convertToUiAmount
} from '../../types';
import { getInstructionData, getPrevInstructionByIndex, sortByIdx } from '../../utils';
import { BinaryReader } from '../binary-reader';

export class PumpfunEventParser {
  constructor(private readonly adapter: TransactionAdapter,
    private readonly transferActions: Record<string, TransferData[]>) { }

  private readonly eventParsers: Record<string, EventParser<any>> = {
    TRADE: {
      discriminator: DISCRIMINATORS.PUMPFUN.TRADE_EVENT,
      decode: this.decodeTradeEvent.bind(this),
    },
    CREATE: {
      discriminator: DISCRIMINATORS.PUMPFUN.CREATE_EVENT,
      decode: this.decodeCreateEvent.bind(this),
    },
    COMPLETE: {
      discriminator: DISCRIMINATORS.PUMPFUN.COMPLETE_EVENT,
      decode: this.decodeCompleteEvent.bind(this),
    },
    MIGRATE: {
      discriminator: DISCRIMINATORS.PUMPFUN.MIGRATE_EVENT,
      decode: this.decodeMigrateEvent.bind(this),
    },
  };

  public processEvents(): MemeEvent[] {
    const instructions = new InstructionClassifier(this.adapter).getInstructions(DEX_PROGRAMS.PUMP_FUN.id);
    return this.parseInstructions(instructions);
  }

  public parseInstructions(instructions: ClassifiedInstruction[]): MemeEvent[] {
    return sortByIdx(
      instructions
        .map(({ instruction, outerIndex, innerIndex }) => {
          try {
            const data = getInstructionData(instruction);
            const discriminator = Buffer.from(data.slice(0, 16));

            for (const [type, parser] of Object.entries(this.eventParsers)) {
              if (discriminator.equals(parser.discriminator)) {
                const memeEvent = parser.decode(data.slice(16));
                if (!memeEvent) return null;

                if (type == 'TRADE') {
                  const prevInstruction = getPrevInstructionByIndex(instructions, outerIndex, innerIndex);
                  if (prevInstruction) {
                    const accounts = this.adapter.getInstructionAccounts(prevInstruction.instruction);
                    if (accounts && accounts.length > 3) {
                      memeEvent.bondingCurve = accounts[3];
                    }
                  }
                }

                memeEvent.signature = this.adapter.signature;
                memeEvent.slots = this.adapter.slot;
                memeEvent.timestamp = this.adapter.blockTime;
                memeEvent.idx = `${outerIndex}-${innerIndex ?? 0}`;
                return memeEvent;
              }
            }
          } catch (error) {
            console.error('Failed to parse Pumpfun event:', error);
            throw error;
          }
          return null;
        })
        .filter((event): event is MemeEvent => event !== null)
    );
  }

  private decodeTradeEvent(data: Buffer): MemeEvent {
    const reader = new BinaryReader(data);
    const evt: any = {
      mint: reader.readPubkey(),
      quoteMint: TOKENS.SOL,
      solAmount: reader.readU64(),
      tokenAmount: reader.readU64(),
      isBuy: reader.readU8() === 1,
      user: base58.encode(reader.readFixedArray(32)),
      timestamp: reader.readI64(),
      virtualSolReserves: reader.readU64(),
      virtualTokenReserves: reader.readU64(),
    };

    if (reader.remaining() >= 52) {
      evt.realSolReserves = reader.readU64()
      evt.realTokenReserves = reader.readU64()
      evt.feeRecipient = reader.readPubkey()
      evt.feeBasisPoints = reader.readU16()
      evt.fee = reader.readU64()
      evt.creator = reader.readPubkey()
      evt.creatorFeeBasisPoints = reader.readU16()
      evt.creatorFee = reader.readU64()
    }

    let inputMint, outputMint;
    let inputAmount, outputAmount;
    let inputDecimals, outputDecimals;
    if (evt.isBuy) {
      inputMint = evt.quoteMint;
      inputAmount = evt.solAmount;
      inputDecimals = 9;

      outputMint = evt.mint;
      outputAmount = evt.tokenAmount;
      outputDecimals = 6;
    }
    else {
      inputMint = evt.mint;
      inputAmount = evt.tokenAmount;
      inputDecimals = 6;
      outputMint = evt.quoteMint;
      outputAmount = evt.solAmount;
      outputDecimals = 9;
    }

    return {
      protocol: DEX_PROGRAMS.PUMP_FUN.name,
      type: evt.isBuy ? 'BUY' : 'SELL',
      baseMint: evt.mint,
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
      fee: evt.fee,
      creatorFee: evt.creatorFee
    } as MemeEvent;
  }

  private decodeCreateEvent(data: Buffer): MemeEvent {
    const reader = new BinaryReader(data);
    const evt: any = {
      name: reader.readString(),
      symbol: reader.readString(),
      uri: reader.readString(),
      mint: base58.encode(Buffer.from(reader.readFixedArray(32))),
      bondingCurve: base58.encode(reader.readFixedArray(32)),
      user: base58.encode(reader.readFixedArray(32)),
    };
    if (reader.remaining() >= 16) {
      evt.creator = reader.readPubkey()
      evt.timestamp = reader.readI64()
    }
    if (reader.remaining() >= 32) {
      evt.virtualTokenReserves = reader.readU64()
      evt.virtualSolReserves = reader.readU64()
      evt.realTokenReserves = reader.readU64()
      evt.tokenTotalSupply = reader.readU64()
    }

    return {
      protocol: DEX_PROGRAMS.PUMP_FUN.name,
      type: 'CREATE',
      timestamp: evt.timestamp,
      user: evt.user,
      baseMint: evt.mint,
      quoteMint: TOKENS.SOL,
      name: evt.name,
      symbol: evt.symbol,
      uri: evt.uri,
      bondingCurve: evt.bondingCurve,
      creator: evt.creator,
    } as MemeEvent;
  }

  private decodeCompleteEvent(data: Buffer): MemeEvent {
    const reader = new BinaryReader(data);
    const evt: any = {
      user: base58.encode(reader.readFixedArray(32)),
      mint: base58.encode(Buffer.from(reader.readFixedArray(32))),
      bondingCurve: base58.encode(reader.readFixedArray(32)),
      timestamp: reader.readI64(),
    };
    return {
      protocol: DEX_PROGRAMS.PUMP_FUN.name,
      type: 'COMPLETE',
      timestamp: evt.timestamp,
      user: evt.user,
      baseMint: evt.mint,
      quoteMint: TOKENS.SOL,
      bondingCurve: evt.bondingCurve,
    } as MemeEvent
  }

  private decodeMigrateEvent(data: Buffer): MemeEvent {
    const reader = new BinaryReader(data);
    const evt: any = {
      user: base58.encode(reader.readFixedArray(32)),
      mint: base58.encode(Buffer.from(reader.readFixedArray(32))),
      mintAmount: reader.readU64(),
      solAmount: reader.readU64(),
      poolMigrateFee: reader.readU64(),
      bondingCurve: base58.encode(reader.readFixedArray(32)),
      timestamp: reader.readI64(),
      pool: reader.readPubkey(),
    };
    return {
      protocol: DEX_PROGRAMS.PUMP_FUN.name,
      type: 'MIGRATE',
      timestamp: evt.timestamp,
      user: evt.user,
      baseMint: evt.mint,
      quoteMint: TOKENS.SOL,
      bondingCurve: evt.bondingCurve,
      pool: evt.pool,
      poolDex: DEX_PROGRAMS.PUMP_SWAP.name,
    } as MemeEvent
  }
}
