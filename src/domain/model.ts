import type { MissionState } from '../content/model';

export const SAVE_SCHEMA_VERSION = 14 as const;

export type SaveSchemaVersion = typeof SAVE_SCHEMA_VERSION;

export interface PilotState {
  readonly id: string;
  readonly unlocked: boolean;
}

export type PilotSpecialization = 'speed' | 'damage' | 'recovery';

export interface PilotCandidateState {
  readonly id: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly tier: number;
  readonly specialization: PilotSpecialization;
  readonly hireCreditCost: number;
  readonly salaryCreditCost: number;
  readonly progressMultiplier: number;
  readonly salaryMultiplier: number;
  readonly originCountryId: string;
}

export interface ConstructionJobState {
  readonly id: string;
  readonly buildingId: string;
  readonly progress: number;
  readonly requiredProgress: number;
}

export interface ProductionJobState {
  readonly id: string;
  readonly projectId: string;
  readonly kind: 'equipment' | 'weapon' | 'upgrade';
  readonly progress: number;
  readonly requiredProgress: number;
}

export interface ResearchProjectState {
  readonly blueprintId: string;
  readonly progress: number;
  readonly requiredProgress: number;
}

export interface StaffMemberState {
  readonly id: string;
  readonly roleId: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly tier: number;
  readonly progressMultiplier: number;
  readonly salaryMultiplier: number;
}

export interface StaffCandidateState {
  readonly id: string;
  readonly roleId: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly tier: number;
  readonly hireCreditCost: number;
  readonly salaryCreditCost: number;
  readonly progressMultiplier: number;
  readonly salaryMultiplier: number;
  readonly originCountryId: string;
}

export interface LoanState {
  readonly id: string;
  readonly lenderId: string;
  readonly principal: number;
  readonly repaymentDue: number;
  readonly dueMonth: number;
  readonly repaid: boolean;
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
  readonly equippedPrimaryWeaponIds: readonly (string | null)[];
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
  readonly loans: readonly LoanState[];
  readonly aircraftLoadouts: Readonly<Record<string, readonly (string | null)[]>>;
  readonly weaponStock: Readonly<Record<string, number>>;
  readonly consumableStock: Readonly<Record<string, number>>;
  readonly aircraftModules: Readonly<Record<string, string | null>>;
  readonly aircraftDamage: Readonly<Record<string, number>>;
  readonly aircraftRepair: Readonly<Record<string, number>>;
  readonly staffCandidates: readonly StaffCandidateState[];
  readonly staffXp: Readonly<Record<string, number>>;
  readonly constructionQueue: readonly ConstructionJobState[];
  readonly productionQueue: readonly ProductionJobState[];
  readonly resolvedThreatIds: readonly string[];
  readonly pilotCandidates: readonly PilotCandidateState[];
  readonly pilotXp: Readonly<Record<string, number>>;
  readonly pilotFatigue: Readonly<Record<string, number>>;
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
