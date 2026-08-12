import { createInitialGameState } from '../domain/initial-state';
import { contentCatalog } from '../content/catalog';
import { constructBuilding, hireStaff } from '../domain/base-development';
import {
  advanceBlueprintResearch,
  manufactureEquipment,
  startBlueprintResearch,
} from '../domain/blueprint-progression';
import type { GameState, SortieOutcome } from '../domain/model';
import { equipSpecialEquipment } from '../domain/equipment-loadout';
import { settleSortie } from '../domain/sortie';
import { purchaseMarketWeapon } from '../domain/terrestrial-market';
import {
  manufacturePrimaryWeapon,
  manufactureWeaponUpgrade,
  purchaseMarketBlueprint,
  researchWeaponUpgrade,
} from '../domain/terrestrial-production';
import { equipPrimaryWeapon, researchTechnology } from '../domain/technology-progression';

export type GameCommand =
  | { readonly type: 'RESET' }
  | { readonly type: 'SETTLE_SORTIE'; readonly outcome: SortieOutcome }
  | { readonly type: 'RESEARCH_TECHNOLOGY'; readonly technologyId: string }
  | { readonly type: 'PURCHASE_MARKET_WEAPON'; readonly weaponId: string }
  | { readonly type: 'PURCHASE_MARKET_BLUEPRINT'; readonly blueprintId: string }
  | { readonly type: 'MANUFACTURE_PRIMARY_WEAPON'; readonly blueprintId: string }
  | { readonly type: 'RESEARCH_WEAPON_UPGRADE'; readonly upgradeId: string }
  | { readonly type: 'MANUFACTURE_WEAPON_UPGRADE'; readonly upgradeId: string }
  | {
      readonly type: 'EQUIP_PRIMARY_WEAPON';
      readonly weaponId: string;
      readonly slotIndex: 0 | 1;
    }
  | { readonly type: 'CONSTRUCT_BUILDING'; readonly buildingId: string }
  | { readonly type: 'HIRE_STAFF'; readonly roleId: string }
  | { readonly type: 'START_BLUEPRINT_RESEARCH'; readonly blueprintId: string }
  | {
      readonly type: 'START_BUILDING_BLUEPRINT_RESEARCH';
      readonly blueprintId: string;
    }
  | { readonly type: 'MANUFACTURE_EQUIPMENT'; readonly equipmentId: string }
  | { readonly type: 'EQUIP_SPECIAL_EQUIPMENT'; readonly equipmentId: string | null };

export type GameStateListener = (state: GameState) => void;

export interface GameStore {
  getSnapshot(): GameState;
  dispatch(command: GameCommand): void;
  subscribe(listener: GameStateListener): () => void;
}

export function createGameStore(initialState = createInitialGameState()): GameStore {
  let state = initialState;
  const listeners = new Set<GameStateListener>();

  function emit(): void {
    for (const listener of listeners) {
      listener(state);
    }
  }

  return {
    getSnapshot(): GameState {
      return state;
    },

    dispatch(command: GameCommand): void {
      switch (command.type) {
        case 'RESET':
          state = createInitialGameState();
          break;
        case 'SETTLE_SORTIE':
          state = {
            ...state,
            base: settleSortie(state.base, command.outcome),
            activeRun: null,
          };
          state = advanceBlueprintResearch(state, contentCatalog.staffRoles[0].id);
          break;
        case 'RESEARCH_TECHNOLOGY': {
          const technology = contentCatalog.alienTechnologies.find(
            (entry) => entry.id === command.technologyId,
          );
          if (technology === undefined) {
            throw new Error(`Unknown alien technology ${command.technologyId}.`);
          }
          const laboratory = contentCatalog.buildings[0];
          const scientistRole = contentCatalog.staffRoles[0];
          const quarantine = contentCatalog.buildings.find(
            (entry) => entry.id === 'building-quarantine-centre',
          );
          if (quarantine === undefined) {
            throw new Error('Quarantine Centre is not defined in the content catalogue.');
          }
          state = researchTechnology(state, technology, {
            buildingId: laboratory.id,
            staffRoleId: scientistRole.id,
            containmentBuildingId: quarantine.id,
          });
          break;
        }
        case 'PURCHASE_MARKET_WEAPON': {
          const weapon = contentCatalog.weapons.find((entry) => entry.id === command.weaponId);
          if (weapon === undefined) {
            throw new Error(`Unknown market weapon ${command.weaponId}.`);
          }
          state = purchaseMarketWeapon(state, weapon);
          break;
        }
        case 'PURCHASE_MARKET_BLUEPRINT': {
          const blueprint = contentCatalog.marketWeaponBlueprints.find(
            (entry) => entry.id === command.blueprintId,
          );
          if (blueprint === undefined) {
            throw new Error(`Unknown market blueprint ${command.blueprintId}.`);
          }
          state = purchaseMarketBlueprint(state, blueprint);
          break;
        }
        case 'MANUFACTURE_PRIMARY_WEAPON': {
          const blueprint = contentCatalog.marketWeaponBlueprints.find(
            (entry) => entry.id === command.blueprintId,
          );
          if (blueprint === undefined) {
            throw new Error(`Unknown production blueprint ${command.blueprintId}.`);
          }
          state = manufacturePrimaryWeapon(state, blueprint);
          break;
        }
        case 'RESEARCH_WEAPON_UPGRADE': {
          const upgrade = contentCatalog.weaponUpgrades.find(
            (entry) => entry.id === command.upgradeId,
          );
          if (upgrade === undefined) {
            throw new Error(`Unknown weapon upgrade ${command.upgradeId}.`);
          }
          state = researchWeaponUpgrade(state, upgrade);
          break;
        }
        case 'MANUFACTURE_WEAPON_UPGRADE': {
          const upgrade = contentCatalog.weaponUpgrades.find(
            (entry) => entry.id === command.upgradeId,
          );
          if (upgrade === undefined) {
            throw new Error(`Unknown weapon upgrade ${command.upgradeId}.`);
          }
          state = manufactureWeaponUpgrade(state, upgrade);
          break;
        }
        case 'EQUIP_PRIMARY_WEAPON':
          state = equipPrimaryWeapon(state, command.weaponId, command.slotIndex);
          break;
        case 'CONSTRUCT_BUILDING': {
          const building = contentCatalog.buildings.find(
            (entry) => entry.id === command.buildingId,
          );
          if (building === undefined) {
            throw new Error(`Unknown building ${command.buildingId}.`);
          }
          state = constructBuilding(state, building);
          break;
        }
        case 'HIRE_STAFF': {
          const role = contentCatalog.staffRoles.find((entry) => entry.id === command.roleId);
          if (role === undefined) {
            throw new Error(`Unknown staff role ${command.roleId}.`);
          }
          state = hireStaff(state, role);
          break;
        }
        case 'START_BLUEPRINT_RESEARCH': {
          const blueprint = contentCatalog.blueprints.find(
            (entry) => entry.id === command.blueprintId,
          );
          if (blueprint === undefined) {
            throw new Error(`Unknown blueprint ${command.blueprintId}.`);
          }
          state = startBlueprintResearch(state, blueprint);
          break;
        }
        case 'START_BUILDING_BLUEPRINT_RESEARCH': {
          const blueprint = contentCatalog.buildingBlueprints.find(
            (entry) => entry.id === command.blueprintId,
          );
          if (blueprint === undefined) {
            throw new Error(`Unknown building blueprint ${command.blueprintId}.`);
          }
          state = startBlueprintResearch(state, blueprint);
          break;
        }
        case 'MANUFACTURE_EQUIPMENT': {
          const equipment = contentCatalog.equipment.find(
            (entry) => entry.id === command.equipmentId,
          );
          const blueprint = contentCatalog.blueprints.find(
            (entry) => entry.outputEquipmentId === command.equipmentId,
          );
          if (equipment === undefined || blueprint === undefined) {
            throw new Error(`Unknown manufactured equipment ${command.equipmentId}.`);
          }
          state = manufactureEquipment(state, blueprint, equipment);
          break;
        }
        case 'EQUIP_SPECIAL_EQUIPMENT':
          state = equipSpecialEquipment(state, command.equipmentId);
          break;
      }

      emit();
    },

    subscribe(listener: GameStateListener): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
