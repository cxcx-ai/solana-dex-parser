import { DEX_PROGRAMS, DISCRIMINATORS } from '../../constants';
import { TradeInfo } from '../../types';
import { getInstructionData, getProgramName } from '../../utils';
import { BaseParser } from '../base-parser';

export class MeteoraParser extends BaseParser {
  public processTrades(): TradeInfo[] {
    const trades: TradeInfo[] = [];

    this.classifiedInstructions.forEach(({ instruction, programId, outerIndex, innerIndex }) => {
      if (
        [DEX_PROGRAMS.METEORA.id, DEX_PROGRAMS.METEORA_DAMM.id, DEX_PROGRAMS.METEORA_DAMM_V2.id].includes(programId) &&
        this.notLiquidityEvent(instruction)
      ) {
        const transfers = this.getTransfersForInstruction(programId, outerIndex, innerIndex);
        if (transfers.length >= 2) {
          const trade = this.utils.processSwapData(transfers, {
            ...this.dexInfo,
            amm: this.dexInfo.amm || getProgramName(programId),
          });
          if (trade) {
            const pool = this.getPoolAddress(instruction, programId);
            if (pool) {
              trade.Pool = [pool];
            }
            trades.push(this.utils.attachTokenTransferInfo(trade, this.transferActions));
          }
        }
      }
    });

    return trades;
  }

  private getPoolAddress(instruction: any, programId: string): string | null {
    const accounts = this.adapter.getInstructionAccounts(instruction);
    if (accounts.length > 5) {
      switch (programId) {
        case DEX_PROGRAMS.METEORA_DAMM.id:
        case DEX_PROGRAMS.METEORA.id:
          return accounts[0];
        case DEX_PROGRAMS.METEORA_DAMM_V2.id:
          return accounts[1];
        default:
          return null
      }
    }
    return null;
  }

  private notLiquidityEvent(instruction: any): boolean {
    const data = getInstructionData(instruction);
    if (!data) return true;

    const isDLMMLiquidity = Object.values(DISCRIMINATORS.METEORA_DLMM)
      .flatMap((it) => Object.values(it))
      .some((it) => data.slice(0, it.length).equals(it));

    const isPoolsLiquidity = Object.values(DISCRIMINATORS.METEORA_DAMM).some((it) =>
      data.slice(0, it.length).equals(it)
    );

    const isDAMMLiquidity = Object.values(DISCRIMINATORS.METEORA_DAMM_V2).some((it) =>
      data.slice(0, it.length).equals(it)
    );

    return !isDLMMLiquidity && !isPoolsLiquidity && !isDAMMLiquidity;
  }
}
