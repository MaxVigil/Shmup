import { createGameStore } from './app/store';
import { contentCatalog } from './content/catalog';
import { validateContentCatalog } from './content/validate';
import { createGame } from './game/create-game';
import { loadGame, saveGame } from './persistence/save-repository';
import './styles/main.css';

validateContentCatalog(contentCatalog);

const app = document.querySelector<HTMLDivElement>('#app');

if (app === null) {
  throw new Error('Application root #app was not found.');
}

const store = createGameStore(loadGame(window.localStorage) ?? undefined);
const state = store.getSnapshot();

app.innerHTML = `
  <main class="app-shell">
    <section class="mission-panel" aria-labelledby="mission-title">
      <p class="eyebrow">INTERNATIONAL RECOVERY DIRECTORATE</p>
      <h1 id="mission-title">Alien Systems Programme</h1>
      <p class="lede">
        Extract safely with the current salvage, or intercept the Warden and recover
        its unknown artefact for installation or research.
      </p>

      <dl class="status-grid">
        <div>
          <dt>Save schema</dt>
          <dd>v${state.schemaVersion}</dd>
        </div>
        <div>
          <dt>Recovered materials</dt>
          <dd id="material-total">${state.base.materials}</dd>
        </div>
        <div>
          <dt>Recovered research</dt>
          <dd id="research-total">${state.base.research}</dd>
        </div>
      </dl>

      <div class="system-check" role="status">
        <span class="system-check__light" aria-hidden="true"></span>
        M2 risk-and-extraction prototype active
      </div>
      <p class="run-report" id="run-report" aria-live="polite">
        Awaiting sortie result. Keyboard choices: I/P, then E/C.
      </p>
    </section>

    <section class="combat-frame" aria-label="Playable combat prototype">
      <div id="game-root"></div>
    </section>
  </main>
`;

const gameRoot = document.querySelector<HTMLElement>('#game-root');

if (gameRoot === null) {
  throw new Error('Game root #game-root was not found.');
}

const materialTotal = document.querySelector<HTMLElement>('#material-total');
const researchTotal = document.querySelector<HTMLElement>('#research-total');
const runReport = document.querySelector<HTMLElement>('#run-report');

store.subscribe((nextState) => {
  saveGame(window.localStorage, nextState);
  if (materialTotal !== null) {
    materialTotal.textContent = nextState.base.materials.toString();
  }
  if (researchTotal !== null) {
    researchTotal.textContent = nextState.base.research.toString();
  }
});

const game = createGame(gameRoot, (result) => {
  store.dispatch({ type: 'SETTLE_SORTIE', outcome: result.outcome });
  if (runReport !== null) {
    const retention = result.outcome.extracted ? 'full haul secured' : '50% recovery after loss';
    const technology = result.technologyDecision === 'install'
      ? 'artefact installed'
      : result.technologyDecision === 'preserve' ? 'artefact preserved' : 'artefact not recovered';
    const elite = result.eliteDefeated ? '; Warden destroyed' : '';
    runReport.textContent = `${technology}; ${retention}${elite}.`;
  }
});

window.addEventListener('beforeunload', () => {
  game.destroy(true);
});
