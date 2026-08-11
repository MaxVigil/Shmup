import { describe, expect, it } from 'vitest';
import { createSeededRng } from '../../src/domain/rng';

describe('createSeededRng', () => {
  it('repeats the same sequence for the same seed', () => {
    const first = createSeededRng(42);
    const second = createSeededRng(42);

    expect([first.next(), first.next(), first.next()]).toEqual([
      second.next(),
      second.next(),
      second.next(),
    ]);
  });

  it('produces integers inside the requested range', () => {
    const rng = createSeededRng(7);
    const values = Array.from({ length: 100 }, () => rng.integer(3, 9));

    expect(values.every((value) => value >= 3 && value < 9)).toBe(true);
  });

  it('rejects invalid integer bounds', () => {
    const rng = createSeededRng(1);

    expect(() => rng.integer(5, 5)).toThrow(RangeError);
    expect(() => rng.integer(1.5, 3)).toThrow(TypeError);
  });
});
