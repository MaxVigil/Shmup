import type { BuildingDefinition, StaffRoleDefinition } from '../content/model';
import type { GameState } from './model';

export function constructBuilding(
  state: GameState,
  building: BuildingDefinition,
): GameState {
  if (state.base.constructedBuildingIds.includes(building.id)) {
    throw new Error(`Building ${building.id} has already been constructed.`);
  }
  if (
    building.requiredBlueprintId !== null &&
    !state.base.unlockedBlueprintIds.includes(building.requiredBlueprintId)
  ) {
    throw new Error(`Blueprint ${building.requiredBlueprintId} is required for ${building.id}.`);
  }
  if (
    building.requiredBuildingId !== null &&
    !state.base.constructedBuildingIds.includes(building.requiredBuildingId)
  ) {
    throw new Error(`Building ${building.requiredBuildingId} is required for ${building.id}.`);
  }
  if (
    state.base.credits < building.creditCost ||
    state.base.materials < building.materialCost
  ) {
    throw new Error(`Insufficient resources to construct ${building.id}.`);
  }

  return {
    ...state,
    base: {
      ...state.base,
      credits: state.base.credits - building.creditCost,
      materials: state.base.materials - building.materialCost,
      constructedBuildingIds: [...state.base.constructedBuildingIds, building.id],
    },
  };
}

export function hireStaff(
  state: GameState,
  role: StaffRoleDefinition,
): GameState {
  if (!state.base.constructedBuildingIds.includes(role.requiredBuildingId)) {
    throw new Error(`Building ${role.requiredBuildingId} is required to hire ${role.id}.`);
  }
  if (state.base.credits < role.creditCost) {
    throw new Error(`Insufficient credits to hire ${role.id}.`);
  }

  const currentHeadcount = state.base.staff.filter(
    (member) => member.roleId === role.id,
  ).length;
  if (role.maximumHeadcount !== null && currentHeadcount >= role.maximumHeadcount) {
    throw new Error(`Staff role ${role.id} has reached its current headcount limit.`);
  }
  const nextIndex = currentHeadcount + 1;
  return {
    ...state,
    base: {
      ...state.base,
      credits: state.base.credits - role.creditCost,
      staff: [
        ...state.base.staff,
        { id: `${role.id}-${nextIndex}`, roleId: role.id },
      ],
    },
  };
}
