import { Connection } from '@solana/web3.js';
import dotenv from 'dotenv';
import { RaydiumLaunchpadEventParser } from '../parsers';
import { TransactionAdapter } from '../transaction-adapter';
import { ConstantCurve, PoolStatus, RaydiumLCPCompleteEvent, RaydiumLCPCreateEvent, RaydiumLCPTradeEvent, TradeDirection } from '../types';

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

  describe('RaydiumLaunchpad', () => {
    it('create', async () => {
      const tx = await connection.getTransaction(
        '4x8k2aQKevA8yuCVX1V8EaH2GBqdbZ1dgYxwtkwZJ7SmCQeng7CCs17AvyjFv6nMoUkBgpBwLHAABdCxGHbAWxo4', // create & complete
        {
          maxSupportedTransactionVersion: 0,
        }
      );
      if (!tx) throw new Error('Transaction not found');
      const parser = new RaydiumLaunchpadEventParser(new TransactionAdapter(tx), {});
      const events = parser.processEvents();

      const create = events[0];
      const buy = events[1];
      console.log('create events', events);
      // create
      expect(create.pool).toEqual("CPTNvVYT7qCzX3HnRRtSRAFpMipVgSP3eynXrW9p9YgD");
      expect(create.creator).toEqual("J88snVaNTCW7T6saPvAmYDmjnhPiSpkw8uJ8FFCyfcGA");
      // expect(create.config).toEqual("6s1xP3hpbAfFoNtUNF8mfHsjr2Bd97JxFJRWLbL6aHuX");
      expect(create.symbol).toEqual("TOAST");
      // expect(create.curveParam.variant).toEqual("Constant");
      expect(create.totalSupply).toEqual("1000000000000000");

      // buy
      expect(buy.pool).toEqual("CPTNvVYT7qCzX3HnRRtSRAFpMipVgSP3eynXrW9p9YgD");
      expect(buy.inputToken?.amountRaw.toString()).toEqual("10000000");
      expect(buy.outputToken?.amountRaw.toString()).toEqual("353971575213");
      expect(buy.type).toEqual('BUY');

    });

    it('migrate_to_amm', async () => {
      const tx = await connection.getTransaction(
        '2yD4a9fKXkPvEndSFKwnYUCeHe8yfb6KGdVKopc8ZJDwqQZzxEB42hyspbmUYAp2MofcdCxD8YduZdepHsC2cMFd', // create & complete
        {
          maxSupportedTransactionVersion: 0,
        }
      );
      if (!tx) throw new Error('Transaction not found');
      const parser = new RaydiumLaunchpadEventParser(new TransactionAdapter(tx), {});
      const event = parser.processEvents()[0];

      expect(event.baseMint).toEqual("GGiHEB7CtBe2pCsotGMBPgTFzFhXm6cjWrnSgNqVUray");
      expect(event.quoteMint).toEqual("So11111111111111111111111111111111111111112");
      expect(event.pool).toEqual("J6VesUgku4yr31wA9m2YZKNpoD8iGBiuoMMpEAo7NXU7");
      // expect(event.lpMint).toEqual("4hF3cktcf5nXFt8wmNsVVUZwRdcgBvn36gLrud6Ypyc3");
      // expect(event.amm).toEqual("RaydiumV4");
    });

    it('migrate_to_cpswap', async () => {
      const tx = await connection.getTransaction(
        '2gWHLTb1utduUkZCTo9GZpcCZr7hVPXTJajdoVjMURgVG6eJdKJQY6jF954XN15sSmDvsPCmMD7XSRyofLrQWuFv', // create & complete
        {
          maxSupportedTransactionVersion: 0,
        }
      );
      if (!tx) throw new Error('Transaction not found');
      const parser = new RaydiumLaunchpadEventParser(new TransactionAdapter(tx), {});
      const event = parser.processEvents()[0];
      ;
      expect(event.baseMint).toEqual("Em8DYuvdQ28PNZqSiAvUxjG32XbpFPm9kwu2y5pdTray");
      expect(event.quoteMint).toEqual("So11111111111111111111111111111111111111112");
      expect(event.pool).toEqual("9N82SeWs9cFrThpNyU8dngUjRHe9vzVjDnQrgQ115tEy");
      // expect(event.lpMint).toEqual("5Jg51sVNevcDeuzoHcfJFGMcYszuWSqSsZuDjiakXuXq");
      // expect(event.amm).toEqual("RaydiumCPMM");
    });

    it('buy_exact_in', async () => {
      const tx = await connection.getTransaction(
        'Gi44zBwsd8eUGEVPS1jstts457hKLbm8SSMLrRVHVK2McrhJjosiszb65U1LdrjsF1WfCXoesLMhm8RX3dchx4s', // create & complete
        {
          maxSupportedTransactionVersion: 0,
        }
      );
      if (!tx) throw new Error('Transaction not found');
      const parser = new RaydiumLaunchpadEventParser(new TransactionAdapter(tx), {});
      const event = parser.processEvents()[0];
      ;
      console.log(event);
      expect(event.pool).toEqual("GeSSWHbFkeYknLX3edkTP3JcsjHRnCJG3SymEkBzaFDo");
      expect(event.inputToken?.amountRaw.toString()).toEqual("50000000");
      expect(event.outputToken?.amountRaw.toString()).toEqual("353067172960");
      expect(event.type).toEqual(TradeDirection.Buy);
    });

    it('sell_exact_in', async () => {
      const tx = await connection.getTransaction(
        '36n8GMHRMSyX8kRSgaUfcE5jpjWNWhjAu7YPeYFX2fMVzirJT4YhvYMo4dS5VoCVj5H47qZ8FzSEDLc6ui78HcAh', // create & complete
        {
          maxSupportedTransactionVersion: 0,
        }
      );
      if (!tx) throw new Error('Transaction not found');
      const parser = new RaydiumLaunchpadEventParser(new TransactionAdapter(tx), {});
      const event = parser.processEvents()[0];

      console.log(event);
      expect(event.pool).toEqual("7SgAC6oe5jwb58JaK2KMXDnAL7JxnaH1DX5nc6BEp7Ng");
      expect(event.inputToken?.amountRaw.toString()).toEqual("26252327418406");
      expect(event.outputToken?.amountRaw.toString()).toEqual("744875999");
      expect(event.type).toEqual(TradeDirection.Sell);
    });
  });
});
