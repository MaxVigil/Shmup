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

export interface EnemyRangedProfile {
  readonly shotDamage: number;
  readonly shotSpeed: number;
  readonly shotIntervalMs: number;
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

export interface BuildingDefinition {
  readonly id: string;
  readonly creditCost: number;
  readonly materialCost: number;
  readonly constructionSorties: number;
  readonly maintenanceCreditCost: number;
  readonly requiredBlueprintId: string | null;
  readonly requiredBuildingId: string | null;
}

export interface StaffRoleDefinition {
  readonly id: string;
  readonly creditCost: number;
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
}

export interface AircraftDefinition {
  readonly id: string;
  readonly name: string;
  readonly role: string;
  readonly origin: 'earth' | 'alien' | 'hybrid';
  readonly armour: number;
  readonly speedMultiplier: number;
  readonly damageMultiplier: number;
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

export interface MissionState {
  readonly id: string;
  readonly targetCountryId: string;
  readonly threatLevel: number;
}

export interface WeaponUpgradeDefinition {
  readonly id: string;
  readonly weaponId: string;
  readonly researchCreditCost: number;
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
  readonly councilStates: readonly CouncilStateDefinition[];
  readonly consumables: readonly ConsumableDefinition[];
}
