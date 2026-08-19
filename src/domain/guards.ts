import type { GameState } from './model';
import { SAVE_SCHEMA_VERSION } from './model';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function isGameState(
  value: unknown,
  expectedVersion: number = SAVE_SCHEMA_VERSION,
): value is GameState {
  if (!isRecord(value) || value.schemaVersion !== expectedVersion) {
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
    (typeof value.base.activePilotId === 'string' ||
      value.base.activePilotId === null) &&
    Array.isArray(value.base.pilots) &&
    isAircraftInstanceRecord(value.base.aircraftInstances) &&
    isAircraftHistoryRecord(value.base.aircraftHistory) &&
    Array.isArray(value.base.missionResults) &&
    Array.isArray(value.base.intelFacts) &&
    Array.isArray(value.base.researchQueue) &&
    Array.isArray(value.base.preservedTechnologyIds) &&
    Array.isArray(value.base.ownedPrimaryWeaponIds) &&
    isPrimaryWeaponLoadout(value.base.equippedPrimaryWeaponIds) &&
    Number.isInteger(value.base.marketSeed) &&
    Number.isInteger(value.base.sortiesCompleted) &&
    (value.base.sortiesCompleted as number) >= 0 &&
    Array.isArray(value.base.constructedBuildingIds) &&
    Array.isArray(value.base.staff) &&
    value.base.staff.every(isStaffMember) &&
    Array.isArray(value.base.unlockedBlueprintIds) &&
    Array.isArray(value.base.locallyProducedWeaponIds) &&
    Array.isArray(value.base.researchedWeaponUpgradeIds) &&
    Array.isArray(value.base.manufacturedWeaponUpgradeIds) &&
    Array.isArray(value.base.researchedAircraftUpgradeIds) &&
    Array.isArray(value.base.manufacturedAircraftUpgradeIds) &&
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
        mission.threatLevel >= 1 &&
        (mission.type === 'sweep' ||
          mission.type === 'interception' ||
          mission.type === 'escort' ||
          mission.type === 'recon'),
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
    isLoadoutRecord(value.base.aircraftLoadouts) &&
    isCountRecord(value.base.weaponStock) &&
    isCountRecord(value.base.consumableStock) &&
    isNullableStringRecord(value.base.aircraftModules) &&
    isLoadoutRecord(value.base.aircraftHardpoints) &&
    isAircraftMarkRecord(value.base.aircraftMarks) &&
    isRatioRecord(value.base.aircraftDamage) &&
    isCountRecord(value.base.aircraftRepair) &&
    Array.isArray(value.base.staffCandidates) &&
    value.base.staffCandidates.every(isStaffCandidate) &&
    isCountRecord(value.base.staffXp) &&
    Array.isArray(value.base.constructionQueue) &&
    value.base.constructionQueue.every(isConstructionJob) &&
    Array.isArray(value.base.productionQueue) &&
    value.base.productionQueue.every(isProductionJob) &&
    Array.isArray(value.base.resolvedThreatIds) &&
    value.base.resolvedThreatIds.every((id) => typeof id === 'string') &&
    Array.isArray(value.base.pilotCandidates) &&
    value.base.pilotCandidates.every(isPilotCandidate) &&
    isCountRecord(value.base.pilotXp) &&
    isRatioRecord(value.base.pilotFatigue) &&
    isPilotInjuryRecord(value.base.pilotInjuries) &&
    isStringArray(value.base.deadPilotIds) &&
    isCountRecord(value.base.pilotDeathMonth) &&
    (value.base.activeMissionId === null ||
      typeof value.base.activeMissionId === 'string') &&
    typeof value.base.monthIncome === 'number' &&
    value.base.monthIncome >= 0 &&
    (value.base.monthReport === null || isRecord(value.base.monthReport)) &&
    isRecord(value.base.nationThanks) &&
    Object.values(value.base.nationThanks).every(
      (entry) => typeof entry === 'boolean',
    ) &&
    Array.isArray(value.technologyCatalog) &&
    (value.activeRun === null || isRecord(value.activeRun))
  );
}

function isLoadoutRecord(value: unknown): boolean {
  return (
    isRecord(value) &&
    Object.values(value).every(
      (loadout) =>
        Array.isArray(loadout) &&
        loadout.every((id) => id === null || typeof id === 'string'),
    )
  );
}

function isCountRecord(value: unknown): boolean {
  return (
    isRecord(value) &&
    Object.values(value).every((entry) => typeof entry === 'number')
  );
}

function isAircraftMarkRecord(value: unknown): boolean {
  return (
    isRecord(value) &&
    Object.values(value).every(
      (entry) => typeof entry === 'number' && Number.isInteger(entry) && entry >= 2,
    )
  );
}

function isNullableStringRecord(value: unknown): boolean {
  return (
    isRecord(value) &&
    Object.values(value).every(
      (entry) => entry === null || typeof entry === 'string',
    )
  );
}

function isRatioRecord(value: unknown): boolean {
  return (
    isRecord(value) &&
    Object.values(value).every(
      (entry) =>
        typeof entry === 'number' && entry >= 0 && entry <= 1,
    )
  );
}

function isStringArray(value: unknown): boolean {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}

function isPilotInjuryRecord(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }
  return Object.values(value).every(
    (entry) =>
      isRecord(entry) &&
      (entry.severity === 'light' ||
        entry.severity === 'medium' ||
        entry.severity === 'severe') &&
      typeof entry.monthsRemaining === 'number' &&
      (entry.treatment === 'outsource' ||
        entry.treatment === 'medical' ||
        entry.treatment === null),
  );
}

function isStaffMember(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.roleId === 'string' &&
    typeof value.firstName === 'string' &&
    typeof value.lastName === 'string' &&
    typeof value.tier === 'number' &&
    typeof value.progressMultiplier === 'number' &&
    typeof value.salaryMultiplier === 'number'
  );
}

function isStaffCandidate(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.roleId === 'string' &&
    typeof value.firstName === 'string' &&
    typeof value.lastName === 'string' &&
    typeof value.tier === 'number' &&
    typeof value.hireCreditCost === 'number' &&
    typeof value.salaryCreditCost === 'number' &&
    typeof value.progressMultiplier === 'number' &&
    typeof value.salaryMultiplier === 'number' &&
    typeof value.originCountryId === 'string'
  );
}

function isConstructionJob(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.buildingId === 'string' &&
    typeof value.progress === 'number' &&
    typeof value.requiredProgress === 'number'
  );
}

function isProductionJob(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.projectId === 'string' &&
    (value.kind === 'equipment' ||
      value.kind === 'weapon' ||
      value.kind === 'upgrade' ||
      value.kind === 'aircraft' ||
      value.kind === 'aircraft-upgrade') &&
    typeof value.progress === 'number' &&
    typeof value.requiredProgress === 'number' &&
    (value.quantity === undefined || typeof value.quantity === 'number')
  );
}

function isPilotCandidate(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.firstName === 'string' &&
    typeof value.lastName === 'string' &&
    typeof value.tier === 'number' &&
    (value.specialization === 'speed' ||
      value.specialization === 'damage' ||
      value.specialization === 'recovery') &&
    typeof value.hireCreditCost === 'number' &&
    typeof value.salaryCreditCost === 'number' &&
    typeof value.progressMultiplier === 'number' &&
    typeof value.salaryMultiplier === 'number' &&
    typeof value.originCountryId === 'string'
  );
}

function isAircraftInstanceRecord(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }
  return Object.values(value).every(
    (entry) =>
      isRecord(entry) &&
      typeof entry.id === 'string' &&
      typeof entry.definitionId === 'string' &&
      typeof entry.callsign === 'string' &&
      (entry.assignedPilotId === null || typeof entry.assignedPilotId === 'string') &&
      (entry.status === 'ready' ||
        entry.status === 'damaged' ||
        entry.status === 'destroyed') &&
      typeof entry.historyId === 'string',
  );
}

function isAircraftHistoryRecord(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }
  return Object.values(value).every(
    (entry) =>
      isRecord(entry) &&
      typeof entry.id === 'string' &&
      typeof entry.definitionId === 'string' &&
      typeof entry.callsign === 'string' &&
      typeof entry.acquiredMonth === 'number' &&
      (entry.destroyedMonth === null || typeof entry.destroyedMonth === 'number') &&
      typeof entry.legacyImported === 'boolean' &&
      typeof entry.missions === 'number' &&
      typeof entry.kills === 'number' &&
      typeof entry.eliteKills === 'number',
  );
}

function isPrimaryWeaponLoadout(value: unknown): boolean {
  return (
    Array.isArray(value) &&
    value.length >= 1 &&
    value.every((weaponId) => weaponId === null || typeof weaponId === 'string') &&
    value.some((weaponId) => typeof weaponId === 'string')
  );
}
