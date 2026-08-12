import type { GameState, SortieOutcome } from './model';
import { isBankrupt } from './operational-economy';

export interface SortiePayoffSummary {
  readonly creditDelta: number;
  readonly creditsEarned: number;
  readonly creditsPenalized: number;
  readonly targetsDestroyed: number;
  readonly targetsBreached: number;
  readonly creditBalance: number;
  readonly bankrupt: boolean;
  readonly materialsReceived: number;
  readonly blueprintProgress: number;
  readonly blueprintCompleted: boolean;
}

export function summarizeSortiePayoff(
  before: GameState,
  after: GameState,
  blueprintId: string,
  outcome: SortieOutcome,
): SortiePayoffSummary {
  const projectBefore = before.base.researchQueue.find(
    (project) => project.blueprintId === blueprintId,
  );
  const projectAfter = after.base.researchQueue.find(
    (project) => project.blueprintId === blueprintId,
  );
  const blueprintCompleted = (
    projectBefore !== undefined &&
    after.base.unlockedBlueprintIds.includes(blueprintId)
  );

  return {
    creditDelta: after.base.credits - before.base.credits,
    creditsEarned: outcome.creditsEarned,
    creditsPenalized: outcome.creditsPenalized,
    targetsDestroyed: outcome.targetsDestroyed,
    targetsBreached: outcome.targetsBreached,
    creditBalance: after.base.credits,
    bankrupt: isBankrupt(after.base.credits),
    materialsReceived: after.base.materials - before.base.materials,
    blueprintProgress: projectBefore === undefined
      ? 0
      : blueprintCompleted
        ? projectBefore.requiredProgress - projectBefore.progress
        : (projectAfter?.progress ?? projectBefore.progress) - projectBefore.progress,
    blueprintCompleted,
  };
}
