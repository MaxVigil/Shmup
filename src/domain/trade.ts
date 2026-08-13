import type { BaseState } from './model';
import {
  aircraftLoadout,
  moduleInstalledOn,
  removeModule,
  removeWeapon,
  weaponStockCount,
} from './armory';
import { staffLevel } from './staff-market';

export const SELL_WEAPON_RATE = 0.5;
export const SELL_AIRCRAFT_RATE = 0.6;
export const TRADER_ROLE_ID = 'staff-trader';

export function tradeMargin(base: BaseState): number {
  const trader = base.staff.find((member) => member.roleId === TRADER_ROLE_ID);
  if (trader === undefined) {
    return 0;
  }
  const level = staffLevel(base.staffXp[trader.id] ?? 0);
  return Math.min(0.15, (level - 1) * 0.03);
}

export function sellWeapon(
  base: BaseState,
  weaponId: string,
  basePrice: number,
): BaseState {
  if (weaponStockCount(base, weaponId) <= 0) {
    throw new Error(`No ${weaponId} is in the warehouse to sell.`);
  }
  const price = Math.round(basePrice * SELL_WEAPON_RATE * (1 + tradeMargin(base)));
  const stock = { ...base.weaponStock };
  stock[weaponId] = (stock[weaponId] ?? 0) - 1;
  if (stock[weaponId] === 0) {
    delete stock[weaponId];
  }
  return { ...base, credits: base.credits + price, weaponStock: stock };
}

export function sellAircraft(
  base: BaseState,
  aircraftId: string,
  basePrice: number,
): BaseState {
  if (!base.hangarSlots.includes(aircraftId)) {
    throw new Error(`Aircraft ${aircraftId} is not in the hangar.`);
  }
  if (base.activeAircraftId === aircraftId) {
    throw new Error('The active aircraft cannot be sold.');
  }
  let next = base;
  const loadout = aircraftLoadout(base, aircraftId);
  loadout.forEach((weaponId, index) => {
    if (weaponId !== null) {
      next = removeWeapon(next, aircraftId, index);
    }
  });
  if (moduleInstalledOn(base, aircraftId) !== null) {
    next = removeModule(next, aircraftId);
  }
  const price = Math.round(basePrice * SELL_AIRCRAFT_RATE * (1 + tradeMargin(base)));
  const nextSlots = next.hangarSlots.map((id) => (id === aircraftId ? null : id));
  const nextLoadouts = { ...next.aircraftLoadouts };
  delete nextLoadouts[aircraftId];
  const nextModules = { ...next.aircraftModules };
  delete nextModules[aircraftId];
  return {
    ...next,
    credits: next.credits + price,
    hangarSlots: nextSlots,
    aircraftLoadouts: nextLoadouts,
    aircraftModules: nextModules,
  };
}
