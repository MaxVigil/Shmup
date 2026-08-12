import type {
  AdaptedWeaponBlueprintDefinition,
  AlienTechnologyDefinition,
  WeaponDefinition,
} from '../content/model';
import type { GameState } from './model';

export function researchTechnology(
  state: GameState,
  technology: AlienTechnologyDefinition,
  requirements: {
    readonly buildingId: string;
    readonly staffRoleId: string;
    readonly containmentBuildingId: string;
    readonly adaptedBlueprintId: string;
  },
): GameState {
  if (!state.base.constructedBuildingIds.includes(requirements.buildingId)) {
    throw new Error(`Building ${requirements.buildingId} is required for research.`);
  }
  if (!state.base.constructedBuildingIds.includes(requirements.containmentBuildingId)) {
    throw new Error(
      `Building ${requirements.containmentBuildingId} is required for quarantine analysis.`,
    );
  }
  if (!state.base.staff.some((member) => member.roleId === requirements.staffRoleId)) {
    throw new Error(`Staff role ${requirements.staffRoleId} is required for research.`);
  }
  if (!state.base.preservedTechnologyIds.includes(technology.id)) {
    throw new Error(`Technology sample ${technology.id} is not available for research.`);
  }

  const weaponId = technology.weaponTransformation.id;
  const existingKnowledge = state.technologyCatalog.find(
    (knowledge) => knowledge.technologyId === technology.id,
  );

  return {
    ...state,
    base: {
      ...state.base,
      research: state.base.research + technology.preservationResearch,
      preservedTechnologyIds: state.base.preservedTechnologyIds.filter(
        (technologyId) => technologyId !== technology.id,
      ),
      unlockedBlueprintIds: state.base.unlockedBlueprintIds.includes(
        requirements.adaptedBlueprintId,
      )
        ? state.base.unlockedBlueprintIds
        : [...state.base.unlockedBlueprintIds, requirements.adaptedBlueprintId],
    },
    technologyCatalog: existingKnowledge === undefined
      ? [
          ...state.technologyCatalog,
          {
            technologyId: technology.id,
            revealedProperties: [weaponId],
          },
        ]
      : state.technologyCatalog,
  };
}

export function equipPrimaryWeapon(
  state: GameState,
  weaponId: string,
  slotIndex: 0 | 1,
): GameState {
  if (!state.base.ownedPrimaryWeaponIds.includes(weaponId)) {
    throw new Error(`Primary weapon ${weaponId} is not owned.`);
  }

  const otherSlotIndex = slotIndex === 0 ? 1 : 0;
  const equippedPrimaryWeaponIds: [string | null, string | null] = [
    state.base.equippedPrimaryWeaponIds[0],
    state.base.equippedPrimaryWeaponIds[1],
  ];
  if (equippedPrimaryWeaponIds[otherSlotIndex] === weaponId) {
    equippedPrimaryWeaponIds[otherSlotIndex] = null;
  }
  equippedPrimaryWeaponIds[slotIndex] = weaponId;

  return {
    ...state,
    base: {
      ...state.base,
      equippedPrimaryWeaponIds,
    },
  };
}

export function manufactureAdaptedWeapon(
  state: GameState,
  blueprint: AdaptedWeaponBlueprintDefinition,
  weapon: WeaponDefinition,
): GameState {
  if (!state.base.unlockedBlueprintIds.includes(blueprint.id)) {
    throw new Error(`Adapted blueprint ${blueprint.id} is required for production.`);
  }
  if (
    !state.base.constructedBuildingIds.includes(blueprint.requiredProductionBuildingId)
  ) {
    throw new Error(
      `Building ${blueprint.requiredProductionBuildingId} is required for production.`,
    );
  }
  if (
    !state.base.staff.some(
      (member) => member.roleId === blueprint.requiredProductionStaffRoleId,
    )
  ) {
    throw new Error(
      `Staff role ${blueprint.requiredProductionStaffRoleId} is required for production.`,
    );
  }
  if (state.base.ownedPrimaryWeaponIds.includes(weapon.id)) {
    throw new Error(`Weapon ${weapon.id} has already been manufactured.`);
  }
  if (
    state.base.credits < blueprint.productionCreditCost ||
    state.base.materials < blueprint.productionMaterialCost
  ) {
    throw new Error(`Insufficient resources to manufacture ${weapon.id}.`);
  }

  return {
    ...state,
    base: {
      ...state.base,
      credits: state.base.credits - blueprint.productionCreditCost,
      materials: state.base.materials - blueprint.productionMaterialCost,
      ownedPrimaryWeaponIds: [...state.base.ownedPrimaryWeaponIds, weapon.id],
    },
  };
}
