import { describe, expect, it } from 'vitest';
import { contentCatalog } from '../../src/content/catalog';
import {
  consumeAircraftFuel,
  generateThreatMap,
  isAircraftFueled,
  MONTH_SORTIE_LENGTH,
  monthForSorties,
  refuelAircraft,
} from '../../src/domain/command-centre';
import { createInitialGameState } from '../../src/domain/initial-state';

describe('command centre', () => {
  const interceptor = contentCatalog.aircraft[0];

  it('derives the month from completed sorties', () => {
    expect(monthForSorties(0)).toBe(1);
    expect(monthForSorties(MONTH_SORTIE_LENGTH - 1)).toBe(1);
    expect(monthForSorties(MONTH_SORTIE_LENGTH)).toBe(2);
    expect(monthForSorties(MONTH_SORTIE_LENGTH * 2)).toBe(3);
    expect(() => monthForSorties(-1)).toThrowError(/sortie count/i);
  });

  it('generates a deterministic threat map of distinct attacked states', () => {
    const states = contentCatalog.councilStates;
    const first = generateThreatMap(states, 42, 1);
    const second = generateThreatMap(states, 42, 1);
    expect(first).toHaveLength(3);
    expect(first).toEqual(second);
    expect(new Set(first.map((mission) => mission.targetCountryId)).size).toBe(3);
    for (const mission of first) {
      expect(mission.id).toContain('mission-1-');
      expect(states.some((state) => state.id === mission.targetCountryId)).toBe(true);
      expect(mission.threatLevel).toBeGreaterThanOrEqual(1);
      expect(mission.threatLevel).toBeLessThanOrEqual(3);
    }
    expect(generateThreatMap(states, 42, 2)).not.toEqual(first);
  });

  it('fuels an aircraft against credits and validates the hangar', () => {
    const state = createInitialGameState();
    const unfueled = {
      ...state,
      base: { ...state.base, credits: 500, fueledAircraftIds: [] },
    };
    const fueled = refuelAircraft(unfueled, interceptor, interceptor.refuelCreditCost);
    expect(fueled.base.fueledAircraftIds).toContain(interceptor.id);
    expect(fueled.base.credits).toBe(500 - interceptor.refuelCreditCost);
    expect(isAircraftFueled(fueled.base, interceptor.id)).toBe(true);
  });

  it('rejects refueling an already-fueled or unknown aircraft', () => {
    const state = createInitialGameState();
    expect(() => refuelAircraft(state, interceptor, interceptor.refuelCreditCost)).toThrowError(
      /already fueled/i,
    );
    const foreign = {
      ...state,
      base: { ...state.base, credits: 500, fueledAircraftIds: [] },
    };
    expect(() => refuelAircraft(foreign, contentCatalog.aircraft[1], 45)).toThrowError(
      /not in the hangar/i,
    );
  });

  it('rejects refueling without enough credits', () => {
    const state = createInitialGameState();
    const poor = {
      ...state,
      base: { ...state.base, credits: interceptor.refuelCreditCost - 1, fueledAircraftIds: [] },
    };
    expect(() => refuelAircraft(poor, interceptor, interceptor.refuelCreditCost)).toThrowError(
      /credits/i,
    );
  });

  it('consumes fuel only for the aircraft that flew', () => {
    const state = createInitialGameState();
    expect(
      consumeAircraftFuel(state.base, interceptor.id).fueledAircraftIds,
    ).not.toContain(interceptor.id);
    expect(
      consumeAircraftFuel(state.base, null).fueledAircraftIds,
    ).toEqual(state.base.fueledAircraftIds);
    expect(
      consumeAircraftFuel(state.base, contentCatalog.aircraft[1].id).fueledAircraftIds,
    ).toEqual(state.base.fueledAircraftIds);
  });
});
