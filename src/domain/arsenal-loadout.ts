import type { BaseState } from './model';
import {
  aircraftLoadoutByAircraftId,
  auxiliaryById,
  moduleById,
  weaponFamilyById,
} from '../content/ids';
import { effectiveDamageMultiplier } from './loadout';

/** Legacy primary weapon id → new weapon family id (E1 reuse mapping). */
const LEGACY_PRIMARY_TO_FAMILY: Readonly<Record<string, string>> = {
  'weapon-pulse-cannon': 'weapon-autocannon',
  'weapon-impulse-accelerator': 'weapon-railgun',
  'weapon-split-pulse': 'weapon-pulse-laser',
  'weapon-canister-cannon': 'weapon-scatter-cannon',
  'weapon-rocket-pod': 'weapon-autocannon',
};

export function hardpointSlotsOf(
  base: BaseState,
  aircraftId: string,
): readonly (string | null)[] {
  return base.aircraftHardpoints[aircraftId] ?? [];
}

function familyForWeapon(weaponId: string) {
  const direct = weaponFamilyById(weaponId);
  if (direct) {
    return direct;
  }
  const mapped = LEGACY_PRIMARY_TO_FAMILY[weaponId];
  if (mapped !== undefined) {
    return weaponFamilyById(mapped);
  }
  return undefined;
}

function hardpointItemWeight(itemId: string): number {
  const aux = auxiliaryById(itemId);
  if (aux) {
    return aux.weight;
  }
  const mod = moduleById(itemId);
  return mod ? mod.weight : 0;
}

function hardpointItemEnergy(itemId: string): number {
  const aux = auxiliaryById(itemId);
  if (aux) {
    return aux.energyDraw;
  }
  const mod = moduleById(itemId);
  return mod ? mod.energyDraw : 0;
}

/** Total installed weight of an aircraft: primary weapons + hardpoint items. */
export function aircraftLoadoutWeight(
  base: BaseState,
  aircraftId: string,
): number {
  const primary = (base.aircraftLoadouts[aircraftId] ?? []).reduce(
    (sum, id) => (id === null ? sum : sum + (familyForWeapon(id)?.weight ?? 0)),
    0,
  );
  const hardpoints = hardpointSlotsOf(base, aircraftId).reduce(
    (sum, id) => (id === null ? sum : sum + hardpointItemWeight(id)),
    0,
  );
  return primary + hardpoints;
}

/** Total installed energy draw of an aircraft. */
export function aircraftLoadoutEnergy(
  base: BaseState,
  aircraftId: string,
): number {
  const primary = (base.aircraftLoadouts[aircraftId] ?? []).reduce(
    (sum, id) => (id === null ? sum : sum + (familyForWeapon(id)?.energyDraw ?? 0)),
    0,
  );
  const hardpoints = hardpointSlotsOf(base, aircraftId).reduce(
    (sum, id) => (id === null ? sum : sum + hardpointItemEnergy(id)),
    0,
  );
  return primary + hardpoints;
}

export function installHardpointItem(
  base: BaseState,
  aircraftId: string,
  slotIndex: number,
  itemId: string,
): BaseState {
  const entry = aircraftLoadoutByAircraftId(aircraftId);
  const capacity = entry?.loadout.hardpointSlots ?? 0;
  if (slotIndex < 0 || slotIndex >= capacity) {
    throw new RangeError(
      `Hardpoint slot ${slotIndex} is out of range for ${aircraftId}.`,
    );
  }
  if (auxiliaryById(itemId) === undefined && moduleById(itemId) === undefined) {
    throw new Error(`Unknown hardpoint item ${itemId}.`);
  }
  const current = base.aircraftHardpoints[aircraftId] ?? Array.from(
    { length: capacity },
    () => null,
  );
  const slots = [...current];
  if (slots[slotIndex] === itemId) {
    return base;
  }
  const moving = slots.includes(itemId);
  slots[slotIndex] = itemId;
  const next = {
    ...base,
    aircraftHardpoints: { ...base.aircraftHardpoints, [aircraftId]: slots },
  };
  if (!moving) {
    const weight = aircraftLoadoutWeight(next, aircraftId);
    const energy = aircraftLoadoutEnergy(next, aircraftId);
    if (weight > entry!.loadout.carryingCapacity) {
      throw new Error(
        `Installing ${itemId} exceeds ${aircraftId} carrying capacity.`,
      );
    }
    if (energy > entry!.loadout.reactorCapacity) {
      throw new Error(
        `Installing ${itemId} exceeds ${aircraftId} reactor capacity.`,
      );
    }
  }
  return next;
}

export function removeHardpointItem(
  base: BaseState,
  aircraftId: string,
  slotIndex: number,
): BaseState {
  const slots = [...(base.aircraftHardpoints[aircraftId] ?? [])];
  if (slots[slotIndex] === undefined || slots[slotIndex] === null) {
    return base;
  }
  slots[slotIndex] = null;
  return {
    ...base,
    aircraftHardpoints: { ...base.aircraftHardpoints, [aircraftId]: slots },
  };
}

export function aircraftMark(base: BaseState, aircraftId: string): number {
  return base.aircraftMarks[aircraftId] ?? 1;
}

export function setAircraftMark(
  base: BaseState,
  aircraftId: string,
  mark: number,
): BaseState {
  const entry = aircraftLoadoutByAircraftId(aircraftId);
  if (!entry) {
    throw new Error(`No loadout entry for ${aircraftId}.`);
  }
  if (!Number.isInteger(mark) || mark < 1) {
    throw new RangeError('Aircraft mark must be a positive integer.');
  }
  if (mark === 1) {
    const next = { ...base.aircraftMarks };
    delete next[aircraftId];
    return { ...base, aircraftMarks: next };
  }
  if (!entry.marks.some((upgrade) => upgrade.mark === mark)) {
    throw new Error(`Aircraft ${aircraftId} has no Mark ${mark} upgrade.`);
  }
  return {
    ...base,
    aircraftMarks: { ...base.aircraftMarks, [aircraftId]: mark },
  };
}

/** Effective aircraft damage multiplier using the persisted Mark level. */
export function effectiveAircraftDamageMultiplier(
  base: BaseState,
  aircraftId: string,
): number {
  const entry = aircraftLoadoutByAircraftId(aircraftId);
  if (!entry) {
    return 1;
  }
  return effectiveDamageMultiplier(entry, aircraftMark(base, aircraftId));
}
