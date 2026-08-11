import type { ContentCatalog } from './model';

function assertUniqueIds(
  groupName: string,
  entries: readonly { readonly id: string }[],
): void {
  const ids = new Set<string>();

  for (const entry of entries) {
    if (entry.id.trim().length === 0) {
      throw new Error(`${groupName} contains an empty id.`);
    }

    if (ids.has(entry.id)) {
      throw new Error(`${groupName} contains duplicate id: ${entry.id}`);
    }

    ids.add(entry.id);
  }
}

export function validateContentCatalog(catalog: ContentCatalog): void {
  assertUniqueIds('weapons', catalog.weapons);
  assertUniqueIds('alienTechnologies', catalog.alienTechnologies);
  assertUniqueIds('pilots', catalog.pilots);

  for (const weapon of catalog.weapons) {
    if (weapon.damage <= 0 || weapon.shotsPerSecond <= 0) {
      throw new Error(`Weapon ${weapon.id} must have positive combat values.`);
    }
  }

  for (const pilot of catalog.pilots) {
    if (pilot.speedMultiplier <= 0 || pilot.damageMultiplier <= 0) {
      throw new Error(`Pilot ${pilot.id} must have positive multipliers.`);
    }
  }
}
