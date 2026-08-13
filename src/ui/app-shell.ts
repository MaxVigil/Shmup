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
import { marketWeaponPrice } from '../domain/terrestrial-market';
import { marketBlueprintPrice } from '../domain/terrestrial-market';
import { HANGAR_SLOT_COST, marketAircraftPrice } from '../domain/hangar';
import { isAircraftFueled } from '../domain/command-centre';
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
import { getLocale, setLocale, t, localizedWeaponName } from './i18n';
import { buildAppTemplate } from './template';
import { resolveInitialState, temporaryPlaytestMode } from './playtest';

validateContentCatalog(contentCatalog);

const app = document.querySelector<HTMLDivElement>('#app');

if (app === null) {
  throw new Error('Application root #app was not found.');
}

const store = createGameStore(
  resolveInitialState() ?? loadGame(window.localStorage) ?? undefined,
);
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
const hardpointBlueprint = contentCatalog.blueprints[1];
const hardpointEquipment = contentCatalog.equipment[1];
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
const weaponOptions = Array.from(
  document.querySelectorAll<HTMLElement>('[data-weapon-id]'),
);
const purchaseMarketWeaponButton = byId<HTMLButtonElement>('purchase-market-weapon');
const marketOffer = byId<HTMLElement>('market-offer');
const marketOfferStatus = byId<HTMLElement>('market-offer-status');
const marketWeaponPriceText = byId<HTMLElement>('market-weapon-price');
const marketBlueprintOffer = byId<HTMLElement>('market-blueprint-offer');
const marketBlueprintStatus = byId<HTMLElement>('market-blueprint-status');
const marketBlueprintPriceText = byId<HTMLElement>('market-blueprint-price');
const purchaseMarketBlueprintButton = byId<HTMLButtonElement>('purchase-market-blueprint');
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
const hireScientistButton = byId<HTMLButtonElement>('hire-scientist');
const engineerCount = byId<HTMLElement>('engineer-count');
const engineerNote = byId<HTMLElement>('engineer-note');
const hireEngineerButton = byId<HTMLButtonElement>('hire-engineer');
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
const hardpointResearchStatus = byId<HTMLElement>('hardpoint-research-status');
const hardpointResearchNote = byId<HTMLElement>('hardpoint-research-note');
const researchHardpointButton = byId<HTMLButtonElement>('research-hardpoint');
const hardpointProductionRow = byId<HTMLElement>('hardpoint-production-row');
const hardpointProductionStatus = byId<HTMLElement>('hardpoint-production-status');
const hardpointProductionNote = byId<HTMLElement>('hardpoint-production-note');
const manufactureHardpointButton = byId<HTMLButtonElement>('manufacture-hardpoint');
const hardpointStatus = byId<HTMLElement>('hardpoint-status');
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
    value === 'engineering' || value === 'hangar';
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
  const acceleratorOwned = state.base.ownedPrimaryWeaponIds.includes(impulseAccelerator.id);
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
  scientistNote.textContent = !labBuilt
    ? t('facility.requiresLab')
    : state.base.credits < scientistRole.creditCost
      ? t('facility.needsCredits')
      : t('facility.hireCost', { credits: scientistRole.creditCost });
  hireScientistButton.disabled = bankrupt || !labBuilt || state.base.credits < scientistRole.creditCost;
  engineerCount.textContent = t('facility.engineerCount', { count: engineers });
  engineerNote.textContent = !workshopBuilt
    ? t('facility.requiresWorks')
    : engineers > 0
      ? t('facility.engineerReady')
      : state.base.credits < engineerRole.creditCost
        ? t('facility.needsCredits')
        : t('facility.hireCost', { credits: engineerRole.creditCost });
  hireEngineerButton.hidden = engineers > 0;
  hireEngineerButton.disabled = (
    bankrupt ||
    !workshopBuilt ||
    state.base.credits < engineerRole.creditCost
  );
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
  startBlueprintResearchButton.disabled = bankrupt || !researchReady;
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
  const offerPrice = marketWeaponPrice(
    impulseAccelerator,
    state.base.marketSeed,
    state.base.sortiesCompleted,
  );
  marketOffer.hidden = acceleratorOwned;
  marketWeaponPriceText.textContent = acceleratorOwned
    ? ''
    : t('market.price', { credits: offerPrice });
  marketOfferStatus.textContent = acceleratorOwned
    ? t('market.owned')
    : state.base.credits >= offerPrice
      ? t('market.available')
      : t('market.shortfall', { credits: offerPrice - state.base.credits });
  purchaseMarketWeaponButton.hidden = acceleratorOwned;
  purchaseMarketWeaponButton.disabled = bankrupt || state.base.credits < offerPrice;
  const blueprintOfferAvailable = state.base.sortiesCompleted >= acceleratorBlueprint.minimumSorties;
  const blueprintPrice = marketBlueprintPrice(
    acceleratorBlueprint,
    state.base.marketSeed,
    state.base.sortiesCompleted,
  );
  marketBlueprintOffer.hidden =
    acceleratorBlueprintOwned || !blueprintOfferAvailable;
  marketBlueprintPriceText.textContent = acceleratorBlueprintOwned
    ? ''
    : t('market.price', { credits: blueprintPrice });
  marketBlueprintStatus.textContent = acceleratorBlueprintOwned
    ? t('market.blueprintOwned')
    : state.base.credits >= blueprintPrice
      ? t('market.blueprintAvailable')
      : t('market.shortfall', { credits: blueprintPrice - state.base.credits });
  purchaseMarketBlueprintButton.hidden = acceleratorBlueprintOwned;
  purchaseMarketBlueprintButton.disabled = bankrupt || state.base.credits < blueprintPrice;
  byId<HTMLElement>('weapon-slot-1-name').textContent = localizedWeaponName(
    state.base.equippedPrimaryWeaponIds[0],
  );
  byId<HTMLElement>('weapon-slot-2-name').textContent = localizedWeaponName(
    state.base.equippedPrimaryWeaponIds[1],
  );
  for (const option of weaponOptions) {
    const weaponId = option.dataset.weaponId;
    if (weaponId === undefined) {
      continue;
    }
    const owned = state.base.ownedPrimaryWeaponIds.includes(weaponId);
    const equipped = state.base.equippedPrimaryWeaponIds.includes(weaponId);
    option.hidden = !owned;
    option.classList.toggle('is-equipped', equipped);
    for (const button of option.querySelectorAll<HTMLButtonElement>('.weapon-equip-action')) {
      const slotIndex = button.dataset.slotIndex === '1' ? 1 : 0;
      const equippedInSlot = state.base.equippedPrimaryWeaponIds[slotIndex] === weaponId;
      button.disabled = bankrupt || equippedInSlot;
      button.textContent = t(
        equippedInSlot ? 'loadout.equippedInSlot' : 'loadout.equipInSlot',
        { slot: slotIndex === 0 ? 'I' : 'II' },
      );
    }
  }
  byId<HTMLElement>('weapon-standard-role').textContent = t(
    machineUpgradeManufactured ? 'loadout.standardRoleUpgraded' : 'loadout.standardRole',
  );
  byId<HTMLElement>('weapon-accelerator-role').textContent = t(
    acceleratorUpgradeManufactured
      ? 'loadout.acceleratorRoleUpgraded'
      : 'loadout.acceleratorRole',
  );
  byId<HTMLElement>('weapon-canister-role').textContent = t('loadout.canisterRole');
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
  const fuelStatus = byId<HTMLElement>('fuel-status');
  fuelStatus.hidden = false;
  fuelStatus.classList.toggle('is-ready', activeFueled);
  fuelStatus.textContent = t(
    activeFueled ? 'hangar.preflightFuelReady' : 'hangar.preflightFuelWarning',
    { aircraft: activeAircraftName },
  );
  launchSortieButton.disabled = bankrupt || !activeFueled;
  renderContainment();
  renderCanister();
  renderHardpoint();
  renderFleet();
  renderCommand();
}

function renderHardpoint(): void {
  const state = store.getSnapshot();
  const bankrupt = isBankrupt(state.base.credits);
  const hardpointUnlocked = state.base.unlockedBlueprintIds.includes(hardpointBlueprint.id);
  const hardpointInstalled = state.base.manufacturedEquipmentIds.includes(
    hardpointEquipment.id,
  );
  const hardpointProject = state.base.researchQueue.find(
    (project) => project.blueprintId === hardpointBlueprint.id,
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

  hardpointResearchStatus.textContent = hardpointUnlocked
    ? t('research.hardpointUnlocked')
    : hardpointProject !== undefined
      ? t('research.hardpointActive', {
          progress: hardpointProject.progress,
          required: hardpointProject.requiredProgress,
        })
      : researchReady
        ? t('research.hardpointAvailable')
        : t('research.hardpointRequiresTeam');
  hardpointResearchNote.textContent = hardpointProject === undefined
    ? ''
    : t('programme.contribution', { count: scientists });
  researchHardpointButton.hidden = hardpointUnlocked || hardpointProject !== undefined;
  researchHardpointButton.disabled = bankrupt || !researchReady;

  hardpointProductionRow.hidden = !hardpointUnlocked || hardpointInstalled;
  if (hardpointUnlocked && !hardpointInstalled) {
    hardpointProductionStatus.textContent = productionReady
      ? t('production.ready')
      : t('production.requiresEngineer');
    hardpointProductionNote.textContent = t('production.cost', {
      credits: hardpointEquipment.creditCost,
      materials: hardpointEquipment.materialCost,
    });
    manufactureHardpointButton.disabled =
      bankrupt ||
      !productionReady ||
      state.base.credits < hardpointEquipment.creditCost ||
      state.base.materials < hardpointEquipment.materialCost;
  }

  hardpointStatus.hidden = false;
  hardpointStatus.textContent = t(
    hardpointInstalled ? 'hangar.hardpointInstalled' : 'hangar.hardpointMissing',
  );
  hardpointStatus.classList.toggle('is-ready', hardpointInstalled);
}

const aircraftNameKey: Readonly<Record<string, TranslationKey>> = {
  'aircraft-interceptor': 'content.interceptor',
  'aircraft-gunship': 'content.gunship',
  'aircraft-aegis': 'content.aegis',
};
const aircraftRoleKey: Readonly<Record<string, TranslationKey>> = {
  'aircraft-interceptor': 'aircraft.interceptorRole',
  'aircraft-gunship': 'aircraft.gunshipRole',
  'aircraft-aegis': 'aircraft.aegisRole',
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
        if (state.base.activeAircraftId === aircraft.id) {
          const active = document.createElement('em');
          active.className = 'status-chip is-active';
          active.textContent = t('hangar.activeAircraft');
          header.appendChild(active);
        }
        const actions = document.createElement('div');
        actions.className = 'fleet-slot__actions';
        if (!isAircraftFueled(state.base, aircraft.id)) {
          const refuel = document.createElement('button');
          refuel.className = 'base-action';
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
          activate.className = 'base-action';
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
  renderCredit();
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
  researchCanisterButton.disabled = bankrupt || !researchReady;

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
    startContainmentResearchButton.disabled = bankrupt || !researchReady;
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
  setText('market-eyebrow', 'market.eyebrow');
  setText('market-title', 'market.title');
  setText('market-intro', 'market.intro');
  setText('market-offer-label', 'market.offerLabel');
  setText('market-weapon-name', 'content.impulseAccelerator');
  setText('market-weapon-role', 'market.acceleratorRole');
  setText('purchase-market-weapon', 'market.purchase');
  setText('market-blueprint-label', 'market.blueprintLabel');
  setText('market-blueprint-name', 'market.blueprintName');
  setText('market-blueprint-role', 'market.blueprintRole');
  setText('purchase-market-blueprint', 'market.purchaseBlueprint');
  setText('hangar-section-eyebrow', 'hangar.eyebrow');
  setText('hangar-section-title', 'hangar.title');
  setText('hangar-section-lede', 'hangar.lede');
  setText('hangar-loadout-eyebrow', 'hangar.loadoutEyebrow');
  setText('hangar-loadout-title', 'hangar.loadoutTitle');
  setText('hangar-fleet-eyebrow', 'hangar.fleetEyebrow');
  setText('hangar-fleet-title', 'hangar.fleetTitle');
  setText('hangar-fleet-lede', 'hangar.fleetLede');
  setText('hangar-fleet-subtitle', 'hangar.fleetSubtitle');
  setText('hangar-market-subtitle', 'hangar.marketSubtitle');
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
  setText('hire-scientist', 'facility.hireScientist');
  setText('engineers-label', 'facility.engineers');
  setText('hire-engineer', 'facility.hireEngineer');
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
  setText('weapon-module-label', 'lab.weaponModule');
  setText('weapon-slot-1-label', 'loadout.primarySlot', { slot: 'I' });
  setText('weapon-slot-2-label', 'loadout.primarySlot', { slot: 'II' });
  setText('weapon-standard-name', 'content.standardCannon');
  setText('weapon-standard-role', 'loadout.standardRole');
  setText('weapon-accelerator-name', 'content.impulseAccelerator');
  setText('weapon-accelerator-role', 'loadout.acceleratorRole');
  setText('weapon-split-name', 'content.splitPulse');
  setText('weapon-split-role', 'loadout.splitRole');
  setText('weapon-canister-name', 'content.canisterCannon');
  setText('weapon-canister-role', 'loadout.canisterRole');
  setText('canister-research-label', 'research.canisterLabel');
  setText('research-canister', 'research.startCanister');
  setText('canister-production-label', 'production.canister');
  setText('manufacture-canister', 'production.canisterManufacture');
  setText('hardpoint-research-label', 'research.hardpointLabel');
  setText('research-hardpoint', 'research.startHardpoint');
  setText('hardpoint-production-label', 'production.hardpoint');
  setText('manufacture-hardpoint', 'production.hardpointManufacture');
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

purchaseMarketWeaponButton.addEventListener('click', () => {
  store.dispatch({
    type: 'PURCHASE_MARKET_WEAPON',
    weaponId: impulseAccelerator.id,
  });
});

purchaseMarketBlueprintButton.addEventListener('click', () => {
  store.dispatch({
    type: 'PURCHASE_MARKET_BLUEPRINT',
    blueprintId: acceleratorBlueprint.id,
  });
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

for (const option of weaponOptions) {
  for (const button of option.querySelectorAll<HTMLButtonElement>('.weapon-equip-action')) {
    button.addEventListener('click', () => {
    const weaponId = option.dataset.weaponId;
    const slotIndex = button.dataset.slotIndex === '1' ? 1 : 0;
    if (weaponId !== undefined) {
      store.dispatch({ type: 'EQUIP_PRIMARY_WEAPON', weaponId, slotIndex });
    }
    });
  }
}

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
});

hireScientistButton.addEventListener('click', () => {
  store.dispatch({ type: 'HIRE_STAFF', roleId: scientistRole.id });
});

hireEngineerButton.addEventListener('click', () => {
  store.dispatch({ type: 'HIRE_STAFF', roleId: engineerRole.id });
});

constructWorkshopButton.addEventListener('click', () => {
  store.dispatch({ type: 'CONSTRUCT_BUILDING', buildingId: workshop.id });
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

researchHardpointButton.addEventListener('click', () => {
  store.dispatch({
    type: 'START_BLUEPRINT_RESEARCH',
    blueprintId: hardpointBlueprint.id,
  });
});

manufactureHardpointButton.addEventListener('click', () => {
  store.dispatch({
    type: 'MANUFACTURE_EQUIPMENT',
    equipmentId: hardpointEquipment.id,
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
        const afterSettlement = store.getSnapshot();
        lastSettlementSummary = summarizeSortiePayoff(
          beforeSettlement,
          afterSettlement,
          capturerBlueprint.id,
          result.outcome,
        );
        renderReports();
        renderCombatWeaponControl();
      },
      () => store.getSnapshot().base.equippedPrimaryWeaponIds,
      () => store.getSnapshot().base.equippedEquipmentId,
      () => store.getSnapshot().base.credits,
      () => store.getSnapshot().base.manufacturedWeaponUpgradeIds,
      () => store.getSnapshot().base.sortiesCompleted,
      () => {
        const aircraftId = store.getSnapshot().base.activeAircraftId;
        const definition = contentCatalog.aircraft.find(
          (entry) => entry.id === aircraftId,
        );
        return definition === undefined
          ? { armour: 100, speedMultiplier: 1, damageMultiplier: 1 }
          : {
              armour: definition.armour,
              speedMultiplier: definition.speedMultiplier,
              damageMultiplier: definition.damageMultiplier,
            };
      },
      () => store.getSnapshot().base.activeAircraftId,
      () => store.getSnapshot().base.manufacturedEquipmentIds.includes(
        hardpointEquipment.id,
      ),
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
