import { describe, expect, it } from 'vitest';
import { buildingById, buildingId } from '../../src/content/ids';

import { staffMember } from './test-state';
import { contentCatalog } from '../../src/content/catalog';
import { createInitialGameState } from '../../src/domain/initial-state';
import {
  equipPrimaryWeapon,
  manufactureAdaptedWeapon,
  researchTechnology,
} from '../../src/domain/technology-progression';

const technology = contentCatalog.alienTechnologies[0];
const moduleId = technology.weaponTransformation.id;
const laboratory = buildingById(buildingId.researchCentre)!;
const quarantine = buildingById(buildingId.quarantineCentre)!;
const adaptedBlueprint = contentCatalog.adaptedWeaponBlueprints[0];
const emitter = contentCatalog.weapons[2];
const requirements = {
  buildingId: laboratory.id,
  staffRoleId: contentCatalog.staffRoles[0].id,
  containmentBuildingId: quarantine.id,
  adaptedBlueprintId: adaptedBlueprint.id,
};

function stateWithPreservedPrism() {
  const state = createInitialGameState();
  return {
    ...state,
    base: {
      ...state.base,
      credits: 2_000_000,
      materials: 100,
      preservedTechnologyIds: [technology.id],
      constructedBuildingIds: [laboratory.id, quarantine.id],
      staff: [staffMember('staff-scientist-1', requirements.staffRoleId)],
    },
  };
}

function manufacturedEmitterState() {
  const researched = researchTechnology(stateWithPreservedPrism(), technology, requirements);
  return {
    ...researched,
    base: {
      ...researched.base,
      constructedBuildingIds: [laboratory.id, quarantine.id, buildingId.productionWorks],
      staff: [
        staffMember('staff-scientist-1', requirements.staffRoleId),
        staffMember('staff-engineer-1', contentCatalog.staffRoles[1].id),
      ],
    },
  };
}

describe('technology progression', () => {
  it('consumes a preserved sample and unlocks its adapted blueprint instead of the weapon', () => {
    const researched = researchTechnology(stateWithPreservedPrism(), technology, requirements);

    expect(researched.base.preservedTechnologyIds).toEqual([]);
    expect(researched.base.research).toBe(technology.preservationResearch);
    expect(researched.base.ownedPrimaryWeaponIds).toEqual([
      contentCatalog.weapons[0].id,
    ]);
    expect(researched.base.unlockedBlueprintIds).toEqual([adaptedBlueprint.id]);
    expect(researched.technologyCatalog).toEqual([{
      technologyId: technology.id,
      revealedProperties: [moduleId],
    }]);
  });

  it('manufactures the adapted emitter from its blueprint and staffed Works', () => {
    const manufactured = manufactureAdaptedWeapon(
      manufacturedEmitterState(),
      adaptedBlueprint,
      emitter,
    );

    expect(manufactured.base.ownedPrimaryWeaponIds).toEqual([
      contentCatalog.weapons[0].id,
      moduleId,
    ]);
    expect(manufactured.base.credits).toBe(
      manufacturedEmitterState().base.credits - adaptedBlueprint.productionCreditCost,
    );
    expect(manufactured.base.materials).toBe(
      manufacturedEmitterState().base.materials - adaptedBlueprint.productionMaterialCost,
    );
  });

  it('equips owned weapons into either primary slot without duplicating an item', () => {
    const manufactured = manufactureAdaptedWeapon(
      manufacturedEmitterState(),
      adaptedBlueprint,
      emitter,
    );
    const equipped = equipPrimaryWeapon(manufactured, moduleId, 1);

    expect(equipped.base.equippedPrimaryWeaponIds).toEqual([
      contentCatalog.weapons[0].id,
      moduleId,
    ]);
    expect(equipPrimaryWeapon(equipped, moduleId, 0)
      .base.equippedPrimaryWeaponIds).toEqual([moduleId, null]);
    expect(() => equipPrimaryWeapon(createInitialGameState(), moduleId, 1)).toThrow(
      'is not owned',
    );
  });

  it('requires the matching preserved sample', () => {
    const state = stateWithPreservedPrism();
    const withoutSample = {
      ...state,
      base: { ...state.base, preservedTechnologyIds: [] },
    };
    expect(() => researchTechnology(withoutSample, technology, requirements)).toThrow(
      'is not available for research',
    );
  });

  it('requires a laboratory and scientist', () => {
    const initial = createInitialGameState();
    const sampleOnly = {
      ...initial,
      base: { ...initial.base, preservedTechnologyIds: [technology.id] },
    };
    const laboratoryOnly = {
      ...sampleOnly,
      base: {
        ...sampleOnly.base,
        constructedBuildingIds: [laboratory.id, quarantine.id],
      },
    };

    expect(() => researchTechnology(sampleOnly, technology, requirements)).toThrow(
      'is required for research',
    );
    expect(() => researchTechnology(laboratoryOnly, technology, requirements)).toThrow(
      'Staff role',
    );
  });

  it('blocks analysis until the Quarantine Centre is constructed', () => {
    const state = stateWithPreservedPrism();
    const withoutQuarantine = {
      ...state,
      base: { ...state.base, constructedBuildingIds: [laboratory.id] },
    };

    expect(() => researchTechnology(withoutQuarantine, technology, requirements)).toThrow(
      'required for quarantine analysis',
    );
  });

  it('rejects manufacturing without the blueprint, Works, engineer, or duplicate build', () => {
    const researched = researchTechnology(stateWithPreservedPrism(), technology, requirements);
    const noWorks = {
      ...researched,
      base: { ...researched.base, constructedBuildingIds: [laboratory.id, quarantine.id] },
    };
    expect(() => manufactureAdaptedWeapon(noWorks, adaptedBlueprint, emitter)).toThrow(
      'is required for production',
    );

    const noEngineer = {
      ...noWorks,
      base: {
        ...noWorks.base,
        constructedBuildingIds: [
          laboratory.id,
          quarantine.id,
          buildingId.productionWorks,
        ],
      },
    };
    expect(() => manufactureAdaptedWeapon(noEngineer, adaptedBlueprint, emitter)).toThrow(
      'Staff role',
    );

    const manufactured = manufactureAdaptedWeapon(
      manufacturedEmitterState(),
      adaptedBlueprint,
      emitter,
    );
    expect(() => manufactureAdaptedWeapon(manufactured, adaptedBlueprint, emitter)).toThrow(
      'already been manufactured',
    );
  });
});
