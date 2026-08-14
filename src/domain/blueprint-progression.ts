import type { BlueprintDefinition, EquipmentDefinition } from '../content/model';
import type { GameState, ResearchProjectState } from './model';
import { operationsSpeedMultiplier, staffContribution } from './staff-market';

export interface ResearchBlueprint {
  readonly id: string;
  readonly requiredBuildingId: string;
  readonly requiredStaffRoleId: string;
  readonly requiredProgress: number;
  readonly researchCreditCost: number;
}

export function startBlueprintResearch(
  state: GameState,
  blueprint: ResearchBlueprint,
): GameState {
  if (!state.base.constructedBuildingIds.includes(blueprint.requiredBuildingId)) {
    throw new Error(`Building ${blueprint.requiredBuildingId} is required for research.`);
  }
  if (!state.base.staff.some((member) => member.roleId === blueprint.requiredStaffRoleId)) {
    throw new Error(`Staff role ${blueprint.requiredStaffRoleId} is required for research.`);
  }
  if (state.base.unlockedBlueprintIds.includes(blueprint.id)) {
    throw new Error(`Blueprint ${blueprint.id} has already been researched.`);
  }
  if (state.base.researchQueue.some((project) => project.blueprintId === blueprint.id)) {
    throw new Error(`Blueprint ${blueprint.id} is already being researched.`);
  }
  if (state.base.researchQueue.length > 0) {
    throw new Error('One research project can be active at a time.');
  }
  if (state.base.credits < blueprint.researchCreditCost) {
    throw new Error(`Blueprint ${blueprint.id} requires ${blueprint.researchCreditCost} credits.`);
  }

  return {
    ...state,
    base: {
      ...state.base,
      credits: state.base.credits - blueprint.researchCreditCost,
      researchQueue: [
        ...state.base.researchQueue,
        {
          blueprintId: blueprint.id,
          progress: 0,
          requiredProgress: blueprint.requiredProgress,
        },
      ],
    },
  };
}

export function advanceBlueprintResearch(
  state: GameState,
  staffRoleId: string,
): GameState {
  const contribution =
    staffContribution(state.base, staffRoleId) * operationsSpeedMultiplier(state.base);
  if (contribution === 0 || state.base.researchQueue.length === 0) {
    return state;
  }

  const [front, ...rest] = state.base.researchQueue;
  if (front === undefined) {
    return state;
  }
  const progress = Math.min(front.requiredProgress, front.progress + contribution);
  const activeProjects: ResearchProjectState[] = progress >= front.requiredProgress
    ? rest
    : [{ ...front, progress }, ...rest];

  return {
    ...state,
    base: {
      ...state.base,
      researchQueue: activeProjects,
      unlockedBlueprintIds: progress >= front.requiredProgress
        ? [...new Set([...state.base.unlockedBlueprintIds, front.blueprintId])]
        : state.base.unlockedBlueprintIds,
    },
  };
}

export function manufactureEquipment(
  state: GameState,
  blueprint: BlueprintDefinition,
  equipment: EquipmentDefinition,
): GameState {
  if (blueprint.outputEquipmentId !== equipment.id) {
    throw new Error(`Blueprint ${blueprint.id} does not manufacture ${equipment.id}.`);
  }
  if (!state.base.unlockedBlueprintIds.includes(blueprint.id)) {
    throw new Error(`Blueprint ${blueprint.id} has not been researched.`);
  }
  if (!state.base.constructedBuildingIds.includes(equipment.requiredBuildingId)) {
    throw new Error(`Building ${equipment.requiredBuildingId} is required for manufacturing.`);
  }
  if (!state.base.staff.some((member) => member.roleId === equipment.requiredStaffRoleId)) {
    throw new Error(`Staff role ${equipment.requiredStaffRoleId} is required for manufacturing.`);
  }
  if (state.base.manufacturedEquipmentIds.includes(equipment.id)) {
    throw new Error(`Equipment ${equipment.id} has already been manufactured.`);
  }
  if (
    state.base.credits < equipment.creditCost ||
    state.base.materials < equipment.materialCost
  ) {
    throw new Error(`Insufficient resources to manufacture ${equipment.id}.`);
  }

  return {
    ...state,
    base: {
      ...state.base,
      credits: state.base.credits - equipment.creditCost,
      materials: state.base.materials - equipment.materialCost,
      manufacturedEquipmentIds: [...state.base.manufacturedEquipmentIds, equipment.id],
    },
  };
}
