import { Connection } from '@solana/web3.js';
import dotenv from 'dotenv';

import { TransactionAdapter } from '../transaction-adapter';
import { DexParser } from '../dex-parser';

dotenv.config();

const tests = {
  CREATE: [
    {
      signature: '2YxPyAJNfnBLrVpBwMx7qMVNPSvBDhxiquwJGhBjwXhkP6i6AbooUg4b4wpi15bQq2Qs4t7BpL1UVvTMcXL8P4uS',
      type: 'CREATE',
      desc: 'Singer > Raydium Liquidity Pool V4: initialize2',
      name: 'Coca-Cola',
      poolId: 'GGJZ7ayp5urhWaTikqFvm3ahggobmaEtz7wgettXrr31',
      token0Mint: '3ZmaEAKC75ereKNTxZeaDxxHLNWag2rL43UY19Rw6v7D',
      token0Amount: 50000000,
      token1Mint: 'So11111111111111111111111111111111111111112',
      token1Amount: 1,
    },
    {
      signature: 'FHz3LurEFNnWREXSfqpenJTRuzybQrmxsNjndmMDw36XUwUofSQ1vRQwVi6uT422Xe2Whb7gfFY3tHGqvEBg6dF',
      type: 'CREATE',
      desc: 'Singer > Raydium Liquidity Pool V4: initialize2',
      name: 'CASH',
      poolId: 'GmF1c1CSwm56Hx2mfJnjK8WT5eNCuDyHrHDbBYiM3U5f',
      token0Mint: '56dtyR73VF1MKHLVusZgTkAvEeDYkQqneqZqkusLgyb4',
      token0Amount: 50000000,
      token1Mint: 'So11111111111111111111111111111111111111112',
      token1Amount: 1,
    },
    {
      signature: '5MRWUUoCWpaFm8B9jSoLp4w6B19p46jcJMQrm26SHHGRZQpAtG3mdEcqGVDwsgUEGKRmC1R6JMFS5NhzmXUnR3X1',
      type: 'CREATE',
      desc: 'Moonit > Raydium Liquidity Pool V4: initialize2',
      name: 'SLTX',
      poolId: 'GHrKkupnWVxQokfCfrYtmQMKnVE5s9873gJCg3wGrcTw',
      token0Mint: '591irbGXZLfqDneLqwDHLJFgS9UxxVzBmyFkWPeTmoon',
      token0Amount: 187674338.64251745,
      token1Mint: 'So11111111111111111111111111111111111111112',
      token1Amount: 84.116339594,
    },
    {
      signature: '4998xRsghpLWWcZsFFtfN8UBss9SVkN8sMUPkqdBzYS6eRVuxve3RoT89pqBaYvHDgqPSsFt9GDGQc6Us3pwPX5v',
      type: 'CREATE',
      desc: 'Pumpfun > Raydium Liquidity Pool V4: initialize2',
      name: 'CAR',
      poolId: 'Bx5pAzBqbuYH5yT93XCoShDka6d6vz9AzBddG7zE9syh',
      token0Mint: '7oBYdEhV4GkXC19ZfgAvXpJWp2Rn9pm1Bx2cVNxFpump',
      token0Amount: 206900000,
      token1Mint: 'So11111111111111111111111111111111111111112',
      token1Amount: 79.005359057,
    },
    {
      signature: '49ejTjaCdqV3hwAs1GomGsTLqZNUWztHduHRCNr8m3Dogfyii29qkNPNauAr9VfEh9j5m7QHq8HYRd6FiaAACCf',
      type: 'CREATE',
      desc: 'Pumpfun > Raydium Liquidity Pool V4: initialize2',
      name: 'BQFIN',
      poolId: 'Fidv7mwYxFgRVL3qHFJrGQmrhiwn6bvso7pUqU1r1db8',
      token0Mint: 'npvXPTd172PepW5HMdgayiNuqKqbSsd3DArCeeTpump',
      token0Amount: 206900000,
      token1Mint: 'So11111111111111111111111111111111111111112',
      token1Amount: 79.005359118,
    },
  ],
  ADD: [
    {
      signature: '4zFeXoUVaaQ18chkY899hvvTYBRMAJ6CaNfWxbchMDDEY1L56maqwAdY19Faif5LBoTxwBPeEamcEsh76b39fjia',
      type: 'ADD',
      desc: 'Singer > Raydium Liquidity Pool V4: raydium:add-liquidity',
      name: 'CAR',
      poolId: 'Bx5pAzBqbuYH5yT93XCoShDka6d6vz9AzBddG7zE9syh',
      token0Mint: '7oBYdEhV4GkXC19ZfgAvXpJWp2Rn9pm1Bx2cVNxFpump',
      token0Amount: 1950.837707,
      token1Mint: 'So11111111111111111111111111111111111111112',
      token1Amount: 0.147754335,
    },
    {
      signature: '2S4DdkD4FpqazTn5qHd4x9X5bAHu9g5Ry3jCLWkE44UCmW8bwkcet9eeAsHbzyR7HWtiE3gV268MtsBNrc4X6KpL',
      type: 'ADD',
      desc: 'Singer > Raydium Liquidity Pool V4: raydium:add-liquidity',
      name: 'jellyjelly',
      poolId: '3bC2e2RxcfvF9oP22LvbaNsVwoS2T98q6ErCRoayQYdq',
      token0Mint: 'FeR8VBqNRSUD5NtXAj2n3j1dAHkZHfyDktKuLXD4pump',
      token0Amount: 10279267.251303,
      token1Mint: 'So11111111111111111111111111111111111111112',
      token1Amount: 370.892851447,
    },
  ],
  REMOVE: [
    {
      signature: '2MvpoPWEY3gnEE5WxsQATRRa15Go6p8HxBbuxATiTUMxCRJeVQsBCPnCRdrM5YModikwpTiKu1iZbPBeTdHkg3uv',
      type: 'REMOVE',
      desc: 'Singer > Raydium Liquidity Pool V4: raydium:add-liquidity',
      name: 'CAR',
      poolId: 'Bx5pAzBqbuYH5yT93XCoShDka6d6vz9AzBddG7zE9syh',
      token0Mint: '7oBYdEhV4GkXC19ZfgAvXpJWp2Rn9pm1Bx2cVNxFpump',
      token0Amount: 696.848377,
      token1Mint: 'So11111111111111111111111111111111111111112',
      token1Amount: 0.055709162,
    },
    {
      signature: '33HpWkDo8tr4r3jQCnML7ojpL3pFLHiE5yLZsbJDGe1mQzdg7aeJ9EKyD6WayEY4Q1hEivca93bP82TzsVcLzkgf',
      type: 'REMOVE',
      desc: 'Singer > Raydium Liquidity Pool V4: raydium:remove-liquidity',
      name: 'jellyjelly',
      poolId: '3bC2e2RxcfvF9oP22LvbaNsVwoS2T98q6ErCRoayQYdq',
      token0Mint: 'FeR8VBqNRSUD5NtXAj2n3j1dAHkZHfyDktKuLXD4pump',
      token0Amount: 12152.01771,
      token1Mint: 'So11111111111111111111111111111111111111112',
      token1Amount: 0.375727077,
    },
  ],
};

const test_errors = [
  "4Cod1cNGv6RboJ7rSB79yeVCR4Lfd25rFgLY3eiPJfTJjTGyYP1r2i1upAYZHQsWDqUbGd1bhTRm1bpSQcpWMnEz",
  "v8s37Srj6QPMtRC1HfJcrSenCHvYebHiGkHVuFFiQ6UviqHnoVx4U77M3TZhQQXewXadHYh5t35LkesJi3ztPZZ",
  "oXUd22GQ1d45a6XNzfdpHAX6NfFEfFa9o2Awn2oimY89Rms3PmXL1uBJx3CnTYjULJw6uim174b3PLBFkaAxKzK",
  "4mxr44yo5Qi7Rabwbknkh8MNUEWAMKmzFQEmqUVdx5JpHEEuh59TrqiMCjZ7mgZMozRK1zW8me34w8Myi8Qi1tWP",
  "5kaAWK5X9DdMmsWm6skaUXLd6prFisuYJavd9B62A941nRGcrmwvncg3tRtUfn7TcMLsrrmjCChdEjK3sjxS6YG9",
  "51nj5GtAmDC23QkeyfCNfTJ6Pdgwx7eq4BARfq1sMmeEaPeLsx9stFA3Dzt9MeLV5xFujBgvghLGcayC3ZevaQYi",
  "4MSVpVBwxnYTQSF3bSrAB99a3pVr6P6bgoCRDsrBbDMA77WeQqoBDDDXqEh8WpnUy5U4GeotdCG9xyExjNTjYE1u",
  "mWaH4FELcPj4zeY4Cgk5gxUirQDM7yE54VgMEVaqiUDQjStyzwNrxLx4FMEaKEHQoYsgCRhc1YdmBvhGDRVgRrq"
]

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

  describe('Raydium V4', () => {
    Object.values(tests)
      .flat()
      .forEach((test) => {
        it(`${test.type} > ${test.name} > ${test.desc} `, async () => {
          const tx = await connection.getParsedTransaction(test.signature, {
            maxSupportedTransactionVersion: 0,
          });
          if (!tx) throw new Error('Transaction not found');
          const parser = new DexParser();
          const events = parser.parseLiquidity(tx);
          console.log('events > ', events);
          expect(events.length).toEqual(1);
          expect(events[0].type).toEqual(test.type);
          expect(events[0].poolId).toEqual(test.poolId);
          expect(events[0].token0Mint).toEqual(test.token0Mint);
          expect(events[0].token0Amount).toEqual(test.token0Amount);
          expect(events[0].token1Mint).toEqual(test.token1Mint);
          expect(events[0].token1Amount).toEqual(test.token1Amount);
        });
      });
  });

  describe('Raydium V4 Error Cases', () => {
    test_errors.forEach((signature) => {
      it(`${signature} `, async () => {
        const tx = await connection.getTransaction(signature, {
          maxSupportedTransactionVersion: 0,
        });
        if (!tx) throw new Error('Transaction not found');
        const parser = new DexParser();
        const events = parser.parseLiquidity(tx);
        expect(events.length).toEqual(0);
      });
    });
  });
});
