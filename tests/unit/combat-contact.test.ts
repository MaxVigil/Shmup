import { describe, expect, it } from 'vitest';
import {
  calculateMutualKnockback,
  resolveAircraftContact,
} from '../../src/domain/combat-contact';

describe('aircraft contact resolution', () => {
  it('removes and confirms an ordinary target', () => {
    expect(resolveAircraftContact('regular')).toEqual({
      removeEnemy: true,
      countsAsDestroyed: true,
    });
  });

  it('keeps the Warden active after contact with Kestrel', () => {
    expect(resolveAircraftContact('elite')).toEqual({
      removeEnemy: false,
      countsAsDestroyed: false,
    });
  });

  it.each([
    ['right', { x: 20, y: 0 }, { x: 0, y: 0 }, 1, 0],
    ['left', { x: -20, y: 0 }, { x: 0, y: 0 }, -1, 0],
    ['below', { x: 0, y: 20 }, { x: 0, y: 0 }, 0, 1],
    ['above', { x: 0, y: -20 }, { x: 0, y: 0 }, 0, -1],
  ])('separates both actors when Kestrel approaches from the %s', (
    _direction,
    player,
    enemy,
    expectedX,
    expectedY,
  ) => {
    const knockback = calculateMutualKnockback(player, enemy, 60, 40);

    expect(knockback.player.x).toBeCloseTo(expectedX * 60);
    expect(knockback.player.y).toBeCloseTo(expectedY * 60);
    expect(knockback.enemy.x).toBeCloseTo(expectedX * -40);
    expect(knockback.enemy.y).toBeCloseTo(expectedY * -40);
  });

  it('uses a stable vertical fallback for perfectly centred contact', () => {
    expect(calculateMutualKnockback(
      { x: 10, y: 10 },
      { x: 10, y: 10 },
      60,
      40,
    )).toEqual({
      player: { x: 0, y: 60 },
      enemy: { x: 0, y: -40 },
    });
  });
});
