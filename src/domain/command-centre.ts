import { contentCatalog } from '../content/catalog';
import type {
  AircraftDefinition,
  CouncilStateDefinition,
  MissionState,
} from '../content/model';
import type { BaseState, GameState } from './model';
import { createSeededRng } from './rng';

export const MONTH_SORTIE_LENGTH = 3;
export const THREAT_MAP_MISSION_COUNT = 3;

function stableIdHash(value: string): number {
  let hash = 0x811c9dc5;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function monthForSorties(sortiesCompleted: number): number {
  if (!Number.isInteger(sortiesCompleted) || sortiesCompleted < 0) {
    throw new RangeError('Sortie count must be a non-negative integer.');
  }
  return Math.floor(sortiesCompleted / MONTH_SORTIE_LENGTH) + 1;
}

export function generateThreatMap(
  states: readonly CouncilStateDefinition[],
  marketSeed: number,
  month: number,
): readonly MissionState[] {
  if (!Number.isInteger(month) || month < 1) {
    throw new RangeError('Month must be a positive integer.');
  }
  const pool = [...states];
  const count = Math.min(THREAT_MAP_MISSION_COUNT, pool.length);
  if (count === 0) {
    return [];
  }
  const cycleSeed = (
    (marketSeed >>> 0) ^
    stableIdHash('threat-map') ^
    Math.imul(month, 0x9e3779b1)
  ) >>> 0;
  const rng = createSeededRng(cycleSeed);
  const missions: MissionState[] = [];
  // Early months keep the threat ceiling low so the starting fleet can breathe.
  const maxThreatExclusive = month === 1 ? 3 : 4;
  for (let index = 0; index < count; index += 1) {
    const pickIndex = rng.integer(0, pool.length);
    const [target] = pool.splice(pickIndex, 1);
    if (target === undefined) {
      continue;
    }
    missions.push({
      id: `mission-${month}-${index + 1}`,
      targetCountryId: target.id,
      threatLevel: rng.integer(1, maxThreatExclusive),
    });
  }
  return missions;
}

export function refuelAircraft(
  state: GameState,
  aircraft: AircraftDefinition,
  cost: number,
): GameState {
  if (!state.base.hangarSlots.includes(aircraft.id)) {
    throw new Error(`Aircraft ${aircraft.id} is not in the hangar.`);
  }
  if (state.base.fueledAircraftIds.includes(aircraft.id)) {
    throw new Error(`Aircraft ${aircraft.id} is already fueled.`);
  }
  if (state.base.credits < cost) {
    throw new Error(`Refueling ${aircraft.id} requires ${cost} credits.`);
  }
  return {
    ...state,
    base: {
      ...state.base,
      credits: state.base.credits - cost,
      fueledAircraftIds: [...state.base.fueledAircraftIds, aircraft.id],
    },
  };
}

export function isAircraftFueled(base: BaseState, aircraftId: string): boolean {
  return base.fueledAircraftIds.includes(aircraftId);
}

/** Estimated bounty for a mission based on its threat level. */
export function missionBounty(mission: MissionState): number {
  if (!Number.isInteger(mission.threatLevel) || mission.threatLevel < 1) {
    throw new RangeError('Mission threat level must be a positive integer.');
  }
  return mission.threatLevel * 80_000;
}

/** Breach penalty: the mission bounty times the Council penalty multiplier. */
export function missionBreachPenalty(
  mission: MissionState,
  penaltyMultiplier: number,
): number {
  if (!Number.isInteger(penaltyMultiplier) || penaltyMultiplier < 1) {
    throw new RangeError('Penalty multiplier must be a positive integer.');
  }
  return missionBounty(mission) * penaltyMultiplier;
}

/** A nation thanks the Directorate once per month for defending its territory. */
export function grantNationThanks(base: BaseState, nationId: string): BaseState {
  if (base.nationThanks[nationId]) {
    return base;
  }
  const gift = (contentCatalog.nationGifts as Readonly<
    Record<string, { readonly credits: number; readonly materials: number }>
  >)[nationId];
  if (gift === undefined) {
    return base;
  }
  return {
    ...base,
    credits: base.credits + gift.credits,
    materials: base.materials + gift.materials,
    nationThanks: { ...base.nationThanks, [nationId]: true },
  };
}

export function consumeAircraftFuel(
  base: BaseState,
  aircraftId: string | null,
): BaseState {
  if (aircraftId === null || !base.fueledAircraftIds.includes(aircraftId)) {
    return base;
  }
  return {
    ...base,
    fueledAircraftIds: base.fueledAircraftIds.filter((id) => id !== aircraftId),
  };
}
