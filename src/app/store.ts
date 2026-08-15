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
  grantNationThanks,
  missionBreachPenalty,
  refuelAircraft,
} from '../domain/command-centre';
import { LOAN_OFFERS, repayLoan, settleDueLoans, takeLoan } from '../domain/credit';
import {
  addConsumables,
  consumeConsumables,
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
import { awardStaffXp, dismissStaff, generateStaffCandidates, hireCandidate } from '../domain/staff-market';
import {
  assignPilot,
  awardPilotProgress,
  generatePilotCandidates,
  hirePilotCandidate,
  recoverMonthlyPilotFatigue,
  restPilot,
} from '../domain/pilot-market';
import {
  treatPilotInMedical,
  treatPilotOutsource,
} from '../domain/pilot-medical';
import { marketConsumablePrice, marketWeaponPrice } from '../domain/terrestrial-market';
import { sellAircraft, sellWeapon } from '../domain/trade';
import { contentCatalog } from '../content/catalog';
import { hireStaff } from '../domain/base-development';
import {
  advancePilotRecovery,
  applyPilotInjury,
  killPilot,
  rollPilotCasualty,
} from '../domain/pilot-medical';
import { createSeededRng } from '../domain/rng';
import {
  advanceConstruction,
  advanceProduction,
  startAircraftProduction,
  startConstruction,
  startEquipmentProduction,
  startUpgradeProduction,
  startWeaponProduction,
} from '../domain/base-projects';
import {
  chargeMonthlyExpenses,
  contractCreditDelta,
  monthlyExpenses,
} from '../domain/operational-economy';
import {
  advanceBlueprintResearch,
  startBlueprintResearch,
} from '../domain/blueprint-progression';
import type { BaseState, GameState, SortieOutcome } from '../domain/model';
import { settleSortie } from '../domain/sortie';
import { purchaseMarketWeapon } from '../domain/terrestrial-market';
import {
  manufactureAircraftUpgrade,
  purchaseMarketBlueprint,
  startAircraftUpgradeResearch,
  startWeaponUpgradeResearch,
} from '../domain/terrestrial-production';
import {
  equipPrimaryWeapon,
  researchTechnology,
} from '../domain/technology-progression';

/* ---------------------------------------------------------------------
   Playtest aid: when enabled, construction, production, and research
   queues are drained to completion after every dispatch. This is a
   temporary debug toggle and never changes the underlying content values.
   --------------------------------------------------------------------- */
let instantProjectsEnabled = false;

export function setInstantProjectsEnabled(flag: boolean): void {
  instantProjectsEnabled = flag;
}

export function isInstantProjectsEnabled(): boolean {
  return instantProjectsEnabled;
}

/** Completes every construction and production job in one pass. */
function completeAllProjects(base: BaseState): BaseState {
  let next = base;
  for (let guard = 0; guard < 64; guard += 1) {
    if (next.constructionQueue.length === 0 && next.productionQueue.length === 0) {
      break;
    }
    next = advanceProduction(advanceConstruction(next));
  }
  return next;
}

/** Completes the active research project (and any routed successors). */
function completeAllResearch(state: GameState): GameState {
  let next = state;
  for (let guard = 0; guard < 64; guard += 1) {
    if (next.base.researchQueue.length === 0) {
      break;
    }
    const advanced = advanceBlueprintResearch(next, contentCatalog.staffRoles[0].id);
    if (advanced === next) {
      break;
    }
    next = advanced;
  }
  return next;
}

export type GameCommand =
  | { readonly type: 'RESET' }
  | {
      readonly type: 'SETTLE_SORTIE';
      readonly outcome: SortieOutcome;
      /** Fraction of the active aircraft armour lost during this sortie. */
      readonly armourLostRatio?: number;
    }
  | { readonly type: 'RESEARCH_TECHNOLOGY'; readonly technologyId: string }
  | { readonly type: 'PURCHASE_MARKET_WEAPON'; readonly weaponId: string }
  | { readonly type: 'PURCHASE_MARKET_BLUEPRINT'; readonly blueprintId: string }
  | { readonly type: 'PURCHASE_AIRCRAFT_BLUEPRINT'; readonly blueprintId: string }
  | { readonly type: 'MANUFACTURE_AIRCRAFT'; readonly blueprintId: string }
  | { readonly type: 'RESEARCH_AIRCRAFT_UPGRADE'; readonly upgradeId: string }
  | { readonly type: 'MANUFACTURE_AIRCRAFT_UPGRADE'; readonly upgradeId: string }
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
  | { readonly type: 'DISMISS_STAFF'; readonly staffId: string }
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
  | { readonly type: 'REPAY_LOAN'; readonly loanId: string; readonly amount: number }
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
  | {
      readonly type: 'CONSUME_SORTIE_CONSUMABLES';
      readonly consumableId: string;
      readonly count: number;
    }
  | { readonly type: 'SELL_WEAPON'; readonly weaponId: string }
  | { readonly type: 'SELL_AIRCRAFT'; readonly aircraftId: string }
  | { readonly type: 'SELECT_MISSION'; readonly missionId: string | null }
  | { readonly type: 'END_MONTH' }
  | { readonly type: 'DISMISS_MONTH_REPORT' }
  | { readonly type: 'HIRE_PILOT'; readonly candidateId: string }
  | { readonly type: 'ASSIGN_PILOT'; readonly pilotId: string }
  | { readonly type: 'REST_PILOT'; readonly pilotId: string }
  | { readonly type: 'TREAT_PILOT_OUTSOURCE'; readonly pilotId: string; readonly countryId: string }
  | { readonly type: 'TREAT_PILOT_MEDICAL'; readonly pilotId: string }
  | { readonly type: 'MANUFACTURE_EQUIPMENT'; readonly equipmentId: string }
  | { readonly type: 'EQUIP_SPECIAL_EQUIPMENT'; readonly equipmentId: string | null }
  | { readonly type: 'DEBUG_GRANT'; readonly credits?: number; readonly materials?: number; readonly research?: number }
  | { readonly type: 'DEBUG_COMPLETE_RESEARCH' };

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
          const creditDelta = contractCreditDelta(command.outcome);
          const afterFuel = consumeAircraftFuel(settled, state.base.activeAircraftId);
          const afterRepairs = advanceRepairs(afterFuel);
          const afterStaffXp = awardStaffXp(afterRepairs);
          const afterPilots = awardPilotProgress(afterStaffXp);
          const afterProjects = advanceProduction(advanceConstruction(afterPilots));
          const activeMission = state.base.activeMissionId === null
            ? undefined
            : state.base.threatMap.find(
                (mission) => mission.id === state.base.activeMissionId,
              );
          const afterMission = activeMission === undefined || !command.outcome.extracted
            ? { ...afterProjects, activeMissionId: null }
            : grantNationThanks(
                {
                  ...afterProjects,
                  resolvedThreatIds: afterProjects.resolvedThreatIds.includes(
                    activeMission.id,
                  )
                    ? afterProjects.resolvedThreatIds
                    : [...afterProjects.resolvedThreatIds, activeMission.id],
                  activeMissionId: null,
                },
                activeMission.targetCountryId,
              );
          const activePilotId = state.base.activePilotId;
          const armourLost = Math.max(0, Math.min(1, command.armourLostRatio ?? 0));
          let nextBase = afterMission;
          if (activePilotId !== null && armourLost > 0) {
            const casualtySeed = (
              (state.base.marketSeed >>> 0) ^
              Math.imul(state.base.sortiesCompleted, 0x9e3779b1) ^
              0x5f3759df
            ) >>> 0;
            const casualty = rollPilotCasualty(
              armourLost,
              createSeededRng(casualtySeed),
            );
            nextBase = casualty === 'death'
              ? killPilot(nextBase, activePilotId, state.base.month)
              : casualty === null
                ? nextBase
                : applyPilotInjury(nextBase, activePilotId, casualty);
          }
          state = {
            ...state,
            base: {
              ...nextBase,
              monthIncome: nextBase.monthIncome + Math.max(0, creditDelta),
              telemetryRecorded:
                state.base.telemetryRecorded || command.outcome.wardenSignalDetected,
            },
            activeRun: null,
          };
          state = advanceBlueprintResearch(state, contentCatalog.staffRoles[0].id);
          break;
        }
        case 'SELECT_MISSION': {
          if (command.missionId === null) {
            state = { ...state, base: { ...state.base, activeMissionId: null } };
            break;
          }
          const mission = state.base.threatMap.find(
            (entry) => entry.id === command.missionId,
          );
          if (mission === undefined) {
            throw new Error(`Unknown mission ${command.missionId}.`);
          }
          if (state.base.resolvedThreatIds.includes(mission.id)) {
            throw new Error(`Mission ${mission.id} has already been resolved.`);
          }
          state = { ...state, base: { ...state.base, activeMissionId: mission.id } };
          break;
        }
        case 'DISMISS_STAFF': {
          state = { ...state, base: dismissStaff(state.base, command.staffId) };
          break;
        }
        case 'END_MONTH': {
          const base = state.base;
          const unresolved = base.threatMap.filter(
            (mission) => !base.resolvedThreatIds.includes(mission.id),
          );
          const breachPenalties = unresolved.reduce(
            (sum, mission) =>
              sum + missionBreachPenalty(
                mission,
                contentCatalog.economy.missedEnemyPenaltyMultiplier,
              ),
            0,
          );
          const afterBreaches = breachPenalties === 0
            ? base
            : { ...base, credits: base.credits - breachPenalties };
          const loanPayments = base.loans
            .filter((loan) => !loan.repaid && loan.dueMonth <= base.month + 1)
            .reduce((sum, loan) => sum + loan.repaymentDue, 0);
          const afterExpenses = chargeMonthlyExpenses(afterBreaches);
          const nextMonth = base.month + 1;
          const afterLoans = settleDueLoans({ ...afterExpenses, month: nextMonth });
          const afterPilotRecovery = recoverMonthlyPilotFatigue(afterLoans);
          const afterMedicalRecovery = advancePilotRecovery(afterPilotRecovery);
          const expenses = monthlyExpenses(base).total + loanPayments;
          const monthReport = {
            month: base.month,
            income: base.monthIncome,
            expenses,
            breachPenalties,
            net: base.monthIncome - expenses - breachPenalties,
            resolvedThreats: base.resolvedThreatIds.length,
            totalThreats: base.threatMap.length,
          };
          state = {
            ...state,
            base: {
              ...afterMedicalRecovery,
              month: nextMonth,
              threatMap: generateThreatMap(
                contentCatalog.councilStates,
                base.marketSeed,
                nextMonth,
              ),
              staffCandidates: generateStaffCandidates(
                contentCatalog.staffRoles,
                base.marketSeed,
                nextMonth,
              ),
              pilotCandidates: generatePilotCandidates(base.marketSeed, nextMonth),
              resolvedThreatIds: [],
              monthIncome: 0,
              activeMissionId: null,
              nationThanks: {},
              monthReport,
            },
          };
          break;
        }
        case 'DISMISS_MONTH_REPORT': {
          state = { ...state, base: { ...state.base, monthReport: null } };
          break;
        }
        case 'HIRE_PILOT': {
          const candidate = state.base.pilotCandidates.find(
            (entry) => entry.id === command.candidateId,
          );
          if (candidate === undefined) {
            throw new Error(`Unknown pilot candidate ${command.candidateId}.`);
          }
          state = { ...state, base: hirePilotCandidate(state.base, candidate) };
          break;
        }
        case 'ASSIGN_PILOT': {
          state = { ...state, base: assignPilot(state.base, command.pilotId) };
          break;
        }
        case 'REST_PILOT': {
          state = { ...state, base: restPilot(state.base, command.pilotId) };
          break;
        }
        case 'TREAT_PILOT_OUTSOURCE': {
          state = {
            ...state,
            base: treatPilotOutsource(
              state.base,
              command.pilotId,
              command.countryId,
            ),
          };
          break;
        }
        case 'TREAT_PILOT_MEDICAL': {
          state = {
            ...state,
            base: treatPilotInMedical(state.base, command.pilotId),
          };
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
        case 'PURCHASE_AIRCRAFT_BLUEPRINT': {
          const blueprint = contentCatalog.aircraftBlueprints.find(
            (entry) => entry.id === command.blueprintId,
          );
          if (blueprint === undefined) {
            throw new Error(`Unknown aircraft blueprint ${command.blueprintId}.`);
          }
          state = purchaseMarketBlueprint(state, blueprint);
          break;
        }
        case 'MANUFACTURE_AIRCRAFT': {
          const blueprint = contentCatalog.aircraftBlueprints.find(
            (entry) => entry.id === command.blueprintId,
          );
          if (blueprint === undefined) {
            throw new Error(`Unknown aircraft blueprint ${command.blueprintId}.`);
          }
          state = startAircraftProduction(state, blueprint);
          break;
        }
        case 'RESEARCH_AIRCRAFT_UPGRADE': {
          const upgrade = contentCatalog.aircraftUpgrades.find(
            (entry) => entry.id === command.upgradeId,
          );
          if (upgrade === undefined) {
            throw new Error(`Unknown aircraft upgrade ${command.upgradeId}.`);
          }
          state = startAircraftUpgradeResearch(state, upgrade);
          break;
        }
        case 'MANUFACTURE_AIRCRAFT_UPGRADE': {
          const upgrade = contentCatalog.aircraftUpgrades.find(
            (entry) => entry.id === command.upgradeId,
          );
          if (upgrade === undefined) {
            throw new Error(`Unknown aircraft upgrade ${command.upgradeId}.`);
          }
          state = manufactureAircraftUpgrade(state, upgrade);
          break;
        }
        case 'MANUFACTURE_PRIMARY_WEAPON': {
          const blueprint = contentCatalog.marketWeaponBlueprints.find(
            (entry) => entry.id === command.blueprintId,
          );
          if (blueprint === undefined) {
            throw new Error(`Unknown production blueprint ${command.blueprintId}.`);
          }
          state = startWeaponProduction(state, blueprint.id, {
            id: blueprint.weaponId,
            productionCreditCost: blueprint.productionCreditCost,
            productionMaterialCost: blueprint.productionMaterialCost,
            productionSorties: blueprint.productionSorties,
            requiredProductionBuildingId: blueprint.requiredBuildingId,
            requiredProductionStaffRoleId: blueprint.requiredStaffRoleId,
          });
          break;
        }
        case 'RESEARCH_WEAPON_UPGRADE': {
          const upgrade = contentCatalog.weaponUpgrades.find(
            (entry) => entry.id === command.upgradeId,
          );
          if (upgrade === undefined) {
            throw new Error(`Unknown weapon upgrade ${command.upgradeId}.`);
          }
          state = startWeaponUpgradeResearch(state, upgrade);
          break;
        }
        case 'MANUFACTURE_WEAPON_UPGRADE': {
          const upgrade = contentCatalog.weaponUpgrades.find(
            (entry) => entry.id === command.upgradeId,
          );
          if (upgrade === undefined) {
            throw new Error(`Unknown weapon upgrade ${command.upgradeId}.`);
          }
          state = startUpgradeProduction(state, upgrade);
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
          state = startConstruction(state, building);
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
          state = startWeaponProduction(state, blueprint.id, blueprint);
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
          state = startWeaponProduction(state, blueprint.id, blueprint);
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
          const role = contentCatalog.staffRoles.find(
            (entry) => entry.id === candidate.roleId,
          );
          if (role === undefined) {
            throw new Error(`Unknown staff role ${candidate.roleId}.`);
          }
          state = { ...state, base: hireCandidate(state.base, candidate, role) };
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
        case 'CONSUME_SORTIE_CONSUMABLES': {
          if (!Number.isInteger(command.count) || command.count < 0) {
            throw new RangeError('Consumable count must be a non-negative integer.');
          }
          if (command.count > 0) {
            state = {
              ...state,
              base: consumeConsumables(
                state.base,
                command.consumableId,
                command.count,
              ),
            };
          }
          break;
        }
        case 'DEBUG_GRANT': {
          state = {
            ...state,
            base: {
              ...state.base,
              credits: state.base.credits + (command.credits ?? 0),
              materials: state.base.materials + (command.materials ?? 0),
              research: state.base.research + (command.research ?? 0),
            },
          };
          break;
        }
        case 'DEBUG_COMPLETE_RESEARCH': {
          const front = state.base.researchQueue[0];
          if (front !== undefined) {
            state = {
              ...state,
              base: {
                ...state.base,
                researchQueue: state.base.researchQueue.slice(1),
                unlockedBlueprintIds: [
                  ...new Set([...state.base.unlockedBlueprintIds, front.blueprintId]),
                ],
              },
            };
          }
          break;
        }
        case 'SELL_WEAPON': {
          const weapon = contentCatalog.weapons.find(
            (entry) => entry.id === command.weaponId,
          );
          if (weapon === undefined || weapon.marketPrice === null) {
            throw new Error(`Weapon ${command.weaponId} cannot be sold.`);
          }
          const basePrice = marketWeaponPrice(
            weapon,
            state.base.marketSeed,
            state.base.sortiesCompleted,
          );
          state = { ...state, base: sellWeapon(state.base, weapon.id, basePrice) };
          break;
        }
        case 'SELL_AIRCRAFT': {
          const aircraft = contentCatalog.aircraft.find(
            (entry) => entry.id === command.aircraftId,
          );
          if (aircraft === undefined || aircraft.marketPrice === null) {
            throw new Error(`Aircraft ${command.aircraftId} cannot be sold.`);
          }
          const basePrice = marketAircraftPrice(
            aircraft,
            state.base.marketSeed,
            state.base.sortiesCompleted,
          );
          state = {
            ...state,
            base: sellAircraft(state.base, aircraft.id, basePrice),
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
        case 'REPAY_LOAN': {
          state = { ...state, base: repayLoan(state.base, command.loanId, command.amount) };
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
          state = startEquipmentProduction(state, blueprint, equipment);
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

      if (instantProjectsEnabled) {
        state = completeAllResearch({
          ...state,
          base: completeAllProjects(state.base),
        });
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
