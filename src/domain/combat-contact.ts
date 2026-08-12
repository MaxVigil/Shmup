export interface AircraftContactResolution {
  readonly removeEnemy: boolean;
  readonly countsAsDestroyed: boolean;
}

export interface ContactPoint {
  readonly x: number;
  readonly y: number;
}

export interface MutualKnockback {
  readonly player: ContactPoint;
  readonly enemy: ContactPoint;
}

export function resolveAircraftContact(
  enemyKind: 'regular' | 'elite',
): AircraftContactResolution {
  return enemyKind === 'elite'
    ? { removeEnemy: false, countsAsDestroyed: false }
    : { removeEnemy: true, countsAsDestroyed: true };
}

export function calculateMutualKnockback(
  player: ContactPoint,
  enemy: ContactPoint,
  playerDistance: number,
  enemyDistance: number,
): MutualKnockback {
  if (playerDistance <= 0 || enemyDistance <= 0) {
    throw new RangeError('Knockback distances must be positive.');
  }

  let x = player.x - enemy.x;
  let y = player.y - enemy.y;
  const length = Math.hypot(x, y);
  if (length < 0.001) {
    x = 0;
    y = 1;
  } else {
    x /= length;
    y /= length;
  }

  return {
    player: {
      x: x === 0 ? 0 : x * playerDistance,
      y: y === 0 ? 0 : y * playerDistance,
    },
    enemy: {
      x: x === 0 ? 0 : -x * enemyDistance,
      y: y === 0 ? 0 : -y * enemyDistance,
    },
  };
}
