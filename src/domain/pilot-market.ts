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
const AMERICAN_FIRST = ['James', 'Emily', 'Michael', 'Sarah'];
const AMERICAN_LAST = ['Smith', 'Johnson', 'Williams', 'Brown'];
const BRITISH_FIRST = ['Oliver', 'Amelia', 'Harry', 'Isla'];
const BRITISH_LAST = ['Taylor', 'Brown', 'Wilson', 'Evans'];
const GERMAN_FIRST = ['Lukas', 'Anna', 'Maximilian', 'Mia'];
const GERMAN_LAST = ['Mueller', 'Schmidt', 'Schneider', 'Fischer'];
const JAPANESE_FIRST = ['Haruto', 'Yui', 'Sota', 'Aoi'];
const JAPANESE_LAST = ['Sato', 'Suzuki', 'Tanaka', 'Takahashi'];
const FRENCH_FIRST = ['Lucas', 'Camille', 'Hugo', 'Lea'];
const FRENCH_LAST = ['Martin', 'Bernard', 'Dubois', 'Moreau'];

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

export const PILOT_FATIGUE_PER_SORTIE = 0.15;
export const PILOT_FATIGUE_RECOVERY_PER_SORTIE = 0.05;
export const PILOT_FATIGUE_RECOVERY_PER_MONTH = 0.25;
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
        : otherOrigin(rng);
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
      salaryCreditCost: Math.round(150_000 * 0.3 * salaryMultiplier),
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
  if (isPilotFatigued(base.pilotFatigue[pilotId] ?? 0)) {
    throw new Error(`Pilot ${pilotId} is too fatigued to fly.`);
  }
  return { ...base, activePilotId: pilotId };
}

export function restPilot(base: BaseState, pilotId: string): BaseState {
  if (!base.pilots.some((pilot) => pilot.id === pilotId)) {
    throw new Error(`Pilot ${pilotId} is not on the roster.`);
  }
  if (base.activePilotId !== pilotId) {
    throw new Error(`Pilot ${pilotId} is not the active pilot.`);
  }
  const replacement = base.pilots.find(
    (pilot) => pilot.id !== pilotId && !isPilotFatigued(base.pilotFatigue[pilot.id] ?? 0),
  );
  if (replacement === undefined) {
    throw new Error('No rested pilot is available to replace the fatigued pilot.');
  }
  return { ...base, activePilotId: replacement.id };
}

export function pilotLevel(xp: number): number {
  return 1 + Math.floor(xp / 3);
}

export function isPilotFatigued(fatigue: number): boolean {
  return fatigue >= PILOT_FATIGUE_LIMIT;
}

/** Grants the active pilot XP and fatigue after a completed sortie; other
 *  pilots recover a little while they stand down. */
export function awardPilotProgress(base: BaseState): BaseState {
  const id = base.activePilotId;
  if (id === null || !base.pilots.some((pilot) => pilot.id === id)) {
    return base;
  }
  const pilotFatigue: Record<string, number> = { ...base.pilotFatigue };
  for (const pilot of base.pilots) {
    const current = pilotFatigue[pilot.id] ?? 0;
    pilotFatigue[pilot.id] = pilot.id === id
      ? Math.min(1, current + PILOT_FATIGUE_PER_SORTIE)
      : Math.max(0, current - PILOT_FATIGUE_RECOVERY_PER_SORTIE);
  }
  return {
    ...base,
    pilotXp: { ...base.pilotXp, [id]: (base.pilotXp[id] ?? 0) + 1 },
    pilotFatigue,
  };
}

/** Pilots recover fatigue during the month-end stand-down. */
export function recoverMonthlyPilotFatigue(base: BaseState): BaseState {
  const pilotFatigue: Record<string, number> = { ...base.pilotFatigue };
  let changed = false;
  for (const pilot of base.pilots) {
    const current = pilotFatigue[pilot.id] ?? 0;
    if (current > 0) {
      pilotFatigue[pilot.id] = Math.max(
        0,
        current - PILOT_FATIGUE_RECOVERY_PER_MONTH,
      );
      changed = true;
    }
  }
  return changed ? { ...base, pilotFatigue } : base;
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

