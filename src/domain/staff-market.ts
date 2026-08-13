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
  if (originCountryId === 'council-prc') {
    return [pick(CHINESE_FIRST, rng), pick(CHINESE_LAST, rng)];
  }
  if (originCountryId === 'council-india') {
    return [pick(INDIAN_FIRST, rng), pick(INDIAN_LAST, rng)];
  }
  if (originCountryId === 'council-brazil') {
    return [pick(BRAZILIAN_FIRST, rng), pick(BRAZILIAN_LAST, rng)];
  }
  return [pick(UKRAINIAN_FIRST, rng), pick(UKRAINIAN_LAST, rng)];
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
      const originCountryId = originRoll < 0.45
        ? 'council-ukraine'
        : originRoll < 0.65
          ? 'council-prc'
          : originRoll < 0.85
            ? 'council-india'
            : 'council-brazil';
      const [firstName, lastName] = nameForOrigin(originCountryId, rng);
      const progressMultiplier = round2(0.8 + tier * 0.12 + (rng.next() - 0.5) * 0.1);
      const salaryMultiplier = round2(0.8 + tier * 0.15 + (rng.next() - 0.5) * 0.15);
      const hireCreditCost = Math.round(role.creditCost * (0.7 + tier * 0.3));
      const salaryCreditCost = Math.round(role.creditCost * 0.4 * salaryMultiplier);
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
): BaseState {
  if (!base.staffCandidates.some((entry) => entry.id === candidate.id)) {
    throw new Error(`Candidate ${candidate.id} is not available.`);
  }
  if (base.credits < candidate.hireCreditCost) {
    throw new Error(
      `Hiring ${candidate.firstName} ${candidate.lastName} requires ${candidate.hireCreditCost} credits.`,
    );
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

export function awardStaffXp(base: BaseState): BaseState {
  const next = { ...base.staffXp };
  for (const member of base.staff) {
    next[member.id] = (next[member.id] ?? 0) + 1;
  }
  return { ...base, staffXp: next };
}
