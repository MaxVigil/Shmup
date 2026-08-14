import { describe, expect, it } from 'vitest';
import { contentCatalog } from '../../src/content/catalog';
import { createInitialGameState } from '../../src/domain/initial-state';
import {
  addWeaponStock,
  aircraftLoadout,
  installModule,
  installWeapon,
  moduleWarehouseCount,
  removeWeapon,
  syncActiveLoadout,
} from '../../src/domain/armory';
import {
  advanceRepairs,
  applySortieDamage,
  emergencyRepairCost,
  isAircraftRepairing,
  standardRepairCost,
  startRepair,
} from '../../src/domain/aircraft-integrity';
import {
  awardStaffXp,
  generateStaffCandidates,
  hireCandidate,
  staffContribution,
  staffLevel,
} from '../../src/domain/staff-market';
import { sellAircraft, sellWeapon, tradeMargin } from '../../src/domain/trade';
import { marketWeaponPrice } from '../../src/domain/terrestrial-market';

const interceptorId = contentCatalog.aircraft[0].id;
const machineGun = contentCatalog.weapons[0];
const accelerator = contentCatalog.weapons[1];
const capturer = contentCatalog.equipment[0];

describe('fleet armory', () => {
  it('installs and unequips weapons through warehouse stock', () => {
    const initial = createInitialGameState();
    const stocked = addWeaponStock(initial.base, accelerator.id, 1);
    const installed = installWeapon(stocked, interceptorId, 1, accelerator.id);
    expect(aircraftLoadout(installed, interceptorId)).toEqual([
      machineGun.id,
      accelerator.id,
    ]);
    expect(installed.weaponStock[accelerator.id]).toBeUndefined();
    const removed = removeWeapon(installed, interceptorId, 1);
    expect(aircraftLoadout(removed, interceptorId)).toEqual([machineGun.id, null]);
    expect(removed.weaponStock[accelerator.id]).toBe(1);
  });

  it('moves an installed weapon between slots and returns displaced weapons to stock', () => {
    const initial = createInitialGameState();
    const stocked = addWeaponStock(initial.base, accelerator.id, 2);
    const inSlot = installWeapon(stocked, interceptorId, 1, accelerator.id);
    const moved = installWeapon(inSlot, interceptorId, 0, accelerator.id);
    expect(aircraftLoadout(moved, interceptorId)).toEqual([accelerator.id, null]);
    expect(moved.weaponStock[machineGun.id]).toBe(1);
    expect(moved.weaponStock[accelerator.id]).toBe(1);
  });

  it('keeps modules physical: install once, never twice', () => {
    const initial = createInitialGameState();
    const withModule = {
      ...initial,
      base: {
        ...initial.base,
        manufacturedEquipmentIds: [capturer.id],
      },
    };
    const installed = installModule(withModule.base, interceptorId, capturer.id);
    expect(installed.aircraftModules[interceptorId]).toBe(capturer.id);
    expect(moduleWarehouseCount(installed, capturer.id)).toBe(1);
    expect(() => installModule(installed, interceptorId, capturer.id)).toThrow(
      /already has a module/,
    );
    const removed = removeWeapon(installed, interceptorId, 0);
    expect(moduleWarehouseCount(removed, capturer.id)).toBe(1);
  });

  it('syncs the active-loadout mirrors', () => {
    const initial = createInitialGameState();
    const stocked = addWeaponStock(initial.base, accelerator.id, 1);
    const synced = syncActiveLoadout(installedAndActive(stocked));
    expect(synced.equippedPrimaryWeaponIds).toEqual([machineGun.id, accelerator.id]);
  });
});

describe('aircraft integrity', () => {
  it('grounds damaged aircraft until repaired, with emergency repair available', () => {
    const initial = createInitialGameState();
    const damaged = applySortieDamage(initial.base, interceptorId, 0.5);
    expect(isAircraftRepairing(damaged, interceptorId)).toBe(true);
    expect(standardRepairCost(damaged, interceptorId)).toBe(30_000);
    expect(emergencyRepairCost(damaged, interceptorId)).toBe(60_000);
    const repaired = startRepair(
      { ...damaged, credits: 200_000 },
      interceptorId,
      true,
    );
    expect(isAircraftRepairing(repaired, interceptorId)).toBe(false);
    expect(repaired.credits).toBe(200_000 - 60_000);
  });

  it('standard repairs consume sortie-time and clear when complete', () => {
    const initial = createInitialGameState();
    const damaged = applySortieDamage(initial.base, interceptorId, 0.5);
    const repairing = startRepair(
      { ...damaged, credits: 200_000 },
      interceptorId,
      false,
    );
    expect(repairing.aircraftRepair[interceptorId]).toBeGreaterThan(0);
    let current = repairing;
    let rounds = 0;
    while (isAircraftRepairing(current, interceptorId) && rounds < 10) {
      current = advanceRepairs(current);
      rounds += 1;
    }
    expect(isAircraftRepairing(current, interceptorId)).toBe(false);
    expect(current.aircraftRepair[interceptorId]).toBeUndefined();
  });
});

describe('staff market', () => {
  it('generates deterministic monthly candidate pools with distinct tiers', () => {
    const roles = contentCatalog.staffRoles;
    const monthOne = generateStaffCandidates(roles, 0x3a7e2026, 1);
    const monthOneAgain = generateStaffCandidates(roles, 0x3a7e2026, 1);
    const monthTwo = generateStaffCandidates(roles, 0x3a7e2026, 2);
    expect(monthOne).toEqual(monthOneAgain);
    expect(monthOne.length).toBe(roles.length * 2);
    expect(monthTwo[0]?.id).not.toBe(monthOne[0]?.id);
  });

  it('hires a candidate, removes them from the pool, and raises XP levels', () => {
    const initial = createInitialGameState();
    const candidate = initial.base.staffCandidates.find(
      (entry) => entry.roleId === contentCatalog.staffRoles[0].id,
    );
    expect(candidate).toBeDefined();
    const role = contentCatalog.staffRoles[0];
    const funded = {
      ...initial,
      base: {
        ...initial.base,
        credits: 1_000_000,
        constructedBuildingIds: [role.requiredBuildingId],
      },
    };
    const hired = hireCandidate(funded.base, candidate as never, role);
    expect(hired.staff).toHaveLength(1);
    expect(hired.staffCandidates).not.toContain(candidate);
    expect(staffContribution(hired, contentCatalog.staffRoles[0].id)).toBeGreaterThan(0);
    const xpGained = awardStaffXp(hired);
    expect(xpGained.staffXp[hired.staff[0]?.id ?? '']).toBe(1);
    expect(staffLevel(0)).toBe(1);
    expect(staffLevel(3)).toBe(2);
  });

  it('refuses to hire a candidate until the required building is constructed', () => {
    const initial = createInitialGameState();
    const candidate = initial.base.staffCandidates.find(
      (entry) => entry.roleId === contentCatalog.staffRoles[0].id,
    );
    expect(candidate).toBeDefined();
    const role = contentCatalog.staffRoles[0];
    const funded = { ...initial, base: { ...initial.base, credits: 1_000 } };
    expect(() => hireCandidate(funded.base, candidate as never, role)).toThrow();
  });
});

describe('trade centre', () => {
  it('sells warehouse stock at the quoted rate and refuses absent stock', () => {
    const initial = createInitialGameState();
    const stocked = addWeaponStock(initial.base, accelerator.id, 1);
    const basePrice = marketWeaponPrice(
      accelerator,
      stocked.marketSeed,
      stocked.sortiesCompleted,
    );
    const sold = sellWeapon(stocked, accelerator.id, basePrice);
    expect(sold.credits).toBe(stocked.credits + Math.round(basePrice * 0.5));
    expect(sold.weaponStock[accelerator.id]).toBeUndefined();
    expect(() => sellWeapon(sold, accelerator.id, basePrice)).toThrow(
      /in the warehouse/,
    );
  });

  it('applies a trade margin only when a trader is employed', () => {
    const initial = createInitialGameState();
    expect(tradeMargin(initial.base)).toBe(0);
    const trader = {
      id: 'staff-trader-1',
      roleId: 'staff-trader',
      firstName: 'Test',
      lastName: 'Trader',
      tier: 1,
      progressMultiplier: 1,
      salaryMultiplier: 1,
    };
    const withTrader = {
      ...initial,
      base: {
        ...initial.base,
        staff: [...initial.base.staff, trader],
        staffXp: { 'staff-trader-1': 3 },
      },
    };
    expect(tradeMargin(withTrader.base)).toBe(0.03);
  });

  it('sells non-active aircraft, unloading their loadout first', () => {
    const initial = createInitialGameState();
    const state = {
      ...initial,
      base: {
        ...initial.base,
        credits: 5_000_000,
        hangarSlots: [interceptorId, contentCatalog.aircraft[2].id],
      },
    };
    const sold = sellAircraft(
      { ...state.base, aircraftLoadouts: { ...state.base.aircraftLoadouts } },
      contentCatalog.aircraft[2].id,
      1_000_000,
    );
    expect(sold.hangarSlots).toEqual([interceptorId, null]);
    expect(sold.credits).toBe(5_000_000 + Math.round(1_000_000 * 0.6));
  });
});

function installedAndActive(
  base: ReturnType<typeof addWeaponStock>,
): ReturnType<typeof addWeaponStock> {
  return installWeapon(base, interceptorId, 1, accelerator.id);
}

