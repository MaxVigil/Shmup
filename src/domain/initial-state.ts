import type { GameState } from './model';
import { SAVE_SCHEMA_VERSION } from './model';

export function createInitialGameState(): GameState {
  return {
    schemaVersion: SAVE_SCHEMA_VERSION,
    base: {
      materials: 0,
      research: 0,
      energyCapacity: 6,
      allocatedEnergy: 0,
      pilots: [
        {
          id: 'pilot-kestrel',
          unlocked: true,
        },
      ],
      activePilotId: 'pilot-kestrel',
      researchQueue: [],
    },
    technologyCatalog: [],
    activeRun: null,
  };
}
