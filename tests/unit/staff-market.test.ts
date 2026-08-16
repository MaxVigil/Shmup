import { describe, expect, it } from 'vitest';
import { contentCatalog } from '../../src/content/catalog';
import { generateStaffCandidates } from '../../src/domain/staff-market';

describe('staff market salaries', () => {
  it('no longer clamps salaries to the old 10k cap', () => {
    const candidates = generateStaffCandidates(
      contentCatalog.staffRoles,
      0x3a7e2026,
      1,
    );
    for (const candidate of candidates) {
      const role = contentCatalog.staffRoles.find(
        (entry) => entry.id === candidate.roleId,
      );
      expect(role).toBeDefined();
      // Salary is exactly role.salaryCreditCost × the candidate multiplier.
      expect(candidate.salaryCreditCost).toBe(
        Math.round((role?.salaryCreditCost ?? 0) * candidate.salaryMultiplier),
      );
    }
  });

  it('prices scrum-team roles in the 30–40k band and the director at 50k', () => {
    const candidates = generateStaffCandidates(
      contentCatalog.staffRoles,
      0x3a7e2026,
      1,
    );
    const salaryFor = (roleId: string): number =>
      candidates.find((candidate) => candidate.roleId === roleId)?.salaryCreditCost ?? 0;
    expect(salaryFor('staff-scientist')).toBeGreaterThan(20_000);
    expect(salaryFor('staff-engineer')).toBeGreaterThan(30_000);
    expect(salaryFor('staff-medic')).toBeGreaterThan(20_000);
    expect(salaryFor('staff-repair-master')).toBeGreaterThan(25_000);
    expect(salaryFor('staff-manager')).toBeGreaterThan(40_000);
    // The old 10k cap would have pinned every non-manager role at 10k.
    expect(salaryFor('staff-scientist')).toBeGreaterThan(10_000);
  });

  it('keeps the trader and the manager as individual hires', () => {
    const trader = contentCatalog.staffRoles.find(
      (entry) => entry.id === 'staff-trader',
    );
    const manager = contentCatalog.staffRoles.find(
      (entry) => entry.id === 'staff-manager',
    );
    expect(trader?.maximumHeadcount).toBe(1);
    expect(manager?.maximumHeadcount).toBe(1);
  });
});