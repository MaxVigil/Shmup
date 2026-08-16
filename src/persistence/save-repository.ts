import { contentCatalog } from '../content/catalog';
import { generateThreatMap } from '../domain/command-centre';
import { generateStaffCandidates } from '../domain/staff-market';
import { isGameState } from '../domain/guards';
import type { BaseState, GameState } from '../domain/model';

export const SAVE_KEY = 'shmup.save.v17';
export const LEGACY_V16_SAVE_KEY = 'shmup.save.v16';
export const LEGACY_V15_SAVE_KEY = 'shmup.save.v15';
export const LEGACY_V14_SAVE_KEY = 'shmup.save.v14';
export const LEGACY_V13_SAVE_KEY = 'shmup.save.v13';
export const LEGACY_V12_SAVE_KEY = 'shmup.save.v12';
export const LEGACY_V11_SAVE_KEY = 'shmup.save.v11';
export const LEGACY_V10_SAVE_KEY = 'shmup.save.v10';
export const LEGACY_V9_SAVE_KEY = 'shmup.save.v9';
export const LEGACY_V8_SAVE_KEY = 'shmup.save.v8';
export const LEGACY_V7_SAVE_KEY = 'shmup.save.v7';
export const LEGACY_V6_SAVE_KEY = 'shmup.save.v6';
export const LEGACY_V5_SAVE_KEY = 'shmup.save.v5';
export const LEGACY_V4_SAVE_KEY = 'shmup.save.v4';
export const LEGACY_V3_SAVE_KEY = 'shmup.save.v3';
export const LEGACY_V2_SAVE_KEY = 'shmup.save.v2';
export const LEGACY_V1_SAVE_KEY = 'shmup.save.v1';

const DEFAULT_MARKET_SEED = 0x3a7e2026;
const STARTING_AIRCRAFT_ID = contentCatalog.aircraft[0].id;

function startingThreatMap(marketSeed: number): GameState['base']['threatMap'] {
  return generateThreatMap(contentCatalog.councilStates, marketSeed, 1);
}

function startingFueledAircraftIds(
  slots: readonly (string | null)[],
): readonly string[] {
  return slots.filter((id): id is string => id !== null);
}

function migratedStaff(staff: readonly unknown[]): BaseState['staff'] {
  return staff.map((member, index) => {
    const record = (member ?? {}) as Record<string, unknown>;
    const roleId = typeof record.roleId === 'string'
      ? record.roleId
      : contentCatalog.staffRoles[0].id;
    const id = typeof record.id === 'string'
      ? record.id
      : `staff-migrated-${index + 1}`;
    return {
      id,
      roleId,
      firstName: 'Specialist',
      lastName: 'Directorate',
      tier: 1,
      progressMultiplier: 1,
      salaryMultiplier: 1,
    };
  });
}

function v13FleetFields(options: {
  readonly marketSeed: number;
  readonly aircraftIds: readonly string[];
  readonly activeAircraftId: string;
  readonly equippedLoadout: readonly (string | null)[];
  readonly equippedModule: string | null;
  readonly ownedWeapons: readonly string[];
}): Pick<
  BaseState,
  | 'aircraftLoadouts'
  | 'weaponStock'
  | 'consumableStock'
  | 'aircraftModules'
  | 'aircraftDamage'
  | 'aircraftRepair'
  | 'staffCandidates'
  | 'staffXp'
> {
  const loadouts: Record<string, (string | null)[]> = {};
  const equippedLoadout = Array.isArray(options.equippedLoadout)
    ? options.equippedLoadout
    : [];
  for (const aircraftId of options.aircraftIds) {
    const definition = contentCatalog.aircraft.find((entry) => entry.id === aircraftId);
    const count = definition?.weaponSlotCount ?? 2;
    const loadout: (string | null)[] = [];
    for (let index = 0; index < count; index += 1) {
      loadout.push(
        aircraftId === options.activeAircraftId
          ? (equippedLoadout[index] ?? null)
          : null,
      );
    }
    loadouts[aircraftId] = loadout;
  }
  if (options.aircraftIds.length === 0) {
    loadouts[contentCatalog.aircraft[0].id] = Array.from(
      { length: contentCatalog.aircraft[0].weaponSlotCount },
      () => null,
    );
  }
  const installed = new Set<string>();
  for (const loadout of Object.values(loadouts)) {
    for (const id of loadout) {
      if (id !== null) {
        installed.add(id);
      }
    }
  }
  const stock: Record<string, number> = {};
  for (const weaponId of options.ownedWeapons) {
    if (!installed.has(weaponId)) {
      stock[weaponId] = 1;
    }
  }
  const modules: Record<string, string | null> = {};
  for (const aircraftId of Object.keys(loadouts)) {
    modules[aircraftId] = aircraftId === options.activeAircraftId
      ? options.equippedModule
      : null;
  }
  return {
    aircraftLoadouts: loadouts,
    weaponStock: stock,
    consumableStock: {},
    aircraftModules: modules,
    aircraftDamage: {},
    aircraftRepair: {},
    staffCandidates: generateStaffCandidates(
      contentCatalog.staffRoles,
      options.marketSeed,
      1,
    ),
    staffXp: {},
  };
}

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function v14BaseDefaults(): Pick<
  BaseState,
  | 'constructionQueue'
  | 'productionQueue'
  | 'resolvedThreatIds'
  | 'pilotCandidates'
  | 'pilotXp'
  | 'pilotFatigue'
  | 'pilotInjuries'
  | 'deadPilotIds'
  | 'pilotDeathMonth'
  | 'activeMissionId'
  | 'monthIncome'
  | 'monthReport'
  | 'nationThanks'
  | 'researchedAircraftUpgradeIds'
  | 'manufacturedAircraftUpgradeIds'
> {
  return {
    constructionQueue: [],
    productionQueue: [],
    resolvedThreatIds: [],
    pilotCandidates: [],
    pilotXp: {},
    pilotFatigue: {},
    pilotInjuries: {},
    deadPilotIds: [],
    pilotDeathMonth: {},
    activeMissionId: null,
    monthIncome: 0,
    monthReport: null,
    nationThanks: {},
    researchedAircraftUpgradeIds: [],
    manufacturedAircraftUpgradeIds: [],
  };
}

export function loadGame(storage: KeyValueStorage): GameState | null {
  const currentSave = parseGameState(storage.getItem(SAVE_KEY));
  if (currentSave !== null) {
    return currentSave;
  }

  const migrations: readonly [string, (raw: string | null) => GameState | null][] = [
    [LEGACY_V16_SAVE_KEY, migrateV16Save],
    [LEGACY_V15_SAVE_KEY, migrateV15Save],
    [LEGACY_V14_SAVE_KEY, migrateV14Save],
    [LEGACY_V13_SAVE_KEY, migrateV13Save],
    [LEGACY_V12_SAVE_KEY, migrateV12Save],
    [LEGACY_V11_SAVE_KEY, migrateV11Save],
    [LEGACY_V10_SAVE_KEY, migrateV10Save],
    [LEGACY_V9_SAVE_KEY, migrateV9Save],
    [LEGACY_V8_SAVE_KEY, migrateV8Save],
    [LEGACY_V7_SAVE_KEY, migrateV7Save],
    [LEGACY_V6_SAVE_KEY, migrateV6Save],
    [LEGACY_V5_SAVE_KEY, migrateV5Save],
    [LEGACY_V4_SAVE_KEY, migrateV4Save],
    [LEGACY_V3_SAVE_KEY, migrateV3Save],
    [LEGACY_V2_SAVE_KEY, migrateV2Save],
    [LEGACY_V1_SAVE_KEY, migrateV1Save],
  ];
  for (const [key, migrate] of migrations) {
    const migrated = migrate(storage.getItem(key));
    if (migrated !== null) {
      return migrated;
    }
  }
  return null;
}

function parseGameState(rawSave: string | null): GameState | null {
  if (rawSave === null) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(rawSave);
    return isGameState(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

interface LegacyBaseFields {
  readonly materials: number;
  readonly research: number;
  readonly energyCapacity: number;
  readonly allocatedEnergy: number;
  readonly activePilotId: string;
  readonly pilots: readonly unknown[];
  readonly researchQueue: readonly unknown[];
}

function hasLegacyBase(
  base: Record<string, unknown>,
): base is Record<string, unknown> & LegacyBaseFields {
  return (
    typeof base.materials === 'number' &&
    typeof base.research === 'number' &&
    typeof base.energyCapacity === 'number' &&
    typeof base.allocatedEnergy === 'number' &&
    typeof base.activePilotId === 'string' &&
    Array.isArray(base.pilots) &&
    Array.isArray(base.researchQueue)
  );
}

function hasLegacyWeapons(base: Record<string, unknown>): boolean {
  return (
    Array.isArray(base.unlockedWeaponModuleIds) &&
    (base.equippedWeaponModuleId === null ||
      typeof base.equippedWeaponModuleId === 'string')
  );
}

function primaryWeaponFields(base: Record<string, unknown>): Pick<
  BaseState,
  'ownedPrimaryWeaponIds' | 'equippedPrimaryWeaponIds' | 'marketSeed' | 'sortiesCompleted'
> {
  const startingWeaponId = contentCatalog.weapons[0].id;
  const legacyUnlocked = Array.isArray(base.unlockedWeaponModuleIds)
    ? base.unlockedWeaponModuleIds.filter((id): id is string => typeof id === 'string')
    : [];
  const ownedPrimaryWeaponIds = [...new Set([startingWeaponId, ...legacyUnlocked])];
  const legacyEquipped = typeof base.equippedWeaponModuleId === 'string'
    ? base.equippedWeaponModuleId
    : startingWeaponId;
  return {
    ownedPrimaryWeaponIds,
    equippedPrimaryWeaponIds: [
      ownedPrimaryWeaponIds.includes(legacyEquipped) ? legacyEquipped : startingWeaponId,
      null,
    ],
    marketSeed: DEFAULT_MARKET_SEED,
    sortiesCompleted: 0,
  };
}

function legacyInfrastructure(hasTechnologyProgress: boolean): Pick<
  BaseState,
  'constructedBuildingIds' | 'staff'
> {
  if (!hasTechnologyProgress) {
    return { constructedBuildingIds: [], staff: [] };
  }
  return {
    constructedBuildingIds: [contentCatalog.buildings[0].id],
    staff: migratedStaff([
      { id: 'staff-scientist-1', roleId: contentCatalog.staffRoles[0].id },
    ]),
  };
}

function normalizeResearchQueue(value: readonly unknown[]): BaseState['researchQueue'] {
  return value.flatMap((entry) => {
    if (
      !isRecord(entry) ||
      typeof entry.progress !== 'number' ||
      typeof entry.requiredProgress !== 'number'
    ) {
      return [];
    }
    const blueprintId = typeof entry.blueprintId === 'string'
      ? entry.blueprintId
      : typeof entry.technologyId === 'string' ? entry.technologyId : null;
    return blueprintId === null
      ? []
      : [{ blueprintId, progress: entry.progress, requiredProgress: entry.requiredProgress }];
  });
}

function hadCapturerProgress(base: Record<string, unknown>): boolean {
  const capturerBlueprintId = contentCatalog.blueprints[0].id;
  const capturerEquipmentId = contentCatalog.equipment[0].id;
  const unlocked = Array.isArray(base.unlockedBlueprintIds)
    ? (base.unlockedBlueprintIds as readonly unknown[])
    : [];
  const manufactured = Array.isArray(base.manufacturedEquipmentIds)
    ? (base.manufacturedEquipmentIds as readonly unknown[])
    : [];
  const queue = Array.isArray(base.researchQueue)
    ? (base.researchQueue as readonly unknown[])
    : [];
  return (
    unlocked.includes(capturerBlueprintId) ||
    manufactured.includes(capturerEquipmentId) ||
    queue.some((entry) => isRecord(entry) && entry.blueprintId === capturerBlueprintId)
  );
}

interface MigrationOptions {
  readonly credits: number;
  readonly constructedBuildingIds: readonly string[];
  readonly staff: BaseState['staff'];
  readonly unlockedBlueprintIds: readonly string[];
  readonly manufacturedEquipmentIds: readonly string[];
  readonly equippedEquipmentId: string | null;
  readonly preservedTechnologyIds: readonly string[];
  readonly telemetryRecorded: boolean;
  readonly hangarSlots: readonly (string | null)[];
  readonly activeAircraftId: string | null;
  readonly month: number;
  readonly fueledAircraftIds: readonly string[];
  readonly threatMap: GameState['base']['threatMap'];
  readonly loans: BaseState['loans'];
}

function migratedState(
  parsed: Record<string, unknown>,
  base: Record<string, unknown> & LegacyBaseFields,
  options: MigrationOptions,
): GameState | null {
  if (!Array.isArray(parsed.technologyCatalog)) {
    return null;
  }
  const primaryWeapons = primaryWeaponFields(base);
  const aircraftIds = options.hangarSlots.filter(
    (slot): slot is string => slot !== null,
  );
  const activeAircraftId = options.activeAircraftId ?? aircraftIds[0] ?? contentCatalog.aircraft[0].id;
  const migrated: GameState = {
    schemaVersion: 17,
    base: {
      ...v14BaseDefaults(),
      credits: options.credits,
      materials: base.materials,
      research: base.research,
      energyCapacity: base.energyCapacity,
      allocatedEnergy: base.allocatedEnergy,
      pilots: base.pilots as BaseState['pilots'],
      activePilotId: base.activePilotId,
      researchQueue: normalizeResearchQueue(base.researchQueue),
      preservedTechnologyIds: options.preservedTechnologyIds,
      ...primaryWeapons,
      constructedBuildingIds: options.constructedBuildingIds,
      staff: migratedStaff(options.staff),
      unlockedBlueprintIds: options.unlockedBlueprintIds,
      locallyProducedWeaponIds: [],
      researchedWeaponUpgradeIds: [],
      manufacturedWeaponUpgradeIds: [],
      manufacturedEquipmentIds: options.manufacturedEquipmentIds,
      equippedEquipmentId: options.equippedEquipmentId,
      telemetryRecorded: options.telemetryRecorded,
      hangarSlots: options.hangarSlots,
      activeAircraftId,
      month: options.month,
      fueledAircraftIds: options.fueledAircraftIds,
      threatMap: options.threatMap,
      loans: options.loans,
      ...v13FleetFields({
        marketSeed: primaryWeapons.marketSeed,
        aircraftIds,
        activeAircraftId,
        equippedLoadout: primaryWeapons.equippedPrimaryWeaponIds,
        equippedModule: options.equippedEquipmentId,
        ownedWeapons: primaryWeapons.ownedPrimaryWeaponIds,
      }),
    },
    technologyCatalog: parsed.technologyCatalog as GameState['technologyCatalog'],
    activeRun: null,
  };
  return isGameState(migrated) ? migrated : null;
}

function migrateV7Save(rawSave: string | null): GameState | null {
  const legacy = parseLegacy(rawSave, 7);
  if (legacy === null) {
    return null;
  }
  const { parsed, base } = legacy;
  if (
    typeof base.credits !== 'number' ||
    !Array.isArray(base.preservedTechnologyIds) ||
    !Array.isArray(base.ownedPrimaryWeaponIds) ||
    !Array.isArray(base.equippedPrimaryWeaponIds) ||
    base.equippedPrimaryWeaponIds.length !== 2 ||
    !base.equippedPrimaryWeaponIds.every(
      (weaponId) => weaponId === null || typeof weaponId === 'string',
    ) ||
    !Number.isInteger(base.marketSeed) ||
    !Number.isInteger(base.sortiesCompleted) ||
    !Array.isArray(base.constructedBuildingIds) ||
    !Array.isArray(base.staff) ||
    !Array.isArray(base.unlockedBlueprintIds) ||
    !Array.isArray(base.manufacturedEquipmentIds) ||
    !(base.equippedEquipmentId === null || typeof base.equippedEquipmentId === 'string') ||
    !Array.isArray(parsed.technologyCatalog)
  ) {
    return null;
  }
  const migrated: GameState = {
    schemaVersion: 17,
    base: {
      ...v14BaseDefaults(),
      credits: base.credits,
      materials: base.materials,
      research: base.research,
      energyCapacity: base.energyCapacity,
      allocatedEnergy: base.allocatedEnergy,
      pilots: base.pilots as BaseState['pilots'],
      activePilotId: base.activePilotId,
      researchQueue: normalizeResearchQueue(base.researchQueue),
      preservedTechnologyIds: base.preservedTechnologyIds as readonly string[],
      ownedPrimaryWeaponIds: base.ownedPrimaryWeaponIds as readonly string[],
      equippedPrimaryWeaponIds: [
        base.equippedPrimaryWeaponIds[0] as string | null,
        base.equippedPrimaryWeaponIds[1] as string | null,
      ],
      marketSeed: base.marketSeed as number,
      sortiesCompleted: base.sortiesCompleted as number,
      constructedBuildingIds: base.constructedBuildingIds as readonly string[],
      staff: migratedStaff(base.staff as readonly unknown[]),
      unlockedBlueprintIds: base.unlockedBlueprintIds as readonly string[],
      locallyProducedWeaponIds: [],
      researchedWeaponUpgradeIds: [],
      manufacturedWeaponUpgradeIds: [],
      manufacturedEquipmentIds: base.manufacturedEquipmentIds as readonly string[],
      equippedEquipmentId: base.equippedEquipmentId as string | null,
      telemetryRecorded: hadCapturerProgress(base),
      hangarSlots: [STARTING_AIRCRAFT_ID, null],
      activeAircraftId: STARTING_AIRCRAFT_ID,
      month: 1,
      fueledAircraftIds: startingFueledAircraftIds([STARTING_AIRCRAFT_ID, null]),
      threatMap: startingThreatMap(base.marketSeed as number),
      loans: [],
      ...v13FleetFields({
        marketSeed: base.marketSeed as number,
        aircraftIds: [STARTING_AIRCRAFT_ID],
        activeAircraftId: STARTING_AIRCRAFT_ID,
        equippedLoadout: base.equippedPrimaryWeaponIds as (string | null)[],
        equippedModule: base.equippedEquipmentId as string | null,
        ownedWeapons: base.ownedPrimaryWeaponIds as string[],
      }),
    },
    technologyCatalog: parsed.technologyCatalog as GameState['technologyCatalog'],
    activeRun: null,
  };
  return isGameState(migrated) ? migrated : null;
}

function migrateV16Save(rawSave: string | null): GameState | null {
  if (rawSave === null) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(rawSave);
    if (!isRecord(parsed) || parsed.schemaVersion !== 16 || !isRecord(parsed.base)) {
      return null;
    }
    const base = parsed.base as unknown as BaseState;
    const starterId = STARTING_AIRCRAFT_ID;
    const starterLoadout: (string | null)[] = [contentCatalog.weapons[0].id, null];
    const upgraded: GameState = {
      ...(parsed as Omit<GameState, 'base' | 'schemaVersion'>),
      schemaVersion: 17,
      base: {
        ...base,
        hangarSlots: [starterId, null],
        activeAircraftId: starterId,
        aircraftLoadouts: { [starterId]: starterLoadout },
        aircraftModules: { [starterId]: null },
        aircraftDamage: {},
        aircraftRepair: {},
        equippedPrimaryWeaponIds: [...starterLoadout],
        equippedEquipmentId: null,
        unlockedBlueprintIds: base.unlockedBlueprintIds.filter(
          (id) => !id.startsWith('blueprint-aircraft-'),
        ),
        researchQueue: base.researchQueue.filter(
          (project) => !project.blueprintId.startsWith('blueprint-aircraft-'),
        ),
        productionQueue: base.productionQueue.filter(
          (job) => job.kind !== 'aircraft',
        ),
        researchedAircraftUpgradeIds: [],
        manufacturedAircraftUpgradeIds: [],
      },
    };
    return isGameState(upgraded) ? upgraded : null;
  } catch {
    return null;
  }
}

function migrateV15Save(rawSave: string | null): GameState | null {
  if (rawSave === null) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(rawSave);
    if (!isRecord(parsed) || parsed.schemaVersion !== 15 || !isRecord(parsed.base)) {
      return null;
    }
    const upgraded: GameState = {
      ...(parsed as Omit<GameState, 'base' | 'schemaVersion'>),
      schemaVersion: 17,
      base: {
        ...(parsed.base as unknown as BaseState),
        pilotInjuries: {},
        deadPilotIds: [],
        pilotDeathMonth: {},
      },
    };
    return isGameState(upgraded) ? upgraded : null;
  } catch {
    return null;
  }
}

function migrateV14Save(rawSave: string | null): GameState | null {
  if (rawSave === null) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(rawSave);
    if (!isRecord(parsed) || parsed.schemaVersion !== 14 || !isRecord(parsed.base)) {
      return null;
    }
    const upgraded: GameState = {
      ...(parsed as Omit<GameState, 'base' | 'schemaVersion'>),
      schemaVersion: 17,
      base: {
        ...(parsed.base as unknown as BaseState),
        researchedAircraftUpgradeIds: [],
        manufacturedAircraftUpgradeIds: [],
      },
    };
    return isGameState(upgraded) ? upgraded : null;
  } catch {
    return null;
  }
}

function migrateV13Save(rawSave: string | null): GameState | null {
  if (rawSave === null) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(rawSave);
    if (!isRecord(parsed) || parsed.schemaVersion !== 13 || !isRecord(parsed.base)) {
      return null;
    }
    const upgraded: GameState = {
      ...(parsed as Omit<GameState, 'base' | 'schemaVersion'>),
      schemaVersion: 17,
      base: {
        ...(parsed.base as unknown as BaseState),
        ...v14BaseDefaults(),
      },
    };
    return isGameState(upgraded) ? upgraded : null;
  } catch {
    return null;
  }
}

function migrateV12Save(rawSave: string | null): GameState | null {
  const legacy = parseLegacy(rawSave, 12);
  if (legacy === null) {
    return null;
  }
  const { parsed, base } = legacy;
  const aircraftIds = (Array.isArray(base.hangarSlots)
    ? base.hangarSlots.filter((slot): slot is string => typeof slot === 'string')
    : []) as readonly string[];
  const activeAircraftId = (typeof base.activeAircraftId === 'string' &&
    aircraftIds.includes(base.activeAircraftId))
    ? base.activeAircraftId
    : aircraftIds[0] ?? contentCatalog.aircraft[0].id;
  const marketSeed = Number.isInteger(base.marketSeed)
    ? (base.marketSeed as number)
    : DEFAULT_MARKET_SEED;
  const migrated: GameState = {
    ...(parsed as unknown as GameState),
    schemaVersion: 17,
    base: {
      ...v14BaseDefaults(),
      ...(base as unknown as BaseState),
      staff: migratedStaff(Array.isArray(base.staff) ? base.staff : []),
      ...v13FleetFields({
        marketSeed,
        aircraftIds,
        activeAircraftId,
        equippedLoadout: Array.isArray(base.equippedPrimaryWeaponIds)
          ? (base.equippedPrimaryWeaponIds as (string | null)[])
          : [],
        equippedModule: typeof base.equippedEquipmentId === 'string'
          ? base.equippedEquipmentId
          : null,
        ownedWeapons: Array.isArray(base.ownedPrimaryWeaponIds)
          ? (base.ownedPrimaryWeaponIds as string[])
          : [],
      }),
    },
  };
  return isGameState(migrated) ? migrated : null;
}

function migrateV11Save(rawSave: string | null): GameState | null {
  const legacy = parseLegacy(rawSave, 11);
  if (legacy === null) {
    return null;
  }
  const { parsed, base } = legacy;
  const migrated: GameState = {
    ...(parsed as unknown as GameState),
    schemaVersion: 17,
    base: {
      ...v14BaseDefaults(),
      ...(base as unknown as BaseState),
      loans: [],
      staff: migratedStaff(Array.isArray(base.staff) ? base.staff : []),
      ...v13FleetFields({
        marketSeed: Number.isInteger(base.marketSeed)
          ? (base.marketSeed as number)
          : DEFAULT_MARKET_SEED,
        aircraftIds: [STARTING_AIRCRAFT_ID],
        activeAircraftId: STARTING_AIRCRAFT_ID,
        equippedLoadout: Array.isArray(base.equippedPrimaryWeaponIds)
          ? (base.equippedPrimaryWeaponIds as (string | null)[])
          : [],
        equippedModule: typeof base.equippedEquipmentId === 'string'
          ? base.equippedEquipmentId
          : null,
        ownedWeapons: Array.isArray(base.ownedPrimaryWeaponIds)
          ? (base.ownedPrimaryWeaponIds as string[])
          : [],
      }),
    },
  };
  return isGameState(migrated) ? migrated : null;
}

function migrateV10Save(rawSave: string | null): GameState | null {
  const legacy = parseLegacy(rawSave, 10);
  if (legacy === null) {
    return null;
  }
  const { parsed, base } = legacy;
  const slots = [STARTING_AIRCRAFT_ID, null];
  const marketSeed = Number.isInteger(base.marketSeed)
    ? (base.marketSeed as number)
    : DEFAULT_MARKET_SEED;
  const migrated: GameState = {
    ...(parsed as unknown as GameState),
    schemaVersion: 17,
    base: {
      ...v14BaseDefaults(),
      ...(base as unknown as BaseState),
      hangarSlots: slots,
      activeAircraftId: STARTING_AIRCRAFT_ID,
      month: 1,
      fueledAircraftIds: startingFueledAircraftIds(slots),
      threatMap: startingThreatMap(marketSeed),
      loans: [],
      staff: migratedStaff(Array.isArray(base.staff) ? base.staff : []),
      ...v13FleetFields({
        marketSeed,
        aircraftIds: [STARTING_AIRCRAFT_ID],
        activeAircraftId: STARTING_AIRCRAFT_ID,
        equippedLoadout: Array.isArray(base.equippedPrimaryWeaponIds)
          ? (base.equippedPrimaryWeaponIds as (string | null)[])
          : [],
        equippedModule: typeof base.equippedEquipmentId === 'string'
          ? base.equippedEquipmentId
          : null,
        ownedWeapons: Array.isArray(base.ownedPrimaryWeaponIds)
          ? (base.ownedPrimaryWeaponIds as string[])
          : [],
      }),
    },
  };
  return isGameState(migrated) ? migrated : null;
}

function migrateV9Save(rawSave: string | null): GameState | null {
  const legacy = parseLegacy(rawSave, 9);
  if (legacy === null) {
    return null;
  }
  const { parsed, base } = legacy;
  const marketSeed = Number.isInteger(base.marketSeed)
    ? (base.marketSeed as number)
    : DEFAULT_MARKET_SEED;
  const migrated: GameState = {
    ...(parsed as unknown as GameState),
    schemaVersion: 17,
    base: {
      ...v14BaseDefaults(),
      ...(base as unknown as BaseState),
      hangarSlots: [STARTING_AIRCRAFT_ID, null],
      activeAircraftId: STARTING_AIRCRAFT_ID,
      month: 1,
      fueledAircraftIds: startingFueledAircraftIds([STARTING_AIRCRAFT_ID, null]),
      threatMap: startingThreatMap(marketSeed),
      loans: [],
      staff: migratedStaff(Array.isArray(base.staff) ? base.staff : []),
      ...v13FleetFields({
        marketSeed,
        aircraftIds: [STARTING_AIRCRAFT_ID],
        activeAircraftId: STARTING_AIRCRAFT_ID,
        equippedLoadout: Array.isArray(base.equippedPrimaryWeaponIds)
          ? (base.equippedPrimaryWeaponIds as (string | null)[])
          : [],
        equippedModule: typeof base.equippedEquipmentId === 'string'
          ? base.equippedEquipmentId
          : null,
        ownedWeapons: Array.isArray(base.ownedPrimaryWeaponIds)
          ? (base.ownedPrimaryWeaponIds as string[])
          : [],
      }),
    },
  };
  return isGameState(migrated) ? migrated : null;
}

function migrateV8Save(rawSave: string | null): GameState | null {
  const legacy = parseLegacy(rawSave, 8);
  if (legacy === null) {
    return null;
  }
  const { parsed, base } = legacy;
  const marketSeed = Number.isInteger(base.marketSeed)
    ? (base.marketSeed as number)
    : DEFAULT_MARKET_SEED;
  const migrated: GameState = {
    ...(parsed as unknown as GameState),
    schemaVersion: 17,
    base: {
      ...v14BaseDefaults(),
      ...(base as unknown as BaseState),
      telemetryRecorded: hadCapturerProgress(base),
      hangarSlots: [STARTING_AIRCRAFT_ID, null],
      activeAircraftId: STARTING_AIRCRAFT_ID,
      month: 1,
      fueledAircraftIds: startingFueledAircraftIds([STARTING_AIRCRAFT_ID, null]),
      threatMap: startingThreatMap(marketSeed),
      loans: [],
      staff: migratedStaff(Array.isArray(base.staff) ? base.staff : []),
      ...v13FleetFields({
        marketSeed,
        aircraftIds: [STARTING_AIRCRAFT_ID],
        activeAircraftId: STARTING_AIRCRAFT_ID,
        equippedLoadout: Array.isArray(base.equippedPrimaryWeaponIds)
          ? (base.equippedPrimaryWeaponIds as (string | null)[])
          : [],
        equippedModule: typeof base.equippedEquipmentId === 'string'
          ? base.equippedEquipmentId
          : null,
        ownedWeapons: Array.isArray(base.ownedPrimaryWeaponIds)
          ? (base.ownedPrimaryWeaponIds as string[])
          : [],
      }),
    },
  };
  return isGameState(migrated) ? migrated : null;
}

function migrateV6Save(rawSave: string | null): GameState | null {
  const legacy = parseLegacy(rawSave, 6);
  if (legacy === null) {
    return null;
  }
  const { parsed, base } = legacy;
  if (
    typeof base.credits !== 'number' ||
    !Array.isArray(base.preservedTechnologyIds) ||
    !Array.isArray(base.ownedPrimaryWeaponIds) ||
    typeof base.equippedPrimaryWeaponId !== 'string' ||
    !Number.isInteger(base.marketSeed) ||
    !Number.isInteger(base.sortiesCompleted) ||
    !Array.isArray(base.constructedBuildingIds) ||
    !Array.isArray(base.staff) ||
    !Array.isArray(base.unlockedBlueprintIds) ||
    !Array.isArray(base.manufacturedEquipmentIds) ||
    !(base.equippedEquipmentId === null || typeof base.equippedEquipmentId === 'string') ||
    !Array.isArray(parsed.technologyCatalog)
  ) {
    return null;
  }

  const equippedPrimaryWeaponId = base.ownedPrimaryWeaponIds.includes(
    base.equippedPrimaryWeaponId,
  )
    ? base.equippedPrimaryWeaponId
    : contentCatalog.weapons[0].id;
  const migrated: GameState = {
    schemaVersion: 17,
    base: {
      ...v14BaseDefaults(),
      credits: base.credits,
      materials: base.materials,
      research: base.research,
      energyCapacity: base.energyCapacity,
      allocatedEnergy: base.allocatedEnergy,
      pilots: base.pilots as BaseState['pilots'],
      activePilotId: base.activePilotId,
      researchQueue: normalizeResearchQueue(base.researchQueue),
      preservedTechnologyIds: base.preservedTechnologyIds as readonly string[],
      ownedPrimaryWeaponIds: base.ownedPrimaryWeaponIds as readonly string[],
      equippedPrimaryWeaponIds: [equippedPrimaryWeaponId, null],
      marketSeed: base.marketSeed as number,
      sortiesCompleted: base.sortiesCompleted as number,
      constructedBuildingIds: base.constructedBuildingIds as readonly string[],
      staff: migratedStaff(base.staff as readonly unknown[]),
      unlockedBlueprintIds: base.unlockedBlueprintIds as readonly string[],
      locallyProducedWeaponIds: [],
      researchedWeaponUpgradeIds: [],
      manufacturedWeaponUpgradeIds: [],
      manufacturedEquipmentIds: base.manufacturedEquipmentIds as readonly string[],
      equippedEquipmentId: base.equippedEquipmentId as string | null,
      telemetryRecorded: hadCapturerProgress(base),
      hangarSlots: [STARTING_AIRCRAFT_ID, null],
      activeAircraftId: STARTING_AIRCRAFT_ID,
      month: 1,
      fueledAircraftIds: startingFueledAircraftIds([STARTING_AIRCRAFT_ID, null]),
      threatMap: startingThreatMap(base.marketSeed as number),
      loans: [],
      ...v13FleetFields({
        marketSeed: base.marketSeed as number,
        aircraftIds: [STARTING_AIRCRAFT_ID],
        activeAircraftId: STARTING_AIRCRAFT_ID,
        equippedLoadout: base.equippedPrimaryWeaponIds as (string | null)[],
        equippedModule: base.equippedEquipmentId as string | null,
        ownedWeapons: base.ownedPrimaryWeaponIds as string[],
      }),
    },
    technologyCatalog: parsed.technologyCatalog as GameState['technologyCatalog'],
    activeRun: null,
  };
  return isGameState(migrated) ? migrated : null;
}

function parseLegacy(rawSave: string | null, version: number): {
  readonly parsed: Record<string, unknown>;
  readonly base: Record<string, unknown> & LegacyBaseFields;
} | null {
  if (rawSave === null) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(rawSave);
    if (
      !isRecord(parsed) ||
      parsed.schemaVersion !== version ||
      !isRecord(parsed.base) ||
      !hasLegacyBase(parsed.base)
    ) {
      return null;
    }
    return { parsed, base: parsed.base };
  } catch {
    return null;
  }
}

function migrateV5Save(rawSave: string | null): GameState | null {
  const legacy = parseLegacy(rawSave, 5);
  if (legacy === null || !hasLegacyWeapons(legacy.base)) {
    return null;
  }
  const { parsed, base } = legacy;
  if (
    typeof base.credits !== 'number' ||
    !Array.isArray(base.preservedTechnologyIds) ||
    !Array.isArray(base.constructedBuildingIds) ||
    !Array.isArray(base.staff) ||
    !Array.isArray(base.unlockedBlueprintIds) ||
    !Array.isArray(base.manufacturedEquipmentIds) ||
    !(base.equippedEquipmentId === null || typeof base.equippedEquipmentId === 'string')
  ) {
    return null;
  }
  return migratedState(parsed, base, {
    credits: base.credits,
    preservedTechnologyIds: base.preservedTechnologyIds as readonly string[],
    constructedBuildingIds: base.constructedBuildingIds as readonly string[],
    staff: base.staff as BaseState['staff'],
    unlockedBlueprintIds: base.unlockedBlueprintIds as readonly string[],
    manufacturedEquipmentIds: base.manufacturedEquipmentIds as readonly string[],
    equippedEquipmentId: base.equippedEquipmentId as string | null,
    telemetryRecorded: hadCapturerProgress(base),
    hangarSlots: [STARTING_AIRCRAFT_ID, null],
    activeAircraftId: STARTING_AIRCRAFT_ID,
    month: 1,
    fueledAircraftIds: startingFueledAircraftIds([STARTING_AIRCRAFT_ID, null]),
    threatMap: startingThreatMap(DEFAULT_MARKET_SEED),
    loans: [],
  });
}

function migrateV4Save(rawSave: string | null): GameState | null {
  const legacy = parseLegacy(rawSave, 4);
  if (legacy === null || !hasLegacyWeapons(legacy.base)) {
    return null;
  }
  const { parsed, base } = legacy;
  if (
    typeof base.credits !== 'number' ||
    !Array.isArray(base.preservedTechnologyIds) ||
    !Array.isArray(base.constructedBuildingIds) ||
    !Array.isArray(base.staff) ||
    !Array.isArray(base.unlockedBlueprintIds) ||
    !Array.isArray(base.manufacturedEquipmentIds)
  ) {
    return null;
  }
  return migratedState(parsed, base, {
    credits: base.credits,
    preservedTechnologyIds: base.preservedTechnologyIds as readonly string[],
    constructedBuildingIds: base.constructedBuildingIds as readonly string[],
    staff: base.staff as BaseState['staff'],
    unlockedBlueprintIds: base.unlockedBlueprintIds as readonly string[],
    manufacturedEquipmentIds: base.manufacturedEquipmentIds as readonly string[],
    equippedEquipmentId: null,
    telemetryRecorded: false,
    hangarSlots: [STARTING_AIRCRAFT_ID, null],
    activeAircraftId: STARTING_AIRCRAFT_ID,
    month: 1,
    fueledAircraftIds: startingFueledAircraftIds([STARTING_AIRCRAFT_ID, null]),
    threatMap: startingThreatMap(DEFAULT_MARKET_SEED),
    loans: [],
  });
}

function migrateV3Save(rawSave: string | null): GameState | null {
  const legacy = parseLegacy(rawSave, 3);
  if (legacy === null || !hasLegacyWeapons(legacy.base)) {
    return null;
  }
  const { parsed, base } = legacy;
  if (
    typeof base.credits !== 'number' ||
    !Array.isArray(base.preservedTechnologyIds) ||
    !Array.isArray(base.constructedBuildingIds) ||
    !Array.isArray(base.staff)
  ) {
    return null;
  }
  return migratedState(parsed, base, {
    credits: base.credits,
    preservedTechnologyIds: base.preservedTechnologyIds as readonly string[],
    constructedBuildingIds: base.constructedBuildingIds as readonly string[],
    staff: base.staff as BaseState['staff'],
    unlockedBlueprintIds: [],
    manufacturedEquipmentIds: [],
    equippedEquipmentId: null,
    telemetryRecorded: false,
    hangarSlots: [STARTING_AIRCRAFT_ID, null],
    activeAircraftId: STARTING_AIRCRAFT_ID,
    month: 1,
    fueledAircraftIds: startingFueledAircraftIds([STARTING_AIRCRAFT_ID, null]),
    threatMap: startingThreatMap(DEFAULT_MARKET_SEED),
    loans: [],
  });
}

function migrateV2Save(rawSave: string | null): GameState | null {
  const legacy = parseLegacy(rawSave, 2);
  if (legacy === null || !hasLegacyWeapons(legacy.base)) {
    return null;
  }
  const { parsed, base } = legacy;
  if (!Array.isArray(base.preservedTechnologyIds)) {
    return null;
  }
  const unlocked = base.unlockedWeaponModuleIds as readonly unknown[];
  const infrastructure = legacyInfrastructure(
    unlocked.length > 0 || (Array.isArray(parsed.technologyCatalog) && parsed.technologyCatalog.length > 0),
  );
  return migratedState(parsed, base, {
    credits: contentCatalog.economy.startingCredits,
    preservedTechnologyIds: base.preservedTechnologyIds as readonly string[],
    ...infrastructure,
    unlockedBlueprintIds: [],
    manufacturedEquipmentIds: [],
    equippedEquipmentId: null,
    telemetryRecorded: false,
    hangarSlots: [STARTING_AIRCRAFT_ID, null],
    activeAircraftId: STARTING_AIRCRAFT_ID,
    month: 1,
    fueledAircraftIds: startingFueledAircraftIds([STARTING_AIRCRAFT_ID, null]),
    threatMap: startingThreatMap(DEFAULT_MARKET_SEED),
    loans: [],
  });
}

function migrateV1Save(rawSave: string | null): GameState | null {
  const legacy = parseLegacy(rawSave, 1);
  if (legacy === null) {
    return null;
  }
  const { parsed, base } = legacy;
  const infrastructure = legacyInfrastructure(
    Array.isArray(parsed.technologyCatalog) && parsed.technologyCatalog.length > 0,
  );
  return migratedState(parsed, base, {
    credits: contentCatalog.economy.startingCredits,
    preservedTechnologyIds: [],
    ...infrastructure,
    unlockedBlueprintIds: [],
    manufacturedEquipmentIds: [],
    equippedEquipmentId: null,
    telemetryRecorded: false,
    hangarSlots: [STARTING_AIRCRAFT_ID, null],
    activeAircraftId: STARTING_AIRCRAFT_ID,
    month: 1,
    fueledAircraftIds: startingFueledAircraftIds([STARTING_AIRCRAFT_ID, null]),
    threatMap: startingThreatMap(DEFAULT_MARKET_SEED),
    loans: [],
  });
}

export function saveGame(storage: KeyValueStorage, state: GameState): void {
  storage.setItem(SAVE_KEY, JSON.stringify(state));
}

export function clearGame(storage: KeyValueStorage): void {
  storage.removeItem(SAVE_KEY);
  storage.removeItem(LEGACY_V16_SAVE_KEY);
  storage.removeItem(LEGACY_V15_SAVE_KEY);
  storage.removeItem(LEGACY_V14_SAVE_KEY);
  storage.removeItem(LEGACY_V13_SAVE_KEY);
  storage.removeItem(LEGACY_V12_SAVE_KEY);
  storage.removeItem(LEGACY_V11_SAVE_KEY);
  storage.removeItem(LEGACY_V10_SAVE_KEY);
  storage.removeItem(LEGACY_V9_SAVE_KEY);
  storage.removeItem(LEGACY_V8_SAVE_KEY);
  storage.removeItem(LEGACY_V7_SAVE_KEY);
  storage.removeItem(LEGACY_V6_SAVE_KEY);
  storage.removeItem(LEGACY_V5_SAVE_KEY);
  storage.removeItem(LEGACY_V4_SAVE_KEY);
  storage.removeItem(LEGACY_V3_SAVE_KEY);
  storage.removeItem(LEGACY_V2_SAVE_KEY);
  storage.removeItem(LEGACY_V1_SAVE_KEY);
}
