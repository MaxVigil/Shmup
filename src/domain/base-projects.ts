import { contentCatalog } from '../content/catalog';
import type { EquipmentDefinition } from '../content/model';
import type { BaseState, ConstructionJobState, GameState, ProductionJobState } from './model';
import { addWeaponStock } from './armory';
import { operationsSpeedMultiplier, staffContribution } from './staff-market';

/* =====================================================================
   Base project queues
   Construction and production are queued, cost money and materials up
   front, and advance per completed sortie. Construction progresses by
   one step per sortie; production is accelerated by engineers.
   ===================================================================== */

/* ---- Construction ---- */

export function startConstruction(
  state: GameState,
  building: {
    readonly id: string;
    readonly creditCost: number;
    readonly materialCost: number;
    readonly constructionSorties: number;
    readonly requiredBlueprintId: string | null;
    readonly requiredBuildingId: string | null;
  },
): GameState {
  if (state.base.constructedBuildingIds.includes(building.id)) {
    throw new Error(`Building ${building.id} has already been constructed.`);
  }
  if (state.base.constructionQueue.some((job) => job.buildingId === building.id)) {
    throw new Error(`Building ${building.id} is already under construction.`);
  }
  if (
    building.requiredBlueprintId !== null &&
    !state.base.unlockedBlueprintIds.includes(building.requiredBlueprintId)
  ) {
    throw new Error(`Blueprint ${building.requiredBlueprintId} is required for ${building.id}.`);
  }
  if (
    building.requiredBuildingId !== null &&
    !state.base.constructedBuildingIds.includes(building.requiredBuildingId)
  ) {
    throw new Error(`Building ${building.requiredBuildingId} is required for ${building.id}.`);
  }
  if (
    state.base.credits < building.creditCost ||
    state.base.materials < building.materialCost
  ) {
    throw new Error(`Insufficient resources to construct ${building.id}.`);
  }
  const job: ConstructionJobState = {
    id: `construction-${building.id}`,
    buildingId: building.id,
    progress: 0,
    requiredProgress: building.constructionSorties,
  };
  return {
    ...state,
    base: {
      ...state.base,
      credits: state.base.credits - building.creditCost,
      materials: state.base.materials - building.materialCost,
      constructionQueue: [...state.base.constructionQueue, job],
    },
  };
}

/** Advances every construction job by one step per completed sortie. */
export function advanceConstruction(base: BaseState): BaseState {
  if (base.constructionQueue.length === 0) {
    return base;
  }
  const completed: string[] = [];
  const remaining: ConstructionJobState[] = [];
  for (const job of base.constructionQueue) {
    const progress = job.progress + 1;
    if (progress >= job.requiredProgress) {
      completed.push(job.buildingId);
    } else {
      remaining.push({ ...job, progress });
    }
  }
  return {
    ...base,
    constructedBuildingIds: [...new Set([...base.constructedBuildingIds, ...completed])],
    constructionQueue: remaining,
  };
}
/* ---- Production ---- */

export function startEquipmentProduction(
  state: GameState,
  blueprint: { readonly id: string; readonly outputEquipmentId: string },
  equipment: EquipmentDefinition,
): GameState {
  if (!state.base.unlockedBlueprintIds.includes(blueprint.id)) {
    throw new Error(`Blueprint ${blueprint.id} has not been researched.`);
  }
  if (!state.base.constructedBuildingIds.includes(equipment.requiredBuildingId)) {
    throw new Error(`Building ${equipment.requiredBuildingId} is required for manufacturing.`);
  }
  if (!state.base.staff.some((member) => member.roleId === equipment.requiredStaffRoleId)) {
    throw new Error(`Staff role ${equipment.requiredStaffRoleId} is required for manufacturing.`);
  }
  if (state.base.manufacturedEquipmentIds.includes(equipment.id)) {
    throw new Error(`Equipment ${equipment.id} has already been manufactured.`);
  }
  if (state.base.productionQueue.some((job) => job.projectId === blueprint.id)) {
    throw new Error(`Blueprint ${blueprint.id} is already in production.`);
  }
  if (
    state.base.credits < equipment.creditCost ||
    state.base.materials < equipment.materialCost
  ) {
    throw new Error(`Insufficient resources to manufacture ${equipment.id}.`);
  }
  const job: ProductionJobState = {
    id: `production-${blueprint.id}`,
    projectId: blueprint.id,
    kind: 'equipment',
    progress: 0,
    requiredProgress: equipment.productionSorties,
    quantity: 1,
  };
  return {
    ...state,
    base: {
      ...state.base,
      credits: state.base.credits - equipment.creditCost,
      materials: state.base.materials - equipment.materialCost,
      productionQueue: [...state.base.productionQueue, job],
    },
  };
}

export function startWeaponProduction(
  state: GameState,
  projectId: string,
  weapon: {
    readonly id: string;
    readonly productionCreditCost: number;
    readonly productionMaterialCost: number;
    readonly productionSorties: number;
    readonly requiredProductionBuildingId: string;
    readonly requiredProductionStaffRoleId: string;
  },
  quantity = 1,
): GameState {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new RangeError('Production quantity must be a positive integer.');
  }
  if (!state.base.unlockedBlueprintIds.includes(projectId)) {
    throw new Error(`Blueprint ${projectId} is required for production.`);
  }
  if (
    !state.base.constructedBuildingIds.includes(weapon.requiredProductionBuildingId)
  ) {
    throw new Error(
      `Building ${weapon.requiredProductionBuildingId} is required for production.`,
    );
  }
  if (
    !state.base.staff.some(
      (member) => member.roleId === weapon.requiredProductionStaffRoleId,
    )
  ) {
    throw new Error(
      `Staff role ${weapon.requiredProductionStaffRoleId} is required for production.`,
    );
  }
  if (state.base.productionQueue.some((job) => job.projectId === projectId)) {
    throw new Error(`Blueprint ${projectId} is already in production.`);
  }
  const totalCreditCost = weapon.productionCreditCost * quantity;
  const totalMaterialCost = weapon.productionMaterialCost * quantity;
  if (
    state.base.credits < totalCreditCost ||
    state.base.materials < totalMaterialCost
  ) {
    throw new Error(`Insufficient resources to manufacture ${weapon.id}.`);
  }
  const job: ProductionJobState = {
    id: `production-${projectId}`,
    projectId,
    kind: 'weapon',
    progress: 0,
    requiredProgress: weapon.productionSorties,
    quantity,
  };
  return {
    ...state,
    base: {
      ...state.base,
      credits: state.base.credits - totalCreditCost,
      materials: state.base.materials - totalMaterialCost,
      productionQueue: [...state.base.productionQueue, job],
    },
  };
}

/** Total credit + material cost for producing `quantity` weapon units. */
export function weaponProductionCost(
  weapon: {
    readonly productionCreditCost: number;
    readonly productionMaterialCost: number;
  },
  quantity: number,
): { readonly credits: number; readonly materials: number } {
  return {
    credits: weapon.productionCreditCost * quantity,
    materials: weapon.productionMaterialCost * quantity,
  };
}

export function startAircraftProduction(
  state: GameState,
  blueprint: {
    readonly id: string;
    readonly outputAircraftId: string;
    readonly productionCreditCost: number;
    readonly productionMaterialCost: number;
    readonly productionSorties: number;
    readonly requiredBuildingId: string;
    readonly requiredStaffRoleId: string;
  },
): GameState {
  if (!state.base.unlockedBlueprintIds.includes(blueprint.id)) {
    throw new Error(`Blueprint ${blueprint.id} is required for production.`);
  }
  if (!state.base.constructedBuildingIds.includes(blueprint.requiredBuildingId)) {
    throw new Error(
      `Building ${blueprint.requiredBuildingId} is required for production.`,
    );
  }
  if (
    !state.base.staff.some(
      (member) => member.roleId === blueprint.requiredStaffRoleId,
    )
  ) {
    throw new Error(
      `Staff role ${blueprint.requiredStaffRoleId} is required for production.`,
    );
  }
  if (state.base.hangarSlots.includes(blueprint.outputAircraftId)) {
    throw new Error(`Aircraft ${blueprint.outputAircraftId} is already in the hangar.`);
  }
  if (!state.base.hangarSlots.includes(null)) {
    throw new Error('No free hangar slot is available.');
  }
  if (state.base.productionQueue.some((job) => job.projectId === blueprint.id)) {
    throw new Error(`Blueprint ${blueprint.id} is already in production.`);
  }
  if (
    state.base.credits < blueprint.productionCreditCost ||
    state.base.materials < blueprint.productionMaterialCost
  ) {
    throw new Error(`Insufficient resources to manufacture ${blueprint.outputAircraftId}.`);
  }
  const job: ProductionJobState = {
    id: `production-${blueprint.id}`,
    projectId: blueprint.id,
    kind: 'aircraft',
    progress: 0,
    requiredProgress: blueprint.productionSorties,
    quantity: 1,
  };
  return {
    ...state,
    base: {
      ...state.base,
      credits: state.base.credits - blueprint.productionCreditCost,
      materials: state.base.materials - blueprint.productionMaterialCost,
      productionQueue: [...state.base.productionQueue, job],
    },
  };
}

export function startUpgradeProduction(
  state: GameState,
  upgrade: {
    readonly id: string;
    readonly productionCreditCost: number;
    readonly productionMaterialCost: number;
    readonly productionSorties: number;
    readonly requiredProductionBuildingId: string;
    readonly requiredProductionStaffRoleId: string;
  },
): GameState {
  if (!state.base.researchedWeaponUpgradeIds.includes(upgrade.id)) {
    throw new Error(`Upgrade ${upgrade.id} has not been researched.`);
  }
  if (!state.base.constructedBuildingIds.includes(upgrade.requiredProductionBuildingId)) {
    throw new Error(
      `Building ${upgrade.requiredProductionBuildingId} is required for production.`,
    );
  }
  if (
    !state.base.staff.some(
      (member) => member.roleId === upgrade.requiredProductionStaffRoleId,
    )
  ) {
    throw new Error(
      `Staff role ${upgrade.requiredProductionStaffRoleId} is required for production.`,
    );
  }
  if (state.base.manufacturedWeaponUpgradeIds.includes(upgrade.id)) {
    throw new Error(`Upgrade ${upgrade.id} has already been manufactured.`);
  }
  if (state.base.productionQueue.some((job) => job.projectId === upgrade.id)) {
    throw new Error(`Upgrade ${upgrade.id} is already in production.`);
  }
  if (
    state.base.credits < upgrade.productionCreditCost ||
    state.base.materials < upgrade.productionMaterialCost
  ) {
    throw new Error(`Insufficient resources to manufacture ${upgrade.id}.`);
  }
  const job: ProductionJobState = {
    id: `production-${upgrade.id}`,
    projectId: upgrade.id,
    kind: 'upgrade',
    progress: 0,
    requiredProgress: upgrade.productionSorties,
    quantity: 1,
  };
  return {
    ...state,
    base: {
      ...state.base,
      credits: state.base.credits - upgrade.productionCreditCost,
      materials: state.base.materials - upgrade.productionMaterialCost,
      productionQueue: [...state.base.productionQueue, job],
    },
  };
}

/** Advances every production job by the engineers' contribution per sortie. */
export function advanceProduction(base: BaseState): BaseState {
  if (base.productionQueue.length === 0) {
    return base;
  }
  const engineerContribution = staffContribution(base, 'staff-engineer');
  const advance = Math.max(
    1,
    Math.round(engineerContribution * operationsSpeedMultiplier(base)),
  );
  const completed: ProductionJobState[] = [];
  const remaining: ProductionJobState[] = [];
  for (const job of base.productionQueue) {
    const progress = job.progress + advance;
    if (progress >= job.requiredProgress) {
      completed.push(job);
    } else {
      remaining.push({ ...job, progress });
    }
  }
  let next: BaseState = { ...base, productionQueue: remaining };
  for (const job of completed) {
    next = completeProductionJob(next, job);
  }
  return next;
}

function completeProductionJob(base: BaseState, job: ProductionJobState): BaseState {
  if (job.kind === 'equipment') {
    const blueprint = contentCatalog.blueprints.find(
      (entry) => entry.id === job.projectId,
    );
    if (blueprint === undefined) {
      return base;
    }
    return {
      ...base,
      manufacturedEquipmentIds: [
        ...new Set([...base.manufacturedEquipmentIds, blueprint.outputEquipmentId]),
      ],
    };
  }
  if (job.kind === 'upgrade') {
    return {
      ...base,
      manufacturedWeaponUpgradeIds: [
        ...new Set([...base.manufacturedWeaponUpgradeIds, job.projectId]),
      ],
    };
  }
  if (job.kind === 'aircraft') {
    const blueprint = contentCatalog.aircraftBlueprints.find(
      (entry) => entry.id === job.projectId,
    );
    if (blueprint === undefined) {
      return base;
    }
    const aircraft = contentCatalog.aircraft.find(
      (entry) => entry.id === blueprint.outputAircraftId,
    );
    if (
      aircraft === undefined ||
      base.hangarSlots.includes(aircraft.id)
    ) {
      return base;
    }
    const freeIndex = base.hangarSlots.indexOf(null);
    if (freeIndex === -1) {
      return base;
    }
    const hangarSlots = [...base.hangarSlots];
    hangarSlots[freeIndex] = aircraft.id;
    const loadout = Array.from(
      { length: aircraft.weaponSlotCount },
      () => null,
    );
    return {
      ...base,
      hangarSlots,
      aircraftLoadouts: {
        ...base.aircraftLoadouts,
        [aircraft.id]: loadout,
      },
      aircraftModules: {
        ...base.aircraftModules,
        [aircraft.id]: null,
      },
    };
  }
  const weapon = lookupWeaponByBlueprint(job.projectId);
  if (weapon === null) {
    return base;
  }
  const stock = addWeaponStock(base, weapon.id, job.quantity);
  return {
    ...stock,
    locallyProducedWeaponIds: stock.locallyProducedWeaponIds.includes(weapon.id)
      ? stock.locallyProducedWeaponIds
      : [...stock.locallyProducedWeaponIds, weapon.id],
    ownedPrimaryWeaponIds: stock.ownedPrimaryWeaponIds.includes(weapon.id)
      ? stock.ownedPrimaryWeaponIds
      : [...stock.ownedPrimaryWeaponIds, weapon.id],
  };
}

function lookupWeaponByBlueprint(projectId: string): { readonly id: string } | null {
  const market = contentCatalog.marketWeaponBlueprints.find(
    (entry) => entry.id === projectId,
  );
  if (market !== undefined) {
    return { id: market.weaponId };
  }
  const research = contentCatalog.researchWeaponBlueprints.find(
    (entry) => entry.id === projectId,
  );
  if (research !== undefined) {
    return { id: research.outputWeaponId };
  }
  const adapted = contentCatalog.adaptedWeaponBlueprints.find(
    (entry) => entry.id === projectId,
  );
  if (adapted !== undefined) {
    return { id: adapted.outputWeaponId };
  }
  return null;
}

