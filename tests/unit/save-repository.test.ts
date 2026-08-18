import { describe, expect, it } from 'vitest';
import { buildingId } from '../../src/content/ids';
import { SAVE_SCHEMA_VERSION } from '../../src/domain/model';

import { contentCatalog } from '../../src/content/catalog';
import { createInitialGameState } from '../../src/domain/initial-state';
import { createGameStore } from '../../src/app/store';
import {
  clearGame,
  LEGACY_V4_SAVE_KEY,
  LEGACY_V5_SAVE_KEY,
  LEGACY_V6_SAVE_KEY,
  LEGACY_V7_SAVE_KEY,
  LEGACY_V8_SAVE_KEY,
  LEGACY_V9_SAVE_KEY,
  LEGACY_V10_SAVE_KEY,
  LEGACY_V11_SAVE_KEY,
  LEGACY_V12_SAVE_KEY,
  LEGACY_V15_SAVE_KEY,
  LEGACY_V16_SAVE_KEY,
  LEGACY_V17_SAVE_KEY,
  LEGACY_V18_SAVE_KEY,
  LEGACY_V19_SAVE_KEY,
  LEGACY_V1_SAVE_KEY,
  LEGACY_V2_SAVE_KEY,
  LEGACY_V3_SAVE_KEY,
  loadGame,
  SAVE_KEY,
  saveGame,
  type KeyValueStorage,
} from '../../src/persistence/save-repository';

function createMemoryStorage(): KeyValueStorage {
  const values = new Map<string, string>();

  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

describe('save repository', () => {
  it('round-trips a valid game state', () => {
    const storage = createMemoryStorage();
    const state = createInitialGameState();

    saveGame(storage, state);

    expect(loadGame(storage)).toEqual(state);
  });

  it('rejects malformed saves without throwing', () => {
    const storage = createMemoryStorage();
    storage.setItem(SAVE_KEY, '{broken');

    expect(loadGame(storage)).toBeNull();
  });

  it('migrates a valid v1 save to schema v8', () => {
    const storage = createMemoryStorage();
    storage.setItem(LEGACY_V1_SAVE_KEY, JSON.stringify({
      schemaVersion: 1,
      base: {
        materials: 23,
        research: 4,
        energyCapacity: 6,
        allocatedEnergy: 0,
        pilots: [{ id: 'pilot-kestrel', unlocked: true }],
        activePilotId: 'pilot-kestrel',
        researchQueue: [],
      },
      technologyCatalog: [],
      activeRun: null,
    }));

    expect(loadGame(storage)).toMatchObject({
      schemaVersion: SAVE_SCHEMA_VERSION,
      base: {
        credits: contentCatalog.economy.startingCredits,
        materials: 23,
        research: 4,
        preservedTechnologyIds: [],
        ownedPrimaryWeaponIds: [contentCatalog.weapons[0].id],
        equippedPrimaryWeaponIds: [contentCatalog.weapons[0].id, null],
        sortiesCompleted: 0,
        constructedBuildingIds: [buildingId.commandCentre, buildingId.hangar],
        staff: [],
        unlockedBlueprintIds: [],
        locallyProducedWeaponIds: [],
        researchedWeaponUpgradeIds: [],
        manufacturedWeaponUpgradeIds: [],
        manufacturedEquipmentIds: [],
        equippedEquipmentId: null,
      },
    });
  });

  it('migrates v2 technology progress with required legacy infrastructure', () => {
    const storage = createMemoryStorage();
    const technology = contentCatalog.alienTechnologies[0];
    storage.setItem(LEGACY_V2_SAVE_KEY, JSON.stringify({
      schemaVersion: 2,
      base: {
        materials: 31,
        research: 10,
        energyCapacity: 6,
        allocatedEnergy: 0,
        pilots: [{ id: 'pilot-kestrel', unlocked: true }],
        activePilotId: 'pilot-kestrel',
        researchQueue: [],
        preservedTechnologyIds: [],
        unlockedWeaponModuleIds: [technology.weaponTransformation.id],
        equippedWeaponModuleId: technology.weaponTransformation.id,
      },
      technologyCatalog: [{
        technologyId: technology.id,
        revealedProperties: [technology.weaponTransformation.id],
      }],
      activeRun: null,
    }));

    expect(loadGame(storage)).toMatchObject({
      schemaVersion: SAVE_SCHEMA_VERSION,
      base: {
        constructedBuildingIds: [
          buildingId.researchCentre,
          buildingId.commandCentre,
          buildingId.hangar,
        ],
        staff: [{ roleId: contentCatalog.staffRoles[0].id }],
      },
    });
  });

  it('migrates v3 infrastructure and normalizes its research queue', () => {
    const storage = createMemoryStorage();
    storage.setItem(LEGACY_V3_SAVE_KEY, JSON.stringify({
      schemaVersion: 3,
      base: {
        credits: 275_000,
        materials: 12,
        research: 0,
        energyCapacity: 6,
        allocatedEnergy: 0,
        pilots: [{ id: 'pilot-kestrel', unlocked: true }],
        activePilotId: 'pilot-kestrel',
        researchQueue: [{ technologyId: 'legacy-project', progress: 1, requiredProgress: 3 }],
        preservedTechnologyIds: [],
        unlockedWeaponModuleIds: [],
        equippedWeaponModuleId: null,
        constructedBuildingIds: [buildingId.researchCentre],
        staff: [{ id: 'staff-scientist-1', roleId: contentCatalog.staffRoles[0].id }],
      },
      technologyCatalog: [],
      activeRun: null,
    }));

    expect(loadGame(storage)).toMatchObject({
      schemaVersion: SAVE_SCHEMA_VERSION,
      base: {
        credits: 275_000,
        researchQueue: [{ blueprintId: 'legacy-project', progress: 1, requiredProgress: 3 }],
        unlockedBlueprintIds: [],
        manufacturedEquipmentIds: [],
        equippedEquipmentId: null,
      },
    });
  });

  it('migrates manufactured Capturer progress from v4 into an empty loadout slot', () => {
    const storage = createMemoryStorage();
    const initial = createInitialGameState();
    const capturer = { id: 'equipment-alien-technology-capturer' };
    storage.setItem(LEGACY_V4_SAVE_KEY, JSON.stringify({
      ...initial,
      schemaVersion: 4,
      base: {
        ...initial.base,
        unlockedWeaponModuleIds: [],
        equippedWeaponModuleId: null,
        ownedPrimaryWeaponIds: undefined,
        equippedPrimaryWeaponId: undefined,
        marketSeed: undefined,
        sortiesCompleted: undefined,
        manufacturedEquipmentIds: [capturer.id],
        equippedEquipmentId: undefined,
      },
    }));

    expect(loadGame(storage)).toMatchObject({
      schemaVersion: SAVE_SCHEMA_VERSION,
      base: {
        manufacturedEquipmentIds: [capturer.id],
        equippedEquipmentId: null,
      },
    });
  });

  it('migrates v5 weapon modules into the primary-weapon inventory', () => {
    const storage = createMemoryStorage();
    const initial = createInitialGameState();
    const splitPulseId = contentCatalog.alienTechnologies[0].weaponTransformation.id;
    storage.setItem(LEGACY_V5_SAVE_KEY, JSON.stringify({
      ...initial,
      schemaVersion: 5,
      base: {
        ...initial.base,
        ownedPrimaryWeaponIds: undefined,
        equippedPrimaryWeaponId: undefined,
        marketSeed: undefined,
        sortiesCompleted: undefined,
        unlockedWeaponModuleIds: [splitPulseId],
        equippedWeaponModuleId: splitPulseId,
      },
    }));

    expect(loadGame(storage)).toMatchObject({
      schemaVersion: SAVE_SCHEMA_VERSION,
      base: {
        ownedPrimaryWeaponIds: [contentCatalog.weapons[0].id, splitPulseId],
        equippedPrimaryWeaponIds: [splitPulseId, null],
        sortiesCompleted: 0,
      },
    });
  });

  it('migrates a v6 single-weapon loadout into primary slot I', () => {
    const storage = createMemoryStorage();
    const initial = createInitialGameState();
    const acceleratorId = contentCatalog.weapons[1].id;
    storage.setItem(LEGACY_V6_SAVE_KEY, JSON.stringify({
      ...initial,
      schemaVersion: 6,
      base: {
        ...initial.base,
        ownedPrimaryWeaponIds: [contentCatalog.weapons[0].id, acceleratorId],
        equippedPrimaryWeaponIds: undefined,
        equippedPrimaryWeaponId: acceleratorId,
      },
    }));

    expect(loadGame(storage)).toMatchObject({
      schemaVersion: SAVE_SCHEMA_VERSION,
      base: {
        ownedPrimaryWeaponIds: [contentCatalog.weapons[0].id, acceleratorId],
        equippedPrimaryWeaponIds: [acceleratorId, null],
      },
    });
  });

  it('migrates a v7 dual-slot loadout with empty terrestrial-production progress', () => {
    const storage = createMemoryStorage();
    const initial = createInitialGameState();
    const acceleratorId = contentCatalog.weapons[1].id;
    storage.setItem(LEGACY_V7_SAVE_KEY, JSON.stringify({
      ...initial,
      schemaVersion: 7,
      base: {
        ...initial.base,
        ownedPrimaryWeaponIds: [contentCatalog.weapons[0].id, acceleratorId],
        equippedPrimaryWeaponIds: [contentCatalog.weapons[0].id, acceleratorId],
        locallyProducedWeaponIds: undefined,
        researchedWeaponUpgradeIds: undefined,
        manufacturedWeaponUpgradeIds: undefined,
      },
    }));

    expect(loadGame(storage)).toMatchObject({
      schemaVersion: SAVE_SCHEMA_VERSION,
      base: {
        equippedPrimaryWeaponIds: [contentCatalog.weapons[0].id, acceleratorId],
        locallyProducedWeaponIds: [],
        researchedWeaponUpgradeIds: [],
        manufacturedWeaponUpgradeIds: [],
      },
    });
  });

  it('clears a stored save', () => {
    const storage = createMemoryStorage();
    saveGame(storage, createInitialGameState());

    clearGame(storage);

    expect(loadGame(storage)).toBeNull();
  });

  it('migrates a v8 save and records telemetry from Capturer progress', () => {
    const storage = createMemoryStorage();
    const initial = createInitialGameState();
    const v8Base: Record<string, unknown> = { ...initial.base };
    delete v8Base.telemetryRecorded;
    storage.setItem(LEGACY_V8_SAVE_KEY, JSON.stringify({
      ...initial,
      schemaVersion: 8,
      base: {
        ...v8Base,
        unlockedBlueprintIds: ['blueprint-alien-technology-capturer'],
      },
    }));

    const loaded = loadGame(storage);
    expect(loaded?.schemaVersion).toBe(SAVE_SCHEMA_VERSION);
    expect(loaded?.base.telemetryRecorded).toBe(true);
  });

  it('migrates a v8 save without Capturer progress to telemetry false', () => {
    const storage = createMemoryStorage();
    const initial = createInitialGameState();
    const v8Base: Record<string, unknown> = { ...initial.base };
    delete v8Base.telemetryRecorded;
    storage.setItem(LEGACY_V8_SAVE_KEY, JSON.stringify({
      ...initial,
      schemaVersion: 8,
      base: v8Base,
    }));

    expect(loadGame(storage)?.base.telemetryRecorded).toBe(false);
  });

  it('migrates a v9 save and provisions the starting hangar fleet', () => {
    const storage = createMemoryStorage();
    const initial = createInitialGameState();
    const v9Base: Record<string, unknown> = { ...initial.base };
    delete v9Base.hangarSlots;
    delete v9Base.activeAircraftId;
    storage.setItem(LEGACY_V9_SAVE_KEY, JSON.stringify({
      ...initial,
      schemaVersion: 9,
      base: v9Base,
    }));

    const loaded = loadGame(storage);
    expect(loaded?.schemaVersion).toBe(SAVE_SCHEMA_VERSION);
    expect(loaded?.base.hangarSlots).toEqual([
      contentCatalog.aircraft[0].id,
      null,
    ]);
    expect(loaded?.base.activeAircraftId).toBe(contentCatalog.aircraft[0].id);
  });

  it('migrates a v10 save and provisions month one, fuel, and the threat map', () => {
    const storage = createMemoryStorage();
    const initial = createInitialGameState();
    const v10Base: Record<string, unknown> = { ...initial.base };
    delete v10Base.month;
    delete v10Base.fueledAircraftIds;
    delete v10Base.threatMap;
    storage.setItem(LEGACY_V10_SAVE_KEY, JSON.stringify({
      ...initial,
      schemaVersion: 10,
      base: v10Base,
    }));

    const loaded = loadGame(storage);
    expect(loaded?.schemaVersion).toBe(SAVE_SCHEMA_VERSION);
    expect(loaded?.base.month).toBe(1);
    expect(loaded?.base.fueledAircraftIds).toEqual([contentCatalog.aircraft[0].id]);
    expect(loaded?.base.threatMap).toHaveLength(3);
  });

  it('migrates a v11 save and starts without loans', () => {
    const storage = createMemoryStorage();
    const initial = createInitialGameState();
    const v11Base: Record<string, unknown> = { ...initial.base };
    delete v11Base.loans;
    storage.setItem(LEGACY_V11_SAVE_KEY, JSON.stringify({
      ...initial,
      schemaVersion: 11,
      base: v11Base,
    }));

    const loaded = loadGame(storage);
    expect(loaded?.schemaVersion).toBe(SAVE_SCHEMA_VERSION);
    expect(loaded?.base.loans).toEqual([]);
  });

  it('migrates a v12 save into per-aircraft loadouts and a warehouse', () => {
    const storage = createMemoryStorage();
    const initial = createInitialGameState();
    const v12Base: Record<string, unknown> = { ...initial.base };
    delete v12Base.aircraftLoadouts;
    delete v12Base.weaponStock;
    delete v12Base.consumableStock;
    delete v12Base.aircraftModules;
    delete v12Base.aircraftDamage;
    delete v12Base.aircraftRepair;
    delete v12Base.staffCandidates;
    delete v12Base.staffXp;
    storage.setItem(LEGACY_V12_SAVE_KEY, JSON.stringify({
      ...initial,
      schemaVersion: 12,
      base: v12Base,
    }));

    const loaded = loadGame(storage);
    expect(loaded?.schemaVersion).toBe(SAVE_SCHEMA_VERSION);
    expect(loaded?.base.aircraftLoadouts[contentCatalog.aircraft[0].id]).toContain(
      contentCatalog.weapons[0].id,
    );
    expect(loaded?.base.weaponStock[contentCatalog.weapons[0].id]).toBeUndefined();
    expect(loaded?.base.staffCandidates.length).toBeGreaterThan(0);
  });


  it('round-trips a progressed game state built through the store', () => {
    const storage = createMemoryStorage();
    const initial = createInitialGameState();
    const store = createGameStore({
      ...initial,
      base: { ...initial.base, credits: 5_000_000, materials: 100 },
    });
    store.dispatch({ type: 'CONSTRUCT_BUILDING', buildingId: buildingId.researchCentre });
    store.dispatch({ type: 'PURCHASE_AIRCRAFT', aircraftId: contentCatalog.aircraft[1].id });
    const progressed = store.getSnapshot();
    saveGame(storage, progressed);

    const restored = loadGame(storage);
    expect(restored).not.toBeNull();
    expect(restored?.schemaVersion).toBe(progressed.schemaVersion);
    expect(restored?.base.constructedBuildingIds).toEqual(progressed.base.constructedBuildingIds);
    expect(restored?.base.hangarSlots).toEqual(progressed.base.hangarSlots);
    expect(restored?.base.aircraftLoadouts).toEqual(progressed.base.aircraftLoadouts);
    expect(restored?.base.credits).toBe(progressed.base.credits);
  });

  it('migrates a v15 save into the v17 pilot-medical schema', () => {
    const storage = createMemoryStorage();
    const initial = createInitialGameState();
    const v15Base: Record<string, unknown> = { ...initial.base };
    delete v15Base.pilotInjuries;
    delete v15Base.deadPilotIds;
    delete v15Base.pilotDeathMonth;
    storage.setItem(LEGACY_V15_SAVE_KEY, JSON.stringify({
      ...initial,
      schemaVersion: 15,
      base: v15Base,
    }));

    const loaded = loadGame(storage);
    expect(loaded?.schemaVersion).toBe(SAVE_SCHEMA_VERSION);
    expect(loaded?.base.pilotInjuries).toEqual({});
    expect(loaded?.base.deadPilotIds).toEqual([]);
    expect(loaded?.base.pilotDeathMonth).toEqual({});
  });

  it('migrates a v16 save into v17 by resetting the hangar to the starter aircraft', () => {
    const storage = createMemoryStorage();
    const initial = createInitialGameState();
    const starterId = contentCatalog.aircraft[0].id;
    storage.setItem(LEGACY_V16_SAVE_KEY, JSON.stringify({
      ...initial,
      schemaVersion: 16,
      base: {
        ...initial.base,
        hangarSlots: ['aircraft-interceptor', 'aircraft-aegis'],
        activeAircraftId: 'aircraft-aegis',
        aircraftLoadouts: {
          'aircraft-interceptor': [contentCatalog.weapons[0].id, null],
          'aircraft-aegis': [contentCatalog.weapons[1].id, null, null, null],
        },
        unlockedBlueprintIds: [
          'blueprint-aircraft-interceptor',
          'blueprint-safe-containment',
        ],
        researchedAircraftUpgradeIds: ['upgrade-aircraft-interceptor-mk2'],
        manufacturedAircraftUpgradeIds: ['upgrade-aircraft-interceptor-mk3'],
      },
    }));

    const loaded = loadGame(storage);
    expect(loaded?.schemaVersion).toBe(SAVE_SCHEMA_VERSION);
    expect(loaded?.base.hangarSlots).toEqual([starterId, null]);
    expect(loaded?.base.activeAircraftId).toBe(starterId);
    expect(loaded?.base.aircraftLoadouts[starterId]).toEqual([
      contentCatalog.weapons[0].id,
      null,
    ]);
    expect(loaded?.base.unlockedBlueprintIds).not.toContain(
      'blueprint-aircraft-interceptor',
    );
    expect(loaded?.base.unlockedBlueprintIds).toContain('blueprint-safe-containment');
    expect(loaded?.base.researchedAircraftUpgradeIds).toEqual([]);
    expect(loaded?.base.manufacturedAircraftUpgradeIds).toEqual([]);
  });

  it('migrates a v17 save into v19 by renaming IDs and provisioning starting buildings', () => {
    const storage = createMemoryStorage();
    const initial = createInitialGameState();
    storage.setItem(LEGACY_V17_SAVE_KEY, JSON.stringify({
      ...initial,
      schemaVersion: 17,
      base: {
        ...initial.base,
        credits: 1_234_567,
        materials: 42,
        constructedBuildingIds: ['building-laboratory', 'building-workshop'],
        constructionQueue: [
          {
            id: 'construction-building-laboratory',
            buildingId: 'building-laboratory',
            progress: 1,
            requiredProgress: 2,
          },
        ],
      },
    }));

    const loaded = loadGame(storage);
    expect(loaded?.schemaVersion).toBe(SAVE_SCHEMA_VERSION);
    expect(loaded?.base.credits).toBe(1_234_567);
    expect(loaded?.base.materials).toBe(42);
    expect(loaded?.base.constructedBuildingIds).toEqual([
      'building-research-centre',
      'building-production-works',
      buildingId.commandCentre,
      buildingId.hangar,
    ]);
    expect(loaded?.base.constructionQueue).toEqual([
      {
        id: 'construction-building-laboratory',
        buildingId: 'building-research-centre',
        progress: 1,
        requiredProgress: 2,
      },
    ]);
  });

  it('migrates a v18 save into v19 by provisioning the starting buildings', () => {
    const storage = createMemoryStorage();
    const initial = createInitialGameState();
    storage.setItem(LEGACY_V18_SAVE_KEY, JSON.stringify({
      ...initial,
      schemaVersion: 18,
      base: {
        ...initial.base,
        constructedBuildingIds: ['building-research-centre', 'building-production-works'],
        constructionQueue: [],
      },
    }));

    const loaded = loadGame(storage);
    expect(loaded?.schemaVersion).toBe(SAVE_SCHEMA_VERSION);
    expect(loaded?.base.constructedBuildingIds).toEqual([
      'building-research-centre',
      'building-production-works',
      buildingId.commandCentre,
      buildingId.hangar,
    ]);
    expect(loaded?.base.credits).toBe(initial.base.credits);
  });

  it('migrates a v19 save into v20 by seeding the arsenal loadout state', () => {
    const storage = createMemoryStorage();
    const initial = createInitialGameState();
    const { aircraftHardpoints, aircraftMarks, ...baseWithoutArsenal } = initial.base;
    void aircraftHardpoints;
    void aircraftMarks;
    storage.setItem(LEGACY_V19_SAVE_KEY, JSON.stringify({
      ...initial,
      schemaVersion: 19,
      base: baseWithoutArsenal,
    }));

    const loaded = loadGame(storage);
    expect(loaded?.schemaVersion).toBe(SAVE_SCHEMA_VERSION);
    expect(loaded?.base.aircraftHardpoints).toEqual({});
    expect(loaded?.base.aircraftMarks).toEqual({});
    expect(loaded?.base.credits).toBe(initial.base.credits);
  });

  it('does not duplicate starting buildings when a v18 save already has them', () => {
    const storage = createMemoryStorage();
    const initial = createInitialGameState();
    storage.setItem(LEGACY_V18_SAVE_KEY, JSON.stringify({
      ...initial,
      schemaVersion: 18,
      base: {
        ...initial.base,
        constructedBuildingIds: [
          buildingId.commandCentre,
          buildingId.hangar,
          'building-research-centre',
        ],
        constructionQueue: [],
      },
    }));

    const loaded = loadGame(storage);
    expect(loaded?.schemaVersion).toBe(SAVE_SCHEMA_VERSION);
    expect(loaded?.base.constructedBuildingIds).toEqual([
      buildingId.commandCentre,
      buildingId.hangar,
      'building-research-centre',
    ]);
  });
});
