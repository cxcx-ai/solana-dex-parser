import { DEX_PROGRAMS } from '../../constants';
import { TransactionAdapter } from '../../transaction-adapter';
import { TransactionUtils } from '../../transaction-utils';
import { ClassifiedInstruction, DexInfo, TradeInfo, TransferData } from '../../types';
import { MemeEvent } from '../../types/meme';
import { BaseParser } from '../base-parser';
import { MeteoraDBCEventParser } from './parser-meteora-dbc-event';

export class MeteoraDBCParser extends BaseParser {
  private eventParser: MeteoraDBCEventParser;

  constructor(
    adapter: TransactionAdapter,
    dexInfo: DexInfo,
    transferActions: Record<string, TransferData[]>,
    classifiedInstructions: ClassifiedInstruction[]
  ) {
    super(adapter, dexInfo, transferActions, classifiedInstructions);
    this.eventParser = new MeteoraDBCEventParser(adapter, transferActions);
  }

  public processTrades(): TradeInfo[] {
    const events = this.eventParser
      .parseInstructions(this.classifiedInstructions)
      .filter((event) => event.type == "BUY" || event.type == "SELL" || event.type == "SWAP");

    return events.map((event) => this.createTradeInfo(event));
  }

  private createTradeInfo(event: MemeEvent): TradeInfo {

    const trade = {
      type: event.type,
      pool: [event.pool!], // should be BondingCurve
      inputToken: event.inputToken!,
      outputToken: event.outputToken!,
      user: event.user!,
      programId: this.dexInfo.programId!,
      amm: DEX_PROGRAMS.METEORA_DBC.name,
      amms: [DEX_PROGRAMS.METEORA_DBC.name],
      route: this.dexInfo.route!,
      slot: this.adapter.slot!,
      timestamp: event.timestamp!,
      signature: this.adapter.signature!,
      idx: event.idx!,
    } as unknown as TradeInfo;

    return this.utils.attachTokenTransferInfo(trade, this.transferActions);
  }

}
