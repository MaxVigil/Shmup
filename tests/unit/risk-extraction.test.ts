import { describe, expect, it } from 'vitest';
import { contentCatalog } from '../../src/content/catalog';
import {
  addMaterials,
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
  return defeatElite(eliteState, elite.materialReward);
}

describe('M2 risk and extraction flow', () => {
  it('installs the artefact without granting research', () => {
    const state = decideTechnology(recoverArtefact(), technology, 'install');

    expect(state.installedTechnologyIds).toEqual([technology.id]);
    expect(state.preservedTechnologyIds).toEqual([]);
    expect(state.researchFound).toBe(0);
    expect(state.phase).toBe('complete');
    expect(state.extracted).toBe(true);
  });

  it('preserves the artefact as research without installing it', () => {
    const state = decideTechnology(recoverArtefact(), technology, 'preserve');

    expect(state.installedTechnologyIds).toEqual([]);
    expect(state.preservedTechnologyIds).toEqual([technology.id]);
    expect(state.researchFound).toBe(technology.preservationResearch);
  });

  it('extracts safely without receiving an artefact', () => {
    const complete = decideExtraction(reachExtractionChoice(), 'extract');
    const outcome = toSortieOutcome(complete);

    expect(outcome).toEqual({
      extracted: true,
      materialsFound: 7,
      researchFound: 0,
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

  it('applies partial loss to salvage when the ship is lost during the intercept', () => {
    const eliteState = decideExtraction(reachExtractionChoice(), 'continue');
    const failed = failRun(eliteState);
    const base = settleSortie(createInitialGameState().base, toSortieOutcome(failed));

    expect(base.materials).toBe(3);
    expect(base.research).toBe(0);
  });

  it('rejects decisions outside their valid phase', () => {
    expect(() => decideTechnology(createRiskExtractionState(), technology, 'install')).toThrow(
      'Expected run phase technology-choice',
    );
  });
});
