import { describe, expect, it } from 'vitest';
import { createInitialGameState } from '../../src/domain/initial-state';
import {
  aircraftInstanceMeta,
  assignPilotToAircraft,
  destroyAircraft,
  ensureAircraftInstance,
  recordAircraftSortie,
  unassignPilotFromAircraft,
} from '../../src/domain/aircraft-instances';
import { aircraftId } from '../../src/content/ids';

describe('aircraft instances (MISSIONS_EPIC §1.2)', () => {
  it('ensures an instance + history record for an acquired aircraft', () => {
    const initial = createInitialGameState();
    const base = ensureAircraftInstance(initial.base, aircraftId.usa, 4);
    const instance = aircraftInstanceMeta(base, aircraftId.usa);
    expect(instance).toBeDefined();
    expect(instance?.callsign).toBe('US');
    expect(instance?.status).toBe('ready');
    expect(base.aircraftHistory[instance!.historyId]).toBeDefined();
  });

  it('assigns a pilot and syncs the sortie mirror for the active aircraft', () => {
    const initial = createInitialGameState();
    const pilotId = initial.base.pilots[1]!.id;
    const base = assignPilotToAircraft(initial.base, aircraftId.india, pilotId);
    expect(base.aircraftInstances[aircraftId.india]!.assignedPilotId).toBe(pilotId);
    expect(base.activePilotId).toBe(pilotId);
  });

  it('rejects assigning a pilot already assigned elsewhere', () => {
    const initial = createInitialGameState();
    const pilotId = initial.base.pilots[1]!.id; // Yaroslava — unassigned at start
    let base = ensureAircraftInstance(initial.base, aircraftId.usa, 1);
    base = assignPilotToAircraft(base, aircraftId.usa, pilotId);
    expect(() => assignPilotToAircraft(base, aircraftId.india, pilotId)).toThrow();
  });

  it('unassigns a pilot and clears the active mirror', () => {
    const initial = createInitialGameState();
    const pilotId = initial.base.pilots[0]!.id;
    const base = unassignPilotFromAircraft(
      assignPilotToAircraft(initial.base, aircraftId.india, pilotId),
      aircraftId.india,
    );
    expect(base.aircraftInstances[aircraftId.india]!.assignedPilotId).toBeNull();
    expect(base.activePilotId).toBeNull();
  });

  it('destroys an aircraft: frees the bay, seals history, releases the pilot', () => {
    const initial = createInitialGameState();
    const pilotId = initial.base.activePilotId!;
    let base = assignPilotToAircraft(initial.base, aircraftId.india, pilotId);
    const historyId = base.aircraftInstances[aircraftId.india]!.historyId;
    base = destroyAircraft(base, aircraftId.india, 3);
    expect(base.hangarSlots).not.toContain(aircraftId.india);
    expect(base.hangarSlots).toContain(null);
    expect(base.aircraftInstances[aircraftId.india]!.status).toBe('destroyed');
    expect(base.aircraftInstances[aircraftId.india]!.assignedPilotId).toBeNull();
    expect(base.aircraftHistory[historyId]!.destroyedMonth).toBe(3);
    expect(base.activeAircraftId).toBeNull();
  });

  it('appends a sortie event to the aircraft timeline (M8)', () => {
    const initial = createInitialGameState();
    const base = recordAircraftSortie(initial.base, aircraftId.india, {
      missions: 1,
      kills: 2,
      event: { month: 1, outcome: 'success', missionType: 'sweep' },
    });
    const historyId = initial.base.aircraftInstances[aircraftId.india]!.historyId;
    expect(base.aircraftHistory[historyId]!.missions).toBe(1);
    expect(base.aircraftHistory[historyId]!.events).toHaveLength(1);
    expect(base.aircraftHistory[historyId]!.events[0]).toMatchObject({
      month: 1,
      outcome: 'success',
      missionType: 'sweep',
    });
  });
});
