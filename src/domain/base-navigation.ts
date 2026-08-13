import type { ProgressionObjectiveKind } from './progression-guidance';

export type BaseSection = 'command' | 'research' | 'engineering' | 'hangar';

export function sectionForObjective(kind: ProgressionObjectiveKind): BaseSection {
  switch (kind) {
    case 'start-blueprint':
    case 'advance-blueprint':
    case 'hire-scientist':
    case 'start-containment':
    case 'advance-containment':
    case 'analyse-sample':
      return 'research';
    case 'equip-equipment':
    case 'recover-artefact':
    case 'equip-adapted-weapon':
    case 'await-warden-signal':
      return 'hangar';
    case 'build-laboratory':
    case 'hire-engineer':
    case 'build-workshop':
    case 'manufacture-equipment':
    case 'construct-quarantine':
    case 'manufacture-adapted-weapon':
      return 'engineering';
  }
}
