import type { StaffMemberState } from '../../src/domain/model';

export function staffMember(
  id: string,
  roleId: string,
  overrides: Partial<StaffMemberState> = {},
): StaffMemberState {
  return {
    id,
    roleId,
    firstName: 'Specialist',
    lastName: 'Directorate',
    tier: 1,
    progressMultiplier: 1,
    salaryMultiplier: 1,
    ...overrides,
  };
}
