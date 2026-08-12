import { describe, expect, it } from 'vitest';
import { contentCatalog } from '../../src/content/catalog';
import { createInitialGameState } from '../../src/domain/initial-state';
import {
  getProgressionObjective,
  type ProgressionDefinitions,
} from '../../src/domain/progression-guidance';

const definitions: ProgressionDefinitions = {
  laboratoryId: contentCatalog.buildings[0].id,
  workshopId: contentCatalog.buildings[1].id,
  scientistRoleId: contentCatalog.staffRoles[0].id,
  engineerRoleId: contentCatalog.staffRoles[1].id,
  blueprintId: contentCatalog.blueprints[0].id,
  equipmentId: contentCatalog.equipment[0].id,
  containmentBlueprintId: contentCatalog.buildingBlueprints[0].id,
  quarantineId: contentCatalog.buildings[2].id,
};

describe('progression guidance', () => {
  it('guides a fresh profile through each Capturer prerequisite in order', () => {
    const initial = createInitialGameState();
    expect(getProgressionObjective(initial, definitions).kind).toBe('build-laboratory');

    const withLaboratory = {
      ...initial,
      base: { ...initial.base, constructedBuildingIds: [definitions.laboratoryId] },
    };
    expect(getProgressionObjective(withLaboratory, definitions).kind).toBe('hire-scientist');

    const staffed = {
      ...withLaboratory,
      base: {
        ...withLaboratory.base,
        staff: [{ id: 'scientist-1', roleId: definitions.scientistRoleId }],
      },
    };
    expect(getProgressionObjective(staffed, definitions).kind).toBe('build-workshop');

    const researching = {
      ...staffed,
      base: {
        ...staffed.base,
        constructedBuildingIds: [definitions.laboratoryId, definitions.workshopId],
        staff: [
          ...staffed.base.staff,
          { id: 'engineer-1', roleId: definitions.engineerRoleId },
        ],
        researchQueue: [{ blueprintId: definitions.blueprintId, progress: 1, requiredProgress: 3 }],
      },
    };
    expect(getProgressionObjective(researching, definitions)).toMatchObject({
      kind: 'advance-blueprint',
      progress: 1,
      requiredProgress: 3,
    });
  });

  it('ends with equipping the manufactured Capturer and recovering an artefact', () => {
    const initial = createInitialGameState();
    const ready = {
      ...initial,
      base: {
        ...initial.base,
        constructedBuildingIds: [definitions.laboratoryId, definitions.workshopId],
        staff: [
          { id: 'scientist-1', roleId: definitions.scientistRoleId },
          { id: 'engineer-1', roleId: definitions.engineerRoleId },
        ],
        unlockedBlueprintIds: [definitions.blueprintId],
        manufacturedEquipmentIds: [definitions.equipmentId],
      },
    };

    expect(getProgressionObjective(ready, definitions).kind).toBe('equip-equipment');
    expect(getProgressionObjective({
      ...ready,
      base: { ...ready.base, equippedEquipmentId: definitions.equipmentId },
    }, definitions).kind).toBe('recover-artefact');
  });

  it('requires a lead engineer before manufacturing a researched blueprint', () => {
    const initial = createInitialGameState();
    const withoutEngineer = {
      ...initial,
      base: {
        ...initial.base,
        constructedBuildingIds: [definitions.laboratoryId, definitions.workshopId],
        staff: [{ id: 'scientist-1', roleId: definitions.scientistRoleId }],
        unlockedBlueprintIds: [definitions.blueprintId],
      },
    };

    expect(getProgressionObjective(withoutEngineer, definitions).kind).toBe('hire-engineer');
  });

  it('routes a recovered sample through the containment chain', () => {
    const initial = createInitialGameState();
    const ready = {
      ...initial,
      base: {
        ...initial.base,
        constructedBuildingIds: [definitions.laboratoryId, definitions.workshopId],
        staff: [
          { id: 'scientist-1', roleId: definitions.scientistRoleId },
          { id: 'engineer-1', roleId: definitions.engineerRoleId },
        ],
        unlockedBlueprintIds: [definitions.blueprintId],
        manufacturedEquipmentIds: [definitions.equipmentId],
        equippedEquipmentId: definitions.equipmentId,
        preservedTechnologyIds: [contentCatalog.alienTechnologies[0].id],
      },
    };
    expect(getProgressionObjective(ready, definitions).kind).toBe('start-containment');

    const researching = {
      ...ready,
      base: {
        ...ready.base,
        researchQueue: [{
          blueprintId: definitions.containmentBlueprintId,
          progress: 1,
          requiredProgress: 3,
        }],
      },
    };
    expect(getProgressionObjective(researching, definitions)).toMatchObject({
      kind: 'advance-containment',
      progress: 1,
      requiredProgress: 3,
    });

    const unlocked = {
      ...researching,
      base: {
        ...researching.base,
        researchQueue: [],
        unlockedBlueprintIds: [
          definitions.blueprintId,
          definitions.containmentBlueprintId,
        ],
      },
    };
    expect(getProgressionObjective(unlocked, definitions).kind).toBe('construct-quarantine');

    const quarantined = {
      ...unlocked,
      base: {
        ...unlocked.base,
        constructedBuildingIds: [
          definitions.laboratoryId,
          definitions.workshopId,
          definitions.quarantineId,
        ],
      },
    };
    expect(getProgressionObjective(quarantined, definitions).kind).toBe('analyse-sample');
  });
});
