import { describe, expect, it } from 'vitest';
import { aircraftId, ammunitionId, auxiliaryId, moduleId, weaponId } from '../../src/content/ids';
import { advanceProduction } from '../../src/domain/base-projects';
import {
  addWeaponStock,
  installModule,
  installWeapon,
} from '../../src/domain/armory';
import {
  aircraftLoadoutEnergy,
  aircraftLoadoutWeight,
  destroyAircraftLoadout,
  effectiveAircraftDamageMultiplier,
  installHardpointItem,
  purchaseAmmunition,
  removeHardpointItem,
  setAircraftMark,
} from '../../src/domain/arsenal-loadout';
import { createInitialGameState } from '../../src/domain/initial-state';

describe('arsenal loadout', () => {
  it('installs and removes hardpoint items', () => {
    const initial = createInitialGameState();
    const withShield = installHardpointItem(
      initial.base,
      aircraftId.india,
      0,
      moduleId.energyShield,
    );
    expect(withShield.aircraftHardpoints[aircraftId.india]).toEqual([
      moduleId.energyShield,
      null,
    ]);
    const cleared = removeHardpointItem(withShield, aircraftId.india, 0);
    expect(cleared.aircraftHardpoints[aircraftId.india]).toEqual([null, null]);
  });

  it('rejects hardpoint slots outside the aircraft capacity', () => {
    const initial = createInitialGameState();
    expect(() =>
      installHardpointItem(initial.base, aircraftId.india, 2, moduleId.dash),
    ).toThrow(/out of range/);
    expect(() =>
      installHardpointItem(initial.base, aircraftId.india, -1, moduleId.dash),
    ).toThrow(/out of range/);
  });

  it('rejects unknown hardpoint items', () => {
    const initial = createInitialGameState();
    expect(() =>
      installHardpointItem(initial.base, aircraftId.india, 0, 'weapon-autocannon'),
    ).toThrow(/Unknown hardpoint item/);
  });

  it('computes loadout weight and energy', () => {
    const initial = createInitialGameState();
    const base = {
      ...initial.base,
      aircraftLoadouts: {
        ...initial.base.aircraftLoadouts,
        [aircraftId.india]: [weaponId.pulseCannon, weaponId.pulseCannon],
      },
    };
    const withShield = installHardpointItem(
      base,
      aircraftId.india,
      0,
      moduleId.energyShield,
    );
    const withRepair = installHardpointItem(
      withShield,
      aircraftId.india,
      1,
      moduleId.repairNanobots,
    );
    // 6 primary (2 × Pulse Cannon) + 5 shield + 4 nanobots
    expect(aircraftLoadoutWeight(withRepair, aircraftId.india)).toBeCloseTo(15);
    // 2 primary energy + 4 shield + 3 nanobots
    expect(aircraftLoadoutEnergy(withRepair, aircraftId.india)).toBeCloseTo(9);
  });

  it('blocks a hardpoint install that exceeds carrying capacity', () => {
    const initial = createInitialGameState();
    const base = {
      ...initial.base,
      aircraftLoadouts: {
        ...initial.base.aircraftLoadouts,
        [aircraftId.india]: [weaponId.pulseCannon, weaponId.pulseCannon],
      },
    };
    const withShield = installHardpointItem(
      base,
      aircraftId.india,
      0,
      moduleId.energyShield,
    );
    expect(() =>
      installHardpointItem(withShield, aircraftId.india, 1, moduleId.reflectorField),
    ).toThrow(/exceeds .* carrying capacity/);
  });

  it('sets and clears aircraft marks and applies the damage multiplier', () => {
    const initial = createInitialGameState();
    expect(effectiveAircraftDamageMultiplier(initial.base, aircraftId.japan)).toBeCloseTo(1.8125);

    const marked = setAircraftMark(initial.base, aircraftId.japan, 2);
    expect(marked.aircraftMarks[aircraftId.japan]).toBe(2);
    expect(effectiveAircraftDamageMultiplier(marked, aircraftId.japan)).toBeCloseTo(1.9375);

    const cleared = setAircraftMark(marked, aircraftId.japan, 1);
    expect(cleared.aircraftMarks[aircraftId.japan]).toBeUndefined();
    expect(() => setAircraftMark(initial.base, aircraftId.japan, 4)).toThrow(
      /has no Mark 4/,
    );
  });

  it('applies Mark III when defined and stays within the 2.0 guard', () => {
    const initial = createInitialGameState();
    const marked = setAircraftMark(initial.base, aircraftId.japan, 3);
    expect(marked.aircraftMarks[aircraftId.japan]).toBe(3);
    expect(effectiveAircraftDamageMultiplier(marked, aircraftId.japan)).toBeCloseTo(
      1.9875,
    );
  });

  it('purchases ammunition into stock and deducts credits', () => {
    const initial = createInitialGameState();
    const funded = { ...initial, base: { ...initial.base, credits: 1_000 } };
    const after = purchaseAmmunition(funded, ammunitionId.rocket, 10);
    expect(after.base.credits).toBe(1_000 - 40 * 10);
    expect(after.base.consumableStock[ammunitionId.rocket]).toBe(10);
  });

  it('rejects an ammunition purchase without enough credits', () => {
    const initial = createInitialGameState();
    const poor = { ...initial, base: { ...initial.base, credits: 10 } };
    expect(() => purchaseAmmunition(poor, ammunitionId.rocket, 1)).toThrow(
      /requires/,
    );
    expect(() => purchaseAmmunition(poor, 'consumable-missing', 1)).toThrow(
      /Unknown ammunition/,
    );
  });

  it('counts stocked ammunition weight in the aircraft loadout', () => {
    const initial = createInitialGameState();
    const funded = { ...initial, base: { ...initial.base, credits: 1_000 } };
    const withAmmo = purchaseAmmunition(funded, ammunitionId.rocket, 10);
    const withPod = installHardpointItem(
      withAmmo.base,
      aircraftId.india,
      0,
      auxiliaryId.rocketPod,
    );
    // Pulse Cannon (3) + Rocket Pod (3) + 10 rockets (0.7 each)
    expect(aircraftLoadoutWeight(withPod, aircraftId.india)).toBeCloseTo(13);
  });

  it('applies the aircraft Mark when an aircraft upgrade finishes production', () => {
    const initial = createInitialGameState();
    const base = {
      ...initial.base,
      hangarSlots: ['aircraft-india', 'aircraft-japan'],
      productionQueue: [{
        id: 'production-upgrade-aircraft-japan-mk2',
        projectId: 'upgrade-aircraft-japan-mk2',
        kind: 'aircraft-upgrade' as const,
        progress: 1,
        requiredProgress: 2,
        quantity: 1,
      }],
    };
    const advanced = advanceProduction(base);
    expect(advanced.manufacturedAircraftUpgradeIds).toContain(
      'upgrade-aircraft-japan-mk2',
    );
    expect(advanced.aircraftMarks['aircraft-japan']).toBe(3);
  });
});

describe('hardcore aircraft destruction', () => {
  it('irreversibly strips a destroyed aircraft loadout', () => {
    const initial = createInitialGameState();
    const withWeapon = installWeapon(
      addWeaponStock(initial.base, weaponId.impulseAccelerator, 1),
      aircraftId.india,
      1,
      weaponId.impulseAccelerator,
    );
    const withMine = installHardpointItem(
      withWeapon,
      aircraftId.india,
      0,
      auxiliaryId.proximityMine,
    );
    const withModule = installModule(
      {
        ...withMine,
        manufacturedEquipmentIds: [
          ...withMine.manufacturedEquipmentIds,
          moduleId.energyShield,
        ],
      },
      aircraftId.india,
      moduleId.energyShield,
    );
    const destroyed = destroyAircraftLoadout(withModule, aircraftId.india);
    expect(destroyed.aircraftLoadouts[aircraftId.india]).toEqual([null, null]);
    // Installed primary weapons are removed from stock irreversibly.
    expect(destroyed.weaponStock[weaponId.pulseCannon]).toBeUndefined();
    expect(destroyed.weaponStock[weaponId.impulseAccelerator]).toBeUndefined();
    // Hardpoint items, the installed module, and the active-aircraft mirror clear.
    expect(destroyed.aircraftHardpoints[aircraftId.india]).toEqual([null, null]);
    expect(destroyed.aircraftModules[aircraftId.india]).toBeNull();
    expect(destroyed.manufacturedEquipmentIds).not.toContain(moduleId.energyShield);
    expect(destroyed.equippedPrimaryWeaponIds).toEqual([null, null]);
    expect(destroyed.equippedEquipmentId).toBeNull();
    // A different aircraft keeps its loadout untouched.
    const other = {
      ...destroyed,
      activeAircraftId: aircraftId.india,
      aircraftLoadouts: {
        ...destroyed.aircraftLoadouts,
        ['aircraft-usa']: [weaponId.pulseCannon, null, null],
      },
    };
    expect(other.aircraftLoadouts['aircraft-usa']).toEqual([
      weaponId.pulseCannon,
      null,
      null,
    ]);
  });

  it('leaves other hangar aircraft weapon stock alone', () => {
    const initial = createInitialGameState();
    const withStock = addWeaponStock(initial.base, weaponId.impulseAccelerator, 2);
    const installed = installWeapon(withStock, aircraftId.india, 1, weaponId.impulseAccelerator);
    const destroyed = destroyAircraftLoadout(installed, aircraftId.india);
    expect(destroyed.weaponStock[weaponId.impulseAccelerator]).toBe(1);
  });
});

