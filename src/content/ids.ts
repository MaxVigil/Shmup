import type {
  AircraftDefinition,
  AircraftLoadoutEntry,
  AlienTechnologyDefinition,
  AmmunitionDefinition,
  AuxiliaryDefinition,
  BlueprintDefinition,
  BuildingDefinition,
  ConsumableDefinition,
  EquipmentDefinition,
  ModuleDefinition,
  StaffRoleDefinition,
  WeaponDefinition,
  WeaponFamilyDefinition,
} from './model';
import { contentCatalog } from './catalog';

/** Canonical, stable content IDs. Prefer these over positional catalog access. */
export const alienTechnologyId = {
  prism: 'alien-prism-unclassified',
} as const;
export const buildingId = {
  commandCentre: 'building-command-centre',
  hangar: 'building-hangar',
  researchCentre: 'building-research-centre',
  productionWorks: 'building-production-works',
  quarantineCentre: 'building-quarantine-centre',
  tradeCentre: 'building-trade-centre',
  medicalBlock: 'building-medical-block',
} as const;

export const capabilityId = {
  missionCommand: 'capability-mission-command',
  research: 'capability-research',
  construction: 'capability-construction',
  production: 'capability-production',
  aircraftStorage: 'capability-aircraft-storage',
  loadout: 'capability-loadout',
  itemStorage: 'capability-item-storage',
  staffRecruitment: 'capability-staff-recruitment',
  financialAdministration: 'capability-financial-administration',
  trade: 'capability-trade',
  medicalTreatment: 'capability-medical-treatment',
  alienContainment: 'capability-alien-containment',
} as const;

/** Permanent base infrastructure that is operational from day one and never constructed by the player. */
export const STARTER_BUILDING_IDS: readonly string[] = [
  buildingId.commandCentre,
  buildingId.hangar,
];

export const staffRoleId = {
  scientist: 'staff-scientist',
  engineer: 'staff-engineer',
  trader: 'staff-trader',
  manager: 'staff-manager',
  medic: 'staff-medic',
  repairMaster: 'staff-repair-master',
} as const;

export const weaponId = {
  pulseCannon: 'weapon-pulse-cannon',
  impulseAccelerator: 'weapon-impulse-accelerator',
  splitPulse: 'weapon-split-pulse',
  canisterCannon: 'weapon-canister-cannon',
  rocketPod: 'weapon-rocket-pod',
  disintegrationLance: 'weapon-disintegration-lance',
  plasmaOrbProjector: 'weapon-plasma-orb-projector',
  singularityProjector: 'weapon-singularity-projector',
} as const;

export const aircraftId = {
  india: 'aircraft-india',
  britain: 'aircraft-britain',
  prc: 'aircraft-prc',
  germany: 'aircraft-germany',
  usa: 'aircraft-usa',
  france: 'aircraft-france',
  japan: 'aircraft-japan',
} as const;

export const equipmentId = {
} as const;

export const blueprintId = {
} as const;

export const consumableId = {
  rockets: 'consumable-rockets',
} as const;

export function buildingById(id: string): BuildingDefinition | undefined {
  return contentCatalog.buildings.find((entry) => entry.id === id);
}

export function alienTechnologyById(
  id: string,
): AlienTechnologyDefinition | undefined {
  return contentCatalog.alienTechnologies.find((entry) => entry.id === id);
}

export function staffRoleById(id: string): StaffRoleDefinition | undefined {
  return contentCatalog.staffRoles.find((entry) => entry.id === id);
}

export function weaponById(id: string): WeaponDefinition | undefined {
  return contentCatalog.weapons.find((entry) => entry.id === id);
}

export function aircraftById(id: string): AircraftDefinition | undefined {
  return contentCatalog.aircraft.find((entry) => entry.id === id);
}

export function equipmentById(id: string): EquipmentDefinition | undefined {
  return contentCatalog.equipment.find((entry) => entry.id === id);
}

export function blueprintById(id: string): BlueprintDefinition | undefined {
  return contentCatalog.blueprints.find((entry) => entry.id === id);
}

export function consumableById(id: string): ConsumableDefinition | undefined {
  return contentCatalog.consumables.find((entry) => entry.id === id);
}

// ==== Weapons & Arsenal epic (E1): arsenal IDs and typed lookups ====

export const weaponFamilyId = {
  autocannon: 'weapon-autocannon',
  heavyAutocannon: 'weapon-heavy-autocannon',
  gatlingGun: 'weapon-gatling-gun',
  scatterCannon: 'weapon-scatter-cannon',
  railgun: 'weapon-railgun',
  flakCannon: 'weapon-flak-cannon',
  pulseLaser: 'weapon-pulse-laser',
  plasmaMachineGun: 'weapon-plasma-machine-gun',
  plasmaCannon: 'weapon-plasma-cannon',
  disintegrationLance: 'weapon-disintegration-lance',
  plasmaOrbProjector: 'weapon-plasma-orb-projector',
  singularityProjector: 'weapon-singularity-projector',
} as const;

export const auxiliaryId = {
  rocketPod: 'aux-rocket-pod',
  homingMissileRack: 'aux-homing-missile-rack',
  heavyTorpedoLauncher: 'aux-heavy-torpedo-launcher',
  clusterMissilePod: 'aux-cluster-missile-pod',
  ukrainianDroneSwarm: 'aux-ukrainian-drone-swarm',
  stunModule: 'aux-stun-module',
  flareDecoyLauncher: 'aux-flare-decoy-launcher',
  proximityMine: 'aux-proximity-mine',
} as const;

export const moduleId = {
  energyShield: 'module-energy-shield',
  directionalEnergyShield: 'module-directional-energy-shield',
  dash: 'module-dash',
  targetingComputer: 'module-targeting-computer',
  repairNanobots: 'module-repair-nanobots',
  reflectorField: 'module-reflector-field',
} as const;

export const ammunitionId = {
  rocket: 'consumable-rocket',
  homingMissile: 'consumable-homing-missile',
  heavyTorpedo: 'consumable-heavy-torpedo',
  clusterMissile: 'consumable-cluster-missile',
  ukrainianAttackDrone: 'consumable-ukrainian-attack-drone',
  flareDecoy: 'consumable-flare-decoy',
  proximityMine: 'consumable-proximity-mine',
} as const;

export const aircraftRole = {
  glassCannon: 'glass-cannon',
  gunship: 'gunship',
  bruiser: 'bruiser',
  precision: 'precision',
  duelist: 'duelist',
  interceptor: 'interceptor',
  workhorse: 'workhorse',
} as const;

export function weaponFamilyById(
  id: string,
): WeaponFamilyDefinition | undefined {
  return contentCatalog.weaponFamilies.find((entry) => entry.id === id);
}

export function auxiliaryById(id: string): AuxiliaryDefinition | undefined {
  return contentCatalog.auxiliary.find((entry) => entry.id === id);
}

export function moduleById(id: string): ModuleDefinition | undefined {
  return contentCatalog.modules.find((entry) => entry.id === id);
}

export function ammunitionById(id: string): AmmunitionDefinition | undefined {
  return contentCatalog.ammunition.find((entry) => entry.id === id);
}

export function aircraftLoadoutByAircraftId(
  aircraftId: string,
): AircraftLoadoutEntry | undefined {
  return contentCatalog.aircraftLoadouts.find(
    (entry) => entry.aircraftId === aircraftId,
  );
}

/** Concrete manufactured weapon item id for a family Mark (Mark I = base). */
export function weaponItemId(familyId: string, mark?: number): string {
  return mark === undefined || mark === 1
    ? familyId
    : `${familyId}-mk-${mark}`;
}
