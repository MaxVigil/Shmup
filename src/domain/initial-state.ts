import type { GameState } from './model';
import { SAVE_SCHEMA_VERSION } from './model';
import { contentCatalog } from '../content/catalog';

export function createInitialGameState(): GameState {
  const startingWeapon = contentCatalog.weapons[0];
  return {
    schemaVersion: SAVE_SCHEMA_VERSION,
    base: {
      credits: contentCatalog.economy.startingCredits,
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
      preservedTechnologyIds: [],
      ownedPrimaryWeaponIds: [startingWeapon.id],
      equippedPrimaryWeaponIds: [startingWeapon.id, null],
      marketSeed: 0x3a7e2026,
      sortiesCompleted: 0,
      constructedBuildingIds: [],
      staff: [],
      unlockedBlueprintIds: [],
      locallyProducedWeaponIds: [],
      researchedWeaponUpgradeIds: [],
      manufacturedWeaponUpgradeIds: [],
      manufacturedEquipmentIds: [],
      equippedEquipmentId: null,
    },
    technologyCatalog: [],
    activeRun: null,
  };
}
