import { contentCatalog } from '../content/catalog';
import {
  aircraftById,
  aircraftId,
  alienTechnologyId,
  buildingId,
  staffRoleId,
  weaponId,
} from '../content/ids';
import { createInitialGameState } from '../domain/initial-state';
import type { GameState } from '../domain/model';

const stage4PlaytestMode = import.meta.env.DEV &&
  new URLSearchParams(window.location.search).get('stage4Ready') === 'true';
const insolvencyPlaytestMode = import.meta.env.DEV &&
  new URLSearchParams(window.location.search).get('m3eBankrupt') === 'true';
const m3g2PlaytestMode = import.meta.env.DEV &&
  new URLSearchParams(window.location.search).get('m3g2Ready') === 'true';
const m3g3aPlaytestMode = import.meta.env.DEV &&
  new URLSearchParams(window.location.search).get('m3g3aReady') === 'true';
export const hardpointsPlaytestMode = import.meta.env.DEV &&
  new URLSearchParams(window.location.search).get('hardpointsReady') === 'true';
export const alienReadyPlaytestMode = import.meta.env.DEV &&
  new URLSearchParams(window.location.search).get('alienReady') === 'true';

export const temporaryPlaytestMode =
  stage4PlaytestMode || insolvencyPlaytestMode || m3g2PlaytestMode ||
  m3g3aPlaytestMode || hardpointsPlaytestMode || alienReadyPlaytestMode;

function createStage4PlaytestState(): GameState {
  const state = createInitialGameState();
  return {
    ...state,
    base: {
      ...state.base,
      credits: 1_000,
      materials: 100,
      constructedBuildingIds: contentCatalog.buildings.map((building) => building.id),
      staff: [{
        id: 'staff-scientist-1',
        roleId: staffRoleId.scientist,
        firstName: 'Playtest',
        lastName: 'Specialist',
        tier: 1,
        progressMultiplier: 1,
        salaryMultiplier: 1,
      }],
      unlockedBlueprintIds: [],
      manufacturedEquipmentIds: [],
    },
  };
}

function createInsolvencyPlaytestState(): GameState {
  const state = createInitialGameState();
  return {
    ...state,
    base: { ...state.base, credits: 0 },
  };
}

function createM3g2PlaytestState(): GameState {
  const state = createInitialGameState();
  return {
    ...state,
    base: {
      ...state.base,
      credits: 2_500,
      materials: 200,
      sortiesCompleted: 6,
      constructedBuildingIds: contentCatalog.buildings.map((building) => building.id),
      staff: [{
        id: 'staff-scientist-1',
        roleId: staffRoleId.scientist,
        firstName: 'Playtest',
        lastName: 'Specialist',
        tier: 1,
        progressMultiplier: 1,
        salaryMultiplier: 1,
      }],
    },
  };
}

function createM3g3aPlaytestState(): GameState {
  const state = createInitialGameState();
  return {
    ...state,
    base: {
      ...state.base,
      credits: 1_500,
      materials: 60,
      preservedTechnologyIds: [alienTechnologyId.prism],
      constructedBuildingIds: [
        buildingId.researchCentre,
        buildingId.productionWorks,
      ],
      staff: [{
        id: 'staff-scientist-1',
        roleId: staffRoleId.scientist,
        firstName: 'Playtest',
        lastName: 'Specialist',
        tier: 1,
        progressMultiplier: 1,
        salaryMultiplier: 1,
      }],
    },
  };
}

function createAlienReadyState(): GameState {
  const state = createInitialGameState();
  const gunship = aircraftById(aircraftId.usa)!;
  const lance = weaponId.disintegrationLance;
  const orb = weaponId.plasmaOrbProjector;
  const singularity = weaponId.singularityProjector;
  const primaryLoadout: (string | null)[] = [lance, orb, singularity];
  return {
    ...state,
    base: {
      ...state.base,
      credits: 50_000,
      hangarSlots: [gunship.id, null],
      activeAircraftId: gunship.id,
      fueledAircraftIds: [gunship.id],
      aircraftLoadouts: {
        ...state.base.aircraftLoadouts,
        [gunship.id]: primaryLoadout,
      },
      equippedPrimaryWeaponIds: primaryLoadout,
      weaponStock: {
        [lance]: 1,
        [orb]: 1,
        [singularity]: 1,
      },
      // Full auxiliary ammunition so every hardpoint weapon is testable in one
      // session (combine with ?hardpointsReady=true to install the items).
      consumableStock: {
        'consumable-rocket': 12,
        'consumable-homing-missile': 10,
        'consumable-heavy-torpedo': 4,
        'consumable-cluster-missile': 6,
        'consumable-ukrainian-attack-drone': 20,
        'consumable-flare-decoy': 6,
        'consumable-proximity-mine': 12,
      },
    },
  };
}

export function resolveInitialState(): GameState | undefined {
  if (insolvencyPlaytestMode) {
    return createInsolvencyPlaytestState();
  }
  if (m3g2PlaytestMode) {
    return createM3g2PlaytestState();
  }
  if (m3g3aPlaytestMode) {
    return createM3g3aPlaytestState();
  }
  if (alienReadyPlaytestMode) {
    return createAlienReadyState();
  }
  if (stage4PlaytestMode) {
    return createStage4PlaytestState();
  }
  return undefined;
}
