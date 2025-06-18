import { DEX_PROGRAMS } from './constants';
import { InstructionClassifier } from './instruction-classifier';
import {
  BoopfunEventParser,
  JupiterLimitOrderParser,
  JupiterLimitOrderV2Parser,
  JupiterParser,
  JupiterVAParser,
  MeteoraDAMMPoolParser,
  MeteoraDLMMPoolParser,
  MeteoraParser,
  MeteoraPoolsParser,
  MoonshotParser,
  OrcaLiquidityParser,
  OrcaParser,
  PumpfunEventParser,
  PumpfunParser,
  PumpswapEventParser,
  PumpswapLiquidityParser,
  PumpswapParser,
  RaydiumCLPoolParser,
  RaydiumCPMMPoolParser,
  RaydiumLaunchpadEventParser,
  RaydiumLaunchpadParser,
  RaydiumParser,
  RaydiumV4PoolParser,
} from './parsers';
import { BoopfunParser } from './parsers/boopfun/parser-boopfun';
import { JupiterDcaParser } from './parsers/jupiter/parser-jupiter-dca';
import { TransactionAdapter } from './transaction-adapter';
import { TransactionUtils } from './transaction-utils';
import {
  ClassifiedInstruction,
  DexInfo,
  ParseConfig,
  ParseResult,
  PoolEvent,
  SolanaTransaction,
  TradeInfo,
  TransferData,
} from './types';
import { getFinalSwap, getProgramName } from './utils';

/**
 * Interface for DEX trade parsers
 */
type ParserConstructor = new (
  adapter: TransactionAdapter,
  dexInfo: DexInfo,
  transferActions: Record<string, TransferData[]>,
  classifiedInstructions: ClassifiedInstruction[]
) => {
  processTrades(): TradeInfo[];
};

/**
 * Interface for liquidity pool parsers
 */
type ParserLiquidityConstructor = new (
  adapter: TransactionAdapter,
  transferActions: Record<string, TransferData[]>,
  classifiedInstructions: ClassifiedInstruction[]
) => {
  processLiquidity(): PoolEvent[];
};

/**
 * Interface for Transfer parsers
 */
type ParserTransferConstructor = new (
  adapter: TransactionAdapter,
  dexInfo: DexInfo,
  transferActions: Record<string, TransferData[]>,
  classifiedInstructions: ClassifiedInstruction[]
) => {
  processTransfers(): TransferData[];
};

/**
 * Main parser class for Solana DEX transactions
 */
export class DexParser {
  // Trade parser mapping
  private readonly parserMap: Record<string, ParserConstructor> = {
    [DEX_PROGRAMS.JUPITER.id]: JupiterParser,
    [DEX_PROGRAMS.JUPITER_DCA.id]: JupiterDcaParser,
    [DEX_PROGRAMS.JUPITER_VA.id]: JupiterVAParser,
    [DEX_PROGRAMS.JUPITER_LIMIT_ORDER_V2.id]: JupiterLimitOrderV2Parser,
    [DEX_PROGRAMS.MOONSHOT.id]: MoonshotParser,
    [DEX_PROGRAMS.METEORA.id]: MeteoraParser,
    [DEX_PROGRAMS.METEORA_POOLS.id]: MeteoraParser,
    [DEX_PROGRAMS.METEORA_DAMM.id]: MeteoraParser,
    [DEX_PROGRAMS.PUMP_FUN.id]: PumpfunParser,
    [DEX_PROGRAMS.PUMP_SWAP.id]: PumpswapParser,
    [DEX_PROGRAMS.RAYDIUM_ROUTE.id]: RaydiumParser,
    [DEX_PROGRAMS.RAYDIUM_CL.id]: RaydiumParser,
    [DEX_PROGRAMS.RAYDIUM_CPMM.id]: RaydiumParser,
    [DEX_PROGRAMS.RAYDIUM_V4.id]: RaydiumParser,
    [DEX_PROGRAMS.RAYDIUM_LCP.id]: RaydiumLaunchpadParser,
    [DEX_PROGRAMS.ORCA.id]: OrcaParser,
    [DEX_PROGRAMS.BOOP_FUN.id]: BoopfunParser,
  };

  // Liquidity parser mapping
  private readonly parseLiquidityMap: Record<string, ParserLiquidityConstructor> = {
    [DEX_PROGRAMS.METEORA.id]: MeteoraDLMMPoolParser,
    [DEX_PROGRAMS.METEORA_POOLS.id]: MeteoraPoolsParser,
    [DEX_PROGRAMS.METEORA_DAMM.id]: MeteoraDAMMPoolParser,
    [DEX_PROGRAMS.RAYDIUM_V4.id]: RaydiumV4PoolParser,
    [DEX_PROGRAMS.RAYDIUM_CPMM.id]: RaydiumCPMMPoolParser,
    [DEX_PROGRAMS.RAYDIUM_CL.id]: RaydiumCLPoolParser,
    [DEX_PROGRAMS.ORCA.id]: OrcaLiquidityParser,
    [DEX_PROGRAMS.PUMP_FUN.id]: PumpswapLiquidityParser,
    [DEX_PROGRAMS.PUMP_SWAP.id]: PumpswapLiquidityParser,
  };

  // Transfer parser mapping
  private readonly parseTransferMap: Record<string, ParserTransferConstructor> = {
    [DEX_PROGRAMS.JUPITER_DCA.id]: JupiterDcaParser,
    [DEX_PROGRAMS.JUPITER_VA.id]: JupiterVAParser,
    [DEX_PROGRAMS.JUPITER_LIMIT_ORDER.id]: JupiterLimitOrderParser,
    [DEX_PROGRAMS.JUPITER_LIMIT_ORDER_V2.id]: JupiterLimitOrderV2Parser,
  };

  constructor() {}

  /**
   * Parse transaction with specific type
   */
  private parseWithClassifier(
    tx: SolanaTransaction,
    config: ParseConfig = { tryUnknowDEX: true, aggregateTrades: true },
    parseType: 'trades' | 'liquidity' | 'transfer' | 'all'
  ): ParseResult {
    const result: ParseResult = {
      state: true,
      fee: { amount: '0', uiAmount: 0, decimals: 9 },
      trades: [],
      liquidities: [],
      transfers: [],
      moreEvents: {},
      context: {} as any,
    };

    try {
      const adapter = new TransactionAdapter(tx, config);
      const utils = new TransactionUtils(adapter);
      const classifier = new InstructionClassifier(adapter);

      result.context = {
        utils,
        adapter,
      };

      // Get DEX information and validate
      const dexInfo = utils.getDexInfo(classifier);
      const allProgramIds = classifier.getAllProgramIds();

      if (config?.programIds && !config.programIds.some((id) => allProgramIds.includes(id))) {
        result.state = false;
        return result;
      }

      const transferActions = utils.getTransferActions(['mintTo', 'burn', 'mintToChecked', 'burnChecked']);
      // Process fee
      result.fee = adapter.fee;

      // Process user balance change
      result.solBalanceChange = adapter.getAccountSolBalanceChanges(false)?.get(adapter.signer);
      result.tokenBalanceChange = adapter.getAccountTokenBalanceChanges(true)?.get(adapter.signer);

      // Try specific parser first
      if (
        dexInfo.programId &&
        [
          DEX_PROGRAMS.JUPITER.id,
          DEX_PROGRAMS.JUPITER_DCA.id,
          DEX_PROGRAMS.JUPITER_DCA_KEEPER1.id,
          DEX_PROGRAMS.JUPITER_DCA_KEEPER2.id,
          DEX_PROGRAMS.JUPITER_DCA_KEEPER3.id,
          DEX_PROGRAMS.JUPITER_VA.id,
          DEX_PROGRAMS.JUPITER_LIMIT_ORDER_V2.id,
        ].includes(dexInfo.programId)
      ) {
        if (parseType === 'trades' || parseType === 'all') {
          const jupiterInstructions = classifier.getInstructions(dexInfo.programId);

          const TradeParserClass = this.parserMap[dexInfo.programId];
          if (TradeParserClass) {
            const parser = new TradeParserClass(
              adapter,
              { ...dexInfo, programId: dexInfo.programId, amm: getProgramName(dexInfo.programId) },
              transferActions,
              jupiterInstructions
            );

            const trades = parser.processTrades();
            if (trades.length > 0) {
              if (config.aggregateTrades == true) {
                result.trades.push(utils.attachTradeFee(getFinalSwap(trades))!);
              } else {
                result.trades.push(...trades);
              }
            }
          }
        }
        if (result.trades.length > 0) {
          return result;
        }
      }

      // Process instructions for each program
      for (const programId of allProgramIds) {
        if (config?.programIds && !config.programIds.some((id) => id == programId)) continue;
        if (config?.ignoreProgramIds && config.ignoreProgramIds.some((id) => id == programId)) continue;

        const classifiedInstructions = classifier.getInstructions(programId);

        // Process trades if needed
        if (parseType === 'trades' || parseType === 'all') {
          const TradeParserClass = this.parserMap[programId];
          if (TradeParserClass) {
            const parser = new TradeParserClass(
              adapter,
              { ...dexInfo, programId: programId, amm: getProgramName(programId) },
              transferActions,
              classifiedInstructions
            );
            result.trades.push(...parser.processTrades());
          } else if (config?.tryUnknowDEX) {
            // Handle unknown DEX programs
            const transfers = Object.entries(transferActions).find(([key]) => key.startsWith(programId))?.[1];
            if (transfers && transfers.length >= 2 && transfers.some((it) => adapter.isSupportedToken(it.info.mint))) {
              const trade = utils.processSwapData(transfers, {
                ...dexInfo,
                programId: programId,
                amm: getProgramName(programId),
              });

              if (trade) result.trades.push(utils.attachTokenTransferInfo(trade, transferActions));
            }
          }
        }

        // Process liquidity if needed
        if (parseType === 'liquidity' || parseType === 'all') {
          const LiquidityParserClass = this.parseLiquidityMap[programId];
          if (LiquidityParserClass) {
            const parser = new LiquidityParserClass(adapter, transferActions, classifiedInstructions);
            result.liquidities.push(...utils.attachUserBalanceToLPs(parser.processLiquidity()));
          }
        }
      }
      // Deduplicate trades
      if (result.trades.length > 0) {
        result.trades = [...new Map(result.trades.map((item) => [`${item.idx}-${item.signature}`, item])).values()];
      }

      // Process transfer if needed (if no trades and no liquidity)
      if (result.trades.length == 0 && result.liquidities.length == 0) {
        if (parseType === 'transfer' || parseType === 'all') {
          if (dexInfo.programId) {
            const classifiedInstructions = classifier.getInstructions(dexInfo.programId);
            const TransferParserClass = this.parseTransferMap[dexInfo.programId];
            if (TransferParserClass) {
              const parser = new TransferParserClass(adapter, dexInfo, transferActions, classifiedInstructions);
              result.transfers.push(...parser.processTransfers());
            }
          }
          if (result.transfers.length == 0) {
            result.transfers.push(...Object.values(transferActions).flat());
          }
        }
      }

      // Process more events if needed
      this.processMoreEvents(parseType, result, allProgramIds, adapter, transferActions, classifier);
    } catch (error) {
      if (config.throwError) {
        throw error;
      }
      const msg = `Parse error: ${tx?.transaction?.signatures?.[0]} ${error}`;
      result.state = false;
      result.msg = msg;
    }

    return result;
  }

  private processMoreEvents(
    parseType: string,
    result: ParseResult,
    allProgramIds: string[],
    adapter: TransactionAdapter,
    transferActions: Record<string, TransferData[]>,
    classifier: InstructionClassifier
  ) {
    if (parseType === 'all') {
      if (allProgramIds.includes(DEX_PROGRAMS.PUMP_FUN.id)) {
        result.moreEvents[DEX_PROGRAMS.PUMP_FUN.name] = new PumpfunEventParser(adapter).parseInstructions(
          classifier.getInstructions(DEX_PROGRAMS.PUMP_FUN.id)
        );
      }

      if (allProgramIds.includes(DEX_PROGRAMS.PUMP_SWAP.id)) {
        result.moreEvents[DEX_PROGRAMS.PUMP_SWAP.name] = new PumpswapEventParser(adapter).parseInstructions(
          classifier.getInstructions(DEX_PROGRAMS.PUMP_SWAP.id)
        );
      }

      if (allProgramIds.includes(DEX_PROGRAMS.BOOP_FUN.id)) {
        result.moreEvents[DEX_PROGRAMS.BOOP_FUN.name] = new BoopfunEventParser(
          adapter,
          transferActions
        ).parseInstructions(classifier.getInstructions(DEX_PROGRAMS.BOOP_FUN.id));
      }

      if (allProgramIds.includes(DEX_PROGRAMS.RAYDIUM_LCP.id)) {
        result.moreEvents[DEX_PROGRAMS.RAYDIUM_LCP.name] = new RaydiumLaunchpadEventParser(adapter).parseInstructions(
          classifier.getInstructions(DEX_PROGRAMS.RAYDIUM_LCP.id)
        );
      }
    }
  }

  /**
   * Parse trades from transaction
   */
  public parseTrades(tx: SolanaTransaction, config?: ParseConfig): TradeInfo[] {
    return this.parseWithClassifier(tx, config, 'trades').trades;
  }

  /**
   * Parse liquidity events from transaction
   */
  public parseLiquidity(tx: SolanaTransaction, config?: ParseConfig): PoolEvent[] {
    return this.parseWithClassifier(tx, config, 'liquidity').liquidities;
  }

  /**
   * Parse transfers from transaction (if no trades and no liquidity)
   */
  public parseTransfers(tx: SolanaTransaction, config?: ParseConfig): TransferData[] {
    return this.parseWithClassifier(tx, config, 'transfer').transfers;
  }

  /**
   * Parse both trades and liquidity events from transaction
   */
  public parseAll(tx: SolanaTransaction, config?: ParseConfig): ParseResult {
    return this.parseWithClassifier(tx, config, 'all');
  }
}
