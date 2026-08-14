import { describe, expect, it } from 'vitest';
import { contentCatalog } from '../../src/content/catalog';
import { createInitialGameState } from '../../src/domain/initial-state';
import { summarizeSortiePayoff } from '../../src/domain/sortie-payoff';

const blueprintId = contentCatalog.blueprints[0].id;
const outcome = {
  extracted: true,
  materialsFound: 8,
  researchFound: 0,
  preservedTechnologyIds: [],
  targetsDestroyed: 25,
  targetsBreached: 0,
  creditsEarned: 200_000,
  creditsPenalized: 0,
  wardenSignalDetected: false,
} as const;

describe('sortie payoff summary', () => {
  it('reports resources and research progress separately', () => {
    const initial = createInitialGameState();
    const before = {
      ...initial,
      base: {
        ...initial.base,
        researchQueue: [{ blueprintId, progress: 1, requiredProgress: 3 }],
      },
    };
    const after = {
      ...before,
      base: {
        ...before.base,
        credits: before.base.credits + 200_000,
        materials: before.base.materials + 8,
        researchQueue: [{ blueprintId, progress: 2, requiredProgress: 3 }],
      },
    };

    expect(summarizeSortiePayoff(before, after, blueprintId, outcome)).toEqual({
      creditDelta: 200_000,
      creditsEarned: 200_000,
      creditsPenalized: 0,
      targetsDestroyed: 25,
      targetsBreached: 0,
      creditBalance: after.base.credits,
      bankrupt: false,
      materialsReceived: 8,
      blueprintProgress: 1,
      blueprintCompleted: false,
    });
  });

  it('reports project completion when the queue entry becomes an unlock', () => {
    const initial = createInitialGameState();
    const before = {
      ...initial,
      base: {
        ...initial.base,
        researchQueue: [{ blueprintId, progress: 2, requiredProgress: 3 }],
      },
    };
    const after = {
      ...before,
      base: {
        ...before.base,
        researchQueue: [],
        unlockedBlueprintIds: [blueprintId],
      },
    };

    expect(summarizeSortiePayoff(before, after, blueprintId, outcome)).toMatchObject({
      blueprintProgress: 1,
      blueprintCompleted: true,
    });
  });

  it('reports insolvency after breach penalties exhaust the reserve', () => {
    const before = createInitialGameState();
    const after = {
      ...before,
      base: { ...before.base, credits: -20_000 },
    };
    const insolventOutcome = {
      ...outcome,
      targetsDestroyed: 0,
      targetsBreached: 13,
      creditsEarned: 0,
      creditsPenalized: 520_000,
    };

    expect(
      summarizeSortiePayoff(before, after, blueprintId, insolventOutcome),
    ).toMatchObject({
      creditDelta: -520_000,
      creditBalance: -20_000,
      bankrupt: true,
    });
  });
});
