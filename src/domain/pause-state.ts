export type PauseReason = 'manual' | 'settings';

export interface PauseState {
  readonly reasons: readonly PauseReason[];
}

export const EMPTY_PAUSE_STATE: PauseState = { reasons: [] };

export function setPauseReason(
  state: PauseState,
  reason: PauseReason,
  active: boolean,
): PauseState {
  const hasReason = state.reasons.includes(reason);
  if (active === hasReason) {
    return state;
  }
  return {
    reasons: active
      ? [...state.reasons, reason]
      : state.reasons.filter((entry) => entry !== reason),
  };
}

export function isPaused(state: PauseState): boolean {
  return state.reasons.length > 0;
}
