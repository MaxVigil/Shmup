import { describe, expect, it } from 'vitest';
import { contentCatalog } from '../../src/content/catalog';
import {
  HANGAR_SLOT_COST,
  marketAircraftPrice,
  purchaseAircraft,
  purchaseHangarSlot,
  setActiveAircraft,
} from '../../src/domain/hangar';
import { createInitialGameState } from '../../src/domain/initial-state';

describe('hangar fleet', () => {
  const aircraft = contentCatalog.aircraft;
  const interceptor = aircraft[0];
  const gunship = aircraft[1];
  const aegis = aircraft[2];

  function fundedState(): ReturnType<typeof createInitialGameState> {
    const initial = createInitialGameState();
    return {
      ...initial,
      base: { ...initial.base, credits: 5_000 },
    };
  }

  it('starts with the interceptor in the first of two slots', () => {
    const initial = createInitialGameState();
    expect(initial.base.hangarSlots).toEqual([interceptor.id, null]);
    expect(initial.base.activeAircraftId).toBe(interceptor.id);
  });

  it('quotes a deterministic market price within the aircraft range', () => {
    const price = marketAircraftPrice(gunship, 42, 3);
    expect(price).toBeGreaterThanOrEqual(gunship.marketPrice?.minimum ?? 0);
    expect(price).toBeLessThanOrEqual(gunship.marketPrice?.maximum ?? Number.MAX_SAFE_INTEGER);
    expect(marketAircraftPrice(gunship, 42, 3)).toBe(price);
    expect(marketAircraftPrice(gunship, 42, 3)).toBe(price);
  });

  it('purchases an aircraft into the first free slot and spends credits', () => {
    const state = fundedState();
    const price = marketAircraftPrice(gunship, state.base.marketSeed, 0);
    const updated = purchaseAircraft(state, gunship, price);
    expect(updated.base.hangarSlots).toEqual([interceptor.id, gunship.id]);
    expect(updated.base.credits).toBe(state.base.credits - price);
  });

  it('rejects a purchase without a free slot', () => {
    const state = fundedState();
    const gunshipPrice = marketAircraftPrice(gunship, state.base.marketSeed, 0);
    const aegisPrice = marketAircraftPrice(aegis, state.base.marketSeed, 0);
    const withGunship = purchaseAircraft(state, gunship, gunshipPrice);
    expect(() => purchaseAircraft(withGunship, aegis, aegisPrice)).toThrowError(
      /free hangar slot/i,
    );
  });

  it('rejects a purchase the directorate cannot afford', () => {
    const state = fundedState();
    const price = marketAircraftPrice(gunship, state.base.marketSeed, 0);
    const poor = { ...state, base: { ...state.base, credits: price - 1 } };
    expect(() => purchaseAircraft(poor, gunship, price)).toThrowError(/credits/i);
  });

  it('rejects re-purchasing an aircraft already in the hangar', () => {
    const state = fundedState();
    const price = marketAircraftPrice(gunship, state.base.marketSeed, 0);
    const withGunship = purchaseAircraft(state, gunship, price);
    expect(() => purchaseAircraft(withGunship, gunship, price)).toThrowError(
      /already/i,
    );
  });

  it('expands the hangar for a fixed credit cost', () => {
    const state = fundedState();
    const updated = purchaseHangarSlot(state, HANGAR_SLOT_COST);
    expect(updated.base.hangarSlots).toEqual([interceptor.id, null, null]);
    expect(updated.base.credits).toBe(state.base.credits - HANGAR_SLOT_COST);
  });

  it('rejects a hangar expansion the directorate cannot afford', () => {
    const state = createInitialGameState();
    const poor = { ...state, base: { ...state.base, credits: HANGAR_SLOT_COST - 1 } };
    expect(() => purchaseHangarSlot(poor, HANGAR_SLOT_COST)).toThrowError(/credits/i);
  });

  it('selects an active aircraft from the hangar and validates membership', () => {
    const state = createInitialGameState();
    expect(setActiveAircraft(state, interceptor.id).base.activeAircraftId).toBe(
      interceptor.id,
    );
    expect(() => setActiveAircraft(state, gunship.id)).toThrowError(/not in the hangar/i);
  });
});
