import { describe, expect, it } from 'vitest';
import { buildingById, buildingId, capabilityId } from '../../src/content/ids';
import { createInitialGameState } from '../../src/domain/initial-state';
import {
  availableConstructionDefinitions,
  capabilitiesForBuilding,
  hasOperationalCapability,
  isBuildingConstructed,
  isBuildingOperational,
  isStarterBuilding,
} from '../../src/domain/buildings';

describe('building capability selectors', () => {
  it('provisions the Command Centre and Hangar as operational starter buildings', () => {
    const base = createInitialGameState().base;
    expect(isBuildingOperational(base, buildingId.commandCentre)).toBe(true);
    expect(isBuildingOperational(base, buildingId.hangar)).toBe(true);
    expect(isBuildingConstructed(base, buildingId.researchCentre)).toBe(false);
    expect(isStarterBuilding(buildingId.commandCentre)).toBe(true);
    expect(isStarterBuilding(buildingId.hangar)).toBe(true);
    expect(isStarterBuilding(buildingId.researchCentre)).toBe(false);
  });

  it('reports capabilities provided by the operational starter buildings', () => {
    const base = createInitialGameState().base;
    expect(hasOperationalCapability(base, capabilityId.missionCommand)).toBe(true);
    expect(hasOperationalCapability(base, capabilityId.financialAdministration)).toBe(true);
    expect(hasOperationalCapability(base, capabilityId.aircraftStorage)).toBe(true);
    expect(hasOperationalCapability(base, capabilityId.loadout)).toBe(true);
    expect(hasOperationalCapability(base, capabilityId.research)).toBe(false);
    expect(hasOperationalCapability(base, capabilityId.production)).toBe(false);
  });

  it('grants capabilities only from operational buildings', () => {
    const base = createInitialGameState().base;
    expect(hasOperationalCapability(base, capabilityId.construction)).toBe(false);
    const withWorks = {
      ...base,
      constructedBuildingIds: [...base.constructedBuildingIds, buildingId.productionWorks],
    };
    expect(hasOperationalCapability(withWorks, capabilityId.construction)).toBe(true);
    expect(hasOperationalCapability(withWorks, capabilityId.production)).toBe(true);
  });

  it('maps building definitions to their capabilities', () => {
    expect(capabilitiesForBuilding(buildingId.commandCentre)).toEqual([
      capabilityId.missionCommand,
      capabilityId.financialAdministration,
    ]);
    expect(capabilitiesForBuilding(buildingId.hangar)).toEqual([
      capabilityId.aircraftStorage,
      capabilityId.loadout,
    ]);
    expect(capabilitiesForBuilding('building-does-not-exist')).toEqual([]);
  });

  it('excludes starter buildings and operational ones from the construction catalog', () => {
    const base = createInitialGameState().base;
    const ids = availableConstructionDefinitions(base).map((building) => building.id);
    expect(ids).not.toContain(buildingId.commandCentre);
    expect(ids).not.toContain(buildingId.hangar);
    expect(ids).toContain(buildingId.researchCentre);
    expect(buildingById(buildingId.commandCentre)).toBeDefined();
    expect(buildingById(buildingId.hangar)).toBeDefined();
  });
});
