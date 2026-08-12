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
  readonly visualProfile: 'machine-gun' | 'impulse-accelerator' | 'split-pulse' | 'canister-cannon';
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
  readonly telegraphMs: number;
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
  readonly requiredBlueprintId: string | null;
  readonly requiredBuildingId: string | null;
}

export interface StaffRoleDefinition {
  readonly id: string;
  readonly creditCost: number;
  readonly requiredBuildingId: string;
  readonly maximumHeadcount: number | null;
}

export interface BlueprintDefinition {
  readonly id: string;
  readonly researchDomain: 'earth' | 'alien';
  readonly requiredProgress: number;
  readonly requiredBuildingId: string;
  readonly requiredStaffRoleId: string;
  readonly outputEquipmentId: string;
}

export interface BuildingBlueprintDefinition {
  readonly id: string;
  readonly researchDomain: 'earth' | 'alien';
  readonly requiredProgress: number;
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
  readonly requiredProductionBuildingId: string;
  readonly requiredProductionStaffRoleId: string;
}

export interface ResearchWeaponBlueprintDefinition {
  readonly id: string;
  readonly researchDomain: 'earth' | 'alien';
  readonly requiredProgress: number;
  readonly requiredBuildingId: string;
  readonly requiredStaffRoleId: string;
  readonly outputWeaponId: string;
  readonly productionCreditCost: number;
  readonly productionMaterialCost: number;
  readonly requiredProductionBuildingId: string;
  readonly requiredProductionStaffRoleId: string;
}

export interface EquipmentDefinition {
  readonly id: string;
  readonly creditCost: number;
  readonly materialCost: number;
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
  readonly requiredBuildingId: string;
  readonly requiredStaffRoleId: string;
}

export interface WeaponUpgradeDefinition {
  readonly id: string;
  readonly weaponId: string;
  readonly researchCreditCost: number;
  readonly productionCreditCost: number;
  readonly productionMaterialCost: number;
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
}
