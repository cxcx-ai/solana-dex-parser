import { Buffer } from 'buffer';
import { DEX_PROGRAMS, DISCRIMINATORS } from '../../constants';
import { InstructionClassifier } from '../../instruction-classifier';
import {
  ClassifiedInstruction, EventsParser,
  PoolEvent,
  TransferData
} from '../../types';
import { getInstructionData, getTradeType, sortByIdx } from '../../utils';
import { TransactionAdapter } from '../../transaction-adapter';
import { TransactionUtils } from '../../transaction-utils';
import { RaydiumCLPoolParser } from './liquidity-raydium-cl';
import { BaseLiquidityParser } from '../base-liquidity-parser';

export class RaydiumCLPoolV2Parser extends BaseLiquidityParser {

  protected utils: TransactionUtils;

  constructor(
    protected adapter: TransactionAdapter,
    protected transferActions: Record<string, TransferData[]>,
    protected readonly classifiedInstructions: ClassifiedInstruction[]
  ) {
    super(adapter, transferActions, classifiedInstructions);
    this.utils = new TransactionUtils(adapter);
  }

  private readonly eventParsers: Record<string, EventsParser<any>> = {
    CREATE: {
      discriminators: Object.values(DISCRIMINATORS.RAYDIUM_CL.CREATE),
      slice: 8,
      decode: this.decodeCreateEvent.bind(this),
    },
    ADD: {
      discriminators: Object.values(DISCRIMINATORS.RAYDIUM_CL.ADD_LIQUIDITY),
      slice: 8,
      decode: this.decodeAddEvent.bind(this),
    },
    REMOVE: {
      discriminators: Object.values(DISCRIMINATORS.RAYDIUM_CL.REMOVE_LIQUIDITY),
      slice: 8,
      decode: this.decodeRemoveEvent.bind(this),
    },
  };

  public processLiquidity(): PoolEvent[] {
    const instructions = new InstructionClassifier(this.adapter).getInstructions(DEX_PROGRAMS.RAYDIUM_CL.id);
    return this.parseInstructions(instructions);
  }

  public parseInstructions(instructions: ClassifiedInstruction[]): PoolEvent[] {
    return sortByIdx(
      instructions
        .map(({ programId, instruction, outerIndex, innerIndex }) => {
          try {
            const data = getInstructionData(instruction);

            for (const [_, parser] of Object.entries(this.eventParsers)) {
              const discriminator = Buffer.from(data.slice(0, parser.slice));
              if (parser.discriminators.some((it) => discriminator.equals(it))) {
                const options = {
                  instruction,
                  programId,
                  outerIndex,
                  innerIndex,
                };
                const poolEvent = parser.decode(data.slice(parser.slice), options);
                if (!poolEvent) return null;

                poolEvent.programId = DEX_PROGRAMS.RAYDIUM_CL.id;
                poolEvent.amm = DEX_PROGRAMS.RAYDIUM_CL.name;
                poolEvent.signature = this.adapter.signature;
                poolEvent.slots = this.adapter.slot;
                poolEvent.timestamp = this.adapter.blockTime;
                poolEvent.idx = `${outerIndex}-${innerIndex ?? 0}`;
                return poolEvent;
              }
            }
          } catch (error) {
            console.error('Failed to parse Meteora DBC event:', error);
            throw error;
          }
          return null;
        })
        .filter((event): event is PoolEvent => event !== null)
    );
  }


  private decodeCreateEvent(data: Buffer, options: any): PoolEvent {
    const accounts = this.adapter.getInstructionAccounts(options.instruction);

    // Validate minimum account count
    if (accounts.length < 10) {
      throw Error("insufficient accounts for init_pool_spl instruction: need at least 16")
    }

    let [token0, token1] = [accounts[3], accounts[4]]  // token0 is base token, token1 is quote token
    if (getTradeType(token0, token1) == 'BUY') {
      [token0, token1] = [token1, token0]
    }

    return {
      user: accounts[0],
      type: 'CREATE',
      poolId: accounts[2],
      config: accounts[1],
      token0Mint: token0,
      token1Mint: token1,
    } as PoolEvent
  }

  private decodeAddEvent(data: Buffer, options: any): PoolEvent | null {

    const parser = new RaydiumCLPoolParser(this.adapter, this.transferActions, []);
    return parser.ParseRaydiumInstruction(options.instruction, options.programId, options.outerIndex, options.innerIndex);
  }

  private decodeRemoveEvent(data: Buffer, options: any): PoolEvent | null {

    const parser = new RaydiumCLPoolParser(this.adapter, this.transferActions, []);
    return parser.ParseRaydiumInstruction(options.instruction, options.programId, options.outerIndex, options.innerIndex);
  }
}
