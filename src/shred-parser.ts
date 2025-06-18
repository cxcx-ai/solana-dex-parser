import { DEX_PROGRAMS } from './constants';
import { InstructionClassifier } from './instruction-classifier';
import { PumpfunInstructionParser, PumpswapInstructionParser } from './parsers/pumpfun';
import { TransactionAdapter } from './transaction-adapter';
import { ParseConfig, ParseShredResult, SolanaTransaction } from './types';
import { getProgramName } from './utils';

/**
 * Interface for DEX instruction parsers
 */
type ParserConstructor = new (
  adapter: TransactionAdapter,
  classifier: InstructionClassifier
) => {
  processInstructions(): any[];
};

/**
 * Main parser class for Solana Shred transactions
 */
export class ShredParser {
  // parser mapping
  private readonly parserMap: Record<string, ParserConstructor> = {
    [DEX_PROGRAMS.PUMP_FUN.id]: PumpfunInstructionParser,
    [DEX_PROGRAMS.PUMP_SWAP.id]: PumpswapInstructionParser,
  };

  constructor() {}

  /**
   * Parse transaction with specific type
   */
  private parseWithClassifier(tx: SolanaTransaction, config: ParseConfig = { tryUnknowDEX: true }): ParseShredResult {
    const result: ParseShredResult = {
      state: true,
      signature: '',
      instructions: {},
    };

    try {
      const adapter = new TransactionAdapter(tx, config);
      const classifier = new InstructionClassifier(adapter);

      // Get DEX information and validate
      const allProgramIds = classifier.getAllProgramIds();

      result.signature = adapter.signature;

      if (config?.programIds && !config.programIds.some((id) => allProgramIds.includes(id))) {
        return result;
      }

      // Process instructions for each program
      for (const programId of allProgramIds) {
        if (config?.programIds && !config.programIds.some((id) => id == programId)) continue;
        if (config?.ignoreProgramIds && config.ignoreProgramIds.some((id) => id == programId)) continue;

        const ParserClass = this.parserMap[programId];
        if (ParserClass) {
          const parser = new ParserClass(adapter, classifier);
          result.instructions[getProgramName(programId)] = parser.processInstructions();
        }
      }
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

  /**
   * Parse both trades and liquidity events from transaction
   */
  public parseAll(tx: SolanaTransaction, config?: ParseConfig): ParseShredResult {
    return this.parseWithClassifier(tx, config);
  }
}
