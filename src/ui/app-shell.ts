import { createGameStore } from '../app/store';
import { contentCatalog } from '../content/catalog';
import { validateContentCatalog } from '../content/validate';
import { createGame } from '../game/create-game';
import { CombatScene, type CombatRunResult } from '../game/scenes/CombatScene';
import type { TranslationKey } from '../i18n';
import { isLocale } from '../i18n';
import { clearGame, loadGame, saveGame } from '../persistence/save-repository';
import type {
  ConstructionJobState,
  GameState,
  ProductionJobState,
} from '../domain/model';
import { isBankrupt, monthlyExpenses } from '../domain/operational-economy';
import { HANGAR_SLOT_COST, marketAircraftPrice } from '../domain/hangar';
import { isAircraftFueled, missionBounty, MONTH_SORTIE_LENGTH } from '../domain/command-centre';
import { pilotAircraftMultipliers, pilotLevel, isPilotFatigued } from '../domain/pilot-market';
import {
  hasMedicalTreatmentCapability,
  isPilotDead,
  isPilotFlightReady,
  outsourceTreatmentCost,
} from '../domain/pilot-medical';
import { MANAGER_ROLE_ID, STAFF_SALARY_CAP } from '../domain/staff-market';
import {
  marketBlueprintPrice,
  marketConsumablePrice,
  marketWeaponPrice,
} from '../domain/terrestrial-market';
import { applyAircraftUpgrades } from '../domain/terrestrial-production';
import { weaponProductionCost } from '../domain/base-projects';
import {
  aircraftDamageValue,
  isAircraftRepairing,
  isInHouseRepair,
  standardRepairCost,
} from '../domain/aircraft-integrity';
import { tradeMargin } from '../domain/trade';
import {
  hasOutstandingLoan,
  LOAN_OFFERS,
  loanRepayment,
} from '../domain/credit';
import {
  type BaseSection,
} from '../domain/base-navigation';
import {
  summarizeSortiePayoff,
  type SortiePayoffSummary,
} from '../domain/sortie-payoff';
import { formatCredits } from './credits';
import { byId, setText } from './dom';
import { h } from './h';
import { getLocale, setLocale, t, localizedWeaponName } from './i18n';
import { buildAppTemplate } from './template';
import { installShmupDebugBridge, isDebugEnabled, setDebugEnabled } from '../debug/debug-mode';
import { showToast } from './toast';
import { aircraftVisualHtml } from './ship-svg';
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
const traderRoleId = 'staff-trader';
const managerRoleId = 'staff-manager';
const tradeCentreBuilding = contentCatalog.buildings.find(
  (entry) => entry.id === 'building-trade-centre',
);
const staffRoleNameKey: Readonly<Record<string, TranslationKey>> = {
  'staff-scientist': 'staff.scientist',
  'staff-engineer': 'staff.engineer',
  'staff-trader': 'staff.trader',
  'staff-manager': 'staff.manager',
  'staff-medic': 'staff.medic',
  'staff-repair-master': 'staff.repairMaster',
};
const capturerBlueprint = contentCatalog.blueprints[0];
const capturerEquipment = contentCatalog.equipment[0];
const acceleratorBlueprint = contentCatalog.marketWeaponBlueprints[0];
const machineGunUpgrade = contentCatalog.weaponUpgrades[0];
const acceleratorUpgrade = contentCatalog.weaponUpgrades[1];
const containmentBlueprint = contentCatalog.buildingBlueprints[0];
const medicalBlueprint = contentCatalog.buildingBlueprints.find(
  (entry) => entry.id === 'blueprint-medical-block',
) ?? contentCatalog.buildingBlueprints[0];
const quarantine = contentCatalog.buildings[2];
const medicalBlock = contentCatalog.buildings.find(
  (entry) => entry.id === 'building-medical-block',
) ?? quarantine;
const medicRole = contentCatalog.staffRoles.find(
  (entry) => entry.id === 'staff-medic',
) ?? contentCatalog.staffRoles[0];
const repairMasterRole = contentCatalog.staffRoles.find(
  (entry) => entry.id === 'staff-repair-master',
) ?? contentCatalog.staffRoles[0];
const pilotInjurySeverityKey: Readonly<Record<string, TranslationKey>> = {
  light: 'pilot.injuryLight',
  medium: 'pilot.injuryMedium',
  severe: 'pilot.injurySevere',
};
const adaptedBlueprint = contentCatalog.adaptedWeaponBlueprints[0];
const canisterBlueprint = contentCatalog.researchWeaponBlueprints[0];
const rocketPodWeapon = contentCatalog.weapons.find(
  (weapon) => weapon.visualProfile === 'rocket-pod',
) ?? contentCatalog.weapons[4];
const rocketsConsumable = contentCatalog.consumables[0];

let game: ReturnType<typeof createGame> | null = null;
let activeScreen: 'base' | 'sortie' = 'base';
let activeBaseSection: BaseSection = 'command';
let lastRunResult: CombatRunResult | null = null;
let lastSettlementSummary: SortiePayoffSummary | null = null;
let lastThanksLine: string | null = null;
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
const materialTotal = byId<HTMLElement>('material-total');
const researchTotal = byId<HTMLElement>('research-total');
const baseRunReport = byId<HTMLElement>('base-run-report');
const systemCheck = byId<HTMLElement>('prototype-status').parentElement;
const insolvencyPanel = byId<HTMLElement>('insolvency-panel');
const restartProgrammeButton = byId<HTMLButtonElement>('restart-programme');
const sortieRunReport = byId<HTMLElement>('sortie-run-report');
const sortieOutcome = byId<HTMLElement>('sortie-outcome');
const technologyStatus = byId<HTMLElement>('technology-status');
const researchTechnologyButton = byId<HTMLButtonElement>('research-technology');
const specialEquipmentStatus = byId<HTMLElement>('special-equipment-status');
const specialEquipmentNote = byId<HTMLElement>('special-equipment-note');
const toggleSpecialEquipmentButton = byId<HTMLButtonElement>('toggle-special-equipment');
const preflightWarning = byId<HTMLElement>('preflight-warning');
const wardenSignalWarning = byId<HTMLElement>('warden-signal-warning');
const preflightMission = byId<HTMLElement>('preflight-mission');
const endMonthButton = byId<HTMLButtonElement>('end-month');
const monthReportPanel = byId<HTMLElement>('month-report-panel');
const monthReportEyebrow = byId<HTMLElement>('month-report-eyebrow');
const monthReportTitle = byId<HTMLElement>('month-report-title');
const monthReportDetails = byId<HTMLElement>('month-report-details');
const monthReportContinue = byId<HTMLButtonElement>('month-report-continue');
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
const tradeCentreRow = byId<HTMLElement>('trade-centre-row');
const tradeCentreStatus = byId<HTMLElement>('trade-centre-status');
const tradeCentreCost = byId<HTMLElement>('trade-centre-cost');
const constructTradeCentreButton = byId<HTMLButtonElement>('construct-trade-centre');
const medicalProgramme = byId<HTMLElement>('medical-programme');
const medicalResearchStatus = byId<HTMLElement>('medical-research-status');
const medicalResearchNote = byId<HTMLElement>('medical-research-note');
const startMedicalResearchButton = byId<HTMLButtonElement>('start-medical-research');
const medicalRow = byId<HTMLElement>('medical-row');
const medicalStatus = byId<HTMLElement>('medical-status');
const medicalCost = byId<HTMLElement>('medical-cost');
const constructMedicalButton = byId<HTMLButtonElement>('construct-medical');
const medicStaffRow = byId<HTMLElement>('medic-staff-row');
const medicCount = byId<HTMLElement>('medic-count');
const medicNote = byId<HTMLElement>('medic-note');
const medicCandidates = byId<HTMLElement>('medic-candidates');
const medicalTreatmentList = byId<HTMLElement>('medical-treatment-list');
const pilotMemorial = byId<HTMLElement>('pilot-memorial');
const pilotMemorialList = byId<HTMLElement>('pilot-memorial-list');
const designSystemOverlay = byId<HTMLElement>('design-system-overlay');
const designSystemContent = byId<HTMLElement>('design-system-content');
const designSystemOpenButton = byId<HTMLButtonElement>('design-system-open');
const designSystemCloseButton = byId<HTMLButtonElement>('design-system-close');
const sortiePickerOverlay = byId<HTMLElement>('sortie-picker-overlay');
const sortiePickerList = byId<HTMLElement>('sortie-picker-list');
const sortiePickerEmpty = byId<HTMLElement>('sortie-picker-empty');
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
const productionQtyAccelerator = byId<HTMLInputElement>('production-qty-accelerator');
const productionQtyAlienEmitter = byId<HTMLInputElement>('production-qty-alien-emitter');
const productionQtyCanister = byId<HTMLInputElement>('production-qty-canister');
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
  thanksLine: string | null,
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
  const thanks = thanksLine === null ? '' : `\n${thanksLine}`;
  return `${resultLine}\n${contract}\n${rewards}\n${research}${insolvency}${thanks}`;
}

function renderReports(): void {
  const bankrupt = isBankrupt(store.getSnapshot().base.credits);
  const result = lastRunResult;
  const hasResult = result !== null && !sortieInProgress;
  baseRunReport.textContent = result === null
    ? t(bankrupt ? 'report.insolvent' : 'base.awaiting')
    : formatRunResult(result, lastSettlementSummary, lastThanksLine);
  sortieRunReport.textContent = hasResult
    ? formatRunResult(result, lastSettlementSummary, lastThanksLine)
    : t('report.active');
  sortieOutcome.hidden = !hasResult;
}

function isBaseSection(value: string | undefined): value is BaseSection {
  return value === 'command' || value === 'research' ||
    value === 'engineering' || value === 'hangar' || value === 'trade' ||
    value === 'finance' || value === 'staff' || value === 'medical' ||
    value === 'warehouse' || value === 'databank';
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

function constructionJob(
  state: GameState,
  buildingId: string,
): ConstructionJobState | undefined {
  return state.base.constructionQueue.find((job) => job.buildingId === buildingId);
}

function productionJob(
  state: GameState,
  projectId: string,
): ProductionJobState | undefined {
  return state.base.productionQueue.find((job) => job.projectId === projectId);
}

function readProductionQuantity(input: HTMLInputElement): number {
  const value = Math.floor(Number(input.value));
  return Number.isFinite(value) && value > 0 ? value : 1;
}

function applyWeaponProductionButton(
  state: GameState,
  input: HTMLInputElement,
  button: HTMLButtonElement,
  job: ProductionJobState | undefined,
  productionReady: boolean,
  bankrupt: boolean,
  weapon: {
    readonly productionCreditCost: number;
    readonly productionMaterialCost: number;
  },
): void {
  const quantity = readProductionQuantity(input);
  const cost = weaponProductionCost(weapon, quantity);
  button.textContent = t('production.manufactureQty', {
    quantity,
    credits: formatCredits(cost.credits),
    materials: cost.materials,
  });
  button.disabled =
    bankrupt ||
    job !== undefined ||
    !productionReady ||
    state.base.credits < cost.credits ||
    state.base.materials < cost.materials;
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

  creditTotal.textContent = formatCredits(state.base.credits);
  creditTotal.classList.toggle('is-negative', bankrupt);
  materialTotal.textContent = state.base.materials.toString();
  researchTotal.textContent = state.base.research.toString();
  hudMonth.textContent = t('hud.month', { month: state.base.month });
  byId<HTMLElement>('databank-note').textContent = t('databank.note');
  insolvencyPanel.hidden = !bankrupt;
  baseScreen.classList.toggle('is-insolvent', bankrupt);
  systemCheck?.classList.toggle('is-critical', bankrupt);
  const labJob = constructionJob(state, laboratory.id);
  laboratoryStatus.textContent = labJob !== undefined
    ? t('facility.constructing', {
        progress: labJob.progress,
        required: labJob.requiredProgress,
      })
    : t(labBuilt ? 'facility.labBuilt' : 'facility.labUnbuilt');
  laboratoryCost.textContent = labBuilt
    ? ''
    : [
        t('facility.buildCost', {
          credits: laboratory.creditCost,
          materials: laboratory.materialCost,
        }),
        resourceShortfall(state, laboratory.creditCost, laboratory.materialCost),
      ].join(' · ');
  constructLaboratoryButton.hidden = labBuilt;
  constructLaboratoryButton.disabled = (
    bankrupt ||
    labJob !== undefined ||
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
  renderCandidates('manager-candidates', managerRoleId);
  renderCandidates('trader-candidates', traderRoleId);
  renderCandidates('medic-candidates', medicRole.id);
  renderCandidates('repair-master-candidates', repairMasterRole.id);
  renderStaffRoster();
  renderAircraftProduction();
  renderAircraftUpgradeResearch();
  const workshopJob = constructionJob(state, workshop.id);
  workshopStatus.textContent = workshopJob !== undefined
    ? t('facility.constructing', {
        progress: workshopJob.progress,
        required: workshopJob.requiredProgress,
      })
    : workshopBuilt
      ? t('facility.workshopBuilt')
      : labBuilt ? t('facility.workshopUnbuilt') : t('facility.workshopLocked');
  workshopCost.textContent = workshopBuilt || !labBuilt
    ? ''
    : [
        t('facility.buildCost', {
          credits: workshop.creditCost,
          materials: workshop.materialCost,
        }),
        resourceShortfall(state, workshop.creditCost, workshop.materialCost),
      ].join(' · ');
  constructWorkshopButton.hidden = workshopBuilt;
  constructWorkshopButton.disabled = (
    bankrupt ||
    !labBuilt ||
    workshopJob !== undefined ||
    state.base.credits < workshop.creditCost ||
    state.base.materials < workshop.materialCost
  );
  const researchTab = byId<HTMLButtonElement>('base-tab-research');
  const medicalTab = byId<HTMLButtonElement>('base-tab-medical');
  const medicalBlockBuilt = state.base.constructedBuildingIds.includes(
    'building-medical-block',
  );
  researchTab.hidden = !labBuilt;
  medicalTab.hidden = !medicalBlockBuilt;
  if (!labBuilt && activeBaseSection === 'research') {
    showBaseSection('command');
  } else if (!medicalBlockBuilt && activeBaseSection === 'medical') {
    showBaseSection('command');
  }
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
  startBlueprintResearchButton.disabled =
    bankrupt || !researchReady || researchBusy ||
    state.base.credits < capturerBlueprint.researchCreditCost;
  const capturerJob = productionJob(state, capturerBlueprint.id);
  capturerEquipmentStatus.textContent = capturerJob !== undefined
    ? t('production.inProgress', {
        progress: capturerJob.progress,
        required: capturerJob.requiredProgress,
      })
    : capturerManufactured
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
  byId<HTMLElement>('capturer-equipment-row').hidden = !blueprintUnlocked;
  manufactureCapturerButton.disabled = (
    bankrupt ||
    capturerJob !== undefined ||
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

  const machineUpgradeProject = state.base.researchQueue.find(
    (project) => project.blueprintId === machineGunUpgrade.id,
  );
  machineUpgradeStatus.textContent = t(
    machineUpgradeManufactured
      ? 'upgrade.installed'
      : machineUpgradeResearched
        ? 'upgrade.researched'
        : machineUpgradeProject !== undefined
          ? 'research.cardProgress'
          : researchReady ? 'upgrade.available' : 'upgrade.requiresCentre',
    machineUpgradeProject !== undefined
      ? {
          progress: machineUpgradeProject.progress,
          required: machineUpgradeProject.requiredProgress,
        }
      : {},
  );
  machineUpgradeNote.textContent = machineUpgradeManufactured
    ? t('upgrade.machineEffect')
    : machineUpgradeResearched
      ? t('upgrade.awaitingProduction')
      : machineUpgradeProject !== undefined
        ? t('research.cardRequiresSorties')
        : researchReady
          ? t('upgrade.researchCost', { credits: machineGunUpgrade.researchCreditCost })
          : '';
  researchMachineUpgradeButton.hidden =
    machineUpgradeResearched || machineUpgradeProject !== undefined;
  researchMachineUpgradeButton.disabled = (
    bankrupt ||
    !researchReady ||
    researchBusy ||
    state.base.credits < machineGunUpgrade.researchCreditCost
  );

  acceleratorUpgradeProject.hidden = !acceleratorLocallyProduced;
  const acceleratorUpgradeResearch = state.base.researchQueue.find(
    (project) => project.blueprintId === acceleratorUpgrade.id,
  );
  acceleratorUpgradeStatus.textContent = t(
    acceleratorUpgradeManufactured
      ? 'upgrade.installed'
      : acceleratorUpgradeResearched
        ? 'upgrade.researched'
        : acceleratorUpgradeResearch !== undefined
          ? 'research.cardProgress'
          : 'upgrade.available',
    acceleratorUpgradeResearch !== undefined
      ? {
          progress: acceleratorUpgradeResearch.progress,
          required: acceleratorUpgradeResearch.requiredProgress,
        }
      : {},
  );
  acceleratorUpgradeNote.textContent = acceleratorUpgradeManufactured
    ? t('upgrade.acceleratorEffect')
    : acceleratorUpgradeResearched
      ? t('upgrade.awaitingProduction')
      : acceleratorUpgradeResearch !== undefined
        ? t('research.cardRequiresSorties')
        : t('upgrade.researchCost', { credits: acceleratorUpgrade.researchCreditCost });
  researchAcceleratorUpgradeButton.hidden =
    acceleratorUpgradeResearched || acceleratorUpgradeResearch !== undefined;
  researchAcceleratorUpgradeButton.disabled = (
    bankrupt ||
    !researchReady ||
    researchBusy ||
    state.base.credits < acceleratorUpgrade.researchCreditCost
  );

  acceleratorProductionRow.hidden = !acceleratorBlueprintOwned;
  const acceleratorJob = productionJob(state, acceleratorBlueprint.id);
  acceleratorProductionStatus.textContent = acceleratorJob !== undefined
    ? t('production.inProgress', {
        progress: acceleratorJob.progress,
        required: acceleratorJob.requiredProgress,
      })
    : productionReady ? t('production.ready') : t('production.requiresEngineer');
  acceleratorProductionNote.textContent = t('production.cost', {
    credits: acceleratorBlueprint.productionCreditCost,
    materials: acceleratorBlueprint.productionMaterialCost,
  });
  manufactureAcceleratorButton.hidden = false;
  applyWeaponProductionButton(
    state,
    productionQtyAccelerator,
    manufactureAcceleratorButton,
    acceleratorJob,
    productionReady,
    bankrupt,
    acceleratorBlueprint,
  );

  machineUpgradeProductionRow.hidden = !machineUpgradeResearched;
  const machineUpgradeJob = productionJob(state, machineGunUpgrade.id);
  machineUpgradeProductionStatus.textContent = machineUpgradeJob !== undefined
    ? t('production.inProgress', {
        progress: machineUpgradeJob.progress,
        required: machineUpgradeJob.requiredProgress,
      })
    : t(
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
    machineUpgradeJob !== undefined ||
    !productionReady ||
    state.base.credits < machineGunUpgrade.productionCreditCost ||
    state.base.materials < machineGunUpgrade.productionMaterialCost
  );

  acceleratorUpgradeProductionRow.hidden = !acceleratorUpgradeResearched;
  const acceleratorUpgradeJob = productionJob(state, acceleratorUpgrade.id);
  acceleratorUpgradeProductionStatus.textContent = acceleratorUpgradeJob !== undefined
    ? t('production.inProgress', {
        progress: acceleratorUpgradeJob.progress,
        required: acceleratorUpgradeJob.requiredProgress,
      })
    : t(
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
    acceleratorUpgradeJob !== undefined ||
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
    aircraftNameKey[activeAircraft?.id ?? ''] ?? 'content.aircraftIndia',
  );
  const activeFueled = activeAircraftId !== null && isAircraftFueled(state.base, activeAircraftId);
  const activeDamage = activeAircraftId === null
    ? 0
    : aircraftDamageValue(state.base, activeAircraftId);
  const activeRepairLeft = activeAircraftId === null
    ? 0
    : (state.base.aircraftRepair[activeAircraftId] ?? 0);
  const activePilot = state.base.activePilotId === null
    ? undefined
    : state.base.pilots.find((pilot) => pilot.id === state.base.activePilotId);
  const activePilotFatigued = activePilot !== undefined &&
    isPilotFatigued(state.base.pilotFatigue[activePilot.id] ?? 0);
  const activePilotName = `${activePilot?.firstName ?? 'Pilot'} ${activePilot?.lastName ?? ''}`.trim();
  const fuelStatus = byId<HTMLElement>('fuel-status');
  fuelStatus.hidden = false;
  fuelStatus.classList.toggle('is-ready', activeFueled && activeDamage <= 0);
  fuelStatus.textContent = state.base.activePilotId === null
    ? t('hangar.noPilotWarning')
    : activePilotFatigued
      ? t('hangar.pilotFatiguedWarning', { pilot: activePilotName })
      : activeRepairLeft > 0
        ? t('hangar.repairInProgress', { sorties: activeRepairLeft })
        : activeDamage > 0
          ? t('hangar.damagedWarning', {
              value: Math.round(activeDamage * 100),
            })
          : t(
              activeFueled ? 'hangar.preflightFuelReady' : 'hangar.preflightFuelWarning',
              { aircraft: activeAircraftName },
            );
  launchSortieButton.disabled =
    bankrupt ||
    state.base.activePilotId === null ||
    !activeFueled ||
    state.base.activeMissionId === null ||
    activePilotFatigued;
  const activeMission = state.base.activeMissionId === null
    ? undefined
    : state.base.threatMap.find((entry) => entry.id === state.base.activeMissionId);
  preflightMission.hidden = activeMission === undefined;
  if (activeMission !== undefined) {
    const stateDefinition = contentCatalog.councilStates.find(
      (entry) => entry.id === activeMission.targetCountryId,
    );
    preflightMission.textContent = t('hangar.preflightMission', {
      country: stateDefinition === undefined
        ? activeMission.targetCountryId
        : t(stateDefinition.nameKey as TranslationKey),
      threat: activeMission.threatLevel,
      bounty: missionBounty(activeMission),
    });
  } else {
    preflightMission.textContent = t('hangar.selectMissionHint');
  }
  setText('launch-sortie', 'base.launch');
  setText('return-to-base', 'sortie.return');
  renderContainment();
  renderMedicalProgramme();
  renderMedicalTreatment();
  renderTradeCentre();
  renderResearchCards();
  renderCanister();
  renderFleet();
  renderWarehouse();
  renderPilots();
  renderTrade();
  renderFinance();
  renderCredit();
  renderCommand();
  renderMonthReport();
  renderDatabank();
}

const aircraftNameKey: Readonly<Record<string, TranslationKey>> = {
  'aircraft-india': 'content.aircraftIndia',
  'aircraft-britain': 'content.aircraftBritain',
  'aircraft-prc': 'content.aircraftPrc',
  'aircraft-germany': 'content.aircraftGermany',
  'aircraft-usa': 'content.aircraftUsa',
  'aircraft-france': 'content.aircraftFrance',
  'aircraft-japan': 'content.aircraftJapan',
};
const aircraftRoleKey: Readonly<Record<string, TranslationKey>> = {
  'aircraft-india': 'aircraft.indiaRole',
  'aircraft-britain': 'aircraft.britainRole',
  'aircraft-prc': 'aircraft.prcRole',
  'aircraft-germany': 'aircraft.germanyRole',
  'aircraft-usa': 'aircraft.usaRole',
  'aircraft-france': 'aircraft.franceRole',
  'aircraft-japan': 'aircraft.japanRole',
};

function aircraftStatSummary(aircraft: { armour: number; speedMultiplier: number; damageMultiplier: number }): string {
  return [
    t('combat.armour', { value: aircraft.armour }),
    t('aircraft.speed', { value: aircraft.speedMultiplier }),
    t('aircraft.damage', { value: aircraft.damageMultiplier }),
  ].join(' // ');
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
  const facilityBuilt = role !== undefined && (
    role.requiredBuildingId === null ||
    state.base.constructedBuildingIds.includes(role.requiredBuildingId)
  );
  const headcountFull = role !== undefined &&
    role.maximumHeadcount !== null &&
    state.base.staff.filter((member) => member.roleId === roleId).length >=
      role.maximumHeadcount;
  const heading = document.createElement('h3');
  heading.className = 'hangar-subtitle';
  heading.textContent = t(
    staffRoleNameKey[roleId] ?? 'staff.scientist',
  );
  container.appendChild(heading);
  for (const candidate of candidates) {
    const row = document.createElement('article');
    row.className = 'threat-row candidate-row' +
      (candidate.tier >= 3 ? ' is-top-tier' : '');
    const info = document.createElement('div');
    const name = document.createElement('strong');
    name.textContent = `${candidate.firstName} ${candidate.lastName}`;
    const origin = document.createElement('em');
    origin.className = 'candidate-origin';
    origin.textContent = t(countryNameKey(candidate.originCountryId));
    const details = document.createElement('small');
    details.textContent = [
      t('staff.tier', { tier: candidate.tier }),
      t('staff.efficiency', { value: candidate.progressMultiplier }),
      t('staff.salary', { credits: candidate.salaryCreditCost }),
    ].join(' · ');
    const head = document.createElement('div');
    head.className = 'candidate-row__head';
    head.append(name, origin);
    info.append(head, details);
    row.appendChild(info);
    const actions = document.createElement('div');
    actions.className = 'candidate-row__actions';
    if (candidate.tier >= 3) {
      const badge = document.createElement('em');
      badge.className = 'status-chip is-top';
      badge.textContent = t('staff.topTier');
      actions.appendChild(badge);
    }
    const hire = document.createElement('button');
    hire.className = 'base-action';
    hire.type = 'button';
    hire.textContent = t('staff.hire', { credits: candidate.hireCreditCost });
    hire.disabled = bankrupt || !facilityBuilt || headcountFull ||
      state.base.credits < candidate.hireCreditCost;
    hire.addEventListener('click', () => {
      store.dispatch({ type: 'HIRE_CANDIDATE', candidateId: candidate.id });
      showToast(t('toast.candidateHired', { name: candidate.firstName + ' ' + candidate.lastName }));
    });
    actions.appendChild(hire);
    if (headcountFull) {
      const limit = document.createElement('em');
      limit.className = 'status-chip is-resting';
      limit.textContent = t('staff.limitReached');
      actions.appendChild(limit);
    }
    row.appendChild(actions);
    container.appendChild(row);
  }
}

function renderStaffRoster(): void {
  const state = store.getSnapshot();
  const container = byId<HTMLElement>('staff-roster');
  container.textContent = '';
  container.append(h('h3', { class: 'hangar-subtitle' }, t('staff.roster')));
  if (state.base.staff.length === 0) {
    container.append(h('p', { class: 'empty-note' }, t('staff.noStaff')));
    return;
  }
  for (const role of contentCatalog.staffRoles) {
    const members = state.base.staff.filter((member) => member.roleId === role.id);
    if (members.length === 0) {
      continue;
    }
    container.append(h(
      'h4',
      { class: 'hangar-subtitle staff-group-title' },
      t(staffRoleNameKey[role.id] ?? 'staff.scientist'),
    ));
    for (const member of members) {
      const raw = role.salaryCreditCost * member.salaryMultiplier;
      const salary = Math.round(
        role.id === MANAGER_ROLE_ID ? raw : Math.min(STAFF_SALARY_CAP, raw),
      );
      const row = h('article', { class: 'threat-row staff-roster-row' });
      const info = h('div', null);
      info.append(
        h('strong', null, `${member.firstName} ${member.lastName}`),
        h('small', null, [
          t('staff.tier', { tier: member.tier }),
          t('staff.efficiency', { value: member.progressMultiplier }),
          t('staff.salary', { credits: salary }),
        ].join(' · ')),
      );
      row.append(info);
      const dismiss = h(
        'button',
        { class: 'base-action is-danger', type: 'button' },
        t('staff.dismiss'),
      );
      dismiss.addEventListener('click', () => {
        store.dispatch({ type: 'DISMISS_STAFF', staffId: member.id });
      });
      row.append(dismiss);
      container.append(row);
    }
  }
}

function renderAircraftProduction(): void {
  const state = store.getSnapshot();
  const bankrupt = isBankrupt(state.base.credits);
  const container = byId<HTMLElement>('aircraft-production-list');
  container.textContent = '';
  const blueprints = contentCatalog.aircraftBlueprints.filter(
    (aircraftBlueprint) => state.base.unlockedBlueprintIds.includes(aircraftBlueprint.id),
  );
  if (blueprints.length === 0) {
    return;
  }
  for (const aircraftBlueprint of blueprints) {
    const aircraft = contentCatalog.aircraft.find(
      (entry) => entry.id === aircraftBlueprint.outputAircraftId,
    );
    if (aircraft === undefined || state.base.hangarSlots.includes(aircraft.id)) {
      continue;
    }
    const job = state.base.productionQueue.find(
      (entry) => entry.projectId === aircraftBlueprint.id,
    );
    const row = h('div', { class: 'loadout-row' });
    const label = h(
      'span',
      { class: 'loadout-row__label' },
      t(aircraftNameKey[aircraft.id] ?? 'content.aircraftIndia'),
    );
    row.append(label);
    if (job !== undefined) {
      row.append(h('small', null, t('production.inProgress', {
        progress: job.progress,
        required: job.requiredProgress,
      })));
    } else {
      const manufacture = h(
        'button',
        { class: 'base-action is-primary', type: 'button' },
        t('trade.manufactureAircraft', {
          credits: aircraftBlueprint.productionCreditCost,
          materials: aircraftBlueprint.productionMaterialCost,
        }),
      );
      manufacture.disabled = bankrupt ||
        !state.base.hangarSlots.includes(null) ||
        !state.base.constructedBuildingIds.includes(aircraftBlueprint.requiredBuildingId) ||
        !state.base.staff.some(
          (member) => member.roleId === aircraftBlueprint.requiredStaffRoleId,
        ) ||
        state.base.credits < aircraftBlueprint.productionCreditCost ||
        state.base.materials < aircraftBlueprint.productionMaterialCost;
      manufacture.addEventListener('click', () => {
        store.dispatch({ type: 'MANUFACTURE_AIRCRAFT', blueprintId: aircraftBlueprint.id });
        showToast(t('toast.productionStarted'));
      });
      row.append(manufacture);
    }
    container.append(row);
  }
}

function renderAircraftUpgradeResearch(): void {
  const state = store.getSnapshot();
  const bankrupt = isBankrupt(state.base.credits);
  const researchBusy = state.base.researchQueue.length > 0;
  const container = byId<HTMLElement>('aircraft-upgrade-research-list');
  container.textContent = '';
  const upgrades = contentCatalog.aircraftUpgrades.filter(
    (upgrade) => state.base.unlockedBlueprintIds.includes(upgrade.aircraftBlueprintId),
  );
  if (upgrades.length === 0) {
    return;
  }
  for (const upgrade of upgrades) {
    const aircraftBlueprint = contentCatalog.aircraftBlueprints.find(
      (entry) => entry.id === upgrade.aircraftBlueprintId,
    );
    const aircraft = aircraftBlueprint === undefined
      ? undefined
      : contentCatalog.aircraft.find(
          (entry) => entry.id === aircraftBlueprint.outputAircraftId,
        );
    if (aircraft === undefined) {
      continue;
    }
    const researched = state.base.researchedAircraftUpgradeIds.includes(upgrade.id);
    const manufactured = state.base.manufacturedAircraftUpgradeIds.includes(upgrade.id);
    const researchProject = state.base.researchQueue.find(
      (project) => project.blueprintId === upgrade.id,
    );
    const row = h('div', { class: 'loadout-row' });
    const label = h(
      'span',
      { class: 'loadout-row__label' },
      `${t(aircraftNameKey[aircraft.id] ?? 'content.interceptor')} · ${t(
        'trade.aircraftMark',
        { mark: upgrade.tier === 1 ? 'II' : 'III' },
      )}`,
    );
    row.append(label);
    if (manufactured) {
      row.append(h('em', { class: 'status-chip is-owned' }, t('upgrade.installed')));
    } else if (researched) {
      const manufacture = h(
        'button',
        { class: 'base-action', type: 'button' },
        t('trade.manufactureUpgrade', {
          credits: upgrade.productionCreditCost,
          materials: upgrade.productionMaterialCost,
        }),
      );
      manufacture.disabled = bankrupt ||
        !state.base.constructedBuildingIds.includes(upgrade.requiredProductionBuildingId) ||
        !state.base.staff.some(
          (member) => member.roleId === upgrade.requiredProductionStaffRoleId,
        ) ||
        state.base.credits < upgrade.productionCreditCost ||
        state.base.materials < upgrade.productionMaterialCost;
      manufacture.addEventListener('click', () => {
        store.dispatch({ type: 'MANUFACTURE_AIRCRAFT_UPGRADE', upgradeId: upgrade.id });
        showToast(t('toast.productionStarted'));
      });
      row.append(manufacture);
    } else if (researchProject !== undefined) {
      row.append(h('small', null, t('research.cardProgress', {
        progress: researchProject.progress,
        required: researchProject.requiredProgress,
      })));
      row.append(h('small', null, t('research.cardRequiresSorties')));
    } else {
      const research = h(
        'button',
        { class: 'base-action', type: 'button' },
        t('trade.researchUpgrade', { credits: upgrade.researchCreditCost }),
      );
      research.disabled = bankrupt ||
        researchBusy ||
        !state.base.constructedBuildingIds.includes(upgrade.requiredResearchBuildingId) ||
        !state.base.staff.some(
          (member) => member.roleId === upgrade.requiredStaffRoleId,
        ) ||
        state.base.credits < upgrade.researchCreditCost;
      research.addEventListener('click', () => {
        store.dispatch({ type: 'RESEARCH_AIRCRAFT_UPGRADE', upgradeId: upgrade.id });
        showToast(t('toast.researchStarted'));
      });
      row.append(research);
    }
    container.append(row);
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
      if (
        weaponId === machineGunUpgrade.weaponId &&
        state.base.manufacturedWeaponUpgradeIds.includes(machineGunUpgrade.id)
      ) {
        const badge = document.createElement('em');
        badge.className = 'status-chip is-owned';
        badge.textContent = t('hangar.upgradeBadge');
        row.appendChild(badge);
      }
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

  const rocketStockAll = state.base.consumableStock[rocketsConsumable.id] ?? 0;
  const rocketPodEquipped = (state.base.activeAircraftId === null
    ? []
    : (state.base.aircraftLoadouts[state.base.activeAircraftId] ?? [])
  ).includes(rocketPodWeapon.id);
  if (rocketPodEquipped && rocketStockAll === 0) {
    const row = document.createElement('article');
    row.className = 'threat-row rocket-loaded-note';
    const name = document.createElement('strong');
    name.textContent = t('hangar.rocketsHint');
    row.appendChild(name);
    list.appendChild(row);
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

function renderMonthReport(): void {
  const report = store.getSnapshot().base.monthReport;
  monthReportPanel.hidden = report === null;
  if (report === null) {
    return;
  }
  monthReportEyebrow.textContent = t('report.eyebrow');
  monthReportTitle.textContent = t('report.title', { month: report.month });
  monthReportDetails.textContent = '';
  const entries: ReadonlyArray<[string, string]> = [
    [t('report.income'), formatCredits(report.income)],
    [t('report.expenses'), formatCredits(report.expenses)],
    [t('report.breaches'), formatCredits(report.breachPenalties)],
    [t('report.net'), formatCredits(report.net)],
    [
      t('report.resolvedLabel'),
      t('report.resolvedValue', {
        resolved: report.resolvedThreats,
        total: report.totalThreats,
      }),
    ],
  ];
  for (const [label, value] of entries) {
    const row = document.createElement('div');
    row.className = 'month-report-details__row';
    const dt = document.createElement('dt');
    dt.textContent = label;
    const dd = document.createElement('dd');
    dd.textContent = value;
    if (label === t('report.net')) {
      dd.classList.toggle('is-negative', report.net < 0);
      dd.classList.toggle('is-positive', report.net >= 0);
    }
    row.append(dt, dd);
    monthReportDetails.appendChild(row);
  }
  monthReportContinue.textContent = t('report.continue');
}

function countryNameKey(originCountryId: string): TranslationKey {
  return originCountryId === 'council-prc'
    ? 'country.prc'
    : originCountryId === 'council-india'
      ? 'country.india'
      : originCountryId === 'council-brazil'
        ? 'country.brazil'
        : 'country.ukraine';
}

function pilotSpecializationKey(specialization: string): TranslationKey {
  return specialization === 'speed'
    ? 'pilot.specSpeed'
    : specialization === 'damage'
      ? 'pilot.specDamage'
      : 'pilot.specRecovery';
}

function renderPilots(): void {
  const state = store.getSnapshot();
  const bankrupt = isBankrupt(state.base.credits);
  const roster = byId<HTMLElement>('pilots-roster');
  roster.textContent = '';
  const livingPilots = state.base.pilots.filter(
    (pilot) => !isPilotDead(state.base, pilot.id),
  );
  const medicalReady = hasMedicalTreatmentCapability(state.base);

  roster.append(h('h3', { class: 'hangar-subtitle' }, t('pilot.roster')));
  if (livingPilots.length === 0) {
    roster.append(h('p', { class: 'empty-note' }, t('pilot.noPilots')));
  } else {
    for (const pilot of livingPilots) {
      const active = state.base.activePilotId === pilot.id;
      const fatigue = state.base.pilotFatigue[pilot.id] ?? 0;
      const level = pilotLevel(state.base.pilotXp[pilot.id] ?? 0);
      const injury = state.base.pilotInjuries[pilot.id];
      const pilotName = `${pilot.firstName ?? pilot.id} ${pilot.lastName ?? ''}`.trim();
      const card = h('article', {
        class: 'pilot-card' + (active ? ' is-active' : '') +
          (isPilotFatigued(fatigue) ? ' is-fatigued' : '') +
          (injury !== undefined ? ' is-injured' : ''),
      });
      const head = h('div', { class: 'pilot-card__head' });
      head.append(
        h('strong', null, pilotName),
        h('small', null, [
          t(pilotSpecializationKey(pilot.specialization ?? 'speed')),
          t('pilot.level', { level }),
          t('pilot.fatigue', { value: Math.round(fatigue * 100) }),
        ].join(' · ')),
      );
      if (isPilotFatigued(fatigue)) {
        head.append(h('em', { class: 'status-chip is-damaged' }, t('pilot.fatiguedTag')));
      }
      if (injury !== undefined) {
        head.append(h(
          'em',
          { class: 'status-chip is-injured' },
          t(pilotInjurySeverityKey[injury.severity] ?? 'pilot.injuryLight'),
        ));
      }
      card.append(head);
      const actions = h('div', { class: 'pilot-card__actions' });
      if (injury === undefined) {
        if (active) {
          actions.append(h('em', { class: 'status-chip is-active' }, t('pilot.active')));
        } else {
          const assign = h('button', { class: 'base-action', type: 'button' }, t('pilot.assign'));
          assign.disabled = isPilotFatigued(fatigue);
          assign.addEventListener('click', () => {
            store.dispatch({ type: 'ASSIGN_PILOT', pilotId: pilot.id });
          });
          actions.append(assign);
        }
        if (fatigue > 0 && active) {
          const rest = h('button', { class: 'base-action', type: 'button' }, t('pilot.rest'));
          rest.addEventListener('click', () => {
            store.dispatch({ type: 'REST_PILOT', pilotId: pilot.id });
          });
          actions.append(rest);
        }
        if (fatigue > 0 && !active) {
          actions.append(h('em', { class: 'status-chip is-resting' }, t('pilot.recovering')));
        }
      } else {
        const months = Math.ceil(injury.monthsRemaining);
        actions.append(h(
          'em',
          { class: 'status-chip is-injured' },
          injury.treatment === null
            ? t('pilot.awaitingTreatment')
            : t(injury.treatment === 'medical'
              ? 'pilot.inTreatmentMedical'
              : 'pilot.inTreatmentOutsource'),
        ));
        actions.append(h(
          'em',
          { class: 'status-chip is-resting' },
          t('pilot.injuryMonths', { months }),
        ));
        if (injury.treatment === null) {
          if (medicalReady) {
            const inHouse = h(
              'button',
              { class: 'base-action is-primary', type: 'button' },
              t('pilot.treatMedical'),
            );
            inHouse.addEventListener('click', () => {
              store.dispatch({ type: 'TREAT_PILOT_MEDICAL', pilotId: pilot.id });
              showToast(t('toast.pilotInTreatment', { pilot: pilotName }));
            });
            actions.append(inHouse);
          }
          const countrySelect = document.createElement('select');
          countrySelect.className = 'pilot-treat__country';
          for (const country of contentCatalog.councilStates) {
            const option = document.createElement('option');
            option.value = country.id;
            option.textContent = `${t(country.nameKey as TranslationKey)} · ` +
              formatCredits(outsourceTreatmentCost(state.base, pilot.id, country.id));
            countrySelect.appendChild(option);
          }
          const outsource = h(
            'button',
            { class: 'base-action', type: 'button' },
            t('pilot.treatOutsource'),
          );
          outsource.disabled = bankrupt;
          outsource.addEventListener('click', () => {
            store.dispatch({
              type: 'TREAT_PILOT_OUTSOURCE',
              pilotId: pilot.id,
              countryId: countrySelect.value,
            });
            showToast(t('toast.pilotInTreatment', { pilot: pilotName }));
          });
          actions.append(countrySelect, outsource);
        }
      }
      card.append(actions);
      roster.append(card);
    }
  }

  if (state.base.pilotCandidates.length > 0) {
    roster.append(h('h3', { class: 'hangar-subtitle' }, t('pilot.candidates')));
    for (const candidate of state.base.pilotCandidates) {
      const card = h('article', { class: 'pilot-card is-candidate' });
      const head = h('div', { class: 'pilot-card__head' });
      head.append(
        h('strong', null, `${candidate.firstName} ${candidate.lastName}`),
        h('small', null, [
          t(countryNameKey(candidate.originCountryId)),
          t('staff.tier', { tier: candidate.tier }),
          t(pilotSpecializationKey(candidate.specialization)),
        ].join(' · ')),
      );
      card.append(head);
      const hire = h('button', {
        class: 'base-action is-primary',
        type: 'button',
      }, t('staff.hire', { credits: candidate.hireCreditCost }));
      hire.disabled = bankrupt || state.base.credits < candidate.hireCreditCost;
      hire.addEventListener('click', () => {
        store.dispatch({ type: 'HIRE_PILOT', candidateId: candidate.id });
        showToast(t('toast.candidateHired', {
          name: `${candidate.firstName} ${candidate.lastName}`,
        }));
      });
      card.append(hire);
      roster.append(card);
    }
  }

  const fallen = state.base.pilots.filter((pilot) => isPilotDead(state.base, pilot.id));
  pilotMemorial.hidden = fallen.length === 0;
  pilotMemorialList.textContent = '';
  if (fallen.length > 0) {
    byId<HTMLElement>('pilot-memorial-title').textContent = t('pilot.memorialTitle');
    for (const pilot of fallen) {
      const month = state.base.pilotDeathMonth[pilot.id];
      const card = h('article', { class: 'pilot-card is-memorial' });
      card.append(
        h('strong', null, `${pilot.firstName ?? pilot.id} ${pilot.lastName ?? ''}`.trim()),
        h('small', null, [
          t(pilotSpecializationKey(pilot.specialization ?? 'speed')),
          t('pilot.deadMonth', { month: month ?? state.base.month }),
        ].join(' · ')),
      );
      pilotMemorialList.append(card);
    }
  }
}

function renderFinance(): void {
  const state = store.getSnapshot();
  const content = byId<HTMLElement>('finance-content');
  content.textContent = '';

  const expenses = monthlyExpenses(state.base);
  const unresolved = state.base.threatMap.filter(
    (mission) => !state.base.resolvedThreatIds.includes(mission.id),
  );
  const expectedIncome = unresolved.reduce(
    (sum, mission) => sum + missionBounty(mission),
    0,
  );
  const expectedGifts = unresolved.reduce((sum, mission) => {
    if (state.base.nationThanks[mission.targetCountryId]) {
      return sum;
    }
    const gift = (contentCatalog.nationGifts as Readonly<
      Record<string, { readonly credits: number; readonly materials: number }>
    >)[mission.targetCountryId];
    return gift === undefined ? sum : sum + gift.credits;
  }, 0);
  const loanDue = state.base.loans
    .filter((loan) => !loan.repaid && loan.dueMonth <= state.base.month + 1)
    .reduce((sum, loan) => sum + loan.repaymentDue, 0);
  const netProjection = expectedIncome + expectedGifts - expenses.total - loanDue;
  const projectedBalance = state.base.credits + netProjection;

  const panel = h('section', { class: 'technology-lab finance-ledger' });
  panel.append(
    h('p', { class: 'technology-lab__eyebrow' }, t('finance.eyebrow')),
    h('h2', null, t('finance.title')),
    h('p', { class: 'lede' }, t('finance.lede')),
  );

  const rows: ReadonlyArray<[TranslationKey, number]> = [
    ['finance.expectedIncome', expectedIncome],
    ['finance.expectedGifts', expectedGifts],
    ['finance.salaries', expenses.salaries],
    ['finance.upkeep', expenses.upkeep],
    ['finance.loansDue', loanDue],
    ['finance.netProjection', netProjection],
    ['finance.projectedBalance', projectedBalance],
  ];
  for (const [key, value] of rows) {
    const row = h('div', { class: 'finance-row' });
    row.append(h('span', null, t(key)));
    const amount = h('strong', null, formatCredits(value));
    amount.classList.toggle('is-negative', value < 0);
    amount.classList.toggle('is-positive', key === 'finance.projectedBalance' && value >= 0);
    row.append(amount);
    panel.append(row);
  }

  panel.append(h('h3', { class: 'hangar-subtitle' }, t('finance.threats')));
  if (unresolved.length === 0) {
    panel.append(h('p', { class: 'empty-note' }, t('finance.allResolved')));
  } else {
    for (const mission of unresolved) {
      const stateDefinition = contentCatalog.councilStates.find(
        (entry) => entry.id === mission.targetCountryId,
      );
      const row = h('div', { class: 'finance-row' });
      const label = h('span', null, stateDefinition === undefined
        ? mission.targetCountryId
        : t(stateDefinition.nameKey as TranslationKey));
      const bounty = h('strong', null, `${missionBounty(mission)} ${t('finance.creditsSuffix')}`);
      row.append(label, bounty);
      panel.append(row);
    }
  }

  content.append(panel);
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
    'staff-repair-master': 'staff.repairMaster',
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
      h('td', null, weapon.marketPrice === null ? '—' : `${formatCredits(weapon.marketPrice.minimum)}..${formatCredits(weapon.marketPrice.maximum)}`),
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
      h('td', null, t(aircraftRoleKey[aircraft.id] ?? 'aircraft.indiaRole')),
      h('td', { class: 'num' }, aircraft.armour.toString()),
      h('td', { class: 'num' }, `${aircraft.speedMultiplier}×`),
      h('td', { class: 'num' }, `${aircraft.damageMultiplier}×`),
      h('td', { class: 'num' }, aircraft.weaponSlotCount.toString()),
      h('td', { class: 'num' }, `${formatCredits(aircraft.refuelCreditCost)} cr`),
      h('td', null, aircraft.marketPrice === null ? '—' : `${formatCredits(aircraft.marketPrice.minimum)}..${formatCredits(aircraft.marketPrice.maximum)}`),
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
      h('td', { class: 'num' }, `${formatCredits(building.creditCost)} cr / ${building.materialCost} mat`),
      h('td', null, prerequisites.length === 0 ? '—' : prerequisites.join(' + ')),
    );
  });
  blocks.push({ heading: 'databank.buildings', headers: buildingHeaders, rows: buildingRows });

  const staffHeaders = ['databank.colName', 'databank.colCost', 'databank.colPrereq', 'databank.colHeadcount'] as const;
  const staffRows = contentCatalog.staffRoles.map((role) =>
    h('tr', null,
      h('td', { class: 'db-name' }, t(staffNameKey[role.id] ?? 'staff.scientist')),
      h('td', { class: 'num' }, `${formatCredits(role.creditCost)} cr`),
      h('td', null, role.requiredBuildingId === null
        ? '—'
        : t(buildingNameKey[role.requiredBuildingId] ?? 'building.laboratory')),
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
  renderCredit();
  const dynamic = byId<HTMLElement>('trade-dynamic');
  dynamic.textContent = '';
  if (tradeCentreBuilding === undefined) {
    return;
  }
  const built = state.base.constructedBuildingIds.includes(tradeCentreBuilding.id);
  if (!built) {
    const note = document.createElement('p');
    note.className = 'preflight-warning';
    note.textContent = t('trade.locked');
    dynamic.appendChild(note);
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
  const aircraftHeading = document.createElement('h3');
  aircraftHeading.className = 'hangar-subtitle';
  aircraftHeading.textContent = t('trade.aircraftTitle');
  dynamic.appendChild(aircraftHeading);
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
    const row = document.createElement('div');
    row.className = 'loadout-row';
    const label = document.createElement('span');
    label.className = 'loadout-row__label';
    label.textContent = t(aircraftNameKey[aircraft.id] ?? 'content.interceptor');
    const meta = document.createElement('small');
    meta.textContent = aircraftStatSummary(aircraft);
    row.append(label, meta);
    if (owned) {
      const ownedNote = document.createElement('strong');
      ownedNote.textContent = t('hangar.aircraftOwned');
      row.append(ownedNote);
    } else {
      const buy = document.createElement('button');
      buy.className = 'base-action';
      buy.type = 'button';
      buy.textContent = t('trade.buy', { credits: price });
      buy.disabled = bankrupt || !freeSlot || state.base.credits < price;
      buy.addEventListener('click', () => {
        store.dispatch({ type: 'PURCHASE_AIRCRAFT', aircraftId: aircraft.id });
      });
      row.append(buy);
    }
    dynamic.appendChild(row);
  }

  const blueprintHeading = document.createElement('h3');
  blueprintHeading.className = 'hangar-subtitle';
  blueprintHeading.textContent = t('trade.aircraftBlueprintTitle');
  dynamic.appendChild(blueprintHeading);
  for (const aircraftBlueprint of contentCatalog.aircraftBlueprints) {
    const owned = state.base.unlockedBlueprintIds.includes(aircraftBlueprint.id);
    const available = state.base.sortiesCompleted >= aircraftBlueprint.minimumSorties;
    const price = marketBlueprintPrice(
      aircraftBlueprint,
      state.base.marketSeed,
      state.base.sortiesCompleted,
    );
    const row = document.createElement('div');
    row.className = 'loadout-row';
    const label = document.createElement('span');
    label.className = 'loadout-row__label';
    label.textContent = t(aircraftNameKey[aircraftBlueprint.outputAircraftId] ?? 'content.interceptor');
    const tag = document.createElement('em');
    tag.className = 'status-chip is-owned';
    tag.textContent = t('trade.aircraftBlueprint');
    row.append(label, tag);
    if (owned) {
      const ownedNote = document.createElement('strong');
      ownedNote.textContent = t('market.blueprintOwned');
      row.append(ownedNote);
    } else if (!available) {
      const note = document.createElement('small');
      note.textContent = t('trade.aircraftLocked', {
        sorties: aircraftBlueprint.minimumSorties,
      });
      row.append(note);
    } else {
      const buy = document.createElement('button');
      buy.className = 'base-action';
      buy.type = 'button';
      buy.textContent = t('trade.buyBlueprint', { credits: price });
      buy.disabled = bankrupt || state.base.credits < price;
      buy.addEventListener('click', () => {
        store.dispatch({
          type: 'PURCHASE_AIRCRAFT_BLUEPRINT',
          blueprintId: aircraftBlueprint.id,
        });
      });
      row.append(buy);
    }
    dynamic.appendChild(row);
  }

  sellHeading.textContent = t('trade.sellTitle');
  dynamic.appendChild(sellHeading);
  const sellables = contentCatalog.weapons.filter(
    (weapon) => (state.base.weaponStock[weapon.id] ?? 0) > 0,
  );
  const sellableAircraft = state.base.hangarSlots.filter(
    (aircraftId): aircraftId is string =>
      aircraftId !== null &&
      aircraftId !== state.base.activeAircraftId &&
      contentCatalog.aircraft.find((entry) => entry.id === aircraftId)?.marketPrice !== null,
  );
  let soldAnything = false;
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
    soldAnything = true;
  }
  for (const aircraftId of sellableAircraft) {
    const aircraft = contentCatalog.aircraft.find((entry) => entry.id === aircraftId);
    if (aircraft === undefined || aircraft.marketPrice === null) {
      continue;
    }
    const basePrice = marketAircraftPrice(
      aircraft,
      state.base.marketSeed,
      state.base.sortiesCompleted,
    );
    const price = Math.round(basePrice * 0.6 * (1 + tradeMargin(state.base)));
    const row = document.createElement('div');
    row.className = 'loadout-row';
    const label = document.createElement('span');
    label.className = 'loadout-row__label';
    label.textContent = t(aircraftNameKey[aircraft.id] ?? 'content.interceptor');
    const sell = document.createElement('button');
    sell.className = 'base-action';
    sell.type = 'button';
    sell.textContent = t('trade.sell', { credits: price });
    sell.addEventListener('click', () => {
      store.dispatch({ type: 'SELL_AIRCRAFT', aircraftId: aircraft.id });
    });
    row.append(label, sell);
    dynamic.appendChild(row);
    soldAnything = true;
  }
  if (!soldAnything) {
    const note = document.createElement('p');
    note.className = 'empty-note';
    note.textContent = t('trade.noStock');
    dynamic.appendChild(note);
  }
}

function renderHangarHero(): void {
  const state = store.getSnapshot();
  const bankrupt = isBankrupt(state.base.credits);
  const container = byId<HTMLElement>('hangar-hero');
  container.textContent = '';
  const activeId = state.base.activeAircraftId;
  const aircraft = activeId === null
    ? undefined
    : contentCatalog.aircraft.find((entry) => entry.id === activeId);
  if (aircraft === undefined) {
    container.append(h('p', { class: 'empty-note' }, t('hangar.noActiveAircraft')));
    return;
  }
  const upgraded = applyAircraftUpgrades(
    aircraft,
    state.base.manufacturedAircraftUpgradeIds,
    contentCatalog.aircraftUpgrades,
  );
  const damage = aircraftDamageValue(state.base, aircraft.id);
  const repairing = isAircraftRepairing(state.base, aircraft.id);
  const fueled = isAircraftFueled(state.base, aircraft.id);
  const inHouseRepair = isInHouseRepair(state.base);
  const hero = h('div', { class: 'hangar-hero__model' });
  hero.innerHTML = aircraftVisualHtml(aircraft.visual);
  const info = h('div', { class: 'hangar-hero__info' });
  info.append(
    h('strong', null, t(aircraftNameKey[aircraft.id] ?? 'content.aircraftIndia')),
    h('small', null, t(aircraftRoleKey[aircraft.id] ?? 'aircraft.indiaRole')),
    h('small', null, [
      t('hangar.armour', { value: upgraded.armour }),
      t('hangar.speed', { value: upgraded.speedMultiplier }),
      t('hangar.firepower', { value: upgraded.damageMultiplier }),
      t('hangar.fireRate', { value: upgraded.fireRateMultiplier }),
      t('hangar.projectileSpeed', { value: upgraded.projectileSpeedMultiplier }),
      t('hangar.slots', { value: aircraft.weaponSlotCount }),
    ].join(' · ')),
    h('small', { class: 'hangar-hero__status' }, [
      fueled ? t('command.fueled') : t('command.unfueled'),
      damage > 0 ? t('hangar.damage', { value: Math.round(damage * 100) }) : '',
    ].filter(Boolean).join(' · ')),
  );
  if (damage > 0) {
    info.append(h(
      'small',
      { class: 'hangar-hero__repair-mode' },
      t(inHouseRepair ? 'hangar.repairModeInHouse' : 'hangar.repairModeOutsourced'),
    ));
  }
  if (
    upgraded.armour !== aircraft.armour ||
    upgraded.speedMultiplier !== aircraft.speedMultiplier ||
    upgraded.damageMultiplier !== aircraft.damageMultiplier
  ) {
    info.append(h('em', { class: 'status-chip is-owned' }, t('hangar.upgraded')));
  }
  const actions = h('div', { class: 'hangar-hero__actions' });
  if (repairing) {
    const left = state.base.aircraftRepair[aircraft.id] ?? 0;
    if (left > 0) {
      actions.append(h('small', null, t('hangar.repairInProgress', {
        sorties: Math.ceil(left),
      })));
    } else {
      const cost = standardRepairCost(state.base, aircraft.id);
      const repair = h(
        'button',
        { class: 'base-action is-primary', type: 'button' },
        t(inHouseRepair ? 'hangar.repairInHouse' : 'hangar.repairOutsourced', {
          credits: cost,
        }),
      );
      repair.disabled = bankrupt || state.base.credits < cost;
      repair.addEventListener('click', () => {
        store.dispatch({
          type: 'REPAIR_AIRCRAFT',
          aircraftId: aircraft.id,
          emergency: false,
        });
      });
      actions.append(repair);
    }
  } else if (damage > 0) {
    const standardCost = standardRepairCost(state.base, aircraft.id);
    const standard = h(
      'button',
      { class: 'base-action is-primary', type: 'button' },
      t(inHouseRepair ? 'hangar.repairInHouse' : 'hangar.repairOutsourced', {
        credits: standardCost,
      }),
    );
    standard.disabled = bankrupt || state.base.credits < standardCost;
    standard.addEventListener('click', () => {
      store.dispatch({
        type: 'REPAIR_AIRCRAFT',
        aircraftId: aircraft.id,
        emergency: false,
      });
    });
    actions.append(standard);
  }
  if (!fueled) {
    const refuel = h(
      'button',
      { class: 'base-action', type: 'button' },
      t('hangar.refuelWithCost', { credits: aircraft.refuelCreditCost }),
    );
    refuel.disabled = bankrupt || state.base.credits < aircraft.refuelCreditCost;
    refuel.addEventListener('click', () => {
      store.dispatch({ type: 'REFUEL_AIRCRAFT', aircraftId: aircraft.id });
    });
    actions.append(refuel);
  }
  container.append(hero, info, actions);
}

function toastSettlementCompletions(before: GameState, after: GameState): void {
  const newBuildings = after.base.constructedBuildingIds.filter(
    (id) => !before.base.constructedBuildingIds.includes(id),
  );
  newBuildings.forEach(() => showToast(t('toast.buildingConstructed')));
  const newAircraft = after.base.hangarSlots.filter(
    (id): id is string => id !== null && !before.base.hangarSlots.includes(id),
  );
  for (const aircraftId of newAircraft) {
    showToast(t('toast.aircraftDelivered', {
      aircraft: t(aircraftNameKey[aircraftId] ?? 'content.interceptor'),
    }));
  }
  const newBlueprints = after.base.unlockedBlueprintIds.filter(
    (id) => !before.base.unlockedBlueprintIds.includes(id),
  );
  for (const blueprintId of newBlueprints) {
    const aircraftBlueprint = contentCatalog.aircraftBlueprints.find(
      (entry) => entry.id === blueprintId,
    );
    if (aircraftBlueprint !== undefined) {
      showToast(t('toast.blueprintResearched', {
        aircraft: t(aircraftNameKey[aircraftBlueprint.outputAircraftId] ?? 'content.interceptor'),
      }));
    }
  }
  const newDead = after.base.deadPilotIds.filter(
    (id) => !before.base.deadPilotIds.includes(id),
  );
  for (const pilotId of newDead) {
    const pilot = after.base.pilots.find((entry) => entry.id === pilotId);
    showToast(t('toast.pilotDied', {
      pilot: `${pilot?.firstName ?? pilotId} ${pilot?.lastName ?? ''}`.trim(),
    }));
  }
  const newInjuries = Object.keys(after.base.pilotInjuries).filter(
    (pilotId) => before.base.pilotInjuries[pilotId] === undefined,
  );
  for (const pilotId of newInjuries) {
    const pilot = after.base.pilots.find((entry) => entry.id === pilotId);
    const injury = after.base.pilotInjuries[pilotId];
    showToast(t('toast.pilotInjured', {
      pilot: `${pilot?.firstName ?? pilotId} ${pilot?.lastName ?? ''}`.trim(),
      severity: injury === undefined
        ? ''
        : t(pilotInjurySeverityKey[injury.severity] ?? 'pilot.injuryLight'),
    }));
  }
}

function renderFleet(): void {
  const state = store.getSnapshot();
  const bankrupt = isBankrupt(state.base.credits);
  const slotsList = byId<HTMLElement>('hangar-slots-list');

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
        ship.innerHTML = aircraftVisualHtml(aircraft.visual);
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
              sorties: Math.ceil(repairLeft ?? 0),
            });
            actions.appendChild(note);
          } else {
            const inHouse = isInHouseRepair(state.base);
            const standardCost = standardRepairCost(state.base, aircraft.id);
            const standard = document.createElement('button');
            standard.className = 'base-action is-primary';
            standard.type = 'button';
            standard.textContent = t(
              inHouse ? 'hangar.repairInHouse' : 'hangar.repairOutsourced',
              { credits: standardCost },
            );
            standard.disabled = bankrupt || state.base.credits < standardCost;
            standard.addEventListener('click', () => {
              store.dispatch({
                type: 'REPAIR_AIRCRAFT',
                aircraftId: aircraft.id,
                emergency: false,
              });
            });
            actions.appendChild(standard);
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

  renderHangarHero();

  byId<HTMLElement>('hangar-slot-cost').textContent = t('hangar.slotCost', {
    credits: HANGAR_SLOT_COST,
  });
  const purchaseSlotButton = byId<HTMLButtonElement>('purchase-hangar-slot');
  purchaseSlotButton.hidden = false;
  purchaseSlotButton.disabled = bankrupt || state.base.credits < HANGAR_SLOT_COST;
}

function isAircraftReadyForSortie(state: GameState, aircraftId: string): boolean {
  const fueled = isAircraftFueled(state.base, aircraftId);
  const undamaged = aircraftDamageValue(state.base, aircraftId) <= 0 &&
    (state.base.aircraftRepair[aircraftId] ?? 0) <= 0;
  const activePilot = state.base.activePilotId === null
    ? undefined
    : state.base.pilots.find((pilot) => pilot.id === state.base.activePilotId);
  const pilotReady = activePilot !== undefined &&
    isPilotFlightReady(state.base, activePilot.id);
  return fueled && undamaged && pilotReady;
}

function hasReadyAircraft(state: GameState): boolean {
  return state.base.hangarSlots.some(
    (aircraftId) => aircraftId !== null && isAircraftReadyForSortie(state, aircraftId),
  );
}

function renderSortiePicker(): void {
  const state = store.getSnapshot();
  const list = sortiePickerList;
  list.textContent = '';
  const aircraftEntries = state.base.hangarSlots.filter(
    (aircraftId): aircraftId is string => aircraftId !== null,
  );
  const anyReady = hasReadyAircraft(state);
  sortiePickerEmpty.hidden = anyReady;
  if (!anyReady) {
    sortiePickerEmpty.textContent = t('sortiePicker.noAircraftReady');
  }
  const activePilot = state.base.activePilotId === null
    ? undefined
    : state.base.pilots.find((pilot) => pilot.id === state.base.activePilotId);
  const pilotName = activePilot === undefined
    ? ''
    : `${activePilot.firstName ?? ''} ${activePilot.lastName ?? ''}`.trim();
  for (const aircraftId of aircraftEntries) {
    const aircraft = contentCatalog.aircraft.find((entry) => entry.id === aircraftId);
    if (aircraft === undefined) {
      continue;
    }
    const ready = isAircraftReadyForSortie(state, aircraftId);
    const row = h('article', { class: 'threat-row' + (ready ? ' is-ready' : '') });
    const info = h('div', null);
    info.append(
      h('strong', null, t(aircraftNameKey[aircraft.id] ?? 'content.interceptor')),
      h('small', null, [
        t('hangar.armour', { value: aircraft.armour }),
        t('hangar.speed', { value: aircraft.speedMultiplier }),
        t('hangar.firepower', { value: aircraft.damageMultiplier }),
        pilotName,
      ].filter(Boolean).join(' · ')),
    );
    if (!ready) {
      const reasons: string[] = [];
      if (!isAircraftFueled(state.base, aircraftId)) {
        reasons.push(t('sortiePicker.reasonFuel'));
      }
      if (aircraftDamageValue(state.base, aircraftId) > 0 ||
        (state.base.aircraftRepair[aircraftId] ?? 0) > 0) {
        reasons.push(t('sortiePicker.reasonDamage'));
      }
      if (pilotName === '') {
        reasons.push(t('sortiePicker.reasonPilot'));
      }
      info.append(h('small', { class: 'sortie-picker__reason' }, reasons.join(' · ')));
    }
    row.append(info);
    const actions = h('div', { class: 'candidate-row__actions' });
    const fly = h(
      'button',
      { class: 'base-action is-primary', type: 'button' },
      t('sortiePicker.fly'),
    );
    fly.disabled = !ready;
    fly.addEventListener('click', () => {
      store.dispatch({ type: 'SET_ACTIVE_AIRCRAFT', aircraftId });
      sortiePickerOverlay.hidden = true;
      launchSortie();
    });
    actions.append(fly);
    row.append(actions);
    list.append(row);
  }
}

function openSortiePicker(): void {
  renderSortiePicker();
  sortiePickerOverlay.hidden = false;
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
    {
      key: 'command.phasePlan',
      active: monthProgress === 0 && state.base.monthReport === null,
    },
    {
      key: 'command.phaseExecute',
      active: monthProgress > 0 && state.base.monthReport === null,
    },
    {
      key: 'command.phaseSettle',
      active: state.base.monthReport !== null,
    },
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
    'council-usa': { left: 12, top: 34 },
    'council-uk': { left: 44, top: 18 },
    'council-germany': { left: 50, top: 26 },
    'council-japan': { left: 86, top: 36 },
    'council-france': { left: 45, top: 30 },
  };
  for (const stateDefinition of contentCatalog.councilStates) {
    const mission = state.base.threatMap.find(
      (entry) => entry.targetCountryId === stateDefinition.id,
    );
    const position = geoPositions[stateDefinition.id] ?? { left: 50, top: 50 };
    const resolved = mission !== undefined &&
      state.base.resolvedThreatIds.includes(mission.id);
    const marker = document.createElement('button');
    marker.type = 'button';
    marker.className = 'geo-map__marker' + (mission === undefined
      ? ' is-calm'
      : ' is-threat-' + String(Math.min(3, Math.max(1, mission.threatLevel)))) +
      (mission !== undefined && state.base.activeMissionId === mission.id
        ? ' is-selected'
        : '');
    marker.style.left = position.left + '%';
    marker.style.top = position.top + '%';
    marker.disabled = mission === undefined || resolved;
    marker.setAttribute('aria-label', t('command.selectMission', {
      country: t(stateDefinition.nameKey as TranslationKey),
    }));
    if (mission !== undefined) {
      marker.addEventListener('click', () => {
        store.dispatch({ type: 'SELECT_MISSION', missionId: mission.id });
      });
    }
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
  const anyReady = hasReadyAircraft(state);
  for (const mission of state.base.threatMap) {
    const stateDefinition = contentCatalog.councilStates.find(
      (entry) => entry.id === mission.targetCountryId,
    );
    const resolved = state.base.resolvedThreatIds.includes(mission.id);
    const selected = state.base.activeMissionId === mission.id;
    const row = document.createElement('article');
    row.className = 'threat-row mission-card' + (resolved ? ' is-resolved' : '') +
      (selected ? ' is-selected' : '');
    const left = document.createElement('div');
    const name = document.createElement('strong');
    name.textContent = stateDefinition === undefined
      ? mission.targetCountryId
      : t(stateDefinition.nameKey as TranslationKey);
    const meta = document.createElement('small');
    meta.textContent = [
      t('command.threatLevel', { value: mission.threatLevel }),
      t('command.bounty', { credits: missionBounty(mission) }),
    ].join(' · ');
    left.append(name, meta);
    row.appendChild(left);
    const action = document.createElement('button');
    action.className = 'base-action is-primary';
    action.type = 'button';
    action.textContent = resolved ? t('command.resolved') : t('command.flyMission');
    action.disabled = resolved || !anyReady;
    if (!resolved) {
      action.addEventListener('click', () => {
        if (!selected) {
          store.dispatch({ type: 'SELECT_MISSION', missionId: mission.id });
        }
        openSortiePicker();
      });
    }
    row.appendChild(action);
    threatList.appendChild(row);
  }
  if (!anyReady) {
    const hint = document.createElement('p');
    hint.className = 'preflight-warning';
    hint.textContent = t('command.noAircraftReady');
    threatList.appendChild(hint);
  }

  endMonthButton.textContent = t('command.endMonth');
}

function renderCredit(): void {
  const state = store.getSnapshot();
  const bankrupt = isBankrupt(state.base.credits);
  const offersList = byId<HTMLElement>('credit-offers-list');
  const loansList = byId<HTMLElement>('active-loans-list');
  const LENDER_COUNTRY_KEY: Readonly<Record<string, TranslationKey>> = {
    'lender-commission': 'credit.lenderCommission',
    'lender-prc': 'country.prc',
    'lender-ukraine': 'country.ukraine',
    'lender-usa': 'country.usa',
    'lender-uk': 'country.uk',
    'lender-germany': 'country.germany',
    'lender-japan': 'country.japan',
    'lender-france': 'country.france',
  };
  const lenderName = (lenderId: string): string =>
    t(LENDER_COUNTRY_KEY[lenderId] ?? 'credit.lenderCommission');

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
  for (const loan of state.base.loans.filter((entry) => !entry.repaid)) {
    const row = document.createElement('article');
    row.className = 'threat-row loan-row';
    const left = document.createElement('div');
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
    left.append(name, info);
    row.appendChild(left);
    if (!loan.repaid) {
      const repay = document.createElement('div');
      repay.className = 'loan-repay';
      const input = document.createElement('input');
      input.type = 'number';
      input.min = '1';
      input.max = String(loan.repaymentDue);
      input.value = String(Math.min(loan.repaymentDue, state.base.credits));
      input.className = 'loan-repay__input';
      input.setAttribute('aria-label', t('credit.repayAmount'));
      const button = document.createElement('button');
      button.className = 'base-action';
      button.type = 'button';
      button.textContent = t('credit.repay');
      button.disabled = bankrupt;
      button.addEventListener('click', () => {
        const amount = Math.max(1, Number.parseInt(input.value, 10) || 0);
        try {
          store.dispatch({ type: 'REPAY_LOAN', loanId: loan.id, amount });
          showToast(t('toast.loanRepaid'));
        } catch {
          showToast(t('credit.repayShortfall'));
        }
      });
      repay.append(input, button);
      row.appendChild(repay);
    }
    loansList.appendChild(row);
  }
}

function renderCanister(): void {
  const state = store.getSnapshot();
  const bankrupt = isBankrupt(state.base.credits);
  const researchBusy = state.base.researchQueue.length > 0;
  const canisterUnlocked = state.base.unlockedBlueprintIds.includes(canisterBlueprint.id);
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
  researchCanisterButton.disabled =
    bankrupt || !researchReady || researchBusy ||
    state.base.credits < canisterBlueprint.researchCreditCost;

  const canisterJob = productionJob(state, canisterBlueprint.id);
  canisterProductionRow.hidden = !canisterUnlocked;
  if (canisterUnlocked) {
    canisterProductionStatus.textContent = canisterJob !== undefined
      ? t('production.inProgress', {
          progress: canisterJob.progress,
          required: canisterJob.requiredProgress,
        })
      : productionReady
        ? t('production.ready')
        : t('production.requiresEngineer');
    canisterProductionNote.textContent = t('production.cost', {
      credits: canisterBlueprint.productionCreditCost,
      materials: canisterBlueprint.productionMaterialCost,
    });
    applyWeaponProductionButton(
      state,
      productionQtyCanister,
      manufactureCanisterButton,
      canisterJob,
      productionReady,
      bankrupt,
      canisterBlueprint,
    );
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
    startContainmentResearchButton.disabled =
      bankrupt || !researchReady || researchBusy ||
      state.base.credits < containmentBlueprint.researchCreditCost;
  }

  quarantineRow.hidden = !containmentUnlocked;
  const quarantineJob = constructionJob(state, quarantine.id);
  if (quarantineBuilt) {
    quarantineStatus.textContent = t('facility.quarantineBuilt');
    quarantineCost.textContent = '';
    constructQuarantineButton.hidden = true;
  } else if (quarantineJob !== undefined) {
    quarantineStatus.textContent = t('facility.constructing', {
      progress: quarantineJob.progress,
      required: quarantineJob.requiredProgress,
    });
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

  alienEmitterProductionRow.hidden = !adaptedUnlocked;
  const emitterJob = productionJob(state, adaptedBlueprint.id);
  if (adaptedUnlocked) {
    alienEmitterProductionStatus.textContent = emitterJob !== undefined
      ? t('production.inProgress', {
          progress: emitterJob.progress,
          required: emitterJob.requiredProgress,
        })
      : productionReady
        ? t('production.ready')
        : t('production.requiresEngineer');
    alienEmitterProductionNote.textContent = t('alienProduction.cost', {
      credits: adaptedBlueprint.productionCreditCost,
      materials: adaptedBlueprint.productionMaterialCost,
    });
    applyWeaponProductionButton(
      state,
      productionQtyAlienEmitter,
      manufactureAlienEmitterButton,
      emitterJob,
      productionReady,
      bankrupt,
      adaptedBlueprint,
    );
  }
}

function renderTradeCentre(): void {
  if (tradeCentreBuilding === undefined) {
    tradeCentreRow.hidden = true;
    return;
  }
  const state = store.getSnapshot();
  const bankrupt = isBankrupt(state.base.credits);
  const built = state.base.constructedBuildingIds.includes(tradeCentreBuilding.id);
  const job = constructionJob(state, tradeCentreBuilding.id);
  const workshopBuilt = state.base.constructedBuildingIds.includes('building-workshop');
  tradeCentreRow.hidden = built;
  if (built || job !== undefined) {
    if (job !== undefined) {
      tradeCentreStatus.textContent = t('facility.constructing', {
        progress: job.progress,
        required: job.requiredProgress,
      });
    }
    tradeCentreCost.textContent = '';
    constructTradeCentreButton.hidden = true;
    return;
  }
  tradeCentreStatus.textContent = workshopBuilt
    ? t('facility.tradeCentreAffordable')
    : t('facility.tradeCentreLocked');
  tradeCentreCost.textContent = t('facility.tradeCentreCost', {
    credits: tradeCentreBuilding.creditCost,
    materials: tradeCentreBuilding.materialCost,
  });
  constructTradeCentreButton.hidden = false;
  constructTradeCentreButton.disabled =
    bankrupt ||
    !workshopBuilt ||
    state.base.credits < tradeCentreBuilding.creditCost ||
    state.base.materials < tradeCentreBuilding.materialCost;
}

function renderMedicalProgramme(): void {
  const state = store.getSnapshot();
  const bankrupt = isBankrupt(state.base.credits);
  const researchBusy = state.base.researchQueue.length > 0;
  const medicalUnlocked = state.base.unlockedBlueprintIds.includes(medicalBlueprint.id);
  const medicalBuilt = state.base.constructedBuildingIds.includes(medicalBlock.id);
  const medicalProject = state.base.researchQueue.find(
    (project) => project.blueprintId === medicalBlueprint.id,
  );
  const labBuilt = state.base.constructedBuildingIds.includes(laboratory.id);
  const scientists = state.base.staff.filter(
    (member) => member.roleId === scientistRole.id,
  ).length;
  const researchReady = labBuilt && scientists > 0;
  const workshopBuilt = state.base.constructedBuildingIds.includes(workshop.id);

  medicalProgramme.hidden = !labBuilt;
  if (medicalUnlocked) {
    medicalResearchStatus.textContent = t('medical.unlocked');
    medicalResearchNote.textContent = '';
    startMedicalResearchButton.hidden = true;
  } else if (medicalProject !== undefined) {
    medicalResearchStatus.textContent = t('medical.active', {
      progress: medicalProject.progress,
      required: medicalProject.requiredProgress,
    });
    medicalResearchNote.textContent = researchReady
      ? t('containment.contribution', { count: scientists })
      : '';
    startMedicalResearchButton.hidden = true;
  } else {
    medicalResearchStatus.textContent = researchReady
      ? t('medical.available')
      : t('medical.requiresTeam');
    medicalResearchNote.textContent = '';
    startMedicalResearchButton.hidden = false;
    startMedicalResearchButton.disabled =
      bankrupt || !researchReady || researchBusy ||
      state.base.credits < medicalBlueprint.researchCreditCost;
  }

  medicalRow.hidden = !medicalUnlocked;
  const medicalJob = constructionJob(state, medicalBlock.id);
  if (medicalBuilt) {
    medicalStatus.textContent = t('facility.medicalBuilt');
    medicalCost.textContent = '';
    constructMedicalButton.hidden = true;
  } else if (medicalJob !== undefined) {
    medicalStatus.textContent = t('facility.constructing', {
      progress: medicalJob.progress,
      required: medicalJob.requiredProgress,
    });
    medicalCost.textContent = '';
    constructMedicalButton.hidden = true;
  } else {
    medicalStatus.textContent =
      state.base.credits >= medicalBlock.creditCost &&
      state.base.materials >= medicalBlock.materialCost
        ? t('facility.medicalAffordable')
        : t('facility.medicalShortfall', {
            credits: Math.max(0, medicalBlock.creditCost - state.base.credits),
            materials: Math.max(0, medicalBlock.materialCost - state.base.materials),
          });
    medicalCost.textContent = t('facility.medicalCost', {
      credits: medicalBlock.creditCost,
      materials: medicalBlock.materialCost,
    });
    constructMedicalButton.hidden = false;
    constructMedicalButton.disabled =
      bankrupt || !workshopBuilt ||
      state.base.credits < medicalBlock.creditCost ||
      state.base.materials < medicalBlock.materialCost;
  }

  const medics = state.base.staff.filter(
    (member) => member.roleId === medicRole.id,
  ).length;
  medicStaffRow.hidden = !medicalBuilt;
  medicCandidates.hidden = !medicalBuilt;
  if (medicalBuilt) {
    medicCount.textContent = t('facility.medicCount', { count: medics });
    medicNote.textContent = medics > 0
      ? t('facility.medicReady')
      : t('facility.candidatesHint');
  }
}

function renderMedicalTreatment(): void {
  const state = store.getSnapshot();
  const bankrupt = isBankrupt(state.base.credits);
  const list = medicalTreatmentList;
  list.textContent = '';
  const injured = state.base.pilots.filter(
    (pilot) => state.base.pilotInjuries[pilot.id] !== undefined,
  );
  if (injured.length === 0) {
    list.append(h('p', { class: 'empty-note' }, t('medical.noInjured')));
    return;
  }
  const medicalReady = hasMedicalTreatmentCapability(state.base);
  for (const pilot of injured) {
    const injury = state.base.pilotInjuries[pilot.id];
    if (injury === undefined) {
      continue;
    }
    const pilotName = `${pilot.firstName ?? pilot.id} ${pilot.lastName ?? ''}`.trim();
    const row = h('article', { class: 'threat-row' });
    const info = h('div', null);
    info.append(
      h('strong', null, pilotName),
      h('small', null, [
        t(pilotInjurySeverityKey[injury.severity] ?? 'pilot.injuryLight'),
        t('pilot.injuryMonths', { months: Math.ceil(injury.monthsRemaining) }),
        injury.treatment === null
          ? t('pilot.awaitingTreatment')
          : t(injury.treatment === 'medical'
            ? 'pilot.inTreatmentMedical'
            : 'pilot.inTreatmentOutsource'),
      ].join(' · ')),
    );
    row.append(info);
    const actions = h('div', { class: 'pilot-card__actions' });
    if (injury.treatment === null) {
      if (medicalReady) {
        const inHouse = h(
          'button',
          { class: 'base-action is-primary', type: 'button' },
          t('pilot.treatMedical'),
        );
        inHouse.addEventListener('click', () => {
          store.dispatch({ type: 'TREAT_PILOT_MEDICAL', pilotId: pilot.id });
          showToast(t('toast.pilotInTreatment', { pilot: pilotName }));
        });
        actions.append(inHouse);
      }
      const countrySelect = document.createElement('select');
      for (const country of contentCatalog.councilStates) {
        const option = document.createElement('option');
        option.value = country.id;
        option.textContent = `${t(country.nameKey as TranslationKey)} · ` +
          formatCredits(outsourceTreatmentCost(state.base, pilot.id, country.id));
        countrySelect.appendChild(option);
      }
      const outsource = h(
        'button',
        { class: 'base-action', type: 'button' },
        t('pilot.treatOutsource'),
      );
      outsource.disabled = bankrupt;
      outsource.addEventListener('click', () => {
        store.dispatch({
          type: 'TREAT_PILOT_OUTSOURCE',
          pilotId: pilot.id,
          countryId: countrySelect.value,
        });
        showToast(t('toast.pilotInTreatment', { pilot: pilotName }));
      });
      actions.append(countrySelect, outsource);
    }
    row.append(actions);
    list.append(row);
  }
}

function designSection(
  titleKey: TranslationKey,
  ...children: readonly HTMLElement[]
): HTMLElement {
  const section = h('section', { class: 'design-system-section' });
  section.append(h('h3', { class: 'hangar-subtitle' }, t(titleKey)));
  for (const child of children) {
    section.append(child);
  }
  return section;
}

function colorSwatch(variable: string, label: string): HTMLElement {
  const chip = h('span', {
    class: 'design-swatch__chip',
    style: `background:var(${variable});border:1px solid var(--border);`,
  });
  return h('div', { class: 'design-swatch' }, chip, h('small', null, label));
}

function buttonSample(
  label: string,
  caption: string,
  attrs: { readonly class?: string; readonly disabled?: boolean } = {},
): HTMLElement {
  const button = h('button', { class: 'base-action', type: 'button', ...attrs }, label);
  return h('div', { class: 'design-button-cell' }, button, h('small', null, caption));
}

/** Static, state-independent reference of the design tokens and components. */
function renderDesignSystem(): void {
  designSystemContent.textContent = '';

  const colorPairs: ReadonlyArray<readonly [string, string]> = [
    ['--bg-0', 'bg-0'], ['--bg-1', 'bg-1'], ['--bg-2', 'bg-2'], ['--bg-3', 'bg-3'], ['--bg-4', 'bg-4'],
    ['--surface', 'surface'], ['--surface-strong', 'surface-strong'],
    ['--text-hi', 'text-hi'], ['--text', 'text'], ['--text-mid', 'text-mid'],
    ['--text-low', 'text-low'], ['--text-faint', 'text-faint'],
    ['--accent', 'accent'], ['--accent-strong', 'accent-strong'], ['--accent-dim', 'accent-dim'],
    ['--warn', 'warn'], ['--danger', 'danger'], ['--danger-strong', 'danger-strong'],
    ['--info', 'info'], ['--neutral', 'neutral'],
    ['--border-subtle', 'border-subtle'], ['--border', 'border'],
    ['--border-strong', 'border-strong'], ['--border-accent', 'border-accent'],
  ];
  const colorGrid = h('div', { class: 'design-system-grid design-system-grid--swatches' });
  for (const [variable, label] of colorPairs) {
    colorGrid.append(colorSwatch(variable, label));
  }
  designSystemContent.append(designSection('design.colors', colorGrid));

  const typeBlock = h('div', { class: 'design-system-stack' });
  typeBlock.append(
    h('div', { class: 'design-type' },
      h('strong', { style: 'font-size:var(--text-lg)' }, 'Text large · 1.05rem'),
      h('small', null, '--text-lg · UI font')),
    h('div', { class: 'design-type' },
      h('strong', { style: 'font-size:var(--text-md)' }, 'Text medium · 0.82rem'),
      h('small', null, '--text-md · UI font')),
    h('div', { class: 'design-type' },
      h('strong', { style: 'font-size:var(--text-sm)' }, 'Text small · 0.72rem'),
      h('small', null, '--text-sm · UI font')),
    h('div', { class: 'design-type' },
      h('strong', { style: 'font-family:var(--font-mono);font-size:var(--text-sm)' }, 'DATA 0.72rem · MONO'),
      h('small', null, '--font-mono · labels, numbers')),
  );
  designSystemContent.append(designSection('design.typography', typeBlock));

  const buttonsBlock = h('div', { class: 'design-system-grid design-system-grid--buttons' });
  buttonsBlock.append(
    buttonSample('DEFAULT', 'default'),
    buttonSample('HOVER', 'hover', { class: 'is-hovered' }),
    buttonSample('PRESSED', 'active', { class: 'is-pressed' }),
    buttonSample('FOCUS', 'focus', { class: 'is-focused' }),
    buttonSample('DISABLED', 'disabled', { disabled: true }),
    buttonSample('PRIMARY', 'primary · is-primary', { class: 'is-primary' }),
    buttonSample('DANGER', 'danger · is-danger', { class: 'is-danger' }),
    buttonSample('LAUNCH', 'launch-action', { class: 'launch-action' }),
  );
  const iconButton = h('button', { class: 'icon-button', type: 'button', 'aria-expanded': 'false' }, '⚙');
  buttonsBlock.append(
    h('div', { class: 'design-button-cell' }, iconButton, h('small', null, 'icon-button')),
  );
  designSystemContent.append(designSection('design.buttons', buttonsBlock));

  const chips = h('div', { class: 'design-system-grid design-system-grid--chips' });
  const chipSamples: ReadonlyArray<readonly [string, string]> = [
    ['is-active', 'ACTIVE'], ['is-fueled', 'FUELED'], ['is-unfueled', 'UNFUELED'],
    ['is-owned', 'UPGRADED'], ['is-damaged', 'DAMAGED'], ['is-injured', 'INJURED'],
    ['is-resting', 'RESTING'], ['is-top', 'TOP TIER'], ['is-memorial', 'KIA'],
  ];
  for (const [cls, text] of chipSamples) {
    chips.append(h('em', { class: `status-chip ${cls}` }, text));
  }
  designSystemContent.append(designSection('design.chips', chips));

  const tabs = h('div', { class: 'base-navigation design-nav', role: 'tablist' });
  const tabSamples: ReadonlyArray<readonly [string, string, boolean]> = [
    ['command', 'COMMAND', true],
    ['research', 'RESEARCH', false],
    ['engineering', 'ENGINEERING', false],
    ['hangar', 'HANGAR', false],
    ['trade', 'TRADE', false],
    ['databank', 'DATABANK', false],
  ];
  for (const [section, label, selected] of tabSamples) {
    tabs.append(h('button', {
      type: 'button',
      role: 'tab',
      'data-base-section': section,
      'data-nav-glyph': section,
      'aria-selected': selected ? 'true' : 'false',
    }, label));
  }
  designSystemContent.append(designSection('design.tabs', tabs));

  const panels = h('div', { class: 'design-system-grid design-system-grid--panels' });
  const labSample = h('section', { class: 'technology-lab design-panel-sample' },
    h('p', { class: 'technology-lab__eyebrow' }, 'TECHNOLOGY LAB'),
    h('h2', null, 'Panel heading'),
    h('p', { class: 'lede' }, 'Section lede copy sits here as muted supporting text.'),
    h('p', { class: 'technology-lab__status' }, 'status line · uppercase mono'),
  );
  const facilitySample = h('section', { class: 'facility-panel design-panel-sample' },
    h('p', { class: 'technology-lab__eyebrow' }, 'FACILITY PANEL'),
    h('div', { class: 'facility-row' },
      h('div', null,
        h('span', { class: 'loadout-row__label' }, 'LABEL'),
        h('strong', null, 'Facility title'),
        h('small', null, 'Supporting caption under the title.')),
      h('button', { class: 'base-action is-primary', type: 'button' }, 'ACTION')),
  );
  panels.append(labSample, facilitySample);
  designSystemContent.append(designSection('design.panels', panels));

  const cardSamples = h('div', { class: 'research-card-grid design-card-band' },
    h('article', { class: 'research-card is-done' },
      h('span', { class: 'research-card__domain' }, 'EARTH'),
      h('strong', null, 'Done card'),
      h('span', { class: 'research-card__status' }, 'COMPLETE')),
    h('article', { class: 'research-card is-active' },
      h('span', { class: 'research-card__domain' }, 'EARTH'),
      h('strong', null, 'Active card'),
      h('span', { class: 'research-card__status' }, 'PROGRESS 2/3')),
    h('article', { class: 'research-card is-locked' },
      h('span', { class: 'research-card__domain' }, 'EARTH'),
      h('strong', null, 'Locked card'),
      h('span', { class: 'research-card__status' }, 'LOCKED')),
    h('article', { class: 'research-card is-alien is-locked' },
      h('span', { class: 'research-card__domain' }, 'ALIEN'),
      h('strong', null, 'Alien card'),
      h('span', { class: 'research-card__status' }, 'QUARANTINED')),
  );
  designSystemContent.append(designSection('design.cards', cardSamples));

  const forms = h('div', { class: 'design-system-grid design-system-grid--forms' });
  const select = document.createElement('select');
  select.className = 'design-select';
  const ukOption = document.createElement('option');
  ukOption.value = 'uk';
  ukOption.textContent = 'Українська';
  const enOption = document.createElement('option');
  enOption.value = 'en';
  enOption.textContent = 'English';
  select.append(ukOption, enOption);
  const checkbox = h('label', { class: 'settings-option design-check' },
    h('span', null, 'Checkbox option'),
    h('input', { type: 'checkbox' }),
  );
  forms.append(
    h('div', { class: 'design-form-cell' }, h('label', null, 'Select label'), select),
    h('div', { class: 'design-form-cell' }, checkbox),
  );
  designSystemContent.append(designSection('design.forms', forms));

  const toast = h('div', { class: 'toast' }, '+80 000 cr · 4 materials');
  designSystemContent.append(designSection('design.toast', toast));
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
  setText('base-tab-finance', 'baseNav.finance');
  setText('base-tab-databank', 'baseNav.databank');
  setText('base-tab-staff', 'baseNav.staff');
  setText('base-tab-medical', 'baseNav.medical');
  setText('base-tab-warehouse', 'baseNav.warehouse');
  setText('finance-section-eyebrow', 'finance.eyebrow');
  setText('finance-section-title', 'finance.heading');
  setText('finance-section-lede', 'finance.lede');
  setText('databank-section-eyebrow', 'databank.eyebrow');
  setText('databank-section-title', 'databank.title');
  setText('databank-section-lede', 'databank.lede');
  setText('settings-title', 'settings.title');
  setText('language-label', 'settings.language');
  setText('debug-label', 'settings.debug');
  setText('theme-label', 'settings.theme');
  setText('design-system-open', 'settings.designSystem');
  setText('design-system-eyebrow', 'design.eyebrow');
  setText('design-system-title', 'design.title');
  setText('design-system-lede', 'design.lede');
  designSystemCloseButton.setAttribute('aria-label', t('design.close'));
  designSystemCloseButton.textContent = '✕';
  setText('theme-option-industrial', 'theme.industrial');
  setText('theme-option-terminal', 'theme.terminal');
  setText('restart-mission', 'settings.restart');
  setText('locale-option-uk', 'locale.uk');
  setText('locale-option-en', 'locale.en');
  setText('locale-option-zh', 'locale.zh');
  setText('save-schema-label', 'base.saveSchema');
  setText('credit-label', 'base.credits');
  setText('hud-month-label', 'hud.monthLabel');
  setText('material-label', 'base.materials');
  setText('research-label', 'base.research');
  setText('prototype-status', 'base.prototype');
  setText('insolvency-label', 'insolvency.label');
  setText('insolvency-title', 'insolvency.title');
  setText('insolvency-detail', 'insolvency.detail');
  setText('restart-programme', 'insolvency.restart');
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
  setText('hangar-pilots-eyebrow', 'hangar.pilotsEyebrow');
  setText('hangar-pilots-title', 'hangar.pilotsTitle');
  setText('hangar-pilots-lede', 'hangar.pilotsLede');
  setText('trade-section-eyebrow', 'trade.eyebrow');
  setText('trade-section-title', 'trade.title');
  setText('trade-section-lede', 'trade.lede');
  setText('hangar-loadout-eyebrow', 'hangar.loadoutEyebrow');
  setText('hangar-loadout-title', 'hangar.loadoutTitle');
  setText('hangar-fleet-eyebrow', 'hangar.fleetEyebrow');
  setText('hangar-fleet-title', 'hangar.fleetTitle');
  setText('hangar-fleet-lede', 'hangar.fleetLede');
  setText('hangar-fleet-subtitle', 'hangar.fleetSubtitle');
  setText('hangar-slot-label', 'hangar.slotLabel');
  setText('hangar-slot-note', 'hangar.slotNote');
  setText('command-section-eyebrow', 'command.eyebrow');
  setText('command-section-title', 'command.title');
  setText('command-section-lede', 'command.lede');
  setText('command-month-title', 'command.monthTitle');
  setText('command-credit-eyebrow', 'credit.eyebrow');
  setText('command-credit-title', 'credit.title');
  setText('command-credit-lede', 'credit.lede');
  setText('aircraft-production-title', 'engineering.aircraftProductionTitle');
  setText('aircraft-upgrade-research-title', 'research.aircraftUpgradeTitle');
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
  setText('medical-label', 'facility.medical');
  setText('medical-treatment-title', 'medical.treatmentTitle');
  setText('trade-centre-label', 'facility.tradeCentre');
  setText('construct-trade-centre', 'facility.constructTradeCentre');
  setText('staff-section-eyebrow', 'staff.eyebrow');
  setText('staff-section-title', 'staff.title');
  setText('staff-section-lede', 'staff.lede');
  setText('medical-section-eyebrow', 'medical.sectionEyebrow');
  setText('medical-section-title', 'medical.sectionTitle');
  setText('medical-section-lede', 'medical.sectionLede');
  setText('warehouse-section-eyebrow', 'warehouse.eyebrow');
  setText('warehouse-section-title', 'warehouse.title');
  setText('warehouse-section-lede', 'warehouse.lede');
  setText('sortie-picker-eyebrow', 'sortiePicker.eyebrow');
  setText('sortie-picker-title', 'sortiePicker.title');
  setText('construct-medical', 'facility.constructMedical');
  setText('medical-eyebrow', 'medical.eyebrow');
  setText('medical-title', 'medical.title');
  setText('start-medical-research', 'medical.start');
  setText('medics-label', 'facility.medics');
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

researchTechnologyButton.addEventListener('click', () => {
  store.dispatch({ type: 'RESEARCH_TECHNOLOGY', technologyId: prism.id });
  showToast(t('toast.researchStarted'));
});

manufactureAcceleratorButton.addEventListener('click', () => {
  store.dispatch({
    type: 'MANUFACTURE_PRIMARY_WEAPON',
    blueprintId: acceleratorBlueprint.id,
    quantity: readProductionQuantity(productionQtyAccelerator),
  });
  showToast(t('toast.productionStarted'));
});

productionQtyAccelerator.addEventListener('change', () => renderBase());
productionQtyCanister.addEventListener('change', () => renderBase());
productionQtyAlienEmitter.addEventListener('change', () => renderBase());

researchMachineUpgradeButton.addEventListener('click', () => {
  store.dispatch({ type: 'RESEARCH_WEAPON_UPGRADE', upgradeId: machineGunUpgrade.id });
  showToast(t('toast.researchStarted'));
});

researchAcceleratorUpgradeButton.addEventListener('click', () => {
  store.dispatch({ type: 'RESEARCH_WEAPON_UPGRADE', upgradeId: acceleratorUpgrade.id });
  showToast(t('toast.researchStarted'));
});

manufactureMachineUpgradeButton.addEventListener('click', () => {
  store.dispatch({ type: 'MANUFACTURE_WEAPON_UPGRADE', upgradeId: machineGunUpgrade.id });
  showToast(t('toast.productionStarted'));
});

manufactureAcceleratorUpgradeButton.addEventListener('click', () => {
  store.dispatch({ type: 'MANUFACTURE_WEAPON_UPGRADE', upgradeId: acceleratorUpgrade.id });
  showToast(t('toast.productionStarted'));
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
  showToast(t('toast.constructionStarted'));
});

constructWorkshopButton.addEventListener('click', () => {
  store.dispatch({ type: 'CONSTRUCT_BUILDING', buildingId: workshop.id });
  showToast(t('toast.constructionStarted'));
});

startBlueprintResearchButton.addEventListener('click', () => {
  store.dispatch({
    type: 'START_BLUEPRINT_RESEARCH',
    blueprintId: capturerBlueprint.id,
  });
  showToast(t('toast.researchStarted'));
});

startContainmentResearchButton.addEventListener('click', () => {
  store.dispatch({
    type: 'START_BUILDING_BLUEPRINT_RESEARCH',
    blueprintId: containmentBlueprint.id,
  });
  showToast(t('toast.researchStarted'));
});

constructQuarantineButton.addEventListener('click', () => {
  store.dispatch({ type: 'CONSTRUCT_BUILDING', buildingId: quarantine.id });
  showToast(t('toast.constructionStarted'));
});

constructTradeCentreButton.addEventListener('click', () => {
  if (tradeCentreBuilding !== undefined) {
    store.dispatch({ type: 'CONSTRUCT_BUILDING', buildingId: tradeCentreBuilding.id });
    showToast(t('toast.constructionStarted'));
  }
});

startMedicalResearchButton.addEventListener('click', () => {
  store.dispatch({
    type: 'START_BUILDING_BLUEPRINT_RESEARCH',
    blueprintId: medicalBlueprint.id,
  });
  showToast(t('toast.researchStarted'));
});

constructMedicalButton.addEventListener('click', () => {
  store.dispatch({ type: 'CONSTRUCT_BUILDING', buildingId: medicalBlock.id });
  showToast(t('toast.constructionStarted'));
});

manufactureAlienEmitterButton.addEventListener('click', () => {
  store.dispatch({
    type: 'MANUFACTURE_ADAPTED_WEAPON',
    blueprintId: adaptedBlueprint.id,
    quantity: readProductionQuantity(productionQtyAlienEmitter),
  });
  showToast(t('toast.productionStarted'));
});

researchCanisterButton.addEventListener('click', () => {
  store.dispatch({
    type: 'START_RESEARCH_WEAPON_BLUEPRINT',
    blueprintId: canisterBlueprint.id,
  });
  showToast(t('toast.researchStarted'));
});

manufactureCanisterButton.addEventListener('click', () => {
  store.dispatch({
    type: 'MANUFACTURE_RESEARCH_WEAPON',
    blueprintId: canisterBlueprint.id,
    quantity: readProductionQuantity(productionQtyCanister),
  });
  showToast(t('toast.productionStarted'));
});

manufactureCapturerButton.addEventListener('click', () => {
  store.dispatch({
    type: 'MANUFACTURE_EQUIPMENT',
    equipmentId: capturerEquipment.id,
  });
  showToast(t('toast.productionStarted'));
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

designSystemOpenButton.addEventListener('click', () => {
  settingsMenu.hidden = true;
  settingsToggle.setAttribute('aria-expanded', 'false');
  renderDesignSystem();
  designSystemOverlay.hidden = false;
});

designSystemCloseButton.addEventListener('click', () => {
  designSystemOverlay.hidden = true;
});

byId<HTMLButtonElement>('sortie-picker-close').addEventListener('click', () => {
  sortiePickerOverlay.hidden = true;
});

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !designSystemOverlay.hidden) {
    designSystemOverlay.hidden = true;
  }
  if (event.key === 'Escape' && !sortiePickerOverlay.hidden) {
    sortiePickerOverlay.hidden = true;
  }
});

function launchSortie(): void {
  settingsMenu.hidden = true;
  settingsToggle.setAttribute('aria-expanded', 'false');
  lastRunResult = null;
  lastSettlementSummary = null;
  lastThanksLine = null;
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
        store.dispatch({
          type: 'SETTLE_SORTIE',
          outcome: result.outcome,
          armourLostRatio: result.armourLostRatio,
        });
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
        toastSettlementCompletions(beforeSettlement, afterSettlement);
        const giftedNation = contentCatalog.councilStates.find(
          (state) =>
            afterSettlement.base.nationThanks[state.id] === true &&
            beforeSettlement.base.nationThanks[state.id] !== true,
        );
        if (giftedNation !== undefined) {
          const gift = (contentCatalog.nationGifts as Readonly<
            Record<string, { readonly credits: number; readonly materials: number }>
          >)[giftedNation.id];
          lastThanksLine = t('report.nationThanks', {
            country: t(giftedNation.nameKey as TranslationKey),
            credits: gift?.credits ?? 0,
            materials: gift?.materials ?? 0,
          });
        } else {
          lastThanksLine = null;
        }
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
        const pilot = pilotAircraftMultipliers(snapshot.base);
        const upgraded = definition === undefined
          ? undefined
          : applyAircraftUpgrades(
              definition,
              snapshot.base.manufacturedAircraftUpgradeIds,
              contentCatalog.aircraftUpgrades,
            );
        return upgraded === undefined
          ? {
              armour: 100,
              speedMultiplier: 1,
              damageMultiplier: 1,
              fireRateMultiplier: 1,
              projectileSpeedMultiplier: 1,
            }
          : {
              armour: Math.max(1, Math.round(upgraded.armour * (1 - damage))),
              speedMultiplier: upgraded.speedMultiplier * pilot.speedMultiplier,
              damageMultiplier: upgraded.damageMultiplier * pilot.damageMultiplier,
              fireRateMultiplier: upgraded.fireRateMultiplier,
              projectileSpeedMultiplier: upgraded.projectileSpeedMultiplier,
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
      () =>
        store.getSnapshot().base.threatMap.find(
          (mission) => mission.id === store.getSnapshot().base.activeMissionId,
        )?.threatLevel ?? 1,
    );
  } else {
    game.scene.getScene('combat').scene.restart();
  }
}

launchSortieButton.addEventListener('click', launchSortie);

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

const debugToggle = byId<HTMLInputElement>('debug-toggle');
debugToggle.checked = isDebugEnabled(window.localStorage);
debugToggle.addEventListener('change', () => {
  setDebugEnabled(window.localStorage, debugToggle.checked);
  showToast(t(debugToggle.checked ? 'toast.debugEnabled' : 'toast.debugDisabled'));
});

const THEME_STORAGE_KEY = 'shmup.theme';
type ThemeName = 'industrial' | 'terminal';

function applyTheme(theme: ThemeName): void {
  document.documentElement.dataset.theme = theme;
  window.localStorage.setItem(THEME_STORAGE_KEY, theme);
}

const themeSelect = byId<HTMLSelectElement>('theme-select');
const storedTheme: ThemeName =
  window.localStorage.getItem(THEME_STORAGE_KEY) === 'terminal' ? 'terminal' : 'industrial';
themeSelect.value = storedTheme;
applyTheme(storedTheme);
themeSelect.addEventListener('change', () => {
  applyTheme(themeSelect.value === 'terminal' ? 'terminal' : 'industrial');
});

let endMonthArmed = false;
let endMonthTimer: number | null = null;

function disarmEndMonth(): void {
  endMonthArmed = false;
  if (endMonthTimer !== null) {
    window.clearTimeout(endMonthTimer);
    endMonthTimer = null;
  }
  endMonthButton.textContent = t('command.endMonth');
}

endMonthButton.addEventListener('click', () => {
  const unresolved = store.getSnapshot().base.threatMap.filter(
    (mission) => !store.getSnapshot().base.resolvedThreatIds.includes(mission.id),
  ).length;
  if (unresolved > 0 && !endMonthArmed) {
    endMonthArmed = true;
    endMonthButton.textContent = t('command.confirmEndMonth', { count: unresolved });
    if (endMonthTimer !== null) {
      window.clearTimeout(endMonthTimer);
    }
    endMonthTimer = window.setTimeout(disarmEndMonth, 5000);
    return;
  }
  disarmEndMonth();
  store.dispatch({ type: 'END_MONTH' });
});
monthReportContinue.addEventListener('click', () => {
  store.dispatch({ type: 'DISMISS_MONTH_REPORT' });
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
  const acceleratorLocallyProduced = state.base.locallyProducedWeaponIds.includes(
    impulseAccelerator.id,
  );

  interface ResearchCard {
    readonly title: string;
    readonly domain: 'earth' | 'alien';
    readonly status: 'done' | 'active' | 'locked';
    readonly requirements: string;
    readonly progress: string;
    readonly outcome: string;
    readonly visible?: boolean;
  }
  const cards: ResearchCard[] = [];

  const pushBlueprint = (
    blueprintId: string,
    title: string,
    domain: 'earth' | 'alien',
    requirements: string,
    outcome: string,
    visible = true,
  ): void => {
    const done = state.base.unlockedBlueprintIds.includes(blueprintId);
    const project = state.base.researchQueue.find((entry) => entry.blueprintId === blueprintId);
    const status = done ? 'done' : project !== undefined ? 'active' : 'locked';
    const progress = project === undefined
      ? ''
      : t('research.cardProgress', { progress: project.progress, required: project.requiredProgress });
    cards.push({ title, domain, status, requirements, progress, outcome, visible });
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
    hasSample,
  );
  pushBlueprint(
    medicalBlueprint.id,
    t('medical.title'),
    'earth',
    labBuilt && hasScientist ? t('research.cardReady') : t('research.cardRequiresLab'),
    t('facility.medical'),
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
    hasSample,
  );

  for (const upgrade of contentCatalog.weaponUpgrades) {
    const researched = state.base.researchedWeaponUpgradeIds.includes(upgrade.id);
    const manufactured = state.base.manufacturedWeaponUpgradeIds.includes(upgrade.id);
    const title = upgrade.id.includes('machine')
      ? t('upgrade.machineName')
      : t('upgrade.acceleratorName');
    const visible = upgrade.id.includes('machine') || acceleratorLocallyProduced;
    cards.push({
      title,
      domain: 'earth',
      status: manufactured ? 'done' : researched ? 'active' : 'locked',
      requirements: t('upgrade.requiresCentre'),
      progress: researched ? t('research.cardAwaitingProduction') : '',
      outcome: t('upgrade.researchCost', { credits: upgrade.researchCreditCost }),
      visible,
    });
  }

  for (const card of cards) {
    if (card.visible === false) {
      continue;
    }
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
