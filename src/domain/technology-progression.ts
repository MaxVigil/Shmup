import type { AlienTechnologyDefinition } from '../content/model';
import type { GameState } from './model';

export function researchTechnology(
  state: GameState,
  technology: AlienTechnologyDefinition,
  requirements: {
    readonly buildingId: string;
    readonly staffRoleId: string;
    readonly containmentBuildingId: string;
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
      ownedPrimaryWeaponIds: state.base.ownedPrimaryWeaponIds.includes(weaponId)
        ? state.base.ownedPrimaryWeaponIds
        : [...state.base.ownedPrimaryWeaponIds, weaponId],
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
