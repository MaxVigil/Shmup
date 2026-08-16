import type { BaseState } from './model';
import { staffContribution } from './staff-market';

export const REPAIR_SORTIES_PER_DAMAGE = 3;
export const REPAIR_CREDIT_PER_DAMAGE = 100_000;
export const EMERGENCY_REPAIR_MULTIPLIER = 2;
export const SORTIE_DAMAGE_WEIGHT = 0.6;

export const REPAIR_MASTER_ROLE_ID = 'staff-repair-master';
/** Cost discount per Repair Master contribution unit (0..1 → up to 40% off). */
export const REPAIR_MASTER_COST_REDUCTION = 0.4;
/** Extra repair sortie-ticks per completed sortie, per contribution unit. */
export const REPAIR_MASTER_SPEED_BONUS = 0.5;
/** Cheapest possible in-house cost factor. */
export const REPAIR_COST_FLOOR = 0.5;

export function aircraftDamageValue(base: BaseState, aircraftId: string): number {
  return base.aircraftDamage[aircraftId] ?? 0;
}

export function isAircraftRepairing(base: BaseState, aircraftId: string): boolean {
  return aircraftDamageValue(base, aircraftId) > 0;
}

/**
 * Summed Repair Master contribution. Without a master this is 0 and repairs
 * are outsourced to contractors at the full baseline cost.
 */
export function repairMasterContribution(base: BaseState): number {
  return staffContribution(base, REPAIR_MASTER_ROLE_ID);
}

export function isInHouseRepair(base: BaseState): boolean {
  return repairMasterContribution(base) > 0;
}

/** Multiplies the standard repair cost: 1 with no master, as low as 0.5 in-house. */
export function repairCostMultiplier(base: BaseState): number {
  const contribution = repairMasterContribution(base);
  return Math.max(REPAIR_COST_FLOOR, 1 - REPAIR_MASTER_COST_REDUCTION * contribution);
}

export function standardRepairCost(base: BaseState, aircraftId: string): number {
  return Math.ceil(
    aircraftDamageValue(base, aircraftId) *
      REPAIR_CREDIT_PER_DAMAGE *
      repairCostMultiplier(base),
  );
}

export function emergencyRepairCost(base: BaseState, aircraftId: string): number {
  return standardRepairCost(base, aircraftId) * EMERGENCY_REPAIR_MULTIPLIER;
}

export function startRepair(
  base: BaseState,
  aircraftId: string,
  emergency: boolean,
): BaseState {
  const damage = aircraftDamageValue(base, aircraftId);
  if (damage <= 0) {
    throw new Error(`${aircraftId} is not damaged.`);
  }
  if ((base.aircraftRepair[aircraftId] ?? 0) > 0) {
    throw new Error(`${aircraftId} is already being repaired.`);
  }
  const cost = emergency
    ? emergencyRepairCost(base, aircraftId)
    : standardRepairCost(base, aircraftId);
  if (base.credits < cost) {
    throw new Error(`Repairing ${aircraftId} requires ${cost} credits.`);
  }
  if (emergency) {
    const damageNext = { ...base.aircraftDamage };
    delete damageNext[aircraftId];
    const repairNext = { ...base.aircraftRepair };
    delete repairNext[aircraftId];
    return {
      ...base,
      credits: base.credits - cost,
      aircraftDamage: damageNext,
      aircraftRepair: repairNext,
    };
  }
  const repairNext = { ...base.aircraftRepair };
  repairNext[aircraftId] = Math.ceil(damage * REPAIR_SORTIES_PER_DAMAGE);
  return {
    ...base,
    credits: base.credits - cost,
    aircraftRepair: repairNext,
  };
}

export function advanceRepairs(base: BaseState): BaseState {
  const entries = Object.entries(base.aircraftRepair);
  if (entries.length === 0) {
    return base;
  }
  const tick = 1 + REPAIR_MASTER_SPEED_BONUS * repairMasterContribution(base);
  const repairNext = { ...base.aircraftRepair };
  const damageNext = { ...base.aircraftDamage };
  for (const [aircraftId, remaining] of entries) {
    const next = remaining - tick;
    if (next <= 0) {
      delete repairNext[aircraftId];
      delete damageNext[aircraftId];
    } else {
      repairNext[aircraftId] = next;
    }
  }
  return { ...base, aircraftRepair: repairNext, aircraftDamage: damageNext };
}

export function applySortieDamage(
  base: BaseState,
  aircraftId: string | null,
  armourLostRatio: number,
): BaseState {
  if (aircraftId === null) {
    return base;
  }
  const ratio = Math.max(0, Math.min(1, armourLostRatio));
  if (ratio <= 0) {
    return base;
  }
  const current = aircraftDamageValue(base, aircraftId);
  const nextDamage = Math.min(1, current + ratio * SORTIE_DAMAGE_WEIGHT);
  return {
    ...base,
    aircraftDamage: { ...base.aircraftDamage, [aircraftId]: nextDamage },
  };
}
