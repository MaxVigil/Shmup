import type {
  MarketWeaponBlueprintDefinition,
  WeaponDefinition,
} from '../content/model';
import type { GameState } from './model';
import { createSeededRng } from './rng';

function stableIdHash(value: string): number {
  let hash = 0x811c9dc5;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function marketWeaponPrice(
  weapon: WeaponDefinition,
  marketSeed: number,
  sortiesCompleted: number,
): number {
  if (weapon.marketPrice === null) {
    throw new Error(`Weapon ${weapon.id} is not offered on the terrestrial market.`);
  }
  if (!Number.isInteger(marketSeed) || !Number.isInteger(sortiesCompleted) || sortiesCompleted < 0) {
    throw new RangeError('Market seed and completed-sortie count must be valid integers.');
  }

  return deterministicMarketPrice(
    weapon.id,
    weapon.marketPrice,
    marketSeed,
    sortiesCompleted,
  );
}

export function marketBlueprintPrice(
  blueprint: MarketWeaponBlueprintDefinition,
  marketSeed: number,
  sortiesCompleted: number,
): number {
  return deterministicMarketPrice(
    blueprint.id,
    blueprint.marketPrice,
    marketSeed,
    sortiesCompleted,
  );
}

function deterministicMarketPrice(
  offerId: string,
  priceRange: { readonly minimum: number; readonly maximum: number },
  marketSeed: number,
  sortiesCompleted: number,
): number {
  if (!Number.isInteger(marketSeed) || !Number.isInteger(sortiesCompleted) || sortiesCompleted < 0) {
    throw new RangeError('Market seed and completed-sortie count must be valid integers.');
  }
  const cycleSeed = (
    (marketSeed >>> 0) ^
    stableIdHash(offerId) ^
    Math.imul(sortiesCompleted + 1, 0x9e3779b1)
  ) >>> 0;
  const rng = createSeededRng(cycleSeed);
  return rng.integer(priceRange.minimum, priceRange.maximum + 1);
}

export function purchaseMarketWeapon(
  state: GameState,
  weapon: WeaponDefinition,
): GameState {
  if (weapon.origin !== 'earth' || weapon.marketPrice === null) {
    throw new Error(`Weapon ${weapon.id} is not available for terrestrial procurement.`);
  }
  if (state.base.ownedPrimaryWeaponIds.includes(weapon.id)) {
    throw new Error(`Weapon ${weapon.id} is already owned.`);
  }

  const price = marketWeaponPrice(
    weapon,
    state.base.marketSeed,
    state.base.sortiesCompleted,
  );
  if (state.base.credits < price) {
    throw new Error(`Weapon ${weapon.id} requires ${price} credits.`);
  }

  return {
    ...state,
    base: {
      ...state.base,
      credits: state.base.credits - price,
      ownedPrimaryWeaponIds: [...state.base.ownedPrimaryWeaponIds, weapon.id],
    },
  };
}
