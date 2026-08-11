import { createInitialGameState } from '../domain/initial-state';
import type { GameState, SortieOutcome } from '../domain/model';
import { settleSortie } from '../domain/sortie';

export type GameCommand =
  | { readonly type: 'RESET' }
  | { readonly type: 'SETTLE_SORTIE'; readonly outcome: SortieOutcome };

export type GameStateListener = (state: GameState) => void;

export interface GameStore {
  getSnapshot(): GameState;
  dispatch(command: GameCommand): void;
  subscribe(listener: GameStateListener): () => void;
}

export function createGameStore(initialState = createInitialGameState()): GameStore {
  let state = initialState;
  const listeners = new Set<GameStateListener>();

  function emit(): void {
    for (const listener of listeners) {
      listener(state);
    }
  }

  return {
    getSnapshot(): GameState {
      return state;
    },

    dispatch(command: GameCommand): void {
      switch (command.type) {
        case 'RESET':
          state = createInitialGameState();
          break;
        case 'SETTLE_SORTIE':
          state = {
            ...state,
            base: settleSortie(state.base, command.outcome),
            activeRun: null,
          };
          break;
      }

      emit();
    },

    subscribe(listener: GameStateListener): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
