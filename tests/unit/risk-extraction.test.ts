import { describe, expect, it } from 'vitest';
import { contentCatalog } from '../../src/content/catalog';
import {
  addMaterials,
  completeEscape,
  createRiskExtractionState,
  decideExtraction,
  decideTechnology,
  defeatElite,
  failRun,
  offerExtraction,
  toSortieOutcome,
} from '../../src/domain/risk-extraction';
import { settleSortie } from '../../src/domain/sortie';
import { createInitialGameState } from '../../src/domain/initial-state';

const technology = contentCatalog.alienTechnologies[0];
const elite = contentCatalog.enemies[2];

function reachExtractionChoice() {
  return offerExtraction(addMaterials(createRiskExtractionState(), 7));
}

function recoverArtefact() {
  const eliteState = decideExtraction(reachExtractionChoice(), 'continue');
  return defeatElite(eliteState, elite.materialReward, true);
}

describe('M2 risk and extraction flow', () => {
  it('installs the artefact and begins the escape without granting research', () => {
    const state = decideTechnology(recoverArtefact(), technology, 'install');

    expect(state.installedTechnologyIds).toEqual([technology.id]);
    expect(state.preservedTechnologyIds).toEqual([]);
    expect(state.researchFound).toBe(0);
    expect(state.phase).toBe('escape');
    expect(state.extracted).toBeNull();
  });

  it('preserves the artefact as research cargo and begins the escape', () => {
    const state = decideTechnology(recoverArtefact(), technology, 'preserve');

    expect(state.installedTechnologyIds).toEqual([]);
    expect(state.preservedTechnologyIds).toEqual([technology.id]);
    expect(state.researchFound).toBe(0);
    expect(state.phase).toBe('escape');
    expect(state.extracted).toBeNull();
  });

  it('secures the chosen artefact disposition only after the escape', () => {
    const escaped = completeEscape(decideTechnology(recoverArtefact(), technology, 'install'));

    expect(escaped.phase).toBe('complete');
    expect(escaped.extracted).toBe(true);
  });

  it('delivers the preserved artefact identity after a successful escape', () => {
    const escaped = completeEscape(decideTechnology(recoverArtefact(), technology, 'preserve'));

    expect(toSortieOutcome(escaped).preservedTechnologyIds).toEqual([technology.id]);
  });

  it('extracts safely without receiving an artefact', () => {
    const complete = decideExtraction(reachExtractionChoice(), 'extract');
    const outcome = toSortieOutcome(complete);

    expect(outcome).toEqual({
      extracted: true,
      materialsFound: 7,
      researchFound: 0,
      preservedTechnologyIds: [],
      targetsDestroyed: 0,
      targetsBreached: 0,
      creditsEarned: 0,
      creditsPenalized: 0,
      wardenSignalDetected: false,
    });
    expect(complete.technologyDecision).toBeNull();
  });

  it('makes the artefact choice available only after the elite is defeated', () => {
    const recovered = recoverArtefact();

    expect(recovered.phase).toBe('technology-choice');
    expect(recovered.eliteDefeated).toBe(true);
    expect(recovered.materialsFound).toBe(7 + elite.materialReward);
    expect(() => toSortieOutcome(recovered)).toThrow(
      'Expected run phase complete',
    );
  });

  it('finishes the intercept without an artefact when no Capturer is equipped', () => {
    const eliteState = decideExtraction(reachExtractionChoice(), 'continue');
    const defeated = defeatElite(eliteState, elite.materialReward, false);

    expect(defeated.phase).toBe('complete');
    expect(defeated.eliteDefeated).toBe(true);
    expect(defeated.technologyDecision).toBeNull();
    expect(toSortieOutcome(defeated).preservedTechnologyIds).toEqual([]);
  });

  it('applies partial loss to salvage when the ship is lost during the intercept', () => {
    const eliteState = decideExtraction(reachExtractionChoice(), 'continue');
    const failed = failRun(eliteState);
    const base = settleSortie(createInitialGameState().base, toSortieOutcome(failed));

    expect(base.materials).toBe(3);
    expect(base.research).toBe(0);
  });

  it('loses the preserved artefact entirely during a failed escape', () => {
    const escape = decideTechnology(recoverArtefact(), technology, 'preserve');
    const failed = failRun(escape);
    const outcome = toSortieOutcome(failed);
    const base = settleSortie(createInitialGameState().base, outcome);

    expect(base.materials).toBe(Math.floor((7 + elite.materialReward) * 0.5));
    expect(base.research).toBe(0);
    expect(outcome.preservedTechnologyIds).toEqual([]);
    expect(base.preservedTechnologyIds).toEqual([]);
  });

  it('applies failed-sortie salvage retention after installing during the escape', () => {
    const escape = decideTechnology(recoverArtefact(), technology, 'install');
    const failed = failRun(escape);
    const base = settleSortie(createInitialGameState().base, toSortieOutcome(failed));

    expect(failed.technologyDecision).toBe('install');
    expect(base.materials).toBe(Math.floor((7 + elite.materialReward) * 0.5));
    expect(base.research).toBe(0);
  });

  it('rejects decisions outside their valid phase', () => {
    expect(() => decideTechnology(createRiskExtractionState(), technology, 'install')).toThrow(
      'Expected run phase technology-choice',
    );
    expect(() => completeEscape(createRiskExtractionState())).toThrow(
      'Expected run phase escape',
    );
  });
});
