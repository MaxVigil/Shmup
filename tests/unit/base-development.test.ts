import { describe, expect, it } from 'vitest';
import { contentCatalog } from '../../src/content/catalog';
import { constructBuilding, hireStaff } from '../../src/domain/base-development';
import { createInitialGameState } from '../../src/domain/initial-state';
import { dismissStaff } from '../../src/domain/staff-market';
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

  it('caps production engineers at the workshop headcount limit', () => {
    const initial = createInitialGameState();
    const ready = {
      ...initial,
      base: {
        ...initial.base,
        credits: 1_500_000,
        constructedBuildingIds: [laboratory.id, workshop.id],
      },
    };
    const first = hireStaff(ready, engineer);
    expect(first.base.staff).toEqual([staffMember('staff-engineer-1', engineer.id)]);
    const second = hireStaff(first, engineer);
    expect(second.base.staff).toHaveLength(2);
    const third = hireStaff(second, engineer);
    expect(third.base.staff).toHaveLength(3);
    expect(() => hireStaff(third, engineer)).toThrow('headcount limit');
  });

  it('dismisses a hired staff member and removes their XP', () => {
    const initial = createInitialGameState();
    const ready = {
      ...initial,
      base: {
        ...initial.base,
        credits: 1_000_000,
        constructedBuildingIds: [laboratory.id],
      },
    };
    const hired = hireStaff(ready, scientist);
    const member = hired.base.staff[0];
    expect(member).toBeDefined();
    const withXp = {
      ...hired,
      base: { ...hired.base, staffXp: { [member?.id ?? '']: 4 } },
    };
    const dismissed = dismissStaff(withXp.base, member?.id ?? '');
    expect(dismissed.staff).toHaveLength(0);
    expect(dismissed.staffXp[member?.id ?? '']).toBeUndefined();
    expect(() => dismissStaff(withXp.base, 'staff-missing')).toThrow('not on the roster');
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
    const funded = {
      ...fundedState(),
      base: { ...fundedState().base, credits: 1_000_000 },
    };
    const constructed = constructBuilding(funded, laboratory);
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
