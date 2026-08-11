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
    },
    {
      id: 'enemy-weaver',
      name: 'Weaver',
      armour: 20,
      speed: 105,
      contactDamage: 18,
      score: 250,
      movementPattern: 'sine',
    },
  ],
} as const satisfies ContentCatalog;
