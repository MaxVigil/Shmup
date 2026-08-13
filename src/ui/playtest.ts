import { contentCatalog } from '../content/catalog';
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

export const temporaryPlaytestMode =
  stage4PlaytestMode || insolvencyPlaytestMode || m3g2PlaytestMode || m3g3aPlaytestMode;

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
        roleId: contentCatalog.staffRoles[0].id,
        firstName: 'Playtest',
        lastName: 'Specialist',
        tier: 1,
        progressMultiplier: 1,
        salaryMultiplier: 1,
      }],
      unlockedBlueprintIds: [contentCatalog.blueprints[0].id],
      manufacturedEquipmentIds: [contentCatalog.equipment[0].id],
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
        roleId: contentCatalog.staffRoles[0].id,
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
      preservedTechnologyIds: [contentCatalog.alienTechnologies[0].id],
      constructedBuildingIds: [
        contentCatalog.buildings[0].id,
        contentCatalog.buildings[1].id,
      ],
      staff: [{
        id: 'staff-scientist-1',
        roleId: contentCatalog.staffRoles[0].id,
        firstName: 'Playtest',
        lastName: 'Specialist',
        tier: 1,
        progressMultiplier: 1,
        salaryMultiplier: 1,
      }],
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
  if (stage4PlaytestMode) {
    return createStage4PlaytestState();
  }
  return undefined;
}
