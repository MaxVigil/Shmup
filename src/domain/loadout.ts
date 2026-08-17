import type {
  AircraftLoadoutEntry,
  AircraftMultipliers,
} from '../content/model';

/** Slot concentration bonus, DERIVED from primary slot count (never stored).
 *  Fewer slots ⇒ stronger per-weapon multipliers. Stacks on base multipliers. */
export function slotConcentrationBonus(primarySlots: 1 | 2 | 3): AircraftMultipliers {
  switch (primarySlots) {
    case 1:
      return { damageMultiplier: 1.25, fireRateMultiplier: 1.2, accuracyMultiplier: 1.15 };
    case 2:
      return { damageMultiplier: 1.05, fireRateMultiplier: 1.05, accuracyMultiplier: 1.05 };
    case 3:
      return { damageMultiplier: 1, fireRateMultiplier: 1, accuracyMultiplier: 1 };
  }
}

/** Effective damage multiplier of an aircraft at a given Mark:
 *  (base + Σ mark deltas) × slot concentration bonus. */
export function effectiveDamageMultiplier(
  entry: AircraftLoadoutEntry,
  maxMark: number,
): number {
  const base = entry.baseStats.baseMultipliers.damageMultiplier;
  const markDeltas = entry.marks
    .filter((mark) => mark.mark <= maxMark)
    .reduce((sum, mark) => sum + (mark.statDeltas.damageMultiplier ?? 0), 0);
  const bonus = slotConcentrationBonus(entry.loadout.primarySlots).damageMultiplier;
  return (base + markDeltas) * bonus;
}

/** Effective fire-rate multiplier of an aircraft at a given Mark. */
export function effectiveFireRateMultiplier(
  entry: AircraftLoadoutEntry,
  maxMark: number,
): number {
  const base = entry.baseStats.baseMultipliers.fireRateMultiplier;
  const markDeltas = entry.marks
    .filter((mark) => mark.mark <= maxMark)
    .reduce((sum, mark) => sum + (mark.statDeltas.fireRateMultiplier ?? 0), 0);
  const bonus = slotConcentrationBonus(entry.loadout.primarySlots).fireRateMultiplier;
  return (base + markDeltas) * bonus;
}

/** Effective accuracy multiplier of an aircraft at a given Mark. */
export function effectiveAccuracyMultiplier(
  entry: AircraftLoadoutEntry,
  maxMark: number,
): number {
  const base = entry.baseStats.baseMultipliers.accuracyMultiplier;
  const markDeltas = entry.marks
    .filter((mark) => mark.mark <= maxMark)
    .reduce((sum, mark) => sum + (mark.statDeltas.accuracyMultiplier ?? 0), 0);
  const bonus = slotConcentrationBonus(entry.loadout.primarySlots).accuracyMultiplier;
  return (base + markDeltas) * bonus;
}

/** Total weight of an installed loadout plus loaded ammunition. */
export function loadoutWeight(
  installed: readonly { readonly weight: number }[],
  ammunition: readonly { readonly weightPerUnit: number; readonly count: number }[],
): number {
  const installedWeight = installed.reduce((sum, item) => sum + item.weight, 0);
  const ammoWeight = ammunition.reduce(
    (sum, item) => sum + item.weightPerUnit * item.count,
    0,
  );
  return installedWeight + ammoWeight;
}

/** Total energy draw of an installed loadout. */
export function loadoutEnergyDraw(
  installed: readonly { readonly energyDraw: number }[],
): number {
  return installed.reduce((sum, item) => sum + item.energyDraw, 0);
}
