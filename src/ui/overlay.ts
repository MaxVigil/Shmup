/**
 * Minimal, DOM-free overlay stack for the management UI.
 *
 * Replaces the scattered `hidden = true` toggles and the several separate Escape
 * handlers with one push/pop model: the top overlay owns input (Escape pops it),
 * opening a second overlay stacks it above the first, and closing one restores
 * the previous one. The stack is a pure state machine over opaque ids so it stays
 * unit-testable without a DOM; visibility, focus, and aria wiring live in the app
 * shell (`src/ui/app-shell.ts`).
 */

export type OverlayId = string;

export interface OverlayStack {
  /** Ids of the open overlays, bottom-to-top. A defensive copy, never the internal list. */
  readonly order: readonly OverlayId[];
  /** Number of open overlays. */
  readonly size: number;
  /** Id of the active (top) overlay, or null when the stack is empty. */
  readonly topId: OverlayId | null;

  /** Opens an overlay. Pushing an already-open id is a no-op (its position is kept). */
  push(id: OverlayId): void;

  /** Closes the top overlay. Returns true when one was actually closed. */
  pop(): boolean;

  /** Closes a specific overlay wherever it sits. Returns true when it was open. */
  remove(id: OverlayId): boolean;

  /** Closes every overlay. Returns the number of overlays that were open. */
  clear(): number;

  /** True when the overlay is currently open. */
  contains(id: OverlayId): boolean;

  /** Notifies on every structural change (push/pop/remove/clear). */
  subscribe(listener: () => void): () => void;
}

export function createOverlayStack(): OverlayStack {
  let order: OverlayId[] = [];
  const listeners = new Set<() => void>();

  function emit(): void {
    for (const listener of listeners) {
      listener();
    }
  }

  return {
    get order(): readonly OverlayId[] {
      return order.slice();
    },
    get size(): number {
      return order.length;
    },
    get topId(): OverlayId | null {
      const last = order[order.length - 1];
      return last === undefined ? null : last;
    },
    push(id: OverlayId): void {
      if (order.includes(id)) {
        return;
      }
      order = [...order, id];
      emit();
    },
    pop(): boolean {
      if (order.length === 0) {
        return false;
      }
      order = order.slice(0, -1);
      emit();
      return true;
    },
    remove(id: OverlayId): boolean {
      if (!order.includes(id)) {
        return false;
      }
      order = order.filter((entry) => entry !== id);
      emit();
      return true;
    },
    clear(): number {
      const count = order.length;
      if (count > 0) {
        order = [];
        emit();
      }
      return count;
    },
    contains(id: OverlayId): boolean {
      return order.includes(id);
    },
    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
