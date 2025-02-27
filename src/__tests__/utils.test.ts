import dotenv from 'dotenv';
import { hexToUint8Array } from '../utils';

dotenv.config();

describe('Utils', () => {
  describe('Base58', () => {
    it('Get discriminator', async () => {
      const hex =
        // "01fecbdbb8670000000000ca9a3b0000000000203d88792d0000";
        'a9204f8988e84689';
      const data = hexToUint8Array(hex);

      console.log(data.slice(0, 8));
    });
  });
});
