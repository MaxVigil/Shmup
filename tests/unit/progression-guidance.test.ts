import { describe, expect, it } from 'vitest';
import { buildingId } from '../../src/content/ids';

import { staffMember } from './test-state';
import { contentCatalog } from '../../src/content/catalog';
import { createInitialGameState } from '../../src/domain/initial-state';
import {
  getProgressionObjective,
  type ProgressionDefinitions,
} from '../../src/domain/progression-guidance';

const definitions: ProgressionDefinitions = {
  laboratoryId: buildingId.researchCentre,
  workshopId: buildingId.productionWorks,
  scientistRoleId: contentCatalog.staffRoles[0].id,
  containmentBlueprintId: contentCatalog.buildingBlueprints[0].id,
  quarantineId: buildingId.quarantineCentre,
  adaptedBlueprintId: contentCatalog.adaptedWeaponBlueprints[0].id,
  adaptedWeaponId: contentCatalog.weapons[2].id,
};

describe('progression guidance', () => {
  it('guides a fresh profile through buildings, staff, and the warden signal', () => {
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
        staff: [staffMember('scientist-1', definitions.scientistRoleId)],
      },
    };
    expect(getProgressionObjective(staffed, definitions).kind).toBe('build-workshop');

    const withWorkshop = {
      ...staffed,
      base: {
        ...staffed.base,
        constructedBuildingIds: [definitions.laboratoryId, definitions.workshopId],
      },
    };
    expect(getProgressionObjective(withWorkshop, definitions).kind).toBe('await-warden-signal');
  });

  it('routes a recovered sample through the containment chain', () => {
    const initial = createInitialGameState();
    const ready = {
      ...initial,
      base: {
        ...initial.base,
        constructedBuildingIds: [definitions.laboratoryId, definitions.workshopId],
        staff: [staffMember('scientist-1', definitions.scientistRoleId)],
        preservedTechnologyIds: [contentCatalog.alienTechnologies[0].id],
        telemetryRecorded: true,
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
        unlockedBlueprintIds: [definitions.containmentBlueprintId],
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

  it('guides manufacture and equipping of the adapted weapon before the next recover', () => {
    const initial = createInitialGameState();
    const baseReady = {
      ...initial,
      base: {
        ...initial.base,
        constructedBuildingIds: [
          definitions.laboratoryId,
          definitions.workshopId,
          definitions.quarantineId,
        ],
        staff: [staffMember('scientist-1', definitions.scientistRoleId)],
        unlockedBlueprintIds: [definitions.adaptedBlueprintId],
        telemetryRecorded: true,
      },
    };
    expect(getProgressionObjective(baseReady, definitions).kind).toBe(
      'manufacture-adapted-weapon',
    );

    const owned = {
      ...baseReady,
      base: {
        ...baseReady.base,
        ownedPrimaryWeaponIds: [
          contentCatalog.weapons[0].id,
          definitions.adaptedWeaponId,
        ],
      },
    };
    expect(getProgressionObjective(owned, definitions).kind).toBe('equip-adapted-weapon');

    const equipped = {
      ...owned,
      base: {
        ...owned.base,
        equippedPrimaryWeaponIds: [
          contentCatalog.weapons[0].id,
          definitions.adaptedWeaponId,
        ] as const,
      },
    };
    expect(getProgressionObjective(equipped, definitions).kind).toBe('recover-artefact');
  });

  it('waits for Warden telemetry before opening the research chain', () => {
    const initial = createInitialGameState();
    const staffed = {
      ...initial,
      base: {
        ...initial.base,
        constructedBuildingIds: [definitions.laboratoryId, definitions.workshopId],
        staff: [staffMember('scientist-1', definitions.scientistRoleId)],
      },
    };
    expect(getProgressionObjective(staffed, definitions).kind).toBe('await-warden-signal');

    const withTelemetry = {
      ...staffed,
      base: { ...staffed.base, telemetryRecorded: true },
    };
    expect(getProgressionObjective(withTelemetry, definitions).kind).toBe('recover-artefact');
  });
});
