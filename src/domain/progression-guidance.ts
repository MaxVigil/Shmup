import type { GameState } from './model';

export type ProgressionObjectiveKind =
  | 'build-laboratory'
  | 'hire-scientist'
  | 'hire-engineer'
  | 'start-blueprint'
  | 'advance-blueprint'
  | 'build-workshop'
  | 'manufacture-equipment'
  | 'equip-equipment'
  | 'recover-artefact';

export interface ProgressionDefinitions {
  readonly laboratoryId: string;
  readonly scientistRoleId: string;
  readonly engineerRoleId: string;
  readonly blueprintId: string;
  readonly workshopId: string;
  readonly equipmentId: string;
}

export interface ProgressionObjective {
  readonly kind: ProgressionObjectiveKind;
  readonly progress: number | null;
  readonly requiredProgress: number | null;
}

export function getProgressionObjective(
  state: GameState,
  definitions: ProgressionDefinitions,
): ProgressionObjective {
  if (!state.base.constructedBuildingIds.includes(definitions.laboratoryId)) {
    return { kind: 'build-laboratory', progress: null, requiredProgress: null };
  }
  if (!state.base.staff.some((member) => member.roleId === definitions.scientistRoleId)) {
    return { kind: 'hire-scientist', progress: null, requiredProgress: null };
  }
  if (!state.base.constructedBuildingIds.includes(definitions.workshopId)) {
    return { kind: 'build-workshop', progress: null, requiredProgress: null };
  }
  if (!state.base.unlockedBlueprintIds.includes(definitions.blueprintId)) {
    const project = state.base.researchQueue.find(
      (entry) => entry.blueprintId === definitions.blueprintId,
    );
    return project === undefined
      ? { kind: 'start-blueprint', progress: null, requiredProgress: null }
      : {
          kind: 'advance-blueprint',
          progress: project.progress,
          requiredProgress: project.requiredProgress,
        };
  }
  if (!state.base.manufacturedEquipmentIds.includes(definitions.equipmentId)) {
    if (!state.base.staff.some((member) => member.roleId === definitions.engineerRoleId)) {
      return { kind: 'hire-engineer', progress: null, requiredProgress: null };
    }
    return { kind: 'manufacture-equipment', progress: null, requiredProgress: null };
  }
  if (state.base.equippedEquipmentId !== definitions.equipmentId) {
    return { kind: 'equip-equipment', progress: null, requiredProgress: null };
  }
  return { kind: 'recover-artefact', progress: null, requiredProgress: null };
}
