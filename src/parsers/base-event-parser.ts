import { TransactionAdapter } from '../transaction-adapter';
import { TransferData } from '../types';
import { MemeEvent } from '../types/meme';

export abstract class BaseEventParser {

  constructor(
    protected readonly adapter: TransactionAdapter,
    protected readonly transferActions: Record<string, TransferData[]>
  ) { }

  abstract processEvents(): MemeEvent[];

  protected getTransfersForInstruction(programId: string, outerIndex: number, innerIndex?: number): TransferData[] {
    const key = `${programId}:${outerIndex}${innerIndex == undefined ? '' : `-${innerIndex}`}`;
    const transfers = this.transferActions[key] || [];
    return transfers.filter((t) => ['transfer', 'transferChecked'].includes(t.type));
  }
}
