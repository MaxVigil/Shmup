import type { AlienTechnologyDefinition } from '../content/model';
import type { SortieOutcome } from './model';

export type TechnologyDecision = 'install' | 'preserve';
export type ExtractionDecision = 'extract' | 'continue';
export type RiskExtractionPhase =
  | 'combat'
  | 'extraction-choice'
  | 'elite'
  | 'technology-choice'
  | 'complete';

export interface RiskExtractionState {
  readonly phase: RiskExtractionPhase;
  readonly technologyDecision: TechnologyDecision | null;
  readonly extractionDecision: ExtractionDecision | null;
  readonly installedTechnologyIds: readonly string[];
  readonly preservedTechnologyIds: readonly string[];
  readonly materialsFound: number;
  readonly researchFound: number;
  readonly eliteDefeated: boolean;
  readonly extracted: boolean | null;
}

export function createRiskExtractionState(): RiskExtractionState {
  return {
    phase: 'combat',
    technologyDecision: null,
    extractionDecision: null,
    installedTechnologyIds: [],
    preservedTechnologyIds: [],
    materialsFound: 0,
    researchFound: 0,
    eliteDefeated: false,
    extracted: null,
  };
}

function assertPhase(state: RiskExtractionState, expected: RiskExtractionPhase): void {
  if (state.phase !== expected) {
    throw new Error(`Expected run phase ${expected}, received ${state.phase}.`);
  }
}

export function decideTechnology(
  state: RiskExtractionState,
  technology: AlienTechnologyDefinition,
  decision: TechnologyDecision,
): RiskExtractionState {
  assertPhase(state, 'technology-choice');

  return {
    ...state,
    phase: 'complete',
    technologyDecision: decision,
    installedTechnologyIds: decision === 'install' ? [technology.id] : [],
    preservedTechnologyIds: decision === 'preserve' ? [technology.id] : [],
    researchFound: decision === 'preserve'
      ? state.researchFound + technology.preservationResearch
      : state.researchFound,
    extracted: true,
  };
}

export function addMaterials(
  state: RiskExtractionState,
  amount: number,
): RiskExtractionState {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new RangeError('Recovered materials must be a finite, non-negative number.');
  }
  if (state.phase === 'complete') {
    throw new Error('A completed run cannot receive more materials.');
  }
  return { ...state, materialsFound: state.materialsFound + amount };
}

export function offerExtraction(state: RiskExtractionState): RiskExtractionState {
  assertPhase(state, 'combat');
  return { ...state, phase: 'extraction-choice' };
}

export function decideExtraction(
  state: RiskExtractionState,
  decision: ExtractionDecision,
): RiskExtractionState {
  assertPhase(state, 'extraction-choice');
  if (decision === 'extract') {
    return {
      ...state,
      phase: 'complete',
      extractionDecision: decision,
      extracted: true,
    };
  }
  return {
    ...state,
    phase: 'elite',
    extractionDecision: decision,
  };
}

export function defeatElite(
  state: RiskExtractionState,
  materialReward: number,
): RiskExtractionState {
  assertPhase(state, 'elite');
  const rewarded = addMaterials(state, materialReward);
  return {
    ...rewarded,
    phase: 'technology-choice',
    eliteDefeated: true,
  };
}

export function forceExtraction(state: RiskExtractionState): RiskExtractionState {
  assertPhase(state, 'elite');
  return { ...state, phase: 'complete', extracted: true };
}

export function failRun(state: RiskExtractionState): RiskExtractionState {
  if (state.phase === 'complete') {
    throw new Error('A completed run cannot fail again.');
  }
  return { ...state, phase: 'complete', extracted: false };
}

export function toSortieOutcome(state: RiskExtractionState): SortieOutcome {
  assertPhase(state, 'complete');
  if (state.extracted === null) {
    throw new Error('A completed run must record whether it extracted.');
  }
  return {
    extracted: state.extracted,
    materialsFound: state.materialsFound,
    researchFound: state.researchFound,
  };
}
