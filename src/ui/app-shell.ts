import { createGameStore } from '../app/store';
import { contentCatalog } from '../content/catalog';
import { validateContentCatalog } from '../content/validate';
import { createGame } from '../game/create-game';
import { CombatScene, type CombatRunResult } from '../game/scenes/CombatScene';
import type { TranslationKey } from '../i18n';
import { isLocale } from '../i18n';
import { clearGame, loadGame, saveGame } from '../persistence/save-repository';
import type { GameState } from '../domain/model';
import { isBankrupt } from '../domain/operational-economy';
import { HANGAR_SLOT_COST, marketAircraftPrice } from '../domain/hangar';
import { isAircraftFueled, MONTH_SORTIE_LENGTH } from '../domain/command-centre';
import {
  marketBlueprintPrice,
  marketConsumablePrice,
  marketWeaponPrice,
} from '../domain/terrestrial-market';
import {
  aircraftDamageValue,
  emergencyRepairCost,
  isAircraftRepairing,
  standardRepairCost,
} from '../domain/aircraft-integrity';
import { tradeMargin } from '../domain/trade';
import {
  hasOutstandingLoan,
  LOAN_OFFERS,
  loanRepayment,
} from '../domain/credit';
import {
  sectionForObjective,
  type BaseSection,
} from '../domain/base-navigation';
import {
  getProgressionObjective,
  type ProgressionObjectiveKind,
} from '../domain/progression-guidance';
import {
  summarizeSortiePayoff,
  type SortiePayoffSummary,
} from '../domain/sortie-payoff';
import { byId, setText } from './dom';
import { h } from './h';
import { getLocale, setLocale, t, localizedWeaponName } from './i18n';
import { buildAppTemplate } from './template';
import { installShmupDebugBridge } from '../debug/debug-mode';
import { showToast } from './toast';
import { aircraftShipSvg } from './ship-svg';
import { resolveInitialState, temporaryPlaytestMode } from './playtest';

validateContentCatalog(contentCatalog);

const app = document.querySelector<HTMLDivElement>('#app');

if (app === null) {
  throw new Error('Application root #app was not found.');
}

const store = createGameStore(
  resolveInitialState() ?? loadGame(window.localStorage) ?? undefined,
);
installShmupDebugBridge({ store, getGame: () => game });
const initialState = store.getSnapshot();
const prism = contentCatalog.alienTechnologies[0];
const impulseAccelerator = contentCatalog.weapons[1];
const splitPulseWeapon = contentCatalog.weapons[2];
const splitPulseWeaponId = splitPulseWeapon.id;
const laboratory = contentCatalog.buildings[0];
const workshop = contentCatalog.buildings[1];
const scientistRole = contentCatalog.staffRoles[0];
const engineerRole = contentCatalog.staffRoles[1];
const capturerBlueprint = contentCatalog.blueprints[0];
const capturerEquipment = contentCatalog.equipment[0];
const acceleratorBlueprint = contentCatalog.marketWeaponBlueprints[0];
const machineGunUpgrade = contentCatalog.weaponUpgrades[0];
const acceleratorUpgrade = contentCatalog.weaponUpgrades[1];
const containmentBlueprint = contentCatalog.buildingBlueprints[0];
const quarantine = contentCatalog.buildings[2];
const adaptedBlueprint = contentCatalog.adaptedWeaponBlueprints[0];
const canisterBlueprint = contentCatalog.researchWeaponBlueprints[0];
const canisterWeapon = contentCatalog.weapons[3];
const rocketPodWeapon = contentCatalog.weapons.find(
  (weapon) => weapon.visualProfile === 'rocket-pod',
) ?? contentCatalog.weapons[4];
const rocketsConsumable = contentCatalog.consumables[0];
const progressionDefinitions = {
  laboratoryId: laboratory.id,
  scientistRoleId: scientistRole.id,
  engineerRoleId: engineerRole.id,
  blueprintId: capturerBlueprint.id,
  workshopId: workshop.id,
  equipmentId: capturerEquipment.id,
  containmentBlueprintId: containmentBlueprint.id,
  quarantineId: quarantine.id,
  adaptedBlueprintId: adaptedBlueprint.id,
  adaptedWeaponId: splitPulseWeapon.id,
};

let game: ReturnType<typeof createGame> | null = null;
let activeScreen: 'base' | 'sortie' = 'base';
let activeBaseSection: BaseSection = 'command';
let objectiveBaseSection: BaseSection = 'engineering';
let lastRunResult: CombatRunResult | null = null;
let lastSettlementSummary: SortiePayoffSummary | null = null;
let sortieInProgress = false;

if (!temporaryPlaytestMode) {
  saveGame(window.localStorage, initialState);
}

app.innerHTML = buildAppTemplate(initialState);
const playtestBadge = byId<HTMLElement>("playtest-badge");
playtestBadge.hidden = !temporaryPlaytestMode;
playtestBadge.textContent = temporaryPlaytestMode ? t("debug.playtestBadge") : "";

const baseScreen = byId<HTMLElement>('base-screen');
const baseNavigation = byId<HTMLElement>('base-navigation');
const baseTabButtons = Array.from(
  baseNavigation.querySelectorAll<HTMLButtonElement>('[data-base-section]'),
);
const basePanels = Array.from(baseScreen.querySelectorAll<HTMLElement>('.base-panel'));
const sortieScreen = byId<HTMLElement>('sortie-screen');
const gameRoot = byId<HTMLElement>('game-root');
const combatFrame = byId<HTMLElement>('combat-frame');
const activeWeaponName = byId<HTMLElement>('active-weapon-name');
const switchPrimaryWeaponButton = byId<HTMLButtonElement>('switch-primary-weapon');
const weaponSwitchNote = byId<HTMLElement>('weapon-switch-note');
const creditTotal = byId<HTMLElement>('credit-total');
const hudMonth = byId<HTMLElement>('hud-month');
const hudObjective = byId<HTMLElement>('hud-objective');
const materialTotal = byId<HTMLElement>('material-total');
const researchTotal = byId<HTMLElement>('research-total');
const baseRunReport = byId<HTMLElement>('base-run-report');
const systemCheck = byId<HTMLElement>('prototype-status').parentElement;
const insolvencyPanel = byId<HTMLElement>('insolvency-panel');
const restartProgrammeButton = byId<HTMLButtonElement>('restart-programme');
const objectiveTitle = byId<HTMLElement>('objective-title');
const objectiveDetail = byId<HTMLElement>('objective-detail');
const objectiveOpenSectionButton = byId<HTMLButtonElement>('objective-open-section');
const sortieRunReport = byId<HTMLElement>('sortie-run-report');
const sortieOutcome = byId<HTMLElement>('sortie-outcome');
const technologyStatus = byId<HTMLElement>('technology-status');
const researchTechnologyButton = byId<HTMLButtonElement>('research-technology');
const specialEquipmentStatus = byId<HTMLElement>('special-equipment-status');
const specialEquipmentNote = byId<HTMLElement>('special-equipment-note');
const toggleSpecialEquipmentButton = byId<HTMLButtonElement>('toggle-special-equipment');
const preflightWarning = byId<HTMLElement>('preflight-warning');
const wardenSignalWarning = byId<HTMLElement>('warden-signal-warning');
const launchSortieButton = byId<HTMLButtonElement>('launch-sortie');
const returnToBaseButton = byId<HTMLButtonElement>('return-to-base');
const settingsToggle = byId<HTMLButtonElement>('settings-toggle');
const settingsMenu = byId<HTMLElement>('settings-menu');
const localeSelect = byId<HTMLSelectElement>('locale-select');
const laboratoryStatus = byId<HTMLElement>('laboratory-status');
const laboratoryCost = byId<HTMLElement>('laboratory-cost');
const constructLaboratoryButton = byId<HTMLButtonElement>('construct-laboratory');
const scientistCount = byId<HTMLElement>('scientist-count');
const scientistNote = byId<HTMLElement>('scientist-note');
const engineerCount = byId<HTMLElement>('engineer-count');
const engineerNote = byId<HTMLElement>('engineer-note');
const workshopStatus = byId<HTMLElement>('workshop-status');
const workshopCost = byId<HTMLElement>('workshop-cost');
const constructWorkshopButton = byId<HTMLButtonElement>('construct-workshop');
const containmentProgramme = byId<HTMLElement>('containment-programme');
const containmentStatus = byId<HTMLElement>('containment-status');
const containmentNote = byId<HTMLElement>('containment-note');
const startContainmentResearchButton = byId<HTMLButtonElement>('start-containment-research');
const quarantineRow = byId<HTMLElement>('quarantine-row');
const quarantineStatus = byId<HTMLElement>('quarantine-status');
const quarantineCost = byId<HTMLElement>('quarantine-cost');
const constructQuarantineButton = byId<HTMLButtonElement>('construct-quarantine');
const alienEmitterProductionRow = byId<HTMLElement>('alien-emitter-production-row');
const alienEmitterProductionStatus = byId<HTMLElement>('alien-emitter-production-status');
const alienEmitterProductionNote = byId<HTMLElement>('alien-emitter-production-note');
const manufactureAlienEmitterButton = byId<HTMLButtonElement>('manufacture-alien-emitter');
const canisterResearchStatus = byId<HTMLElement>('canister-research-status');
const canisterResearchNote = byId<HTMLElement>('canister-research-note');
const researchCanisterButton = byId<HTMLButtonElement>('research-canister');
const canisterProductionRow = byId<HTMLElement>('canister-production-row');
const canisterProductionStatus = byId<HTMLElement>('canister-production-status');
const canisterProductionNote = byId<HTMLElement>('canister-production-note');
const manufactureCanisterButton = byId<HTMLButtonElement>('manufacture-canister');
const blueprintStatus = byId<HTMLElement>('blueprint-status');
const blueprintContribution = byId<HTMLElement>('blueprint-contribution');
const startBlueprintResearchButton = byId<HTMLButtonElement>('start-blueprint-research');
const capturerEquipmentStatus = byId<HTMLElement>('capturer-equipment-status');
const capturerEquipmentNote = byId<HTMLElement>('capturer-equipment-note');
const manufactureCapturerButton = byId<HTMLButtonElement>('manufacture-capturer');
const acceleratorProductionRow = byId<HTMLElement>('accelerator-production-row');
const acceleratorProductionStatus = byId<HTMLElement>('accelerator-production-status');
const acceleratorProductionNote = byId<HTMLElement>('accelerator-production-note');
const manufactureAcceleratorButton = byId<HTMLButtonElement>('manufacture-accelerator');
const machineUpgradeStatus = byId<HTMLElement>('machine-upgrade-status');
const machineUpgradeNote = byId<HTMLElement>('machine-upgrade-note');
const researchMachineUpgradeButton = byId<HTMLButtonElement>('research-machine-upgrade');
const acceleratorUpgradeProject = byId<HTMLElement>('accelerator-upgrade-project');
const acceleratorUpgradeStatus = byId<HTMLElement>('accelerator-upgrade-status');
const acceleratorUpgradeNote = byId<HTMLElement>('accelerator-upgrade-note');
const researchAcceleratorUpgradeButton = byId<HTMLButtonElement>('research-accelerator-upgrade');
const machineUpgradeProductionRow = byId<HTMLElement>('machine-upgrade-production-row');
const machineUpgradeProductionStatus = byId<HTMLElement>('machine-upgrade-production-status');
const machineUpgradeProductionNote = byId<HTMLElement>('machine-upgrade-production-note');
const manufactureMachineUpgradeButton = byId<HTMLButtonElement>('manufacture-machine-upgrade');
const acceleratorUpgradeProductionRow = byId<HTMLElement>('accelerator-upgrade-production-row');
const acceleratorUpgradeProductionStatus = byId<HTMLElement>('accelerator-upgrade-production-status');
const acceleratorUpgradeProductionNote = byId<HTMLElement>('accelerator-upgrade-production-note');
const manufactureAcceleratorUpgradeButton = byId<HTMLButtonElement>('manufacture-accelerator-upgrade');

let activeCombatWeaponId = initialState.base.equippedPrimaryWeaponIds.find(
  (weaponId): weaponId is string => weaponId !== null,
) ?? contentCatalog.weapons[0].id;
let combatWeaponSwitchAvailable = false;

function renderCombatWeaponControl(): void {
  activeWeaponName.textContent = localizedWeaponName(activeCombatWeaponId);
  switchPrimaryWeaponButton.disabled = !sortieInProgress || !combatWeaponSwitchAvailable;
  weaponSwitchNote.textContent = t(
    combatWeaponSwitchAvailable ? 'sortie.switchReady' : 'sortie.switchUnavailable',
  );
}

function formatRunResult(
  result: CombatRunResult,
  summary: SortiePayoffSummary | null,
): string {
  const retention = result.outcome.extracted ? t('report.fullHaul') : t('report.partialHaul');
  const technology = result.technologyDecision === 'install'
    ? t('report.installed')
    : result.technologyDecision === 'preserve'
      ? result.outcome.extracted ? t('report.delivered') : t('report.lost')
      : t('report.notRecovered');
  const elite = result.eliteDefeated ? t('report.wardenDestroyed') : '';
  const resultLine = t('report.result', { technology, retention, elite });
  if (summary === null) {
    return resultLine;
  }
  const delta = `${summary.creditDelta >= 0 ? '+' : '−'}${Math.abs(summary.creditDelta)}`;
  const contract = t('report.contract', {
    destroyed: summary.targetsDestroyed,
    earned: summary.creditsEarned,
    breached: summary.targetsBreached,
    penalty: summary.creditsPenalized,
    delta,
  });
  const rewards = t('report.rewards', {
    balance: summary.creditBalance,
    materials: summary.materialsReceived,
  });
  const research = summary.blueprintCompleted
    ? t('report.blueprintCompleted')
    : summary.blueprintProgress > 0
      ? t('report.blueprintProgress', { progress: summary.blueprintProgress })
      : t('report.noBlueprintProgress');
  const insolvency = summary.bankrupt ? `\n${t('report.insolvent')}` : '';
  return `${resultLine}\n${contract}\n${rewards}\n${research}${insolvency}`;
}

function renderReports(): void {
  const bankrupt = isBankrupt(store.getSnapshot().base.credits);
  const result = lastRunResult;
  const hasResult = result !== null && !sortieInProgress;
  baseRunReport.textContent = result === null
    ? t(bankrupt ? 'report.insolvent' : 'base.awaiting')
    : formatRunResult(result, lastSettlementSummary);
  sortieRunReport.textContent = hasResult
    ? formatRunResult(result, lastSettlementSummary)
    : t('report.active');
  sortieOutcome.hidden = !hasResult;
}

function objectiveKeys(kind: ProgressionObjectiveKind): {
  readonly title: TranslationKey;
  readonly detail: TranslationKey;
} {
  switch (kind) {
    case 'build-laboratory':
      return { title: 'objective.buildLab', detail: 'objective.buildLabDetail' };
    case 'hire-scientist':
      return { title: 'objective.hireScientist', detail: 'objective.hireScientistDetail' };
    case 'hire-engineer':
      return { title: 'objective.hireEngineer', detail: 'objective.hireEngineerDetail' };
    case 'start-blueprint':
      return { title: 'objective.startBlueprint', detail: 'objective.startBlueprintDetail' };
    case 'advance-blueprint':
      return { title: 'objective.advanceBlueprint', detail: 'objective.advanceBlueprintDetail' };
    case 'build-workshop':
      return { title: 'objective.buildWorkshop', detail: 'objective.buildWorkshopDetail' };
    case 'manufacture-equipment':
      return { title: 'objective.manufacture', detail: 'objective.manufactureDetail' };
    case 'equip-equipment':
      return { title: 'objective.equip', detail: 'objective.equipDetail' };
    case 'recover-artefact':
      return { title: 'objective.recover', detail: 'objective.recoverDetail' };
    case 'start-containment':
      return { title: 'objective.startContainment', detail: 'objective.startContainmentDetail' };
    case 'advance-containment':
      return { title: 'objective.advanceContainment', detail: 'objective.advanceContainmentDetail' };
    case 'construct-quarantine':
      return { title: 'objective.constructQuarantine', detail: 'objective.constructQuarantineDetail' };
    case 'analyse-sample':
      return { title: 'objective.analyseSample', detail: 'objective.analyseSampleDetail' };
    case 'manufacture-adapted-weapon':
      return {
        title: 'objective.manufactureAdapted',
        detail: 'objective.manufactureAdaptedDetail',
      };
    case 'equip-adapted-weapon':
      return {
        title: 'objective.equipAdapted',
        detail: 'objective.equipAdaptedDetail',
      };
    case 'await-warden-signal':
      return {
        title: 'objective.awaitSignal',
        detail: 'objective.awaitSignalDetail',
      };
  }
}

function isBaseSection(value: string | undefined): value is BaseSection {
  return value === 'command' || value === 'research' ||
    value === 'engineering' || value === 'hangar' || value === 'trade' ||
    value === 'databank';
}

function showBaseSection(section: BaseSection): void {
  activeBaseSection = section;
  for (const button of baseTabButtons) {
    const selected = button.dataset.baseSection === section;
    button.setAttribute('aria-selected', String(selected));
    button.tabIndex = selected ? 0 : -1;
  }
  for (const panel of basePanels) {
    panel.hidden = panel.id !== `base-panel-${section}`;
  }
}

function resourceShortfall(
  state: GameState,
  creditCost: number,
  materialCost: number,
): string {
  const credits = Math.max(0, creditCost - state.base.credits);
  const materials = Math.max(0, materialCost - state.base.materials);
  return credits === 0 && materials === 0
    ? t('objective.resourcesReady')
    : t('objective.resourcesMissing', { credits, materials });
}

function renderBase(): void {
  const state = store.getSnapshot();
  const bankrupt = isBankrupt(state.base.credits);
  const hasSample = state.base.preservedTechnologyIds.includes(prism.id);
  const splitPulseUnlocked = state.base.ownedPrimaryWeaponIds.includes(splitPulseWeaponId);
  const acceleratorBlueprintOwned = state.base.unlockedBlueprintIds.includes(
    acceleratorBlueprint.id,
  );
  const acceleratorLocallyProduced = state.base.locallyProducedWeaponIds.includes(
    impulseAccelerator.id,
  );
  const machineUpgradeResearched = state.base.researchedWeaponUpgradeIds.includes(
    machineGunUpgrade.id,
  );
  const machineUpgradeManufactured = state.base.manufacturedWeaponUpgradeIds.includes(
    machineGunUpgrade.id,
  );
  const acceleratorUpgradeResearched = state.base.researchedWeaponUpgradeIds.includes(
    acceleratorUpgrade.id,
  );
  const acceleratorUpgradeManufactured = state.base.manufacturedWeaponUpgradeIds.includes(
    acceleratorUpgrade.id,
  );
  const labBuilt = state.base.constructedBuildingIds.includes(laboratory.id);
  const scientists = state.base.staff.filter((member) => member.roleId === scientistRole.id).length;
  const engineers = state.base.staff.filter((member) => member.roleId === engineerRole.id).length;
  const researchReady = labBuilt && scientists > 0;
  const blueprintProject = state.base.researchQueue.find(
    (project) => project.blueprintId === capturerBlueprint.id,
  );
  const blueprintUnlocked = state.base.unlockedBlueprintIds.includes(capturerBlueprint.id);
  const workshopBuilt = state.base.constructedBuildingIds.includes(workshop.id);
  const productionReady = workshopBuilt && engineers > 0;
  const capturerManufactured = state.base.manufacturedEquipmentIds.includes(
    capturerEquipment.id,
  );
  const capturerEquipped = state.base.equippedEquipmentId === capturerEquipment.id;
  const researchBusy = state.base.researchQueue.length > 0;
  const technologyName = t('content.prism');
  const moduleName = t('content.splitPulse');
  const objective = getProgressionObjective(state, progressionDefinitions);
  const objectiveTranslationKeys = objectiveKeys(objective.kind);
  objectiveBaseSection = sectionForObjective(objective.kind);
  const objectiveParams = {
    progress: objective.progress ?? 0,
    required: objective.requiredProgress ?? capturerBlueprint.requiredProgress,
    labResources: resourceShortfall(state, laboratory.creditCost, laboratory.materialCost),
    scientistResources: resourceShortfall(state, scientistRole.creditCost, 0),
    engineerResources: resourceShortfall(state, engineerRole.creditCost, 0),
    workshopResources: resourceShortfall(state, workshop.creditCost, workshop.materialCost),
    equipmentResources: resourceShortfall(
      state,
      capturerEquipment.creditCost,
      capturerEquipment.materialCost,
    ),
    quarantineResources: resourceShortfall(
      state,
      quarantine.creditCost,
      quarantine.materialCost,
    ),
    adaptedWeaponResources: resourceShortfall(
      state,
      adaptedBlueprint.productionCreditCost,
      adaptedBlueprint.productionMaterialCost,
    ),
  };

  creditTotal.textContent = state.base.credits.toString();
  creditTotal.classList.toggle('is-negative', bankrupt);
  materialTotal.textContent = state.base.materials.toString();
  researchTotal.textContent = state.base.research.toString();
  objectiveTitle.textContent = bankrupt
    ? t('insolvency.objective')
    : t(objectiveTranslationKeys.title, objectiveParams);
  objectiveDetail.textContent = bankrupt
    ? t('insolvency.objectiveDetail')
    : t(objectiveTranslationKeys.detail, objectiveParams);
  hudMonth.textContent = t('hud.month', { month: state.base.month });
  byId<HTMLElement>('databank-note').textContent = t('databank.note');
  hudObjective.textContent = bankrupt
    ? t('insolvency.objective')
    : t(objectiveTranslationKeys.title, objectiveParams);
  objectiveOpenSectionButton.hidden = bankrupt;
  objectiveOpenSectionButton.textContent = t('objective.openSection', {
    section: t(`baseNav.${objectiveBaseSection}`),
  });
  insolvencyPanel.hidden = !bankrupt;
  baseScreen.classList.toggle('is-insolvent', bankrupt);
  systemCheck?.classList.toggle('is-critical', bankrupt);
  laboratoryStatus.textContent = t(labBuilt ? 'facility.labBuilt' : 'facility.labUnbuilt');
  laboratoryCost.textContent = labBuilt
    ? ''
    : t('facility.buildCost', {
        credits: laboratory.creditCost,
        materials: laboratory.materialCost,
      });
  constructLaboratoryButton.hidden = labBuilt;
  constructLaboratoryButton.disabled = (
    bankrupt ||
    state.base.credits < laboratory.creditCost ||
    state.base.materials < laboratory.materialCost
  );
  scientistCount.textContent = t('facility.scientistCount', { count: scientists });
  scientistNote.textContent = labBuilt
    ? t('facility.candidatesHint')
    : t('facility.requiresLab');
  engineerCount.textContent = t('facility.engineerCount', { count: engineers });
  engineerNote.textContent = workshopBuilt
    ? engineers > 0
      ? t('facility.engineerReady')
      : t('facility.candidatesHint')
    : t('facility.requiresWorks');
  renderCandidates('scientist-candidates', scientistRole.id);
  renderCandidates('engineer-candidates', engineerRole.id);
  workshopStatus.textContent = workshopBuilt
    ? t('facility.workshopBuilt')
    : labBuilt ? t('facility.workshopUnbuilt') : t('facility.workshopLocked');
  workshopCost.textContent = workshopBuilt || !labBuilt
    ? ''
    : t('facility.buildCost', {
        credits: workshop.creditCost,
        materials: workshop.materialCost,
      });
  constructWorkshopButton.hidden = workshopBuilt;
  constructWorkshopButton.disabled = (
    bankrupt ||
    !labBuilt ||
    state.base.credits < workshop.creditCost ||
    state.base.materials < workshop.materialCost
  );
  blueprintStatus.textContent = blueprintUnlocked
    ? t('programme.complete')
    : blueprintProject !== undefined
      ? t('programme.active', {
          progress: blueprintProject.progress,
          required: blueprintProject.requiredProgress,
        })
      : !state.base.telemetryRecorded
        ? t('research.blueprintRequiresTelemetry')
        : researchReady ? t('programme.available') : t('programme.requiresLab');
  blueprintContribution.textContent = blueprintProject === undefined
    ? ''
    : t('programme.contribution', { count: scientists });
  startBlueprintResearchButton.hidden =
    blueprintUnlocked || blueprintProject !== undefined || !state.base.telemetryRecorded;
  startBlueprintResearchButton.disabled = bankrupt || !researchReady || researchBusy;
  capturerEquipmentStatus.textContent = capturerManufactured
    ? t('programme.manufactured')
    : !blueprintUnlocked
      ? t('programme.needsBlueprint')
      : !workshopBuilt
        ? t('programme.needsWorkshop')
        : !productionReady ? t('production.requiresEngineer') : t('programme.ready');
  capturerEquipmentNote.textContent = capturerManufactured
    ? t(capturerEquipped ? 'programme.equippedNote' : 'programme.loadoutNote')
    : blueprintUnlocked && workshopBuilt
      ? t('programme.manufactureCost', {
          credits: capturerEquipment.creditCost,
          materials: capturerEquipment.materialCost,
        })
      : '';
  manufactureCapturerButton.hidden = capturerManufactured;
  manufactureCapturerButton.disabled = (
    bankrupt ||
    !blueprintUnlocked ||
    !productionReady ||
    state.base.credits < capturerEquipment.creditCost ||
    state.base.materials < capturerEquipment.materialCost
  );
  const quarantineBuilt = state.base.constructedBuildingIds.includes(quarantine.id);
  const adaptedUnlocked = state.base.unlockedBlueprintIds.includes(adaptedBlueprint.id);
  const emitterOwned = state.base.ownedPrimaryWeaponIds.includes(splitPulseWeapon.id);
  technologyStatus.textContent = hasSample && !quarantineBuilt
    ? t('research.sampleSealed')
    : !labBuilt
      ? t('lab.requiresLaboratory')
      : scientists === 0
        ? t('lab.requiresScientist')
        : hasSample
          ? splitPulseUnlocked
            ? t('lab.extraSample', { technology: technologyName, research: prism.preservationResearch })
            : t('lab.sampleReady', { technology: technologyName, module: moduleName })
          : splitPulseUnlocked
            ? t('lab.researchComplete', { module: moduleName })
            : adaptedUnlocked && !emitterOwned
              ? t('lab.blueprintReady', { module: moduleName })
              : t('lab.noSample');
  researchTechnologyButton.hidden = !hasSample;
  researchTechnologyButton.disabled = bankrupt || !researchReady || !quarantineBuilt;
  researchTechnologyButton.textContent = splitPulseUnlocked
    ? t('lab.analyseSample', { research: prism.preservationResearch })
    : t('lab.researchUnlock', { module: moduleName.toUpperCase() });

  machineUpgradeStatus.textContent = t(
    machineUpgradeManufactured
      ? 'upgrade.installed'
      : machineUpgradeResearched
        ? 'upgrade.researched'
        : researchReady ? 'upgrade.available' : 'upgrade.requiresCentre',
  );
  machineUpgradeNote.textContent = machineUpgradeManufactured
    ? t('upgrade.machineEffect')
    : machineUpgradeResearched
      ? t('upgrade.awaitingProduction')
      : researchReady
        ? t('upgrade.researchCost', { credits: machineGunUpgrade.researchCreditCost })
        : '';
  researchMachineUpgradeButton.hidden = machineUpgradeResearched;
  researchMachineUpgradeButton.disabled = (
    bankrupt ||
    !researchReady ||
    state.base.credits < machineGunUpgrade.researchCreditCost
  );

  acceleratorUpgradeProject.hidden = !acceleratorLocallyProduced;
  acceleratorUpgradeStatus.textContent = t(
    acceleratorUpgradeManufactured
      ? 'upgrade.installed'
      : acceleratorUpgradeResearched
        ? 'upgrade.researched'
        : 'upgrade.available',
  );
  acceleratorUpgradeNote.textContent = acceleratorUpgradeManufactured
    ? t('upgrade.acceleratorEffect')
    : acceleratorUpgradeResearched
      ? t('upgrade.awaitingProduction')
      : t('upgrade.researchCost', { credits: acceleratorUpgrade.researchCreditCost });
  researchAcceleratorUpgradeButton.hidden = acceleratorUpgradeResearched;
  researchAcceleratorUpgradeButton.disabled = (
    bankrupt ||
    !researchReady ||
    state.base.credits < acceleratorUpgrade.researchCreditCost
  );

  acceleratorProductionRow.hidden = !acceleratorBlueprintOwned;
  acceleratorProductionStatus.textContent = t(
    acceleratorLocallyProduced
      ? 'production.mastered'
      : productionReady ? 'production.ready' : 'production.requiresEngineer',
  );
  acceleratorProductionNote.textContent = acceleratorLocallyProduced
    ? t('production.branchUnlocked')
    : t('production.cost', {
        credits: acceleratorBlueprint.productionCreditCost,
        materials: acceleratorBlueprint.productionMaterialCost,
      });
  manufactureAcceleratorButton.hidden = acceleratorLocallyProduced;
  manufactureAcceleratorButton.disabled = (
    bankrupt ||
    !productionReady ||
    state.base.credits < acceleratorBlueprint.productionCreditCost ||
    state.base.materials < acceleratorBlueprint.productionMaterialCost
  );

  machineUpgradeProductionRow.hidden = !machineUpgradeResearched;
  machineUpgradeProductionStatus.textContent = t(
    machineUpgradeManufactured
      ? 'production.installed'
      : productionReady ? 'production.ready' : 'production.requiresEngineer',
  );
  machineUpgradeProductionNote.textContent = machineUpgradeManufactured
    ? t('upgrade.machineEffect')
    : t('production.cost', {
        credits: machineGunUpgrade.productionCreditCost,
        materials: machineGunUpgrade.productionMaterialCost,
      });
  manufactureMachineUpgradeButton.hidden = machineUpgradeManufactured;
  manufactureMachineUpgradeButton.disabled = (
    bankrupt ||
    !productionReady ||
    state.base.credits < machineGunUpgrade.productionCreditCost ||
    state.base.materials < machineGunUpgrade.productionMaterialCost
  );

  acceleratorUpgradeProductionRow.hidden = !acceleratorUpgradeResearched;
  acceleratorUpgradeProductionStatus.textContent = t(
    acceleratorUpgradeManufactured
      ? 'production.installed'
      : productionReady ? 'production.ready' : 'production.requiresEngineer',
  );
  acceleratorUpgradeProductionNote.textContent = acceleratorUpgradeManufactured
    ? t('upgrade.acceleratorEffect')
    : t('production.cost', {
        credits: acceleratorUpgrade.productionCreditCost,
        materials: acceleratorUpgrade.productionMaterialCost,
      });
  manufactureAcceleratorUpgradeButton.hidden = acceleratorUpgradeManufactured;
  manufactureAcceleratorUpgradeButton.disabled = (
    bankrupt ||
    !productionReady ||
    state.base.credits < acceleratorUpgrade.productionCreditCost ||
    state.base.materials < acceleratorUpgrade.productionMaterialCost
  );
  renderAircraftLoadout();
  specialEquipmentStatus.textContent = capturerEquipped
    ? t('loadout.capturerEquipped')
    : capturerManufactured ? t('loadout.capturerStored') : t('loadout.slotEmpty');
  specialEquipmentNote.textContent = capturerEquipped
    ? t('loadout.recoveryEnabled')
    : t('loadout.recoveryDisabled');
  toggleSpecialEquipmentButton.hidden = !capturerManufactured;
  toggleSpecialEquipmentButton.disabled = bankrupt;
  toggleSpecialEquipmentButton.textContent = capturerEquipped
    ? t('loadout.unequipCapturer')
    : t('loadout.equipCapturer');
  preflightWarning.textContent = capturerEquipped
    ? t('loadout.preflightReady')
    : t('loadout.preflightWarning');
  preflightWarning.classList.toggle('is-ready', capturerEquipped);
  wardenSignalWarning.hidden = state.base.sortiesCompleted < 1;
  wardenSignalWarning.textContent = t('base.wardenSignal');
  const activeAircraftId = state.base.activeAircraftId;
  const activeAircraft = activeAircraftId === null
    ? undefined
    : contentCatalog.aircraft.find((entry) => entry.id === activeAircraftId);
  const activeAircraftName = t(
    aircraftNameKey[activeAircraft?.id ?? ''] ?? 'content.interceptor',
  );
  const activeFueled = activeAircraftId !== null && isAircraftFueled(state.base, activeAircraftId);
  const activeDamage = activeAircraftId === null
    ? 0
    : aircraftDamageValue(state.base, activeAircraftId);
  const activeRepairLeft = activeAircraftId === null
    ? 0
    : (state.base.aircraftRepair[activeAircraftId] ?? 0);
  const fuelStatus = byId<HTMLElement>('fuel-status');
  fuelStatus.hidden = false;
  fuelStatus.classList.toggle('is-ready', activeFueled && activeDamage <= 0);
  fuelStatus.textContent = activeRepairLeft > 0
    ? t('hangar.repairInProgress', { sorties: activeRepairLeft })
    : activeDamage > 0
      ? t('hangar.damagedWarning', {
          value: Math.round(activeDamage * 100),
        })
      : t(
          activeFueled ? 'hangar.preflightFuelReady' : 'hangar.preflightFuelWarning',
          { aircraft: activeAircraftName },
        );
  launchSortieButton.disabled = bankrupt || !activeFueled;
  setText('launch-sortie', 'base.launch');
  setText('return-to-base', 'sortie.return');
  renderContainment();
  renderResearchCards();
  renderCanister();
  renderFleet();
  renderWarehouse();
  renderTrade();
  renderCommand();
  renderDatabank();
}

const aircraftNameKey: Readonly<Record<string, TranslationKey>> = {
  'aircraft-interceptor': 'content.interceptor',
  'aircraft-gunship': 'content.gunship',
  'aircraft-aegis': 'content.aegis',
  'aircraft-yanlong': 'content.yanlong',
};
const aircraftRoleKey: Readonly<Record<string, TranslationKey>> = {
  'aircraft-interceptor': 'aircraft.interceptorRole',
  'aircraft-gunship': 'aircraft.gunshipRole',
  'aircraft-aegis': 'aircraft.aegisRole',
  'aircraft-yanlong': 'aircraft.yanlongRole',
};

function aircraftStatSummary(aircraft: { armour: number; speedMultiplier: number; damageMultiplier: number }): string {
  return [
    t('combat.armour', { value: aircraft.armour }),
    t('aircraft.speed', { value: aircraft.speedMultiplier }),
    t('aircraft.damage', { value: aircraft.damageMultiplier }),
  ].join(' // ');
}

function signedDeltaText(value: number): string {
  if (value > 0) {
    return `+${value}`;
  }
  if (value < 0) {
    return `−${Math.abs(value)}`;
  }
  return '0';
}

function aircraftDeltaText(
  offer: { armour: number; speedMultiplier: number; damageMultiplier: number },
  active: { armour: number; speedMultiplier: number; damageMultiplier: number },
): string {
  const armour = signedDeltaText(offer.armour - active.armour);
  const speed = signedDeltaText(
    Number((offer.speedMultiplier - active.speedMultiplier).toFixed(2)),
  );
  const damage = signedDeltaText(
    Number((offer.damageMultiplier - active.damageMultiplier).toFixed(2)),
  );
  return [
    t('combat.armour', { value: armour }),
    t('aircraft.speed', { value: speed }),
    t('aircraft.damage', { value: damage }),
  ].join(' · ');
}

function renderCandidates(containerId: string, roleId: string): void {
  const state = store.getSnapshot();
  const bankrupt = isBankrupt(state.base.credits);
  const container = byId<HTMLElement>(containerId);
  container.textContent = '';
  const candidates = state.base.staffCandidates.filter(
    (candidate) => candidate.roleId === roleId,
  );
  if (candidates.length === 0) {
    return;
  }
  const role = contentCatalog.staffRoles.find((entry) => entry.id === roleId);
  const facilityBuilt = role !== undefined &&
    state.base.constructedBuildingIds.includes(role.requiredBuildingId);
  const heading = document.createElement('h3');
  heading.className = 'hangar-subtitle';
  heading.textContent = t('staff.candidates');
  container.appendChild(heading);
  for (const candidate of candidates) {
    const row = document.createElement('article');
    row.className = 'threat-row candidate-row';
    const info = document.createElement('div');
    const name = document.createElement('strong');
    name.textContent = `${candidate.firstName} ${candidate.lastName}`;
    const details = document.createElement('small');
    details.textContent = [
      t('staff.tier', { tier: candidate.tier }),
      t('staff.efficiency', { value: candidate.progressMultiplier }),
      t('staff.salary', { credits: candidate.salaryCreditCost }),
    ].join(' · ');
    info.append(name, details);
    row.appendChild(info);
    const hire = document.createElement('button');
    hire.className = 'base-action';
    hire.type = 'button';
    hire.textContent = t('staff.hire', { credits: candidate.hireCreditCost });
    hire.disabled = bankrupt || !facilityBuilt || state.base.credits < candidate.hireCreditCost;
    hire.addEventListener('click', () => {
      store.dispatch({ type: 'HIRE_CANDIDATE', candidateId: candidate.id });
      showToast(t('toast.candidateHired', { name: candidate.firstName + ' ' + candidate.lastName }));
    });
    row.appendChild(hire);
    container.appendChild(row);
  }
}

const moduleNameKey: Readonly<Record<string, TranslationKey>> = {
  'equipment-alien-technology-capturer': 'content.capturer',
};

function localizedModuleName(moduleId: string): string {
  return t(moduleNameKey[moduleId] ?? 'content.capturer');
}

function renderAircraftLoadout(): void {
  const state = store.getSnapshot();
  const bankrupt = isBankrupt(state.base.credits);
  const editor = byId<HTMLElement>('aircraft-loadout-editor');
  editor.textContent = '';
  const activeId = state.base.activeAircraftId;
  if (activeId === null) {
    return;
  }
  const aircraft = contentCatalog.aircraft.find((entry) => entry.id === activeId);
  if (aircraft === undefined) {
    return;
  }
  const loadout = state.base.aircraftLoadouts[activeId] ?? [];
  const heading = document.createElement('strong');
  heading.textContent = `${t('hangar.activeAircraftLabel')}: ${t(
    aircraftNameKey[aircraft.id] ?? 'content.interceptor',
  )}`;
  editor.appendChild(heading);

  const slots = document.createElement('div');
  slots.className = 'loadout-slots';
  loadout.forEach((weaponId, index) => {
    const row = document.createElement('div');
    row.className = 'loadout-row';
    const label = document.createElement('span');
    label.className = 'loadout-row__label';
    label.textContent = t('loadout.primarySlot', { slot: index + 1 });
    const name = document.createElement('strong');
    name.textContent = weaponId === null
      ? t('loadout.slotEmpty')
      : localizedWeaponName(weaponId);
    row.appendChild(label);
    row.appendChild(name);
    if (weaponId !== null) {
      const unequip = document.createElement('button');
      unequip.className = 'base-action';
      unequip.type = 'button';
      unequip.textContent = t('lab.unequip');
      unequip.disabled = bankrupt;
      unequip.addEventListener('click', () => {
        store.dispatch({ type: 'UNEQUIP_PRIMARY_WEAPON', slotIndex: index });
      });
      row.appendChild(unequip);
    }
    slots.appendChild(row);
  });
  editor.appendChild(slots);

  const warehouse = document.createElement('div');
  warehouse.className = 'warehouse-install';
  for (const weapon of contentCatalog.weapons) {
    const stock = state.base.weaponStock[weapon.id] ?? 0;
    if (stock <= 0) {
      continue;
    }
    const row = document.createElement('div');
    row.className = 'loadout-row';
    const label = document.createElement('span');
    label.className = 'loadout-row__label';
    label.textContent = localizedWeaponName(weapon.id);
    const count = document.createElement('strong');
    count.textContent = `×${stock}`;
    row.appendChild(label);
    row.appendChild(count);
    for (let index = 0; index < loadout.length; index += 1) {
      if (loadout[index] !== null) {
        continue;
      }
      const install = document.createElement('button');
      install.className = 'base-action';
      install.type = 'button';
      install.textContent = t('hangar.installInto', { slot: index + 1 });
      install.disabled = bankrupt;
      install.addEventListener('click', () => {
        store.dispatch({
          type: 'EQUIP_PRIMARY_WEAPON',
          weaponId: weapon.id,
          slotIndex: index,
        });
      });
      row.appendChild(install);
    }
    warehouse.appendChild(row);
  }
  if (warehouse.children.length > 0) {
    editor.appendChild(warehouse);
  }
}

function renderWarehouse(): void {
  const state = store.getSnapshot();
  const list = byId<HTMLElement>('warehouse-stock-list');
  list.textContent = '';

  const weapons = contentCatalog.weapons
    .map((weapon) => ({ weapon, stock: state.base.weaponStock[weapon.id] ?? 0 }))
    .filter((entry) => entry.stock > 0);
  if (weapons.length > 0) {
    const heading = document.createElement('h3');
    heading.className = 'hangar-subtitle';
    heading.textContent = t('hangar.weaponStock');
    list.appendChild(heading);
    for (const { weapon, stock } of weapons) {
      const row = document.createElement('article');
      row.className = 'threat-row';
      const name = document.createElement('strong');
      name.textContent = localizedWeaponName(weapon.id);
      const count = document.createElement('span');
      count.textContent = `×${stock}`;
      row.append(name, count);
      list.appendChild(row);
    }
  }

  const consumables = contentCatalog.consumables
    .map((consumable) => ({
      consumable,
      stock: state.base.consumableStock[consumable.id] ?? 0,
    }))
    .filter((entry) => entry.stock > 0);
  if (consumables.length > 0) {
    const heading = document.createElement('h3');
    heading.className = 'hangar-subtitle';
    heading.textContent = t('hangar.rocketStock');
    list.appendChild(heading);
    for (const { consumable, stock } of consumables) {
      const row = document.createElement('article');
      row.className = 'threat-row';
      const name = document.createElement('strong');
      name.textContent = t(consumable.nameKey as TranslationKey);
      const count = document.createElement('span');
      count.textContent = `×${stock}`;
      row.append(name, count);
      list.appendChild(row);
    }
    const rocketStock = state.base.consumableStock[rocketsConsumable.id] ?? 0;
    const activeLoadout = state.base.activeAircraftId === null
      ? []
      : (state.base.aircraftLoadouts[state.base.activeAircraftId] ?? []);
    const podEquipped = activeLoadout.includes(rocketPodWeapon.id);
    const loadedCharges = Math.min(
      rocketsConsumable.chargesPerSortie ?? 0,
      rocketStock,
    );
    if (podEquipped && loadedCharges > 0) {
      const row = document.createElement('article');
      row.className = 'threat-row rocket-loaded-note';
      const name = document.createElement('strong');
      name.textContent = t('hangar.rocketLoaded', { value: loadedCharges });
      row.appendChild(name);
      list.appendChild(row);
    }
  }

  const installedModules = new Set(Object.values(state.base.aircraftModules));
  const modules = state.base.manufacturedEquipmentIds.filter(
    (moduleId) => !installedModules.has(moduleId),
  );
  if (modules.length > 0) {
    const heading = document.createElement('h3');
    heading.className = 'hangar-subtitle';
    heading.textContent = t('hangar.moduleStock');
    list.appendChild(heading);
    for (const moduleId of modules) {
      const row = document.createElement('article');
      row.className = 'threat-row';
      const name = document.createElement('strong');
      name.textContent = localizedModuleName(moduleId);
      const count = document.createElement('span');
      count.textContent = '×1';
      row.append(name, count);
      list.appendChild(row);
    }
  }
}

function renderDatabank(): void {
  const container = byId<HTMLElement>('databank-tables');
  container.textContent = '';

  const buildingNameKey: Readonly<Record<string, TranslationKey>> = {
    'building-laboratory': 'building.laboratory',
    'building-workshop': 'building.workshop',
    'building-quarantine-centre': 'building.quarantine',
    'building-trade-centre': 'building.tradeCentre',
  };
  const staffNameKey: Readonly<Record<string, TranslationKey>> = {
    'staff-scientist': 'staff.scientist',
    'staff-engineer': 'staff.engineer',
    'staff-trader': 'staff.trader',
  };
  const blueprintNameKey: Readonly<Record<string, TranslationKey>> = {
    'blueprint-alien-technology-capturer': 'blueprint.capturer',
    'blueprint-safe-containment': 'blueprint.containment',
    'blueprint-canister-cannon': 'blueprint.canister',
    'blueprint-split-pulse-adaptation': 'blueprint.adapted',
    'blueprint-impulse-accelerator-production': 'blueprint.impulse',
  };
  const enemyNameKey: Readonly<Record<string, TranslationKey>> = {
    'enemy-scout': 'content.scout',
    'enemy-weaver': 'content.weaver',
    'enemy-warden': 'content.warden',
    'enemy-gunship': 'content.enemyGunship',
  };

  const blocks: Array<{
    heading: TranslationKey;
    headers: readonly TranslationKey[];
    rows: readonly HTMLElement[];
  }> = [];

  const weaponHeaders = [
    'databank.colName',
    'databank.colOrigin',
    'databank.colDamage',
    'databank.colCadence',
    'databank.colProjectiles',
    'databank.colSpeed',
    'databank.colMarket',
  ] as const;
  const weaponRows = contentCatalog.weapons.map((weapon) =>
    h('tr', null,
      h('td', { class: 'db-name' }, localizedWeaponName(weapon.id)),
      h('td', { class: weapon.origin === 'alien' ? 'is-alien' : 'is-earth' },
        t(weapon.origin === 'alien' ? 'databank.originAlien' : 'databank.originEarth')),
      h('td', { class: 'num' }, weapon.damage.toString()),
      h('td', { class: 'num' }, weapon.shotsPerSecond.toString()),
      h('td', { class: 'num' }, weapon.projectileCount.toString()),
      h('td', { class: 'num' }, weapon.projectileSpeed.toString()),
      h('td', null, weapon.marketPrice === null ? '—' : `${weapon.marketPrice.minimum}..${weapon.marketPrice.maximum}`),
    ),
  );
  blocks.push({ heading: 'databank.weapons', headers: weaponHeaders, rows: weaponRows });

  const aircraftHeaders = [
    'databank.colName',
    'databank.colRole',
    'databank.colArmour',
    'databank.colSpeed',
    'databank.colDamage',
    'databank.colSlots',
    'databank.colRefuel',
    'databank.colMarket',
  ] as const;
  const aircraftRows = contentCatalog.aircraft.map((aircraft) =>
    h('tr', null,
      h('td', { class: 'db-name' }, t(aircraftNameKey[aircraft.id] ?? 'content.interceptor')),
      h('td', null, t(aircraftRoleKey[aircraft.id] ?? 'aircraft.interceptorRole')),
      h('td', { class: 'num' }, aircraft.armour.toString()),
      h('td', { class: 'num' }, `${aircraft.speedMultiplier}×`),
      h('td', { class: 'num' }, `${aircraft.damageMultiplier}×`),
      h('td', { class: 'num' }, aircraft.weaponSlotCount.toString()),
      h('td', { class: 'num' }, `${aircraft.refuelCreditCost} cr`),
      h('td', null, aircraft.marketPrice === null ? '—' : `${aircraft.marketPrice.minimum}..${aircraft.marketPrice.maximum}`),
    ),
  );
  blocks.push({ heading: 'databank.aircraft', headers: aircraftHeaders, rows: aircraftRows });

  const enemyHeaders = [
    'databank.colName',
    'databank.colKind',
    'databank.colArmour',
    'databank.colSpeed',
    'databank.colContact',
    'databank.colScore',
    'databank.colMaterials',
    'databank.colCredits',
    'databank.colRanged',
  ] as const;
  const enemyRows = contentCatalog.enemies.map((enemy) =>
    h('tr', null,
      h('td', { class: 'db-name' }, t(enemyNameKey[enemy.id] ?? 'content.warden')),
      h('td', null, t(enemy.kind === 'elite' ? 'databank.kindElite' : 'databank.kindRegular')),
      h('td', { class: 'num' }, enemy.armour.toString()),
      h('td', { class: 'num' }, enemy.speed.toString()),
      h('td', { class: 'num' }, enemy.contactDamage.toString()),
      h('td', { class: 'num' }, enemy.score.toString()),
      h('td', { class: 'num' }, enemy.materialReward.toString()),
      h('td', { class: 'num' }, enemy.creditReward.toString()),
      h('td', null, enemy.ranged === null ? '—' : t('databank.yes')),
    ),
  );
  blocks.push({ heading: 'databank.enemies', headers: enemyHeaders, rows: enemyRows });

  const buildingHeaders = ['databank.colName', 'databank.colCost', 'databank.colPrereq'] as const;
  const buildingRows = contentCatalog.buildings.map((building) => {
    const prerequisites: string[] = [];
    if (building.requiredBuildingId !== null) {
      prerequisites.push(t(buildingNameKey[building.requiredBuildingId] ?? 'building.laboratory'));
    }
    if (building.requiredBlueprintId !== null) {
      prerequisites.push(t(blueprintNameKey[building.requiredBlueprintId] ?? 'blueprint.capturer'));
    }
    return h('tr', null,
      h('td', { class: 'db-name' }, t(buildingNameKey[building.id] ?? 'building.laboratory')),
      h('td', { class: 'num' }, `${building.creditCost} cr / ${building.materialCost} mat`),
      h('td', null, prerequisites.length === 0 ? '—' : prerequisites.join(' + ')),
    );
  });
  blocks.push({ heading: 'databank.buildings', headers: buildingHeaders, rows: buildingRows });

  const staffHeaders = ['databank.colName', 'databank.colCost', 'databank.colPrereq', 'databank.colHeadcount'] as const;
  const staffRows = contentCatalog.staffRoles.map((role) =>
    h('tr', null,
      h('td', { class: 'db-name' }, t(staffNameKey[role.id] ?? 'staff.scientist')),
      h('td', { class: 'num' }, `${role.creditCost} cr`),
      h('td', null, t(buildingNameKey[role.requiredBuildingId] ?? 'building.laboratory')),
      h('td', { class: 'num' }, role.maximumHeadcount === null ? '—' : role.maximumHeadcount.toString()),
    ),
  );
  blocks.push({ heading: 'databank.staff', headers: staffHeaders, rows: staffRows });

  const blueprintHeaders = [
    'databank.colName',
    'databank.colDomain',
    'databank.colProgress',
    'databank.colRequirements',
    'databank.colOutput',
  ] as const;
  const blueprintRows = [
    ...contentCatalog.blueprints.map((blueprint) =>
      h('tr', null,
        h('td', { class: 'db-name' }, t(blueprintNameKey[blueprint.id] ?? 'blueprint.capturer')),
        h('td', { class: 'is-earth' }, t('databank.originEarth')),
        h('td', { class: 'num' }, `${blueprint.requiredProgress} sorties`),
        h('td', null, [
          t(buildingNameKey[blueprint.requiredBuildingId] ?? 'building.laboratory'),
          t(staffNameKey[blueprint.requiredStaffRoleId] ?? 'staff.scientist'),
        ].join(' + ')),
        h('td', null, t('content.capturer')),
      ),
    ),
    ...contentCatalog.buildingBlueprints.map((blueprint) =>
      h('tr', null,
        h('td', { class: 'db-name' }, t(blueprintNameKey[blueprint.id] ?? 'blueprint.containment')),
        h('td', { class: 'is-earth' }, t('databank.originEarth')),
        h('td', { class: 'num' }, `${blueprint.requiredProgress} sorties`),
        h('td', null, [
          t(buildingNameKey[blueprint.requiredBuildingId] ?? 'building.laboratory'),
          t(staffNameKey[blueprint.requiredStaffRoleId] ?? 'staff.scientist'),
        ].join(' + ')),
        h('td', null, t(buildingNameKey[blueprint.outputBuildingId] ?? 'building.quarantine')),
      ),
    ),
    ...contentCatalog.adaptedWeaponBlueprints.map((blueprint) =>
      h('tr', null,
        h('td', { class: 'db-name' }, t(blueprintNameKey[blueprint.id] ?? 'blueprint.adapted')),
        h('td', { class: 'is-alien' }, t('databank.originAlien')),
        h('td', { class: 'num' }, '—'),
        h('td', null, [t('building.quarantine'), t('staff.scientist')].join(' + ')),
        h('td', null, t('content.splitPulse')),
      ),
    ),
    ...contentCatalog.researchWeaponBlueprints.map((blueprint) =>
      h('tr', null,
        h('td', { class: 'db-name' }, t(blueprintNameKey[blueprint.id] ?? 'blueprint.canister')),
        h('td', { class: 'is-earth' }, t('databank.originEarth')),
        h('td', { class: 'num' }, `${blueprint.requiredProgress} sorties`),
        h('td', null, [
          t(buildingNameKey[blueprint.requiredBuildingId] ?? 'building.laboratory'),
          t(staffNameKey[blueprint.requiredStaffRoleId] ?? 'staff.scientist'),
        ].join(' + ')),
        h('td', null, t('content.canisterCannon')),
      ),
    ),
    ...contentCatalog.marketWeaponBlueprints.map((blueprint) =>
      h('tr', null,
        h('td', { class: 'db-name' }, t(blueprintNameKey[blueprint.id] ?? 'blueprint.impulse')),
        h('td', { class: 'is-earth' }, t('databank.originEarth')),
        h('td', { class: 'num' }, `${blueprint.minimumSorties} sorties`),
        h('td', null, '—'),
        h('td', null, t('content.impulseAccelerator')),
      ),
    ),
  ];
  blocks.push({ heading: 'databank.blueprints', headers: blueprintHeaders, rows: blueprintRows });

  for (const block of blocks) {
    const section = h('section', { class: 'databank-block' });
    section.append(h('h2', null, t(block.heading)));
    if (block.rows.length === 0) {
      section.append(h('p', { class: 'empty-note' }, t('databank.empty')));
    } else {
      const headRow = h('tr', null,
        ...block.headers.map((key) => h('th', { scope: 'col' }, t(key))),
      );
      const table = h('table', { class: 'data-table' });
      table.append(h('thead', null, headRow), h('tbody', null, ...block.rows));
      section.append(h('div', { class: 'data-table-wrap' }, table));
    }
    container.append(section);
  }
}
function renderTrade(): void {
  const state = store.getSnapshot();
  const bankrupt = isBankrupt(state.base.credits);
  const tradeCentre = contentCatalog.buildings.find(
    (entry) => entry.id === 'building-trade-centre',
  );
  const creditPanel = byId<HTMLElement>('credit-offers-list')
    .closest('.command-panel') as HTMLElement | null;
  const dynamic = byId<HTMLElement>('trade-dynamic');
  dynamic.textContent = '';
  if (tradeCentre === undefined) {
    if (creditPanel !== null) {
      creditPanel.hidden = true;
    }
    return;
  }
  const built = state.base.constructedBuildingIds.includes(tradeCentre.id);
  if (creditPanel !== null) {
    creditPanel.hidden = !built;
  }
  if (!built) {
    const note = document.createElement('p');
    note.className = 'preflight-warning';
    note.textContent = t('trade.locked');
    dynamic.appendChild(note);
    const workshopBuilt = state.base.constructedBuildingIds.includes('building-workshop');
    const construct = document.createElement('button');
    construct.className = 'base-action is-primary';
    construct.type = 'button';
    construct.textContent = t('trade.construct', {
      credits: tradeCentre.creditCost,
    });
    construct.disabled = bankrupt || !workshopBuilt || state.base.credits < tradeCentre.creditCost;
    construct.addEventListener('click', () => {
      store.dispatch({ type: 'CONSTRUCT_BUILDING', buildingId: tradeCentre.id });
      showToast(t('toast.buildingConstructed'));
    });
    dynamic.appendChild(construct);
    return;
  }

  const trader = state.base.staff.find(
    (member) => member.roleId === 'staff-trader',
  );
  const managerHeading = document.createElement('h3');
  managerHeading.className = 'hangar-subtitle';
  managerHeading.textContent = t('trade.manager');
  dynamic.appendChild(managerHeading);
  if (trader === undefined) {
    const note = document.createElement('p');
    note.className = 'preflight-warning';
    note.textContent = t('trade.noManager');
    dynamic.appendChild(note);
    const candidate = state.base.staffCandidates.find(
      (entry) => entry.roleId === 'staff-trader',
    );
    if (candidate !== undefined) {
      const hire = document.createElement('button');
      hire.className = 'base-action is-primary';
      hire.type = 'button';
      hire.textContent = t('staff.hire', { credits: candidate.hireCreditCost });
      hire.disabled = bankrupt || state.base.credits < candidate.hireCreditCost;
      hire.addEventListener('click', () => {
        store.dispatch({ type: 'HIRE_CANDIDATE', candidateId: candidate.id });
        showToast(t('toast.candidateHired', { name: candidate.firstName + ' ' + candidate.lastName }));
      });
      dynamic.appendChild(hire);
    }
  } else {
    const margin = document.createElement('p');
    margin.textContent = t('trade.margin', {
      margin: Math.round(tradeMargin(state.base) * 100),
    });
    dynamic.appendChild(margin);
  }

  const buyHeading = document.createElement('h3');
  buyHeading.className = 'hangar-subtitle';
  buyHeading.textContent = t('trade.buyTitle');
  dynamic.appendChild(buyHeading);
  for (const weapon of contentCatalog.weapons) {
    if (weapon.marketPrice === null || weapon.origin !== 'earth') {
      continue;
    }
    const price = marketWeaponPrice(
      weapon,
      state.base.marketSeed,
      state.base.sortiesCompleted,
    );
    const row = document.createElement('div');
    row.className = 'loadout-row';
    const label = document.createElement('span');
    label.className = 'loadout-row__label';
    label.textContent = localizedWeaponName(weapon.id);
    const buy = document.createElement('button');
    buy.className = 'base-action';
    buy.type = 'button';
    buy.textContent = t('trade.buy', { credits: price });
    buy.disabled = bankrupt || state.base.credits < price;
    buy.addEventListener('click', () => {
      store.dispatch({ type: 'PURCHASE_MARKET_WEAPON', weaponId: weapon.id });
    });
    row.append(label, buy);
    dynamic.appendChild(row);
  }
  for (const blueprint of contentCatalog.marketWeaponBlueprints) {
    const owned = state.base.unlockedBlueprintIds.includes(blueprint.id);
    const available = state.base.sortiesCompleted >= blueprint.minimumSorties;
    if (!available) {
      continue;
    }
    const price = marketBlueprintPrice(
      blueprint,
      state.base.marketSeed,
      state.base.sortiesCompleted,
    );
    const row = document.createElement('div');
    row.className = 'loadout-row';
    const label = document.createElement('span');
    label.className = 'loadout-row__label';
    label.textContent = t('trade.blueprintLabel', {
      weapon: localizedWeaponName(blueprint.weaponId),
    });
    if (owned) {
      const ownedNote = document.createElement('strong');
      ownedNote.textContent = t('market.blueprintOwned');
      row.append(label, ownedNote);
    } else {
      const buy = document.createElement('button');
      buy.className = 'base-action';
      buy.type = 'button';
      buy.textContent = t('trade.buy', { credits: price });
      buy.disabled = bankrupt || state.base.credits < price;
      buy.addEventListener('click', () => {
        store.dispatch({
          type: 'PURCHASE_MARKET_BLUEPRINT',
          blueprintId: blueprint.id,
        });
      });
      row.append(label, buy);
    }
    dynamic.appendChild(row);
  }
  for (const consumable of contentCatalog.consumables) {
    const price = marketConsumablePrice(
      consumable,
      state.base.marketSeed,
      state.base.sortiesCompleted,
    );
    const row = document.createElement('div');
    row.className = 'loadout-row';
    const label = document.createElement('span');
    label.className = 'loadout-row__label';
    label.textContent = t(consumable.nameKey as TranslationKey);
    const buy = document.createElement('button');
    buy.className = 'base-action';
    buy.type = 'button';
    buy.textContent = t('trade.buy', { credits: price });
    buy.disabled = bankrupt || state.base.credits < price;
    buy.addEventListener('click', () => {
      store.dispatch({ type: 'PURCHASE_CONSUMABLE', consumableId: consumable.id });
    });
    row.append(label, buy);
    dynamic.appendChild(row);
  }

  const sellHeading = document.createElement('h3');
  sellHeading.className = 'hangar-subtitle';
  sellHeading.textContent = t('trade.sellTitle');
  dynamic.appendChild(sellHeading);
  const sellables = contentCatalog.weapons.filter(
    (weapon) => (state.base.weaponStock[weapon.id] ?? 0) > 0,
  );
  if (sellables.length === 0) {
    const note = document.createElement('p');
    note.className = 'empty-note';
    note.textContent = t('trade.noStock');
    dynamic.appendChild(note);
  } else {
    for (const weapon of sellables) {
      const basePrice = weapon.marketPrice === null
        ? 100
        : marketWeaponPrice(
            weapon,
            state.base.marketSeed,
            state.base.sortiesCompleted,
          );
      const price = Math.round(basePrice * 0.5 * (1 + tradeMargin(state.base)));
      const row = document.createElement('div');
      row.className = 'loadout-row';
      const label = document.createElement('span');
      label.className = 'loadout-row__label';
      label.textContent = localizedWeaponName(weapon.id);
      const count = document.createElement('strong');
      count.textContent = `×${state.base.weaponStock[weapon.id] ?? 0}`;
      const sell = document.createElement('button');
      sell.className = 'base-action';
      sell.type = 'button';
      sell.textContent = t('trade.sell', { credits: price });
      sell.addEventListener('click', () => {
        store.dispatch({ type: 'SELL_WEAPON', weaponId: weapon.id });
      });
      row.append(label, count, sell);
      dynamic.appendChild(row);
    }
  }
  renderCredit();
}

function renderFleet(): void {
  const state = store.getSnapshot();
  const bankrupt = isBankrupt(state.base.credits);
  const slotsList = byId<HTMLElement>('hangar-slots-list');
  const marketList = byId<HTMLElement>('aircraft-market-list');
  const activeAircraft = contentCatalog.aircraft.find(
    (entry) => entry.id === state.base.activeAircraftId,
  );

  slotsList.textContent = '';
  state.base.hangarSlots.forEach((aircraftId, index) => {
    const slot = document.createElement('article');
    slot.className = 'fleet-slot';
    const header = document.createElement('div');
    header.className = 'fleet-slot__header';
    const slotLabel = document.createElement('span');
    slotLabel.className = 'fleet-slot__bay';
    slotLabel.textContent = t('hangar.bayLabel', { slot: index + 1 });
    header.appendChild(slotLabel);
    if (aircraftId === null) {
      const empty = document.createElement('strong');
      empty.textContent = t('hangar.slotEmpty');
      header.appendChild(empty);
    } else {
      const aircraft = contentCatalog.aircraft.find((entry) => entry.id === aircraftId);
      if (aircraft !== undefined) {
        if (state.base.activeAircraftId === aircraft.id) {
          slot.classList.add('is-active');
        }
        if (aircraftDamageValue(state.base, aircraft.id) > 0) {
          slot.classList.add('is-damaged');
        }
        const ship = document.createElement('div');
        ship.className = 'fleet-slot__ship';
        ship.innerHTML = aircraftShipSvg(aircraft.visual);
        slot.appendChild(ship);
        const name = document.createElement('strong');
        name.textContent = t(aircraftNameKey[aircraft.id] ?? 'content.interceptor');
        header.appendChild(name);
        const stats = document.createElement('small');
        stats.textContent = aircraftStatSummary(aircraft);
        header.appendChild(stats);
        const fuel = document.createElement('span');
        fuel.className = isAircraftFueled(state.base, aircraft.id)
          ? 'status-chip is-fueled'
          : 'status-chip is-unfueled';
        fuel.textContent = t(
          isAircraftFueled(state.base, aircraft.id)
            ? 'command.fueled'
            : 'command.unfueled',
        );
        header.appendChild(fuel);
        const repairing = isAircraftRepairing(state.base, aircraft.id);
        if (repairing) {
          const damage = document.createElement('span');
          damage.className = 'status-chip is-damaged';
          damage.textContent = t('hangar.damage', {
            value: Math.round(aircraftDamageValue(state.base, aircraft.id) * 100),
          });
          header.appendChild(damage);
        }
        if (state.base.activeAircraftId === aircraft.id) {
          const active = document.createElement('em');
          active.className = 'status-chip is-active';
          active.textContent = t('hangar.activeAircraft');
          header.appendChild(active);
        }
        const actions = document.createElement('div');
        actions.className = 'fleet-slot__actions';
        if (repairing) {
          const repairLeft = state.base.aircraftRepair[aircraft.id];
          if ((repairLeft ?? 0) > 0) {
            const note = document.createElement('small');
            note.textContent = t('hangar.repairInProgress', {
              sorties: repairLeft ?? 0,
            });
            actions.appendChild(note);
          } else {
            const standardCost = standardRepairCost(state.base, aircraft.id);
            const standard = document.createElement('button');
            standard.className = 'base-action is-primary';
            standard.type = 'button';
            standard.textContent = t('hangar.repair', { credits: standardCost });
            standard.disabled = bankrupt || state.base.credits < standardCost;
            standard.addEventListener('click', () => {
              store.dispatch({
                type: 'REPAIR_AIRCRAFT',
                aircraftId: aircraft.id,
                emergency: false,
              });
            });
            actions.appendChild(standard);
            const emergencyCost = emergencyRepairCost(state.base, aircraft.id);
            const emergency = document.createElement('button');
            emergency.className = 'base-action';
            emergency.type = 'button';
            emergency.textContent = t('hangar.emergencyRepair', {
              credits: emergencyCost,
            });
            emergency.disabled = bankrupt || state.base.credits < emergencyCost;
            emergency.addEventListener('click', () => {
              store.dispatch({
                type: 'REPAIR_AIRCRAFT',
                aircraftId: aircraft.id,
                emergency: true,
              });
            });
            actions.appendChild(emergency);
          }
        }
        if (!isAircraftFueled(state.base, aircraft.id)) {
          const refuel = document.createElement('button');
          refuel.className = 'base-action is-primary';
          refuel.type = 'button';
          refuel.textContent = t('hangar.refuelWithCost', {
            credits: aircraft.refuelCreditCost,
          });
          refuel.disabled = bankrupt || state.base.credits < aircraft.refuelCreditCost;
          refuel.addEventListener('click', () => {
            store.dispatch({ type: 'REFUEL_AIRCRAFT', aircraftId: aircraft.id });
          });
          actions.appendChild(refuel);
        }
        if (state.base.activeAircraftId !== aircraft.id) {
          const activate = document.createElement('button');
          activate.className = 'base-action is-primary';
          activate.type = 'button';
          activate.textContent = t('hangar.activate');
          activate.disabled = bankrupt;
          activate.addEventListener('click', () => {
            store.dispatch({ type: 'SET_ACTIVE_AIRCRAFT', aircraftId });
          });
          actions.appendChild(activate);
        }
        header.appendChild(actions);
      }
    }
    slot.appendChild(header);
    slotsList.appendChild(slot);
  });

  marketList.textContent = '';
  for (const aircraft of contentCatalog.aircraft) {
    if (aircraft.marketPrice === null) {
      continue;
    }
    const owned = state.base.hangarSlots.includes(aircraft.id);
    const freeSlot = state.base.hangarSlots.includes(null);
    const price = marketAircraftPrice(
      aircraft,
      state.base.marketSeed,
      state.base.sortiesCompleted,
    );
    const offer = document.createElement('article');
    offer.className = 'aircraft-offer';
    const info = document.createElement('div');
    const name = document.createElement('strong');
    name.textContent = t(aircraftNameKey[aircraft.id] ?? 'content.interceptor');
    const role = document.createElement('small');
    role.textContent = t(aircraftRoleKey[aircraft.id] ?? 'aircraft.interceptorRole');
    const stats = document.createElement('small');
    stats.textContent = aircraftStatSummary(aircraft);
    info.append(name, role, stats);
    if (!owned && activeAircraft !== undefined) {
      const delta = document.createElement('small');
      delta.className = 'aircraft-delta';
      delta.textContent = `${t('hangar.vsActive', {
        aircraft: t(aircraftNameKey[activeAircraft.id] ?? 'content.interceptor'),
      })} ${aircraftDeltaText(aircraft, activeAircraft)}`;
      info.appendChild(delta);
    }
    offer.appendChild(info);
    if (owned) {
      const badge = document.createElement('em');
      badge.className = 'status-chip is-owned';
      badge.textContent = t('hangar.aircraftOwned');
      offer.appendChild(badge);
    } else {
      const priceText = document.createElement('strong');
      priceText.textContent = t('hangar.aircraftCost', { credits: price });
      const note = document.createElement('small');
      note.textContent = !freeSlot
        ? t('hangar.slotFull')
        : state.base.credits >= price
          ? t('hangar.aircraftAffordable')
          : t('hangar.aircraftShortfall', { credits: price - state.base.credits });
      const buyButton = document.createElement('button');
      buyButton.className = 'base-action';
      buyButton.type = 'button';
      buyButton.textContent = t('hangar.purchaseAircraft', {
        aircraft: t(aircraftNameKey[aircraft.id] ?? 'content.interceptor'),
      });
      buyButton.disabled = bankrupt || !freeSlot || state.base.credits < price;
      buyButton.addEventListener('click', () => {
        store.dispatch({ type: 'PURCHASE_AIRCRAFT', aircraftId: aircraft.id });
      });
      offer.append(priceText, note, buyButton);
    }
    marketList.appendChild(offer);
  }

  byId<HTMLElement>('hangar-slot-cost').textContent = t('hangar.slotCost', {
    credits: HANGAR_SLOT_COST,
  });
  const purchaseSlotButton = byId<HTMLButtonElement>('purchase-hangar-slot');
  purchaseSlotButton.hidden = false;
  purchaseSlotButton.disabled = bankrupt || state.base.credits < HANGAR_SLOT_COST;
}

function renderCommand(): void {
  const state = store.getSnapshot();
  byId<HTMLElement>('command-month-eyebrow').textContent = t('command.monthEyebrow', {
    month: state.base.month,
  });
  const monthProgress = state.base.sortiesCompleted % MONTH_SORTIE_LENGTH;
  const timeline = byId<HTMLElement>('month-timeline');
  timeline.textContent = '';
  const phases = [
    { key: 'command.phasePlan', active: monthProgress === 0 },
    { key: 'command.phaseExecute', active: monthProgress > 0 },
    { key: 'command.phaseSettle', active: false },
  ] as const;
  for (const phase of phases) {
    const segment = document.createElement('span');
    segment.className = 'month-timeline__phase' + (phase.active ? ' is-active' : '');
    segment.textContent = t(phase.key as TranslationKey);
    timeline.appendChild(segment);
  }

  const geoMap = byId<HTMLElement>('geo-map');
  geoMap.textContent = '';
  const geoPositions: Readonly<Record<string, { left: number; top: number }>> = {
    'council-prc': { left: 78, top: 28 },
    'council-ukraine': { left: 52, top: 24 },
    'council-india': { left: 68, top: 42 },
    'council-brazil': { left: 22, top: 68 },
  };
  for (const stateDefinition of contentCatalog.councilStates) {
    const mission = state.base.threatMap.find(
      (entry) => entry.targetCountryId === stateDefinition.id,
    );
    const position = geoPositions[stateDefinition.id] ?? { left: 50, top: 50 };
    const marker = document.createElement('div');
    marker.className = 'geo-map__marker' + (mission === undefined
      ? ' is-calm'
      : ' is-threat-' + String(Math.min(3, Math.max(1, mission.threatLevel))));
    marker.style.left = position.left + '%';
    marker.style.top = position.top + '%';
    const dot = document.createElement('span');
    dot.className = 'geo-map__dot';
    const name = document.createElement('small');
    name.textContent = t(stateDefinition.nameKey as TranslationKey);
    marker.append(dot, name);
    geoMap.appendChild(marker);
  }

  byId<HTMLElement>('command-month-summary').textContent = t('command.monthSummary', {
    count: state.base.threatMap.length,
  });
  const threatList = byId<HTMLElement>('threat-map-list');
  threatList.textContent = '';
  for (const mission of state.base.threatMap) {
    const stateDefinition = contentCatalog.councilStates.find(
      (entry) => entry.id === mission.targetCountryId,
    );
    const row = document.createElement('article');
    row.className = 'threat-row';
    const name = document.createElement('strong');
    name.textContent = stateDefinition === undefined
      ? mission.targetCountryId
      : t(stateDefinition.nameKey as TranslationKey);
    const level = document.createElement('span');
    level.textContent = t('command.threatLevel', { value: mission.threatLevel });
    row.append(name, level);
    threatList.appendChild(row);
  }

  const fuelList = byId<HTMLElement>('command-fuel-list');
  fuelList.textContent = '';
  for (const aircraftId of state.base.hangarSlots) {
    if (aircraftId === null) {
      continue;
    }
    const aircraft = contentCatalog.aircraft.find((entry) => entry.id === aircraftId);
    if (aircraft === undefined) {
      continue;
    }
    const row = document.createElement('article');
    row.className = 'threat-row';
    const name = document.createElement('strong');
    name.textContent = t(aircraftNameKey[aircraft.id] ?? 'content.interceptor');
    const fuel = document.createElement('span');
    fuel.textContent = t(
      isAircraftFueled(state.base, aircraft.id) ? 'command.fueled' : 'command.unfueled',
    );
    row.append(name, fuel);
    fuelList.appendChild(row);
  }
}

function renderCredit(): void {
  const state = store.getSnapshot();
  const bankrupt = isBankrupt(state.base.credits);
  const offersList = byId<HTMLElement>('credit-offers-list');
  const loansList = byId<HTMLElement>('active-loans-list');
  const lenderName = (lenderId: string): string => {
    if (lenderId === 'lender-commission') {
      return t('credit.lenderCommission');
    }
    if (lenderId === 'lender-prc') {
      return t('country.prc');
    }
    return t('country.ukraine');
  };

  offersList.textContent = '';
  for (const offer of LOAN_OFFERS) {
    const available = !hasOutstandingLoan(state.base, offer.lenderId);
    const row = document.createElement('article');
    row.className = 'threat-row';
    const info = document.createElement('div');
    const name = document.createElement('strong');
    name.textContent = lenderName(offer.lenderId);
    const terms = document.createElement('small');
    terms.textContent = [
      t('credit.offerRepay', {
        principal: offer.principal,
        repayment: loanRepayment(offer),
      }),
      t('credit.offerTerms', {
        interest: offer.interestRate * 100,
        months: offer.termMonths,
      }),
    ].join(' · ');
    info.append(name, terms);
    row.appendChild(info);
    if (available) {
      const take = document.createElement('button');
      take.className = 'base-action';
      take.type = 'button';
      take.textContent = t('credit.takeLoan');
      take.disabled = bankrupt;
      take.addEventListener('click', () => {
        store.dispatch({ type: 'TAKE_LOAN', lenderId: offer.lenderId });
        showToast(t('toast.loanTaken'));
      });
      row.appendChild(take);
    } else {
      const badge = document.createElement('em');
      badge.className = 'status-chip is-owned';
      badge.textContent = t('credit.outstanding');
      row.appendChild(badge);
    }
    offersList.appendChild(row);
  }

  loansList.textContent = '';
  const activeLoans = state.base.loans.filter((loan) => !loan.repaid);
  if (activeLoans.length > 0) {
    const header = document.createElement('h3');
    header.className = 'hangar-subtitle';
    header.textContent = t('credit.activeLoans');
    loansList.appendChild(header);
  }
  for (const loan of state.base.loans) {
    const row = document.createElement('article');
    row.className = 'threat-row';
    const name = document.createElement('strong');
    name.textContent = lenderName(loan.lenderId);
    const info = document.createElement('small');
    info.textContent = loan.repaid
      ? t('credit.repaid')
      : [
          t('credit.offerRepay', {
            principal: loan.principal,
            repayment: loan.repaymentDue,
          }),
          t('credit.loanDue', { month: loan.dueMonth }),
        ].join(' · ');
    row.append(name, info);
    loansList.appendChild(row);
  }
}

function renderCanister(): void {
  const state = store.getSnapshot();
  const bankrupt = isBankrupt(state.base.credits);
  const researchBusy = state.base.researchQueue.length > 0;
  const canisterUnlocked = state.base.unlockedBlueprintIds.includes(canisterBlueprint.id);
  const canisterOwned = state.base.ownedPrimaryWeaponIds.includes(canisterWeapon.id);
  const canisterProject = state.base.researchQueue.find(
    (project) => project.blueprintId === canisterBlueprint.id,
  );
  const labBuilt = state.base.constructedBuildingIds.includes(laboratory.id);
  const scientists = state.base.staff.filter(
    (member) => member.roleId === scientistRole.id,
  ).length;
  const researchReady = labBuilt && scientists > 0;
  const workshopBuilt = state.base.constructedBuildingIds.includes(workshop.id);
  const engineers = state.base.staff.filter(
    (member) => member.roleId === engineerRole.id,
  ).length;
  const productionReady = workshopBuilt && engineers > 0;

  canisterResearchStatus.textContent = canisterUnlocked
    ? t('research.canisterUnlocked')
    : canisterProject !== undefined
      ? t('research.canisterActive', {
          progress: canisterProject.progress,
          required: canisterProject.requiredProgress,
        })
      : researchReady
        ? t('research.canisterAvailable')
        : t('research.canisterRequiresTeam');
  canisterResearchNote.textContent = canisterProject === undefined
    ? ''
    : t('programme.contribution', { count: scientists });
  researchCanisterButton.hidden = canisterUnlocked || canisterProject !== undefined;
  researchCanisterButton.disabled = bankrupt || !researchReady || researchBusy;

  canisterProductionRow.hidden = !canisterUnlocked || canisterOwned;
  if (canisterUnlocked && !canisterOwned) {
    canisterProductionStatus.textContent = productionReady
      ? t('production.ready')
      : t('production.requiresEngineer');
    canisterProductionNote.textContent = t('production.cost', {
      credits: canisterBlueprint.productionCreditCost,
      materials: canisterBlueprint.productionMaterialCost,
    });
    manufactureCanisterButton.disabled =
      bankrupt ||
      !productionReady ||
      state.base.credits < canisterBlueprint.productionCreditCost ||
      state.base.materials < canisterBlueprint.productionMaterialCost;
  }
}

function renderContainment(): void {
  const state = store.getSnapshot();
  const bankrupt = isBankrupt(state.base.credits);
  const researchBusy = state.base.researchQueue.length > 0;
  const hasSample = state.base.preservedTechnologyIds.includes(prism.id);
  const containmentUnlocked = state.base.unlockedBlueprintIds.includes(
    containmentBlueprint.id,
  );
  const quarantineBuilt = state.base.constructedBuildingIds.includes(quarantine.id);
  const containmentProject = state.base.researchQueue.find(
    (project) => project.blueprintId === containmentBlueprint.id,
  );
  const labBuilt = state.base.constructedBuildingIds.includes(laboratory.id);
  const scientists = state.base.staff.filter(
    (member) => member.roleId === scientistRole.id,
  ).length;
  const researchReady = labBuilt && scientists > 0;
  const workshopBuilt = state.base.constructedBuildingIds.includes(workshop.id);
  const engineers = state.base.staff.filter(
    (member) => member.roleId === engineerRole.id,
  ).length;
  const productionReady = workshopBuilt && engineers > 0;
  const adaptedUnlocked = state.base.unlockedBlueprintIds.includes(adaptedBlueprint.id);
  const emitterOwned = state.base.ownedPrimaryWeaponIds.includes(splitPulseWeapon.id);

  containmentProgramme.hidden = !hasSample;
  if (containmentUnlocked) {
    containmentStatus.textContent = t('containment.unlocked');
    containmentNote.textContent = '';
    startContainmentResearchButton.hidden = true;
  } else if (containmentProject !== undefined) {
    containmentStatus.textContent = t('containment.active', {
      progress: containmentProject.progress,
      required: containmentProject.requiredProgress,
    });
    containmentNote.textContent = researchReady
      ? t('containment.contribution', { count: scientists })
      : '';
    startContainmentResearchButton.hidden = true;
  } else {
    containmentStatus.textContent = researchReady
      ? t('containment.available')
      : t('containment.requiresTeam');
    containmentNote.textContent = '';
    startContainmentResearchButton.hidden = false;
    startContainmentResearchButton.disabled = bankrupt || !researchReady || researchBusy;
  }

  quarantineRow.hidden = !containmentUnlocked;
  if (quarantineBuilt) {
    quarantineStatus.textContent = t('facility.quarantineBuilt');
    quarantineCost.textContent = '';
    constructQuarantineButton.hidden = true;
  } else {
    quarantineStatus.textContent =
      state.base.credits >= quarantine.creditCost &&
      state.base.materials >= quarantine.materialCost
        ? t('facility.quarantineAffordable')
        : t('facility.quarantineShortfall', {
            credits: Math.max(0, quarantine.creditCost - state.base.credits),
            materials: Math.max(0, quarantine.materialCost - state.base.materials),
          });
    quarantineCost.textContent = t('facility.quarantineCost', {
      credits: quarantine.creditCost,
      materials: quarantine.materialCost,
    });
    constructQuarantineButton.hidden = false;
    constructQuarantineButton.disabled =
      bankrupt ||
      !workshopBuilt ||
      state.base.credits < quarantine.creditCost ||
      state.base.materials < quarantine.materialCost;
  }

  alienEmitterProductionRow.hidden = !adaptedUnlocked || emitterOwned;
  if (adaptedUnlocked && !emitterOwned) {
    alienEmitterProductionStatus.textContent = productionReady
      ? t('production.ready')
      : t('production.requiresEngineer');
    alienEmitterProductionNote.textContent = t('alienProduction.cost', {
      credits: adaptedBlueprint.productionCreditCost,
      materials: adaptedBlueprint.productionMaterialCost,
    });
    manufactureAlienEmitterButton.disabled =
      bankrupt ||
      !productionReady ||
      state.base.credits < adaptedBlueprint.productionCreditCost ||
      state.base.materials < adaptedBlueprint.productionMaterialCost;
  }
}

function renderLocale(): void {
  document.documentElement.lang = getLocale();
  setText('app-brand', 'app.brand');
  setText('route-base', 'nav.base');
  setText('route-sortie', 'nav.sortie');
  baseNavigation.setAttribute('aria-label', t('baseNav.aria'));
  setText('base-tab-command', 'baseNav.command');
  setText('base-tab-research', 'baseNav.research');
  setText('base-tab-engineering', 'baseNav.engineering');
  setText('base-tab-hangar', 'baseNav.hangar');
  setText('base-tab-trade', 'baseNav.trade');
  setText('base-tab-databank', 'baseNav.databank');
  setText('databank-section-eyebrow', 'databank.eyebrow');
  setText('databank-section-title', 'databank.title');
  setText('databank-section-lede', 'databank.lede');
  setText('settings-title', 'settings.title');
  setText('language-label', 'settings.language');
  setText('restart-mission', 'settings.restart');
  setText('locale-option-uk', 'locale.uk');
  setText('locale-option-en', 'locale.en');
  setText('locale-option-zh', 'locale.zh');
  setText('mandate-label', 'mandate.label');
  setText('mandate-copy', 'mandate.copy');
  setText('mandate-terms', 'mandate.terms', {
    multiplier: contentCatalog.economy.missedEnemyPenaltyMultiplier,
  });
  setText('command-mandate-eyebrow', 'command.mandateEyebrow');
  setText('command-mandate-title', 'command.mandateTitle');
  setText('save-schema-label', 'base.saveSchema');
  setText('credit-label', 'base.credits');
  setText('hud-month-label', 'hud.monthLabel');
  setText('hud-objective-label', 'hud.objectiveLabel');
  setText('material-label', 'base.materials');
  setText('research-label', 'base.research');
  setText('prototype-status', 'base.prototype');
  setText('insolvency-label', 'insolvency.label');
  setText('insolvency-title', 'insolvency.title');
  setText('insolvency-detail', 'insolvency.detail');
  setText('restart-programme', 'insolvency.restart');
  setText('objective-label', 'objective.label');
  setText('research-section-eyebrow', 'research.eyebrow');
  setText('research-section-title', 'research.title');
  setText('research-section-lede', 'research.lede');
  setText('earth-research-eyebrow', 'research.earthEyebrow');
  setText('earth-research-title', 'research.earthTitle');
  setText('earth-research-intro', 'research.earthIntro');
  setText('earth-airframe-label', 'research.airframeLabel');
  setText('earth-airframe-status', 'research.airframeStatus');
  setText('earth-airframe-note', 'research.airframeNote');
  setText('earth-weapons-label', 'research.weaponsLabel');
  setText('earth-weapons-status', 'research.weaponsStatus');
  setText('earth-weapons-note', 'research.weaponsNote');
  setText('machine-upgrade-label', 'upgrade.machineName');
  setText('research-machine-upgrade', 'upgrade.research');
  setText('accelerator-upgrade-label', 'upgrade.acceleratorName');
  setText('research-accelerator-upgrade', 'upgrade.research');
  setText('alien-research-intro', 'research.alienIntro');
  setText('engineering-section-eyebrow', 'engineering.eyebrow');
  setText('engineering-section-title', 'engineering.title');
  setText('engineering-section-lede', 'engineering.lede');
  setText('manufacturing-eyebrow', 'engineering.manufacturingEyebrow');
  setText('manufacturing-title', 'engineering.manufacturingTitle');
  setText('hangar-section-eyebrow', 'hangar.eyebrow');
  setText('hangar-section-title', 'hangar.title');
  setText('hangar-section-lede', 'hangar.lede');
  setText('trade-section-eyebrow', 'trade.eyebrow');
  setText('trade-section-title', 'trade.title');
  setText('trade-section-lede', 'trade.lede');
  setText('hangar-loadout-eyebrow', 'hangar.loadoutEyebrow');
  setText('hangar-loadout-title', 'hangar.loadoutTitle');
  setText('hangar-fleet-eyebrow', 'hangar.fleetEyebrow');
  setText('hangar-fleet-title', 'hangar.fleetTitle');
  setText('hangar-fleet-lede', 'hangar.fleetLede');
  setText('hangar-fleet-subtitle', 'hangar.fleetSubtitle');
  setText('hangar-market-subtitle', 'hangar.marketSubtitle');
  setText('hangar-warehouse-eyebrow', 'hangar.warehouseEyebrow');
  setText('hangar-warehouse-title', 'hangar.warehouseTitle');
  setText('hangar-slot-label', 'hangar.slotLabel');
  setText('hangar-slot-note', 'hangar.slotNote');
  setText('command-section-eyebrow', 'command.eyebrow');
  setText('command-section-title', 'command.title');
  setText('command-section-lede', 'command.lede');
  setText('command-month-title', 'command.monthTitle');
  setText('command-fuel-eyebrow', 'command.fuelEyebrow');
  setText('command-fuel-title', 'command.fuelTitle');
  setText('command-credit-eyebrow', 'credit.eyebrow');
  setText('command-credit-title', 'credit.title');
  setText('command-credit-lede', 'credit.lede');
  setText('facility-eyebrow', 'facility.eyebrow');
  setText('facility-title', 'facility.title');
  setText('laboratory-label', 'facility.laboratory');
  setText('construct-laboratory', 'facility.constructLab');
  setText('scientists-label', 'facility.scientists');
  setText('engineers-label', 'facility.engineers');
  setText('workshop-label', 'facility.workshop');
  setText('construct-workshop', 'facility.constructWorkshop');
  setText('quarantine-label', 'facility.quarantine');
  setText('construct-quarantine', 'facility.constructQuarantine');
  setText('containment-eyebrow', 'containment.eyebrow');
  setText('containment-title', 'containment.title');
  setText('start-containment-research', 'containment.start');
  setText('programme-eyebrow', 'programme.eyebrow');
  setText('capturer-programme-title', 'programme.title');
  setText('start-blueprint-research', 'programme.start');
  setText('capturer-equipment-label', 'programme.equipment');
  setText('manufacture-capturer', 'programme.manufacture');
  setText('accelerator-production-label', 'production.acceleratorSample');
  setText('manufacture-accelerator', 'production.manufactureSample');
  setText('alien-emitter-production-label', 'alienProduction.label');
  setText('manufacture-alien-emitter', 'alienProduction.manufacture');
  setText('machine-upgrade-production-label', 'upgrade.machineName');
  setText('manufacture-machine-upgrade', 'production.manufactureUpgrade');
  setText('accelerator-upgrade-production-label', 'upgrade.acceleratorName');
  setText('manufacture-accelerator-upgrade', 'production.manufactureUpgrade');
  setText('technology-lab-eyebrow', 'lab.eyebrow');
  setText('technology-lab-title', 'lab.title');
  setText('canister-research-label', 'research.canisterLabel');
  setText('research-canister', 'research.startCanister');
  setText('canister-production-label', 'production.canister');
  setText('manufacture-canister', 'production.canisterManufacture');
  setText('special-equipment-label', 'loadout.specialEquipment');
  setText('launch-sortie', 'base.launch');
  setText('active-weapon-label', 'sortie.activeWeapon');
  setText('switch-primary-weapon', 'sortie.switchWeapon');
  setText('return-to-base', 'sortie.return');
  settingsToggle.setAttribute('aria-label', t('settings.open'));
  settingsToggle.title = t('settings.open');
  combatFrame.setAttribute('aria-label', t('sortie.combatAria'));
  localeSelect.value = getLocale();
  renderBase();
  renderReports();
  renderCombatWeaponControl();

  if (game !== null) {
    const scene = game.scene.getScene('combat');
    if (scene instanceof CombatScene) {
      scene.refreshLocale();
    }
  }
}

function showScreen(screen: 'base' | 'sortie'): void {
  activeScreen = screen;
  document.body.classList.toggle('is-sortie-active', screen === 'sortie');
  baseScreen.hidden = screen !== 'base';
  sortieScreen.hidden = screen !== 'sortie';
  byId('route-base').classList.toggle('is-active', screen === 'base');
  byId('route-sortie').classList.toggle('is-active', screen === 'sortie');
}

store.subscribe((state) => {
  if (!temporaryPlaytestMode) {
    saveGame(window.localStorage, state);
  }
  renderBase();
});

for (const [index, button] of baseTabButtons.entries()) {
  button.addEventListener('click', () => {
    const section = button.dataset.baseSection;
    if (isBaseSection(section)) {
      showBaseSection(section);
    }
  });
  button.addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
      return;
    }
    const lastIndex = baseTabButtons.length - 1;
    const nextIndex = event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? lastIndex
        : event.key === 'ArrowRight'
          ? (index + 1) % baseTabButtons.length
          : (index - 1 + baseTabButtons.length) % baseTabButtons.length;
    const nextButton = baseTabButtons[nextIndex];
    const section = nextButton?.dataset.baseSection;
    if (nextButton !== undefined && isBaseSection(section)) {
      showBaseSection(section);
      nextButton.focus();
      event.preventDefault();
    }
  });
}

objectiveOpenSectionButton.addEventListener('click', () => {
  showBaseSection(objectiveBaseSection);
});

researchTechnologyButton.addEventListener('click', () => {
  store.dispatch({ type: 'RESEARCH_TECHNOLOGY', technologyId: prism.id });
});

manufactureAcceleratorButton.addEventListener('click', () => {
  store.dispatch({
    type: 'MANUFACTURE_PRIMARY_WEAPON',
    blueprintId: acceleratorBlueprint.id,
  });
});

researchMachineUpgradeButton.addEventListener('click', () => {
  store.dispatch({ type: 'RESEARCH_WEAPON_UPGRADE', upgradeId: machineGunUpgrade.id });
});

researchAcceleratorUpgradeButton.addEventListener('click', () => {
  store.dispatch({ type: 'RESEARCH_WEAPON_UPGRADE', upgradeId: acceleratorUpgrade.id });
});

manufactureMachineUpgradeButton.addEventListener('click', () => {
  store.dispatch({ type: 'MANUFACTURE_WEAPON_UPGRADE', upgradeId: machineGunUpgrade.id });
});

manufactureAcceleratorUpgradeButton.addEventListener('click', () => {
  store.dispatch({ type: 'MANUFACTURE_WEAPON_UPGRADE', upgradeId: acceleratorUpgrade.id });
});

switchPrimaryWeaponButton.addEventListener('click', () => {
  if (game === null || activeScreen !== 'sortie') {
    return;
  }
  const scene = game.scene.getScene('combat');
  if (scene instanceof CombatScene) {
    scene.switchPrimaryWeapon();
  }
});

toggleSpecialEquipmentButton.addEventListener('click', () => {
  const equipped = store.getSnapshot().base.equippedEquipmentId === capturerEquipment.id;
  store.dispatch({
    type: 'EQUIP_SPECIAL_EQUIPMENT',
    equipmentId: equipped ? null : capturerEquipment.id,
  });
});

byId<HTMLButtonElement>('purchase-hangar-slot').addEventListener('click', () => {
  store.dispatch({ type: 'PURCHASE_HANGAR_SLOT' });
});

constructLaboratoryButton.addEventListener('click', () => {
  store.dispatch({ type: 'CONSTRUCT_BUILDING', buildingId: laboratory.id });
  showToast(t('toast.buildingConstructed'));
});

constructWorkshopButton.addEventListener('click', () => {
  store.dispatch({ type: 'CONSTRUCT_BUILDING', buildingId: workshop.id });
  showToast(t('toast.buildingConstructed'));
});

startBlueprintResearchButton.addEventListener('click', () => {
  store.dispatch({
    type: 'START_BLUEPRINT_RESEARCH',
    blueprintId: capturerBlueprint.id,
  });
});

startContainmentResearchButton.addEventListener('click', () => {
  store.dispatch({
    type: 'START_BUILDING_BLUEPRINT_RESEARCH',
    blueprintId: containmentBlueprint.id,
  });
});

constructQuarantineButton.addEventListener('click', () => {
  store.dispatch({ type: 'CONSTRUCT_BUILDING', buildingId: quarantine.id });
  showToast(t('toast.buildingConstructed'));
});

manufactureAlienEmitterButton.addEventListener('click', () => {
  store.dispatch({
    type: 'MANUFACTURE_ADAPTED_WEAPON',
    blueprintId: adaptedBlueprint.id,
  });
});

researchCanisterButton.addEventListener('click', () => {
  store.dispatch({
    type: 'START_RESEARCH_WEAPON_BLUEPRINT',
    blueprintId: canisterBlueprint.id,
  });
});

manufactureCanisterButton.addEventListener('click', () => {
  store.dispatch({
    type: 'MANUFACTURE_RESEARCH_WEAPON',
    blueprintId: canisterBlueprint.id,
  });
});

manufactureCapturerButton.addEventListener('click', () => {
  store.dispatch({
    type: 'MANUFACTURE_EQUIPMENT',
    equipmentId: capturerEquipment.id,
  });
});

restartProgrammeButton.addEventListener('click', () => {
  lastRunResult = null;
  lastSettlementSummary = null;
  sortieInProgress = false;
  store.dispatch({ type: 'RESET' });
  showScreen('base');
  showBaseSection('command');
  renderReports();
});

launchSortieButton.addEventListener('click', () => {
  settingsMenu.hidden = true;
  settingsToggle.setAttribute('aria-expanded', 'false');
  lastRunResult = null;
  lastSettlementSummary = null;
  sortieInProgress = true;
  combatWeaponSwitchAvailable = false;
  showScreen('sortie');
  renderReports();

  if (game === null) {
    game = createGame(
      gameRoot,
      (result) => {
        lastRunResult = result;
        sortieInProgress = false;
        combatWeaponSwitchAvailable = false;
        const beforeSettlement = store.getSnapshot();
        store.dispatch({ type: 'SETTLE_SORTIE', outcome: result.outcome });
        if (result.rocketsFired > 0) {
          store.dispatch({
            type: 'CONSUME_SORTIE_CONSUMABLES',
            consumableId: rocketsConsumable.id,
            count: result.rocketsFired,
          });
        }
        store.dispatch({
          type: 'APPLY_SORTIE_DAMAGE',
          aircraftId: beforeSettlement.base.activeAircraftId,
          armourLostRatio: result.armourLostRatio,
        });
        const afterSettlement = store.getSnapshot();
        lastSettlementSummary = summarizeSortiePayoff(
          beforeSettlement,
          afterSettlement,
          capturerBlueprint.id,
          result.outcome,
        );
        showToast(t('toast.sortieComplete', {
          credits: lastSettlementSummary.creditDelta,
          materials: lastSettlementSummary.materialsReceived,
        }));
        renderReports();
        renderCombatWeaponControl();
      },
      () => store.getSnapshot().base.equippedPrimaryWeaponIds,
      () => store.getSnapshot().base.equippedEquipmentId,
      () => store.getSnapshot().base.credits,
      () => store.getSnapshot().base.manufacturedWeaponUpgradeIds,
      () => store.getSnapshot().base.sortiesCompleted,
      () => {
        const snapshot = store.getSnapshot();
        const aircraftId = snapshot.base.activeAircraftId;
        const definition = contentCatalog.aircraft.find(
          (entry) => entry.id === aircraftId,
        );
        const damage = aircraftId === null
          ? 0
          : aircraftDamageValue(snapshot.base, aircraftId);
        return definition === undefined
          ? { armour: 100, speedMultiplier: 1, damageMultiplier: 1 }
          : {
              armour: Math.max(1, Math.round(definition.armour * (1 - damage))),
              speedMultiplier: definition.speedMultiplier,
              damageMultiplier: definition.damageMultiplier,
            };
      },
      () => store.getSnapshot().base.activeAircraftId,
      () => store.getSnapshot().base.consumableStock[rocketsConsumable.id] ?? 0,
      () => getLocale(),
      (weaponId, canSwitch) => {
        activeCombatWeaponId = weaponId;
        combatWeaponSwitchAvailable = canSwitch;
        renderCombatWeaponControl();
      },
    );
  } else {
    game.scene.getScene('combat').scene.restart();
  }
});

returnToBaseButton.addEventListener('click', () => {
  showScreen('base');
  showBaseSection('command');
  renderBase();
  renderReports();
});

settingsToggle.addEventListener('click', () => {
  const open = Boolean(settingsMenu.hidden);
  settingsMenu.hidden = !open;
  settingsToggle.setAttribute('aria-expanded', String(open));
  if (game !== null && activeScreen === 'sortie') {
    const scene = game.scene.getScene('combat');
    if (scene instanceof CombatScene) {
      scene.setPauseReason('settings', open);
    }
  }
});

function closeSettingsMenu(): void {
  if (settingsMenu.hidden) {
    return;
  }
  settingsMenu.hidden = true;
  settingsToggle.setAttribute('aria-expanded', 'false');
  if (game !== null && activeScreen === 'sortie') {
    const scene = game.scene.getScene('combat');
    if (scene instanceof CombatScene) {
      scene.setPauseReason('settings', false);
    }
  }
}

localeSelect.addEventListener('change', () => {
  const nextLocale = localeSelect.value;
  if (!isLocale(nextLocale)) {
    return;
  }
  setLocale(nextLocale);
  renderLocale();
});

const restartMissionButton = byId<HTMLButtonElement>('restart-mission');
let restartMissionArmed = false;
let restartMissionTimer: number | null = null;

function disarmRestartMission(): void {
  restartMissionArmed = false;
  if (restartMissionTimer !== null) {
    window.clearTimeout(restartMissionTimer);
    restartMissionTimer = null;
  }
  restartMissionButton.textContent = t('settings.restart');
  restartMissionButton.classList.remove('is-armed');
}

restartMissionButton.addEventListener('click', () => {
  if (!restartMissionArmed) {
    restartMissionArmed = true;
    restartMissionButton.textContent = t('settings.confirmRestart');
    restartMissionButton.classList.add('is-armed');
    if (restartMissionTimer !== null) {
      window.clearTimeout(restartMissionTimer);
    }
    restartMissionTimer = window.setTimeout(disarmRestartMission, 5000);
    return;
  }
  disarmRestartMission();
  clearGame(window.localStorage);
  window.location.reload();
});

document.addEventListener('click', (event) => {
  if (restartMissionArmed && !restartMissionButton.contains(event.target as Node)) {
    disarmRestartMission();
  }
});

document.addEventListener('click', (event) => {
  const target = event.target;
  if (target instanceof Node && !settingsMenu.contains(target) && !settingsToggle.contains(target)) {
    closeSettingsMenu();
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closeSettingsMenu();
    return;
  }
  if (event.code === 'KeyP' && !event.repeat && activeScreen === 'sortie' && game !== null) {
    const scene = game.scene.getScene('combat');
    if (scene instanceof CombatScene) {
      scene.toggleManualPause();
      event.preventDefault();
    }
    return;
  }
  if (event.code === 'KeyX' && !event.repeat && activeScreen === 'sortie' && game !== null) {
    const scene = game.scene.getScene('combat');
    if (scene instanceof CombatScene) {
      scene.switchPrimaryWeapon();
      event.preventDefault();
    }
    return;
  }
  if (
    !event.repeat &&
    activeScreen === 'sortie' &&
    game !== null &&
    ['Digit1', 'Digit2', 'KeyE', 'KeyC'].includes(event.code)
  ) {
    const scene = game.scene.getScene('combat');
    if (scene instanceof CombatScene) {
      scene.handleActionKey(event.code as 'Digit1' | 'Digit2' | 'KeyE' | 'KeyC');
      event.preventDefault();
    }
  }
});

showScreen(activeScreen);
showBaseSection(activeBaseSection);
renderLocale();

window.addEventListener('beforeunload', () => {
  game?.destroy(true);
});

function renderResearchCards(): void {
  const state = store.getSnapshot();
  const container = byId<HTMLElement>('research-card-grid');
  container.textContent = '';

  const labBuilt = state.base.constructedBuildingIds.includes(laboratory.id);
  const hasScientist = state.base.staff.some((member) => member.roleId === scientistRole.id);
  const hasSample = state.base.preservedTechnologyIds.includes(prism.id);
  const quarantineBuilt = state.base.constructedBuildingIds.includes(quarantine.id);

  interface ResearchCard {
    readonly title: string;
    readonly domain: 'earth' | 'alien';
    readonly status: 'done' | 'active' | 'locked';
    readonly requirements: string;
    readonly progress: string;
    readonly outcome: string;
  }
  const cards: ResearchCard[] = [];

  const pushBlueprint = (
    blueprintId: string,
    title: string,
    domain: 'earth' | 'alien',
    requirements: string,
    outcome: string,
  ): void => {
    const done = state.base.unlockedBlueprintIds.includes(blueprintId);
    const project = state.base.researchQueue.find((entry) => entry.blueprintId === blueprintId);
    const status = done ? 'done' : project !== undefined ? 'active' : 'locked';
    const progress = project === undefined
      ? ''
      : t('research.cardProgress', { progress: project.progress, required: project.requiredProgress });
    cards.push({ title, domain, status, requirements, progress, outcome });
  };

  pushBlueprint(
    capturerBlueprint.id,
    t('programme.title'),
    'earth',
    state.base.telemetryRecorded === false
      ? t('research.cardRequiresTelemetry')
      : labBuilt && hasScientist ? t('research.cardReady') : t('research.cardRequiresLab'),
    t('programme.equipment'),
  );
  pushBlueprint(
    containmentBlueprint.id,
    t('containment.title'),
    'earth',
    hasSample
      ? labBuilt && hasScientist ? t('research.cardReady') : t('research.cardRequiresLab')
      : t('research.cardRequiresSample'),
    t('facility.quarantine'),
  );
  pushBlueprint(
    canisterBlueprint.id,
    t('research.canisterLabel'),
    'earth',
    labBuilt && hasScientist ? t('research.cardReady') : t('research.cardRequiresLab'),
    t('content.canisterCannon'),
  );
  pushBlueprint(
    adaptedBlueprint.id,
    t('content.splitPulse'),
    'alien',
    quarantineBuilt && hasScientist ? t('research.cardReady') : t('research.cardRequiresQuarantine'),
    t('content.splitPulse'),
  );

  for (const upgrade of contentCatalog.weaponUpgrades) {
    const researched = state.base.researchedWeaponUpgradeIds.includes(upgrade.id);
    const manufactured = state.base.manufacturedWeaponUpgradeIds.includes(upgrade.id);
    const title = upgrade.id.includes('machine')
      ? t('upgrade.machineName')
      : t('upgrade.acceleratorName');
    cards.push({
      title,
      domain: 'earth',
      status: manufactured ? 'done' : researched ? 'active' : 'locked',
      requirements: t('upgrade.requiresCentre'),
      progress: researched ? t('research.cardAwaitingProduction') : '',
      outcome: t('upgrade.researchCost', { credits: upgrade.researchCreditCost }),
    });
  }

  for (const card of cards) {
    const article = document.createElement('article');
    article.className = 'research-card is-' + card.status + (card.domain === 'alien' ? ' is-alien' : '');
    const titleEl = document.createElement('strong');
    titleEl.textContent = card.title;
    const domainEl = document.createElement('span');
    domainEl.className = 'research-card__domain';
    domainEl.textContent = t(card.domain === 'alien' ? 'research.cardAlien' : 'research.cardEarth');
    const statusEl = document.createElement('span');
    statusEl.className = 'research-card__status';
    statusEl.textContent = card.status === 'done'
      ? t('research.cardDone')
      : card.status === 'active' ? t('research.cardActive') : t('research.cardLocked');
    const reqEl = document.createElement('small');
    reqEl.textContent = card.requirements;
    const outcomeEl = document.createElement('p');
    outcomeEl.className = 'research-card__outcome';
    outcomeEl.textContent = card.progress !== ''
      ? card.progress
      : t('research.cardOutcome', { outcome: card.outcome });
    article.append(titleEl, domainEl, statusEl, reqEl, outcomeEl);
    container.appendChild(article);
  }
}
