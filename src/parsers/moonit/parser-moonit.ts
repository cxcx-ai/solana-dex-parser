import { TokenAmount } from '@solana/web3.js';
import { DEX_PROGRAMS, DISCRIMINATORS, TOKENS } from '../../constants';
import { convertToUiAmount, TradeInfo, TradeType } from '../../types';
import { absBigInt, getInstructionData } from '../../utils';
import { BaseParser } from '../base-parser';

// MoonShot
export class MoonitParser extends BaseParser {
  public processTrades(): TradeInfo[] {
    const trades: TradeInfo[] = [];

    this.classifiedInstructions.forEach(({ instruction, programId, outerIndex, innerIndex }) => {
      if (this.isTradeInstruction(instruction, programId)) {
        const trade = this.parseTradeInstruction(instruction, `${outerIndex}-${innerIndex ?? 0}`);
        if (trade) {
          trades.push(trade);
        }
      }
    });

    return trades;
  }

  private isTradeInstruction(instruction: any, programId: string): boolean {
    const accounts = this.adapter.getInstructionAccounts(instruction);
    return programId === DEX_PROGRAMS.MOONIT.id && accounts && accounts.length === 11;
  }

  private parseTradeInstruction(instruction: any, idx: string): TradeInfo | null {
    try {
      if (!('data' in instruction)) return null;

      const data = getInstructionData(instruction);
      const discriminator = data.slice(0, 8);
      let tradeType: TradeType;

      if (discriminator.equals(DISCRIMINATORS.MOONIT.BUY)) {
        tradeType = 'BUY';
      } else if (discriminator.equals(DISCRIMINATORS.MOONIT.SELL)) {
        tradeType = 'SELL';
      } else {
        return null;
      }

      const moonitTokenMint = this.adapter.getInstructionAccounts(instruction)[6];
      const accountKeys = this.adapter.accountKeys;
      const collateralMint = this.detectCollateralMint(accountKeys);
      const { tokenAmount, collateralAmount } = this.calculateAmounts(moonitTokenMint, collateralMint);

      const trade: TradeInfo = {
        type: tradeType,
        Pool: [accountKeys[2]],
        inputToken: {
          mint: tradeType === 'BUY' ? collateralMint : moonitTokenMint,
          amount: tradeType === 'BUY' ? (collateralAmount.uiAmount ?? 0) : (tokenAmount.uiAmount ?? 0),
          amountRaw: tradeType === 'BUY' ? collateralAmount.amount : tokenAmount.amount,
          decimals: tradeType === 'BUY' ? collateralAmount.decimals : tokenAmount.decimals,
        },
        outputToken: {
          mint: tradeType === 'BUY' ? moonitTokenMint : collateralMint,
          amount: tradeType === 'BUY' ? (tokenAmount.uiAmount ?? 0) : (collateralAmount.uiAmount ?? 0),
          amountRaw: tradeType === 'BUY' ? tokenAmount.amount : collateralAmount.amount,
          decimals: tradeType === 'BUY' ? tokenAmount.decimals : collateralAmount.decimals,
        },
        user: this.adapter.signer,
        programId: DEX_PROGRAMS.MOONIT.id,
        amm: DEX_PROGRAMS.MOONIT.name,
        route: this.dexInfo.route || '',
        slot: this.adapter.slot,
        timestamp: this.adapter.blockTime,
        signature: this.adapter.signature,
        idx,
      };

      return this.utils.attachTokenTransferInfo(trade, this.transferActions);
    } catch (error) {
      console.error('Failed to parse Moonit trade:', error);
      throw error;
    }
  }

  private detectCollateralMint(accountKeys: string[]): string {
    if (accountKeys.some((key) => key === TOKENS.USDC)) return TOKENS.USDC;
    if (accountKeys.some((key) => key === TOKENS.USDT)) return TOKENS.USDT;
    return TOKENS.SOL;
  }

  private calculateAmounts(tokenMint: string, collateralMint: string) {
    const tokenBalanceChanges = this.getTokenBalanceChanges(tokenMint);
    const collateralBalanceChanges = this.getTokenBalanceChanges(collateralMint);

    return {
      tokenAmount: this.createTokenAmount(absBigInt(tokenBalanceChanges), tokenMint),
      collateralAmount: this.createTokenAmount(absBigInt(collateralBalanceChanges), collateralMint),
    };
  }

  private getTokenBalanceChanges(mint: string): bigint {
    const signer = this.adapter.signer;

    if (mint === TOKENS.SOL) {
      if (!this.adapter.postBalances?.[0] || !this.adapter.preBalances?.[0]) {
        throw new Error('Insufficient balance information for SOL');
      }
      return BigInt(this.adapter.postBalances[0] - this.adapter.preBalances[0]);
    }

    let preAmount = BigInt(0);
    let postAmount = BigInt(0);
    let balanceFound = false;

    this.adapter.preTokenBalances?.forEach((preBalance) => {
      if (preBalance.mint === mint && preBalance.owner === signer) {
        preAmount = BigInt(preBalance.uiTokenAmount.amount);
        balanceFound = true;
      }
    });

    this.adapter.postTokenBalances?.forEach((postBalance) => {
      if (postBalance.mint === mint && postBalance.owner === signer) {
        postAmount = BigInt(postBalance.uiTokenAmount.amount);
        balanceFound = true;
      }
    });

    if (!balanceFound) {
      throw new Error('Could not find balance for specified mint and signer');
    }

    return postAmount - preAmount;
  }

  private createTokenAmount(amount: bigint, mint: string): TokenAmount {
    const decimals = this.adapter.getTokenDecimals(mint);
    return {
      amount: amount.toString(),
      uiAmount: convertToUiAmount(amount, decimals),
      decimals,
    };
  }
}
