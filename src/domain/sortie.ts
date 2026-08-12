import type { BaseState, SortieOutcome } from './model';
import { contractCreditDelta } from './operational-economy';

export const FAILED_SORTIE_RETENTION = 0.5;

function retainedAmount(amount: number, retention: number): number {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new RangeError('Sortie rewards must be finite, non-negative numbers.');
  }

  return Math.floor(amount * retention);
}

export function settleSortie(base: BaseState, outcome: SortieOutcome): BaseState {
  const retention = outcome.extracted ? 1 : FAILED_SORTIE_RETENTION;
  for (const value of [
    outcome.targetsDestroyed,
    outcome.targetsBreached,
    outcome.creditsEarned,
    outcome.creditsPenalized,
  ]) {
    if (!Number.isInteger(value) || value < 0) {
      throw new RangeError('Sortie contract values must be non-negative integers.');
    }
  }

  return {
    ...base,
    credits: base.credits + contractCreditDelta(outcome),
    sortiesCompleted: base.sortiesCompleted + 1,
    materials: base.materials + retainedAmount(outcome.materialsFound, retention),
    research: base.research + retainedAmount(outcome.researchFound, retention),
    preservedTechnologyIds: outcome.extracted
      ? [...new Set([...base.preservedTechnologyIds, ...outcome.preservedTechnologyIds])]
      : base.preservedTechnologyIds,
  };
}
