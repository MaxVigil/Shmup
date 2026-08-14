import { describe, expect, it } from 'vitest';
import { staffMember } from './test-state';
import { createGameStore } from '../../src/app/store';
import { contentCatalog } from '../../src/content/catalog';
import { createInitialGameState } from '../../src/domain/initial-state';

describe('game store M3a cycle', () => {
  it('delivers, researches, manufactures, and equips the preserved Prism', () => {
    const initial = createGameStore().getSnapshot();
    const laboratory = contentCatalog.buildings[0];
    const quarantine = contentCatalog.buildings[2];
    const scientist = contentCatalog.staffRoles[0];
    const store = createGameStore({
      ...initial,
      base: {
        ...initial.base,
        credits: 2_000_000,
        materials: 100,
        constructedBuildingIds: [laboratory.id, quarantine.id, contentCatalog.buildings[1].id],
        staff: [
          staffMember('staff-scientist-1', scientist.id),
          staffMember('staff-engineer-1', contentCatalog.staffRoles[1].id),
        ],
      },
    });
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
        creditsEarned: 200_000,
        creditsPenalized: 0,
        wardenSignalDetected: false,
      },
    });
    expect(store.getSnapshot().base.preservedTechnologyIds).toEqual([technology.id]);

    store.dispatch({ type: 'RESEARCH_TECHNOLOGY', technologyId: technology.id });
    expect(store.getSnapshot().base.research).toBe(technology.preservationResearch);
    expect(store.getSnapshot().base.unlockedBlueprintIds).toEqual([
      contentCatalog.adaptedWeaponBlueprints[0].id,
    ]);
    expect(store.getSnapshot().base.ownedPrimaryWeaponIds).toEqual([
      contentCatalog.weapons[0].id,
    ]);

    store.dispatch({
      type: 'MANUFACTURE_ADAPTED_WEAPON',
      blueprintId: contentCatalog.adaptedWeaponBlueprints[0].id,
    });
    store.dispatch({
      type: 'SETTLE_SORTIE',
      outcome: {
        extracted: true,
        materialsFound: 0,
        researchFound: 0,
        preservedTechnologyIds: [],
        targetsDestroyed: 0,
        targetsBreached: 0,
        creditsEarned: 0,
        creditsPenalized: 0,
        wardenSignalDetected: false,
      },
    });
    expect(store.getSnapshot().base.ownedPrimaryWeaponIds).toContain(moduleId);

    store.dispatch({ type: 'EQUIP_PRIMARY_WEAPON', weaponId: moduleId, slotIndex: 1 });
    expect(store.getSnapshot().base.equippedPrimaryWeaponIds).toEqual([
      contentCatalog.weapons[0].id,
      moduleId,
    ]);
  });

  it('seals a delivered sample behind the containment chain', () => {
    const initial = createGameStore().getSnapshot();
    const store = createGameStore({
      ...initial,
      base: {
        ...initial.base,
        credits: 3_000_000,
        materials: 100,
        constructedBuildingIds: [contentCatalog.buildings[0].id],
        staff: [staffMember('scientist-1', contentCatalog.staffRoles[0].id)],
      },
    });
    const workshop = contentCatalog.buildings[1];
    const quarantine = contentCatalog.buildings[2];
    const containment = contentCatalog.buildingBlueprints[0];
    const technology = contentCatalog.alienTechnologies[0];
    const outcome = {
      extracted: true,
      materialsFound: 30,
      researchFound: 0,
      preservedTechnologyIds: [technology.id],
      targetsDestroyed: 25,
      targetsBreached: 0,
      creditsEarned: 300_000,
      creditsPenalized: 0,
      wardenSignalDetected: false,
    } as const;

    store.dispatch({ type: 'SETTLE_SORTIE', outcome });

    expect(() =>
      store.dispatch({ type: 'RESEARCH_TECHNOLOGY', technologyId: technology.id }),
    ).toThrow('required for quarantine analysis');

    store.dispatch({
      type: 'START_BUILDING_BLUEPRINT_RESEARCH',
      blueprintId: containment.id,
    });
    for (let index = 0; index < containment.requiredProgress; index += 1) {
      store.dispatch({
        type: 'SETTLE_SORTIE',
        outcome: { ...outcome, preservedTechnologyIds: [] },
      });
    }
    expect(store.getSnapshot().base.unlockedBlueprintIds).toContain(containment.id);

    store.dispatch({ type: 'CONSTRUCT_BUILDING', buildingId: workshop.id });
    for (let index = 0; index < 2; index += 1) {
      store.dispatch({
        type: 'SETTLE_SORTIE',
        outcome: { ...outcome, preservedTechnologyIds: [] },
      });
    }
    store.dispatch({ type: 'CONSTRUCT_BUILDING', buildingId: quarantine.id });
    for (let index = 0; index < 2; index += 1) {
      store.dispatch({
        type: 'SETTLE_SORTIE',
        outcome: { ...outcome, preservedTechnologyIds: [] },
      });
    }
    expect(store.getSnapshot().base.constructedBuildingIds).toContain(quarantine.id);
    expect(store.getSnapshot().base.constructedBuildingIds).toContain(workshop.id);

    store.dispatch({ type: 'RESEARCH_TECHNOLOGY', technologyId: technology.id });
    expect(store.getSnapshot().base.preservedTechnologyIds).toEqual([]);
    expect(store.getSnapshot().base.unlockedBlueprintIds).toContain(
      contentCatalog.adaptedWeaponBlueprints[0].id,
    );
    expect(store.getSnapshot().base.ownedPrimaryWeaponIds).not.toContain(
      technology.weaponTransformation.id,
    );

    store.dispatch({ type: 'HIRE_STAFF', roleId: contentCatalog.staffRoles[1].id });
    store.dispatch({
      type: 'MANUFACTURE_ADAPTED_WEAPON',
      blueprintId: contentCatalog.adaptedWeaponBlueprints[0].id,
    });
    store.dispatch({
      type: 'SETTLE_SORTIE',
      outcome: { ...outcome, preservedTechnologyIds: [] },
    });
    expect(store.getSnapshot().base.ownedPrimaryWeaponIds).toContain(
      technology.weaponTransformation.id,
    );
  });

  it('researches, constructs, and manufactures the Capturer across sorties', () => {
    const initial = createGameStore().getSnapshot();
    const store = createGameStore({
      ...initial,
      base: {
        ...initial.base,
        credits: 2_000_000,
        materials: 100,
        telemetryRecorded: true,
        constructedBuildingIds: [contentCatalog.buildings[0].id],
        staff: [staffMember('scientist-1', contentCatalog.staffRoles[0].id)],
      },
    });
    const workshop = contentCatalog.buildings[1];
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
      creditsEarned: 300_000,
      creditsPenalized: 0,
      wardenSignalDetected: false,
    } as const;

    store.dispatch({ type: 'START_BLUEPRINT_RESEARCH', blueprintId: blueprint.id });
    for (let index = 0; index < blueprint.requiredProgress; index += 1) {
      store.dispatch({ type: 'SETTLE_SORTIE', outcome });
    }
    expect(store.getSnapshot().base.unlockedBlueprintIds).toEqual([blueprint.id]);

    store.dispatch({ type: 'CONSTRUCT_BUILDING', buildingId: workshop.id });
    for (let index = 0; index < 2; index += 1) {
      store.dispatch({ type: 'SETTLE_SORTIE', outcome });
    }
    expect(store.getSnapshot().base.constructedBuildingIds).toContain(workshop.id);

    store.dispatch({ type: 'HIRE_STAFF', roleId: engineer.id });
    store.dispatch({ type: 'MANUFACTURE_EQUIPMENT', equipmentId: equipment.id });
    store.dispatch({ type: 'SETTLE_SORTIE', outcome });
    expect(store.getSnapshot().base.manufacturedEquipmentIds).toEqual([equipment.id]);

    store.dispatch({ type: 'EQUIP_SPECIAL_EQUIPMENT', equipmentId: equipment.id });
    expect(store.getSnapshot().base.equippedEquipmentId).toBe(equipment.id);
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
        credits: 2_000_000,
        materials: 100,
        sortiesCompleted: blueprint.minimumSorties,
        constructedBuildingIds: [centre.id, works.id],
        staff: [
          staffMember('scientist-1', scientist.id),
          staffMember('engineer-1', engineer.id),
        ],
      },
    });

    store.dispatch({ type: 'PURCHASE_MARKET_BLUEPRINT', blueprintId: blueprint.id });
    store.dispatch({ type: 'MANUFACTURE_PRIMARY_WEAPON', blueprintId: blueprint.id });
    for (let index = 0; index < blueprint.productionSorties; index += 1) {
      store.dispatch({
        type: 'SETTLE_SORTIE',
        outcome: {
          extracted: true,
          materialsFound: 0,
          researchFound: 0,
          preservedTechnologyIds: [],
          targetsDestroyed: 0,
          targetsBreached: 0,
          creditsEarned: 0,
          creditsPenalized: 0,
          wardenSignalDetected: false,
        },
      });
    }
    expect(store.getSnapshot().base.locallyProducedWeaponIds).toEqual([blueprint.weaponId]);

    store.dispatch({ type: 'RESEARCH_WEAPON_UPGRADE', upgradeId: upgrade.id });
    store.dispatch({ type: 'MANUFACTURE_WEAPON_UPGRADE', upgradeId: upgrade.id });
    for (let index = 0; index < upgrade.productionSorties; index += 1) {
      store.dispatch({
        type: 'SETTLE_SORTIE',
        outcome: {
          extracted: true,
          materialsFound: 0,
          researchFound: 0,
          preservedTechnologyIds: [],
          targetsDestroyed: 0,
          targetsBreached: 0,
          creditsEarned: 0,
          creditsPenalized: 0,
          wardenSignalDetected: false,
        },
      });
    }
    expect(store.getSnapshot().base.manufacturedWeaponUpgradeIds).toEqual([upgrade.id]);
  });

  it('gates the Capturer project behind recorded Warden telemetry', () => {
    const initial = createGameStore().getSnapshot();
    const store = createGameStore({
      ...initial,
      base: {
        ...initial.base,
        credits: 2_000_000,
        materials: 100,
        constructedBuildingIds: [contentCatalog.buildings[0].id],
      },
    });
    const scientist = contentCatalog.staffRoles[0];
    const blueprint = contentCatalog.blueprints[0];

    store.dispatch({ type: 'HIRE_STAFF', roleId: scientist.id });

    expect(() =>
      store.dispatch({ type: 'START_BLUEPRINT_RESEARCH', blueprintId: blueprint.id }),
    ).toThrow('requires Warden telemetry');

    store.dispatch({
      type: 'SETTLE_SORTIE',
      outcome: {
        extracted: true,
        materialsFound: 10,
        researchFound: 0,
        preservedTechnologyIds: [],
        targetsDestroyed: 20,
        targetsBreached: 0,
        creditsEarned: 200_000,
        creditsPenalized: 0,
        wardenSignalDetected: true,
      },
    });
    expect(store.getSnapshot().base.telemetryRecorded).toBe(true);

    store.dispatch({ type: 'START_BLUEPRINT_RESEARCH', blueprintId: blueprint.id });
    expect(store.getSnapshot().base.researchQueue[0]?.blueprintId).toBe(blueprint.id);
  });

  it('researches and manufactures the Canister Aircraft Cannon', () => {
    const initial = createGameStore().getSnapshot();
    const laboratory = contentCatalog.buildings[0];
    const workshop = contentCatalog.buildings[1];
    const scientist = contentCatalog.staffRoles[0];
    const engineer = contentCatalog.staffRoles[1];
    const blueprint = contentCatalog.researchWeaponBlueprints[0];
    const weaponId = contentCatalog.weapons[3].id;
    const store = createGameStore({
      ...initial,
      base: {
        ...initial.base,
        credits: 2_000_000,
        materials: 100,
        telemetryRecorded: true,
        constructedBuildingIds: [laboratory.id, workshop.id],
        staff: [
          staffMember('scientist-1', scientist.id),
          staffMember('engineer-1', engineer.id),
        ],
      },
    });
    const outcome = {
      extracted: true,
      materialsFound: 10,
      researchFound: 0,
      preservedTechnologyIds: [],
      targetsDestroyed: 25,
      targetsBreached: 0,
      creditsEarned: 300_000,
      creditsPenalized: 0,
      wardenSignalDetected: false,
    } as const;

    store.dispatch({ type: 'START_RESEARCH_WEAPON_BLUEPRINT', blueprintId: blueprint.id });
    for (let index = 0; index < blueprint.requiredProgress; index += 1) {
      store.dispatch({ type: 'SETTLE_SORTIE', outcome });
    }
    expect(store.getSnapshot().base.unlockedBlueprintIds).toContain(blueprint.id);

    store.dispatch({ type: 'MANUFACTURE_RESEARCH_WEAPON', blueprintId: blueprint.id });
    store.dispatch({
      type: 'SETTLE_SORTIE',
      outcome: {
        extracted: true,
        materialsFound: 0,
        researchFound: 0,
        preservedTechnologyIds: [],
        targetsDestroyed: 0,
        targetsBreached: 0,
        creditsEarned: 0,
        creditsPenalized: 0,
        wardenSignalDetected: false,
      },
    });
    expect(store.getSnapshot().base.ownedPrimaryWeaponIds).toContain(weaponId);
  });

  it('purchases the Rocket Pod on the market and installs it into a weapon slot', () => {
    const initial = createGameStore().getSnapshot();
    const rocketPod = contentCatalog.weapons.find(
      (weapon) => weapon.id === 'weapon-rocket-pod',
    );
    expect(rocketPod).toBeDefined();
    const store = createGameStore({
      ...initial,
      base: { ...initial.base, credits: 2_000_000 },
    });

    store.dispatch({ type: 'PURCHASE_MARKET_WEAPON', weaponId: rocketPod?.id ?? '' });
    expect(store.getSnapshot().base.weaponStock[rocketPod?.id ?? '']).toBe(1);

    const aircraftId = store.getSnapshot().base.activeAircraftId;
    expect(aircraftId).not.toBeNull();
    store.dispatch({
      type: 'EQUIP_PRIMARY_WEAPON',
      weaponId: rocketPod?.id ?? '',
      slotIndex: 0,
    });
    expect(store.getSnapshot().base.weaponStock[rocketPod?.id ?? '']).toBeUndefined();
    expect(store.getSnapshot().base.aircraftLoadouts[aircraftId ?? '']?.[0]).toBe(
      rocketPod?.id,
    );
  });

  it('purchases aircraft, expands the hangar, and switches the active one', () => {
    const initial = createInitialGameState();
    const store = createGameStore({
      ...initial,
      base: { ...initial.base, credits: 5_000_000 },
    });
    const gunship = contentCatalog.aircraft[1];
    const aegis = contentCatalog.aircraft[2];
    const interceptor = contentCatalog.aircraft[0];

    store.dispatch({ type: 'PURCHASE_AIRCRAFT', aircraftId: gunship.id });
    expect(store.getSnapshot().base.hangarSlots).toEqual([
      interceptor.id,
      gunship.id,
    ]);

    store.dispatch({ type: 'PURCHASE_HANGAR_SLOT' });
    expect(store.getSnapshot().base.hangarSlots).toEqual([
      interceptor.id,
      gunship.id,
      null,
    ]);

    store.dispatch({ type: 'PURCHASE_AIRCRAFT', aircraftId: aegis.id });
    expect(store.getSnapshot().base.hangarSlots).toEqual([
      interceptor.id,
      gunship.id,
      aegis.id,
    ]);

    store.dispatch({ type: 'SET_ACTIVE_AIRCRAFT', aircraftId: aegis.id });
    expect(store.getSnapshot().base.activeAircraftId).toBe(aegis.id);
  });

  it('refuels an unfueled aircraft and consumes fuel at settlement', () => {
    const initial = createInitialGameState();
    const store = createGameStore({
      ...initial,
      base: { ...initial.base, credits: 500_000, fueledAircraftIds: [] },
    });
    const interceptor = contentCatalog.aircraft[0];
    const outcome = {
      extracted: true,
      materialsFound: 10,
      researchFound: 0,
      preservedTechnologyIds: [],
      targetsDestroyed: 20,
      targetsBreached: 0,
      creditsEarned: 200_000,
      creditsPenalized: 0,
      wardenSignalDetected: false,
    } as const;

    store.dispatch({ type: 'REFUEL_AIRCRAFT', aircraftId: interceptor.id });
    expect(store.getSnapshot().base.fueledAircraftIds).toContain(interceptor.id);

    store.dispatch({ type: 'SETTLE_SORTIE', outcome });
    expect(store.getSnapshot().base.fueledAircraftIds).not.toContain(interceptor.id);
    expect(store.getSnapshot().base.month).toBe(1);
  });

  it('advances the month only when the player ends it, regenerating the threat map', () => {
    const initial = createInitialGameState();
    const store = createGameStore({
      ...initial,
      base: { ...initial.base, fueledAircraftIds: [] },
    });
    const threatMap = store.getSnapshot().base.threatMap;
    const outcome = {
      extracted: true,
      materialsFound: 10,
      researchFound: 0,
      preservedTechnologyIds: [],
      targetsDestroyed: 20,
      targetsBreached: 0,
      creditsEarned: 200_000,
      creditsPenalized: 0,
      wardenSignalDetected: false,
    } as const;

    for (let index = 0; index < 8; index += 1) {
      store.dispatch({ type: 'REFUEL_AIRCRAFT', aircraftId: contentCatalog.aircraft[0].id });
      store.dispatch({ type: 'SETTLE_SORTIE', outcome });
    }
    expect(store.getSnapshot().base.month).toBe(1);
    expect(store.getSnapshot().base.threatMap).toEqual(threatMap);

    store.dispatch({ type: 'END_MONTH' });
    expect(store.getSnapshot().base.month).toBe(2);
    expect(store.getSnapshot().base.threatMap).not.toEqual(threatMap);
    expect(store.getSnapshot().base.monthReport).not.toBeNull();
  });

  it('takes a loan and repays it when it falls due at a month boundary', () => {
    const initial = createInitialGameState();
    const store = createGameStore({
      ...initial,
      base: { ...initial.base, fueledAircraftIds: [] },
    });
    const lenderId = 'lender-commission';
    const creditsBefore = store.getSnapshot().base.credits;

    store.dispatch({ type: 'TAKE_LOAN', lenderId });
    const withLoan = store.getSnapshot();
    expect(withLoan.base.credits).toBe(creditsBefore + 600_000);
    expect(withLoan.base.loans[0]?.dueMonth).toBe(3);
    expect(withLoan.base.loans[0]?.repaid).toBe(false);

    const outcome = {
      extracted: true,
      materialsFound: 10,
      researchFound: 0,
      preservedTechnologyIds: [],
      targetsDestroyed: 20,
      targetsBreached: 0,
      creditsEarned: 200_000,
      creditsPenalized: 0,
      wardenSignalDetected: false,
    } as const;
    const refuel = () =>
      store.dispatch({
        type: 'REFUEL_AIRCRAFT',
        aircraftId: contentCatalog.aircraft[0].id,
      });

    // Resolve every threat each month before ending it, so no breach penalties apply.
    for (let cycle = 0; cycle < 2; cycle += 1) {
      for (const mission of store.getSnapshot().base.threatMap) {
        store.dispatch({ type: 'SELECT_MISSION', missionId: mission.id });
        refuel();
        store.dispatch({ type: 'SETTLE_SORTIE', outcome });
      }
      store.dispatch({ type: 'END_MONTH' });
    }
    expect(store.getSnapshot().base.month).toBe(3);
    expect(store.getSnapshot().base.loans[0]?.repaid).toBe(true);
    // Nation gifts vary by targeted country, so assert a healthy positive balance
    // rather than an exact sum.
    expect(store.getSnapshot().base.credits).toBeGreaterThan(creditsBefore + 600_000);
  });
});

describe('game store month cycle', () => {
  it('penalizes unresolved threats when the month ends', () => {
    const initial = createInitialGameState();
    const store = createGameStore({
      ...initial,
      base: { ...initial.base, credits: 2_000_000 },
    });
    const before = store.getSnapshot().base.credits;
    store.dispatch({ type: 'END_MONTH' });
    const report = store.getSnapshot().base.monthReport;
    expect(report?.breachPenalties).toBeGreaterThan(0);
    const pilotSalary = store.getSnapshot().base.pilots[0]?.salaryCreditCost ?? 0;
    expect(store.getSnapshot().base.credits).toBe(
      before - (report?.breachPenalties ?? 0) - pilotSalary,
    );
    expect(store.getSnapshot().base.month).toBe(2);
  });

  it('selects a mission and resolves it after a sortie', () => {
    const initial = createInitialGameState();
    const store = createGameStore({
      ...initial,
      base: { ...initial.base, fueledAircraftIds: [] },
    });
    const mission = store.getSnapshot().base.threatMap[0];
    expect(mission).toBeDefined();
    store.dispatch({ type: 'SELECT_MISSION', missionId: mission?.id ?? '' });
    expect(store.getSnapshot().base.activeMissionId).toBe(mission?.id);
    store.dispatch({
      type: 'SETTLE_SORTIE',
      outcome: {
        extracted: true,
        materialsFound: 0,
        researchFound: 0,
        preservedTechnologyIds: [],
        targetsDestroyed: 0,
        targetsBreached: 0,
        creditsEarned: 0,
        creditsPenalized: 0,
        wardenSignalDetected: false,
      },
    });
    expect(store.getSnapshot().base.resolvedThreatIds).toContain(mission?.id);
    expect(store.getSnapshot().base.activeMissionId).toBeNull();
  });

  it('grants a one-time nation gift when a mission on its territory is resolved', () => {
    const initial = createInitialGameState();
    const store = createGameStore({
      ...initial,
      base: { ...initial.base, fueledAircraftIds: [] },
    });
    const mission = store.getSnapshot().base.threatMap[0];
    const gift = (contentCatalog.nationGifts as Readonly<
      Record<string, { readonly credits: number; readonly materials: number }>
    >)[mission?.targetCountryId ?? ''];
    expect(gift).toBeDefined();
    const creditsBefore = store.getSnapshot().base.credits;
    const materialsBefore = store.getSnapshot().base.materials;
    const outcome = {
      extracted: true,
      materialsFound: 0,
      researchFound: 0,
      preservedTechnologyIds: [],
      targetsDestroyed: 0,
      targetsBreached: 0,
      creditsEarned: 0,
      creditsPenalized: 0,
      wardenSignalDetected: false,
    } as const;
    store.dispatch({ type: 'SELECT_MISSION', missionId: mission?.id ?? '' });
    store.dispatch({ type: 'SETTLE_SORTIE', outcome });
    expect(store.getSnapshot().base.credits).toBe(
      creditsBefore + (gift?.credits ?? 0),
    );
    expect(store.getSnapshot().base.materials).toBe(
      materialsBefore + (gift?.materials ?? 0),
    );
    expect(store.getSnapshot().base.nationThanks[mission?.targetCountryId ?? '']).toBe(true);
  });

  it('keeps an aborted sortie unresolved and withholds the nation gift', () => {
    const initial = createInitialGameState();
    const store = createGameStore({
      ...initial,
      base: { ...initial.base, fueledAircraftIds: [] },
    });
    const mission = store.getSnapshot().base.threatMap[0];
    expect(mission).toBeDefined();
    const creditsBefore = store.getSnapshot().base.credits;
    store.dispatch({ type: 'SELECT_MISSION', missionId: mission?.id ?? '' });
    store.dispatch({
      type: 'SETTLE_SORTIE',
      outcome: {
        extracted: false,
        materialsFound: 0,
        researchFound: 0,
        preservedTechnologyIds: [],
        targetsDestroyed: 2,
        targetsBreached: 0,
        creditsEarned: 0,
        creditsPenalized: 0,
        wardenSignalDetected: false,
      },
    });
    const state = store.getSnapshot();
    expect(state.base.resolvedThreatIds).not.toContain(mission?.id);
    expect(state.base.nationThanks[mission?.targetCountryId ?? '']).toBeUndefined();
    expect(state.base.activeMissionId).toBeNull();
    expect(state.base.credits).toBe(creditsBefore);
  });

  it('dismisses a staff member through the store', () => {
    const initial = createGameStore().getSnapshot();
    const role = contentCatalog.staffRoles[0];
    const store = createGameStore({
      ...initial,
      base: {
        ...initial.base,
        staff: [staffMember('staff-scientist-1', role.id)],
      },
    });
    store.dispatch({ type: 'DISMISS_STAFF', staffId: 'staff-scientist-1' });
    expect(store.getSnapshot().base.staff).toHaveLength(0);
  });
});

describe('game store rocket ammunition', () => {
  const rocketsId = contentCatalog.consumables[0].id;

  it('purchases rockets into the warehouse and consumes the fired count', () => {
    const initial = createInitialGameState();
    const store = createGameStore({
      ...initial,
      base: { ...initial.base, credits: 1_000_000 },
    });

    store.dispatch({ type: 'PURCHASE_CONSUMABLE', consumableId: rocketsId });
    store.dispatch({ type: 'PURCHASE_CONSUMABLE', consumableId: rocketsId });
    expect(store.getSnapshot().base.consumableStock[rocketsId]).toBe(2);

    store.dispatch({
      type: 'CONSUME_SORTIE_CONSUMABLES',
      consumableId: rocketsId,
      count: 1,
    });
    expect(store.getSnapshot().base.consumableStock[rocketsId]).toBe(1);
  });

  it('removes the stock entry entirely when the last rocket is consumed', () => {
    const initial = createInitialGameState();
    const store = createGameStore({
      ...initial,
      base: { ...initial.base, credits: 1_000_000 },
    });

    store.dispatch({ type: 'PURCHASE_CONSUMABLE', consumableId: rocketsId });
    store.dispatch({
      type: 'CONSUME_SORTIE_CONSUMABLES',
      consumableId: rocketsId,
      count: 1,
    });
    expect(store.getSnapshot().base.consumableStock[rocketsId]).toBeUndefined();
  });

  it('treats a zero count as a no-op and throws when stock is insufficient', () => {
    const initial = createInitialGameState();
    const store = createGameStore({
      ...initial,
      base: { ...initial.base, credits: 1_000_000 },
    });

    store.dispatch({
      type: 'CONSUME_SORTIE_CONSUMABLES',
      consumableId: rocketsId,
      count: 0,
    });
    expect(store.getSnapshot().base.consumableStock[rocketsId]).toBeUndefined();

    expect(() =>
      store.dispatch({
        type: 'CONSUME_SORTIE_CONSUMABLES',
        consumableId: rocketsId,
        count: 1,
      }),
    ).toThrow();
  });
});

