import type { GameState } from '../domain/model';

export function buildAppTemplate(initialState: GameState): string {
  return `
  <div class="app-frame">
    <div id="playtest-badge" class="playtest-badge" role="status" hidden></div>
    <header class="top-bar">
      <div class="top-bar__brand" id="app-brand"></div>
      <div class="top-bar__route" aria-live="polite">
        <span id="route-base"></span>
        <span aria-hidden="true">/</span>
        <span id="route-sortie"></span>
      </div>
      <div class="settings">
        <button
          id="settings-toggle"
          class="icon-button"
          type="button"
          aria-expanded="false"
          aria-controls="settings-menu"
        >
          <span aria-hidden="true">⚙</span>
        </button>
        <div id="settings-menu" class="settings-menu" hidden>
          <strong id="settings-title"></strong>
          <label for="locale-select" id="language-label"></label>
          <select id="locale-select">
            <option id="locale-option-uk" value="uk"></option>
            <option id="locale-option-en" value="en"></option>
            <option id="locale-option-zh" value="zh"></option>
          </select>
          <div class="settings-option">
            <label for="debug-toggle" id="debug-label"></label>
            <input id="debug-toggle" type="checkbox" />
          </div>
          <label for="theme-select" id="theme-label"></label>
          <select id="theme-select">
            <option id="theme-option-industrial" value="industrial"></option>
            <option id="theme-option-terminal" value="terminal"></option>
          </select>
          <button id="design-system-open" class="base-action settings-design" type="button"></button>
          <div class="system-check" role="status">
            <span class="system-check__light" aria-hidden="true"></span>
            <span id="prototype-status"></span>
            <small><span id="save-schema-label"></span> v${initialState.schemaVersion}</small>
          </div>
          <button id="restart-mission" class="base-action settings-restart is-danger" type="button"></button>
        </div>
      </div>
    </header>

    <main id="base-screen" class="screen base-screen">
      <section id="insolvency-panel" class="insolvency-panel" hidden>
        <span id="insolvency-label"></span>
        <strong id="insolvency-title"></strong>
        <p id="insolvency-detail"></p>
        <button id="restart-programme" class="base-action is-danger" type="button"></button>
      </section>

      <nav id="base-navigation" class="base-navigation" role="tablist">
        <button id="base-tab-command" type="button" role="tab" data-base-section="command" data-nav-glyph="command" aria-controls="base-panel-command" aria-selected="true"></button>
        <button id="base-tab-research" type="button" role="tab" data-base-section="research" data-nav-glyph="research" aria-controls="base-panel-research" aria-selected="false"></button>
        <button id="base-tab-engineering" type="button" role="tab" data-base-section="engineering" data-nav-glyph="engineering" aria-controls="base-panel-engineering" aria-selected="false"></button>
        <button id="base-tab-hangar" type="button" role="tab" data-base-section="hangar" data-nav-glyph="hangar" aria-controls="base-panel-hangar" aria-selected="false"></button>
        <button id="base-tab-trade" type="button" role="tab" data-base-section="trade" data-nav-glyph="trade" aria-controls="base-panel-trade" aria-selected="false"></button>
        <button id="base-tab-finance" type="button" role="tab" data-base-section="finance" data-nav-glyph="finance" aria-controls="base-panel-finance" aria-selected="false"></button>
        <button id="base-tab-staff" type="button" role="tab" data-base-section="staff" data-nav-glyph="staff" aria-controls="base-panel-staff" aria-selected="false"></button>
        <button id="base-tab-medical" type="button" role="tab" data-base-section="medical" data-nav-glyph="medical" aria-controls="base-panel-medical" aria-selected="false"></button>
        <button id="base-tab-warehouse" type="button" role="tab" data-base-section="warehouse" data-nav-glyph="warehouse" aria-controls="base-panel-warehouse" aria-selected="false"></button>
        <button id="base-tab-databank" type="button" role="tab" data-base-section="databank" data-nav-glyph="databank" aria-controls="base-panel-databank" aria-selected="false"></button>
      </nav>

      <div id="global-hud" class="global-hud">
        <div class="global-hud__month"><span id="hud-month-label"></span><strong id="hud-month"></strong></div>
        <div class="global-hud__resources">
          <div><span id="credit-label"></span><strong id="credit-total"></strong></div>
          <div><span id="material-label"></span><strong id="material-total"></strong></div>
          <div><span id="research-label"></span><strong id="research-total"></strong></div>
        </div>
      </div>

      <section id="base-panel-command" class="base-panel" role="tabpanel" aria-labelledby="base-tab-command" hidden>
        <header class="section-heading">
          <p class="eyebrow" id="command-section-eyebrow"></p>
          <h1 id="command-section-title"></h1>
          <p class="lede" id="command-section-lede"></p>
        </header>
        <div class="command-dashboard">
          <section class="technology-lab command-panel command-dashboard__theatre" aria-labelledby="command-month-title">
            <p class="technology-lab__eyebrow" id="command-month-eyebrow"></p>
            <h2 id="command-month-title"></h2>
            <p class="lede" id="command-month-summary"></p>
            <div id="month-timeline" class="month-timeline" aria-live="polite"></div>
            <div id="geo-map" class="geo-map" aria-live="polite"></div>
            <div id="threat-map-list" class="threat-map" aria-live="polite"></div>
            <button id="end-month" class="base-action is-primary end-month" type="button"></button>
          </section>
          <div class="command-dashboard__side">
            <p class="run-report" id="base-run-report" aria-live="polite"></p>
          </div>
        </div>
      </section>

      <section id="base-panel-research" class="base-panel" role="tabpanel" aria-labelledby="base-tab-research" hidden>
        <header class="section-heading">
          <p class="eyebrow" id="research-section-eyebrow"></p>
          <h1 id="research-section-title"></h1>
          <p class="lede" id="research-section-lede"></p>
        </header>
        <div id="research-card-grid" class="research-card-grid research-cards-band" aria-live="polite"></div>
        <div class="research-grid">
          <section class="programme-panel research-domain is-earth" aria-labelledby="earth-research-title">
            <p class="technology-lab__eyebrow" id="earth-research-eyebrow"></p>
            <h2 id="earth-research-title"></h2>
            <p id="earth-research-intro" class="technology-lab__status"></p>
            <div class="facility-row research-staff-row">
              <div><span class="loadout-row__label" id="scientists-label"></span><strong id="scientist-count"></strong><small id="scientist-note"></small></div>
            </div>
            <div class="research-lane">
              <span id="earth-airframe-label"></span>
              <strong id="earth-airframe-status"></strong>
              <small id="earth-airframe-note"></small>
            </div>
            <div class="research-lane">
              <span id="earth-weapons-label"></span>
              <strong id="earth-weapons-status"></strong>
              <small id="earth-weapons-note"></small>
            </div>
            <h3 class="hangar-subtitle" id="aircraft-upgrade-research-title"></h3>
            <div id="aircraft-upgrade-research-list" class="candidate-list" aria-live="polite"></div>
            <div class="terrestrial-projects">
              <article class="terrestrial-project" id="machine-upgrade-project">
                <div>
                  <span id="machine-upgrade-label" class="loadout-row__label"></span>
                  <strong id="machine-upgrade-status"></strong>
                  <small id="machine-upgrade-note"></small>
                </div>
                <button id="research-machine-upgrade" class="base-action" type="button"></button>
              </article>
              <article class="terrestrial-project" id="accelerator-upgrade-project" hidden>
                <div>
                  <span id="accelerator-upgrade-label" class="loadout-row__label"></span>
                  <strong id="accelerator-upgrade-status"></strong>
                  <small id="accelerator-upgrade-note"></small>
                </div>
                <button id="research-accelerator-upgrade" class="base-action" type="button"></button>
              </article>
              <article class="terrestrial-project" id="canister-research-project">
                <div>
                  <span id="canister-research-label" class="loadout-row__label"></span>
                  <strong id="canister-research-status"></strong>
                  <small id="canister-research-note"></small>
                </div>
                <button id="research-canister" class="base-action" type="button"></button>
              </article>
            </div>
            <div class="special-project">
              <p class="technology-lab__eyebrow" id="programme-eyebrow"></p>
              <h3 id="capturer-programme-title"></h3>
              <p id="blueprint-status" class="technology-lab__status"></p>
              <small id="blueprint-contribution" class="programme-note"></small>
              <button id="start-blueprint-research" class="base-action" type="button"></button>
            </div>
            <div class="containment-programme" id="containment-programme" hidden>
              <p class="technology-lab__eyebrow" id="containment-eyebrow"></p>
              <h3 id="containment-title"></h3>
              <p id="containment-status" class="technology-lab__status"></p>
              <small id="containment-note" class="programme-note"></small>
              <button id="start-containment-research" class="base-action" type="button"></button>
            </div>
          </section>

          <section class="technology-lab research-domain is-alien" aria-labelledby="technology-lab-title">
            <p class="technology-lab__eyebrow" id="technology-lab-eyebrow"></p>
            <h2 id="technology-lab-title"></h2>
            <p id="alien-research-intro" class="domain-intro"></p>
            <p id="technology-status" class="technology-lab__status"></p>
            <button id="research-technology" class="base-action is-primary" type="button" hidden></button>
          </section>
        </div>
      </section>

      <section id="base-panel-engineering" class="base-panel" role="tabpanel" aria-labelledby="base-tab-engineering" hidden>
        <header class="section-heading">
          <p class="eyebrow" id="engineering-section-eyebrow"></p>
          <h1 id="engineering-section-title"></h1>
          <p class="lede" id="engineering-section-lede"></p>
        </header>
        <div class="engineering-grid">
          <section class="facility-panel" aria-labelledby="facility-title">
            <p class="technology-lab__eyebrow" id="facility-eyebrow"></p>
            <h2 id="facility-title"></h2>
            <div class="facility-row">
              <div><span class="loadout-row__label" id="laboratory-label"></span><strong id="laboratory-status"></strong><small id="laboratory-cost"></small></div>
              <button id="construct-laboratory" class="base-action is-primary" type="button"></button>
            </div>
            <div class="facility-row">
              <div><span class="loadout-row__label" id="workshop-label"></span><strong id="workshop-status"></strong><small id="workshop-cost"></small></div>
              <button id="construct-workshop" class="base-action is-primary" type="button"></button>
            </div>
            <div id="quarantine-row" class="facility-row" hidden>
              <div><span class="loadout-row__label" id="quarantine-label"></span><strong id="quarantine-status"></strong><small id="quarantine-cost"></small></div>
              <button id="construct-quarantine" class="base-action is-primary" type="button"></button>
            </div>
            <div id="trade-centre-row" class="facility-row" hidden>
              <div><span class="loadout-row__label" id="trade-centre-label"></span><strong id="trade-centre-status"></strong><small id="trade-centre-cost"></small></div>
              <button id="construct-trade-centre" class="base-action is-primary" type="button"></button>
            </div>
          </section>

          <section class="programme-panel" aria-labelledby="manufacturing-title">
            <p class="technology-lab__eyebrow" id="manufacturing-eyebrow"></p>
            <h2 id="manufacturing-title"></h2>
            <div class="facility-row production-staff-row">
              <div><span class="loadout-row__label" id="engineers-label"></span><strong id="engineer-count"></strong><small id="engineer-note"></small></div>
            </div>
            <div class="facility-row repair-staff-row">
              <div><span class="loadout-row__label" id="repair-master-label"></span><strong id="repair-master-count"></strong><small id="repair-master-note"></small></div>
            </div>
            <div id="repair-master-candidates-works" class="candidate-list" aria-live="polite"></div>
            <h3 class="hangar-subtitle" id="aircraft-production-title"></h3>
            <div id="aircraft-production-list" class="candidate-list" aria-live="polite"></div>
            <h3 class="hangar-subtitle" id="aircraft-upgrade-production-title"></h3>
            <div id="aircraft-upgrade-production-list" class="candidate-list" aria-live="polite"></div>
            <div id="capturer-equipment-row" class="facility-row programme-equipment">
              <div><span class="loadout-row__label" id="capturer-equipment-label"></span><strong id="capturer-equipment-status"></strong><small id="capturer-equipment-note"></small></div>
              <button id="manufacture-capturer" class="base-action is-primary" type="button"></button>
            </div>
            <div id="accelerator-production-row" class="facility-row programme-equipment" hidden>
              <div><span class="loadout-row__label" id="accelerator-production-label"></span><strong id="accelerator-production-status"></strong><small id="accelerator-production-note"></small></div>
              <div class="production-qty">
                <input id="production-qty-accelerator" class="production-qty__input" type="number" min="1" value="1" />
                <button id="manufacture-accelerator" class="base-action is-primary" type="button"></button>
              </div>
            </div>
            <div id="alien-emitter-production-row" class="facility-row programme-equipment" hidden>
              <div><span class="loadout-row__label" id="alien-emitter-production-label"></span><strong id="alien-emitter-production-status"></strong><small id="alien-emitter-production-note"></small></div>
              <div class="production-qty">
                <input id="production-qty-alien-emitter" class="production-qty__input" type="number" min="1" value="1" />
                <button id="manufacture-alien-emitter" class="base-action is-primary" type="button"></button>
              </div>
            </div>
            <div id="canister-production-row" class="facility-row programme-equipment" hidden>
              <div><span class="loadout-row__label" id="canister-production-label"></span><strong id="canister-production-status"></strong><small id="canister-production-note"></small></div>
              <div class="production-qty">
                <input id="production-qty-canister" class="production-qty__input" type="number" min="1" value="1" />
                <button id="manufacture-canister" class="base-action is-primary" type="button"></button>
              </div>
            </div>
            <div id="machine-upgrade-production-row" class="facility-row programme-equipment" hidden>
              <div><span class="loadout-row__label" id="machine-upgrade-production-label"></span><strong id="machine-upgrade-production-status"></strong><small id="machine-upgrade-production-note"></small></div>
              <button id="manufacture-machine-upgrade" class="base-action is-primary" type="button"></button>
            </div>
            <div id="accelerator-upgrade-production-row" class="facility-row programme-equipment" hidden>
              <div><span class="loadout-row__label" id="accelerator-upgrade-production-label"></span><strong id="accelerator-upgrade-production-status"></strong><small id="accelerator-upgrade-production-note"></small></div>
              <button id="manufacture-accelerator-upgrade" class="base-action is-primary" type="button"></button>
            </div>
          </section>
        </div>
      </section>

      <section id="base-panel-hangar" class="base-panel" role="tabpanel" aria-labelledby="base-tab-hangar" hidden>
        <header class="section-heading">
          <p class="eyebrow" id="hangar-section-eyebrow"></p>
          <h1 id="hangar-section-title"></h1>
          <p class="lede" id="hangar-section-lede"></p>
        </header>
        <div class="hangar-layout">
          <section class="technology-lab hangar-panel hangar-panel--preflight" aria-labelledby="hangar-loadout-title">
          <p class="technology-lab__eyebrow" id="hangar-loadout-eyebrow"></p>
          <h2 id="hangar-loadout-title"></h2>
          <div id="hangar-hero" class="hangar-hero" aria-live="polite"></div>
          <div id="aircraft-loadout-editor" class="aircraft-loadout-editor" aria-live="polite"></div>
          <div class="loadout-row">
            <div><span class="loadout-row__label" id="special-equipment-label"></span><strong id="special-equipment-status"></strong><small id="special-equipment-note"></small></div>
            <button id="toggle-special-equipment" class="base-action" type="button" hidden></button>
          </div>
          <p id="preflight-warning" class="preflight-warning" role="status"></p>
        <p id="warden-signal-warning" class="preflight-warning" role="status" hidden></p>
        <p id="fuel-status" class="preflight-warning" role="status" hidden></p>
        <p id="preflight-mission" class="preflight-warning preflight-mission" role="status" hidden></p>
          <button id="launch-sortie" class="base-action launch-action" type="button"></button>
        </section>
        <section class="technology-lab hangar-panel" aria-labelledby="hangar-fleet-title">
          <p class="technology-lab__eyebrow" id="hangar-fleet-eyebrow"></p>
          <h2 id="hangar-fleet-title"></h2>
          <p class="lede" id="hangar-fleet-lede"></p>
          <h3 class="hangar-subtitle" id="hangar-fleet-subtitle"></h3>
          <div class="fleet-slots" id="hangar-slots-list" aria-live="polite"></div>
          <div class="loadout-row hangar-slot-expand">
            <div><span class="loadout-row__label" id="hangar-slot-label"></span><strong id="hangar-slot-cost"></strong><small id="hangar-slot-note"></small></div>
            <button id="purchase-hangar-slot" class="base-action" type="button" hidden></button>
          </div>
        </section>
          <section class="technology-lab hangar-panel hangar-panel--pilots" aria-labelledby="hangar-pilots-title">
            <p class="technology-lab__eyebrow" id="hangar-pilots-eyebrow"></p>
            <h2 id="hangar-pilots-title"></h2>
            <p class="lede" id="hangar-pilots-lede"></p>
            <div id="pilots-roster" class="pilots-roster" aria-live="polite"></div>
            <div id="pilot-memorial" class="pilot-memorial" hidden>
              <h3 class="hangar-subtitle" id="pilot-memorial-title"></h3>
              <div id="pilot-memorial-list" class="candidate-list" aria-live="polite"></div>
            </div>
          </section>
        </div>
      </section>

      <section id="base-panel-trade" class="base-panel" role="tabpanel" aria-labelledby="base-tab-trade" hidden>
        <header class="section-heading">
          <p class="eyebrow" id="trade-section-eyebrow"></p>
          <h1 id="trade-section-title"></h1>
          <p class="lede" id="trade-section-lede"></p>
        </header>
        <div id="trade-content" class="trade-content">
          <div id="trade-dynamic" class="trade-dynamic"></div>
        </div>
      </section>

      <section id="base-panel-finance" class="base-panel" role="tabpanel" aria-labelledby="base-tab-finance" hidden>
        <header class="section-heading">
          <p class="eyebrow" id="finance-section-eyebrow"></p>
          <h1 id="finance-section-title"></h1>
          <p class="lede" id="finance-section-lede"></p>
        </header>
        <div id="finance-content" class="finance-content" aria-live="polite"></div>
        <section class="technology-lab command-panel finance-credit" aria-labelledby="command-credit-title">
          <p class="technology-lab__eyebrow" id="command-credit-eyebrow"></p>
          <h2 id="command-credit-title"></h2>
          <p class="lede" id="command-credit-lede"></p>
          <div id="credit-offers-list" class="threat-map" aria-live="polite"></div>
          <div id="active-loans-list" class="threat-map" aria-live="polite"></div>
        </section>
      </section>

      <section id="base-panel-staff" class="base-panel" role="tabpanel" aria-labelledby="base-tab-staff" hidden>
        <header class="section-heading">
          <p class="eyebrow" id="staff-section-eyebrow"></p>
          <h1 id="staff-section-title"></h1>
          <p class="lede" id="staff-section-lede"></p>
        </header>
        <div id="staff-roster" class="candidate-list" aria-live="polite"></div>
        <div id="scientist-candidates" class="candidate-list"></div>
        <div id="engineer-candidates" class="candidate-list"></div>
        <div id="manager-candidates" class="candidate-list"></div>
        <div id="trader-candidates" class="candidate-list"></div>
        <div id="medic-candidates" class="candidate-list" hidden></div>
        <div id="repair-master-candidates" class="candidate-list"></div>
      </section>

      <section id="base-panel-medical" class="base-panel" role="tabpanel" aria-labelledby="base-tab-medical" hidden>
        <header class="section-heading">
          <p class="eyebrow" id="medical-section-eyebrow"></p>
          <h1 id="medical-section-title"></h1>
          <p class="lede" id="medical-section-lede"></p>
        </header>
        <div id="medical-programme" class="containment-programme" hidden>
          <p class="technology-lab__eyebrow" id="medical-eyebrow"></p>
          <h3 id="medical-title"></h3>
          <p id="medical-research-status" class="technology-lab__status"></p>
          <small id="medical-research-note" class="programme-note"></small>
          <button id="start-medical-research" class="base-action" type="button"></button>
        </div>
        <div id="medical-row" class="facility-row" hidden>
          <div><span class="loadout-row__label" id="medical-label"></span><strong id="medical-status"></strong><small id="medical-cost"></small></div>
          <button id="construct-medical" class="base-action is-primary" type="button"></button>
        </div>
        <div class="facility-row production-staff-row" id="medic-staff-row" hidden>
          <div><span class="loadout-row__label" id="medics-label"></span><strong id="medic-count"></strong><small id="medic-note"></small></div>
        </div>
        <div id="medic-candidates" class="candidate-list" hidden></div>
        <h3 class="hangar-subtitle" id="medical-treatment-title"></h3>
        <div id="medical-treatment-list" class="candidate-list" aria-live="polite"></div>
      </section>

      <section id="base-panel-warehouse" class="base-panel" role="tabpanel" aria-labelledby="base-tab-warehouse" hidden>
        <header class="section-heading">
          <p class="eyebrow" id="warehouse-section-eyebrow"></p>
          <h1 id="warehouse-section-title"></h1>
          <p class="lede" id="warehouse-section-lede"></p>
        </header>
        <div id="warehouse-stock-list" class="threat-map" aria-live="polite"></div>
      </section>

      <section id="base-panel-databank" class="base-panel" role="tabpanel" aria-labelledby="base-tab-databank" hidden>
        <header class="section-heading">
          <p class="eyebrow" id="databank-section-eyebrow"></p>
          <h1 id="databank-section-title"></h1>
          <p class="lede" id="databank-section-lede"></p>
        </header>
        <p id="databank-note" class="databank-note"></p>
        <div id="databank-tables" class="databank-tables"></div>
      </section>

      <section id="month-report-panel" class="month-report-panel" hidden role="dialog" aria-modal="true" aria-labelledby="month-report-title">
        <p class="technology-lab__eyebrow" id="month-report-eyebrow"></p>
        <h2 id="month-report-title"></h2>
        <dl id="month-report-details" class="month-report-details"></dl>
        <button id="month-report-continue" class="base-action is-primary" type="button"></button>
      </section>

      <section id="design-system-overlay" class="design-system-overlay" hidden role="dialog" aria-modal="true" aria-labelledby="design-system-title">
        <header class="design-system-overlay__header">
          <div>
            <p class="technology-lab__eyebrow" id="design-system-eyebrow"></p>
            <h2 id="design-system-title"></h2>
            <p class="lede" id="design-system-lede"></p>
          </div>
          <button id="design-system-close" class="icon-button design-system-overlay__close" type="button" aria-label="close"></button>
        </header>
        <div id="design-system-content" class="design-system-content"></div>
      </section>

      <section id="sortie-picker-overlay" class="sortie-picker-overlay" hidden role="dialog" aria-modal="true" aria-labelledby="sortie-picker-title">
        <header class="sortie-picker-overlay__header">
          <div>
            <p class="technology-lab__eyebrow" id="sortie-picker-eyebrow"></p>
            <h2 id="sortie-picker-title"></h2>
          </div>
          <button id="sortie-picker-close" class="icon-button" type="button" aria-label="close"></button>
        </header>
        <div id="sortie-picker-list" class="candidate-list" aria-live="polite"></div>
        <p id="sortie-picker-empty" class="empty-note" hidden></p>
      </section>
    </main>

    <main id="sortie-screen" class="screen sortie-screen" hidden>
      <section id="combat-frame" class="combat-frame">
        <div id="game-root"></div>
        <div id="sortie-outcome" class="sortie-outcome" hidden>
          <p class="run-report" id="sortie-run-report" aria-live="polite"></p>
          <button id="return-to-base" class="base-action return-action" type="button"></button>
        </div>
      </section>
      <aside class="sortie-controls" aria-live="polite">
        <span id="active-weapon-label"></span>
        <strong id="active-weapon-name"></strong>
        <button id="switch-primary-weapon" class="weapon-switch-action" type="button" aria-keyshortcuts="X"></button>
        <small id="weapon-switch-note"></small>
      </aside>
    </main>
  </div>
  `;
}
