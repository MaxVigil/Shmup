import type {
  BaseState,
  PilotCandidateState,
  PilotSpecialization,
  PilotState,
} from './model';
import { createSeededRng } from './rng';

/* =====================================================================
   Pilot market
   Monthly candidate pool (seeded, deterministic), instant hiring,
   assignment to the active aircraft, XP -> level -> aircraft boosts,
   and per-sortie fatigue that forces rotation.
   ===================================================================== */

const UKRAINIAN_FIRST = ['Oleksandr', 'Yaroslava', 'Dmytro', 'Oksana', 'Maksym', 'Iryna'];
const UKRAINIAN_LAST = ['Kovalenko', 'Bondarenko', 'Shevchenko', 'Tkachenko', 'Melnyk'];
const CHINESE_FIRST = ['Wei', 'Ling', 'Jian', 'Mei', 'Hua'];
const CHINESE_LAST = ['Chen', 'Wang', 'Li', 'Zhang', 'Liu'];
const INDIAN_FIRST = ['Arjun', 'Priya', 'Rohan', 'Ananya'];
const INDIAN_LAST = ['Sharma', 'Patel', 'Reddy', 'Nair'];
const BRAZILIAN_FIRST = ['Lucas', 'Mariana', 'Rafael', 'Beatriz'];
const BRAZILIAN_LAST = ['Silva', 'Souza', 'Oliveira', 'Santos'];

export const PILOT_FATIGUE_PER_SORTIE = 0.15;
export const PILOT_FATIGUE_LIMIT = 0.75;
export const STARTER_PILOT_ID = 'pilot-kestrel';

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

const SPECIALIZATIONS: readonly PilotSpecialization[] = ['speed', 'damage', 'recovery'];

export function generatePilotCandidates(
  marketSeed: number,
  month: number,
  count = 2,
): readonly PilotCandidateState[] {
  const candidates: PilotCandidateState[] = [];
  for (let index = 0; index < count; index += 1) {
    const cycleSeed = (
      (marketSeed >>> 0) ^
      stableIdHash(`pilot-${month}-${index + 1}`)
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
    const specialization = pick(SPECIALIZATIONS, rng);
    const progressMultiplier = 0.8 + tier * 0.12 + (rng.next() - 0.5) * 0.1;
    const salaryMultiplier = 0.8 + tier * 0.15 + (rng.next() - 0.5) * 0.15;
    candidates.push({
      id: `pilot-candidate-${month}-${index + 1}`,
      firstName,
      lastName,
      tier,
      specialization,
      hireCreditCost: Math.round(150_000 * (0.7 + tier * 0.3)),
      salaryCreditCost: Math.round(150_000 * 0.4 * salaryMultiplier),
      progressMultiplier,
      salaryMultiplier,
      originCountryId,
    });
  }
  return candidates;
}

export function hirePilotCandidate(
  base: BaseState,
  candidate: PilotCandidateState,
): BaseState {
  if (!base.pilotCandidates.some((entry) => entry.id === candidate.id)) {
    throw new Error(`Pilot candidate ${candidate.id} is not available.`);
  }
  if (base.credits < candidate.hireCreditCost) {
    throw new Error(`Hiring ${candidate.firstName} ${candidate.lastName} is too expensive.`);
  }
  const pilot: PilotState = {
    id: candidate.id,
    unlocked: true,
    firstName: candidate.firstName,
    lastName: candidate.lastName,
    specialization: candidate.specialization,
    salaryCreditCost: candidate.salaryCreditCost,
  };
  return {
    ...base,
    credits: base.credits - candidate.hireCreditCost,
    pilots: [...base.pilots, pilot],
    pilotCandidates: base.pilotCandidates.filter((entry) => entry.id !== candidate.id),
  };
}

export function assignPilot(base: BaseState, pilotId: string): BaseState {
  if (!base.pilots.some((pilot) => pilot.id === pilotId)) {
    throw new Error(`Pilot ${pilotId} is not on the roster.`);
  }
  return { ...base, activePilotId: pilotId };
}

export function restPilot(base: BaseState, pilotId: string): BaseState {
  if (!base.pilots.some((pilot) => pilot.id === pilotId)) {
    throw new Error(`Pilot ${pilotId} is not on the roster.`);
  }
  return { ...base, pilotFatigue: { ...base.pilotFatigue, [pilotId]: 0 } };
}

export function pilotLevel(xp: number): number {
  return 1 + Math.floor(xp / 3);
}

export function isPilotFatigued(fatigue: number): boolean {
  return fatigue >= PILOT_FATIGUE_LIMIT;
}

/** Grants the active pilot XP and fatigue after a completed sortie. */
export function awardPilotProgress(base: BaseState): BaseState {
  const id = base.activePilotId;
  if (id === null || !base.pilots.some((pilot) => pilot.id === id)) {
    return base;
  }
  return {
    ...base,
    pilotXp: { ...base.pilotXp, [id]: (base.pilotXp[id] ?? 0) + 1 },
    pilotFatigue: {
      ...base.pilotFatigue,
      [id]: Math.min(1, (base.pilotFatigue[id] ?? 0) + PILOT_FATIGUE_PER_SORTIE),
    },
  };
}

/** The active pilot's level and specialization boost for aircraft stats. */
export function pilotAircraftMultipliers(base: BaseState): {
  readonly speedMultiplier: number;
  readonly damageMultiplier: number;
} {
  const id = base.activePilotId;
  const pilot = id === null
    ? undefined
    : base.pilots.find((entry) => entry.id === id);
  if (pilot === undefined) {
    return { speedMultiplier: 1, damageMultiplier: 1 };
  }
  const level = pilotLevel(base.pilotXp[pilot.id] ?? 0);
  const levelBonus = 1 + (level - 1) * 0.05;
  const fatiguePenalty = 1 - (base.pilotFatigue[pilot.id] ?? 0) * 0.5;
  const specialization = pilot.specialization ?? 'speed';
  const boost = specialization === 'speed'
    ? { speed: 1.08, damage: 1 }
    : specialization === 'damage'
      ? { speed: 1, damage: 1.08 }
      : { speed: 1.03, damage: 1.03 };
  return {
    speedMultiplier: levelBonus * boost.speed * fatiguePenalty,
    damageMultiplier: levelBonus * boost.damage * fatiguePenalty,
  };
}

