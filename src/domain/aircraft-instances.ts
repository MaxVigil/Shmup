import type { AircraftInstanceMeta, BaseState } from './model';
import { aircraftById } from '../content/ids';
import { destroyAircraftLoadout } from './arsenal-loadout';

/**
 * Aircraft-instance lifecycle (MISSIONS_EPIC §1.2). One instance per acquired
 * aircraft. The instance id is stable and initially equals the definition id.
 * Loadout/armour data stays in the per-type maps; this module owns the metadata:
 * callsign, per-aircraft pilot assignment, terminal 'destroyed' state, and the
 * immutable history/archive record.
 */

/** Stable instance id for an aircraft definition. */
export function instanceIdFor(definitionId: string): string {
  return `aircraft-instance-${definitionId}`;
}

function historyIdFor(definitionId: string): string {
  return `history-${definitionId}`;
}

function defaultCallsign(definitionId: string): string {
  const definition = aircraftById(definitionId);
  return definition === undefined
    ? definitionId
    : definition.name.replace(/ aircraft$/i, '');
}

/** Creates an instance + history record for an acquired aircraft (no-op if present). */
export function ensureAircraftInstance(
  base: BaseState,
  definitionId: string,
  month: number,
  options?: { readonly callsign?: string; readonly legacyImported?: boolean },
): BaseState {
  if (base.aircraftInstances[definitionId] !== undefined) {
    return base;
  }
  const historyId = historyIdFor(definitionId);
  const callsign = options?.callsign ?? defaultCallsign(definitionId);
  return {
    ...base,
    aircraftInstances: {
      ...base.aircraftInstances,
      [definitionId]: {
        id: instanceIdFor(definitionId),
        definitionId,
        callsign,
        assignedPilotId: null,
        status: 'ready',
        historyId,
      },
    },
    aircraftHistory: {
      ...base.aircraftHistory,
      [historyId]: {
        id: historyId,
        definitionId,
        callsign,
        acquiredMonth: month,
        destroyedMonth: null,
        legacyImported: options?.legacyImported ?? false,
        missions: 0,
        kills: 0,
        eliteKills: 0,
      },
    },
  };
}

/** Instance metadata for an aircraft, or undefined when it is not owned. */
export function aircraftInstanceMeta(
  base: BaseState,
  definitionId: string,
): AircraftInstanceMeta | undefined {
  return base.aircraftInstances[definitionId];
}

/** The aircraft a pilot is currently assigned to, if any. */
export function aircraftOfPilot(
  base: BaseState,
  pilotId: string,
): string | undefined {
  for (const [definitionId, instance] of Object.entries(base.aircraftInstances)) {
    if (instance.assignedPilotId === pilotId) {
      return definitionId;
    }
  }
  return undefined;
}

export function assignPilotToAircraft(
  base: BaseState,
  definitionId: string,
  pilotId: string,
): BaseState {
  const instance = base.aircraftInstances[definitionId];
  if (instance === undefined) {
    throw new Error(`Aircraft ${definitionId} has no instance.`);
  }
  if (instance.status === 'destroyed') {
    throw new Error(`Aircraft ${definitionId} is destroyed.`);
  }
  if (!base.pilots.some((pilot) => pilot.id === pilotId)) {
    throw new Error(`Unknown pilot ${pilotId}.`);
  }
  const occupiedBy = aircraftOfPilot(base, pilotId);
  if (occupiedBy !== undefined && occupiedBy !== definitionId) {
    throw new Error(`Pilot ${pilotId} is already assigned to ${occupiedBy}.`);
  }
  const aircraftInstances = {
    ...base.aircraftInstances,
    [definitionId]: { ...instance, assignedPilotId: pilotId },
  };
  return {
    ...base,
    aircraftInstances,
    // Sortie-pilot mirror: assigning to the active aircraft keeps combat intact.
    activePilotId: definitionId === base.activeAircraftId ? pilotId : base.activePilotId,
  };
}

export function unassignPilotFromAircraft(
  base: BaseState,
  definitionId: string,
): BaseState {
  const instance = base.aircraftInstances[definitionId];
  if (instance === undefined || instance.assignedPilotId === null) {
    return base;
  }
  const pilotId = instance.assignedPilotId;
  const aircraftInstances = {
    ...base.aircraftInstances,
    [definitionId]: { ...instance, assignedPilotId: null },
  };
  return {
    ...base,
    aircraftInstances,
    activePilotId: base.activePilotId === pilotId ? null : base.activePilotId,
  };
}

/**
 * Permanent loss (MISSIONS_EPIC §1.2, design spec §2.3): the destroyed aircraft is
 * removed from the active fleet (bay freed, fuel dropped, loadout irreversibly lost,
 * pilot released) and only its immutable history record survives in the archive.
 */
export function destroyAircraft(
  base: BaseState,
  definitionId: string,
  month: number,
): BaseState {
  const instance = base.aircraftInstances[definitionId];
  if (instance === undefined) {
    return base;
  }
  const wasActive = base.activeAircraftId === definitionId;
  // 1. Lose the entire installed loadout irreversibly.
  const next = destroyAircraftLoadout(base, definitionId);
  // 2. Free the bay and drop fuel.
  const slotIndex = next.hangarSlots.indexOf(definitionId);
  const hangarSlots = slotIndex === -1
    ? next.hangarSlots
    : [
        ...next.hangarSlots.slice(0, slotIndex),
        null,
        ...next.hangarSlots.slice(slotIndex + 1),
      ];
  const fueledAircraftIds = next.fueledAircraftIds.filter((id) => id !== definitionId);
  // 3. Mark the instance destroyed and release the pilot.
  const aircraftInstances: Readonly<Record<string, AircraftInstanceMeta>> = {
    ...next.aircraftInstances,
    [definitionId]: {
      ...instance,
      status: 'destroyed',
      assignedPilotId: null,
    },
  };
  // 4. Seal the history record.
  const history = next.aircraftHistory[instance.historyId];
  const aircraftHistory = history === undefined
    ? next.aircraftHistory
    : {
        ...next.aircraftHistory,
        [instance.historyId]: { ...history, destroyedMonth: month },
      };
  return {
    ...next,
    hangarSlots,
    fueledAircraftIds,
    aircraftInstances,
    aircraftHistory,
    activeAircraftId: wasActive ? null : next.activeAircraftId,
    activePilotId: wasActive ? null : next.activePilotId,
  };
}

export interface SortieHistoryDeltas {
  readonly missions?: number;
  readonly kills?: number;
  readonly eliteKills?: number;
}

/** Appends sortie outcomes to an aircraft's history record (event-backed stub). */
export function recordAircraftSortie(
  base: BaseState,
  definitionId: string,
  deltas: SortieHistoryDeltas,
): BaseState {
  const instance = base.aircraftInstances[definitionId];
  if (instance === undefined) {
    return base;
  }
  const history = base.aircraftHistory[instance.historyId];
  if (history === undefined) {
    return base;
  }
  return {
    ...base,
    aircraftHistory: {
      ...base.aircraftHistory,
      [instance.historyId]: {
        ...history,
        missions: history.missions + (deltas.missions ?? 0),
        kills: history.kills + (deltas.kills ?? 0),
        eliteKills: history.eliteKills + (deltas.eliteKills ?? 0),
      },
    },
  };
}

