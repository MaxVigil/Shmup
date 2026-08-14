import { describe, expect, it } from 'vitest';
import { createInitialGameState } from '../../src/domain/initial-state';
import {
  assignPilot,
  awardPilotProgress,
  generatePilotCandidates,
  hirePilotCandidate,
  isPilotFatigued,
  pilotAircraftMultipliers,
  pilotLevel,
  restPilot,
} from '../../src/domain/pilot-market';
import { operationsSpeedMultiplier } from '../../src/domain/staff-market';

describe('pilot market', () => {
  it('generates a deterministic monthly candidate pool', () => {
    const monthOne = generatePilotCandidates(0x3a7e2026, 1);
    const monthOneAgain = generatePilotCandidates(0x3a7e2026, 1);
    const monthTwo = generatePilotCandidates(0x3a7e2026, 2);
    expect(monthOne).toEqual(monthOneAgain);
    expect(monthOne.length).toBe(2);
    expect(monthTwo[0]?.id).not.toBe(monthOne[0]?.id);
    for (const candidate of monthOne) {
      expect(['speed', 'damage', 'recovery']).toContain(candidate.specialization);
      expect(candidate.hireCreditCost).toBeGreaterThan(0);
    }
  });

  it('hires a pilot candidate onto the roster and spends credits', () => {
    const initial = createInitialGameState();
    const candidate = initial.base.pilotCandidates[0];
    expect(candidate).toBeDefined();
    const hired = hirePilotCandidate(initial.base, candidate as never);
    expect(hired.pilots).toHaveLength(initial.base.pilots.length + 1);
    expect(hired.pilotCandidates).not.toContain(candidate);
    expect(hired.credits).toBe(initial.base.credits - (candidate as { hireCreditCost: number }).hireCreditCost);
  });

  it('assigns a pilot, accrues XP and fatigue per sortie, and rest resets fatigue', () => {
    const initial = createInitialGameState();
    const pilot = initial.base.pilots[0];
    expect(pilot).toBeDefined();
    const assigned = assignPilot(initial.base, pilot?.id ?? '');
    const afterSortie = awardPilotProgress(assigned);
    expect(afterSortie.pilotXp[pilot?.id ?? '']).toBe(1);
    expect(afterSortie.pilotFatigue[pilot?.id ?? '']).toBeGreaterThan(0);
    const rested = restPilot(afterSortie, pilot?.id ?? '');
    expect(rested.pilotFatigue[pilot?.id ?? '']).toBe(0);
  });

  it('levels pilots and applies specialization and fatigue to aircraft multipliers', () => {
    expect(pilotLevel(0)).toBe(1);
    expect(pilotLevel(6)).toBe(3);
    const initial = createInitialGameState();
    const multipliers = pilotAircraftMultipliers(initial.base);
    expect(multipliers.speedMultiplier).toBeGreaterThan(0);
    expect(multipliers.damageMultiplier).toBeGreaterThan(0);
    const fatigued = {
      ...initial.base,
      pilotFatigue: { ...initial.base.pilotFatigue, [initial.base.activePilotId ?? '']: 0.9 },
    };
    const worn = pilotAircraftMultipliers(fatigued);
    expect(worn.speedMultiplier).toBeLessThan(multipliers.speedMultiplier);
  });

  it('reports fatigue thresholds', () => {
    expect(isPilotFatigued(0.8)).toBe(true);
    expect(isPilotFatigued(0.2)).toBe(false);
  });

  it('boosts all process speed when an operations manager is hired', () => {
    const initial = createInitialGameState();
    expect(operationsSpeedMultiplier(initial.base)).toBe(1);
    const withManager = {
      ...initial.base,
      staff: [
        ...initial.base.staff,
        {
          id: 'manager-1',
          roleId: 'staff-manager',
          firstName: 'Wei',
          lastName: 'Chen',
          tier: 3,
          progressMultiplier: 1,
          salaryMultiplier: 1,
        },
      ],
    };
    expect(operationsSpeedMultiplier(withManager)).toBeCloseTo(1.1);
  });
});
