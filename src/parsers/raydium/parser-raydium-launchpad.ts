import { TransactionAdapter } from '../../transaction-adapter';
import {
  ClassifiedInstruction,
  DexInfo,
  MemeEvent, TradeInfo,
  TransferData
} from '../../types';
import { BaseParser } from '../base-parser';
import { RaydiumLaunchpadEventParser } from './parser-raydium-launchpad-event';
import { getRaydiumTradeInfo } from './util';

export class RaydiumLaunchpadParser extends BaseParser {
  private eventParser: RaydiumLaunchpadEventParser;

  constructor(
    adapter: TransactionAdapter,
    dexInfo: DexInfo,
    transferActions: Record<string, TransferData[]>,
    classifiedInstructions: ClassifiedInstruction[]
  ) {
    super(adapter, dexInfo, transferActions, classifiedInstructions);
    this.eventParser = new RaydiumLaunchpadEventParser(adapter, transferActions);
  }

  public processTrades(): TradeInfo[] {
    const events = this.eventParser
      .parseInstructions(this.classifiedInstructions)
      .filter((event) => event.type === 'BUY' || event.type === 'SELL' || event.type == 'SWAP');

    return events.map((event) => this.createTradeInfo(event));
  }

  private createTradeInfo(event: MemeEvent): TradeInfo {
    const isBuy = event.type == 'BUY';
    const [inputToken, inputDecimal, outputToken, outputDecimal] = isBuy
      ? [
        event.quoteMint,
        this.adapter.splDecimalsMap.get(event.quoteMint),
        event.baseMint,
        this.adapter.splDecimalsMap.get(event.baseMint),
      ]
      : [
        event.baseMint,
        this.adapter.splDecimalsMap.get(event.baseMint),
        event.quoteMint,
        this.adapter.splDecimalsMap.get(event.quoteMint),
      ];

    if (!inputToken || !outputToken) throw new Error('Token not found');

    const trade = getRaydiumTradeInfo(
      event,
      { mint: inputToken, decimals: inputDecimal! },
      { mint: outputToken, decimals: outputDecimal! },
      {
        slot: this.adapter.slot,
        signature: this.adapter.signature,
        timestamp: this.adapter.blockTime,
        idx: event.idx,
        dexInfo: this.dexInfo,
      }
    );

    return this.utils.attachTokenTransferInfo(trade, this.transferActions);
  }
}
