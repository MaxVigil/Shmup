import { describe, expect, it } from 'vitest';
import { createInitialGameState } from '../../src/domain/initial-state';
import {
  advancePilotRecovery,
  applyPilotInjury,
  hasMedicalTreatmentCapability,
  killPilot,
  medicHealingRate,
  OUTSOURCE_COUNTRY_MULTIPLIER,
  outsourceTreatmentCost,
  rollPilotCasualty,
  treatPilotInMedical,
  treatPilotOutsource,
} from '../../src/domain/pilot-medical';
import { assignPilot } from '../../src/domain/pilot-market';
import { monthlyExpenses } from '../../src/domain/operational-economy';
import type { RandomSource } from '../../src/domain/rng';
import type { StaffMemberState } from '../../src/domain/model';

function rngReturning(value: number): RandomSource {
  return {
    next: () => value,
    integer: (min: number) => min,
  };
}

function staffMember(
  id: string,
  roleId: string,
  salaryMultiplier = 1,
): StaffMemberState {
  return {
    id,
    roleId,
    firstName: 'Test',
    lastName: 'Specialist',
    tier: 1,
    progressMultiplier: 1,
    salaryMultiplier,
  };
}

describe('pilot medical system', () => {
  it('rolls casualties with damage-scaled cumulative thresholds', () => {
    // Full armour loss (p=1): 0.5% death, 1.5% severe, 4% medium, 8% light.
    expect(rollPilotCasualty(1, rngReturning(0.001))).toBe('death');
    expect(rollPilotCasualty(1, rngReturning(0.01))).toBe('severe');
    expect(rollPilotCasualty(1, rngReturning(0.04))).toBe('medium');
    expect(rollPilotCasualty(1, rngReturning(0.1))).toBe('light');
    expect(rollPilotCasualty(1, rngReturning(0.5))).toBeNull();
    // Undamaged sorties can never wound a pilot.
    expect(rollPilotCasualty(0, rngReturning(0.001))).toBeNull();
    // A scratch keeps casualties proportionally much rarer.
    expect(rollPilotCasualty(0.1, rngReturning(0.02))).toBeNull();
  });

  it('records an injury with the base recovery timeline', () => {
    const initial = createInitialGameState();
    const id = initial.base.pilots[0]?.id ?? '';
    const injured = applyPilotInjury(initial.base, id, 'severe');
    expect(injured.pilotInjuries[id]).toEqual({
      severity: 'severe',
      monthsRemaining: 6,
      treatment: null,
    });
    expect(injured.pilotInjuries[id]?.treatment).toBeNull();
  });

  it('removes a fallen pilot from service and clears their record', () => {
    const initial = createInitialGameState();
    const id = initial.base.activePilotId ?? '';
    const base = {
      ...initial.base,
      pilotXp: { ...initial.base.pilotXp, [id]: 9 },
      pilotFatigue: { ...initial.base.pilotFatigue, [id]: 0.5 },
    };
    const dead = killPilot(base, id, 4);
    expect(dead.deadPilotIds).toContain(id);
    expect(dead.pilotDeathMonth[id]).toBe(4);
    expect(dead.activePilotId).toBeNull();
    expect(dead.pilotXp[id]).toBeUndefined();
    expect(dead.pilotFatigue[id]).toBeUndefined();
  });

  it('blocks assigning dead or injured pilots', () => {
    const initial = createInitialGameState();
    const id = initial.base.pilots[1]?.id ?? '';
    expect(() => assignPilot(killPilot(initial.base, id, 2), id)).toThrow('died');
    const injured = applyPilotInjury(initial.base, id, 'light');
    expect(() => assignPilot(injured, id)).toThrow('recovering');
  });

  it('charges per-country outsource treatment prices with the PRC cheapest', () => {
    const initial = createInitialGameState();
    const id = initial.base.pilots[0]?.id ?? '';
    const injured = applyPilotInjury(initial.base, id, 'severe');
    const prc = outsourceTreatmentCost(injured, id, 'council-prc');
    const usa = outsourceTreatmentCost(injured, id, 'council-usa');
    expect(prc).toBeLessThan(usa);
    expect(prc).toBe(400_000 * (OUTSOURCE_COUNTRY_MULTIPLIER['council-prc'] ?? 1));
    const treated = treatPilotOutsource(
      { ...injured, credits: prc },
      id,
      'council-prc',
    );
    expect(treated.credits).toBe(0);
    expect(treated.pilotInjuries[id]?.treatment).toBe('outsource');
    expect(() => treatPilotOutsource(treated, id, 'council-prc')).toThrow('already');
  });

  it('requires the Medical Block and a medic for in-house treatment', () => {
    const initial = createInitialGameState();
    const id = initial.base.pilots[0]?.id ?? '';
    const injured = applyPilotInjury(initial.base, id, 'light');
    expect(hasMedicalTreatmentCapability(injured)).toBe(false);
    expect(() => treatPilotInMedical(injured, id)).toThrow('Medical Block');
    const staffed = {
      ...injured,
      constructedBuildingIds: [...injured.constructedBuildingIds, 'building-medical-block'],
      staff: [...injured.staff, staffMember('medic-1', 'staff-medic')],
    };
    expect(hasMedicalTreatmentCapability(staffed)).toBe(true);
    const treated = treatPilotInMedical(staffed, id);
    expect(treated.pilotInjuries[id]?.treatment).toBe('medical');
  });

  it('accelerates recovery with medics (2-3 medics reach 2x-3x)', () => {
    const initial = createInitialGameState();
    const one = {
      ...initial.base,
      staff: [staffMember('medic-1', 'staff-medic')],
    };
    const two = {
      ...initial.base,
      staff: [staffMember('medic-1', 'staff-medic'), staffMember('medic-2', 'staff-medic')],
    };
    const three = {
      ...initial.base,
      staff: [
        staffMember('medic-1', 'staff-medic'),
        staffMember('medic-2', 'staff-medic'),
        staffMember('medic-3', 'staff-medic'),
      ],
    };
    expect(medicHealingRate(one)).toBeCloseTo(1.5);
    expect(medicHealingRate(two)).toBeCloseTo(2);
    expect(medicHealingRate(three)).toBeCloseTo(2.5);
  });

  it('advances recovery only for treated pilots and faster in the Medical Block', () => {
    const initial = createInitialGameState();
    const id = initial.base.pilots[0]?.id ?? '';
    const injured = applyPilotInjury(initial.base, id, 'severe');
    // Untreated pilots never recover on their own.
    expect(advancePilotRecovery(injured).pilotInjuries[id]?.monthsRemaining).toBe(6);
    // State outsourcing heals at the base one-month-per-month speed.
    const outsource = treatPilotOutsource({ ...injured, credits: 1_000_000 }, id, 'council-ukraine');
    const afterOneMonth = advancePilotRecovery(outsource);
    expect(afterOneMonth.pilotInjuries[id]?.monthsRemaining).toBeCloseTo(5);
    // Two medics halve the Medical Block recovery time.
    const medical = treatPilotInMedical(
      {
        ...injured,
        constructedBuildingIds: [...injured.constructedBuildingIds, 'building-medical-block'],
        staff: [staffMember('medic-1', 'staff-medic'), staffMember('medic-2', 'staff-medic')],
      },
      id,
    );
    const medicalAfterTwoMonths = advancePilotRecovery(advancePilotRecovery(medical));
    expect(medicalAfterTwoMonths.pilotInjuries[id]?.monthsRemaining).toBeLessThan(3);
  });

  it('caps monthly staff salaries below the cap except for the manager', () => {
    const initial = createInitialGameState();
    const base = {
      ...initial.base,
      staff: [
        staffMember('scientist-1', 'staff-scientist', 1.5),
        staffMember('manager-1', 'staff-manager', 1.5),
      ],
    };
    const expenses = monthlyExpenses(base);
    // Scientist raw salary 8000x1.5 is clamped to the 10k cap; the manager
    // keeps 25000x1.5; the two starter pilots add 8000 each.
    expect(expenses.salaries).toBe(10_000 + Math.round(25_000 * 1.5) + 16_000);
  });
});

