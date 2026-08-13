import { describe, expect, it } from 'vitest';
import { staffMember } from './test-state';
import { contentCatalog } from '../../src/content/catalog';
import { createInitialGameState } from '../../src/domain/initial-state';
import { marketBlueprintPrice } from '../../src/domain/terrestrial-market';
import {
  applyWeaponUpgrades,
  manufacturePrimaryWeapon,
  manufactureWeaponUpgrade,
  purchaseMarketBlueprint,
  researchWeaponUpgrade,
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
      credits: 2_000,
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
    const researched = researchWeaponUpgrade(ready, machineUpgrade);
    const manufactured = manufactureWeaponUpgrade(researched, machineUpgrade);
    const upgradedWeapon = applyWeaponUpgrades(
      contentCatalog.weapons[0],
      manufactured.base.manufacturedWeaponUpgradeIds,
      contentCatalog.weaponUpgrades,
    );

    expect(researched.base.researchedWeaponUpgradeIds).toEqual([machineUpgrade.id]);
    expect(manufactured.base.manufacturedWeaponUpgradeIds).toEqual([machineUpgrade.id]);
    expect(upgradedWeapon.damage).toBe(
      contentCatalog.weapons[0].damage * machineUpgrade.damageMultiplier,
    );
    expect(upgradedWeapon.shotsPerSecond).toBe(contentCatalog.weapons[0].shotsPerSecond);
  });

  it('keeps the Accelerator improvement locked until local production is qualified', () => {
    const ready = industrialState();
    expect(() => researchWeaponUpgrade(ready, acceleratorUpgrade)).toThrow(
      'Weapon weapon-impulse-accelerator is required',
    );

    const licensed = purchaseMarketBlueprint(ready, blueprint);
    const local = manufacturePrimaryWeapon(licensed, blueprint);
    const researched = researchWeaponUpgrade(local, acceleratorUpgrade);
    const manufactured = manufactureWeaponUpgrade(researched, acceleratorUpgrade);
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
});
