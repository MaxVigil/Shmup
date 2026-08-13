import { createInitialGameState } from '../domain/initial-state';
import {
  HANGAR_SLOT_COST,
  marketAircraftPrice,
  purchaseAircraft,
  purchaseHangarSlot,
  setActiveAircraft,
} from '../domain/hangar';
import {
  consumeAircraftFuel,
  generateThreatMap,
  monthForSorties,
  refuelAircraft,
} from '../domain/command-centre';
import { LOAN_OFFERS, settleDueLoans, takeLoan } from '../domain/credit';
import {
  addConsumables,
  installModule,
  removeModule,
  removeWeapon,
  syncActiveLoadout,
} from '../domain/armory';
import {
  advanceRepairs,
  applySortieDamage,
  isAircraftRepairing,
  startRepair,
} from '../domain/aircraft-integrity';
import { awardStaffXp, generateStaffCandidates, hireCandidate } from '../domain/staff-market';
import { marketConsumablePrice } from '../domain/terrestrial-market';
import { contentCatalog } from '../content/catalog';
import { constructBuilding, hireStaff } from '../domain/base-development';
import {
  advanceBlueprintResearch,
  manufactureEquipment,
  startBlueprintResearch,
} from '../domain/blueprint-progression';
import type { GameState, SortieOutcome } from '../domain/model';
import { settleSortie } from '../domain/sortie';
import { purchaseMarketWeapon } from '../domain/terrestrial-market';
import {
  manufacturePrimaryWeapon,
  manufactureWeaponUpgrade,
  purchaseMarketBlueprint,
  researchWeaponUpgrade,
} from '../domain/terrestrial-production';
import {
  equipPrimaryWeapon,
  manufactureAdaptedWeapon,
  researchTechnology,
} from '../domain/technology-progression';

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
      readonly slotIndex: number;
    }
  | { readonly type: 'CONSTRUCT_BUILDING'; readonly buildingId: string }
  | { readonly type: 'HIRE_STAFF'; readonly roleId: string }
  | { readonly type: 'START_BLUEPRINT_RESEARCH'; readonly blueprintId: string }
  | {
      readonly type: 'START_BUILDING_BLUEPRINT_RESEARCH';
      readonly blueprintId: string;
    }
  | {
      readonly type: 'MANUFACTURE_ADAPTED_WEAPON';
      readonly blueprintId: string;
    }
  | {
      readonly type: 'START_RESEARCH_WEAPON_BLUEPRINT';
      readonly blueprintId: string;
    }
  | {
      readonly type: 'MANUFACTURE_RESEARCH_WEAPON';
      readonly blueprintId: string;
    }
  | { readonly type: 'PURCHASE_AIRCRAFT'; readonly aircraftId: string }
  | { readonly type: 'PURCHASE_HANGAR_SLOT' }
  | { readonly type: 'SET_ACTIVE_AIRCRAFT'; readonly aircraftId: string | null }
  | { readonly type: 'REFUEL_AIRCRAFT'; readonly aircraftId: string }
  | { readonly type: 'TAKE_LOAN'; readonly lenderId: string }
  | {
      readonly type: 'UNEQUIP_PRIMARY_WEAPON';
      readonly slotIndex: number;
    }
  | { readonly type: 'HIRE_CANDIDATE'; readonly candidateId: string }
  | {
      readonly type: 'REPAIR_AIRCRAFT';
      readonly aircraftId: string;
      readonly emergency: boolean;
    }
  | {
      readonly type: 'APPLY_SORTIE_DAMAGE';
      readonly aircraftId: string | null;
      readonly armourLostRatio: number;
    }
  | { readonly type: 'PURCHASE_CONSUMABLE'; readonly consumableId: string }
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
        case 'SETTLE_SORTIE': {
          const settled = settleSortie(state.base, command.outcome);
          const nextMonth = monthForSorties(settled.sortiesCompleted);
          const afterFuel = consumeAircraftFuel(settled, state.base.activeAircraftId);
          const afterLoans = settleDueLoans({ ...afterFuel, month: nextMonth });
          const afterRepairs = advanceRepairs({ ...afterLoans, month: nextMonth });
          const afterStaffXp = awardStaffXp(afterRepairs);
          state = {
            ...state,
            base: {
              ...afterStaffXp,
              telemetryRecorded:
                state.base.telemetryRecorded || command.outcome.wardenSignalDetected,
              month: nextMonth,
              threatMap: nextMonth > state.base.month
                ? generateThreatMap(
                    contentCatalog.councilStates,
                    state.base.marketSeed,
                    nextMonth,
                  )
                : state.base.threatMap,
              staffCandidates: nextMonth > state.base.month
                ? generateStaffCandidates(
                    contentCatalog.staffRoles,
                    state.base.marketSeed,
                    nextMonth,
                  )
                : state.base.staffCandidates,
            },
            activeRun: null,
          };
          state = advanceBlueprintResearch(state, contentCatalog.staffRoles[0].id);
          break;
        }
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
          const adaptedBlueprint = contentCatalog.adaptedWeaponBlueprints[0];
          state = researchTechnology(state, technology, {
            buildingId: laboratory.id,
            staffRoleId: scientistRole.id,
            containmentBuildingId: quarantine.id,
            adaptedBlueprintId: adaptedBlueprint.id,
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
          if (
            blueprint.id === contentCatalog.blueprints[0].id &&
            !state.base.telemetryRecorded
          ) {
            throw new Error(`Blueprint ${blueprint.id} requires Warden telemetry.`);
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
        case 'MANUFACTURE_ADAPTED_WEAPON': {
          const blueprint = contentCatalog.adaptedWeaponBlueprints.find(
            (entry) => entry.id === command.blueprintId,
          );
          if (blueprint === undefined) {
            throw new Error(`Unknown adapted weapon blueprint ${command.blueprintId}.`);
          }
          const weapon = contentCatalog.weapons.find(
            (entry) => entry.id === blueprint.outputWeaponId,
          );
          if (weapon === undefined) {
            throw new Error(`Weapon ${blueprint.outputWeaponId} is not defined.`);
          }
          state = manufactureAdaptedWeapon(state, blueprint, weapon);
          break;
        }
        case 'START_RESEARCH_WEAPON_BLUEPRINT': {
          const blueprint = contentCatalog.researchWeaponBlueprints.find(
            (entry) => entry.id === command.blueprintId,
          );
          if (blueprint === undefined) {
            throw new Error(`Unknown research weapon blueprint ${command.blueprintId}.`);
          }
          state = startBlueprintResearch(state, blueprint);
          break;
        }
        case 'MANUFACTURE_RESEARCH_WEAPON': {
          const blueprint = contentCatalog.researchWeaponBlueprints.find(
            (entry) => entry.id === command.blueprintId,
          );
          if (blueprint === undefined) {
            throw new Error(`Unknown research weapon blueprint ${command.blueprintId}.`);
          }
          const weapon = contentCatalog.weapons.find(
            (entry) => entry.id === blueprint.outputWeaponId,
          );
          if (weapon === undefined) {
            throw new Error(`Weapon ${blueprint.outputWeaponId} is not defined.`);
          }
          state = manufactureAdaptedWeapon(state, blueprint, weapon);
          break;
        }
        case 'PURCHASE_AIRCRAFT': {
          const aircraft = contentCatalog.aircraft.find(
            (entry) => entry.id === command.aircraftId,
          );
          if (aircraft === undefined) {
            throw new Error(`Unknown aircraft ${command.aircraftId}.`);
          }
          const price = marketAircraftPrice(
            aircraft,
            state.base.marketSeed,
            state.base.sortiesCompleted,
          );
          state = purchaseAircraft(state, aircraft, price);
          break;
        }
        case 'PURCHASE_HANGAR_SLOT':
          state = purchaseHangarSlot(state, HANGAR_SLOT_COST);
          break;
        case 'SET_ACTIVE_AIRCRAFT': {
          const nextId = command.aircraftId;
          if (nextId !== null && isAircraftRepairing(state.base, nextId)) {
            throw new Error(`Aircraft ${nextId} is being repaired and cannot fly.`);
          }
          state = setActiveAircraft(state, nextId);
          state = { ...state, base: syncActiveLoadout(state.base) };
          break;
        }
        case 'UNEQUIP_PRIMARY_WEAPON': {
          const aircraftId = state.base.activeAircraftId;
          if (aircraftId === null) {
            throw new Error('No active aircraft.');
          }
          const base = removeWeapon(state.base, aircraftId, command.slotIndex);
          state = { ...state, base: syncActiveLoadout(base) };
          break;
        }
        case 'HIRE_CANDIDATE': {
          const candidate = state.base.staffCandidates.find(
            (entry) => entry.id === command.candidateId,
          );
          if (candidate === undefined) {
            throw new Error(`Unknown candidate ${command.candidateId}.`);
          }
          state = { ...state, base: hireCandidate(state.base, candidate) };
          break;
        }
        case 'REPAIR_AIRCRAFT': {
          state = {
            ...state,
            base: startRepair(state.base, command.aircraftId, command.emergency),
          };
          break;
        }
        case 'APPLY_SORTIE_DAMAGE': {
          state = {
            ...state,
            base: applySortieDamage(
              state.base,
              command.aircraftId,
              command.armourLostRatio,
            ),
          };
          break;
        }
        case 'PURCHASE_CONSUMABLE': {
          const consumable = contentCatalog.consumables.find(
            (entry) => entry.id === command.consumableId,
          );
          if (consumable === undefined) {
            throw new Error(`Unknown consumable ${command.consumableId}.`);
          }
          const price = marketConsumablePrice(
            consumable,
            state.base.marketSeed,
            state.base.sortiesCompleted,
          );
          if (state.base.credits < price) {
            throw new Error(`Consumable ${consumable.id} requires ${price} credits.`);
          }
          state = {
            ...state,
            base: {
              ...addConsumables(state.base, consumable.id, 1),
              credits: state.base.credits - price,
            },
          };
          break;
        }
        case 'REFUEL_AIRCRAFT': {
          const aircraft = contentCatalog.aircraft.find(
            (entry) => entry.id === command.aircraftId,
          );
          if (aircraft === undefined) {
            throw new Error(`Unknown aircraft ${command.aircraftId}.`);
          }
          state = refuelAircraft(state, aircraft, aircraft.refuelCreditCost);
          break;
        }
        case 'TAKE_LOAN': {
          const offer = LOAN_OFFERS.find(
            (entry) => entry.lenderId === command.lenderId,
          );
          if (offer === undefined) {
            throw new Error(`Unknown lender ${command.lenderId}.`);
          }
          state = takeLoan(state, offer);
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
        case 'EQUIP_SPECIAL_EQUIPMENT': {
          const aircraftId = state.base.activeAircraftId;
          if (aircraftId === null) {
            throw new Error('No active aircraft.');
          }
          const base = command.equipmentId === null
            ? removeModule(state.base, aircraftId)
            : installModule(state.base, aircraftId, command.equipmentId);
          state = { ...state, base: syncActiveLoadout(base) };
          break;
        }
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
