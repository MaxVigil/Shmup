import { contentCatalog } from '../content/catalog';
import type { MissionState, MissionType } from '../content/model';
import {
  aircraftById,
  aircraftId,
  buildingId,
  staffRoleId,
  STARTER_BUILDING_IDS,
  weaponId,
} from '../content/ids';
import { generateThreatMap } from '../domain/command-centre';
import { generateStaffCandidates } from '../domain/staff-market';
import { isGameState } from '../domain/guards';
import { assignPilotToAircraft, ensureAircraftInstance } from '../domain/aircraft-instances';
import { SAVE_SCHEMA_VERSION } from '../domain/model';
import type { BaseState, GameState } from '../domain/model';

export const SAVE_KEY = 'shmup.save.v21';
export const LEGACY_V20_SAVE_KEY = 'shmup.save.v20';
export const LEGACY_V19_SAVE_KEY = 'shmup.save.v19';
export const LEGACY_V18_SAVE_KEY = 'shmup.save.v18';
export const LEGACY_V17_SAVE_KEY = 'shmup.save.v17';
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
const STARTING_AIRCRAFT_ID = aircraftId.india;

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
      : staffRoleId.scientist;
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
    loadouts[aircraftId.india] = Array.from(
      { length: aircraftById(aircraftId.india)!.weaponSlotCount },
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
  | 'aircraftHardpoints'
  | 'aircraftMarks'
  | 'aircraftInstances'
  | 'aircraftHistory'
  | 'missionResults'
  | 'intelFacts'
  | 'marketWishlist'
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
    aircraftHardpoints: {},
    aircraftMarks: {},
    aircraftInstances: {},
    aircraftHistory: {},
    missionResults: [],
    intelFacts: [],
    marketWishlist: [],
  };
}

const OLD_TO_NEW_BUILDING_ID: Readonly<Record<string, string>> = {
  'building-laboratory': 'building-research-centre',
  'building-workshop': 'building-production-works',
};

function renameBuildingIds(value: string): string {
  return OLD_TO_NEW_BUILDING_ID[value] ?? value;
}

/** v17 → v18: rename Laboratory/Workshop to canonical Research Centre / Production Works IDs. */
function upgradeBuildingIdVersion(state: GameState): GameState {
  return {
    ...state,
    schemaVersion: 18,
    base: {
      ...state.base,
      constructedBuildingIds: state.base.constructedBuildingIds.map(renameBuildingIds),
      constructionQueue: state.base.constructionQueue.map((job) => ({
        ...job,
        buildingId: renameBuildingIds(job.buildingId),
      })),
    },
  };
}

/** v18 → v19: provision the starting Command Centre and Hangar without duplication. */
function addStartingBuildingsVersion(state: GameState): GameState {
  const existing = new Set(state.base.constructedBuildingIds);
  const additions = STARTER_BUILDING_IDS.filter((id) => !existing.has(id));
  return {
    ...state,
    schemaVersion: 19,
    base: {
      ...state.base,
      constructedBuildingIds: additions.length === 0
        ? state.base.constructedBuildingIds
        : [...state.base.constructedBuildingIds, ...additions],
    },
  };
}

/** v19 → v20: seed the arsenal loadout state (hardpoints + aircraft marks). */
function addArsenalLoadoutStateVersion(state: GameState): GameState {
  return {
    ...state,
    schemaVersion: 20,
    base: {
      ...state.base,
      aircraftHardpoints: state.base.aircraftHardpoints ?? {},
      aircraftMarks: state.base.aircraftMarks ?? {},
    },
  };
}

/** v20 → v21: provision per-aircraft instances + history records (M1a, MISSIONS_EPIC §1.2). */
function addAircraftInstancesVersion(state: GameState): GameState {
  let base = state.base;
  const month = base.month ?? 1;
  for (const definitionId of base.hangarSlots) {
    if (definitionId === null) {
      continue;
    }
    base = ensureAircraftInstance(base, definitionId, month, { legacyImported: true });
  }
  if (base.activeAircraftId !== null && base.activePilotId !== null) {
    try {
      base = assignPilotToAircraft(base, base.activeAircraftId, base.activePilotId);
    } catch {
      // Unknown/conflicting legacy pilot: keep the active-pilot mirror untouched.
    }
  }
  // Legacy missions have no type; baseline them as sweeps (M5).
  const threatMap = state.base.threatMap.map((mission) => ({
    ...mission,
    type: legacyMissionType(mission),
  }));
  return { ...state, schemaVersion: 21, base: { ...base, threatMap } };
}

function legacyMissionType(mission: MissionState): MissionType {
  const raw = (mission as { type?: string }).type;
  return raw === 'interception' || raw === 'escort' || raw === 'recon'
    ? raw
    : 'sweep';
}

/** Walks intermediate migration versions up to the current schema. */
function upgradeLegacyToCurrent(state: GameState): GameState {
  let current = state;
  if (current.schemaVersion < 18) {
    current = upgradeBuildingIdVersion(current);
  }
  if (current.schemaVersion < 19) {
    current = addStartingBuildingsVersion(current);
  }
  if (current.schemaVersion < 20) {
    current = addArsenalLoadoutStateVersion(current);
  }
  if (current.schemaVersion < 21) {
    current = addAircraftInstancesVersion(current);
  }
  return current;
}

/** Legacy v17 save (old SAVE_KEY) → current. */
function migrateV17Save(rawSave: string | null): GameState | null {
  if (rawSave === null) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(rawSave);
    if (!isRecord(parsed) || parsed.schemaVersion !== 17 || !isRecord(parsed.base)) {
      return null;
    }
    return upgradeLegacyToCurrent(parsed as unknown as GameState);
  } catch {
    return null;
  }
}

/** Legacy v18 save (old SAVE_KEY) → current (provisions starting buildings). */
function migrateV18Save(rawSave: string | null): GameState | null {
  if (rawSave === null) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(rawSave);
    if (!isRecord(parsed) || parsed.schemaVersion !== 18 || !isRecord(parsed.base)) {
      return null;
    }
    return upgradeLegacyToCurrent(parsed as unknown as GameState);
  } catch {
    return null;
  }
}

/** Legacy v19 save (old SAVE_KEY) → current (seeds the arsenal loadout state). */
function migrateV19Save(rawSave: string | null): GameState | null {
  if (rawSave === null) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(rawSave);
    if (!isRecord(parsed) || parsed.schemaVersion !== 19 || !isRecord(parsed.base)) {
      return null;
    }
    return upgradeLegacyToCurrent(parsed as unknown as GameState);
  } catch {
    return null;
  }
}

/** Legacy v20 save (old SAVE_KEY) → current (provisions aircraft instances, M1a). */
function migrateV20Save(rawSave: string | null): GameState | null {
  if (rawSave === null) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(rawSave);
    if (!isRecord(parsed) || parsed.schemaVersion !== 20 || !isRecord(parsed.base)) {
      return null;
    }
    return upgradeLegacyToCurrent(parsed as unknown as GameState);
  } catch {
    return null;
  }
}

export function loadGame(storage: KeyValueStorage): GameState | null {
  const currentSave = parseGameState(storage.getItem(SAVE_KEY));
  if (currentSave !== null) {
    return currentSave;
  }

  const migrations: readonly [string, (raw: string | null) => GameState | null][] = [
    [LEGACY_V20_SAVE_KEY, migrateV20Save],
    [LEGACY_V19_SAVE_KEY, migrateV19Save],
    [LEGACY_V18_SAVE_KEY, migrateV18Save],
    [LEGACY_V17_SAVE_KEY, migrateV17Save],
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
      return migrated.schemaVersion === SAVE_SCHEMA_VERSION
        ? migrated
        : upgradeLegacyToCurrent(migrated);
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
  const startingWeaponId = weaponId.pulseCannon;
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
    constructedBuildingIds: [buildingId.researchCentre],
    staff: migratedStaff([
      { id: 'staff-scientist-1', roleId: staffRoleId.scientist },
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
  const capturerBlueprintId = 'blueprint-alien-technology-capturer';
  const capturerEquipmentId = 'equipment-alien-technology-capturer';
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
  const activeAircraftId = options.activeAircraftId ?? aircraftIds[0] ?? aircraftId.india;
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
  return isGameState(migrated, 17) ? migrated : null;
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
  return isGameState(migrated, 17) ? migrated : null;
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
    const starterLoadout: (string | null)[] = [weaponId.pulseCannon, null];
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
    return isGameState(upgraded, 17) ? upgraded : null;
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
    return isGameState(upgraded, 17) ? upgraded : null;
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
    return isGameState(upgraded, 17) ? upgraded : null;
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
    return isGameState(upgraded, 17) ? upgraded : null;
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
    : aircraftIds[0] ?? aircraftId.india;
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
  return isGameState(migrated, 17) ? migrated : null;
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
  return isGameState(migrated, 17) ? migrated : null;
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
  return isGameState(migrated, 17) ? migrated : null;
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
  return isGameState(migrated, 17) ? migrated : null;
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
  return isGameState(migrated, 17) ? migrated : null;
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
    : weaponId.pulseCannon;
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
  return isGameState(migrated, 17) ? migrated : null;
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
