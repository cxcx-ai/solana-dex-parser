# Solana Dex Transaction Parser

A TypeScript library for parsing Solana DEX swap transactions. Supports multiple DEX protocols including Jupiter, Raydium, Meteora, PumpFun, BoopFun and Moonit.

## Future Development

If you find this project useful, consider donating at 

**SOL**: 879mxY5QKJH1J8x8suzB3rrV2YPVsoauaSJ7nT85YLU7

to support future development. Thanks!

## Features

- Parse **Swap** transactions from multiple DEX protocols
  - Support for transfer and transfer-check instructions
  - Detailed swap information extraction
  - Raw amount fields support (`amountRaw`, `token0AmountRaw`, `token1AmountRaw`)
  - Token account balance tracking (pre and post balances)
  - Destination owner field support
  - Support for multiple transaction formats:
    - `getTransaction`/`getParsedTransaction`
    - Transactions of `getBlock`/`getParsedBlock`
    - **gRPC** raw data support
- Parsing methods:
  - Pumpfun and Jupiter: parsing the event data
  - Raydium, Orca, and Meteora: parsing Transfer and TransferChecked methods of the token program
  - Raydium v4 Logs decoder (decode ray_log)
  - Moonit: parsing the instruction data of the Trade instruction
- Parse **Liquidity** transactions (create, add, remove)
  - Raydium V4
  - Raydium CL
  - Raydium CPMM
  - Raydium Launchpad (including events parsing)
  - Meteora DLMM
  - Meteora Pools
  - Orca
  - Pumpfun AMM (Pumpswap)
- Transfer parser support for non-trade and non-liquidity transactions
- Comprehensive test coverage
- Parsing result support moreEvents (Pumpfun/Pumpswap/RaydiumLaunchpad/Bootfun)

## Supported DEX Protocols

- Jupiter (Aggregator, DCA, VA, LimitOrderV2)
- Raydium (V4, Route, CPMM, ConcentratedLiquidity, Lauchpad)
- Meteora (DLMM and Pools)
- PumpFun
- PumpFun AMM (Pumpswap)
- Moonit
- Orca
- Sanctum
- Phoenix
- Lifinity
- OKX Dex
- BoopFun
  
## Supported Trading Bot Programs
- BananaGun
- Mintech
- Bloom
- Maestro
- Nova
- Apepro


## Installation

```bash
yarn add solana-dex-parser
```

## Usage

### Configuration Options

The DexParser class supports the following configuration:

```typescript
interface ParseConfig {
  tryUnknowDEX?: boolean;   // Try to parse unknown DEX programs，results may be inaccurate (default: true)
  programIds?: string[];    // Only parse specific program IDs
  ignoreProgramIds?: string[]; // Ignore specific program IDs
}
```


### Parse All (Trades, Liquidity and Transfers)
Parse all types of transactions including DEX trades, liquidity operations, and token transfers.

```typescript
import { Connection } from '@solana/web3.js';
import { DexParser } from 'solana-dex-parser';

async function parseAll() {
  const connection = new Connection('https://api.mainnet-beta.solana.com');
  const signature = 'your-transaction-signature';
  
  const tx = await connection.getTransaction(signature, {
    maxSupportedTransactionVersion: 0,
  });

  // Parse all types of transactions in one call
  const parser = new DexParser();
  const result = parser.parseAll(tx);

  console.log({
    trades: result.trades,         // DEX trading activities
    liquidities: result.liquidities, // Liquidity operations
    transfers: result.transfers,     // Regular token transfers (non-DEX)
    state: result.state,          // Parsing state
    msg: result.msg,             // Error message if any
  });
}

```

### 1. Basic Usage > Swap (Buy and Sell)

```typescript
import { Connection } from '@solana/web3.js';
import { DexParser } from 'solana-dex-parser';

async function parseSwap() {
  // Setup connection
  const connection = new Connection('https://api.mainnet-beta.solana.com');
  
  // Get transaction (supports both parsed and compiled transactions)
  const signature = 'your-transaction-signature';
  const tx = await connection.getTransaction(signature, {
    maxSupportedTransactionVersion: 0,
  });
  // Or use getParsedTransaction
  // const tx = await connection.getParsedTransaction(signature);

  // Parse trades
  const parser = new DexParser();
  const trades = await parser.parseTrades(tx);
  console.log("trades:", trades);
}

```

#### Trades Output

```
 [
    {
        "type": "BUY",
        "inputToken": {
            "mint": "So11111111111111111111111111111111111111112",
            "amount": 0.099009801,
            "amountRaw": "99009801",
            "decimals": 9,
            "source": "5o5VW6zPTwTk2j9fkQJ7ueHL4rcEtzDhcGafsxE71AyB",
            "destination": "8Wyi1ikEcLsHKA7daP1JmUrAyEc96jLn3tzLnuMwN5nH",
            "destinationBalance": {
                "amount": "24617904743",
                "uiAmount": 24.617904743,
                "decimals": 9
            },
            "destinationPreBalance": {
                "amount": "24518894942",
                "uiAmount": 24.518894942,
                "decimals": 9
            },
            "sourceBalance": {
                "amount": "266958890",
                "uiAmount": 0.26695889,
                "decimals": 9
            },
            "sourcePreBalance": {
                "amount": "366963789",
                "uiAmount": 0.366963789,
                "decimals": 9
            }
        },
        "outputToken": {
            "mint": "B3Pza9YDAaTrMtxR5JeFFEGKSdJSyNLnj49nSYHDpump",
            "amount": 1070376.821916,
            "amountRaw": "1070376821916",
            "decimals": 6,
            "authority": "8Wyi1ikEcLsHKA7daP1JmUrAyEc96jLn3tzLnuMwN5nH",
            "source": "E7v5iScw1vUupebaDd7grmjVrSgsgdhVpm4w2bbDxbPn",
            "destination": "3QvZvTSWt4gS1Vyiz1zR3afJjETzaev9JKJ3J356Sk1b",
            "destinationOwner": "5o5VW6zPTwTk2j9fkQJ7ueHL4rcEtzDhcGafsxE71AyB",
            "destinationBalance": {
                "amount": "1383049394757",
                "decimals": 6,
                "uiAmount": 1383049.394757,
                "uiAmountString": "1383049.394757"
            },
            "destinationPreBalance": {
                "amount": "312672572841",
                "decimals": 6,
                "uiAmount": 312672.572841,
                "uiAmountString": "312672.572841"
            },
            "sourceBalance": {
                "amount": "516380474293765",
                "decimals": 6,
                "uiAmount": 516380474.293765,
                "uiAmountString": "516380474.293765"
            },
            "sourcePreBalance": {
                "amount": "517450851115681",
                "decimals": 6,
                "uiAmount": 517450851.115681,
                "uiAmountString": "517450851.115681"
            }
        },
        "user": "5o5VW6zPTwTk2j9fkQJ7ueHL4rcEtzDhcGafsxE71AyB",
        "programId": "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P",
        "amm": "Pumpfun",
        "route": "OKX",
        "slot": 324037348,
        "timestamp": 1740898227,
        "signature": "648cwSysqKXnb3XLPy577Lu4oBk7jimaY8p95JGfS9QUNabYar5pzfcRdu518TWw3dbopquJnMne9qx22xuf8xqn",
        "idx": "7-5"
    }
]
```

### Block Transaction Parsing

```typescript
import { Connection } from '@solana/web3.js';
import { DexParser } from 'solana-dex-parser';

// Works with both getBlock and getParsedBlock
async function parseBlockTransactions() {
  const connection = new Connection('https://api.mainnet-beta.solana.com');
  const slot = 'your-block-slot';
  
 try {
    const block = await connection.getBlock(slot, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0,
      transactionDetails: 'full',
    });
    // Or use getParsedBlock
    // const block = await connection.getParsedBlock(slot,{
    //   commitment: 'confirmed',
    //   maxSupportedTransactionVersion: 0,
    //   transactionDetails: 'full',
    // });

    const parser = new DexParser();
    const trades = [];
    const liquidityEvents = [];

    for (const tx of block.transactions) {
      if (tx.meta?.err) continue;

      const txData = {
        ...tx!,
        slot: block.parentSlot + 1,
        blockTime: block.blockTime
      };

      trades.push(...parser.parseTrades(txData));
      liquidityEvents.push(...parser.parseLiquidity(txData));
    }

    return { trades, liquidityEvents };
  } catch (error) {
    console.error('Failed to parse block:', error);
    throw error;
  }
}
```

### 2. Liquidity Events Parsing

```typescript
import { Connection } from '@solana/web3.js';
import { DexParser } from 'solana-dex-parser';

async function parseLiquidityEvents() {
  const connection = new Connection('https://api.mainnet-beta.solana.com');
  const signature = 'your-transaction-signature';
  
  // Works with both parsed and unparsed transactions
  const tx = await connection.getTransaction(signature, {
    maxSupportedTransactionVersion: 0,
  });
 
  const parser = new DexParser();
  const events = await parser.parseLiquidity(tx);
  console.log("events:", events);
}

```

#### 2.1 Output - pumpfun events
```
 [
      {
        type: 'CREATE',
        data: {
          name: 'Central African Republic Meme',
          symbol: 'CAR',
          uri: 'https://ipfs.io/ipfs/QmTWn4hHDQRPH1e9qtn3cYVoNr9UDUVT2e78XWDsPSXDmj',
          mint: '7oBYdEhV4GkXC19ZfgAvXpJWp2Rn9pm1Bx2cVNxFpump',
          bondingCurve: 'AoUhiHypP1mMzgRjV7FMHpbQTe6sMZ8PTWt4MBABNUky',
          user: '121ftnYRm3WJmDHCWrazzRoyZAzZQ4xc5XD7dp3sfpfo'
        },
        slot: 319598427,
        timestamp: 1739140071,
        signature: '3EopoRXpPKHUwZcfGpV4yp7v5kTyQSdKHMB88oM7BqoUqaaCgst93oNLHTNiDg2XzW8j1KRfu2e6tVMxb3czAPMN',
        idx: '2-14'
      },
      {
        type: 'COMPLETE',
        data: {
          user: '121ftnYRm3WJmDHCWrazzRoyZAzZQ4xc5XD7dp3sfpfo',
          mint: '7oBYdEhV4GkXC19ZfgAvXpJWp2Rn9pm1Bx2cVNxFpump',
          bondingCurve: 'AoUhiHypP1mMzgRjV7FMHpbQTe6sMZ8PTWt4MBABNUky',
          timestamp: 1739140071n
        },
        slot: 319598427,
        timestamp: 1739140071,
        signature: '3EopoRXpPKHUwZcfGpV4yp7v5kTyQSdKHMB88oM7BqoUqaaCgst93oNLHTNiDg2XzW8j1KRfu2e6tVMxb3czAPMN',
        idx: '4-0'
      },
      {
        type: 'TRADE',
        data: {
          mint: '7oBYdEhV4GkXC19ZfgAvXpJWp2Rn9pm1Bx2cVNxFpump',
          solAmount: 85.005359057,
          tokenAmount: 793100000,
          isBuy: true,
          user: '121ftnYRm3WJmDHCWrazzRoyZAzZQ4xc5XD7dp3sfpfo',
          timestamp: 1739140071n,
          virtualSolReserves: 115.005359057,
          virtualTokenReserves: 279900000
        },
        slot: 319598427,
        timestamp: 1739140071,
        signature: '3EopoRXpPKHUwZcfGpV4yp7v5kTyQSdKHMB88oM7BqoUqaaCgst93oNLHTNiDg2XzW8j1KRfu2e6tVMxb3czAPMN',
        idx: '4-4'
      }
    ]
```
#### 2.2 Output - Meteora
```
 [
      {
        user: 'KYaNZJsLWbgdc22JqM3x6FLBTz5JVZiwNdByFPoPHLL',
        type: 'REMOVE',
        programId: 'LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo',
        amm: 'MeteoraDLMM',
        slot: 322956851,
        timestamp: 1740470617,
        signature: 'Cj2c5dEmHvmMWwkMa4QMauQE6aBbyRz5mn4fEYARez2bHqukkJ3nbYAdst9ixQsAMh9G9tUNntAxEXpgrz5T1Qi',
        idx: '6',
        poolId: 'BoeMUkCLHchTD31HdXsbDExuZZfcUppSLpYtV3LZTH6U',
        poolLpMint: 'BoeMUkCLHchTD31HdXsbDExuZZfcUppSLpYtV3LZTH6U',
        token0Mint: 'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn',
        token1Mint: 'So11111111111111111111111111111111111111112',
        token0Amount: 18.504862033,
        token1Amount: 6.074752463
      }
    ]
```

### 3. More Use Cases

#### 3.1 Extracting Pumpfun events (create/trade/complete):

```typescript
import { PumpfunEventParser,TransactionAdapter } from 'solana-dex-parser';
  
// Setup connection
const connection = new Connection('https://api.mainnet-beta.solana.com');
// Get transaction
const signature = 'your-transaction-signature';
const tx = await connection.getParsedTransaction(signature, {
  maxSupportedTransactionVersion: 0,
});

const eventParser = new PumpfunEventParser(new TransactionAdapter(tx));
const events = eventParser.processEvents(); // PumpfunEvent[]

console.log(events);
```

```typescript
export interface PumpfunEvent {
  type: "TRADE" | "CREATE" | "COMPLETE";
  data: PumpfunTradeEvent | PumpfunCreateEvent | PumpfunCompleteEvent;
  slot: number;
  timestamp: number;
  signature: string;
}
```

#### 3.2 Raydium v4 logs decode:

```typescript
import { decodeRaydiumLog, LogType, parseRaydiumSwapLog } from 'solana-dex-parser';

  const log = decodeRaydiumLog("ray_log: A0lQ1uGPAAAAWnKACwAAAAABAAAAAAAAACRBWYc/AgAANLV+oBcAAACInZmY0pIAAO8MAhcAAAAA");
  if (log) {
    if (log.logType == LogType.SwapBaseIn || log.logType == LogType.SwapBaseOut) {
      const swap = parseRaydiumSwapLog(log as any);
      console.log('swap', swap); // buy and sell 
    }
    else {
      console.log('log', log); // add/remove liquidity
    }
  }

  // output
  swap {
      type: 'Buy',
      mode: 'Exact Input',
      inputAmount: 617969242185n,
      outputAmount: 386010351n,
      slippageProtection: 192967258n
    }
```

#### 3.3 Raydium Launchpad events:

```typescript
import { RaydiumLCPEvent,TransactionAdapter } from 'solana-dex-parser';
  
// Setup connection
const connection = new Connection('https://api.mainnet-beta.solana.com');
// Get transaction
const signature = 'your-transaction-signature';
const tx = await connection.getParsedTransaction(signature, {
  maxSupportedTransactionVersion: 0,
});

const parser = new RaydiumLaunchpadEventParser(new TransactionAdapter(tx));
const events = parser.processEvents(); // RaydiumLCPEvent[]

console.log(events);
```
Launchpad Outputs
```typescript
// Output (RaydiumLCPCreateEvent, RaydiumLCPTradeEvent,RaydiumLCPCompleteEvent)

// CREATE -> PoolCreateEvent (Initialize)
{
  type: 'CREATE',
  data: {
    poolState: 'CPTNvVYT7qCzX3HnRRtSRAFpMipVgSP3eynXrW9p9YgD',
    creator: 'J88snVaNTCW7T6saPvAmYDmjnhPiSpkw8uJ8FFCyfcGA',
    config: '6s1xP3hpbAfFoNtUNF8mfHsjr2Bd97JxFJRWLbL6aHuX',
    baseMintParam: [Object],
    curveParam: [Object],
    vestingParam: [Object],
    baseMint: '25phz2ZHEfB81RQXKvNLvkDbK32nyUwFnQdqk6MLcook',
    quoteMint: 'So11111111111111111111111111111111111111112'
  },
  slot: 334260517,
  timestamp: 1744972806,
  signature: '4x8k2aQKevA8yuCVX1V8EaH2GBqdbZ1dgYxwtkwZJ7SmCQeng7CCs17AvyjFv6nMoUkBgpBwLHAABdCxGHbAWxo4',
  idx: '0-7'
},
// TRADE -> TradeEvent (buy/sell)
{
  type: 'TRADE',
  data: {
    poolState: 'GeSSWHbFkeYknLX3edkTP3JcsjHRnCJG3SymEkBzaFDo',
    totalBaseSell: <BN: 2d79883d20000>,
    virtualBase: <BN: 3ca20afc2aaaa>,
    virtualQuote: <BN: 698cc5b55>,
    realBaseBefore: <BN: 223b2a6f528bb>,
    realQuoteBefore: <BN: 88d98e8cb>,
    realBaseAfter: <BN: 22404db66ad1b>,
    amountIn: <BN: 2faf080>,
    amountOut: <BN: 5234718460>,
    protocolFee: <BN: 1e848>,
    platformFee: <BN: 5b8d8>,
    shareFee: <BN: 0>,
    tradeDirection: 0,
    poolStatus: 0,
    baseMint: 'Dph84TcDoGzCv43eZzxdDe9Dn7f2eFU4kbJFm3tHEray',
    quoteMint: 'So11111111111111111111111111111111111111112',
    user: 'A8BNMXfxCkjuEJ83piEBKdDydk1RVeDQ7jYoUFCTSWuv'
  },
  slot: 334244130,
  timestamp: 1744966356,
  signature: 'Gi44zBwsd8eUGEVPS1jstts457hKLbm8SSMLrRVHVK2McrhJjosiszb65U1LdrjsF1WfCXoesLMhm8RX3dchx4s',
  idx: '4-0'
},

// COMPLETE -> Migrate to AMM / CPSwap
{
  type: 'COMPLETE',
  data: {
    baseMint: 'Em8DYuvdQ28PNZqSiAvUxjG32XbpFPm9kwu2y5pdTray',
    quoteMint: 'So11111111111111111111111111111111111111112',
    poolMint: '9N82SeWs9cFrThpNyU8dngUjRHe9vzVjDnQrgQ115tEy',
    lpMint: '5Jg51sVNevcDeuzoHcfJFGMcYszuWSqSsZuDjiakXuXq',
    amm: 'RaydiumCPMM'
  },
  slot: 334174234,
  timestamp: 1744938781,
  signature: '2gWHLTb1utduUkZCTo9GZpcCZr7hVPXTJajdoVjMURgVG6eJdKJQY6jF954XN15sSmDvsPCmMD7XSRyofLrQWuFv',
  idx: '2-0'
}
```

## Note
- Jupiter Swap outputs aggregated transaction records
- Other aggregators (e.g., OKX) output multiple swap transaction records per AMM
- Most swap records are parsed from transfer actions except for Jupiter, Pumpfun, and Moonit
- Orca Liquidity analysis: OrcaV1 and OrcaV2 support is limited

## Development

### Prerequisites

- Node.js >= 18.8.0
- yarn

### Setup

1. Clone the repository
```bash
git clone https://github.com/cxcx-ai/solana-dex-parser.git
cd solana-dex-parser
```

2. Install dependencies
```bash
yarn install
```

3. Build the project
```bash
yarn build
```

### Testing

Run the test suite:
```bash
yarn test
```

Run unit tests:
```bash
yarn test parser.test.ts
yarn test liquidity-raydium.test.ts
......
```

### Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

This project is a TypeScript port of the original Go implementation [solanaswap-go](https://github.com/franco-bianco/solanaswap-go).
