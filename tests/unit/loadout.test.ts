import { describe, expect, it } from 'vitest';
import { contentCatalog } from '../../src/content/catalog';
import { weaponItemId } from '../../src/content/ids';
import { validateContentCatalog } from '../../src/content/validate';
import {
  effectiveDamageMultiplier,
  loadoutEnergyDraw,
  loadoutWeight,
  slotConcentrationBonus,
} from '../../src/domain/loadout';

describe('slotConcentrationBonus', () => {
  it('rewards fewer primary slots', () => {
    expect(slotConcentrationBonus(1)).toEqual({
      damageMultiplier: 1.25,
      fireRateMultiplier: 1.2,
      accuracyMultiplier: 1.15,
    });
    expect(slotConcentrationBonus(2)).toEqual({
      damageMultiplier: 1.05,
      fireRateMultiplier: 1.05,
      accuracyMultiplier: 1.05,
    });
    expect(slotConcentrationBonus(3)).toEqual({
      damageMultiplier: 1,
      fireRateMultiplier: 1,
      accuracyMultiplier: 1,
    });
  });
});

describe('effectiveDamageMultiplier', () => {
  const japan = contentCatalog.aircraftLoadouts.find(
    (entry) => entry.aircraftId === 'aircraft-japan',
  );
  const usa = contentCatalog.aircraftLoadouts.find(
    (entry) => entry.aircraftId === 'aircraft-usa',
  );

  it('Japan glass cannon reaches 1.8125 at Mark I and 1.9375 at Mark II', () => {
    expect(japan).toBeDefined();
    expect(usa).toBeDefined();
    expect(effectiveDamageMultiplier(japan!, 1)).toBeCloseTo(1.8125);
    expect(effectiveDamageMultiplier(japan!, 2)).toBeCloseTo(1.9375);
  });

  it('US gunship stays at 1.25 across Marks', () => {
    expect(effectiveDamageMultiplier(usa!, 2)).toBeCloseTo(1.25);
  });
});

describe('loadout weight and energy helpers', () => {
  it('sums installed weight plus ammunition weight', () => {
    const installed = [
      { weight: 3, energyDraw: 1 },
      { weight: 5, energyDraw: 4 },
    ];
    const ammunition = [{ weightPerUnit: 0.06, count: 100 }];
    expect(loadoutWeight(installed, ammunition)).toBeCloseTo(14);
    expect(loadoutEnergyDraw(installed)).toBe(5);
  });
});

describe('weaponItemId', () => {
  it('derives concrete Mark item ids from a family id', () => {
    expect(weaponItemId('weapon-autocannon')).toBe('weapon-autocannon');
    expect(weaponItemId('weapon-autocannon', 1)).toBe('weapon-autocannon');
    expect(weaponItemId('weapon-autocannon', 6)).toBe(
      'weapon-autocannon-mk-6',
    );
  });
});

describe('arsenal catalog', () => {
  it('ships the full first-pass arsenal', () => {
    expect(contentCatalog.weaponFamilies).toHaveLength(12);
    expect(contentCatalog.auxiliary).toHaveLength(8);
    expect(contentCatalog.modules).toHaveLength(6);
    expect(contentCatalog.ammunition).toHaveLength(7);
    expect(contentCatalog.aircraftLoadouts).toHaveLength(7);
    expect(() => validateContentCatalog(contentCatalog)).not.toThrow();
  });

  it('ships the three recovered alien primary weapons in combat-ready legacy form', () => {
    const lance = contentCatalog.weapons.find(
      (weapon) => weapon.id === 'weapon-disintegration-lance',
    )!;
    const orb = contentCatalog.weapons.find(
      (weapon) => weapon.id === 'weapon-plasma-orb-projector',
    )!;
    const singularity = contentCatalog.weapons.find(
      (weapon) => weapon.id === 'weapon-singularity-projector',
    )!;
    expect(lance).toBeDefined();
    expect(lance.penetration).toBe('all-targets');
    expect(lance.visualProfile).toBe('alien-lance');
    expect(lance.origin).toBe('alien');
    expect(orb.visualProfile).toBe('alien-orb');
    expect(singularity.visualProfile).toBe('alien-singularity');
    // Alien weapons are never manufactured or sold: no market price.
    for (const weapon of [lance, orb, singularity]) {
      expect(weapon.marketPrice).toBeNull();
      expect(weapon.damage).toBeGreaterThan(0);
    }
    expect(() => validateContentCatalog(contentCatalog)).not.toThrow();
  });

  it('ships the proximity mine auxiliary with finite ammunition', () => {
    const mine = contentCatalog.auxiliary.find(
      (entry) => entry.id === 'aux-proximity-mine',
    )!;
    const mineAmmo = contentCatalog.ammunition.find(
      (entry) => entry.id === 'consumable-proximity-mine',
    )!;
    expect(mine.type).toBe('mine');
    expect(mine.ammoConsumableId).toBe('consumable-proximity-mine');
    expect(mine.chargesPerSortieMin).toBeGreaterThan(0);
    expect(mine.areaRadius).toBeGreaterThan(0);
    expect(mineAmmo.usedBy).toContain('aux-proximity-mine');
    expect(mineAmmo.weightPerUnit).toBeGreaterThan(0);
    expect(() => validateContentCatalog(contentCatalog)).not.toThrow();
  });

  it('rejects an alien weapon family that has marks', () => {
    const alien = contentCatalog.weaponFamilies.find(
      (family) => family.class === 'alien',
    )!;
    const weaponFamilies = contentCatalog.weaponFamilies.map((family) =>
      family.id === alien.id
        ? {
            ...family,
            marks: [
              {
                mark: 2,
                researchCostCredits: 100_000,
                productionCostCredits: 50_000,
                productionCostMaterials: 5,
                statOverrides: { damage: 200 },
              },
            ],
          }
        : family,
    );
    expect(() =>
      validateContentCatalog({ ...contentCatalog, weaponFamilies }),
    ).toThrow(/violates arsenal invariants/);
  });

  it('rejects non-contiguous weapon marks', () => {
    const weaponFamilies = contentCatalog.weaponFamilies.map((family) =>
      family.id === 'weapon-autocannon'
        ? { ...family, marks: [family.marks[0], family.marks[2]] }
        : family,
    );
    expect(() =>
      validateContentCatalog({ ...contentCatalog, weaponFamilies }),
    ).toThrow(/contiguous/);
  });

  it('rejects an auxiliary that references unknown ammunition', () => {
    const auxiliary = contentCatalog.auxiliary.map((entry) =>
      entry.id === 'aux-rocket-pod'
        ? { ...entry, ammoConsumableId: 'consumable-missing' }
        : entry,
    );
    expect(() =>
      validateContentCatalog({ ...contentCatalog, auxiliary }),
    ).toThrow(/violates arsenal invariants/);
  });

  it('rejects an aircraft loadout with a runaway damage multiplier', () => {
    const aircraftLoadouts = contentCatalog.aircraftLoadouts.map((entry) =>
      entry.aircraftId === 'aircraft-japan'
        ? {
            ...entry,
            baseStats: {
              ...entry.baseStats,
              baseMultipliers: {
                ...entry.baseStats.baseMultipliers,
                damageMultiplier: 1.8,
              },
            },
          }
        : entry,
    );
    expect(() =>
      validateContentCatalog({ ...contentCatalog, aircraftLoadouts }),
    ).toThrow(/2.0 guard/);
  });
});
