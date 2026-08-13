import type { BaseState } from './model';

export function weaponStockCount(base: BaseState, weaponId: string): number {
  return base.weaponStock[weaponId] ?? 0;
}

export function addWeaponStock(
  base: BaseState,
  weaponId: string,
  count: number,
): BaseState {
  if (!Number.isInteger(count) || count < 0) {
    throw new RangeError('Weapon stock count must be a non-negative integer.');
  }
  const next = { ...base.weaponStock };
  next[weaponId] = (next[weaponId] ?? 0) + count;
  if (next[weaponId] === 0) {
    delete next[weaponId];
  }
  return { ...base, weaponStock: next };
}

export function aircraftLoadout(
  base: BaseState,
  aircraftId: string,
): readonly (string | null)[] {
  return base.aircraftLoadouts[aircraftId] ?? [];
}

export function isWeaponOwned(base: BaseState, weaponId: string): boolean {
  if (weaponStockCount(base, weaponId) > 0) {
    return true;
  }
  return Object.values(base.aircraftLoadouts).some((loadout) =>
    loadout.includes(weaponId),
  );
}

export function installWeapon(
  base: BaseState,
  aircraftId: string,
  slotIndex: number,
  weaponId: string,
): BaseState {
  const loadout = [...(base.aircraftLoadouts[aircraftId] ?? [])];
  if (slotIndex < 0 || slotIndex >= loadout.length) {
    throw new RangeError(`Slot ${slotIndex} is out of range for ${aircraftId}.`);
  }
  if (loadout[slotIndex] !== null) {
    throw new Error(`Slot ${slotIndex} of ${aircraftId} is occupied.`);
  }
  if (weaponStockCount(base, weaponId) <= 0) {
    throw new Error(`No ${weaponId} is available in the warehouse.`);
  }
  loadout[slotIndex] = weaponId;
  const stock = { ...base.weaponStock };
  stock[weaponId] = (stock[weaponId] ?? 0) - 1;
  if (stock[weaponId] === 0) {
    delete stock[weaponId];
  }
  return {
    ...base,
    aircraftLoadouts: { ...base.aircraftLoadouts, [aircraftId]: loadout },
    weaponStock: stock,
  };
}

export function removeWeapon(
  base: BaseState,
  aircraftId: string,
  slotIndex: number,
): BaseState {
  const loadout = [...(base.aircraftLoadouts[aircraftId] ?? [])];
  const weaponId = loadout[slotIndex] ?? null;
  if (weaponId === null) {
    return base;
  }
  loadout[slotIndex] = null;
  const stock = { ...base.weaponStock };
  stock[weaponId] = (stock[weaponId] ?? 0) + 1;
  return {
    ...base,
    aircraftLoadouts: { ...base.aircraftLoadouts, [aircraftId]: loadout },
    weaponStock: stock,
  };
}

export function moduleWarehouseCount(base: BaseState, moduleId: string): number {
  return base.manufacturedEquipmentIds.filter((id) => id === moduleId).length;
}

export function moduleInstalledOn(base: BaseState, aircraftId: string): string | null {
  return base.aircraftModules[aircraftId] ?? null;
}

export function installModule(
  base: BaseState,
  aircraftId: string,
  moduleId: string,
): BaseState {
  if (moduleInstalledOn(base, aircraftId) !== null) {
    throw new Error(`${aircraftId} already has a module installed.`);
  }
  const available = base.manufacturedEquipmentIds.filter((id) => id === moduleId).length;
  const installedElsewhere = Object.values(base.aircraftModules).filter(
    (id) => id === moduleId,
  ).length;
  if (available - installedElsewhere <= 0) {
    throw new Error(`No ${moduleId} is available in storage.`);
  }
  return {
    ...base,
    aircraftModules: { ...base.aircraftModules, [aircraftId]: moduleId },
  };
}

export function removeModule(base: BaseState, aircraftId: string): BaseState {
  if (moduleInstalledOn(base, aircraftId) === null) {
    return base;
  }
  return {
    ...base,
    aircraftModules: { ...base.aircraftModules, [aircraftId]: null },
  };
}

export function consumableCount(base: BaseState, consumableId: string): number {
  return base.consumableStock[consumableId] ?? 0;
}

export function addConsumables(
  base: BaseState,
  consumableId: string,
  count: number,
): BaseState {
  if (!Number.isInteger(count) || count < 0) {
    throw new RangeError('Consumable count must be a non-negative integer.');
  }
  const next = { ...base.consumableStock };
  next[consumableId] = (next[consumableId] ?? 0) + count;
  if (next[consumableId] === 0) {
    delete next[consumableId];
  }
  return { ...base, consumableStock: next };
}

export function consumeConsumables(
  base: BaseState,
  consumableId: string,
  count: number,
): BaseState {
  const available = consumableCount(base, consumableId);
  if (available < count) {
    throw new Error(`Not enough ${consumableId} in storage.`);
  }
  const next = { ...base.consumableStock };
  next[consumableId] = available - count;
  if (next[consumableId] === 0) {
    delete next[consumableId];
  }
  return { ...base, consumableStock: next };
}
