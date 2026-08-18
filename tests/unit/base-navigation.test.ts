import { describe, expect, it } from 'vitest';
import { sectionForObjective } from '../../src/domain/base-navigation';

describe('base information architecture', () => {
  it.each([
    ['build-laboratory', 'engineering'],
    ['hire-scientist', 'research'],
    ['build-workshop', 'engineering'],
    ['recover-artefact', 'hangar'],
    ['start-containment', 'research'],
    ['advance-containment', 'research'],
    ['construct-quarantine', 'engineering'],
    ['analyse-sample', 'research'],
    ['manufacture-adapted-weapon', 'engineering'],
    ['equip-adapted-weapon', 'hangar'],
    ['await-warden-signal', 'hangar'],
  ] as const)('routes %s to %s', (objective, section) => {
    expect(sectionForObjective(objective)).toBe(section);
  });
});
