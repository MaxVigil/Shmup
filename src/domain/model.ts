export const SAVE_SCHEMA_VERSION = 1 as const;

export type SaveSchemaVersion = typeof SAVE_SCHEMA_VERSION;

export interface PilotState {
  readonly id: string;
  readonly unlocked: boolean;
}

export interface ResearchProjectState {
  readonly technologyId: string;
  readonly progress: number;
  readonly requiredProgress: number;
}

export interface BaseState {
  readonly materials: number;
  readonly research: number;
  readonly energyCapacity: number;
  readonly allocatedEnergy: number;
  readonly pilots: readonly PilotState[];
  readonly activePilotId: string;
  readonly researchQueue: readonly ResearchProjectState[];
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
}
