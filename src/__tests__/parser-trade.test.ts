import { Connection } from '@solana/web3.js';
import dotenv from 'dotenv';
import { DexParser } from '../dex-parser';

dotenv.config();


describe('Dex Parser', () => {
  let connection: Connection;
  beforeAll(async () => {
    // Initialize connection
    const rpcUrl = process.env.SOLANA_RPC_URL;
    if (!rpcUrl) {
      throw new Error('SOLANA_RPC_URL environment variable is not set');
    }
    connection = new Connection(rpcUrl, {
      commitment: 'confirmed',
      // httpAgent: new https.Agent({ host: '127.0.0.1', port: 7890 }) 
    });
  });

  describe('Parse Trades', () => {
    const parser = new DexParser();

    ["3ZCmWEuYAG55tuJGnuLjdASYUf2MH9Lw9gFuW8eVmHi6m8qTjYTFpGQpQNhhd4393mpcu1Zd8rqizeqZ7Sd2KCuH",
    ]
      .forEach((signature) => {
        it(`${signature} `, async () => {
          const tx = await connection.getTransaction(signature, {
            commitment: 'confirmed',
            maxSupportedTransactionVersion: 0,
          });
          if (!tx) { throw new Error(`Transaction not found > ${signature}`); }
          const { trades, liquidities, transfers } = parser.parseAll(tx, { tryUnknowDEX: false });
          console.log('trades', trades);
          console.log('liquidity', liquidities);
          console.log('transfer', transfers);
          expect(trades.length + liquidities.length+transfers.length).toBeGreaterThanOrEqual(1);
        });
      });
  });
});
