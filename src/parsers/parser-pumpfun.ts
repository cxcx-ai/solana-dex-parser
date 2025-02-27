import { ParsedTransactionWithMeta } from '@solana/web3.js';
import { DEX_PROGRAMS, TOKENS } from '../constants';
import { DexInfo, PumpfunEvent, PumpfunTradeEvent, TradeInfo, TradeType } from '../types';
import { PumpfunEventParser } from './parser-pumpfun-event';

export class PumpfunParser {
  private eventParser: PumpfunEventParser;

  constructor(
    private readonly txWithMeta: ParsedTransactionWithMeta,
    private readonly dexInfo?: DexInfo
  ) {
    this.eventParser = new PumpfunEventParser(this.txWithMeta, dexInfo);
  }

  public processTrades(): TradeInfo[] {
    const events = this.eventParser.processEvents().filter((it) => it.type == 'TRADE');
    return events.length > 0 ? this.processSwapData(events) : [];
  }

  public processInstructionTrades(instructionIndex: number): TradeInfo[] {
    const events = this.parseInnerInstructions(instructionIndex);
    return this.processSwapData(events);
  }

  public isTradeInstruction(instruction: any): boolean {
    const programId = instruction.programId.toBase58();
    return DEX_PROGRAMS.PUMP_FUN.id == programId;
  }

  private parseInnerInstructions(instructionIndex: number): PumpfunEvent[] {
    return this.eventParser.parseInnerInstructions(instructionIndex).filter((it) => it.type == 'TRADE');
  }

  private processSwapData(events: PumpfunEvent[]): TradeInfo[] {
    if (!events.length) return [];
    return events.map((event) => this.createTradeInfo(event));
  }

  private createTradeInfo(data: PumpfunEvent): TradeInfo {
    const event = data.data as PumpfunTradeEvent;
    const tradeType: TradeType = event.isBuy ? 'BUY' : 'SELL';
    const isBuy = tradeType === 'BUY';

    return {
      type: tradeType,
      inputToken: {
        mint: isBuy ? TOKENS.SOL : event.mint,
        amount: isBuy ? event.solAmount : event.tokenAmount,
        decimals: isBuy ? 9 : 6,
      },
      outputToken: {
        mint: isBuy ? event.mint : TOKENS.SOL,
        amount: isBuy ? event.tokenAmount : event.solAmount,
        decimals: isBuy ? 6 : 9,
      },
      user: event.user,
      programId: DEX_PROGRAMS.PUMP_FUN.id,
      amm: DEX_PROGRAMS.PUMP_FUN.name,
      slot: data.slot,
      timestamp: data.timestamp,
      signature: data.signature,
      idx: data.idx,
    };
  }
}
