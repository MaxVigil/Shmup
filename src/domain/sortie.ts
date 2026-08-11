import type { BaseState, SortieOutcome } from './model';

export const FAILED_SORTIE_RETENTION = 0.5;

function retainedAmount(amount: number, retention: number): number {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new RangeError('Sortie rewards must be finite, non-negative numbers.');
  }

  return Math.floor(amount * retention);
}

export function settleSortie(base: BaseState, outcome: SortieOutcome): BaseState {
  const retention = outcome.extracted ? 1 : FAILED_SORTIE_RETENTION;

  return {
    ...base,
    materials: base.materials + retainedAmount(outcome.materialsFound, retention),
    research: base.research + retainedAmount(outcome.researchFound, retention),
  };
}
