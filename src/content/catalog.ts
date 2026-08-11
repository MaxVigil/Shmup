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
} as const satisfies ContentCatalog;
