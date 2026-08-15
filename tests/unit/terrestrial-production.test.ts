import { describe, expect, it } from 'vitest';
import { staffMember } from './test-state';
import { contentCatalog } from '../../src/content/catalog';
import { createInitialGameState } from '../../src/domain/initial-state';
import { marketBlueprintPrice } from '../../src/domain/terrestrial-market';
import { advanceProduction, startAircraftProduction, startWeaponProduction, weaponProductionCost } from '../../src/domain/base-projects';
import { advanceBlueprintResearch } from '../../src/domain/blueprint-progression';
import {
  applyAircraftUpgrades,
  applyWeaponUpgrades,
  manufactureAircraftUpgrade,
  manufacturePrimaryWeapon,
  manufactureWeaponUpgrade,
  purchaseMarketBlueprint,
  startAircraftUpgradeResearch,
  startWeaponUpgradeResearch,
} from '../../src/domain/terrestrial-production';

const blueprint = contentCatalog.marketWeaponBlueprints[0];
const machineUpgrade = contentCatalog.weaponUpgrades[0];
const acceleratorUpgrade = contentCatalog.weaponUpgrades[1];
const centreId = contentCatalog.buildings[0].id;
const worksId = contentCatalog.buildings[1].id;
const scientistId = contentCatalog.staffRoles[0].id;
const engineerId = contentCatalog.staffRoles[1].id;

function industrialState() {
  const initial = createInitialGameState();
  return {
    ...initial,
    base: {
      ...initial.base,
      credits: 2_000_000,
      materials: 100,
      sortiesCompleted: blueprint.minimumSorties,
      constructedBuildingIds: [centreId, worksId],
      staff: [
        staffMember('staff-scientist-1', scientistId),
        staffMember('staff-engineer-1', engineerId),
      ],
    },
  };
}

describe('terrestrial production', () => {
  it('gates a deterministic Accelerator blueprint offer by completed sorties', () => {
    const initial = createInitialGameState();
    const price = marketBlueprintPrice(
      blueprint,
      initial.base.marketSeed,
      blueprint.minimumSorties,
    );
    expect(price).toBeGreaterThanOrEqual(blueprint.marketPrice.minimum);
    expect(price).toBeLessThanOrEqual(blueprint.marketPrice.maximum);
    expect(() => purchaseMarketBlueprint(initial, blueprint)).toThrow('not yet available');

    const ready = industrialState();
    const purchased = purchaseMarketBlueprint(ready, blueprint);
    expect(purchased.base.credits).toBe(ready.base.credits - price);
    expect(purchased.base.unlockedBlueprintIds).toContain(blueprint.id);
  });

  it('manufactures the first local Accelerator and unlocks its branch', () => {
    const licensed = purchaseMarketBlueprint(industrialState(), blueprint);
    const manufactured = manufacturePrimaryWeapon(licensed, blueprint);

    expect(manufactured.base.ownedPrimaryWeaponIds).toContain(blueprint.weaponId);
    expect(manufactured.base.locallyProducedWeaponIds).toEqual([blueprint.weaponId]);
    expect(manufactured.base.materials).toBe(
      licensed.base.materials - blueprint.productionMaterialCost,
    );
    expect(() => manufacturePrimaryWeapon(manufactured, blueprint)).toThrow(
      'already entered local production',
    );
  });

  it('requires a lead engineer for production', () => {
    const ready = industrialState();
    const withoutEngineer = {
      ...ready,
      base: {
        ...ready.base,
        staff: ready.base.staff.filter((member) => member.roleId !== engineerId),
      },
    };
    const licensed = purchaseMarketBlueprint(withoutEngineer, blueprint);

    expect(() => manufacturePrimaryWeapon(licensed, blueprint)).toThrow(
      'Staff role staff-engineer is required',
    );
  });

  it('develops, manufactures, and applies reinforced machine-gun ammunition', () => {
    const ready = industrialState();
    const queued = startWeaponUpgradeResearch(ready, machineUpgrade);
    expect(queued.base.researchQueue).toHaveLength(1);
    const researched = advanceBlueprintResearch(queued, scientistId);
    const completed = advanceBlueprintResearch(researched, scientistId);
    const manufactured = manufactureWeaponUpgrade(completed, machineUpgrade);
    const upgradedWeapon = applyWeaponUpgrades(
      contentCatalog.weapons[0],
      manufactured.base.manufacturedWeaponUpgradeIds,
      contentCatalog.weaponUpgrades,
    );

    expect(completed.base.researchedWeaponUpgradeIds).toEqual([machineUpgrade.id]);
    expect(manufactured.base.manufacturedWeaponUpgradeIds).toEqual([machineUpgrade.id]);
    expect(upgradedWeapon.damage).toBe(
      contentCatalog.weapons[0].damage * machineUpgrade.damageMultiplier,
    );
    expect(upgradedWeapon.shotsPerSecond).toBe(contentCatalog.weapons[0].shotsPerSecond);
  });

  it('keeps the Accelerator improvement locked until local production is qualified', () => {
    const ready = industrialState();
    expect(() => startWeaponUpgradeResearch(ready, acceleratorUpgrade)).toThrow(
      'Weapon weapon-impulse-accelerator is required',
    );

    const licensed = purchaseMarketBlueprint(ready, blueprint);
    const local = manufacturePrimaryWeapon(licensed, blueprint);
    const queued = startWeaponUpgradeResearch(local, acceleratorUpgrade);
    const researched = advanceBlueprintResearch(queued, scientistId);
    const completed = advanceBlueprintResearch(researched, scientistId);
    const manufactured = manufactureWeaponUpgrade(completed, acceleratorUpgrade);
    const upgradedWeapon = applyWeaponUpgrades(
      contentCatalog.weapons[1],
      manufactured.base.manufacturedWeaponUpgradeIds,
      contentCatalog.weaponUpgrades,
    );

    expect(upgradedWeapon.damage).toBe(contentCatalog.weapons[1].damage);
    expect(upgradedWeapon.shotsPerSecond).toBe(
      contentCatalog.weapons[1].shotsPerSecond * acceleratorUpgrade.cadenceMultiplier,
    );
  });

  it('purchases an aircraft blueprint and manufactures the aircraft into a free hangar slot', () => {
    const aircraftBlueprint = contentCatalog.aircraftBlueprints.find(
      (entry) => entry.id === 'blueprint-aircraft-gunship',
    );
    expect(aircraftBlueprint).toBeDefined();
    const ready = {
      ...industrialState(),
      base: {
        ...industrialState().base,
        credits: 3_000_000,
        sortiesCompleted: aircraftBlueprint?.minimumSorties ?? 2,
      },
    };
    const purchased = purchaseMarketBlueprint(
      ready,
      aircraftBlueprint ?? contentCatalog.aircraftBlueprints[0],
    );
    expect(purchased.base.unlockedBlueprintIds).toContain(aircraftBlueprint?.id);
    const started = startAircraftProduction(
      purchased,
      aircraftBlueprint ?? contentCatalog.aircraftBlueprints[0],
    );
    expect(started.base.productionQueue).toHaveLength(1);
    expect(started.base.credits).toBe(
      purchased.base.credits - (aircraftBlueprint?.productionCreditCost ?? 0),
    );
    const afterFirst = advanceProduction(started.base);
    const afterSecond = advanceProduction(afterFirst);
    expect(afterSecond.hangarSlots).toContain(aircraftBlueprint?.outputAircraftId);
    expect(afterSecond.productionQueue).toHaveLength(0);
    // A second copy cannot be manufactured while the type is already in the hangar.
    expect(() => startAircraftProduction(
      { ...purchased, base: { ...afterSecond, hangarSlots: [null, null] } },
      aircraftBlueprint ?? contentCatalog.aircraftBlueprints[0],
    )).not.toThrow();
  });

  it('researches and manufactures an aircraft upgrade tier keyed to its blueprint', () => {
    const upgrade = contentCatalog.aircraftUpgrades.find(
      (entry) => entry.id === 'upgrade-aircraft-interceptor-mk2',
    );
    expect(upgrade).toBeDefined();
    const ready = {
      ...industrialState(),
      base: {
        ...industrialState().base,
        credits: 2_500_000,
        materials: 100,
        unlockedBlueprintIds: [upgrade?.aircraftBlueprintId ?? ''],
      },
    };
    // The upgrade cannot be researched without its blueprint.
    expect(() => startAircraftUpgradeResearch(
      industrialState(),
      upgrade ?? contentCatalog.aircraftUpgrades[0],
    )).toThrow('Blueprint');
    const queued = startAircraftUpgradeResearch(
      ready,
      upgrade ?? contentCatalog.aircraftUpgrades[0],
    );
    const researched = advanceBlueprintResearch(queued, scientistId);
    expect(researched.base.researchedAircraftUpgradeIds).toContain(upgrade?.id);
    const manufactured = manufactureAircraftUpgrade(
      researched,
      upgrade ?? contentCatalog.aircraftUpgrades[0],
    );
    expect(manufactured.base.manufacturedAircraftUpgradeIds).toContain(upgrade?.id);
    const applied = applyAircraftUpgrades(
      contentCatalog.aircraft[0],
      manufactured.base.manufacturedAircraftUpgradeIds,
      contentCatalog.aircraftUpgrades,
    );
    expect(applied.armour).toBe(
      contentCatalog.aircraft[0].armour + (upgrade?.armourDelta ?? 0),
    );
  });

  it('produces any quantity of a weapon repeatedly into the warehouse', () => {
    const state = {
      ...industrialState(),
      base: {
        ...industrialState().base,
        unlockedBlueprintIds: [blueprint.id],
      },
    };
    const weapon = {
      id: blueprint.weaponId,
      productionCreditCost: blueprint.productionCreditCost,
      productionMaterialCost: blueprint.productionMaterialCost,
      productionSorties: blueprint.productionSorties,
      requiredProductionBuildingId: blueprint.requiredBuildingId,
      requiredProductionStaffRoleId: blueprint.requiredStaffRoleId,
    };
    const creditsBefore = state.base.credits;
    const materialsBefore = state.base.materials;
    expect(weaponProductionCost(weapon, 3)).toEqual({
      credits: weapon.productionCreditCost * 3,
      materials: weapon.productionMaterialCost * 3,
    });
    const started = startWeaponProduction(state, blueprint.id, weapon, 3);
    expect(started.base.credits).toBe(
      creditsBefore - weapon.productionCreditCost * 3,
    );
    expect(started.base.materials).toBe(
      materialsBefore - weapon.productionMaterialCost * 3,
    );
    expect(started.base.productionQueue[0]?.quantity).toBe(3);

    // Completing the batch stocks the warehouse, then another batch may run.
    const completed = advanceProduction(started.base);
    expect(completed.weaponStock[blueprint.weaponId]).toBe(3);
    const again = startWeaponProduction(
      { ...state, base: completed },
      blueprint.id,
      weapon,
      2,
    );
    expect(again.base.productionQueue[0]?.quantity).toBe(2);
  });
});
