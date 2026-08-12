import { describe, expect, it } from 'vitest';
import { createInitialGameState } from '../../src/domain/initial-state';
import { settleSortie } from '../../src/domain/sortie';

const emptyContract = {
  targetsDestroyed: 0,
  targetsBreached: 0,
  creditsEarned: 0,
  creditsPenalized: 0,
  wardenSignalDetected: false,
} as const;

describe('settleSortie', () => {
  it('keeps the complete haul after extraction', () => {
    const state = createInitialGameState();
    const base = settleSortie(state.base, {
      extracted: true,
      materialsFound: 21,
      researchFound: 7,
      preservedTechnologyIds: [],
      ...emptyContract,
    });

    expect(base.materials).toBe(21);
    expect(base.research).toBe(7);
    expect(base.credits).toBe(state.base.credits);
    expect(base.sortiesCompleted).toBe(1);
  });

  it('keeps half the haul after a failed sortie', () => {
    const state = createInitialGameState();
    const base = settleSortie(state.base, {
      extracted: false,
      materialsFound: 21,
      researchFound: 7,
      preservedTechnologyIds: [],
      ...emptyContract,
    });

    expect(base.materials).toBe(10);
    expect(base.research).toBe(3);
    expect(base.credits).toBe(state.base.credits);
  });

  it('rejects negative rewards', () => {
    const state = createInitialGameState();

    expect(() =>
      settleSortie(state.base, {
        extracted: true,
        materialsFound: -1,
        researchFound: 0,
        preservedTechnologyIds: [],
        ...emptyContract,
      }),
    ).toThrow(RangeError);
  });

  it('delivers a preserved technology only after successful extraction', () => {
    const state = createInitialGameState();
    const delivered = settleSortie(state.base, {
      extracted: true,
      materialsFound: 0,
      researchFound: 0,
      preservedTechnologyIds: ['alien-prism-unclassified'],
      ...emptyContract,
    });
    const lost = settleSortie(state.base, {
      extracted: false,
      materialsFound: 0,
      researchFound: 0,
      preservedTechnologyIds: ['alien-prism-unclassified'],
      ...emptyContract,
    });

    expect(delivered.preservedTechnologyIds).toEqual(['alien-prism-unclassified']);
    expect(lost.preservedTechnologyIds).toEqual([]);
  });

  it('settles target bounties and breach penalties even when the sortie fails', () => {
    const state = createInitialGameState();
    const base = settleSortie(state.base, {
      extracted: false,
      materialsFound: 0,
      researchFound: 0,
      preservedTechnologyIds: [],
      targetsDestroyed: 3,
      targetsBreached: 1,
      creditsEarned: 28,
      creditsPenalized: 40,
      wardenSignalDetected: false,
    });

    expect(base.credits).toBe(state.base.credits - 12);
  });
});
