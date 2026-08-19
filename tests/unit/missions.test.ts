import { describe, expect, it } from 'vitest';
import { createInitialGameState } from '../../src/domain/initial-state';
import { createGameStore } from '../../src/app/store';
import { deriveMissionOutcome, missionStatus, recordMissionIntel } from '../../src/domain/missions';

describe('mission status derivation (MISSIONS_EPIC §1.1)', () => {
  it('derives active for the selected mission', () => {
    const initial = createInitialGameState();
    const mission = initial.base.threatMap[0]!;
    const base = { ...initial.base, activeMissionId: mission.id };
    expect(missionStatus(base, mission)).toBe('active');
  });

  it('derives available for an unresolved on-map mission', () => {
    const initial = createInitialGameState();
    const mission = initial.base.threatMap[0]!;
    expect(missionStatus(initial.base, mission)).toBe('available');
  });

  it('derives resolved when a result record exists', () => {
    const initial = createInitialGameState();
    const mission = initial.base.threatMap[0]!;
    const base = {
      ...initial.base,
      missionResults: [{
        id: 'r1',
        missionId: mission.id,
        missionType: 'sweep',
        month: 1,
        aircraftId: null,
        pilotId: null,
        outcome: 'success' as const,
        targetsDestroyed: 0,
        targetsBreached: 0,
        extracted: true,
        wardenSignalDetected: false,
      }],
    };
    expect(missionStatus(base, mission)).toBe('resolved');
  });

  it('derives expired for a mission no longer on the map', () => {
    const initial = createInitialGameState();
    const mission = initial.base.threatMap[0]!;
    const base = { ...initial.base, threatMap: initial.base.threatMap.slice(1) };
    expect(missionStatus(base, mission)).toBe('expired');
  });
});

describe('mission outcome derivation', () => {
  it('maps destroyed, success, partial-success and objective-failed', () => {
    expect(
      deriveMissionOutcome({ destroyed: true, extracted: false, targetsBreached: 0 }),
    ).toBe('destroyed');
    expect(
      deriveMissionOutcome({ destroyed: false, extracted: true, targetsBreached: 0 }),
    ).toBe('success');
    expect(
      deriveMissionOutcome({ destroyed: false, extracted: true, targetsBreached: 2 }),
    ).toBe('partial-success');
    expect(
      deriveMissionOutcome({ destroyed: false, extracted: false, targetsBreached: 0 }),
    ).toBe('objective-failed-extracted');
    expect(
      deriveMissionOutcome({ destroyed: false, aborted: true, extracted: false, targetsBreached: 0 }),
    ).toBe('aborted');
  });
});

describe('SETTLE_SORTIE writes a mission result record', () => {
  it('records a success outcome for an extracted clean mission', () => {
    const initial = createInitialGameState();
    const store = createGameStore(initial);
    const mission = store.getSnapshot().base.threatMap[0]!;
    store.dispatch({ type: 'SELECT_MISSION', missionId: mission.id });
    store.dispatch({
      type: 'SETTLE_SORTIE',
      outcome: {
        extracted: true,
        materialsFound: 0,
        researchFound: 0,
        preservedTechnologyIds: [],
        targetsDestroyed: 3,
        targetsBreached: 0,
        creditsEarned: 0,
        creditsPenalized: 0,
        wardenSignalDetected: false,
      },
    });
    const records = store.getSnapshot().base.missionResults;
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      missionId: mission.id,
      missionType: 'sweep',
      outcome: 'success',
      targetsDestroyed: 3,
    });
  });

  it('withholds the gift for an interception when the Warden was not destroyed', () => {
    const initial = createInitialGameState();
    const store = createGameStore({
      ...initial,
      base: {
        ...initial.base,
        threatMap: [{
          id: 'mission-1-1',
          targetCountryId: initial.base.threatMap[0]!.targetCountryId,
          threatLevel: 1,
          type: 'interception',
        }],
      },
    });
    const mission = store.getSnapshot().base.threatMap[0]!;
    store.dispatch({ type: 'SELECT_MISSION', missionId: mission.id });
    store.dispatch({
      type: 'SETTLE_SORTIE',
      outcome: {
        extracted: true,
        materialsFound: 0,
        researchFound: 0,
        preservedTechnologyIds: [],
        targetsDestroyed: 0,
        targetsBreached: 0,
        creditsEarned: 0,
        creditsPenalized: 0,
        wardenSignalDetected: false,
      },
    });
    const snapshot = store.getSnapshot();
    expect(snapshot.base.resolvedThreatIds).toContain(mission.id);
    expect(snapshot.base.nationThanks[mission.targetCountryId]).toBeUndefined();
  });

  it('keeps an escort mission unresolved when the transport was breached', () => {
    const initial = createInitialGameState();
    const store = createGameStore({
      ...initial,
      base: {
        ...initial.base,
        threatMap: [{
          id: 'mission-1-1',
          targetCountryId: initial.base.threatMap[0]!.targetCountryId,
          threatLevel: 1,
          type: 'escort',
        }],
      },
    });
    const mission = store.getSnapshot().base.threatMap[0]!;
    store.dispatch({ type: 'SELECT_MISSION', missionId: mission.id });
    store.dispatch({
      type: 'SETTLE_SORTIE',
      outcome: {
        extracted: true,
        materialsFound: 0,
        researchFound: 0,
        preservedTechnologyIds: [],
        targetsDestroyed: 0,
        targetsBreached: 2,
        creditsEarned: 0,
        creditsPenalized: 0,
        wardenSignalDetected: false,
      },
    });
    const snapshot = store.getSnapshot();
    expect(snapshot.base.resolvedThreatIds).not.toContain(mission.id);
    expect(snapshot.base.nationThanks[mission.targetCountryId]).toBeUndefined();
  });
});

describe('mission intel (M7, MISSIONS_EPIC §8)', () => {
  it('records an observation fact with confidence from the outcome', () => {
    const initial = createInitialGameState();
    const base = recordMissionIntel(initial.base, 'mission-1-1', 'council-uk', 'success');
    expect(base.intelFacts).toHaveLength(1);
    expect(base.intelFacts[0]).toMatchObject({
      subjectId: 'council-uk',
      category: 'enemy',
      confidence: 'confirmed',
      source: 'observation',
    });
  });

  it('records a lower-confidence fact for an aborted sortie', () => {
    const initial = createInitialGameState();
    const base = recordMissionIntel(initial.base, 'mission-1-1', 'council-uk', 'aborted');
    expect(base.intelFacts[0]!.confidence).toBe('possible');
  });

  it('writes an intel fact when settling a mission through the store', () => {
    const initial = createInitialGameState();
    const store = createGameStore(initial);
    const mission = store.getSnapshot().base.threatMap[0]!;
    store.dispatch({ type: 'SELECT_MISSION', missionId: mission.id });
    store.dispatch({
      type: 'SETTLE_SORTIE',
      outcome: {
        extracted: true,
        materialsFound: 0,
        researchFound: 0,
        preservedTechnologyIds: [],
        targetsDestroyed: 1,
        targetsBreached: 0,
        creditsEarned: 0,
        creditsPenalized: 0,
        wardenSignalDetected: false,
      },
    });
    const snapshot = store.getSnapshot();
    expect(snapshot.base.intelFacts).toHaveLength(1);
    expect(snapshot.base.intelFacts[0]!.subjectId).toBe(mission.targetCountryId);
  });
});
