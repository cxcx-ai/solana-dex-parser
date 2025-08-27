import base58 from 'bs58';

export class BinaryReader {
  private offset = 0;

  constructor(private buffer: Buffer) { }

  readFixedArray(length: number): Buffer {
    this.checkBounds(length);
    const array = this.buffer.slice(this.offset, this.offset + length);
    this.offset += length;
    return array;
  }

  readU8(): number {
    this.checkBounds(1);
    const value = this.buffer.readUInt8(this.offset);
    this.offset += 1;
    return value;
  }

  readU16(): number {
    this.checkBounds(2);
    const value = this.buffer.readUint16LE(this.offset);
    this.offset += 2;
    return value;
  }

  readU64(): bigint {
    this.checkBounds(8);
    const value = this.buffer.readBigUInt64LE(this.offset);
    this.offset += 8;
    return value;
  }

  readI64(): bigint {
    this.checkBounds(8);
    const value = this.buffer.readBigInt64LE(this.offset);
    this.offset += 8;
    return value;
  }

  readString(): string {
    // Read 4-byte (32-bit) length instead of 1 byte
    const length = this.buffer.readUInt32LE(this.offset);
    this.offset += 4;

    this.checkBounds(length);
    const strBuffer = this.buffer.slice(this.offset, this.offset + length);
    const content = strBuffer.toString('utf8');
    this.offset += length;

    return content;
  }

  readPubkey(): string {
    return base58.encode(Buffer.from(this.readFixedArray(32)));
  }

  remaining(): number {
    return this.buffer.length - this.offset;
  }

  private checkBounds(length: number) {
    if (this.offset + length > this.buffer.length) {
      throw new Error(
        `Buffer overflow: trying to read ${length} bytes at offset ${this.offset} in buffer of length ${this.buffer.length}`
      );
    }
  }

  getOffset(): number {
    return this.offset;
  }
}
