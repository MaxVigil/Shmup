import { describe, expect, it } from 'vitest';
import { createInitialGameState } from '../../src/domain/initial-state';
import {
  clearGame,
  loadGame,
  saveGame,
  type KeyValueStorage,
} from '../../src/persistence/save-repository';

function createMemoryStorage(): KeyValueStorage {
  const values = new Map<string, string>();

  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

describe('save repository', () => {
  it('round-trips a valid game state', () => {
    const storage = createMemoryStorage();
    const state = createInitialGameState();

    saveGame(storage, state);

    expect(loadGame(storage)).toEqual(state);
  });

  it('rejects malformed saves without throwing', () => {
    const storage = createMemoryStorage();
    storage.setItem('shmup.save.v1', '{broken');

    expect(loadGame(storage)).toBeNull();
  });

  it('clears a stored save', () => {
    const storage = createMemoryStorage();
    saveGame(storage, createInitialGameState());

    clearGame(storage);

    expect(loadGame(storage)).toBeNull();
  });
});
