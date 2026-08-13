import { describe, expect, it } from 'vitest';
import { contentCatalog } from '../../src/content/catalog';
import { constructBuilding, hireStaff } from '../../src/domain/base-development';
import { createInitialGameState } from '../../src/domain/initial-state';
import { staffMember } from './test-state';

const laboratory = contentCatalog.buildings[0];
const scientist = contentCatalog.staffRoles[0];
const workshop = contentCatalog.buildings[1];
const engineer = contentCatalog.staffRoles[1];

function fundedState() {
  const state = createInitialGameState();
  return {
    ...state,
    base: {
      ...state.base,
      materials: laboratory.materialCost,
    },
  };
}

describe('base development', () => {
  it('constructs the laboratory using credits and materials', () => {
    const state = fundedState();
    const constructed = constructBuilding(state, laboratory);

    expect(constructed.base.credits).toBe(state.base.credits - laboratory.creditCost);
    expect(constructed.base.materials).toBe(0);
    expect(constructed.base.constructedBuildingIds).toEqual([laboratory.id]);
  });

  it('hires only one lead engineer into the Production Works', () => {
    const initial = createInitialGameState();
    const ready = {
      ...initial,
      base: {
        ...initial.base,
        credits: 500,
        constructedBuildingIds: [laboratory.id, workshop.id],
      },
    };
    const hired = hireStaff(ready, engineer);

    expect(hired.base.staff).toEqual([staffMember('staff-engineer-1', engineer.id)]);
    expect(() => hireStaff(hired, engineer)).toThrow('headcount limit');
  });

  it('requires resources and prevents duplicate construction', () => {
    expect(() => constructBuilding(createInitialGameState(), laboratory)).toThrow(
      'Insufficient resources',
    );
    const constructed = constructBuilding(fundedState(), laboratory);
    expect(() => constructBuilding(constructed, laboratory)).toThrow(
      'already been constructed',
    );
  });

  it('hires scientists only into a constructed laboratory', () => {
    expect(() => hireStaff(createInitialGameState(), scientist)).toThrow(
      'is required to hire',
    );
    const constructed = constructBuilding(fundedState(), laboratory);
    const hired = hireStaff(constructed, scientist);

    expect(hired.base.staff).toEqual([staffMember('staff-scientist-1', scientist.id)]);
    expect(hired.base.credits).toBe(constructed.base.credits - scientist.creditCost);
  });

  it('requires the R&D Centre before constructing the Production Works', () => {
    const state = fundedState();
    const fundedWorkshop = {
      ...state,
      base: {
        ...state.base,
        credits: workshop.creditCost,
        materials: workshop.materialCost,
      },
    };

    expect(() => constructBuilding(fundedWorkshop, workshop)).toThrow(
      'Building building-laboratory is required',
    );

    const withCentre = {
      ...fundedWorkshop,
      base: {
        ...fundedWorkshop.base,
        constructedBuildingIds: [laboratory.id],
      },
    };
    expect(constructBuilding(withCentre, workshop).base.constructedBuildingIds).toEqual([
      laboratory.id,
      workshop.id,
    ]);
  });
});
