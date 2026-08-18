import { describe, expect, it } from 'vitest';
import { createOverlayStack } from '../../src/ui/overlay';

describe('overlay stack', () => {
  it('starts empty', () => {
    const stack = createOverlayStack();
    expect(stack.size).toBe(0);
    expect(stack.topId).toBeNull();
    expect(stack.order).toEqual([]);
    expect(stack.contains('anything')).toBe(false);
  });

  it('pushes bottom-to-top and reports the top', () => {
    const stack = createOverlayStack();
    stack.push('settings');
    stack.push('design-system');
    expect(stack.order).toEqual(['settings', 'design-system']);
    expect(stack.topId).toBe('design-system');
    expect(stack.size).toBe(2);
    expect(stack.contains('settings')).toBe(true);
    expect(stack.contains('missing')).toBe(false);
  });

  it('ignores duplicate pushes and keeps the original position', () => {
    const stack = createOverlayStack();
    stack.push('a');
    stack.push('a');
    expect(stack.order).toEqual(['a']);
    expect(stack.size).toBe(1);
  });

  it('pops the top and reports success', () => {
    const stack = createOverlayStack();
    expect(stack.pop()).toBe(false);
    stack.push('a');
    stack.push('b');
    expect(stack.pop()).toBe(true);
    expect(stack.order).toEqual(['a']);
    expect(stack.topId).toBe('a');
    expect(stack.pop()).toBe(true);
    expect(stack.order).toEqual([]);
    expect(stack.pop()).toBe(false);
  });

  it('removes a specific overlay wherever it sits', () => {
    const stack = createOverlayStack();
    stack.push('a');
    stack.push('b');
    stack.push('c');
    expect(stack.remove('b')).toBe(true);
    expect(stack.order).toEqual(['a', 'c']);
    expect(stack.topId).toBe('c');
    expect(stack.remove('missing')).toBe(false);
    expect(stack.order).toEqual(['a', 'c']);
  });

  it('clears every overlay and reports the count', () => {
    const stack = createOverlayStack();
    stack.push('a');
    stack.push('b');
    expect(stack.clear()).toBe(2);
    expect(stack.size).toBe(0);
    expect(stack.clear()).toBe(0);
    expect(stack.topId).toBeNull();
  });

  it('notifies subscribers on every change and unsubscribes', () => {
    const stack = createOverlayStack();
    const events: string[] = [];
    const unsubscribe = stack.subscribe(() => events.push(stack.order.join(',')));
    stack.push('a');
    stack.push('b');
    stack.pop();
    stack.remove('a');
    unsubscribe();
    stack.push('c');
    expect(events).toEqual(['a', 'a,b', 'a', '']);
  });

  it('returns a defensive copy so callers cannot mutate the internal order', () => {
    const stack = createOverlayStack();
    stack.push('a');
    const view = stack.order as unknown as string[];
    view.push('b');
    expect(stack.order).toEqual(['a']);
    expect(stack.size).toBe(1);
  });
});
