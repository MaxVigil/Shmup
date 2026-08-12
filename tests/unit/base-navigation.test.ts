import { describe, expect, it } from 'vitest';
import { sectionForObjective } from '../../src/domain/base-navigation';

describe('base information architecture', () => {
  it.each([
    ['build-laboratory', 'engineering'],
    ['hire-scientist', 'research'],
    ['hire-engineer', 'engineering'],
    ['start-blueprint', 'research'],
    ['advance-blueprint', 'research'],
    ['build-workshop', 'engineering'],
    ['manufacture-equipment', 'engineering'],
    ['equip-equipment', 'hangar'],
    ['recover-artefact', 'hangar'],
  ] as const)('routes %s to %s', (objective, section) => {
    expect(sectionForObjective(objective)).toBe(section);
  });
});
