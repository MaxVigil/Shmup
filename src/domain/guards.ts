import type { GameState } from './model';
import { SAVE_SCHEMA_VERSION } from './model';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function isGameState(value: unknown): value is GameState {
  if (!isRecord(value) || value.schemaVersion !== SAVE_SCHEMA_VERSION) {
    return false;
  }

  if (!isRecord(value.base)) {
    return false;
  }

  return (
    typeof value.base.credits === 'number' &&
    typeof value.base.materials === 'number' &&
    typeof value.base.research === 'number' &&
    typeof value.base.energyCapacity === 'number' &&
    typeof value.base.allocatedEnergy === 'number' &&
    typeof value.base.activePilotId === 'string' &&
    Array.isArray(value.base.pilots) &&
    Array.isArray(value.base.researchQueue) &&
    Array.isArray(value.base.preservedTechnologyIds) &&
    Array.isArray(value.base.ownedPrimaryWeaponIds) &&
    isPrimaryWeaponLoadout(value.base.equippedPrimaryWeaponIds) &&
    Number.isInteger(value.base.marketSeed) &&
    Number.isInteger(value.base.sortiesCompleted) &&
    (value.base.sortiesCompleted as number) >= 0 &&
    Array.isArray(value.base.constructedBuildingIds) &&
    Array.isArray(value.base.staff) &&
    Array.isArray(value.base.unlockedBlueprintIds) &&
    Array.isArray(value.base.locallyProducedWeaponIds) &&
    Array.isArray(value.base.researchedWeaponUpgradeIds) &&
    Array.isArray(value.base.manufacturedWeaponUpgradeIds) &&
    Array.isArray(value.base.manufacturedEquipmentIds) &&
    (value.base.equippedEquipmentId === null ||
      typeof value.base.equippedEquipmentId === 'string') &&
    typeof value.base.telemetryRecorded === 'boolean' &&
    Array.isArray(value.base.hangarSlots) &&
    value.base.hangarSlots.every(
      (slot) => slot === null || typeof slot === 'string',
    ) &&
    (value.base.activeAircraftId === null ||
      typeof value.base.activeAircraftId === 'string') &&
    typeof value.base.month === 'number' &&
    Number.isInteger(value.base.month) &&
    value.base.month >= 1 &&
    Array.isArray(value.base.fueledAircraftIds) &&
    value.base.fueledAircraftIds.every((id) => typeof id === 'string') &&
    Array.isArray(value.base.threatMap) &&
    value.base.threatMap.every(
      (mission) =>
        typeof mission.id === 'string' &&
        typeof mission.targetCountryId === 'string' &&
        typeof mission.threatLevel === 'number' &&
        Number.isInteger(mission.threatLevel) &&
        mission.threatLevel >= 1,
    ) &&
    Array.isArray(value.base.loans) &&
    value.base.loans.every(
      (loan) =>
        typeof loan.id === 'string' &&
        typeof loan.lenderId === 'string' &&
        typeof loan.principal === 'number' &&
        typeof loan.repaymentDue === 'number' &&
        typeof loan.dueMonth === 'number' &&
        typeof loan.repaid === 'boolean',
    ) &&
    Array.isArray(value.technologyCatalog) &&
    (value.activeRun === null || isRecord(value.activeRun))
  );
}

function isPrimaryWeaponLoadout(
  value: unknown,
): value is readonly [string | null, string | null] {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    value.every((weaponId) => weaponId === null || typeof weaponId === 'string') &&
    value.some((weaponId) => typeof weaponId === 'string') &&
    (value[0] === null || value[1] === null || value[0] !== value[1])
  );
}
