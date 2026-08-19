import { describe, expect, it } from 'vitest';
import { MISSION_CAPABILITY_DEMANDS } from '../../src/domain/mission-capabilities';

describe('mission capability demands (M10, MISSIONS_EPIC §7.3)', () => {
  it('defines all four wave-1 mission types', () => {
    expect(Object.keys(MISSION_CAPABILITY_DEMANDS).sort()).toEqual([
      'escort',
      'interception',
      'recon',
      'sweep',
    ]);
  });

  it('gives every mission type a distinct primary capability demand', () => {
    const primaries = Object.values(MISSION_CAPABILITY_DEMANDS).map(
      (demand) => demand.primary,
    );
    expect(new Set(primaries).size).toBe(4);
  });
});
