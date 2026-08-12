import { describe, expect, it } from 'vitest';
import { createGameStore } from '../../src/app/store';
import { contentCatalog } from '../../src/content/catalog';

describe('game store M3a cycle', () => {
  it('delivers, researches, and equips the preserved Prism', () => {
    const store = createGameStore();
    const technology = contentCatalog.alienTechnologies[0];
    const moduleId = technology.weaponTransformation.id;

    store.dispatch({
      type: 'SETTLE_SORTIE',
      outcome: {
        extracted: true,
        materialsFound: 18,
        researchFound: 0,
        preservedTechnologyIds: [technology.id],
        targetsDestroyed: 25,
        targetsBreached: 0,
        creditsEarned: 200,
        creditsPenalized: 0,
      },
    });
    expect(store.getSnapshot().base.preservedTechnologyIds).toEqual([technology.id]);

    store.dispatch({
      type: 'CONSTRUCT_BUILDING',
      buildingId: contentCatalog.buildings[0].id,
    });
    store.dispatch({ type: 'HIRE_STAFF', roleId: contentCatalog.staffRoles[0].id });
    store.dispatch({ type: 'RESEARCH_TECHNOLOGY', technologyId: technology.id });
    expect(store.getSnapshot().base.research).toBe(technology.preservationResearch);
    expect(store.getSnapshot().base.ownedPrimaryWeaponIds).toEqual([
      contentCatalog.weapons[0].id,
      moduleId,
    ]);

    store.dispatch({ type: 'EQUIP_PRIMARY_WEAPON', weaponId: moduleId, slotIndex: 1 });
    expect(store.getSnapshot().base.equippedPrimaryWeaponIds).toEqual([
      contentCatalog.weapons[0].id,
      moduleId,
    ]);
  });

  it('researches, constructs, and manufactures the Capturer across sorties', () => {
    const store = createGameStore();
    const laboratory = contentCatalog.buildings[0];
    const workshop = contentCatalog.buildings[1];
    const scientist = contentCatalog.staffRoles[0];
    const engineer = contentCatalog.staffRoles[1];
    const blueprint = contentCatalog.blueprints[0];
    const equipment = contentCatalog.equipment[0];
    const outcome = {
      extracted: true,
      materialsFound: 10,
      researchFound: 0,
      preservedTechnologyIds: [],
      targetsDestroyed: 25,
      targetsBreached: 0,
      creditsEarned: 300,
      creditsPenalized: 0,
    } as const;

    store.dispatch({ type: 'SETTLE_SORTIE', outcome });
    store.dispatch({ type: 'CONSTRUCT_BUILDING', buildingId: laboratory.id });
    store.dispatch({ type: 'HIRE_STAFF', roleId: scientist.id });
    store.dispatch({ type: 'START_BLUEPRINT_RESEARCH', blueprintId: blueprint.id });
    for (let index = 0; index < blueprint.requiredProgress; index += 1) {
      store.dispatch({ type: 'SETTLE_SORTIE', outcome });
    }

    expect(store.getSnapshot().base.unlockedBlueprintIds).toEqual([blueprint.id]);
    store.dispatch({ type: 'CONSTRUCT_BUILDING', buildingId: workshop.id });
    store.dispatch({ type: 'HIRE_STAFF', roleId: engineer.id });
    store.dispatch({ type: 'MANUFACTURE_EQUIPMENT', equipmentId: equipment.id });
    expect(store.getSnapshot().base.manufacturedEquipmentIds).toEqual([equipment.id]);
    store.dispatch({ type: 'EQUIP_SPECIAL_EQUIPMENT', equipmentId: equipment.id });
    expect(store.getSnapshot().base.equippedEquipmentId).toBe(equipment.id);
    expect(store.getSnapshot().base.credits).toBe(370);
    expect(store.getSnapshot().base.materials).toBe(5);
  });

  it('runs the market-blueprint, local-production, and Accelerator-upgrade commands', () => {
    const initialStore = createGameStore();
    const initial = initialStore.getSnapshot();
    const centre = contentCatalog.buildings[0];
    const works = contentCatalog.buildings[1];
    const scientist = contentCatalog.staffRoles[0];
    const engineer = contentCatalog.staffRoles[1];
    const blueprint = contentCatalog.marketWeaponBlueprints[0];
    const upgrade = contentCatalog.weaponUpgrades[1];
    const store = createGameStore({
      ...initial,
      base: {
        ...initial.base,
        credits: 2_000,
        materials: 100,
        sortiesCompleted: blueprint.minimumSorties,
        constructedBuildingIds: [centre.id, works.id],
        staff: [
          { id: 'scientist-1', roleId: scientist.id },
          { id: 'engineer-1', roleId: engineer.id },
        ],
      },
    });

    store.dispatch({ type: 'PURCHASE_MARKET_BLUEPRINT', blueprintId: blueprint.id });
    store.dispatch({ type: 'MANUFACTURE_PRIMARY_WEAPON', blueprintId: blueprint.id });
    store.dispatch({ type: 'RESEARCH_WEAPON_UPGRADE', upgradeId: upgrade.id });
    store.dispatch({ type: 'MANUFACTURE_WEAPON_UPGRADE', upgradeId: upgrade.id });

    expect(store.getSnapshot().base.locallyProducedWeaponIds).toEqual([blueprint.weaponId]);
    expect(store.getSnapshot().base.manufacturedWeaponUpgradeIds).toEqual([upgrade.id]);
  });
});
