import type { BaseState, StaffCandidateState, StaffMemberState } from './model';
import { createSeededRng } from './rng';

const UKRAINIAN_FIRST = [
  'Oleksandr', 'Yaroslava', 'Dmytro', 'Oksana', 'Maksym', 'Iryna', 'Andriy', 'Nadiia',
];
const UKRAINIAN_LAST = [
  'Kovalenko', 'Bondarenko', 'Shevchenko', 'Tkachenko', 'Melnyk', 'Kravchenko', 'Hnatiuk', 'Polishchuk',
];
const CHINESE_FIRST = ['Wei', 'Ling', 'Jian', 'Mei', 'Hua', 'Fang', 'Yu', 'Na'];
const CHINESE_LAST = ['Chen', 'Wang', 'Li', 'Zhang', 'Liu', 'Yang', 'Huang', 'Zhao'];
const INDIAN_FIRST = ['Arjun', 'Priya', 'Rohan', 'Ananya', 'Vikram', 'Kavya'];
const INDIAN_LAST = ['Sharma', 'Patel', 'Reddy', 'Nair', 'Iyer', 'Rao'];
const BRAZILIAN_FIRST = ['Lucas', 'Mariana', 'Rafael', 'Beatriz', 'Thiago', 'Camila'];
const BRAZILIAN_LAST = ['Silva', 'Souza', 'Oliveira', 'Santos', 'Costa', 'Pereira'];
const AMERICAN_FIRST = ['James', 'Emily', 'Michael', 'Sarah', 'David', 'Laura'];
const AMERICAN_LAST = ['Smith', 'Johnson', 'Williams', 'Brown', 'Davis', 'Miller'];
const BRITISH_FIRST = ['Oliver', 'Amelia', 'Harry', 'Isla', 'George', 'Charlotte'];
const BRITISH_LAST = ['Taylor', 'Brown', 'Wilson', 'Evans', 'Thomas', 'Roberts'];
const GERMAN_FIRST = ['Lukas', 'Anna', 'Maximilian', 'Mia', 'Felix', 'Lena'];
const GERMAN_LAST = ['Mueller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Wagner'];
const JAPANESE_FIRST = ['Haruto', 'Yui', 'Sota', 'Aoi', 'Ren', 'Hana'];
const JAPANESE_LAST = ['Sato', 'Suzuki', 'Tanaka', 'Takahashi', 'Watanabe', 'Ito'];
const FRENCH_FIRST = ['Lucas', 'Camille', 'Hugo', 'Lea', 'Louis', 'Emma'];
const FRENCH_LAST = ['Martin', 'Bernard', 'Dubois', 'Moreau', 'Laurent', 'Leroy'];

const NAME_POOLS: Readonly<Record<string, { readonly first: readonly string[]; readonly last: readonly string[] }>> = {
  'council-ukraine': { first: UKRAINIAN_FIRST, last: UKRAINIAN_LAST },
  'council-prc': { first: CHINESE_FIRST, last: CHINESE_LAST },
  'council-india': { first: INDIAN_FIRST, last: INDIAN_LAST },
  'council-brazil': { first: BRAZILIAN_FIRST, last: BRAZILIAN_LAST },
  'council-usa': { first: AMERICAN_FIRST, last: AMERICAN_LAST },
  'council-uk': { first: BRITISH_FIRST, last: BRITISH_LAST },
  'council-germany': { first: GERMAN_FIRST, last: GERMAN_LAST },
  'council-japan': { first: JAPANESE_FIRST, last: JAPANESE_LAST },
  'council-france': { first: FRENCH_FIRST, last: FRENCH_LAST },
};

function stableIdHash(value: string): number {
  let hash = 0x811c9dc5;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function pick<T>(items: readonly T[], rng: ReturnType<typeof createSeededRng>): T {
  return items[rng.integer(0, items.length)] as T;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function nameForOrigin(
  originCountryId: string,
  rng: ReturnType<typeof createSeededRng>,
): readonly [string, string] {
  const pool = NAME_POOLS[originCountryId] ?? NAME_POOLS['council-ukraine']!;
  return [pick(pool.first, rng), pick(pool.last, rng)];
}

const OTHER_NATIONS = [
  'council-india',
  'council-brazil',
  'council-usa',
  'council-uk',
  'council-germany',
  'council-japan',
  'council-france',
];

function otherOrigin(rng: ReturnType<typeof createSeededRng>): string {
  return OTHER_NATIONS[rng.integer(0, OTHER_NATIONS.length)] as string;
}

export function generateStaffCandidates(
  roles: readonly { readonly id: string; readonly creditCost: number }[],
  marketSeed: number,
  month: number,
  candidatesPerRole = 2,
): readonly StaffCandidateState[] {
  const candidates: StaffCandidateState[] = [];
  let sequence = 0;
  for (const role of roles) {
    for (let index = 0; index < candidatesPerRole; index += 1) {
      sequence += 1;
      const cycleSeed = (
        (marketSeed >>> 0) ^
        stableIdHash(`staff-${role.id}-${month}-${sequence}`)
      ) >>> 0;
      const rng = createSeededRng(cycleSeed);
      const tier = rng.integer(1, 4);
      const originRoll = rng.next();
      // Top-tier candidates skew toward Ukraine (innovation leader) and the
      // PRC (key Council contributor); junior tiers are more varied.
      const originCountryId = tier >= 3
        ? originRoll < 0.55
          ? 'council-ukraine'
          : originRoll < 0.85
            ? 'council-prc'
            : otherOrigin(rng)
        : originRoll < 0.35
          ? 'council-ukraine'
          : originRoll < 0.5
            ? 'council-prc'
            : otherOrigin(rng);
      const [firstName, lastName] = nameForOrigin(originCountryId, rng);
      const progressMultiplier = round2(0.8 + tier * 0.12 + (rng.next() - 0.5) * 0.1);
      const salaryMultiplier = round2(0.8 + tier * 0.15 + (rng.next() - 0.5) * 0.15);
      const hireCreditCost = Math.round(role.creditCost * (0.7 + tier * 0.3));
      const salaryCreditCost = Math.round(role.creditCost * 0.3 * salaryMultiplier);
      candidates.push({
        id: `candidate-${month}-${role.id}-${index + 1}`,
        roleId: role.id,
        firstName,
        lastName,
        tier,
        hireCreditCost,
        salaryCreditCost,
        progressMultiplier,
        salaryMultiplier,
        originCountryId,
      });
    }
  }
  return candidates;
}

export function hireCandidate(
  base: BaseState,
  candidate: StaffCandidateState,
  role: {
    readonly id: string;
    readonly requiredBuildingId: string | null;
    readonly maximumHeadcount: number | null;
  },
): BaseState {
  if (!base.staffCandidates.some((entry) => entry.id === candidate.id)) {
    throw new Error(`Candidate ${candidate.id} is not available.`);
  }
  if (
    role.requiredBuildingId !== null &&
    !base.constructedBuildingIds.includes(role.requiredBuildingId)
  ) {
    throw new Error(`Building ${role.requiredBuildingId} is required to hire ${role.id}.`);
  }
  if (base.credits < candidate.hireCreditCost) {
    throw new Error(
      `Hiring ${candidate.firstName} ${candidate.lastName} requires ${candidate.hireCreditCost} credits.`,
    );
  }
  const currentHeadcount = base.staff.filter((member) => member.roleId === role.id).length;
  if (role.maximumHeadcount !== null && currentHeadcount >= role.maximumHeadcount) {
    throw new Error(`Staff role ${role.id} has reached its current headcount limit.`);
  }
  const staffMember: StaffMemberState = {
    id: candidate.id,
    roleId: candidate.roleId,
    firstName: candidate.firstName,
    lastName: candidate.lastName,
    tier: candidate.tier,
    progressMultiplier: candidate.progressMultiplier,
    salaryMultiplier: candidate.salaryMultiplier,
  };
  return {
    ...base,
    credits: base.credits - candidate.hireCreditCost,
    staff: [...base.staff, staffMember],
    staffCandidates: base.staffCandidates.filter((entry) => entry.id !== candidate.id),
  };
}

export function staffLevel(xp: number): number {
  return 1 + Math.floor(xp / 3);
}

export function staffContribution(base: BaseState, roleId: string): number {
  return base.staff
    .filter((member) => member.roleId === roleId)
    .reduce((sum, member) => {
      const level = staffLevel(base.staffXp[member.id] ?? 0);
      return sum + member.progressMultiplier * (1 + (level - 1) * 0.05);
    }, 0);
}

export const MANAGER_ROLE_ID = 'staff-manager';

export function hasOperationsManager(base: BaseState): boolean {
  return base.staff.some((member) => member.roleId === MANAGER_ROLE_ID);
}

/** Operations director speeds up every production and research process by 10%. */
export function operationsSpeedMultiplier(base: BaseState): number {
  return hasOperationsManager(base) ? 1.1 : 1;
}

export function tradeManagerMargin(base: BaseState): number {
  return hasOperationsManager(base) ? 0.02 : 0;
}

export function awardStaffXp(base: BaseState): BaseState {
  const next = { ...base.staffXp };
  for (const member of base.staff) {
    next[member.id] = (next[member.id] ?? 0) + 1;
  }
  return { ...base, staffXp: next };
}

/** Removes a staff member from the roster; no refund is granted. */
export function dismissStaff(base: BaseState, staffId: string): BaseState {
  if (!base.staff.some((member) => member.id === staffId)) {
    throw new Error(`Staff member ${staffId} is not on the roster.`);
  }
  const staffXp = { ...base.staffXp };
  delete staffXp[staffId];
  return {
    ...base,
    staff: base.staff.filter((member) => member.id !== staffId),
    staffXp,
  };
}
