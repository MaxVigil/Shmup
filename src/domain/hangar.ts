import type { AircraftDefinition } from '../content/model';
import type { GameState } from './model';
import { createSeededRng } from './rng';

export const STARTING_HANGAR_SLOTS = 2;
export const HANGAR_SLOT_COST = 1_200;

function stableIdHash(value: string): number {
  let hash = 0x811c9dc5;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function marketAircraftPrice(
  aircraft: AircraftDefinition,
  marketSeed: number,
  sortiesCompleted: number,
): number {
  if (aircraft.marketPrice === null) {
    throw new Error(`Aircraft ${aircraft.id} is not offered on the market.`);
  }
  if (
    !Number.isInteger(marketSeed) ||
    !Number.isInteger(sortiesCompleted) ||
    sortiesCompleted < 0
  ) {
    throw new RangeError('Market seed and sortie count must be valid integers.');
  }
  const cycleSeed = (
    (marketSeed >>> 0) ^
    stableIdHash(aircraft.id) ^
    Math.imul(sortiesCompleted + 1, 0x9e3779b1)
  ) >>> 0;
  const rng = createSeededRng(cycleSeed);
  return rng.integer(aircraft.marketPrice.minimum, aircraft.marketPrice.maximum + 1);
}

export function purchaseAircraft(
  state: GameState,
  aircraft: AircraftDefinition,
  price: number,
): GameState {
  if (state.base.hangarSlots.includes(aircraft.id)) {
    throw new Error(`Aircraft ${aircraft.id} is already in the hangar.`);
  }
  const freeIndex = state.base.hangarSlots.indexOf(null);
  if (freeIndex === -1) {
    throw new Error('No free hangar slot is available.');
  }
  if (state.base.credits < price) {
    throw new Error(`Aircraft ${aircraft.id} requires ${price} credits.`);
  }
  const hangarSlots = [...state.base.hangarSlots];
  hangarSlots[freeIndex] = aircraft.id;
  const loadout = Array.from(
    { length: aircraft.weaponSlotCount },
    () => null,
  );
  return {
    ...state,
    base: {
      ...state.base,
      credits: state.base.credits - price,
      hangarSlots,
      aircraftLoadouts: {
        ...state.base.aircraftLoadouts,
        [aircraft.id]: loadout,
      },
      aircraftModules: {
        ...state.base.aircraftModules,
        [aircraft.id]: null,
      },
    },
  };
}

export function purchaseHangarSlot(state: GameState, cost: number): GameState {
  if (!Number.isInteger(cost) || cost <= 0) {
    throw new RangeError('Hangar slot cost must be a positive integer.');
  }
  if (state.base.credits < cost) {
    throw new Error(`A hangar slot requires ${cost} credits.`);
  }
  return {
    ...state,
    base: {
      ...state.base,
      credits: state.base.credits - cost,
      hangarSlots: [...state.base.hangarSlots, null],
    },
  };
}

export function setActiveAircraft(state: GameState, aircraftId: string | null): GameState {
  if (aircraftId !== null && !state.base.hangarSlots.includes(aircraftId)) {
    throw new Error(`Aircraft ${aircraftId} is not in the hangar.`);
  }
  return {
    ...state,
    base: { ...state.base, activeAircraftId: aircraftId },
  };
}
