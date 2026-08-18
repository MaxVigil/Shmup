import { describe, expect, it } from 'vitest';
import { buildingById, buildingId } from '../../src/content/ids';

import { staffMember } from './test-state';
import { contentCatalog } from '../../src/content/catalog';
import { constructBuilding } from '../../src/domain/base-development';
import {
  advanceBlueprintResearch,
  startBlueprintResearch,
} from '../../src/domain/blueprint-progression';
import { createInitialGameState } from '../../src/domain/initial-state';
import type { GameState } from '../../src/domain/model';

const laboratory = buildingById(buildingId.researchCentre)!;
const workshop = buildingById(buildingId.productionWorks)!;
const scientist = contentCatalog.staffRoles[0];
const blueprint = contentCatalog.buildingBlueprints[0];

function researchReadyState() {
  const state = createInitialGameState();
  return {
    ...state,
    base: {
      ...state.base,
      credits: 2_000_000,
      materials: 100,
      constructedBuildingIds: [laboratory.id],
      staff: [staffMember('staff-scientist-1', scientist.id)],
    },
  };
}

function researchedState() {
  let state = startBlueprintResearch(researchReadyState(), blueprint);
  for (let index = 0; index < blueprint.requiredProgress; index += 1) {
    state = advanceBlueprintResearch(state, scientist.id);
  }
  return state;
}

describe('blueprint progression', () => {
  it('advances once per scientist on each completed sortie', () => {
    const started = startBlueprintResearch(researchReadyState(), blueprint);
    const advanced = advanceBlueprintResearch(started, scientist.id);

    expect(advanced.base.researchQueue).toEqual([{
      blueprintId: blueprint.id,
      progress: 1,
      requiredProgress: blueprint.requiredProgress,
    }]);
  });

  it('unlocks and removes a completed blueprint project', () => {
    const researched = researchedState();

    expect(researched.base.researchQueue).toEqual([]);
    expect(researched.base.unlockedBlueprintIds).toEqual([blueprint.id]);
  });

  it('rejects research without laboratory personnel', () => {
    expect(() => startBlueprintResearch(createInitialGameState(), blueprint)).toThrow(
      'is required for research',
    );
  });

  it('researches a building blueprint and constructs its Quarantine Centre', () => {
    const buildingBlueprint = contentCatalog.buildingBlueprints[0];
    const quarantine = buildingById(buildingId.quarantineCentre)!;
    let state: GameState = researchReadyState();
    state = startBlueprintResearch(state, buildingBlueprint);
    for (let index = 0; index < buildingBlueprint.requiredProgress; index += 1) {
      state = advanceBlueprintResearch(state, scientist.id);
    }

    expect(state.base.unlockedBlueprintIds).toEqual([buildingBlueprint.id]);
    state = constructBuilding(state, workshop);
    state = constructBuilding(state, quarantine);
    expect(state.base.constructedBuildingIds).toEqual([
      laboratory.id,
      workshop.id,
      quarantine.id,
    ]);
  });
});
