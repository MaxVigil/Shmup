import type { BaseCapabilityId, BuildingDefinition } from '../content/model';
import { contentCatalog } from '../content/catalog';
import { STARTER_BUILDING_IDS } from '../content/ids';
import type { BaseState } from './model';

/** True when the building id appears in the constructed set. */
export function isBuildingConstructed(base: BaseState, buildingId: string): boolean {
  return base.constructedBuildingIds.includes(buildingId);
}

/** True when the building is operational (constructed and, later, powered). */
export function isBuildingOperational(base: BaseState, buildingId: string): boolean {
  return isBuildingConstructed(base, buildingId);
}

/** True when the building is permanent starter infrastructure (never constructed). */
export function isStarterBuilding(buildingId: string): boolean {
  return STARTER_BUILDING_IDS.includes(buildingId);
}

/**
 * Building definitions the player may construct next: not already operational
 * and not permanent starter infrastructure.
 */
export function availableConstructionDefinitions(
  base: BaseState,
): readonly BuildingDefinition[] {
  return contentCatalog.buildings.filter(
    (building) => !isStarterBuilding(building.id) && !isBuildingOperational(base, building.id),
  );
}

/** True when at least one operational building provides the capability. */
export function hasOperationalCapability(
  base: BaseState,
  capability: BaseCapabilityId,
): boolean {
  return contentCatalog.buildings.some(
    (building) =>
      building.capabilities.some((capabilityId) => capabilityId === capability) &&
      isBuildingOperational(base, building.id),
  );
}

/** Capabilities a building definition provides. */
export function capabilitiesForBuilding(
  buildingId: string,
): readonly BaseCapabilityId[] {
  return contentCatalog.buildings.find((entry) => entry.id === buildingId)?.capabilities ?? [];
}
