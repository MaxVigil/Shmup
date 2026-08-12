import { describe, expect, it } from 'vitest';
import {
  EMPTY_PAUSE_STATE,
  isPaused,
  setPauseReason,
} from '../../src/domain/pause-state';

describe('pause reasons', () => {
  it('remains paused until every independent reason is removed', () => {
    const manual = setPauseReason(EMPTY_PAUSE_STATE, 'manual', true);
    const withSettings = setPauseReason(manual, 'settings', true);
    const settingsClosed = setPauseReason(withSettings, 'settings', false);

    expect(isPaused(withSettings)).toBe(true);
    expect(isPaused(settingsClosed)).toBe(true);
    expect(isPaused(setPauseReason(settingsClosed, 'manual', false))).toBe(false);
  });

  it('is idempotent for an unchanged reason', () => {
    const manual = setPauseReason(EMPTY_PAUSE_STATE, 'manual', true);
    expect(setPauseReason(manual, 'manual', true)).toBe(manual);
  });
});
