import type { ProgressionObjectiveKind } from './progression-guidance';

/**
 * Top-level base sections (MISSIONS_EPIC §3, design spec v0.2 §3.1). Seven
 * sections appear in the nav; `warehouse` and `databank` are hidden sections
 * reached through access points (warehouse = shared inventory drawer;
 * databank = technical entity reference from Settings/Archive).
 */
export type BaseSection =
  | 'operations'
  | 'hangar'
  | 'research'
  | 'engineering'
  | 'market'
  | 'personnel'
  | 'archive'
  | 'warehouse'
  | 'databank';

/** The seven sections that appear as top-level navigation tabs. */
export const NAV_SECTIONS: readonly BaseSection[] = [
  'operations',
  'hangar',
  'research',
  'engineering',
  'market',
  'personnel',
  'archive',
];

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
