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
  assertUniqueIds('enemies', catalog.enemies);

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

  for (const technology of catalog.alienTechnologies) {
    const passive = technology.passiveEffect;
    const weapon = technology.weaponTransformation;
    if (
      technology.signalGlyphs.trim().length === 0 ||
      technology.preservationResearch <= 0 ||
      passive.id.trim().length === 0 ||
      passive.name.trim().length === 0 ||
      passive.armourDamageMultiplier <= 0 ||
      passive.armourDamageMultiplier > 1 ||
      weapon.id.trim().length === 0 ||
      weapon.name.trim().length === 0 ||
      !Number.isInteger(weapon.projectileCount) ||
      weapon.projectileCount <= 0 ||
      weapon.damageMultiplier <= 0 ||
      weapon.spread < 0
    ) {
      throw new Error(`Alien technology ${technology.id} has invalid risk/reward values.`);
    }
  }

  for (const enemy of catalog.enemies) {
    if (
      enemy.armour <= 0 ||
      enemy.speed <= 0 ||
      enemy.contactDamage <= 0 ||
      enemy.score <= 0 ||
      enemy.materialReward <= 0
    ) {
      throw new Error(`Enemy ${enemy.id} must have positive combat values.`);
    }
  }
}
