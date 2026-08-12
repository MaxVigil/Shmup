import { createGameStore } from '../app/store';
import { contentCatalog } from '../content/catalog';
import { validateContentCatalog } from '../content/validate';
import { createGame } from '../game/create-game';
import { CombatScene, type CombatRunResult } from '../game/scenes/CombatScene';
import type { TranslationKey } from '../i18n';
import { loadGame, saveGame } from '../persistence/save-repository';
import type { GameState } from '../domain/model';
import { isBankrupt } from '../domain/operational-economy';
import { marketWeaponPrice } from '../domain/terrestrial-market';
import { marketBlueprintPrice } from '../domain/terrestrial-market';
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
let activeBaseSection: BaseSection = 'overview';
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
  return value === 'overview' || value === 'research' ||
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
  marketBlueprintOffer.hidden = !blueprintOfferAvailable;
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
  launchSortieButton.disabled = bankrupt;
  renderContainment();
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
  setText('base-tab-overview', 'baseNav.overview');
  setText('base-tab-research', 'baseNav.research');
  setText('base-tab-engineering', 'baseNav.engineering');
  setText('base-tab-hangar', 'baseNav.hangar');
  setText('settings-title', 'settings.title');
  setText('language-label', 'settings.language');
  setText('locale-option-uk', 'locale.uk');
  setText('locale-option-en', 'locale.en');
  setText('base-eyebrow', 'base.eyebrow');
  setText('base-title', 'base.title');
  setText('base-lede', 'base.lede');
  setText('mandate-label', 'mandate.label');
  setText('mandate-copy', 'mandate.copy');
  setText('mandate-terms', 'mandate.terms', {
    multiplier: contentCatalog.economy.missedEnemyPenaltyMultiplier,
  });
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
  showBaseSection('overview');
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
  showBaseSection('overview');
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
  if (nextLocale !== 'uk' && nextLocale !== 'en') {
    return;
  }
  setLocale(nextLocale);
  renderLocale();
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
