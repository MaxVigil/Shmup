import type {
  AircraftUpgradeDefinition,
  MarketWeaponBlueprintDefinition,
  WeaponUpgradeDefinition,
} from '../content/model';
import { contentCatalog } from '../content/catalog';
import type { GameState, ProductionJobState } from './model';
import { marketBlueprintPrice } from './terrestrial-market';
import { addWeaponStock } from './armory';

export function purchaseMarketBlueprint(
  state: GameState,
  blueprint: {
    readonly id: string;
    readonly minimumSorties: number;
    readonly marketPrice: {
      readonly minimum: number;
      readonly maximum: number;
    };
  },
): GameState {
  if (state.base.sortiesCompleted < blueprint.minimumSorties) {
    throw new Error(`Blueprint ${blueprint.id} is not yet available.`);
  }
  if (state.base.unlockedBlueprintIds.includes(blueprint.id)) {
    throw new Error(`Blueprint ${blueprint.id} is already owned.`);
  }
  const price = marketBlueprintPrice(
    blueprint,
    state.base.marketSeed,
    state.base.sortiesCompleted,
  );
  if (state.base.credits < price) {
    throw new Error(`Blueprint ${blueprint.id} requires ${price} credits.`);
  }
  return {
    ...state,
    base: {
      ...state.base,
      credits: state.base.credits - price,
      unlockedBlueprintIds: [...state.base.unlockedBlueprintIds, blueprint.id],
    },
  };
}

export function manufacturePrimaryWeapon(
  state: GameState,
  blueprint: MarketWeaponBlueprintDefinition,
): GameState {
  if (!state.base.unlockedBlueprintIds.includes(blueprint.id)) {
    throw new Error(`Blueprint ${blueprint.id} is required for production.`);
  }
  if (!state.base.constructedBuildingIds.includes(blueprint.requiredBuildingId)) {
    throw new Error(`Building ${blueprint.requiredBuildingId} is required for production.`);
  }
  if (!state.base.staff.some((member) => member.roleId === blueprint.requiredStaffRoleId)) {
    throw new Error(`Staff role ${blueprint.requiredStaffRoleId} is required for production.`);
  }
  if (state.base.locallyProducedWeaponIds.includes(blueprint.weaponId)) {
    throw new Error(`Weapon ${blueprint.weaponId} has already entered local production.`);
  }
  if (
    state.base.credits < blueprint.productionCreditCost ||
    state.base.materials < blueprint.productionMaterialCost
  ) {
    throw new Error(`Insufficient resources to manufacture ${blueprint.weaponId}.`);
  }
  return {
    ...state,
    base: {
      ...addWeaponStock(state.base, blueprint.weaponId, 1),
      credits: state.base.credits - blueprint.productionCreditCost,
      materials: state.base.materials - blueprint.productionMaterialCost,
      locallyProducedWeaponIds: [
        ...state.base.locallyProducedWeaponIds,
        blueprint.weaponId,
      ],
      ownedPrimaryWeaponIds: state.base.ownedPrimaryWeaponIds.includes(blueprint.weaponId)
        ? state.base.ownedPrimaryWeaponIds
        : [...state.base.ownedPrimaryWeaponIds, blueprint.weaponId],
    },
  };
}

export function startWeaponUpgradeResearch(
  state: GameState,
  upgrade: WeaponUpgradeDefinition,
): GameState {
  if (!state.base.constructedBuildingIds.includes(upgrade.requiredResearchBuildingId)) {
    throw new Error(`Building ${upgrade.requiredResearchBuildingId} is required for research.`);
  }
  if (!state.base.staff.some((member) => member.roleId === upgrade.requiredStaffRoleId)) {
    throw new Error(`Staff role ${upgrade.requiredStaffRoleId} is required for research.`);
  }
  if (!state.base.ownedPrimaryWeaponIds.includes(upgrade.weaponId)) {
    throw new Error(`Weapon ${upgrade.weaponId} is required for its improvement.`);
  }
  if (
    upgrade.requiredBlueprintId !== null &&
    !state.base.unlockedBlueprintIds.includes(upgrade.requiredBlueprintId)
  ) {
    throw new Error(`Blueprint ${upgrade.requiredBlueprintId} is required for research.`);
  }
  if (
    upgrade.requiredLocallyProducedWeaponId !== null &&
    !state.base.locallyProducedWeaponIds.includes(upgrade.requiredLocallyProducedWeaponId)
  ) {
    throw new Error(
      `Local production of ${upgrade.requiredLocallyProducedWeaponId} is required for research.`,
    );
  }
  if (state.base.researchedWeaponUpgradeIds.includes(upgrade.id)) {
    throw new Error(`Upgrade ${upgrade.id} has already been researched.`);
  }
  if (state.base.researchQueue.some((project) => project.blueprintId === upgrade.id)) {
    throw new Error(`Upgrade ${upgrade.id} is already being researched.`);
  }
  if (state.base.researchQueue.length > 0) {
    throw new Error('One research project can be active at a time.');
  }
  if (state.base.credits < upgrade.researchCreditCost) {
    throw new Error(`Upgrade ${upgrade.id} requires ${upgrade.researchCreditCost} credits.`);
  }
  return {
    ...state,
    base: {
      ...state.base,
      credits: state.base.credits - upgrade.researchCreditCost,
      researchQueue: [
        ...state.base.researchQueue,
        {
          blueprintId: upgrade.id,
          progress: 0,
          requiredProgress: upgrade.researchSorties,
        },
      ],
    },
  };
}

export function manufactureWeaponUpgrade(
  state: GameState,
  upgrade: WeaponUpgradeDefinition,
): GameState {
  if (!state.base.researchedWeaponUpgradeIds.includes(upgrade.id)) {
    throw new Error(`Upgrade ${upgrade.id} has not been researched.`);
  }
  if (!state.base.constructedBuildingIds.includes(upgrade.requiredProductionBuildingId)) {
    throw new Error(`Building ${upgrade.requiredProductionBuildingId} is required for production.`);
  }
  if (!state.base.staff.some(
    (member) => member.roleId === upgrade.requiredProductionStaffRoleId,
  )) {
    throw new Error(
      `Staff role ${upgrade.requiredProductionStaffRoleId} is required for production.`,
    );
  }
  if (state.base.manufacturedWeaponUpgradeIds.includes(upgrade.id)) {
    throw new Error(`Upgrade ${upgrade.id} has already been manufactured.`);
  }
  if (
    state.base.credits < upgrade.productionCreditCost ||
    state.base.materials < upgrade.productionMaterialCost
  ) {
    throw new Error(`Insufficient resources to manufacture ${upgrade.id}.`);
  }
  return {
    ...state,
    base: {
      ...state.base,
      credits: state.base.credits - upgrade.productionCreditCost,
      materials: state.base.materials - upgrade.productionMaterialCost,
      manufacturedWeaponUpgradeIds: [...state.base.manufacturedWeaponUpgradeIds, upgrade.id],
    },
  };
}

export function applyWeaponUpgrades<T extends {
  readonly id: string;
  readonly damage: number;
  readonly shotsPerSecond: number;
}>(
  weapon: T,
  manufacturedUpgradeIds: readonly string[],
  upgrades: readonly WeaponUpgradeDefinition[],
): T {
  let damage = weapon.damage;
  let shotsPerSecond = weapon.shotsPerSecond;
  for (const upgrade of upgrades) {
    if (upgrade.weaponId === weapon.id && manufacturedUpgradeIds.includes(upgrade.id)) {
      damage *= upgrade.damageMultiplier;
      shotsPerSecond *= upgrade.cadenceMultiplier;
    }
  }
  return { ...weapon, damage, shotsPerSecond };
}

/** Queues an aircraft upgrade tier for research; requires the aircraft blueprint. */
export function startAircraftUpgradeResearch(
  state: GameState,
  upgrade: AircraftUpgradeDefinition,
): GameState {
  if (!state.base.unlockedBlueprintIds.includes(upgrade.aircraftBlueprintId)) {
    throw new Error(
      `Blueprint ${upgrade.aircraftBlueprintId} is required for aircraft upgrades.`,
    );
  }
  if (upgrade.tier === 2) {
    const previousTier = contentCatalog.aircraftUpgrades.find(
      (entry) =>
        entry.aircraftBlueprintId === upgrade.aircraftBlueprintId && entry.tier === 1,
    );
    if (
      previousTier !== undefined &&
      !state.base.researchedAircraftUpgradeIds.includes(previousTier.id)
    ) {
      throw new Error(
        `Aircraft upgrade ${previousTier.id} must be researched before ${upgrade.id}.`,
      );
    }
  }
  if (!state.base.constructedBuildingIds.includes(upgrade.requiredResearchBuildingId)) {
    throw new Error(
      `Building ${upgrade.requiredResearchBuildingId} is required for research.`,
    );
  }
  if (!state.base.staff.some((member) => member.roleId === upgrade.requiredStaffRoleId)) {
    throw new Error(`Staff role ${upgrade.requiredStaffRoleId} is required for research.`);
  }
  if (state.base.researchedAircraftUpgradeIds.includes(upgrade.id)) {
    throw new Error(`Aircraft upgrade ${upgrade.id} has already been researched.`);
  }
  if (state.base.researchQueue.some((project) => project.blueprintId === upgrade.id)) {
    throw new Error(`Aircraft upgrade ${upgrade.id} is already being researched.`);
  }
  if (state.base.researchQueue.length > 0) {
    throw new Error('One research project can be active at a time.');
  }
  if (state.base.credits < upgrade.researchCreditCost) {
    throw new Error(`Aircraft upgrade ${upgrade.id} requires ${upgrade.researchCreditCost} credits.`);
  }
  return {
    ...state,
    base: {
      ...state.base,
      credits: state.base.credits - upgrade.researchCreditCost,
      researchQueue: [
        ...state.base.researchQueue,
        {
          blueprintId: upgrade.id,
          progress: 0,
          requiredProgress: upgrade.researchSorties,
        },
      ],
    },
  };
}

/** Queues the manufacture of a researched aircraft upgrade tier in the workshop. */
export function startAircraftUpgradeProduction(
  state: GameState,
  upgrade: AircraftUpgradeDefinition,
): GameState {
  if (!state.base.researchedAircraftUpgradeIds.includes(upgrade.id)) {
    throw new Error(`Aircraft upgrade ${upgrade.id} has not been researched.`);
  }
  if (upgrade.tier === 2) {
    const previousTier = contentCatalog.aircraftUpgrades.find(
      (entry) =>
        entry.aircraftBlueprintId === upgrade.aircraftBlueprintId && entry.tier === 1,
    );
    if (
      previousTier !== undefined &&
      !state.base.manufacturedAircraftUpgradeIds.includes(previousTier.id)
    ) {
      throw new Error(
        `Aircraft upgrade ${previousTier.id} must be manufactured before ${upgrade.id}.`,
      );
    }
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
  if (state.base.manufacturedAircraftUpgradeIds.includes(upgrade.id)) {
    throw new Error(`Aircraft upgrade ${upgrade.id} has already been manufactured.`);
  }
  if (state.base.productionQueue.some((job) => job.projectId === upgrade.id)) {
    throw new Error(`Aircraft upgrade ${upgrade.id} is already in production.`);
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
    kind: 'aircraft-upgrade',
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

/** Applies every manufactured upgrade tier for an aircraft to its stats. */
export function applyAircraftUpgrades<T extends {
  readonly id: string;
  readonly armour: number;
  readonly speedMultiplier: number;
  readonly damageMultiplier: number;
}>(
  aircraft: T,
  manufacturedUpgradeIds: readonly string[],
  upgrades: readonly AircraftUpgradeDefinition[],
): T {
  let armour = aircraft.armour;
  let speedMultiplier = aircraft.speedMultiplier;
  let damageMultiplier = aircraft.damageMultiplier;
  for (const upgrade of upgrades) {
    const blueprint = contentCatalog.aircraftBlueprints.find(
      (entry) => entry.id === upgrade.aircraftBlueprintId,
    );
    if (
      blueprint !== undefined &&
      blueprint.outputAircraftId === aircraft.id &&
      manufacturedUpgradeIds.includes(upgrade.id)
    ) {
      armour += upgrade.armourDelta;
      speedMultiplier += upgrade.speedMultiplierDelta;
      damageMultiplier += upgrade.damageMultiplierDelta;
    }
  }
  return { ...aircraft, armour, speedMultiplier, damageMultiplier };
}
