import { describe, expect, it } from 'vitest';
import { contentCatalog } from '../../src/content/catalog';
import { createInitialGameState } from '../../src/domain/initial-state';
import {
  marketWeaponPrice,
  purchaseMarketWeapon,
} from '../../src/domain/terrestrial-market';

const accelerator = contentCatalog.weapons[1];

describe('terrestrial market', () => {
  it('keeps a quote deterministic within a completed-sortie cycle', () => {
    const state = createInitialGameState();
    const first = marketWeaponPrice(accelerator, state.base.marketSeed, 0);
    const repeated = marketWeaponPrice(accelerator, state.base.marketSeed, 0);

    expect(first).toBe(repeated);
    expect(first).toBeGreaterThanOrEqual(accelerator.marketPrice!.minimum);
    expect(first).toBeLessThanOrEqual(accelerator.marketPrice!.maximum);
  });

  it('refreshes the deterministic quote after a completed sortie', () => {
    const state = createInitialGameState();
    expect(marketWeaponPrice(accelerator, state.base.marketSeed, 0)).not.toBe(
      marketWeaponPrice(accelerator, state.base.marketSeed, 1),
    );
  });

  it('purchases a finished weapon at the current quote without equipping it', () => {
    const initial = createInitialGameState();
    const price = marketWeaponPrice(accelerator, initial.base.marketSeed, 1);
    const ready = {
      ...initial,
      base: { ...initial.base, credits: price, sortiesCompleted: 1 },
    };
    const purchased = purchaseMarketWeapon(ready, accelerator);

    expect(purchased.base.credits).toBe(0);
    expect(purchased.base.ownedPrimaryWeaponIds).toContain(accelerator.id);
    expect(purchased.base.equippedPrimaryWeaponIds).toEqual([
      contentCatalog.weapons[0].id,
      null,
    ]);
  });

  it('rejects insufficient funds, duplicate purchases, and non-market weapons', () => {
    const initial = createInitialGameState();
    expect(() => purchaseMarketWeapon(initial, accelerator)).toThrow('requires');

    const price = marketWeaponPrice(accelerator, initial.base.marketSeed, 0);
    const ready = { ...initial, base: { ...initial.base, credits: price } };
    const purchased = purchaseMarketWeapon(ready, accelerator);
    const repurchaseReady = {
      ...purchased,
      base: { ...purchased.base, credits: price },
    };
    const repurchased = purchaseMarketWeapon(repurchaseReady, accelerator);
    expect(repurchased.base.weaponStock[accelerator.id]).toBe(2);
    expect(() => purchaseMarketWeapon(ready, contentCatalog.weapons[0])).toThrow(
      'not available',
    );
  });
});
