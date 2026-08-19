import type { MissionState } from '../content/model';
import type { BaseState, MissionOutcomeKind, MissionResultRecord } from './model';

/** Mission lifecycle status (MISSIONS_EPIC §1.1) — derived, never stored. */
export type MissionStatus = 'available' | 'active' | 'resolved' | 'expired';

/** Derives a mission's lifecycle status from the single source of truth. */
export function missionStatus(
  base: BaseState,
  mission: MissionState,
): MissionStatus {
  if (base.activeMissionId === mission.id) {
    return 'active';
  }
  if (
    base.missionResults.some((record) => record.missionId === mission.id) ||
    base.resolvedThreatIds.includes(mission.id)
  ) {
    return 'resolved';
  }
  const stillOnMap = base.threatMap.some((entry) => entry.id === mission.id);
  return stillOnMap ? 'available' : 'expired';
}

export interface OutcomeSource {
  readonly destroyed: boolean;
  /** True when the sortie was aborted via the retreat flow (M6). */
  readonly aborted?: boolean;
  readonly extracted: boolean;
  readonly targetsBreached: number;
}

/**
 * Maps settlement signals to the outcome taxonomy (MISSIONS_EPIC §1.1).
 */
export function deriveMissionOutcome(source: OutcomeSource): MissionOutcomeKind {
  if (source.destroyed) {
    return 'destroyed';
  }
  if (source.aborted === true) {
    return 'aborted';
  }
  if (!source.extracted) {
    return 'objective-failed-extracted';
  }
  return source.targetsBreached > 0 ? 'partial-success' : 'success';
}

/** Appends an immutable mission result record (written once at settlement). */
export function appendMissionResult(
  base: BaseState,
  record: MissionResultRecord,
): BaseState {
  return { ...base, missionResults: [...base.missionResults, record] };
}
