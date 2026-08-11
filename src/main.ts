import { createGameStore } from './app/store';
import { contentCatalog } from './content/catalog';
import { validateContentCatalog } from './content/validate';
import { createGame } from './game/create-game';
import './styles/main.css';

validateContentCatalog(contentCatalog);

const app = document.querySelector<HTMLDivElement>('#app');

if (app === null) {
  throw new Error('Application root #app was not found.');
}

const store = createGameStore();
const state = store.getSnapshot();

app.innerHTML = `
  <main class="app-shell">
    <section class="mission-panel" aria-labelledby="mission-title">
      <p class="eyebrow">INTERNATIONAL RECOVERY DIRECTORATE</p>
      <h1 id="mission-title">Alien Systems Programme</h1>
      <p class="lede">
        M1 combat telemetry is live. Move, read the incoming patterns, and let the
        pulse cannon fire automatically.
      </p>

      <dl class="status-grid">
        <div>
          <dt>Save schema</dt>
          <dd>v${state.schemaVersion}</dd>
        </div>
        <div>
          <dt>Energy capacity</dt>
          <dd>${state.base.energyCapacity}</dd>
        </div>
        <div>
          <dt>Content records</dt>
          <dd>${
            contentCatalog.weapons.length +
            contentCatalog.alienTechnologies.length +
            contentCatalog.pilots.length +
            contentCatalog.enemies.length
          }</dd>
        </div>
      </dl>

      <div class="system-check" role="status">
        <span class="system-check__light" aria-hidden="true"></span>
        M1 combat prototype active
      </div>
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

const game = createGame(gameRoot);

window.addEventListener('beforeunload', () => {
  game.destroy(true);
});
