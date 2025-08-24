import base58 from 'bs58';
import { Buffer } from 'buffer';
import { DEX_PROGRAMS, DISCRIMINATORS } from '../../constants';
import { InstructionClassifier } from '../../instruction-classifier';
import { TransactionAdapter } from '../../transaction-adapter';
import {
  ClassifiedInstruction,
  EventParser,
  PumpfunCompleteEvent,
  PumpfunCreateEvent,
  PumpfunEvent,
  PumpfunTradeEvent,
} from '../../types';
import { getInstructionData, getPrevInstructionByIndex, sortByIdx } from '../../utils';
import { BinaryReader } from '../binary-reader';

export class PumpfunEventParser {
  constructor(private readonly adapter: TransactionAdapter) { }

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
  };

  public processEvents(): PumpfunEvent[] {
    const instructions = new InstructionClassifier(this.adapter).getInstructions(DEX_PROGRAMS.PUMP_FUN.id);
    return this.parseInstructions(instructions);
  }

  public parseInstructions(instructions: ClassifiedInstruction[]): PumpfunEvent[] {
    return sortByIdx(
      instructions
        .map(({ instruction, outerIndex, innerIndex }) => {
          try {
            const data = getInstructionData(instruction);
            const discriminator = Buffer.from(data.slice(0, 16));

            for (const [type, parser] of Object.entries(this.eventParsers)) {
              if (discriminator.equals(parser.discriminator)) {
                const eventData = parser.decode(data.slice(16));
                if (!eventData) return null;

                if (type == 'TRADE') {
                  const prevInstruction = getPrevInstructionByIndex(instructions, outerIndex, innerIndex);
                  if (prevInstruction) {
                    const accounts = this.adapter.getInstructionAccounts(prevInstruction.instruction);
                    if (accounts && accounts.length > 3) {
                      eventData.bondingCurve = accounts[3];
                    }
                  }
                }

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
            console.error('Failed to parse Pumpfun event:', error);
            throw error;
          }
          return null;
        })
        .filter((event): event is PumpfunEvent => event !== null)
    );
  }

  private decodeTradeEvent(data: Buffer): PumpfunTradeEvent {
    const reader = new BinaryReader(data);

    return {
      mint: base58.encode(Buffer.from(reader.readFixedArray(32))),
      solAmount: reader.readU64(),
      tokenAmount: reader.readU64(),
      isBuy: reader.readU8() === 1,
      user: base58.encode(reader.readFixedArray(32)),
      timestamp: reader.readI64(),
      virtualSolReserves: reader.readU64(),
      virtualTokenReserves: reader.readU64(),
    };
  }

  private decodeCreateEvent(data: Buffer): PumpfunCreateEvent {
    const reader = new BinaryReader(data);
    return {
      name: reader.readString(),
      symbol: reader.readString(),
      uri: reader.readString(),
      mint: base58.encode(Buffer.from(reader.readFixedArray(32))),
      bondingCurve: base58.encode(reader.readFixedArray(32)),
      user: base58.encode(reader.readFixedArray(32)),
    };
  }

  private decodeCompleteEvent(data: Buffer): PumpfunCompleteEvent {
    const reader = new BinaryReader(data);
    return {
      user: base58.encode(reader.readFixedArray(32)),
      mint: base58.encode(Buffer.from(reader.readFixedArray(32))),
      bondingCurve: base58.encode(reader.readFixedArray(32)),
      timestamp: reader.readI64(),
    };
  }
}
