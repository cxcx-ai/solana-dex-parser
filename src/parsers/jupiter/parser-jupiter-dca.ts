import { deserializeUnchecked } from 'borsh';
import { DEX_PROGRAMS, DISCRIMINATORS, TOKENS } from '../../constants';
import { convertToUiAmount, TradeInfo, TradeType, TransferData } from '../../types';
import { getAMMs, getInstructionData, getTradeType } from '../../utils';
import { BaseParser } from '../base-parser';
import { JupiterDCAFilledLayout } from './layouts/jupiter-dca.layout';

export class JupiterDcaParser extends BaseParser {
  public processTrades(): TradeInfo[] {
    const trades: TradeInfo[] = [];

    this.classifiedInstructions.forEach(({ instruction, programId, outerIndex, innerIndex }) => {
      if (programId == DEX_PROGRAMS.JUPITER_DCA.id) {
        const data = getInstructionData(instruction);
        const discriminator = Buffer.from(data.slice(0, 16));
        if (discriminator.equals(DISCRIMINATORS.JUPITER_DCA.FILLED)) {
          trades.push(this.parseFullFilled(instruction, `${outerIndex}-${innerIndex ?? 0}`));
        }
      }
    });

    return trades;
  }

  private parseFullFilled(instruction: any, idx: string): TradeInfo {
    const eventData = getInstructionData(instruction).slice(16);
    const layout = deserializeUnchecked(JupiterDCAFilledLayout.schema, JupiterDCAFilledLayout, Buffer.from(eventData));
    const event = layout.toObject();

    const tradeType: TradeType = getTradeType(event.inputMint, event.outputMint);

    const [inputDecimal, outputDecimal, feeDecimal] = [
      this.adapter.splDecimalsMap.get(event.inputMint),
      this.adapter.splDecimalsMap.get(event.outputMint),
      this.adapter.splDecimalsMap.get(event.feeMint),
    ];

    const trade = {
      type: tradeType,
       Pool: [],
      inputToken: {
        mint: event.inputMint,
        amount: convertToUiAmount(event.inAmount, inputDecimal),
        amountRaw: event.inAmount.toString(),
        decimals: inputDecimal ?? 0,
      },
      outputToken: {
        mint: event.outputMint,
        amount: convertToUiAmount(event.outAmount, outputDecimal),
        amountRaw: event.outAmount.toString(),
        decimals: outputDecimal ?? 0,
      },
      fee: {
        mint: event.feeMint,
        amount: convertToUiAmount(event.fee, feeDecimal),
        amountRaw: event.fee.toString(),
        decimals: feeDecimal ?? 0,
      },
      user: event.userKey,
      programId: DEX_PROGRAMS.JUPITER_DCA.id,
      amm: this.getAmm(),
      route: this.dexInfo?.route || '',
      slot: this.adapter.slot,
      timestamp: this.adapter.blockTime || 0,
      signature: this.adapter.signature,
      idx: idx || '',
    };

    return this.utils.attachTokenTransferInfo(trade, this.transferActions);
  }

  private getAmm(): string {
    const amms = getAMMs(Object.keys(this.transferActions));
    return amms.length > 0 ? amms[0] : this.dexInfo?.amm || DEX_PROGRAMS.JUPITER_DCA.name;
  }

  public processTransfers(): TransferData[] {
    const transfers: TransferData[] = [];
    this.classifiedInstructions.forEach(({ instruction, programId, outerIndex, innerIndex }) => {
      if (programId == DEX_PROGRAMS.JUPITER_DCA.id) {
        const data = getInstructionData(instruction);
        const discriminator = Buffer.from(data.slice(0, 8));
        if (discriminator.equals(DISCRIMINATORS.JUPITER_DCA.CLOSE_DCA)) {
          transfers.push(...this.parseCloseDca(instruction, programId, `${outerIndex}-${innerIndex ?? 0}`));
        } else if (
          discriminator.equals(DISCRIMINATORS.JUPITER_DCA.OPEN_DCA) ||
          discriminator.equals(DISCRIMINATORS.JUPITER_DCA.OPEN_DCA_V2)
        ) {
          transfers.push(...this.parseOpenDca(instruction, programId, `${outerIndex}-${innerIndex ?? 0}`));
        }
      }
    });
    return transfers;
  }

  private parseCloseDca(instruction: any, programId: string, idx: string): TransferData[] {
    const transfers: TransferData[] = [];
    const user = this.adapter.signer;
    const balance = this.adapter.getAccountSolBalanceChanges().get(user);
    if (!balance) return [];

    const accounts = this.adapter.getInstructionAccounts(instruction);
    transfers.push({
      type: 'CloseDca',
      programId: programId,
      info: {
        authority: this.adapter.getTokenAccountOwner(accounts[1]),
        destination: user,
        destinationOwner: this.adapter.getTokenAccountOwner(user),
        mint: TOKENS.SOL,
        source: accounts[1],
        tokenAmount: {
          amount: balance.change.amount,
          uiAmount: balance.change.uiAmount ?? 0,
          decimals: balance.change.decimals,
        },
        destinationBalance: balance.post,
        destinationPreBalance: balance.pre,
      },
      idx: idx,
      timestamp: this.adapter.blockTime,
      signature: this.adapter.signature,
    });

    return transfers;
  }

  private parseOpenDca(instruction: any, programId: string, idx: string): TransferData[] {
    const transfers: TransferData[] = [];
    const user = this.adapter.signer;
    const balances = this.adapter.getAccountSolBalanceChanges();
    const balance = balances.get(user);

    if (!balance) return [];

    const accounts = this.adapter.getInstructionAccounts(instruction);
    transfers.push({
      type: 'OpenDca',
      programId: programId,
      info: {
        authority: this.adapter.getTokenAccountOwner(user),
        source: user,
        destination: accounts[0],
        destinationOwner: this.adapter.getTokenAccountOwner(accounts[0]),
        mint: TOKENS.SOL,
        tokenAmount: {
          amount: balance.change.amount,
          uiAmount: balance.change.uiAmount ?? 0,
          decimals: balance.change.decimals,
        },
        sourceBalance: balance.post,
        sourcePreBalance: balance.pre,
      },
      idx: idx,
      timestamp: this.adapter.blockTime,
      signature: this.adapter.signature,
    });

    return transfers;
  }
}
