import type {
  AircraftDefinition,
  AlienTechnologyDefinition,
  BlueprintDefinition,
  BuildingDefinition,
  ConsumableDefinition,
  EquipmentDefinition,
  StaffRoleDefinition,
  WeaponDefinition,
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
  alienTechnologyCapturer: 'equipment-alien-technology-capturer',
} as const;

export const blueprintId = {
  alienTechnologyCapturer: 'blueprint-alien-technology-capturer',
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
