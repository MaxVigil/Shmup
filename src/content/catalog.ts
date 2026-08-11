import type { ContentCatalog } from './model';

export const contentCatalog = {
  weapons: [
    {
      id: 'weapon-pulse-cannon',
      name: 'Pulse Cannon',
      damage: 10,
      shotsPerSecond: 4,
    },
  ],
  alienTechnologies: [
    {
      id: 'alien-prism-unclassified',
      codename: 'Unclassified Prism',
      category: 'offence',
      danger: 3,
      reliability: 2,
      signalGlyphs: '△ ◇ ∴',
      preservationResearch: 10,
      passiveEffect: {
        id: 'effect-prismatic-sheath',
        name: 'Prismatic Sheath',
        armourDamageMultiplier: 0.75,
      },
      weaponTransformation: {
        id: 'weapon-split-pulse',
        name: 'Split Pulse',
        projectileCount: 2,
        damageMultiplier: 0.75,
        spread: 9,
      },
    },
  ],
  pilots: [
    {
      id: 'pilot-kestrel',
      callsign: 'Kestrel',
      speedMultiplier: 1,
      damageMultiplier: 1,
    },
  ],
  enemies: [
    {
      id: 'enemy-scout',
      name: 'Scout',
      armour: 10,
      speed: 150,
      contactDamage: 12,
      score: 100,
      movementPattern: 'straight',
      kind: 'regular',
      materialReward: 1,
    },
    {
      id: 'enemy-weaver',
      name: 'Weaver',
      armour: 20,
      speed: 105,
      contactDamage: 18,
      score: 250,
      movementPattern: 'sine',
      kind: 'regular',
      materialReward: 2,
    },
    {
      id: 'enemy-warden',
      name: 'Warden',
      armour: 240,
      speed: 92,
      contactDamage: 35,
      score: 2500,
      movementPattern: 'sine',
      kind: 'elite',
      materialReward: 18,
    },
  ],
} as const satisfies ContentCatalog;
