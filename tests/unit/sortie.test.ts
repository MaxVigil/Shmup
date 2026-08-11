import { describe, expect, it } from 'vitest';
import { createInitialGameState } from '../../src/domain/initial-state';
import { settleSortie } from '../../src/domain/sortie';

describe('settleSortie', () => {
  it('keeps the complete haul after extraction', () => {
    const state = createInitialGameState();
    const base = settleSortie(state.base, {
      extracted: true,
      materialsFound: 21,
      researchFound: 7,
    });

    expect(base.materials).toBe(21);
    expect(base.research).toBe(7);
  });

  it('keeps half the haul after a failed sortie', () => {
    const state = createInitialGameState();
    const base = settleSortie(state.base, {
      extracted: false,
      materialsFound: 21,
      researchFound: 7,
    });

    expect(base.materials).toBe(10);
    expect(base.research).toBe(3);
  });

  it('rejects negative rewards', () => {
    const state = createInitialGameState();

    expect(() =>
      settleSortie(state.base, {
        extracted: true,
        materialsFound: -1,
        researchFound: 0,
      }),
    ).toThrow(RangeError);
  });
});
