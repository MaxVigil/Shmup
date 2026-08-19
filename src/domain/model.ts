import type { MissionState } from '../content/model';

export const SAVE_SCHEMA_VERSION = 21 as const;

export type SaveSchemaVersion = number;

export interface PilotState {
  readonly id: string;
  readonly unlocked: boolean;
  readonly firstName?: string;
  readonly lastName?: string;
  readonly specialization?: PilotSpecialization;
  readonly salaryCreditCost?: number;
}

export type PilotSpecialization = 'speed' | 'damage' | 'recovery';

/**
 * Per-aircraft instance metadata (MISSIONS_EPIC §1.2). One instance per acquired
 * aircraft; the instance id is stable and initially equals the definition id
 * (one aircraft per type). Loadout/armour data still lives in the per-type maps
 * keyed by definition id; M1b folds those maps into the instance.
 */
export interface AircraftInstanceMeta {
  readonly id: string;                 // stable instance id
  readonly definitionId: string;
  readonly callsign: string;
  readonly assignedPilotId: string | null;
  readonly status: 'ready' | 'damaged' | 'destroyed';
  readonly historyId: string;
}

/** Immutable-ish per-aircraft campaign record; destroyed aircraft live on here. */
export interface AircraftHistoryRecord {
  readonly id: string;
  readonly definitionId: string;
  readonly callsign: string;
  readonly acquiredMonth: number;
  readonly destroyedMonth: number | null;
  readonly legacyImported: boolean;
  readonly missions: number;
  readonly kills: number;
  readonly eliteKills: number;
  /** Chronological sortie timeline (M8, MISSIONS_EPIC §6.3). */
  readonly events: readonly AircraftSortieEvent[];
}

/** One sortie on an aircraft's timeline. */
export interface AircraftSortieEvent {
  readonly month: number;
  readonly outcome: MissionOutcomeKind | null;
  readonly missionType: string;
}

/**
 * Mission outcome taxonomy (MISSIONS_EPIC §1.1, design spec §9.3). `aborted` is
 * produced by the retreat redesign (Iteration 6); until then the settlement maps
 * to the other four kinds.
 */
export type MissionOutcomeKind =
  | 'success'
  | 'partial-success'
  | 'aborted'
  | 'objective-failed-extracted'
  | 'destroyed';

/** Immutable sortie-settlement record driving aircraft/pilot history, Archive, reports. */
export interface MissionResultRecord {
  readonly id: string;
  readonly missionId: string;
  readonly missionType: string;        // baseline 'sweep'; full MissionType comes in Iteration 3
  readonly month: number;
  readonly aircraftId: string | null;
  readonly pilotId: string | null;
  readonly outcome: MissionOutcomeKind;
  readonly targetsDestroyed: number;
  readonly targetsBreached: number;
  readonly extracted: boolean;
  readonly wardenSignalDetected: boolean;
}

export type IntelConfidence = 'confirmed' | 'likely' | 'possible' | 'unknown';

/** Structured intelligence fact (MISSIONS_EPIC §8). */
export interface IntelFact {
  readonly id: string;
  readonly category: 'enemy' | 'weapon' | 'hazard' | 'objective' | 'reinforcement';
  /** Subject key — for now the target country id of the mission that produced it. */
  readonly subjectId: string;
  readonly confidence: IntelConfidence;
  readonly source: 'observation' | 'recon' | 'research' | 'council' | 'market';
}

export type PilotInjurySeverity = 'light' | 'medium' | 'severe';

export interface PilotInjuryState {
  readonly severity: PilotInjurySeverity;
  /** Full recovery months that remain at the current treatment speed. */
  readonly monthsRemaining: number;
  /** Treatment mode; null means the pilot is awaiting a treatment decision. */
  readonly treatment: 'outsource' | 'medical' | null;
}

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

export interface MonthReportState {
  readonly month: number;
  readonly income: number;
  readonly expenses: number;
  readonly breachPenalties: number;
  readonly net: number;
  readonly resolvedThreats: number;
  readonly totalThreats: number;
}

export interface ProductionJobState {
  readonly id: string;
  readonly projectId: string;
  readonly kind: 'equipment' | 'weapon' | 'upgrade' | 'aircraft' | 'aircraft-upgrade';
  readonly progress: number;
  readonly requiredProgress: number;
  /** Number of units produced when the job completes. */
  readonly quantity: number;
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
  readonly activePilotId: string | null;
  readonly aircraftInstances: Readonly<Record<string, AircraftInstanceMeta>>;
  readonly aircraftHistory: Readonly<Record<string, AircraftHistoryRecord>>;
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
  readonly researchedAircraftUpgradeIds: readonly string[];
  readonly manufacturedAircraftUpgradeIds: readonly string[];
  readonly manufacturedEquipmentIds: readonly string[];
  readonly equippedEquipmentId: string | null;
  readonly telemetryRecorded: boolean;
  readonly hangarSlots: readonly (string | null)[];
  readonly activeAircraftId: string | null;
  readonly month: number;
  readonly fueledAircraftIds: readonly string[];
  readonly threatMap: readonly MissionState[];
  readonly loans: readonly LoanState[];
  readonly marketWishlist: readonly string[];
  readonly aircraftLoadouts: Readonly<Record<string, readonly (string | null)[]>>;
  readonly weaponStock: Readonly<Record<string, number>>;
  readonly consumableStock: Readonly<Record<string, number>>;
  readonly aircraftModules: Readonly<Record<string, string | null>>;
  readonly aircraftHardpoints: Readonly<Record<string, readonly (string | null)[]>>;
  readonly aircraftMarks: Readonly<Record<string, number>>;
  readonly aircraftDamage: Readonly<Record<string, number>>;
  readonly aircraftRepair: Readonly<Record<string, number>>;
  readonly staffCandidates: readonly StaffCandidateState[];
  readonly staffXp: Readonly<Record<string, number>>;
  readonly constructionQueue: readonly ConstructionJobState[];
  readonly productionQueue: readonly ProductionJobState[];
  readonly resolvedThreatIds: readonly string[];
  readonly missionResults: readonly MissionResultRecord[];
  readonly intelFacts: readonly IntelFact[];
  readonly pilotCandidates: readonly PilotCandidateState[];
  readonly pilotXp: Readonly<Record<string, number>>;
  readonly pilotFatigue: Readonly<Record<string, number>>;
  readonly pilotInjuries: Readonly<Record<string, PilotInjuryState>>;
  readonly deadPilotIds: readonly string[];
  readonly pilotDeathMonth: Readonly<Record<string, number>>;
  readonly activeMissionId: string | null;
  readonly monthIncome: number;
  readonly monthReport: MonthReportState | null;
  readonly nationThanks: Readonly<Record<string, boolean>>;
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
