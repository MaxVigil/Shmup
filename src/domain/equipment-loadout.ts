import type { GameState } from './model';

export function equipSpecialEquipment(
  state: GameState,
  equipmentId: string | null,
): GameState {
  if (
    equipmentId !== null &&
    !state.base.manufacturedEquipmentIds.includes(equipmentId)
  ) {
    throw new Error(`Equipment ${equipmentId} has not been manufactured.`);
  }

  return {
    ...state,
    base: {
      ...state.base,
      equippedEquipmentId: equipmentId,
    },
  };
}
