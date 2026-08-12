import type { ProgressionObjectiveKind } from './progression-guidance';

export type BaseSection = 'overview' | 'research' | 'engineering' | 'hangar';

export function sectionForObjective(kind: ProgressionObjectiveKind): BaseSection {
  switch (kind) {
    case 'start-blueprint':
    case 'advance-blueprint':
    case 'hire-scientist':
      return 'research';
    case 'equip-equipment':
    case 'recover-artefact':
      return 'hangar';
    case 'build-laboratory':
    case 'hire-engineer':
    case 'build-workshop':
    case 'manufacture-equipment':
      return 'engineering';
  }
}
