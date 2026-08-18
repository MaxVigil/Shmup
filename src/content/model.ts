export type AlienTechnologyCategory = 'offence' | 'defence' | 'utility';

export interface WeaponDefinition {
  readonly id: string;
  readonly name: string;
  readonly origin: 'earth' | 'alien';
  readonly damage: number;
  readonly shotsPerSecond: number;
  readonly projectileCount: number;
  readonly projectileSpeed: number;
  readonly spread: number;
  readonly penetration: 'single-target' | 'all-targets';
  readonly visualProfile: 'machine-gun' | 'impulse-accelerator' | 'split-pulse' | 'canister-cannon' | 'rocket-pod';
  readonly marketPrice: {
    readonly minimum: number;
    readonly maximum: number;
  } | null;
}

export interface AlienTechnologyDefinition {
  readonly id: string;
  readonly codename: string;
  readonly category: AlienTechnologyCategory;
  readonly danger: 1 | 2 | 3 | 4 | 5;
  readonly reliability: 1 | 2 | 3 | 4 | 5;
  readonly signalGlyphs: string;
  readonly preservationResearch: number;
  readonly passiveEffect: {
    readonly id: string;
    readonly name: string;
    readonly armourDamageMultiplier: number;
  };
  readonly weaponTransformation: {
    readonly id: string;
    readonly name: string;
    readonly projectileCount: number;
    readonly damageMultiplier: number;
    readonly spread: number;
  };
}

export interface PilotDefinition {
  readonly id: string;
  readonly callsign: string;
  readonly speedMultiplier: number;
  readonly damageMultiplier: number;
}

export type EnemyMovementPattern = 'straight' | 'sine';

export interface EnemyHomingProfile {
  readonly shotDamage: number;
  readonly shotSpeed: number;
  readonly turnRateDegPerSec: number;
  readonly lifetimeMs: number;
  readonly volleySize: number;
  readonly volleyIntervalMs: number;
}

export interface EnemyRangedProfile {
  readonly shotDamage: number;
  readonly shotSpeed: number;
  readonly shotIntervalMs: number;
  /** Optional self-guided missile volley fired instead of the aimed shot. */
  readonly homing?: EnemyHomingProfile;
}

export interface EnemyDefinition {
  readonly id: string;
  readonly name: string;
  readonly armour: number;
  readonly speed: number;
  readonly contactDamage: number;
  readonly score: number;
  readonly movementPattern: EnemyMovementPattern;
  readonly kind: 'regular' | 'elite';
  readonly materialReward: number;
  readonly creditReward: number;
  readonly ranged: EnemyRangedProfile | null;
}

export interface BaseEconomyDefinition {
  readonly startingCredits: number;
  readonly missedEnemyPenaltyMultiplier: number;
}

export type BaseCapabilityId =
  | 'capability-mission-command'
  | 'capability-research'
  | 'capability-construction'
  | 'capability-production'
  | 'capability-aircraft-storage'
  | 'capability-loadout'
  | 'capability-item-storage'
  | 'capability-staff-recruitment'
  | 'capability-financial-administration'
  | 'capability-trade'
  | 'capability-medical-treatment'
  | 'capability-alien-containment';

export interface BuildingDefinition {
  readonly id: string;
  readonly creditCost: number;
  readonly materialCost: number;
  readonly constructionSorties: number;
  readonly maintenanceCreditCost: number;
  readonly requiredBlueprintId: string | null;
  readonly requiredBuildingId: string | null;
  /** Gameplay capabilities this building provides while operational. */
  readonly capabilities: readonly BaseCapabilityId[];
}

export interface StaffRoleDefinition {
  readonly id: string;
  readonly creditCost: number;
  readonly salaryCreditCost: number;
  readonly requiredBuildingId: string | null;
  readonly maximumHeadcount: number | null;
}

export interface BlueprintDefinition {
  readonly id: string;
  readonly researchDomain: 'earth' | 'alien';
  readonly requiredProgress: number;
  readonly researchCreditCost: number;
  readonly requiredBuildingId: string;
  readonly requiredStaffRoleId: string;
  readonly outputEquipmentId: string;
}

export interface BuildingBlueprintDefinition {
  readonly id: string;
  readonly researchDomain: 'earth' | 'alien';
  readonly requiredProgress: number;
  readonly researchCreditCost: number;
  readonly requiredBuildingId: string;
  readonly requiredStaffRoleId: string;
  readonly outputBuildingId: string;
}

export interface AdaptedWeaponBlueprintDefinition {
  readonly id: string;
  readonly researchDomain: 'earth' | 'alien';
  readonly outputWeaponId: string;
  readonly productionCreditCost: number;
  readonly productionMaterialCost: number;
  readonly productionSorties: number;
  readonly requiredProductionBuildingId: string;
  readonly requiredProductionStaffRoleId: string;
}

export interface ResearchWeaponBlueprintDefinition {
  readonly id: string;
  readonly researchDomain: 'earth' | 'alien';
  readonly requiredProgress: number;
  readonly researchCreditCost: number;
  readonly requiredBuildingId: string;
  readonly requiredStaffRoleId: string;
  readonly outputWeaponId: string;
  readonly productionCreditCost: number;
  readonly productionMaterialCost: number;
  readonly productionSorties: number;
  readonly requiredProductionBuildingId: string;
  readonly requiredProductionStaffRoleId: string;
}

export interface EquipmentDefinition {
  readonly id: string;
  readonly creditCost: number;
  readonly materialCost: number;
  readonly productionSorties: number;
  readonly requiredBuildingId: string;
  readonly requiredStaffRoleId: string;
}

export interface MarketWeaponBlueprintDefinition {
  readonly id: string;
  readonly weaponId: string;
  readonly minimumSorties: number;
  readonly marketPrice: {
    readonly minimum: number;
    readonly maximum: number;
  };
  readonly productionCreditCost: number;
  readonly productionMaterialCost: number;
  readonly productionSorties: number;
  readonly requiredBuildingId: string;
  readonly requiredStaffRoleId: string;
}

export interface AircraftVisualDefinition {
  readonly hullColor: number;
  readonly accentColor: number;
  /** Centered polygon points [x0,y0,x1,y1,…] in a 40-unit box, nose pointing up (−y). */
  readonly silhouette: readonly number[];
  /** Optional top-down image (public path); overrides the procedural silhouette. */
  readonly imageUrl?: string;
}

export interface AircraftDefinition {
  readonly id: string;
  readonly name: string;
  readonly role: string;
  readonly origin: 'earth' | 'alien' | 'hybrid';
  readonly armour: number;
  readonly speedMultiplier: number;
  readonly damageMultiplier: number;
  /** Independent cadence multiplier for every equipped automatic weapon. */
  readonly fireRateMultiplier: number;
  /** Independent projectile speed multiplier. */
  readonly projectileSpeedMultiplier: number;
  readonly refuelCreditCost: number;
  readonly weaponSlotCount: number;
  readonly supplierCountryId: string;
  readonly visual: AircraftVisualDefinition;
  readonly marketPrice: {
    readonly minimum: number;
    readonly maximum: number;
  } | null;
}

export interface ConsumableDefinition {
  readonly id: string;
  readonly nameKey: string;
  readonly creditCost: number;
  readonly materialCost: number;
  readonly chargesPerSortie?: number;
  readonly marketPrice: {
    readonly minimum: number;
    readonly maximum: number;
  } | null;
}

export interface CouncilStateDefinition {
  readonly id: string;
  readonly nameKey: string;
}

export interface NationGiftDefinition {
  readonly credits: number;
  readonly materials: number;
}

export interface MissionState {
  readonly id: string;
  readonly targetCountryId: string;
  readonly threatLevel: number;
}

export interface WeaponUpgradeDefinition {
  readonly id: string;
  readonly weaponId: string;
  readonly researchCreditCost: number;
  readonly researchSorties: number;
  readonly productionCreditCost: number;
  readonly productionMaterialCost: number;
  readonly productionSorties: number;
  readonly requiredResearchBuildingId: string;
  readonly requiredStaffRoleId: string;
  readonly requiredProductionBuildingId: string;
  readonly requiredProductionStaffRoleId: string;
  readonly requiredBlueprintId: string | null;
  readonly requiredLocallyProducedWeaponId: string | null;
  readonly damageMultiplier: number;
  readonly cadenceMultiplier: number;
}

/** A market-purchasable aircraft blueprint; owning it unlocks local
 *  manufacturing of the aircraft and its upgrade line (Mark II / III). */
export interface AircraftBlueprintDefinition {
  readonly id: string;
  readonly outputAircraftId: string;
  readonly minimumSorties: number;
  readonly marketPrice: {
    readonly minimum: number;
    readonly maximum: number;
  };
  readonly productionCreditCost: number;
  readonly productionMaterialCost: number;
  readonly productionSorties: number;
  readonly requiredBuildingId: string;
  readonly requiredStaffRoleId: string;
}

/** One upgrade tier (Mark II / Mark III) for a locally-produced aircraft line.
 *  Researched in the laboratory, then manufactured in the workshop. */
export interface AircraftUpgradeDefinition {
  readonly id: string;
  readonly aircraftBlueprintId: string;
  readonly tier: 1 | 2;
  readonly researchCreditCost: number;
  readonly researchSorties: number;
  readonly productionCreditCost: number;
  readonly productionMaterialCost: number;
  readonly productionSorties: number;
  readonly requiredResearchBuildingId: string;
  readonly requiredStaffRoleId: string;
  readonly requiredProductionBuildingId: string;
  readonly requiredProductionStaffRoleId: string;
  readonly armourDelta: number;
  readonly speedMultiplierDelta: number;
  readonly damageMultiplierDelta: number;
  /** Reserved for a unique per-aircraft Mark III effect; designed later. */
  readonly signatureId: string | null;
}

// ==== Weapons & Arsenal epic (E1): data-driven arsenal model ====

export type LocalizedText = {
  readonly en: string;
  readonly uk: string;
  readonly zh: string;
};

export type WeaponClass = 'human' | 'hybrid' | 'alien';
export type TechnologyFamily =
  | 'human-kinetic'
  | 'hybrid-laser'
  | 'hybrid-plasma'
  | 'alien';
export type MountType = 'primary' | 'hardpoint';
export type Kind = 'weapon' | 'auxiliary' | 'module';
export type AuxiliaryType =
  | 'rocket'
  | 'homing'
  | 'torpedo'
  | 'cluster'
  | 'drone'
  | 'stun'
  | 'mine'
  | 'decoy';
export type ModuleType =
  | 'shield'
  | 'dash'
  | 'targeting'
  | 'repair'
  | 'reflector'
  | 'other';
export type Penetration = 'single-target' | 'all-targets';
export type Acquisition =
  | 'start'
  | 'market'
  | 'research-production'
  | 'alien-recovery';

/** Numeric, executable per-Mark stat overrides (not prose). */
export interface WeaponStatOverrides {
  readonly damage?: number;
  readonly shotsPerSecond?: number;
  readonly projectileCount?: number;
  readonly projectileSpeed?: number;
  readonly spreadDegrees?: number;
  readonly energyDraw?: number;
  readonly weight?: number;
}

export interface MarkDefinition {
  readonly mark: number; // 2..N; Mark I is the base item itself
  readonly researchCostCredits: number;
  readonly productionCostCredits: number;
  readonly productionCostMaterials: number;
  readonly statOverrides: WeaponStatOverrides;
  readonly flavour?: LocalizedText;
}

/** A weapon family (e.g. Autocannon). Concrete items derive as
 *  `${family.id}-mk-${mark}` with stats = baseStats + statOverrides. */
export interface WeaponFamilyDefinition {
  readonly id: string;
  readonly name: LocalizedText;
  readonly class: WeaponClass;
  readonly technologyFamily: TechnologyFamily;
  readonly mount: 'primary';
  readonly kind: 'weapon';
  readonly baseStats: {
    readonly damage: number;
    readonly shotsPerSecond: number;
    readonly projectileCount: number;
    readonly projectileSpeed: number;
    readonly spreadDegrees: number;
    readonly penetration: Penetration;
  };
  readonly weight: number;
  readonly energyDraw: number;
  readonly acquisition: Acquisition;
  readonly tier: number;
  readonly marks: readonly MarkDefinition[]; // alien ⇒ []
  readonly flavour?: LocalizedText;
}

export interface AuxiliaryDefinition {
  readonly id: string;
  readonly name: LocalizedText;
  readonly class: WeaponClass;
  readonly technologyFamily: TechnologyFamily;
  readonly mount: 'hardpoint';
  readonly kind: 'auxiliary';
  readonly type: AuxiliaryType;
  readonly ammoConsumableId: string | null; // null for stun
  readonly chargesPerSortieMin: number;
  readonly chargesPerSortieMax: number;
  readonly trigger: 'manual' | 'automatic';
  readonly damage: number;
  readonly areaRadius: number;
  readonly stunDurationSeconds: number;
  readonly weight: number;
  readonly energyDraw: number;
  readonly acquisition: Acquisition;
  readonly flavour?: LocalizedText;
}

export interface ModuleDefinition {
  readonly id: string;
  readonly name: LocalizedText;
  readonly class: WeaponClass; // may be 'alien' (recovered)
  readonly technologyFamily: TechnologyFamily;
  readonly mount: 'hardpoint';
  readonly kind: 'module';
  readonly type: ModuleType;
  readonly weight: number;
  readonly energyDraw: number;
  readonly effect: {
    readonly description: string;
    readonly params: Record<string, number>;
  };
  readonly acquisition: Acquisition;
  readonly flavour?: LocalizedText;
}

export interface AmmunitionDefinition {
  readonly id: string;
  readonly name: LocalizedText;
  readonly weightPerUnit: number;
  readonly costCredits: number;
  readonly usedBy: readonly string[]; // auxiliary ids
}

export type AircraftRole =
  | 'glass-cannon'
  | 'gunship'
  | 'bruiser'
  | 'precision'
  | 'duelist'
  | 'interceptor'
  | 'workhorse';

export interface AircraftMultipliers {
  readonly damageMultiplier: number;
  readonly fireRateMultiplier: number;
  readonly accuracyMultiplier: number;
}

export interface AircraftBaseStats {
  readonly armour: number;
  readonly speedMultiplier: number;
  readonly baseMultipliers: AircraftMultipliers; // identity, hand-set
}

export interface AircraftLoadoutModel {
  readonly primarySlots: 1 | 2 | 3;
  readonly hardpointSlots: number;
  readonly reactorCapacity: number; // energy, scale 1–10
  readonly carryingCapacity: number; // weight
}

export interface AircraftMarkUpgrade {
  readonly mark: 2 | 3;
  readonly name: LocalizedText;
  readonly statDeltas: { // additive to base, role-aligned
    readonly armour?: number;
    readonly speedMultiplier?: number;
    readonly damageMultiplier?: number;
    readonly fireRateMultiplier?: number;
    readonly accuracyMultiplier?: number;
    readonly reactorCapacity?: number;
    readonly hardpointSlots?: number;
    readonly carryingCapacity?: number;
  };
  readonly researchCostCredits: number;
  readonly productionCostCredits: number;
  readonly productionCostMaterials: number;
  readonly flavour?: LocalizedText;
}

/** Parallel loadout model for an existing aircraft (E1 additive section;
 *  folded into AircraftDefinition when the loadout system is wired in E2). */
export interface AircraftLoadoutEntry {
  readonly aircraftId: string;
  readonly role: AircraftRole;
  readonly baseStats: AircraftBaseStats;
  readonly loadout: AircraftLoadoutModel;
  readonly marks: readonly AircraftMarkUpgrade[];
}

export interface ContentCatalog {
  readonly weapons: readonly WeaponDefinition[];
  readonly alienTechnologies: readonly AlienTechnologyDefinition[];
  readonly pilots: readonly PilotDefinition[];
  readonly enemies: readonly EnemyDefinition[];
  readonly economy: BaseEconomyDefinition;
  readonly buildings: readonly BuildingDefinition[];
  readonly staffRoles: readonly StaffRoleDefinition[];
  readonly blueprints: readonly BlueprintDefinition[];
  readonly buildingBlueprints: readonly BuildingBlueprintDefinition[];
  readonly adaptedWeaponBlueprints: readonly AdaptedWeaponBlueprintDefinition[];
  readonly researchWeaponBlueprints: readonly ResearchWeaponBlueprintDefinition[];
  readonly equipment: readonly EquipmentDefinition[];
  readonly marketWeaponBlueprints: readonly MarketWeaponBlueprintDefinition[];
  readonly weaponUpgrades: readonly WeaponUpgradeDefinition[];
  readonly aircraft: readonly AircraftDefinition[];
  readonly aircraftBlueprints: readonly AircraftBlueprintDefinition[];
  readonly aircraftUpgrades: readonly AircraftUpgradeDefinition[];
  readonly councilStates: readonly CouncilStateDefinition[];
  readonly nationGifts: Readonly<Record<string, NationGiftDefinition>>;
  readonly consumables: readonly ConsumableDefinition[];
  readonly weaponFamilies: readonly WeaponFamilyDefinition[];
  readonly auxiliary: readonly AuxiliaryDefinition[];
  readonly modules: readonly ModuleDefinition[];
  readonly ammunition: readonly AmmunitionDefinition[];
  readonly aircraftLoadouts: readonly AircraftLoadoutEntry[];
}
