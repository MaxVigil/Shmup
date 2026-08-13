import type {
  MarketWeaponBlueprintDefinition,
  WeaponUpgradeDefinition,
} from '../content/model';
import type { GameState } from './model';
import { marketBlueprintPrice } from './terrestrial-market';
import { addWeaponStock } from './armory';

export function purchaseMarketBlueprint(
  state: GameState,
  blueprint: MarketWeaponBlueprintDefinition,
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

export function researchWeaponUpgrade(
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
  if (state.base.credits < upgrade.researchCreditCost) {
    throw new Error(`Upgrade ${upgrade.id} requires ${upgrade.researchCreditCost} credits.`);
  }
  return {
    ...state,
    base: {
      ...state.base,
      credits: state.base.credits - upgrade.researchCreditCost,
      researchedWeaponUpgradeIds: [...state.base.researchedWeaponUpgradeIds, upgrade.id],
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
