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
  offerTechnology,
  toSortieOutcome,
} from '../../src/domain/risk-extraction';
import { settleSortie } from '../../src/domain/sortie';
import { createInitialGameState } from '../../src/domain/initial-state';

const technology = contentCatalog.alienTechnologies[0];
const elite = contentCatalog.enemies[2];

function reachTechnologyChoice() {
  return offerTechnology(addMaterials(createRiskExtractionState(), 7));
}

describe('M2 risk and extraction flow', () => {
  it('installs the artefact without granting research', () => {
    const state = decideTechnology(reachTechnologyChoice(), technology, 'install');

    expect(state.installedTechnologyIds).toEqual([technology.id]);
    expect(state.preservedTechnologyIds).toEqual([]);
    expect(state.researchFound).toBe(0);
    expect(state.phase).toBe('combat-after-technology');
  });

  it('preserves the artefact as research without installing it', () => {
    const state = decideTechnology(reachTechnologyChoice(), technology, 'preserve');

    expect(state.installedTechnologyIds).toEqual([]);
    expect(state.preservedTechnologyIds).toEqual([technology.id]);
    expect(state.researchFound).toBe(technology.preservationResearch);
  });

  it('extracts safely with the complete recovered haul', () => {
    const technologyState = decideTechnology(reachTechnologyChoice(), technology, 'preserve');
    const complete = decideExtraction(offerExtraction(technologyState), 'extract');
    const outcome = toSortieOutcome(complete);

    expect(outcome).toEqual({
      extracted: true,
      materialsFound: 7,
      researchFound: technology.preservationResearch,
    });
  });

  it('makes the elite reward available only after choosing to continue', () => {
    const technologyState = decideTechnology(reachTechnologyChoice(), technology, 'install');
    const eliteState = decideExtraction(offerExtraction(technologyState), 'continue');
    const complete = defeatElite(eliteState, elite.materialReward);

    expect(complete.eliteDefeated).toBe(true);
    expect(complete.materialsFound).toBe(7 + elite.materialReward);
    expect(toSortieOutcome(complete).extracted).toBe(true);
  });

  it('applies partial loss to both salvage and preserved research after failure', () => {
    const technologyState = decideTechnology(reachTechnologyChoice(), technology, 'preserve');
    const failed = failRun(technologyState);
    const base = settleSortie(createInitialGameState().base, toSortieOutcome(failed));

    expect(base.materials).toBe(3);
    expect(base.research).toBe(Math.floor(technology.preservationResearch / 2));
  });

  it('rejects decisions outside their valid phase', () => {
    expect(() => decideTechnology(createRiskExtractionState(), technology, 'install')).toThrow(
      'Expected run phase technology-choice',
    );
  });
});
