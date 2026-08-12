import type { MissionState } from '../content/model';

export const SAVE_SCHEMA_VERSION = 11 as const;

export type SaveSchemaVersion = typeof SAVE_SCHEMA_VERSION;

export interface PilotState {
  readonly id: string;
  readonly unlocked: boolean;
}

export interface ResearchProjectState {
  readonly blueprintId: string;
  readonly progress: number;
  readonly requiredProgress: number;
}

export interface StaffMemberState {
  readonly id: string;
  readonly roleId: string;
}

export interface BaseState {
  readonly credits: number;
  readonly materials: number;
  readonly research: number;
  readonly energyCapacity: number;
  readonly allocatedEnergy: number;
  readonly pilots: readonly PilotState[];
  readonly activePilotId: string;
  readonly researchQueue: readonly ResearchProjectState[];
  readonly preservedTechnologyIds: readonly string[];
  readonly ownedPrimaryWeaponIds: readonly string[];
  readonly equippedPrimaryWeaponIds: readonly [string | null, string | null];
  readonly marketSeed: number;
  readonly sortiesCompleted: number;
  readonly constructedBuildingIds: readonly string[];
  readonly staff: readonly StaffMemberState[];
  readonly unlockedBlueprintIds: readonly string[];
  readonly locallyProducedWeaponIds: readonly string[];
  readonly researchedWeaponUpgradeIds: readonly string[];
  readonly manufacturedWeaponUpgradeIds: readonly string[];
  readonly manufacturedEquipmentIds: readonly string[];
  readonly equippedEquipmentId: string | null;
  readonly telemetryRecorded: boolean;
  readonly hangarSlots: readonly (string | null)[];
  readonly activeAircraftId: string | null;
  readonly month: number;
  readonly fueledAircraftIds: readonly string[];
  readonly threatMap: readonly MissionState[];
}

export interface TechnologyKnowledge {
  readonly technologyId: string;
  readonly revealedProperties: readonly string[];
}

export interface RunState {
  readonly seed: number;
  readonly armour: number;
  readonly materialsFound: number;
  readonly researchFound: number;
  readonly installedTechnologyIds: readonly string[];
  readonly preservedTechnologyIds: readonly string[];
}

export interface GameState {
  readonly schemaVersion: SaveSchemaVersion;
  readonly base: BaseState;
  readonly technologyCatalog: readonly TechnologyKnowledge[];
  readonly activeRun: RunState | null;
}

export interface SortieOutcome {
  readonly extracted: boolean;
  readonly materialsFound: number;
  readonly researchFound: number;
  readonly preservedTechnologyIds: readonly string[];
  readonly targetsDestroyed: number;
  readonly targetsBreached: number;
  readonly creditsEarned: number;
  readonly creditsPenalized: number;
  readonly wardenSignalDetected: boolean;
}
