import { TransactionAdapter } from '../../transaction-adapter';
import { MemeEvent, BoopfunTradeEvent, ClassifiedInstruction, DexInfo, TradeInfo, TransferData } from '../../types';
import { BaseParser } from '../base-parser';
import { BoopfunEventParser } from './parser-boopfun-event';
import { getBoopfunTradeInfo } from './util';

/**
 * Parse Boopfun trades (BUY/SELL)
 */
export class BoopfunParser extends BaseParser {
  private eventParser: BoopfunEventParser;

  constructor(
    adapter: TransactionAdapter,
    dexInfo: DexInfo,
    transferActions: Record<string, TransferData[]>,
    classifiedInstructions: ClassifiedInstruction[]
  ) {
    super(adapter, dexInfo, transferActions, classifiedInstructions);
    this.eventParser = new BoopfunEventParser(adapter, transferActions);
  }

  public processTrades(): TradeInfo[] {
    const events = this.eventParser
      .parseInstructions(this.classifiedInstructions)
      .filter((event) => event.type === 'BUY' || event.type === 'SELL' || event.type === 'SWAP');
    return events.map((event) => this.createTradeInfo(event));
  }

  private createTradeInfo(event: MemeEvent): TradeInfo {
  
    const trade = getBoopfunTradeInfo(event, {
      slot: this.adapter.slot,
      signature: this.adapter.signature,
      timestamp: event.timestamp,
      idx: event.idx,
      dexInfo: this.dexInfo,
    });

    return this.utils.attachTokenTransferInfo(trade, this.transferActions);
  }
}
