import { describe, expect, it } from 'vitest';
import { aircraftById, ammunitionId } from '../../src/content/ids';
import {
  createMissionsReadyState,
  MISSIONS_READY_FLEET,
} from '../../src/ui/playtest-profiles';

/**
 * Reachability gate for the missions epic (MISSIONS_EPIC.md §0): the
 * `?missionsReady=true` profile must provision a state a human can reach and use —
 * full fleet, primaries on every aircraft, fuel, pilots, missions, ammunition.
 */
describe('missionsReady playtest profile (reachability gate)', () => {
  it('provisions every aircraft with a primary installed', () => {
    const state = createMissionsReadyState();
    const fleet = state.base.hangarSlots.filter((id): id is string => id !== null);
    expect(fleet).toEqual([...MISSIONS_READY_FLEET]);
    expect(fleet).toHaveLength(7);
    for (const id of fleet) {
      const loadout = state.base.aircraftLoadouts[id];
      expect(loadout, `loadout for ${id}`).toBeDefined();
      expect(loadout?.[0], `primary for ${id}`).not.toBeNull();
      const definition = aircraftById(id);
      expect(loadout).toHaveLength(definition?.weaponSlotCount ?? -1);
    }
  });

  it('fuels and readies the whole fleet (no damage, no repairs)', () => {
    const state = createMissionsReadyState();
    for (const id of MISSIONS_READY_FLEET) {
      expect(state.base.fueledAircraftIds).toContain(id);
    }
    expect(state.base.aircraftDamage).toEqual({});
    expect(state.base.aircraftRepair).toEqual({});
  });

  it('provides one pilot per aircraft and an assigned active pilot', () => {
    const state = createMissionsReadyState();
    expect(state.base.pilots).toHaveLength(MISSIONS_READY_FLEET.length);
    expect(state.base.activePilotId).not.toBeNull();
    expect(state.base.pilots.some((p) => p.id === state.base.activePilotId)).toBe(true);
  });

  it('provisions an instance + history record for every fleet aircraft', () => {
    const state = createMissionsReadyState();
    expect(Object.keys(state.base.aircraftInstances)).toHaveLength(MISSIONS_READY_FLEET.length);
    for (const id of MISSIONS_READY_FLEET) {
      expect(state.base.aircraftInstances[id]).toBeDefined();
      expect(state.base.aircraftInstances[id]!.assignedPilotId).not.toBeNull();
    }
  });

  it('keeps a populated mission map and no active mission', () => {
    const state = createMissionsReadyState();
    expect(state.base.threatMap.length).toBeGreaterThanOrEqual(1);
    expect(state.base.activeMissionId).toBeNull();
  });

  it('stocks the active aircraft primary so a launch is possible', () => {
    const state = createMissionsReadyState();
    const active = state.base.activeAircraftId!;
    const primary = state.base.aircraftLoadouts[active]![0]!;
    expect(state.base.weaponStock[primary]).toBeGreaterThanOrEqual(1);
  });

  it('provisions full auxiliary ammunition', () => {
    const state = createMissionsReadyState();
    for (const ammo of Object.values(ammunitionId)) {
      expect(state.base.consumableStock[ammo], `ammo ${ammo}`).toBeGreaterThan(0);
    }
  });
});
