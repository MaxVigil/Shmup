const UINT32_RANGE = 0x1_0000_0000;

export interface RandomSource {
  next(): number;
  integer(minInclusive: number, maxExclusive: number): number;
}

export function createSeededRng(seed: number): RandomSource {
  let state = seed >>> 0;

  return {
    next(): number {
      state = (state + 0x6d2b79f5) >>> 0;
      let value = state;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / UINT32_RANGE;
    },

    integer(minInclusive: number, maxExclusive: number): number {
      if (!Number.isInteger(minInclusive) || !Number.isInteger(maxExclusive)) {
        throw new TypeError('Random integer bounds must be integers.');
      }

      if (maxExclusive <= minInclusive) {
        throw new RangeError('maxExclusive must be greater than minInclusive.');
      }

      return Math.floor(this.next() * (maxExclusive - minInclusive)) + minInclusive;
    },
  };
}
