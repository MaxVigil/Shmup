import { describe, expect, it } from 'vitest';
import { aircraftId, moduleId, weaponId } from '../../src/content/ids';
import {
  aircraftLoadoutEnergy,
  aircraftLoadoutWeight,
  effectiveAircraftDamageMultiplier,
  installHardpointItem,
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
    expect(() => setAircraftMark(initial.base, aircraftId.japan, 3)).toThrow(
      /has no Mark 3/,
    );
  });
});

