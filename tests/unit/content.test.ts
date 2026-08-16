import { describe, expect, it } from 'vitest';
import { contentCatalog } from '../../src/content/catalog';
import type { ContentCatalog } from '../../src/content/model';
import { validateContentCatalog } from '../../src/content/validate';

describe('validateContentCatalog', () => {
  it('accepts the shipped foundation catalogue', () => {
    expect(() => validateContentCatalog(contentCatalog)).not.toThrow();
  });

  it('rejects weapon and aircraft upgrades with zero research time', () => {
    const weaponUpgrades = [
      { ...contentCatalog.weaponUpgrades[0], researchSorties: 0 },
    ];
    expect(() => validateContentCatalog({
      ...contentCatalog,
      weaponUpgrades,
    })).toThrow(/invalid requirements/);

    const aircraftUpgrades = [
      { ...contentCatalog.aircraftUpgrades[0], researchSorties: 0 },
    ];
    expect(() => validateContentCatalog({
      ...contentCatalog,
      aircraftUpgrades,
    })).toThrow(/invalid requirements/);
  });

  it('rejects duplicate identifiers', () => {
    const invalidCatalog: ContentCatalog = {
      ...contentCatalog,
      weapons: [contentCatalog.weapons[0], contentCatalog.weapons[0]],
    };

    expect(() => validateContentCatalog(invalidCatalog)).toThrow(
      'weapons contains duplicate id',
    );
  });

  it('rejects enemies with non-positive combat values', () => {
    const invalidCatalog: ContentCatalog = {
      ...contentCatalog,
      enemies: [{ ...contentCatalog.enemies[0], armour: 0 }],
    };

    expect(() => validateContentCatalog(invalidCatalog)).toThrow(
      'Enemy enemy-scout must have positive combat values',
    );
  });

  it('rejects invalid alien-technology risk and reward values', () => {
    const invalidCatalog: ContentCatalog = {
      ...contentCatalog,
      alienTechnologies: [{
        ...contentCatalog.alienTechnologies[0],
        passiveEffect: {
          ...contentCatalog.alienTechnologies[0].passiveEffect,
          armourDamageMultiplier: 1.5,
        },
      }],
    };

    expect(() => validateContentCatalog(invalidCatalog)).toThrow(
      'Alien technology alien-prism-unclassified has invalid risk/reward values',
    );
  });

  it('rejects invalid base economy and construction costs', () => {
    const invalidEconomy: ContentCatalog = {
      ...contentCatalog,
      economy: { ...contentCatalog.economy, missedEnemyPenaltyMultiplier: 1 },
    };
    const invalidBuilding: ContentCatalog = {
      ...contentCatalog,
      buildings: [{ ...contentCatalog.buildings[0], materialCost: -1 }],
    };

    expect(() => validateContentCatalog(invalidEconomy)).toThrow(
      'Base economy has invalid credit values',
    );
    expect(() => validateContentCatalog(invalidBuilding)).toThrow(
      'has invalid construction costs',
    );
  });

  it('rejects invalid blueprint research requirements', () => {
    const invalidCatalog: ContentCatalog = {
      ...contentCatalog,
      blueprints: [{ ...contentCatalog.blueprints[0], requiredProgress: 0 }],
    };

    expect(() => validateContentCatalog(invalidCatalog)).toThrow(
      'has invalid research requirements',
    );
  });

  it('classifies the Capturer as a terrestrial research programme', () => {
    expect(contentCatalog.blueprints[0].researchDomain).toBe('earth');
  });

  it('defines the Impulse Accelerator as a measured piercing weapon', () => {
    const accelerator = contentCatalog.weapons[1];

    expect(accelerator.shotsPerSecond).toBe(1);
    expect(accelerator.penetration).toBe('all-targets');
    expect(accelerator.damage).toBeGreaterThan(contentCatalog.weapons[0].damage);
  });

  it('defines the M3g.2 blueprint and two perceptible terrestrial upgrades', () => {
    const blueprint = contentCatalog.marketWeaponBlueprints[0];
    const [machineUpgrade, acceleratorUpgrade] = contentCatalog.weaponUpgrades;

    expect(blueprint.minimumSorties).toBe(5);
    expect(blueprint.productionCreditCost).toBeLessThan(
      contentCatalog.weapons[1].marketPrice!.minimum,
    );
    expect(machineUpgrade.damageMultiplier).toBe(2);
    expect(acceleratorUpgrade.cadenceMultiplier).toBe(1.25);
    expect(acceleratorUpgrade.requiredBlueprintId).toBe(blueprint.id);
  });

  it('rejects building blueprints whose output is not a known building', () => {
    const invalidCatalog: ContentCatalog = {
      ...contentCatalog,
      buildingBlueprints: contentCatalog.buildingBlueprints.map((blueprint, index) =>
        index === 0
          ? { ...blueprint, outputBuildingId: 'building-does-not-exist' }
          : blueprint,
      ),
    };

    expect(() => validateContentCatalog(invalidCatalog)).toThrow(
      'Building blueprint blueprint-safe-containment has invalid research requirements',
    );
  });

  it('rejects adapted weapon blueprints whose output is not a known weapon', () => {
    const invalidCatalog: ContentCatalog = {
      ...contentCatalog,
      adaptedWeaponBlueprints: [{
        ...contentCatalog.adaptedWeaponBlueprints[0],
        outputWeaponId: 'weapon-does-not-exist',
      }],
    };

    expect(() => validateContentCatalog(invalidCatalog)).toThrow(
      'Adapted weapon blueprint blueprint-split-pulse-adaptation has invalid production requirements',
    );
  });

  it('balances the Split Pulse Emitter above the upgraded machine gun', () => {
    const emitter = contentCatalog.weapons[2];
    const machineUpgrade = contentCatalog.weaponUpgrades[0];
    const emitterDps =
      emitter.damage * emitter.projectileCount * emitter.shotsPerSecond;
    const upgradedGunDps =
      contentCatalog.weapons[0].damage *
      machineUpgrade.damageMultiplier *
      contentCatalog.weapons[0].shotsPerSecond;

    expect(emitter.shotsPerSecond).toBe(6);
    expect(emitterDps).toBeGreaterThan(upgradedGunDps);
  });

  it('keeps the Canister Cannon competitive at point-blank range', () => {
    const canister = contentCatalog.weapons[3];
    const canisterDps =
      canister.damage * canister.projectileCount * canister.shotsPerSecond;

    expect(canister.damage).toBe(7);
    expect(canister.shotsPerSecond).toBe(1.8);
    expect(canisterDps).toBeGreaterThan(70);
  });

  it('defines the Gunship as a ranged regular enemy', () => {
    const gunship = contentCatalog.enemies.find(
      (enemy) => enemy.kind === 'regular' && enemy.ranged !== null,
    );

    expect(gunship?.ranged).toBeDefined();
    expect(gunship?.ranged?.shotDamage).toBeGreaterThan(0);
    expect(gunship?.ranged?.shotSpeed).toBeGreaterThan(0);
    expect(gunship?.ranged?.shotIntervalMs).toBeGreaterThan(0);
  });

  it('gives the Warden a fast but fair ranged profile', () => {
    const warden = contentCatalog.enemies.find((enemy) => enemy.kind === 'elite');
    const gunship = contentCatalog.enemies.find((enemy) => enemy.id === 'enemy-gunship');

    expect(warden?.ranged).toBeDefined();
    expect(warden?.ranged?.shotDamage).toBeLessThanOrEqual(gunship?.ranged?.shotDamage ?? 0);
    expect(warden?.ranged?.shotSpeed).toBeLessThanOrEqual(gunship?.ranged?.shotSpeed ?? 0);
    // The Warden fires about three times more often than the Gunship.
    expect(warden?.ranged?.shotIntervalMs).toBeLessThanOrEqual(
      (gunship?.ranged?.shotIntervalMs ?? 0) / 2,
    );
  });

  it('balances the aircraft fleet across armour, speed, and damage', () => {
    const india = contentCatalog.aircraft[0];
    const britain = contentCatalog.aircraft[1];
    const prc = contentCatalog.aircraft[2];
    const usa = contentCatalog.aircraft[4];
    const japan = contentCatalog.aircraft[6];

    expect(contentCatalog.aircraft).toHaveLength(7);
    expect(india.marketPrice).not.toBeNull();

    expect(britain.armour).toBeGreaterThan(india.armour);
    expect(britain.speedMultiplier).toBeLessThan(india.speedMultiplier);
    expect(britain.damageMultiplier).toBeGreaterThan(india.damageMultiplier);

    expect(usa.armour).toBeGreaterThan(britain.armour);
    expect(usa.speedMultiplier).toBeLessThan(britain.speedMultiplier);
    expect(usa.damageMultiplier).toBeGreaterThan(britain.damageMultiplier);

    expect(usa.marketPrice?.minimum).toBeGreaterThan(
      britain.marketPrice?.minimum ?? 0,
    );

    expect(prc.speedMultiplier).toBeGreaterThan(india.speedMultiplier);
    expect(prc.armour).toBeGreaterThan(india.armour);
    expect(japan.damageMultiplier).toBeGreaterThan(britain.damageMultiplier);
    expect(japan.weaponSlotCount).toBe(1);
  });

  it('gives every aircraft independent fire-rate and projectile-speed multipliers', () => {
    for (const aircraft of contentCatalog.aircraft) {
      expect(aircraft.fireRateMultiplier).toBeGreaterThan(0);
      expect(aircraft.fireRateMultiplier).toBeLessThanOrEqual(3);
      expect(aircraft.projectileSpeedMultiplier).toBeGreaterThan(0);
      expect(aircraft.projectileSpeedMultiplier).toBeLessThanOrEqual(2);
    }
    // The multipliers are used across the fleet, not just defaults of 1.
    const fireRates = new Set(
      contentCatalog.aircraft.map((aircraft) => aircraft.fireRateMultiplier),
    );
    const projectileSpeeds = new Set(
      contentCatalog.aircraft.map((aircraft) => aircraft.projectileSpeedMultiplier),
    );
    expect(fireRates.size).toBeGreaterThan(1);
    expect(projectileSpeeds.size).toBeGreaterThan(1);
  });

  it('scales refuel cost with aircraft weight and lists the Council states', () => {
    const india = contentCatalog.aircraft[0];
    const britain = contentCatalog.aircraft[1];
    const usa = contentCatalog.aircraft[4];

    expect(britain.refuelCreditCost).toBeGreaterThan(india.refuelCreditCost);
    expect(usa.refuelCreditCost).toBeGreaterThan(britain.refuelCreditCost);

    const ids = contentCatalog.councilStates.map((state) => state.id);
    expect(ids).toContain('council-prc');
    expect(ids).toContain('council-ukraine');
    for (const state of contentCatalog.councilStates) {
      expect(state.nameKey).toMatch(/^country\./);
    }
  });

  it('gives every aircraft a distinct visual silhouette', () => {
    const aircraft = contentCatalog.aircraft;
    const hullColors = new Set(aircraft.map((entry) => entry.visual.hullColor));
    const silhouettes = new Set(
      aircraft.map((entry) => entry.visual.silhouette.join(';')),
    );

    expect(hullColors.size).toBe(aircraft.length);
    expect(silhouettes.size).toBe(aircraft.length);
    for (const entry of aircraft) {
      expect(entry.visual.silhouette.length).toBeGreaterThanOrEqual(6);
      expect(entry.visual.silhouette.length % 2).toBe(0);
    }
  });
});

describe('rocket consumable definition', () => {
  it('defines a positive integer charge count for the hardpoint consumable', () => {
    const rockets = contentCatalog.consumables[0];
    expect(rockets.chargesPerSortie).toBeGreaterThan(0);
    expect(Number.isInteger(rockets.chargesPerSortie)).toBe(true);
  });

  it('rejects a non-positive charge count during validation', () => {
    const badCatalog = {
      ...contentCatalog,
      consumables: [
        {
          ...contentCatalog.consumables[0],
          chargesPerSortie: 0,
        },
      ],
    } as unknown as ContentCatalog;
    expect(() => validateContentCatalog(badCatalog)).toThrow();
  });
});

