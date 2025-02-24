import {
  ParsedTransactionWithMeta,
  PartiallyDecodedInstruction,
} from "@solana/web3.js";
import { DEX_PROGRAMS, DISCRIMINATORS } from "../constants";
import {
  convertToUiAmount,
  PoolEvent,
  PoolEventType,
  TokenInfo,
  TransferData,
} from "../types";
import { TokenInfoExtractor } from "../token-extractor";
import {
  getLPTransfers,
  processTransferInnerInstruction,
} from "../transfer-utils";
import base58 from "bs58";
import { getPoolEventBase } from "../utils";

export class RaydiumLiquidityParser {
  private readonly splTokenMap: Map<string, TokenInfo>;
  private readonly splDecimalsMap: Map<string, number>;

  constructor(private readonly txWithMeta: ParsedTransactionWithMeta) {
    const tokenExtractor = new TokenInfoExtractor(txWithMeta);
    this.splTokenMap = tokenExtractor.extractSPLTokenInfo();
    this.splDecimalsMap = tokenExtractor.extractDecimals();
  }

  public processLiquidity(): PoolEvent[] {
    return this.txWithMeta.transaction.message.instructions.reduce(
      (events: PoolEvent[], instruction: any, index: number) => {
        let event: PoolEvent | null = null;
        const programId = instruction.programId.toBase58();
        switch (programId) {
          case DEX_PROGRAMS.RAYDIUM_V4.id:
            event = new RaydiumV4PoolParser(
              this.txWithMeta,
              this.splTokenMap,
              this.splDecimalsMap,
            ).parseRaydiumInstruction(instruction, index);
            break;
          case DEX_PROGRAMS.RAYDIUM_CL.id:
            event = new RaydiumCLPoolParser(
              this.txWithMeta,
              this.splTokenMap,
              this.splDecimalsMap,
            ).parseRaydiumInstruction(instruction, index);
            break;
          case DEX_PROGRAMS.RAYDIUM_CPMM.id:
            event = new RaydiumCPMMPoolParser(
              this.txWithMeta,
              this.splTokenMap,
              this.splDecimalsMap,
            ).parseRaydiumInstruction(instruction, index);
            break;
        }
        if (event) {
          events.push(event);
        }
        return events;
      },
      [],
    );
  }
}

class RaydiumV4PoolParser {
  constructor(
    private readonly txWithMeta: ParsedTransactionWithMeta,
    private readonly splTokenMap: Map<string, TokenInfo>,
    private readonly splDecimalsMap: Map<string, number>,
  ) {}

  public getPoolAction(data: any): PoolEventType | null {
    const instructionType = data.slice(0, 1);
    if (instructionType.equals(DISCRIMINATORS.RAYDIUM.CREATE)) {
      return "CREATE";
    } else if (instructionType.equals(DISCRIMINATORS.RAYDIUM.ADD_LIQUIDITY)) {
      return "ADD";
    } else if (
      instructionType.equals(DISCRIMINATORS.RAYDIUM.REMOVE_LIQUIDITY)
    ) {
      return "REMOVE";
    }
    return null;
  }

  public parseRaydiumInstruction(
    instruction: PartiallyDecodedInstruction,
    index: number,
  ): PoolEvent | null {
    try {
      const data = base58.decode(instruction.data as string);
      const instructionType = this.getPoolAction(data);

      if (!instructionType) return null;

      const transfers = processTransferInnerInstruction(
        this.txWithMeta,
        index,
        this.splTokenMap,
        this.splDecimalsMap,
        ["mintTo", "burn"],
      );

      switch (instructionType) {
        case "CREATE":
          return this.parseCreateEvent(instruction, index, data, transfers);
        case "ADD":
          return this.parseAddLiquidityEvent(
            instruction,
            index,
            data,
            transfers,
          );
        case "REMOVE":
          return this.parseRemoveLiquidityEvent(
            instruction,
            index,
            data,
            transfers,
          );
      }

      return null;
    } catch (error) {
      console.error("parseRaydiumInstruction error:", error);
      return null;
    }
  }

  private parseCreateEvent(
    instruction: PartiallyDecodedInstruction,
    index: number,
    data: any,
    transfers: TransferData[],
  ): PoolEvent {
    const [token0, token1] = getLPTransfers(transfers);
    const lpToken = transfers.find((it) => it.type == "mintTo");
    const programId = instruction.programId.toBase58();
    return {
      ...getPoolEventBase("CREATE", this.txWithMeta, programId),
      idx: index.toString(),
      poolId: instruction.accounts[4].toString(),
      poolLpMint: lpToken?.info.mint || instruction.accounts[7].toString(),
      token0Mint: token0?.info.mint,
      token1Mint: token1?.info.mint,
      token0Amount: token0?.info.tokenAmount.uiAmount || 0,
      token1Amount: token1?.info.tokenAmount.uiAmount || 0,
      lpAmount: lpToken?.info.tokenAmount.uiAmount || 0,
    };
  }

  private parseAddLiquidityEvent(
    instruction: PartiallyDecodedInstruction,
    index: number,
    data: any,
    transfers: TransferData[],
  ): PoolEvent | null {
    const [token0, token1] = getLPTransfers(transfers);
    const lpToken = transfers.find((it) => it.type == "mintTo");
    const programId = instruction.programId.toBase58();
    return {
      ...getPoolEventBase("ADD", this.txWithMeta, programId),
      idx: index.toString(),
      poolId: instruction.accounts[1].toString(),
      poolLpMint: lpToken?.info.mint || instruction.accounts[5].toString(),

      token0Mint: token0?.info.mint,
      token1Mint: token1?.info.mint,
      token0Amount: token0?.info.tokenAmount.uiAmount || 0,
      token1Amount: token1?.info.tokenAmount.uiAmount || 0,
      lpAmount: lpToken?.info.tokenAmount.uiAmount || 0,
    };
  }

  private parseRemoveLiquidityEvent(
    instruction: PartiallyDecodedInstruction,
    index: number,
    data: any,
    transfers: TransferData[],
  ): PoolEvent {
    const [token0, token1] = getLPTransfers(transfers);
    const lpToken = transfers.find((it) => it.type == "burn");
    const programId = instruction.programId.toBase58();
    return {
      ...getPoolEventBase("REMOVE", this.txWithMeta, programId),
      idx: index.toString(),
      poolId: instruction.accounts[1].toString(),
      poolLpMint: lpToken?.info.mint || instruction.accounts[5].toString(),
      token0Mint: token0?.info.mint,
      token1Mint: token1?.info.mint,
      token0Amount: token0?.info.tokenAmount.uiAmount || 0,
      token1Amount: token1?.info.tokenAmount.uiAmount || 0,
      lpAmount: lpToken?.info.tokenAmount.uiAmount || 0,
    };
  }
}

class RaydiumCLPoolParser {
  constructor(
    private readonly txWithMeta: ParsedTransactionWithMeta,
    private readonly splTokenMap: Map<string, TokenInfo>,
    private readonly splDecimalsMap: Map<string, number>,
  ) {}

  public getPoolAction(data: any): PoolEventType | null {
    const instructionType = data.slice(0, 8);

    if (instructionType.equals(DISCRIMINATORS.RAYDIUM_CL.CREATE)) {
      return "CREATE";
    } else if (
      instructionType.equals(DISCRIMINATORS.RAYDIUM_CL.ADD_LIQUIDITY)
    ) {
      return "ADD";
    } else if (
      instructionType.equals(DISCRIMINATORS.RAYDIUM_CL.REMOVE_LIQUIDITY)
    ) {
      return "REMOVE";
    }
    return null;
  }

  public parseRaydiumInstruction(
    instruction: PartiallyDecodedInstruction,
    index: number,
  ): PoolEvent | null {
    try {
      const data = base58.decode(instruction.data as string);
      const instructionType = this.getPoolAction(data);

      if (!instructionType) return null;

      const transfers = processTransferInnerInstruction(
        this.txWithMeta,
        index,
        this.splTokenMap,
        this.splDecimalsMap,
      );

      switch (instructionType) {
        case "CREATE":
          return this.parseCreateEvent(instruction, index, data, transfers);
        case "ADD":
          return this.parseAddLiquidityEvent(
            instruction,
            index,
            data,
            transfers,
          );
        case "REMOVE":
          return this.parseRemoveLiquidityEvent(
            instruction,
            index,
            data,
            transfers,
          );
      }

      return null;
    } catch (error) {
      console.error("parseRaydiumInstruction error:", error);
      return null;
    }
  }

  private parseCreateEvent(
    instruction: PartiallyDecodedInstruction,
    index: number,
    data: any,
    transfers: TransferData[],
  ): PoolEvent {
    const [token0, token1] = getLPTransfers(transfers);
    const token1Mint = token1?.info.mint || instruction.accounts[19].toString();
    const token0Mint = token0?.info.mint || instruction.accounts[18].toString();
    const programId = instruction.programId.toBase58();
    return {
      ...getPoolEventBase("CREATE", this.txWithMeta, programId),
      idx: index.toString(),
      poolId: instruction.accounts[4].toString(),
      poolLpMint: instruction.accounts[4].toString(),
      token0Mint: token0Mint,
      token1Mint: token1Mint,

      // amount 1
      token0Amount:
        token0?.info.tokenAmount.uiAmount ||
        convertToUiAmount(
          data.readBigUInt64LE(48),
          this.splDecimalsMap.get(token1Mint),
        ),
      // amount 0
      token1Amount:
        token1?.info.tokenAmount.uiAmount ||
        convertToUiAmount(
          data.readBigUInt64LE(40),
          this.splDecimalsMap.get(token0Mint),
        ),
      lpAmount: 0,
    };
  }

  private parseAddLiquidityEvent(
    instruction: PartiallyDecodedInstruction,
    index: number,
    data: any,
    transfers: TransferData[],
  ): PoolEvent | null {
    const [token0, token1] = getLPTransfers(transfers);
    const token0Mint = token0?.info.mint || instruction.accounts[13].toString();
    const token1Mint = token1?.info.mint || instruction.accounts[14].toString();
    const programId = instruction.programId.toBase58();
    if (transfers.length >= 2) {
      return {
        ...getPoolEventBase("ADD", this.txWithMeta, programId),
        idx: index.toString(),
        poolId: instruction.accounts[2].toString(),
        poolLpMint: instruction.accounts[2].toString(),
        token0Mint: token0Mint,
        token1Mint: token1Mint,
        token0Amount:
          token0?.info.tokenAmount.uiAmount ||
          convertToUiAmount(
            data.readBigUInt64LE(32),
            this.splDecimalsMap.get(token0Mint),
          ),
        token1Amount:
          token1?.info.tokenAmount.uiAmount ||
          convertToUiAmount(
            data.readBigUInt64LE(24),
            this.splDecimalsMap.get(token1Mint),
          ),
        lpAmount: convertToUiAmount(data.readBigUInt64LE(8)) || 0,
      };
    }
    return null;
  }

  private parseRemoveLiquidityEvent(
    instruction: PartiallyDecodedInstruction,
    index: number,
    data: any,
    transfers: TransferData[],
  ): PoolEvent {
    const [token0, token1] = getLPTransfers(transfers);
    const token0Mint = token0?.info.mint || instruction.accounts[14].toString();
    const token1Mint = token1?.info.mint || instruction.accounts[15].toString();
    const programId = instruction.programId.toBase58();
    return {
      ...getPoolEventBase("REMOVE", this.txWithMeta, programId),
      idx: index.toString(),
      poolId: instruction.accounts[3].toString(),
      poolLpMint: instruction.accounts[3].toString(),
      token0Mint: token0Mint,
      token1Mint: token1Mint,
      token0Amount:
        token0?.info.tokenAmount.uiAmount ||
        convertToUiAmount(
          data.readBigUInt64LE(32),
          this.splDecimalsMap.get(token0Mint),
        ),
      token1Amount:
        token1?.info.tokenAmount.uiAmount ||
        convertToUiAmount(
          data.readBigUInt64LE(24),
          this.splDecimalsMap.get(token1Mint),
        ),
      lpAmount: convertToUiAmount(data.readBigUInt64LE(8).toString()),
    };
  }
}

class RaydiumCPMMPoolParser {
  constructor(
    private readonly txWithMeta: ParsedTransactionWithMeta,
    private readonly splTokenMap: Map<string, TokenInfo>,
    private readonly splDecimalsMap: Map<string, number>,
  ) {}

  public getPoolAction(data: any): PoolEventType | null {
    const instructionType = data.slice(0, 8);

    if (instructionType.equals(DISCRIMINATORS.RAYDIUM_CPMM.CREATE)) {
      return "CREATE";
    } else if (
      instructionType.equals(DISCRIMINATORS.RAYDIUM_CPMM.ADD_LIQUIDITY)
    ) {
      return "ADD";
    } else if (
      instructionType.equals(DISCRIMINATORS.RAYDIUM_CPMM.REMOVE_LIQUIDITY)
    ) {
      return "REMOVE";
    }
    return null;
  }

  public parseRaydiumInstruction(
    instruction: PartiallyDecodedInstruction,
    index: number,
  ): PoolEvent | null {
    try {
      const data = base58.decode(instruction.data as string);
      const instructionType = this.getPoolAction(data);

      if (!instructionType) return null;

      const transfers = processTransferInnerInstruction(
        this.txWithMeta,
        index,
        this.splTokenMap,
        this.splDecimalsMap,
        ["mintTo", "burn"],
      );

      switch (instructionType) {
        case "CREATE":
          return this.parseCreateEvent(instruction, index, data, transfers);
        case "ADD":
          return this.parseAddLiquidityEvent(
            instruction,
            index,
            data,
            transfers,
          );
        case "REMOVE":
          return this.parseRemoveLiquidityEvent(
            instruction,
            index,
            data,
            transfers,
          );
      }

      return null;
    } catch (error) {
      console.error("parseRaydiumInstruction error:", error);
      return null;
    }
  }

  private parseCreateEvent(
    instruction: PartiallyDecodedInstruction,
    index: number,
    data: any,
    transfers: TransferData[],
  ): PoolEvent {
    const [token0, token1] = getLPTransfers(transfers);
    const lpToken = transfers.find((it) => it.type == "mintTo");
    const programId = instruction.programId.toBase58();
    return {
      ...getPoolEventBase("CREATE", this.txWithMeta, programId),
      idx: index.toString(),
      poolId: instruction.accounts[3].toString(),
      poolLpMint: lpToken?.info.mint || instruction.accounts[6].toString(),
      token0Mint: token0?.info.mint,
      token1Mint: token1?.info.mint,
      token0Amount:
        token0?.info.tokenAmount.uiAmount ||
        convertToUiAmount(
          data.readBigUInt64LE(8),
          this.splDecimalsMap.get(token0?.info.mint),
        ),
      token1Amount:
        token1?.info.tokenAmount.uiAmount ||
        convertToUiAmount(
          data.readBigUInt64LE(16),
          this.splDecimalsMap.get(token1?.info.mint),
        ),
      lpAmount: lpToken?.info.tokenAmount.uiAmount || 0,
    };
  }

  private parseAddLiquidityEvent(
    instruction: PartiallyDecodedInstruction,
    index: number,
    data: any,
    transfers: TransferData[],
  ): PoolEvent | null {
    const [token0, token1] = getLPTransfers(transfers);
    const lpToken = transfers.find((it) => it.type == "mintTo");
    const programId = instruction.programId.toBase58();
    if (transfers.length >= 2) {
      return {
        ...getPoolEventBase("ADD", this.txWithMeta, programId),
        idx: index.toString(),
        poolId: instruction.accounts[2].toString(),
        poolLpMint: instruction.accounts[12].toString(),
        token0Mint: token0?.info.mint,
        token1Mint: token1?.info.mint,
        token0Amount:
          token0?.info.tokenAmount.uiAmount ||
          convertToUiAmount(
            data.readBigUInt64LE(16),
            this.splDecimalsMap.get(token0?.info.mint),
          ),
        token1Amount:
          token1?.info.tokenAmount.uiAmount ||
          convertToUiAmount(
            data.readBigUInt64LE(24),
            this.splDecimalsMap.get(token1?.info.mint),
          ),
        lpAmount:
          lpToken?.info.tokenAmount.uiAmount ||
          convertToUiAmount(data.readBigUInt64LE(8)),
      };
    }
    return null;
  }

  private parseRemoveLiquidityEvent(
    instruction: PartiallyDecodedInstruction,
    index: number,
    data: any,
    transfers: TransferData[],
  ): PoolEvent {
    const [token0, token1] = getLPTransfers(transfers);
    const lpToken = transfers.find((it) => it.type == "burn");
    const programId = instruction.programId.toBase58();
    return {
      ...getPoolEventBase("REMOVE", this.txWithMeta, programId),
      idx: index.toString(),
      poolId: instruction.accounts[2].toString(),
      poolLpMint: instruction.accounts[12].toString(),
      token0Mint: token0?.info.mint,
      token1Mint: token1?.info.mint,
      token0Amount:
        token0?.info.tokenAmount.uiAmount ||
        convertToUiAmount(
          data.readBigUInt64LE(16),
          this.splDecimalsMap.get(token0?.info.mint),
        ),
      token1Amount:
        token1?.info.tokenAmount.uiAmount ||
        convertToUiAmount(
          data.readBigUInt64LE(24),
          this.splDecimalsMap.get(token1?.info.mint),
        ),
      lpAmount:
        lpToken?.info.tokenAmount.uiAmount ||
        convertToUiAmount(data.readBigUInt64LE(8).toString()),
    };
  }
}
