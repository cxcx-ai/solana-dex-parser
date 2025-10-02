import { Connection } from '@solana/web3.js';
import dotenv from 'dotenv';
import { DexParser } from '../dex-parser';

dotenv.config();

const tests = {
  CREATE: [
    {
      signature: '5BEKeMuUfah3wFkCvMmaGDq5JDTat2nokaqMURYZubNDm9WdQrMmwWK4YcL7nksuq94k62wxgbbbwUf5LCgtXU4J',
      type: 'ADD',
      desc: 'Raydium Concentrated Liquidity: openPositionWithToken22Nft',
      name: 'PAIN',
      poolId: 'DFX9AHEnoU8caagtFFGiv7xnsEJ3DTh5TQo8XktJHoTN',
      token0Mint: '1Qf8gESP4i6CFNWerUSDdLKJ9U1LpqTYvjJ2MM4pain',
      token0Amount: 127.164994,
      token1Mint: 'So11111111111111111111111111111111111111112',
      token1Amount: 7.199999997,
    },
    {
      signature: '4Vv9ZWLizvRE7um22gF8bUWvD5UfK1TMXsP4hF8TVF4gc2BNmmPG8kFu7Dyod9Zw5x16xAsGeDJnUznCwaKXim5n',
      type: 'CREATE',
      desc: 'Raydium Concentrated Liquidity: openPositionWithToken22Nft',
      name: 'TRUMP',
      poolId: 'GQsPr4RJk9AZkkfWHud7v4MtotcxhaYzZHdsPCg9vNvW',
      token0Mint: '6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN',
      token0Amount: 46,
      token1Mint: 'So11111111111111111111111111111111111111112',
      token1Amount: 0.459999999,
    },
    {
      signature: '54t2sbzBxmejGNYmttn5nr4fDeRHdZC6CF4eiAm3Was7WKrvw6LEH51gb2RGw5Wom2y12vW11o2hwaHBE3W4Rgx9',
      type: 'ADD',
      desc: 'Raydium Concentrated Liquidity: openPosition',
      name: 'EDAS',
      poolId: '5MczDZ1DYBpCyjXWhyLXAW4AofywKizDF8w4cLZqvpuV',
      token0Mint: 'kH6hPcpdJqeMAATYU7W4rzqZuzYTkYr6QqGYTLkpump',
      token0Amount: 2796.229978,
      token1Mint: 'So11111111111111111111111111111111111111112',
      token1Amount: 0.004266144,
    },
    {
      signature: '2Bm6Xh3UQYCYywCQPEJ1tCQKrSPHRPGukN4qTmutCYnR45PKMBhTuBjMdbT7x3fsLnqvduAeiTQeVRQ76NA2NMGN',
      type: 'ADD',
      desc: 'Raydium Concentrated Liquidity: openPosition',
      name: 'USDC',
      poolId: '8sLbNZoA1cfnvMJLPfp98ZLAnFSYCFApfJKMbiXNLwxj',
      token0Mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      token0Amount: 41677.305735,
      token1Mint: 'So11111111111111111111111111111111111111112',
      token1Amount: 215.71233501,
    },

    {
      signature: '61auheJ9MhRbQeXqiAMitgWWv2yxkDSCqb6qauMr77UaENwR7yUfc5LCH8pExkjo1QqnqYLvRu9vNXi5QRZST19S',
      type: 'CREATE',
      desc: 'Raydium Concentrated Liquidity: openPositionV2',
      name: 'Anon',
      poolId: 'EYy5nwcFQHfSCKrrALgMB2DbU2vhszWHjuEdDFgAvfpu',
      token0Mint: '9McvH6w97oewLmPxqQEoHUAv3u5iYMyQ9AeZZhguYf1T',
      token0Amount: 9.526157579,
      token1Mint: 'So11111111111111111111111111111111111111112',
      token1Amount: 0.471506154,
    },
  ],
  ADD: [
    {
      signature: '54TqXAJT3JcuJe37TMT6nYcZzuRgYMkcLinZt4vNoJF3aVmFTU5yD1fWCFuqygSH4tBtyUJnb4fxUBA8XtGYsDRC',
      type: 'ADD',
      desc: 'Raydium Concentrated Liquidity: increaseLiquidityV2',
      name: 'PAIN',
      poolId: 'H6aoNRGBnzMfpAfSkaS2uXh7PsT3F9nzj1HFCmBgGTgY',
      token0Mint: '1Qf8gESP4i6CFNWerUSDdLKJ9U1LpqTYvjJ2MM4pain',
      token0Amount: 4.848942,
      token1Mint: 'So11111111111111111111111111111111111111112',
      token1Amount: 0.215266532,
    },
    {
      signature: '4hVaQHrCJrzfPTP7XsbtUnwW7qWEM2fwF68WJQnvNfNVEU3Va5RAeZHACF93xy4vYeoxT52nK61hDk8twCW99BJc',
      type: 'ADD',
      desc: 'Raydium Concentrated Liquidity: increaseLiquidityV2',
      name: 'PAIN',
      poolId: 'DFX9AHEnoU8caagtFFGiv7xnsEJ3DTh5TQo8XktJHoTN',
      token0Mint: '1Qf8gESP4i6CFNWerUSDdLKJ9U1LpqTYvjJ2MM4pain',
      token0Amount: 4.279968,
      token1Mint: 'So11111111111111111111111111111111111111112',
      token1Amount: 0.278012566,
    },
    {
      signature: '2Uc81FAsAsmgSmwNk4xLdnzPQ1ALJrCou4SjTm6C3C5gXDMEYFmWL9a8VUcop5AJvWpTFa9vVxSMxgvNpumhCKnM',
      type: 'ADD',
      desc: 'Raydium Concentrated Liquidity: increaseLiquidityV2',
      name: 'TRUMP',
      poolId: 'GQsPr4RJk9AZkkfWHud7v4MtotcxhaYzZHdsPCg9vNvW',
      token0Mint: '6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN',
      token0Amount: 415.62333,
      token1Mint: 'So11111111111111111111111111111111111111112',
      token1Amount: 5.658872061,
    },

    {
      signature: '4VpDFKjjyBNjS3amzzqW22mx1aLNQnYwm1EyZT4kNkHrDpfNCfuZWjm8UL4br5ReNdVUjTmFdqgoUBX2eKuhVndt',
      type: 'ADD',
      desc: 'Raydium Concentrated Liquidity: increaseLiquidity',
      name: 'USDC',
      poolId: 'BZtgQEyS6eXUXicYPHecYQ7PybqodXQMvkjUbP4R8mUU',
      token0Mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', //USDC
      token0Amount: 544.16166,
      token1Mint: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', // USDT
      token1Amount: 468.509899,
      test: true,
    },
  ],
  REMOVE: [
    {
      signature: '48oGGt6rsBqbiyj7xyzWD8oRXk3sGhE6Kt6LzRG5QofL1LJqwtcfp4uKXeinDn4a24uyWJVGDPTaAFac2R5eNX1w',
      type: 'REMOVE',
      desc: 'Raydium Concentrated Liquidity: decreaseLiquidityV2',
      name: 'PAIN',
      poolId: 'DFX9AHEnoU8caagtFFGiv7xnsEJ3DTh5TQo8XktJHoTN',
      token0Mint: '1Qf8gESP4i6CFNWerUSDdLKJ9U1LpqTYvjJ2MM4pain',
      token0Amount: 13.5631,
      token1Mint: 'So11111111111111111111111111111111111111112',
      token1Amount: 0.196747275,
    },
    {
      signature: '44Ccr2ftN83ryWyCLjspAUZXSLy4fxWsLhCP3xmBftHN3MhWBd1k3ctFjwvJBFQGRtZo2uof4qM3NazQkn9gn5UZ',
      type: 'REMOVE',
      desc: 'Raydium Concentrated Liquidity: decreaseLiquidityV2',
      name: 'TRUMP',
      poolId: 'GQsPr4RJk9AZkkfWHud7v4MtotcxhaYzZHdsPCg9vNvW',
      token0Mint: '6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN',
      token0Amount: 91.825081,
      token1Mint: 'So11111111111111111111111111111111111111112',
      token1Amount: 3.376022161,
    },

    {
      signature: '7JX8oo13G3q812rQ7FwarAKGHzHBKS4JqQSfkpso826HeFifupXgBo6yhnkXE8Yt8xfAG2Qv6SwvrNgRYWiEy8K',
      type: 'REMOVE',
      desc: 'Raydium Concentrated Liquidity: decreaseLiquidity',
      name: 'USDC',
      poolId: 'BZtgQEyS6eXUXicYPHecYQ7PybqodXQMvkjUbP4R8mUU',
      token0Mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      token0Amount: 74.3064,
      token1Mint: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
      token1Amount: 63.893602,
    },
  ],
};

describe('Liquidity', () => {
  let connection: Connection;
  beforeAll(async () => {
    // Initialize connection
    const rpcUrl = process.env.SOLANA_RPC_URL;
    if (!rpcUrl) {
      throw new Error('SOLANA_RPC_URL environment variable is not set');
    }
    connection = new Connection(rpcUrl);
  });

  describe('Raydium CL', () => {
    Object.values(tests)
      .flat()
      // .filter((test: any) => test.test == true) // test only
      .forEach((test) => {
        it(`${test.type} > ${test.name} > ${test.desc} > ${test.signature} `, async () => {
          const tx = await connection.getTransaction(test.signature, {
            maxSupportedTransactionVersion: 0,
          });
          if(!tx) throw new Error('Transaction not found');
          const parser = new DexParser();
          const events = parser.parseLiquidity(tx);
          // console.log('events', events);
          expect(events.length).toBeGreaterThanOrEqual(1);
          expect(events[0].type).toEqual(test.type);
          expect(events[0].poolId).toEqual(test.poolId);
          expect(events[0].token0Mint).toEqual(test.token0Mint);
          expect(events[0].token0Amount).toEqual(test.token0Amount);
          expect(events[0].token1Mint).toEqual(test.token1Mint);
          expect(events[0].token1Amount).toEqual(test.token1Amount);
        });
      });
  });
});
