import type { BlueprintDefinition, EquipmentDefinition } from '../content/model';
import type { GameState, ResearchProjectState } from './model';

export function startBlueprintResearch(
  state: GameState,
  blueprint: BlueprintDefinition,
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

  return {
    ...state,
    base: {
      ...state.base,
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
  const contribution = state.base.staff.filter(
    (member) => member.roleId === staffRoleId,
  ).length;
  if (contribution === 0 || state.base.researchQueue.length === 0) {
    return state;
  }

  const completedBlueprintIds: string[] = [];
  const activeProjects: ResearchProjectState[] = [];
  for (const project of state.base.researchQueue) {
    const progress = Math.min(project.requiredProgress, project.progress + contribution);
    if (progress >= project.requiredProgress) {
      completedBlueprintIds.push(project.blueprintId);
    } else {
      activeProjects.push({ ...project, progress });
    }
  }

  return {
    ...state,
    base: {
      ...state.base,
      researchQueue: activeProjects,
      unlockedBlueprintIds: [
        ...new Set([...state.base.unlockedBlueprintIds, ...completedBlueprintIds]),
      ],
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
