import type { GameState } from './model';
import { SAVE_SCHEMA_VERSION } from './model';
import { contentCatalog } from '../content/catalog';
import {
  aircraftById,
  aircraftId,
  aircraftLoadoutByAircraftId,
  STARTER_BUILDING_IDS,
  weaponById,
  weaponId,
} from '../content/ids';
import { generateThreatMap } from './command-centre';
import { generateStaffCandidates } from './staff-market';
import { generatePilotCandidates, STARTER_PILOT_ID } from './pilot-market';

export function createInitialGameState(): GameState {
  const startingWeapon = weaponById(weaponId.pulseCannon)!;
  const startingAircraft = aircraftById(aircraftId.india)!;
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
          salaryCreditCost: 8_000,
        },
        {
          id: 'pilot-yaroslava',
          unlocked: true,
          firstName: 'Yaroslava',
          lastName: 'Kovalenko',
          specialization: 'speed',
          salaryCreditCost: 8_000,
        },
      ],
      activePilotId: STARTER_PILOT_ID,
      aircraftInstances: {
        [startingAircraft.id]: {
          id: `aircraft-instance-${startingAircraft.id}`,
          definitionId: startingAircraft.id,
          callsign: 'Kestrel',
          assignedPilotId: STARTER_PILOT_ID,
          status: 'ready',
          historyId: `history-${startingAircraft.id}`,
        },
      },
      aircraftHistory: {
        [`history-${startingAircraft.id}`]: {
          id: `history-${startingAircraft.id}`,
          definitionId: startingAircraft.id,
          callsign: 'Kestrel',
          acquiredMonth: 1,
          destroyedMonth: null,
          legacyImported: false,
          missions: 0,
          kills: 0,
          eliteKills: 0,
        },
      },
      researchQueue: [],
      preservedTechnologyIds: [],
      ownedPrimaryWeaponIds: [startingWeapon.id],
      equippedPrimaryWeaponIds: [startingWeapon.id, null],
      marketSeed: 0x3a7e2026,
      sortiesCompleted: 0,
      constructedBuildingIds: [...STARTER_BUILDING_IDS],
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
      aircraftHardpoints: {
        [startingAircraft.id]: Array.from(
          {
            length:
              aircraftLoadoutByAircraftId(startingAircraft.id)?.loadout
                .hardpointSlots ?? 0,
          },
          () => null,
        ),
      },
      aircraftMarks: {},
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
      missionResults: [],
      intelFacts: [],
      pilotCandidates: generatePilotCandidates(0x3a7e2026, 1),
      pilotXp: {},
      pilotFatigue: {},
      pilotInjuries: {},
      deadPilotIds: [],
      pilotDeathMonth: {},
      activeMissionId: null,
      monthIncome: 0,
      monthReport: null,
      nationThanks: {},
    },
    technologyCatalog: [],
    activeRun: null,
  };
}
