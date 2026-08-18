import type { ProgressionObjectiveKind } from './progression-guidance';

export type BaseSection =
  | 'command'
  | 'research'
  | 'engineering'
  | 'hangar'
  | 'trade'
  | 'finance'
  | 'staff'
  | 'medical'
  | 'warehouse'
  | 'databank';

export function sectionForObjective(kind: ProgressionObjectiveKind): BaseSection {
  switch (kind) {
    case 'hire-scientist':
    case 'start-containment':
    case 'advance-containment':
    case 'analyse-sample':
      return 'research';
    case 'recover-artefact':
    case 'equip-adapted-weapon':
    case 'await-warden-signal':
      return 'hangar';
    case 'build-laboratory':
    case 'build-workshop':
    case 'construct-quarantine':
    case 'manufacture-adapted-weapon':
      return 'engineering';
  }
}
