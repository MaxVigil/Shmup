import type { ContentCatalog } from './model';

function assertUniqueIds(
  groupName: string,
  entries: readonly { readonly id: string }[],
): void {
  const ids = new Set<string>();

  for (const entry of entries) {
    if (entry.id.trim().length === 0) {
      throw new Error(`${groupName} contains an empty id.`);
    }

    if (ids.has(entry.id)) {
      throw new Error(`${groupName} contains duplicate id: ${entry.id}`);
    }

    ids.add(entry.id);
  }
}

export function validateContentCatalog(catalog: ContentCatalog): void {
  assertUniqueIds('weapons', catalog.weapons);
  assertUniqueIds('alienTechnologies', catalog.alienTechnologies);
  assertUniqueIds('pilots', catalog.pilots);
  assertUniqueIds('enemies', catalog.enemies);
  assertUniqueIds('buildings', catalog.buildings);
  assertUniqueIds('staffRoles', catalog.staffRoles);
  assertUniqueIds('blueprints', catalog.blueprints);
  assertUniqueIds('buildingBlueprints', catalog.buildingBlueprints);
  assertUniqueIds('adaptedWeaponBlueprints', catalog.adaptedWeaponBlueprints);
  assertUniqueIds('researchWeaponBlueprints', catalog.researchWeaponBlueprints);
  assertUniqueIds('equipment', catalog.equipment);
  assertUniqueIds('marketWeaponBlueprints', catalog.marketWeaponBlueprints);
  assertUniqueIds('weaponUpgrades', catalog.weaponUpgrades);
  assertUniqueIds('aircraft', catalog.aircraft);
  assertUniqueIds('councilStates', catalog.councilStates);

  if (
    catalog.economy.startingCredits < 0 ||
    !Number.isInteger(catalog.economy.missedEnemyPenaltyMultiplier) ||
    catalog.economy.missedEnemyPenaltyMultiplier < 2
  ) {
    throw new Error('Base economy has invalid credit values.');
  }

  for (const building of catalog.buildings) {
    if (
      building.creditCost < 0 ||
      building.materialCost < 0 ||
      (building.requiredBlueprintId !== null &&
        !catalog.blueprints.some((blueprint) => blueprint.id === building.requiredBlueprintId) &&
        !catalog.buildingBlueprints.some((blueprint) =>
          blueprint.id === building.requiredBlueprintId)) ||
      (building.requiredBuildingId !== null &&
        !catalog.buildings.some((candidate) => candidate.id === building.requiredBuildingId))
    ) {
      throw new Error(`Building ${building.id} has invalid construction costs.`);
    }
  }


  for (const blueprint of catalog.blueprints) {
    if (
      !['earth', 'alien'].includes(blueprint.researchDomain) ||
      !Number.isInteger(blueprint.requiredProgress) ||
      blueprint.requiredProgress <= 0 ||
      !catalog.buildings.some((building) => building.id === blueprint.requiredBuildingId) ||
      !catalog.staffRoles.some((role) => role.id === blueprint.requiredStaffRoleId) ||
      !catalog.equipment.some((equipment) => equipment.id === blueprint.outputEquipmentId)
    ) {
      throw new Error(`Blueprint ${blueprint.id} has invalid research requirements.`);
    }
  }

  for (const blueprint of catalog.buildingBlueprints) {
    if (
      !['earth', 'alien'].includes(blueprint.researchDomain) ||
      !Number.isInteger(blueprint.requiredProgress) ||
      blueprint.requiredProgress <= 0 ||
      !catalog.buildings.some((building) => building.id === blueprint.requiredBuildingId) ||
      !catalog.staffRoles.some((role) => role.id === blueprint.requiredStaffRoleId) ||
      !catalog.buildings.some((building) => building.id === blueprint.outputBuildingId)
    ) {
      throw new Error(
        `Building blueprint ${blueprint.id} has invalid research requirements.`,
      );
    }
  }

  for (const blueprint of catalog.adaptedWeaponBlueprints) {
    if (
      !['earth', 'alien'].includes(blueprint.researchDomain) ||
      blueprint.productionCreditCost <= 0 ||
      blueprint.productionMaterialCost < 0 ||
      !catalog.weapons.some((weapon) => weapon.id === blueprint.outputWeaponId) ||
      !catalog.buildings.some(
        (building) => building.id === blueprint.requiredProductionBuildingId,
      ) ||
      !catalog.staffRoles.some(
        (role) => role.id === blueprint.requiredProductionStaffRoleId,
      )
    ) {
      throw new Error(
        `Adapted weapon blueprint ${blueprint.id} has invalid production requirements.`,
      );
    }
  }

  for (const blueprint of catalog.researchWeaponBlueprints) {
    if (
      !['earth', 'alien'].includes(blueprint.researchDomain) ||
      !Number.isInteger(blueprint.requiredProgress) ||
      blueprint.requiredProgress <= 0 ||
      !catalog.buildings.some((building) => building.id === blueprint.requiredBuildingId) ||
      !catalog.staffRoles.some((role) => role.id === blueprint.requiredStaffRoleId) ||
      !catalog.weapons.some((weapon) => weapon.id === blueprint.outputWeaponId) ||
      blueprint.productionCreditCost <= 0 ||
      blueprint.productionMaterialCost < 0 ||
      !catalog.buildings.some(
        (building) => building.id === blueprint.requiredProductionBuildingId,
      ) ||
      !catalog.staffRoles.some(
        (role) => role.id === blueprint.requiredProductionStaffRoleId,
      )
    ) {
      throw new Error(
        `Research weapon blueprint ${blueprint.id} has invalid requirements.`,
      );
    }
  }

  for (const equipment of catalog.equipment) {
    if (
      equipment.creditCost < 0 ||
      equipment.materialCost < 0 ||
      !catalog.buildings.some((building) => building.id === equipment.requiredBuildingId) ||
      !catalog.staffRoles.some((role) => role.id === equipment.requiredStaffRoleId)
    ) {
      throw new Error(`Equipment ${equipment.id} has invalid manufacturing requirements.`);
    }
  }

  for (const role of catalog.staffRoles) {
    if (
      role.creditCost <= 0 ||
      !catalog.buildings.some((building) => building.id === role.requiredBuildingId) ||
      (role.maximumHeadcount !== null && (
        !Number.isInteger(role.maximumHeadcount) || role.maximumHeadcount <= 0
      ))
    ) {
      throw new Error(`Staff role ${role.id} has invalid hiring requirements.`);
    }
  }

  for (const blueprint of catalog.marketWeaponBlueprints) {
    if (
      !catalog.weapons.some((weapon) => weapon.id === blueprint.weaponId) ||
      !Number.isInteger(blueprint.minimumSorties) ||
      blueprint.minimumSorties < 0 ||
      !Number.isInteger(blueprint.marketPrice.minimum) ||
      !Number.isInteger(blueprint.marketPrice.maximum) ||
      blueprint.marketPrice.minimum <= 0 ||
      blueprint.marketPrice.maximum < blueprint.marketPrice.minimum ||
      blueprint.productionCreditCost <= 0 ||
      blueprint.productionMaterialCost < 0 ||
      !catalog.buildings.some((building) => building.id === blueprint.requiredBuildingId) ||
      !catalog.staffRoles.some((role) => role.id === blueprint.requiredStaffRoleId)
    ) {
      throw new Error(`Market blueprint ${blueprint.id} has invalid production values.`);
    }
  }

  for (const upgrade of catalog.weaponUpgrades) {
    if (
      !catalog.weapons.some((weapon) => weapon.id === upgrade.weaponId) ||
      upgrade.researchCreditCost <= 0 ||
      upgrade.productionCreditCost <= 0 ||
      upgrade.productionMaterialCost < 0 ||
      !catalog.buildings.some((building) => building.id === upgrade.requiredResearchBuildingId) ||
      !catalog.staffRoles.some((role) => role.id === upgrade.requiredStaffRoleId) ||
      !catalog.buildings.some((building) => building.id === upgrade.requiredProductionBuildingId) ||
      !catalog.staffRoles.some((role) =>
        role.id === upgrade.requiredProductionStaffRoleId) ||
      (upgrade.requiredBlueprintId !== null &&
        !catalog.marketWeaponBlueprints.some((blueprint) =>
          blueprint.id === upgrade.requiredBlueprintId)) ||
      (upgrade.requiredLocallyProducedWeaponId !== null &&
        !catalog.weapons.some((weapon) =>
          weapon.id === upgrade.requiredLocallyProducedWeaponId)) ||
      upgrade.damageMultiplier <= 0 ||
      upgrade.cadenceMultiplier <= 0
    ) {
      throw new Error(`Weapon upgrade ${upgrade.id} has invalid requirements.`);
    }
  }

  for (const weapon of catalog.weapons) {
    if (
      !['earth', 'alien'].includes(weapon.origin) ||
      weapon.damage <= 0 ||
      weapon.shotsPerSecond <= 0 ||
      !Number.isInteger(weapon.projectileCount) ||
      weapon.projectileCount <= 0 ||
      weapon.projectileSpeed <= 0 ||
      weapon.spread < 0 ||
      !['single-target', 'all-targets'].includes(weapon.penetration) ||
      !['machine-gun', 'impulse-accelerator', 'split-pulse', 'canister-cannon'].includes(
        weapon.visualProfile,
      ) ||
      (weapon.marketPrice !== null && (
        !Number.isInteger(weapon.marketPrice.minimum) ||
        !Number.isInteger(weapon.marketPrice.maximum) ||
        weapon.marketPrice.minimum <= 0 ||
        weapon.marketPrice.maximum < weapon.marketPrice.minimum
      ))
    ) {
      throw new Error(`Weapon ${weapon.id} must have positive combat values.`);
    }
  }

  for (const pilot of catalog.pilots) {
    if (pilot.speedMultiplier <= 0 || pilot.damageMultiplier <= 0) {
      throw new Error(`Pilot ${pilot.id} must have positive multipliers.`);
    }
  }

  for (const technology of catalog.alienTechnologies) {
    const passive = technology.passiveEffect;
    const weapon = technology.weaponTransformation;
    if (
      technology.signalGlyphs.trim().length === 0 ||
      technology.preservationResearch <= 0 ||
      passive.id.trim().length === 0 ||
      passive.name.trim().length === 0 ||
      passive.armourDamageMultiplier <= 0 ||
      passive.armourDamageMultiplier > 1 ||
      weapon.id.trim().length === 0 ||
      weapon.name.trim().length === 0 ||
      !Number.isInteger(weapon.projectileCount) ||
      weapon.projectileCount <= 0 ||
      weapon.damageMultiplier <= 0 ||
      weapon.spread < 0
    ) {
      throw new Error(`Alien technology ${technology.id} has invalid risk/reward values.`);
    }
  }

  for (const enemy of catalog.enemies) {
    if (
      enemy.armour <= 0 ||
      enemy.speed <= 0 ||
      enemy.contactDamage <= 0 ||
      enemy.score <= 0 ||
      enemy.materialReward <= 0 ||
      !Number.isInteger(enemy.creditReward) ||
      enemy.creditReward <= 0 ||
      (enemy.ranged !== null && (
        enemy.ranged.shotDamage <= 0 ||
        enemy.ranged.shotSpeed <= 0 ||
        !Number.isInteger(enemy.ranged.shotIntervalMs) ||
        enemy.ranged.shotIntervalMs <= 0
      ))
    ) {
      throw new Error(`Enemy ${enemy.id} must have positive combat values.`);
    }
  }

  for (const aircraft of catalog.aircraft) {
    if (
      aircraft.armour <= 0 ||
      aircraft.speedMultiplier <= 0 ||
      aircraft.damageMultiplier <= 0 ||
      !Number.isInteger(aircraft.refuelCreditCost) ||
      aircraft.refuelCreditCost <= 0 ||
      !['earth', 'alien', 'hybrid'].includes(aircraft.origin) ||
      (aircraft.marketPrice !== null && (
        !Number.isInteger(aircraft.marketPrice.minimum) ||
        !Number.isInteger(aircraft.marketPrice.maximum) ||
        aircraft.marketPrice.minimum <= 0 ||
        aircraft.marketPrice.maximum < aircraft.marketPrice.minimum
      ))
    ) {
      throw new Error(`Aircraft ${aircraft.id} must have positive combat values.`);
    }
  }

  for (const state of catalog.councilStates) {
    if (typeof state.nameKey !== 'string' || state.nameKey.length === 0) {
      throw new Error(`Council state ${state.id} must reference a localized name key.`);
    }
  }
}
