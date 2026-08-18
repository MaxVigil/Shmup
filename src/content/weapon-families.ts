import type { WeaponDefinition, WeaponFamilyDefinition } from './model';
import { weaponFamilyById } from './ids';

/** Legacy `visualProfile` used to render each weapon family's projectiles. */
const VISUAL_PROFILE_BY_FAMILY: Readonly<
  Record<string, WeaponDefinition['visualProfile']>
> = {
  'weapon-autocannon': 'machine-gun',
  'weapon-heavy-autocannon': 'machine-gun',
  'weapon-gatling-gun': 'machine-gun',
  'weapon-scatter-cannon': 'canister-cannon',
  'weapon-railgun': 'impulse-accelerator',
  'weapon-flak-cannon': 'machine-gun',
  'weapon-pulse-laser': 'split-pulse',
  'weapon-plasma-machine-gun': 'machine-gun',
  'weapon-plasma-cannon': 'impulse-accelerator',
  'weapon-disintegration-lance': 'alien-lance',
  'weapon-plasma-orb-projector': 'alien-orb',
  'weapon-singularity-projector': 'alien-singularity',
};

function familyVisualProfile(family: WeaponFamilyDefinition): WeaponDefinition['visualProfile'] {
  return VISUAL_PROFILE_BY_FAMILY[family.id] ?? 'machine-gun';
}

/** Resolves a weapon-family item id — the base family (`weapon-autocannon`) or a
 *  concrete Mark item (`weapon-autocannon-mk-4`) — into the legacy
 *  `WeaponDefinition` shape with the Mark `statOverrides` applied. Returns
 *  `undefined` for ids that belong to no weapon family. */
export function resolveWeaponFamilyItem(id: string): WeaponDefinition | undefined {
  const markMatch = /^(.+)-mk-(\d+)$/.exec(id);
  const familyId = markMatch === null ? id : markMatch[1] ?? id;
  const family = weaponFamilyById(familyId);
  if (family === undefined) {
    return undefined;
  }
  const mark = markMatch === null ? 1 : Number(markMatch[2]);
  if (markMatch !== null && !family.marks.some((entry) => entry.mark === mark)) {
    return undefined;
  }
  const overrides =
    family.marks.find((entry) => entry.mark === mark)?.statOverrides ?? {};
  const base = family.baseStats;
  return {
    id,
    name: family.name.en,
    origin: family.class === 'alien' ? 'alien' : 'earth',
    damage: overrides.damage ?? base.damage,
    shotsPerSecond: overrides.shotsPerSecond ?? base.shotsPerSecond,
    projectileCount: overrides.projectileCount ?? base.projectileCount,
    projectileSpeed: overrides.projectileSpeed ?? base.projectileSpeed,
    spread: overrides.spreadDegrees ?? base.spreadDegrees,
    penetration: base.penetration,
    visualProfile: familyVisualProfile(family),
    marketPrice: null,
  };
}
