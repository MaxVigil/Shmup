import { describe, expect, it } from 'vitest';
import { createInitialGameState } from '../../src/domain/initial-state';
import { createGameStore } from '../../src/app/store';

describe('market wishlist (M9)', () => {
  it('toggles an item on and off', () => {
    const store = createGameStore(createInitialGameState());
    store.dispatch({ type: 'TOGGLE_MARKET_WISHLIST', itemId: 'weapon-canister-cannon' });
    expect(store.getSnapshot().base.marketWishlist).toContain('weapon-canister-cannon');
    store.dispatch({ type: 'TOGGLE_MARKET_WISHLIST', itemId: 'weapon-canister-cannon' });
    expect(store.getSnapshot().base.marketWishlist).not.toContain('weapon-canister-cannon');
  });
});
