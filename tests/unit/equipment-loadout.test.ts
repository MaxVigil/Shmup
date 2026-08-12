import { describe, expect, it } from 'vitest';
import { contentCatalog } from '../../src/content/catalog';
import { equipSpecialEquipment } from '../../src/domain/equipment-loadout';
import { createInitialGameState } from '../../src/domain/initial-state';

const capturerId = contentCatalog.equipment[0].id;

describe('special-equipment loadout', () => {
  it('equips and removes manufactured equipment', () => {
    const initial = createInitialGameState();
    const manufactured = {
      ...initial,
      base: {
        ...initial.base,
        manufacturedEquipmentIds: [capturerId],
      },
    };

    const equipped = equipSpecialEquipment(manufactured, capturerId);
    expect(equipped.base.equippedEquipmentId).toBe(capturerId);
    expect(equipSpecialEquipment(equipped, null).base.equippedEquipmentId).toBeNull();
  });

  it('rejects equipment that has not been manufactured', () => {
    expect(() => equipSpecialEquipment(createInitialGameState(), capturerId)).toThrow(
      'has not been manufactured',
    );
  });
});
