import { Connection } from '@solana/web3.js';
import dotenv from 'dotenv';
import { DexParser } from '../dex-parser';
import { BoopfunEventParser } from '../parsers';
import { TransactionAdapter } from '../transaction-adapter';
import { TransactionUtils } from '../transaction-utils';

dotenv.config();

describe('Parser', () => {
  let connection: Connection;
  beforeAll(async () => {
    // Initialize connection
    const rpcUrl = process.env.SOLANA_RPC_URL;
    if (!rpcUrl) {
      throw new Error('SOLANA_RPC_URL environment variable is not set');
    }
    connection = new Connection(rpcUrl);
  });

  describe('Boopfun', () => {
    it('boopfun events', async () => {
      const tx = await connection.getTransaction(
        '4YxPRX9p3rdN7H6cbjC6pKqyQfTu589nkVH3PqxFQyaoP5cZxEgfLK2SJmHFzUTXoJceGtxC8eGXeDqFjLE2UycH', // create & complete
        // "28S2MakapF1zTrnqYHdMxdnN9uqAfKV2fa5ez9HpE466L3xWz8AXwsz4eKXXnpvX8p49Ckbp26doG5fgW5f6syk9", // buy
        //  "3Lyh3wAPkcLGKydqT6VdjMsorLUJqEuDeppxh79sQjGxuLiMqMgB75aSJyZsM3y3jJRqdLJYZhNUBaLeKQ8vL4An", // sell
        // "3yLq2ECkAtzFrvAH3V5nhQirZMNRj28EXfFifBYoeJmfAhutVfjqVnjewAExkSaz9ENfUXf511T5zSMfnFiVj1Jy", // complete
        {
          maxSupportedTransactionVersion: 0,
        }
      );
      if(!tx) throw new Error('Transaction not found');

      // parse Boopfun trades (buy, sell)
      const dexParser = new DexParser();
      const result = dexParser.parseAll(tx);
      // console.log('result', JSON.stringify(result, null, 2));

      // parse Boopfun events (create, buy, sell, complete)
      const adapter = new TransactionAdapter(tx);
      const utils = new TransactionUtils(adapter);
      const transferActions = utils.getTransferActions();
      const parser = new BoopfunEventParser(adapter,transferActions);
      const events = parser.processEvents();
     
      console.log('events', events);
      expect(events.length).toBeGreaterThan(0);
    });
  });
});
