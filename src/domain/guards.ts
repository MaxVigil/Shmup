import type { GameState } from './model';
import { SAVE_SCHEMA_VERSION } from './model';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function isGameState(value: unknown): value is GameState {
  if (!isRecord(value) || value.schemaVersion !== SAVE_SCHEMA_VERSION) {
    return false;
  }

  if (!isRecord(value.base)) {
    return false;
  }

  return (
    typeof value.base.materials === 'number' &&
    typeof value.base.research === 'number' &&
    typeof value.base.energyCapacity === 'number' &&
    typeof value.base.allocatedEnergy === 'number' &&
    typeof value.base.activePilotId === 'string' &&
    Array.isArray(value.base.pilots) &&
    Array.isArray(value.base.researchQueue) &&
    Array.isArray(value.technologyCatalog) &&
    (value.activeRun === null || isRecord(value.activeRun))
  );
}
