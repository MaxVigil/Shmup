import { describe, expect, it } from 'vitest';
import { contentCatalog } from '../../src/content/catalog';
import { createInitialGameState } from '../../src/domain/initial-state';
import {
  equipPrimaryWeapon,
  researchTechnology,
} from '../../src/domain/technology-progression';

const technology = contentCatalog.alienTechnologies[0];
const moduleId = technology.weaponTransformation.id;
const requirements = {
  buildingId: contentCatalog.buildings[0].id,
  staffRoleId: contentCatalog.staffRoles[0].id,
};

function stateWithPreservedPrism() {
  const state = createInitialGameState();
  return {
    ...state,
    base: {
      ...state.base,
      preservedTechnologyIds: [technology.id],
      constructedBuildingIds: [requirements.buildingId],
      staff: [{ id: 'staff-scientist-1', roleId: requirements.staffRoleId }],
    },
  };
}

describe('technology progression', () => {
  it('consumes a preserved sample and unlocks its stable weapon module', () => {
    const researched = researchTechnology(stateWithPreservedPrism(), technology, requirements);

    expect(researched.base.preservedTechnologyIds).toEqual([]);
    expect(researched.base.research).toBe(technology.preservationResearch);
    expect(researched.base.ownedPrimaryWeaponIds).toEqual([
      contentCatalog.weapons[0].id,
      moduleId,
    ]);
    expect(researched.technologyCatalog).toEqual([{
      technologyId: technology.id,
      revealedProperties: [moduleId],
    }]);
  });

  it('equips owned weapons into either primary slot without duplicating an item', () => {
    const researched = researchTechnology(stateWithPreservedPrism(), technology, requirements);
    const equipped = equipPrimaryWeapon(researched, moduleId, 1);

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
        constructedBuildingIds: [requirements.buildingId],
      },
    };

    expect(() => researchTechnology(sampleOnly, technology, requirements)).toThrow(
      'is required for research',
    );
    expect(() => researchTechnology(laboratoryOnly, technology, requirements)).toThrow(
      'Staff role',
    );
  });
});
