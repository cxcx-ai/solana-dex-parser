import { DEX_PROGRAMS, DISCRIMINATORS } from '../../constants';
import { ClassifiedInstruction, TradeInfo } from '../../types';
import { getProgramName, getInstructionData } from '../../utils';
import { BaseParser } from '../base-parser';

export class RaydiumParser extends BaseParser {
  public processTrades(): TradeInfo[] {
    const trades: TradeInfo[] = [];

    this.classifiedInstructions.forEach(({ instruction, programId, outerIndex, innerIndex }) => {
      if (this.notLiquidityEvent(instruction)) {
        const transfers = this.getTransfersForInstruction(programId, outerIndex, innerIndex);

        if (transfers.length >= 2) {
          const trade = this.utils.processSwapData(transfers.slice(0, 2), {
            ...this.dexInfo,
            amm: this.dexInfo.amm || getProgramName(programId),
          });

          if (trade) {
            const pool = this.getPoolAddress(instruction, programId);
            if (pool) {
              trade.Pool = [pool];
            }
            if (transfers.length > 2) {
              trade.fee = this.utils.getTransferTokenInfo(transfers[2]) ?? undefined;
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
        case DEX_PROGRAMS.RAYDIUM_V4.id:
        case DEX_PROGRAMS.RAYDIUM_AMM.id:
          return accounts[1];
        case DEX_PROGRAMS.RAYDIUM_CL.id:
          return accounts[2];
        case DEX_PROGRAMS.RAYDIUM_CPMM.id:
          return accounts[3];
        default:
          return null
      }
    }
    return null;
  }

  private notLiquidityEvent(instruction: any): boolean {
    if (instruction.data) {
      const data = getInstructionData(instruction);
      const a = Object.values(DISCRIMINATORS.RAYDIUM).some((it) => data.slice(0, 1).equals(it));
      const b = Object.values(DISCRIMINATORS.RAYDIUM_CL)
        .flatMap((it) => Object.values(it))
        .some((it) => data.slice(0, 8).equals(it));
      const c = Object.values(DISCRIMINATORS.RAYDIUM_CPMM).some((it) => data.slice(0, 8).equals(it));
      return !a && !b && !c;
    }
    return true;
  }
}
