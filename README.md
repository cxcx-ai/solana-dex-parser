# Solana Dex Transaction Parser

A TypeScript library for parsing Solana DEX swap transactions. Supports multiple DEX protocols including Jupiter, Raydium, Meteora, PumpFun, and Moonshot.

## Features

- Parse **Swap** transactions from multiple DEX protocols
- Support for transfer and transfer-check instructions
- Detailed swap information extraction
- Support **Liquidity** events (create, add, remove)
- TypeScript type definitions
- Comprehensive test coverage

## Supported DEX Protocols

- Jupiter
- Raydium
- Meteora
- PumpFun
- Moonshot
- Orca
- Phoenix
- OKX Dex
  
## Supported Trading Bot Programs
- Banana gun
- Mintech
- Bloom
- Maestro
- Nova

## Installation

```bash
npm install solana-dex-parser
```

## Usage

### Configuration Options

The DexParser class doesn't require any configuration. It automatically detects the DEX protocol used in the transaction and applies the appropriate parsing logic.

### Basic Usage > Swap (Buy and Sell)

```typescript
import { Connection } from '@solana/web3.js';
import { DexParser } from 'solana-dex-parser';

async function parseSwap() {
  // Setup connection
  const connection = new Connection('https://api.mainnet-beta.solana.com');
  
  // Get transaction
  const signature = 'your-transaction-signature';
 
  const parser = new DexParser(connection);

  // case 1, by signature
  const trades = await parser.parseTransaction(signature);
  console.log("Trades:", trades);

  // case 2, by tx object
  const tx = await this.connection.getParsedTransaction(signature, {
    commitment: "confirmed",
    maxSupportedTransactionVersion: 0,
  });

  const trades2 = await parser.parseTrades(tx);
  console.log("trades2:", trades2);
}

```

### Liquidity Usage

```typescript
import { Connection } from '@solana/web3.js';
import { DexParser } from 'solana-dex-parser';

async function parseLiquidityEvents() {
  // Setup connection
  const connection = new Connection('https://api.mainnet-beta.solana.com');
  
  // Get transaction
  const signature = 'your-transaction-signature';
  const tx = await this.connection.getParsedTransaction(signature, {
    maxSupportedTransactionVersion: 0,
  });
 
  // Parse events
  const parser = new DexParser(connection);
  const events = await parser.parseLiquidity(tx);
  console.log("events:", events);
}

```

### Common Use Cases

1. Analyzing DEX trading activity:

```typescript
const signatures = ['sig1', 'sig2', 'sig3'];
const allTrades = [];

for (const signature of signatures) {
  const parsedTransaction = await connection.getParsedTransaction(signature);
  const trades = dexParser.parseTransaction(parsedTransaction);
  allTrades.push(...trades);
}

console.log(`Total trades: ${allTrades.length}`);
```

2. Extracting token transfer information:

```typescript
import { TransferParser } from 'solana-dex-parser';


// Setup connection
const connection = new Connection('https://api.mainnet-beta.solana.com');
// Get transaction
const signature = 'your-transaction-signature';
const tx = await this.connection.getParsedTransaction(signature, {
  maxSupportedTransactionVersion: 0,
});

const transferParser = new TransferParser();
const transfers = transferParser.parseTransfers(tx);

console.log(transfers);
```

3. Extracting Pumpfun events (create/trade/complete):

```typescript
import { PumpfunEventParser } from 'solana-dex-parser';
  
// Setup connection
const connection = new Connection('https://api.mainnet-beta.solana.com');
// Get transaction
const signature = 'your-transaction-signature';
const tx = await this.connection.getParsedTransaction(signature, {
  maxSupportedTransactionVersion: 0,
});

const eventParser = new PumpfunEventParser(tx);
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

## Development

### Prerequisites

- Node.js >= 16
- npm >= 7

### Setup

1. Clone the repository
```bash
git clone https://github.com/cxcx-ai/solana-dex-parser.git
cd solana-dex-parser
```

2. Install dependencies
```bash
npm install
```

3. Build the project
```bash
npm run build
```

### Testing

Run the test suite:
```bash
npm test
```

Run tests with coverage:
```bash
npm run test:coverage
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

This project is a TypeScript port of the original Go implementation [solana-swap-go](https://github.com/original/solana-swap-go).
