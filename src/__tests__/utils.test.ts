import dotenv from 'dotenv';
import { hexToUint8Array } from '../utils';

dotenv.config();

describe('Utils', () => {
  describe('Base58', () => {
    it('Get discriminator', async () => {
      const hex =
        //'c1209b3341d69c810e030000003d016400011a64010234640203402c420600000000e953780100000000500000'; // instruction discriminator 
        '181ec828051c07771000000056616e6365204d656d6520496e64657803000000564d494300000068747470733a2f2f697066732e696f2f697066732f516d57756345707442366a464b61336532486f336a67614e36456b4e7173707955357a6e32506539507a65516337cdf1e94225477c05226f2aac3601ca7def0a09df47a9836c6442f5d7a532a594'; // event discriminator

      const data = hexToUint8Array(hex);

      console.log(data.slice(0, 8)); // instruction discriminator
      // console.log(data.slice(0, 16)); // event discriminator
    });
  });
});