export type AlienTechnologyCategory = 'offence' | 'defence' | 'utility';

export interface WeaponDefinition {
  readonly id: string;
  readonly name: string;
  readonly damage: number;
  readonly shotsPerSecond: number;
}

export interface AlienTechnologyDefinition {
  readonly id: string;
  readonly codename: string;
  readonly category: AlienTechnologyCategory;
  readonly danger: 1 | 2 | 3 | 4 | 5;
  readonly reliability: 1 | 2 | 3 | 4 | 5;
}

export interface PilotDefinition {
  readonly id: string;
  readonly callsign: string;
  readonly speedMultiplier: number;
  readonly damageMultiplier: number;
}

export type EnemyMovementPattern = 'straight' | 'sine';

export interface EnemyDefinition {
  readonly id: string;
  readonly name: string;
  readonly armour: number;
  readonly speed: number;
  readonly contactDamage: number;
  readonly score: number;
  readonly movementPattern: EnemyMovementPattern;
}

export interface ContentCatalog {
  readonly weapons: readonly WeaponDefinition[];
  readonly alienTechnologies: readonly AlienTechnologyDefinition[];
  readonly pilots: readonly PilotDefinition[];
  readonly enemies: readonly EnemyDefinition[];
}
