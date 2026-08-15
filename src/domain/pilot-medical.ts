import type {
  BaseState,
  PilotInjurySeverity,
  PilotInjuryState,
} from './model';
import type { RandomSource } from './rng';
import { staffContribution } from './staff-market';

/* =====================================================================
   Pilot medical system
   Casualty rolls after a damaged sortie, injury/recovery timelines,
   country outsourcing, and Medical Block in-house treatment.
   ===================================================================== */

export const MEDIC_ROLE_ID = 'staff-medic';
export const MEDICAL_BLOCK_BUILDING_ID = 'building-medical-block';

/** Fatality probability per unit of armour lost during a sortie. */
export const INJURY_DEATH_CHANCE = 0.005;
/** Cumulative threshold for severe injuries (0.005..0.02 = 1.5% at full damage). */
export const INJURY_SEVERE_CHANCE = 0.02;
/** Cumulative threshold for medium injuries (0.02..0.06 = 4% at full damage). */
export const INJURY_MEDIUM_CHANCE = 0.06;
/** Cumulative threshold for light injuries (0.06..0.14 = 8% at full damage). */
export const INJURY_LIGHT_CHANCE = 0.14;

export const INJURY_RECOVERY_MONTHS: Readonly<Record<PilotInjurySeverity, number>> = {
  light: 2,
  medium: 4,
  severe: 6,
};

/** Base one-off price a Council state charges to treat an injured pilot. */
export const OUTSOURCE_TREATMENT_COST: Readonly<Record<PilotInjurySeverity, number>> = {
  light: 80_000,
  medium: 180_000,
  severe: 400_000,
};

/** Per-country outsource price multipliers; the PRC often offers the best terms. */
export const OUTSOURCE_COUNTRY_MULTIPLIER: Readonly<Record<string, number>> = {
  'council-prc': 1,
  'council-ukraine': 1.1,
  'council-india': 1.2,
  'council-germany': 1.25,
  'council-france': 1.3,
  'council-brazil': 1.3,
  'council-uk': 1.35,
  'council-usa': 1.4,
  'council-japan': 1.4,
};

/** Each medic contribution point adds +0.5 recovery per month (2-3 medics ≈ 2x-3x). */
export const MEDIC_HEALING_RATE_PER_CONTRIBUTION = 0.5;
export const MEDIC_HEALING_MAX_MULTIPLIER = 3;

export type PilotCasualty = PilotInjurySeverity | 'death' | null;

/** Rolls the pilot casualty outcome for a sortie that lost armour. */
export function rollPilotCasualty(
  armourLostRatio: number,
  rng: RandomSource,
): PilotCasualty {
  const p = Math.max(0, Math.min(1, armourLostRatio));
  const roll = rng.next();
  if (roll < INJURY_DEATH_CHANCE * p) {
    return 'death';
  }
  if (roll < INJURY_SEVERE_CHANCE * p) {
    return 'severe';
  }
  if (roll < INJURY_MEDIUM_CHANCE * p) {
    return 'medium';
  }
  if (roll < INJURY_LIGHT_CHANCE * p) {
    return 'light';
  }
  return null;
}

export function isPilotDead(base: BaseState, pilotId: string): boolean {
  return base.deadPilotIds.includes(pilotId);
}

export function isPilotInjured(base: BaseState, pilotId: string): boolean {
  return base.pilotInjuries[pilotId] !== undefined;
}

export function isPilotFlightReady(base: BaseState, pilotId: string): boolean {
  return !isPilotDead(base, pilotId) && !isPilotInjured(base, pilotId);
}


/** Records a non-fatal injury; the pilot cannot fly until a treatment completes. */
export function applyPilotInjury(
  base: BaseState,
  pilotId: string,
  severity: PilotInjurySeverity,
): BaseState {
  if (!base.pilots.some((pilot) => pilot.id === pilotId)) {
    throw new Error(`Pilot ${pilotId} is not on the roster.`);
  }
  const injuries: Record<string, PilotInjuryState> = { ...base.pilotInjuries };
  injuries[pilotId] = {
    severity,
    monthsRemaining: INJURY_RECOVERY_MONTHS[severity],
    treatment: null,
  };
  return { ...base, pilotInjuries: injuries };
}

/** Removes a pilot from service; XP and fatigue become irrelevant. */
export function killPilot(
  base: BaseState,
  pilotId: string,
  month: number,
): BaseState {
  if (!base.pilots.some((pilot) => pilot.id === pilotId)) {
    throw new Error(`Pilot ${pilotId} is not on the roster.`);
  }
  const pilotXp = { ...base.pilotXp };
  delete pilotXp[pilotId];
  const pilotFatigue = { ...base.pilotFatigue };
  delete pilotFatigue[pilotId];
  const pilotInjuries = { ...base.pilotInjuries };
  delete pilotInjuries[pilotId];
  return {
    ...base,
    deadPilotIds: base.deadPilotIds.includes(pilotId)
      ? base.deadPilotIds
      : [...base.deadPilotIds, pilotId],
    pilotDeathMonth: { ...base.pilotDeathMonth, [pilotId]: month },
    activePilotId: base.activePilotId === pilotId ? null : base.activePilotId,
    pilotXp,
    pilotFatigue,
    pilotInjuries,
  };
}

export function outsourceTreatmentCost(
  base: BaseState,
  pilotId: string,
  countryId: string,
): number {
  const injury = base.pilotInjuries[pilotId];
  if (injury === undefined) {
    throw new Error(`Pilot ${pilotId} is not injured.`);
  }
  const multiplier = OUTSOURCE_COUNTRY_MULTIPLIER[countryId] ?? 1.5;
  return Math.round(OUTSOURCE_TREATMENT_COST[injury.severity] * multiplier);
}

/** Pays a Council state to treat the pilot at the base recovery speed. */
export function treatPilotOutsource(
  base: BaseState,
  pilotId: string,
  countryId: string,
): BaseState {
  const injury = base.pilotInjuries[pilotId];
  if (injury === undefined) {
    throw new Error(`Pilot ${pilotId} is not injured.`);
  }
  if (injury.treatment !== null) {
    throw new Error(`Pilot ${pilotId} is already in treatment.`);
  }
  const cost = outsourceTreatmentCost(base, pilotId, countryId);
  if (base.credits < cost) {
    throw new Error(`Treating ${pilotId} requires ${cost} credits.`);
  }
  const injuries: Record<string, PilotInjuryState> = { ...base.pilotInjuries };
  injuries[pilotId] = { ...injury, treatment: 'outsource' };
  return {
    ...base,
    credits: base.credits - cost,
    pilotInjuries: injuries,
  };
}

export function medicHealingRate(base: BaseState): number {
  const contribution = staffContribution(base, MEDIC_ROLE_ID);
  return Math.min(
    MEDIC_HEALING_MAX_MULTIPLIER,
    1 + MEDIC_HEALING_RATE_PER_CONTRIBUTION * contribution,
  );
}

export function hasMedicalTreatmentCapability(base: BaseState): boolean {
  return (
    base.constructedBuildingIds.includes(MEDICAL_BLOCK_BUILDING_ID) &&
    base.staff.some((member) => member.roleId === MEDIC_ROLE_ID)
  );
}

/** Starts free in-house treatment; medics accelerate the recovery speed. */
export function treatPilotInMedical(
  base: BaseState,
  pilotId: string,
): BaseState {
  const injury = base.pilotInjuries[pilotId];
  if (injury === undefined) {
    throw new Error(`Pilot ${pilotId} is not injured.`);
  }
  if (injury.treatment !== null) {
    throw new Error(`Pilot ${pilotId} is already in treatment.`);
  }
  if (!hasMedicalTreatmentCapability(base)) {
    throw new Error('The Medical Block and at least one medic are required for treatment.');
  }
  const injuries: Record<string, PilotInjuryState> = { ...base.pilotInjuries };
  injuries[pilotId] = { ...injury, treatment: 'medical' };
  return { ...base, pilotInjuries: injuries };
}

/** Advances one month of recovery for treated pilots; untreated pilots wait. */
export function advancePilotRecovery(base: BaseState): BaseState {
  if (Object.keys(base.pilotInjuries).length === 0) {
    return base;
  }
  const rate = medicHealingRate(base);
  const injuries: Record<string, PilotInjuryState> = {};
  for (const [pilotId, injury] of Object.entries(base.pilotInjuries)) {
    if (injury.treatment === null) {
      injuries[pilotId] = injury;
      continue;
    }
    const speed = injury.treatment === 'medical' ? rate : 1;
    const remaining = injury.monthsRemaining - speed;
    if (remaining > 0) {
      injuries[pilotId] = { ...injury, monthsRemaining: remaining };
    }
  }
  return { ...base, pilotInjuries: injuries };
}

