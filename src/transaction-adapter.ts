import { MessageV0, PublicKey, TokenAmount } from '@solana/web3.js';
import base58 from 'bs58';
import { SPL_TOKEN_INSTRUCTION_TYPES, TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID, TOKENS } from './constants';
import { BalanceChange, convertToUiAmount, ParseConfig, PoolEventType, SolanaTransaction, TokenInfo } from './types';
import { decodeInstructionData, getInstructionData, getProgramName, getPubkeyString } from './utils';

/**
 * Adapter for unified transaction data access
 */
export class TransactionAdapter {
  public readonly accountKeys: string[] = [];
  public readonly splTokenMap: Map<string, TokenInfo> = new Map();
  public readonly splDecimalsMap: Map<string, number> = new Map();

  constructor(
    private tx: SolanaTransaction,
    public config?: ParseConfig
  ) {
    this.accountKeys = this.extractAccountKeys();
    this.extractTokenInfo();
  }

  get txMessage() {
    return this.tx.transaction.message as any;
  }

  get isMessageV0() {
    const message = this.tx.transaction.message;
    return (
      message instanceof MessageV0 ||
      ('header' in message && 'staticAccountKeys' in message && 'compiledInstructions' in message)
    );
  }
  /**
   * Get transaction slot
   */
  get slot() {
    return this.tx.slot;
  }

  get version() {
    return this.tx.version;
  }

  /**
   * Get transaction block time
   */
  get blockTime() {
    return this.tx.blockTime || 0;
  }

  /**
   * Get transaction signature
   */
  get signature() {
    return getPubkeyString(this.tx.transaction.signatures[0]);
  }

  /**
   * Get all instructions
   */
  get instructions() {
    return this.txMessage.instructions || this.txMessage.compiledInstructions;
  }

  /**
   * Get inner instructions
   */
  get innerInstructions() {
    return this.tx.meta?.innerInstructions;
  }

  /**
   * Get pre balances
   */
  get preBalances() {
    return this.tx.meta?.preBalances;
  }

  /**
   * Get post balances
   */
  get postBalances() {
    return this.tx.meta?.postBalances;
  }

  /**
   * Get pre token balances
   */
  get preTokenBalances() {
    return this.tx.meta?.preTokenBalances;
  }

  /**
   * Get post token balances
   */
  get postTokenBalances() {
    return this.tx.meta?.postTokenBalances;
  }

  /**
   * Get first signer account
   */
  get signer(): string {
    return this.getAccountKey(0);
  }

  /**
   * Get Transaction signers
   * @returns Array of signer accounts as strings
   */
  get signers(): string[] {
    const message = this.tx.transaction.message;
    if (message instanceof MessageV0 || 'header' in message) {
      const numRequiredSignatures = message.header.numRequiredSignatures || 1;
      return this.accountKeys.slice(0, numRequiredSignatures);
    } else if (this.version == 0 || this.version == 'legacy') {
      const keys = this.getAccountKeys(this.txMessage.accountKeys.filter((it: any) => it.signer == true));
      return keys.length > 0 ? keys : [this.signer];
    }
    return [this.signer];
  }

  get fee(): TokenAmount {
    const fee = this.tx.meta?.fee || 0;
    return {
      amount: fee.toString(),
      uiAmount: convertToUiAmount(fee.toString(), 9),
      decimals: 9,
    };
  }

  extractAccountKeys() {
    if (this.isMessageV0) {
      const keys = this.txMessage.staticAccountKeys.map((it: any) => getPubkeyString(it)) || [];
      const key2 = this.tx.meta?.loadedAddresses?.writable.map((it) => getPubkeyString(it)) || [];
      const key3 = this.tx.meta?.loadedAddresses?.readonly.map((it) => getPubkeyString(it)) || [];
      return [...keys, ...key2, ...key3];
    } else if (this.version == 0) {
      // parsed transaction
      const keys = this.getAccountKeys(this.txMessage.accountKeys) || [];
      const key2 = this.getAccountKeys(this.tx.meta?.loadedAddresses?.writable ?? []) || [];
      const key3 = this.getAccountKeys(this.tx.meta?.loadedAddresses?.readonly ?? []) || [];
      return [...keys, ...key2, ...key3];
    } else {
      const meta = this.tx.meta as any;
      const keys = this.getAccountKeys(this.txMessage.accountKeys) || [];
      const key2 = this.getAccountKeys(meta?.loadedWritableAddresses ?? []) || [];
      const key3 = this.getAccountKeys(meta?.loadedReadonlyAddresses ?? []) || [];
      return [...keys, ...key2, ...key3];
    }
  }

  get addressTableLookups() {
    return this.txMessage.addressTableLookups || [];
  }

  get addressTableLookupKeys() {
    return this.getAccountKeys(this.addressTableLookups.map((it: any) => it.accountKey)) || [];
  }

  /**
   * Get unified instruction data
   */
  getInstruction(instruction: any) {
    const isParsed = !this.isCompiledInstruction(instruction);
    return {
      programId: isParsed ? getPubkeyString(instruction.programId) : this.accountKeys[instruction.programIdIndex],
      accounts: this.getInstructionAccounts(instruction),
      data: 'data' in instruction ? decodeInstructionData(instruction.data) : '',
      parsed: 'parsed' in instruction ? instruction.parsed : undefined,
      program: instruction.program || '',
    };
  }

  getInnerInstruction(outerIndex: number, innterIndex: number) {
    return this.innerInstructions?.find((it) => it.index == outerIndex)?.instructions[innterIndex];
  }

  getAccountKeys(accounts: any[]): string[] {
    return accounts && accounts.length
      ? accounts.map((it: any) => {
          if (it instanceof PublicKey) return it.toBase58();
          if (typeof it == 'string') return it;
          if (typeof it == 'number') return this.accountKeys[it];
          if ('pubkey' in it) return getPubkeyString(it.pubkey);
          if (it instanceof Buffer) return base58.encode(it);
          if ('type' in it && it.type == 'Buffer') return base58.encode(it.data);
          if (Array.isArray(it)) return base58.encode(it);
          return it;
        })
      : [];
  }

  getInstructionAccounts(instruction: any): string[] {
    const accounts = instruction.accounts || instruction.accountKeyIndexes;
    if (!accounts) return [];
    if (typeof accounts == 'string') {
      return this.getAccountKeys(Array.from(base58.decode(accounts)));
    }
    if (accounts instanceof Buffer) {
      return this.getAccountKeys(Array.from(accounts));
    }
    if ('type' in accounts && accounts.type == 'Buffer') {
      return this.getAccountKeys(Array.from(accounts.data));
    }
    return this.getAccountKeys(accounts);
  }

  /**
   * Check if instruction is Compiled
   */
  isCompiledInstruction(instruction: any): boolean {
    return 'programIdIndex' in instruction && !('parsed' in instruction);
  }

  /**
   * Get instruction type
   * returns string name if instruction Parsed, e.g. 'transfer';
   * returns number if instruction is Compiled, e.g. 3
   */
  getInstructionType(instruction: any): string | undefined {
    if ('parsed' in instruction && instruction.parsed) {
      return instruction.parsed.type; // string name, e.g. 'transfer'
    }

    // For compiled instructions, try to decode type from data
    const data = getInstructionData(instruction);
    return data.length > 0 ? data[0].toString() : undefined; // number, e.g. 3
  }

  /**
   * Get account key by index
   */
  getAccountKey(index: number): string {
    return this.accountKeys[index];
  }

  getAccountIndex(address: string): number {
    return this.accountKeys.findIndex((it) => it == address);
  }

  /**
   * Get token account owner
   */
  getTokenAccountOwner(accountKey: string): string | undefined {
    const accountInfo = this.tx.meta?.postTokenBalances?.find(
      (balance) => this.accountKeys[balance.accountIndex] === accountKey
    );

    if (accountInfo) {
      return accountInfo.owner;
    }

    return undefined;
  }

  getAccountBalance(accountKeys: string[]): (TokenAmount | undefined)[] {
    return accountKeys.map((accountKey) => {
      if (accountKey == '') return undefined;
      const index = this.accountKeys.findIndex((it) => it == accountKey);
      if (index == -1) return undefined;
      const amount = this.tx.meta?.postBalances[index] || 0;
      return {
        amount: amount.toString(),
        uiAmount: convertToUiAmount(amount.toString()),
        decimals: 9,
      };
    });
  }

  getAccountPreBalance(accountKeys: string[]): (TokenAmount | undefined)[] {
    return accountKeys.map((accountKey) => {
      if (accountKey == '') return undefined;
      const index = this.accountKeys.findIndex((it) => it == accountKey);
      if (index == -1) return undefined;
      const amount = this.tx.meta?.preBalances[index] || 0;
      return {
        amount: amount.toString(),
        uiAmount: convertToUiAmount(amount.toString()),
        decimals: 9,
      };
    });
  }

  getTokenAccountBalance(accountKeys: string[]): (TokenAmount | undefined)[] {
    return accountKeys.map((accountKey) =>
      accountKey == ''
        ? undefined
        : this.tx.meta?.postTokenBalances?.find((balance) => this.accountKeys[balance.accountIndex] === accountKey)
            ?.uiTokenAmount
    );
  }

  getTokenAccountPreBalance(accountKeys: string[]): (TokenAmount | undefined)[] {
    return accountKeys.map((accountKey) =>
      accountKey == ''
        ? undefined
        : this.tx.meta?.preTokenBalances?.find((balance) => this.accountKeys[balance.accountIndex] === accountKey)
            ?.uiTokenAmount
    );
  }

  private readonly defaultSolInfo: TokenInfo = {
    mint: TOKENS.SOL,
    amount: 0,
    amountRaw: '0',
    decimals: 9,
  };

  /**
   * Check if token is supported
   */
  isSupportedToken(mint: string): boolean {
    return Object.values(TOKENS).includes(mint);
  }

  /**
   * Get program ID from instruction
   */
  getInstructionProgramId(instruction: any): string {
    const ix = this.getInstruction(instruction);
    return ix.programId;
  }

  getTokenDecimals(mint: string): number {
    return this.splDecimalsMap.get(mint) || 0;
  }

  /**
   * Create base pool event data
   * @param type - Type of pool event
   * @param tx - The parsed transaction with metadata
   * @param programId - The program ID associated with the event
   * @returns Base pool event object
   */
  getPoolEventBase = (type: PoolEventType, programId: string) => ({
    user: this.signer,
    type,
    programId,
    amm: getProgramName(programId),
    slot: this.slot,
    timestamp: this.blockTime,
    signature: this.signature,
  });

  /**
   * Extract token information from transaction
   */
  private extractTokenInfo() {
    // Process token balances
    this.extractTokenBalances();

    // Process transfer instructions for additional token info
    this.extractTokenFromInstructions();

    // Add SOL token info if not exists
    if (!this.splTokenMap.has(TOKENS.SOL)) {
      this.splTokenMap.set(TOKENS.SOL, this.defaultSolInfo);
    }

    if (!this.splDecimalsMap.has(TOKENS.SOL)) {
      this.splDecimalsMap.set(TOKENS.SOL, this.defaultSolInfo.decimals);
    }
  }

  /**
   * Extract token balances from pre and post states
   */
  private extractTokenBalances() {
    const postBalances = this.postTokenBalances || [];
    postBalances.forEach((balance) => {
      if (!balance.mint) return;

      const accountKey = this.accountKeys[balance.accountIndex];
      if (!this.splTokenMap.has(accountKey)) {
        const tokenInfo: TokenInfo = {
          mint: balance.mint,
          amount: balance.uiTokenAmount.uiAmount || 0,
          amountRaw: balance.uiTokenAmount.amount,
          decimals: balance.uiTokenAmount.decimals,
        };
        this.splTokenMap.set(accountKey, tokenInfo);
      }

      if (!this.splDecimalsMap.has(balance.mint)) {
        this.splDecimalsMap.set(balance.mint, balance.uiTokenAmount.decimals);
      }
    });
  }

  /**
   * Extract token info from transfer instructions
   */
  private extractTokenFromInstructions() {
    this.instructions.forEach((ix: any) => {
      if (this.isCompiledInstruction(ix)) {
        this.extractFromCompiledTransfer(ix);
      } else {
        this.extractFromParsedTransfer(ix);
      }
    });

    // Process inner instructions
    this.innerInstructions?.forEach((inner) => {
      inner.instructions.forEach((ix) => {
        if (this.isCompiledInstruction(ix)) {
          this.extractFromCompiledTransfer(ix);
        } else {
          this.extractFromParsedTransfer(ix);
        }
      });
    });
  }

  private setTokenInfo(source?: string, destination?: string, mint?: string, decimals?: number) {
    if (source) {
      if (this.splTokenMap.has(source) && mint && decimals) {
        this.splTokenMap.set(source, { mint, amount: 0, amountRaw: '0', decimals });
      } else if (!this.splTokenMap.has(source)) {
        this.splTokenMap.set(source, {
          mint: mint || TOKENS.SOL,
          amount: 0,
          amountRaw: '0',
          decimals: decimals || 9,
        });
      }
    }

    if (destination) {
      if (this.splTokenMap.has(destination) && mint && decimals) {
        this.splTokenMap.set(destination, { mint, amount: 0, amountRaw: '0', decimals });
      } else if (!this.splTokenMap.has(destination)) {
        this.splTokenMap.set(destination, {
          mint: mint || TOKENS.SOL,
          amount: 0,
          amountRaw: '0',
          decimals: decimals || 9,
        });
      }
    }

    if (mint && decimals && !this.splDecimalsMap.has(mint)) {
      this.splDecimalsMap.set(mint, decimals);
    }
  }

  /**
   * Extract token info from parsed transfer instruction
   */
  private extractFromParsedTransfer(ix: any) {
    if (!ix.parsed || !ix.program) return;
    if (ix.programId != TOKEN_PROGRAM_ID && ix.programId != TOKEN_2022_PROGRAM_ID) return;

    const { source, destination, mint, decimals } = ix.parsed?.info || {};
    if (!source && !destination) return;

    this.setTokenInfo(source, destination, mint, decimals);
  }

  /**
   * Extract token info from compiled transfer instruction
   */
  private extractFromCompiledTransfer(ix: any) {
    const decoded = getInstructionData(ix);
    if (!decoded) return;
    const programId = this.accountKeys[ix.programIdIndex];
    if (programId != TOKEN_PROGRAM_ID && programId != TOKEN_2022_PROGRAM_ID) return;

    let source, destination, mint, decimals;
    // const amount = decoded.readBigUInt64LE(1);
    const accounts = ix.accounts as number[];
    if (!accounts) return;
    switch (decoded[0]) {
      case SPL_TOKEN_INSTRUCTION_TYPES.Transfer:
        if (accounts.length < 3) return;
        [source, destination] = [this.accountKeys[accounts[0]], this.accountKeys[accounts[1]]]; // source, destination,amount, authority
        break;
      case SPL_TOKEN_INSTRUCTION_TYPES.TransferChecked:
        if (accounts.length < 4) return;
        [source, mint, destination] = [
          this.accountKeys[accounts[0]],
          this.accountKeys[accounts[1]],
          this.accountKeys[accounts[2]],
        ]; // source, mint, destination, authority,amount,decimals
        decimals = decoded.readUint8(9);
        break;
      case SPL_TOKEN_INSTRUCTION_TYPES.InitializeMint:
        if (accounts.length < 2) return;
        [mint, destination] = [this.accountKeys[accounts[0]], this.accountKeys[accounts[1]]]; // mint, decimals, authority,freezeAuthority
        break;
      case SPL_TOKEN_INSTRUCTION_TYPES.MintTo:
        if (accounts.length < 2) return;
        [mint, destination] = [this.accountKeys[accounts[0]], this.accountKeys[accounts[1]]]; // mint, destination, authority, amount
        break;
      case SPL_TOKEN_INSTRUCTION_TYPES.MintToChecked:
        if (accounts.length < 3) return;
        [mint, destination] = [this.accountKeys[accounts[0]], this.accountKeys[accounts[1]]]; // mint, destination, authority, amount,decimals
        decimals = decoded.readUint8(9);
        break;
      case SPL_TOKEN_INSTRUCTION_TYPES.Burn:
        if (accounts.length < 2) return;
        [source, mint] = [this.accountKeys[accounts[0]], this.accountKeys[accounts[1]]]; // account, mint, authority, amount
        break;
      case SPL_TOKEN_INSTRUCTION_TYPES.BurnChecked:
        if (accounts.length < 3) return;
        [source, mint] = [this.accountKeys[accounts[0]], this.accountKeys[accounts[1]]]; // account, mint, authority, amount,decimals
        decimals = decoded.readUint8(9);
        break;
      case SPL_TOKEN_INSTRUCTION_TYPES.CloseAccount:
        if (accounts.length < 3) return;
        [source, destination] = [this.accountKeys[accounts[0]], this.accountKeys[accounts[1]]]; // account, destination, authority
        break;
    }
    this.setTokenInfo(source, destination, mint, decimals);
  }

  /**
   * Get SOL balance changes for all accounts in the transaction
   * @returns Map<string, {pre: TokenAmount; post: TokenAmount; change: TokenAmount}> - A map where:
   *   - key: account address
   *   - value: Object containing:
   *     - pre: TokenAmount for pre-transaction balance, containing:
   *       - amount: balance in raw lamports
   *       - uiAmount: balance in SOL
   *       - decimals: number of decimal places (9 for SOL)
   *     - post: TokenAmount for post-transaction balance
   *     - change: TokenAmount for net balance change
   */
  getAccountSolBalanceChanges(isOwner = false): Map<string, BalanceChange> {
    const changes = new Map<string, BalanceChange>();

    this.accountKeys.forEach((key, index) => {
      const accountKey = isOwner ? this.getTokenAccountOwner(key) || key : key;

      const preBalance = this.preBalances?.[index] || 0;
      const postBalance = this.postBalances?.[index] || 0;
      const change = postBalance - preBalance;

      if (change !== 0) {
        changes.set(accountKey, {
          pre: {
            amount: preBalance.toString(),
            uiAmount: convertToUiAmount(preBalance.toString(), 9),
            decimals: 9,
          },
          post: {
            amount: postBalance.toString(),
            uiAmount: convertToUiAmount(postBalance.toString(), 9),
            decimals: 9,
          },
          change: {
            amount: change.toString(),
            uiAmount: convertToUiAmount(change.toString(), 9),
            decimals: 9,
          },
        });
      }
    });

    return changes;
  }

  /**
   * Get token balance changes for all accounts in the transaction
   * @returns Map<string, Map<string, {pre: TokenAmount; post: TokenAmount; change: TokenAmount}>> - A nested map where:
   *   - outer key: account address
   *   - inner key: token mint address
   *   - value: Object containing:
   *     - pre: TokenAmount for pre-transaction balance
   *     - post: TokenAmount for post-transaction balance
   *     - change: TokenAmount for net balance change
   */
  getAccountTokenBalanceChanges(isOwner = false): Map<string, Map<string, BalanceChange>> {
    const changes = new Map<string, Map<string, BalanceChange>>();

    // Process pre token balances
    this.preTokenBalances?.forEach((balance) => {
      const key = this.accountKeys[balance.accountIndex];
      const accountKey = isOwner ? this.getTokenAccountOwner(key) || key : key;

      const mint = balance.mint;
      if (!mint) return;

      if (!changes.has(accountKey)) {
        changes.set(accountKey, new Map());
      }

      const accountChanges = changes.get(accountKey)!;
      accountChanges.set(mint, {
        pre: balance.uiTokenAmount,
        post: {
          amount: '0',
          uiAmount: 0,
          decimals: balance.uiTokenAmount.decimals,
        },
        change: {
          amount: '0',
          uiAmount: 0,
          decimals: balance.uiTokenAmount.decimals,
        },
      });
    });

    // Process post token balances and calculate changes
    this.postTokenBalances?.forEach((balance) => {
      const key = this.accountKeys[balance.accountIndex];
      const accountKey = isOwner ? this.getTokenAccountOwner(key) || key : key;
      const mint = balance.mint;

      if (!mint) return;

      if (!changes.has(accountKey)) {
        changes.set(accountKey, new Map());
      }

      const accountChanges = changes.get(accountKey)!;
      const existingChange = accountChanges.get(mint);

      if (existingChange) {
        // Update post balance and calculate change
        existingChange.post = balance.uiTokenAmount;
        const amountChange = BigInt(balance.uiTokenAmount.amount) - BigInt(existingChange.pre.amount);
        const uiAmountChange = (balance.uiTokenAmount.uiAmount || 0) - (existingChange.pre.uiAmount || 0);

        existingChange.change = {
          amount: amountChange.toString(),
          uiAmount: uiAmountChange,
          decimals: balance.uiTokenAmount.decimals,
        };

        if (amountChange === 0n) {
          accountChanges.delete(mint);
          if (accountChanges.size === 0) {
            changes.delete(accountKey);
          }
        }
      } else {
        // If no pre-balance exists, set pre to zero
        accountChanges.set(mint, {
          pre: {
            amount: '0',
            uiAmount: 0,
            decimals: balance.uiTokenAmount.decimals,
          },
          post: balance.uiTokenAmount,
          change: balance.uiTokenAmount,
        });
      }
    });

    return changes;
  }
}
