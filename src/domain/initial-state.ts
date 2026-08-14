import type { GameState } from './model';
import { SAVE_SCHEMA_VERSION } from './model';
import { contentCatalog } from '../content/catalog';
import { generateThreatMap } from './command-centre';
import { generateStaffCandidates } from './staff-market';
import { generatePilotCandidates, STARTER_PILOT_ID } from './pilot-market';

export function createInitialGameState(): GameState {
  const startingWeapon = contentCatalog.weapons[0];
  const startingAircraft = contentCatalog.aircraft[0];
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
          id: STARTER_PILOT_ID,
          unlocked: true,
          firstName: 'Kestrel',
          lastName: '',
          specialization: 'recovery',
          salaryCreditCost: 80_000,
        },
        {
          id: 'pilot-yaroslava',
          unlocked: true,
          firstName: 'Yaroslava',
          lastName: 'Kovalenko',
          specialization: 'speed',
          salaryCreditCost: 80_000,
        },
      ],
      activePilotId: STARTER_PILOT_ID,
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
      researchedAircraftUpgradeIds: [],
      manufacturedAircraftUpgradeIds: [],
      manufacturedEquipmentIds: [],
      equippedEquipmentId: null,
      telemetryRecorded: false,
      hangarSlots: [startingAircraft.id, null],
      activeAircraftId: startingAircraft.id,
      month: 1,
      fueledAircraftIds: [startingAircraft.id],
      threatMap: generateThreatMap(
        contentCatalog.councilStates,
        0x3a7e2026,
        1,
      ),
      loans: [],
      aircraftLoadouts: {
        [startingAircraft.id]: [
          startingWeapon.id,
          ...Array.from(
            { length: startingAircraft.weaponSlotCount - 1 },
            () => null,
          ),
        ],
      },
      weaponStock: {},
      consumableStock: {},
      aircraftModules: { [startingAircraft.id]: null },
      aircraftDamage: {},
      aircraftRepair: {},
      staffCandidates: generateStaffCandidates(
        contentCatalog.staffRoles,
        0x3a7e2026,
        1,
      ),
      staffXp: {},
      constructionQueue: [],
      productionQueue: [],
      resolvedThreatIds: [],
      pilotCandidates: generatePilotCandidates(0x3a7e2026, 1),
      pilotXp: {},
      pilotFatigue: {},
      activeMissionId: null,
      monthIncome: 0,
      monthReport: null,
      nationThanks: {},
    },
    technologyCatalog: [],
    activeRun: null,
  };
}
