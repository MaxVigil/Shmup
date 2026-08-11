import { isGameState } from '../domain/guards';
import type { GameState } from '../domain/model';

export const SAVE_KEY = 'shmup.save.v1';

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function loadGame(storage: KeyValueStorage): GameState | null {
  const rawSave = storage.getItem(SAVE_KEY);

  if (rawSave === null) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(rawSave);
    return isGameState(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveGame(storage: KeyValueStorage, state: GameState): void {
  storage.setItem(SAVE_KEY, JSON.stringify(state));
}

export function clearGame(storage: KeyValueStorage): void {
  storage.removeItem(SAVE_KEY);
}
