# Implementation plan

The detailed plan lives in [Technical Plan v0.1](https://app.notion.com/p/3b481cc4e8c2815d87c7ce1c4c4bd050).
This file is the repository-resident execution contract.

## M0 — Foundation

Status: complete; merged in PR #1.

- [x] Scaffold Phaser 4, TypeScript, and Vite.
- [x] Add repository instructions and project documentation.
- [x] Configure lint, typecheck, unit tests, and production build.
- [x] Add GitHub Actions CI.
- [x] Add domain state skeleton, seeded RNG, persistence boundary, and content validation.
- [x] Confirm all validations pass in CI.

Done when a clean checkout installs with `npm ci`, launches locally, and passes lint,
typecheck, unit tests, and production build.

## M1 — Combat feel prototype

Status: merged in PR #2; tuning follow-up remains open.

Create a 3–5 minute greybox encounter with bounded movement, automatic fire, armour,
damage feedback, two enemy types, simple patterns, and a readable HUD.

- [x] Add typed definitions for two regular enemy types.
- [x] Add bounded keyboard and pointer movement.
- [x] Add automatic fire, armour, damage feedback, scoring, and restart.
- [x] Add straight and sine-wave enemy movement.
- [x] Add a readable encounter HUD and three-minute survival target.
- [ ] Record repeatable playtest evidence for movement, spawn pressure, collision
  readability, and firing cadence.
- [x] Add local armour feedback and reset all encounter state on restart.

## M2 — Risk and extraction

Status: implemented, playtested, and published on `main`.

Add artefact signals, install-or-preserve choice, one passive effect, one weapon
transformation, an optional elite encounter, extraction, and partial loss on failure.

- [x] Drop the Prism from the optional Warden and only then show its broad category,
  glyphs, reliability, danger, and install-or-preserve choice.
- [x] Install the Prism for Prismatic Sheath and the Split Pulse transformation.
- [x] Preserve the Prism for recoverable research value.
- [x] Require a post-choice escape where installed effects are playable and preserved
  technology remains at risk.
- [x] Offer a safe extraction window or an optional Warden intercept carrying the
  artefact.
- [x] Award deterministic salvage and retain only 50% after defeat.
- [x] Persist recovered materials and research in the existing versioned local save.
- [x] Add deterministic domain tests and a fast local playtest mode.

## M3 — Base loop

Status: M3a, all four M3b stages, M3c guidance/payoff, M3d sortie flow, M3e operational
economy plus contact hotfix, M3f base information architecture, and the M3g.1–M3g.2a
arsenal cycles are implemented, playtested, and published on `main`; broader base
progression remains staged.

Add the base UI, pilots, specialists, energy capacity, materials, research, loadout,
research queue, technology catalogue, mission launch, results, and versioned save.

- [x] Deliver a preserved Prism to the base as an identified technology sample.
- [x] Research the sample to unlock the stable Split Pulse Emitter.
- [x] Equip or remove the unlocked weapon module for the next sortie.
- [x] Start a new sortie with the equipped Split Pulse transformation active.
- [x] Migrate browser saves from schema v1 to v2.
- [x] Stage 1: separate the Base and Sortie screens, add a persistent settings top bar,
  and localize all visible UI and Phaser text in Ukrainian and English.
- [x] Stage 2: add credits, construction, the laboratory, and scientist hiring.
- [x] Migrate v1/v2 progress to save schema v3 with infrastructure compatibility.
- [x] Stage 3: research and manufacture the Alien Technology Capturer blueprint through
  sortie-driven progress, a workshop, and explicit costs.
- [x] Stage 4: add preflight special-equipment loadout and gate artefact recovery behind
  an equipped Capturer.
- [x] M3c: guide a clean profile through the Capturer chain, clarify preflight recovery,
  and expose credits, materials, and research progress in the sortie payoff.
- [x] M3d: centre the sortie below the top bar, add manual/settings pause, isolate the
  Warden intercept, and replace abrupt mission stops with managed extraction/defeat
  sequences.
- [x] M3e: replace fixed sortie pay with target bounties and five-times breach
  penalties, expose the live contract ledger, and end an insolvent campaign at a
  reserve of zero or less.
- [x] M3e contact hotfix: keep the Warden alive after ramming, separate both actors
  along the actual contact axis, and preserve the result at every playfield edge.
- [x] M3f: divide the Base into Overview, Research, Engineering, and Hangar departments
  with persistent resource context and direct next-objective routing.
- [x] M3f: classify the Capturer as a terrestrial blueprint and separate conventional
  development lanes from quarantined alien artefact analysis.
- [ ] Add the broader pilot, specialist, energy, and mission surfaces.

## M4 — Vertical slice

Status: planned.

Expand only after the short loop is enjoyable. Build the 15–20 minute sector, target
content set, extraction windows, final threat, audio, effects, onboarding, balance,
and browser smoke flow.

## Planned M3 arsenal sequence

The agreed post-M3f sequence is specified in
[M3g–M3j arsenal roadmap](M3G_M3J_ARSENAL_ROADMAP.md). Implement and playtest one
cycle at a time.

- [x] M3g.1: general primary-weapon slot, deterministic terrestrial market, purchasable
  Impulse Accelerator, and combat-feedback pass.
- [x] M3g.1 balance adaptation: two persistent primary-weapon slots with `X` and
  pointer switching during a sortie.
- [x] M3g.2: Research and Development Centre, Prototype and Production Works, market
  blueprints, local manufacturing, and the first machine-gun/Accelerator improvements.
- [x] M3g.2a: move scientist hiring into Research, add one lead engineer to the Works,
  require production staffing, and clarify that completed research creates a blueprint.
- [x] M3g.3a: preserved-sample containment gate — safe-containment research project,
  Quarantine Centre extension constructed by the Works, and sealed samples that cannot
  be analysed before containment exists.
- [x] M3g.3b: early Warden signal and Capturer telemetry unlock (the adapted Split
  Pulse Emitter manufacturing loop is already implemented in M3g.3a).
- [x] M3h: one readable ranged enemy and hostile-projectile lifecycle.
- [x] M3i: Canister Aircraft Cannon with short range, pellet spread, and capped
  knockback.
- [x] M3j: permanent auxiliary hardpoint, manual auxiliary activation, and a limited-
  charge rocket pod whose principal use case is engaging the Warden.
- [ ] After M3j validation: consider a slowly ascending proximity mine as the next
  auxiliary weapon.
- [ ] Run 2D art search, selection, licence verification, and integration as a separate
  later stage; none of the currently reviewed open-license sets has been selected.

## P0 — Chinese localization

Status: implemented on `test`; awaiting playtest before merging to `main`.

- [x] Add a full `zh` locale to the typed catalogue (every `TranslationKey`, including
  the fleet keys added by P1), so all base and sortie strings have a Chinese translation.
- [x] Add the language-selector entry, `isLocale('zh')`, and the existing persistence
  handling for the preference.
- [x] Cover the Chinese locale in the localization unit tests.

## P1 — Aircraft fleet (save schema v10)

Status: implemented on `test`; awaiting playtest before merging to `main`.

- [x] Define typed `AircraftDefinition`s: Interceptor (starting), Gunship, and Aegis,
  with armour, speed multiplier, and damage multiplier plus deterministic seeded
  market pricing.
- [x] Persist `hangarSlots` and `activeAircraftId` in schema v10 with a v9 migration
  that provisions the starting fleet.
- [x] Add pure domain rules for aircraft purchase, hangar-slot expansion, and
  active-aircraft selection.
- [x] Add `PURCHASE_AIRCRAFT`, `PURCHASE_HANGAR_SLOT`, and `SET_ACTIVE_AIRCRAFT` store
  commands.
- [x] Drive combat from the active aircraft's armour, speed multiplier, and damage
  multiplier instead of fixed constants.
- [x] Add a fleet panel to the Hangar with occupied/empty slots, aircraft offers,
  affordability notes, and hangar expansion.
- [x] Add uk/en/zh translations and unit tests for content, domain, store, and
  migration; all numbers remain prototype values for playtest tuning.

## P2 — Command Centre and fuel (save schema v11)

Status: implemented on `test`; awaiting playtest before merging to `main`.

- [x] Add a Command tab with the current month, the threat map of Council states under
  attack, and fleet fuel readiness.
- [x] Add the sortie-counted month (`MONTH_SORTIE_LENGTH = 6`) with a deterministic,
  seeded threat map regenerated at each month boundary.
- [x] Add per-aircraft refuel costs and a launch gate: a sortie consumes the active
  aircraft's fuel, and launching requires a fueled aircraft.
- [x] Persist `month`, `fueledAircraftIds`, and `threatMap` in schema v11 with a v10
  migration that provisions month one, full fuel, and the first map.
- [x] Add `REFUEL_AIRCRAFT` and extend `SETTLE_SORTIE` for fuel consumption and month
  advancement in the store.
- [x] Add uk/en/zh translations and unit tests for content, domain, store, and
  migration; all numbers remain prototype values for playtest tuning.

## P2a — Credit line (save schema v12)

Status: implemented on `test`; awaiting playtest before merging to `main`.

- [x] Add a deterministic credit line in the Command Centre with three lenders:
  Recovery Commission, PRC (best terms), and Ukraine.
- [x] Persist `loans` in schema v12 with a v11 migration that starts loan-free.
- [x] Add `TAKE_LOAN` and month-boundary repayment in `SETTLE_SORTIE`; an uncovered
  repayment cascades into the existing insolvency rule.
- [x] Add the Credit line UI (offers + active loans) and uk/en/zh translations.
- [x] Cover the credit domain, store, and migration with unit tests.

## UI polish batch

Status: implemented on `test`; awaiting playtest before merging to `main`.

- [x] Fix the locale switch so selecting Chinese re-renders the whole interface.
- [x] Remove the Overview tab: the Command tab is now the landing page with the next
  objective, post-sortie report, and operating mandate; the save-schema status moves
  to Settings; the insolvency modal becomes a global overlay.
- [x] Give each aircraft a distinct combat silhouette and hull colour.
- [x] Rework the Hangar: fleet bay cards with status chips (ACTIVE/FUELED/UNFUELED),
  visible refuel costs, and market offers with deltas against the active aircraft.

## P3 — Fleet entities, inventory, damage/repair, staff, and trade (schema v13)

Status: implemented on `test`; awaiting playtest before merging to `main`. See
`docs/P3_FLEET_INVENTORY.md` and `docs/DECISIONS.md`.

- [x] C1: fix Command tab navigation, add restart-mission with confirmation, and
  abort sortie from the pause menu.
- [x] Schema v13: single 12→13 migration with `aircraftLoadouts`, `weaponStock`,
  `consumableStock`, `aircraftModules`, `aircraftDamage`, `aircraftRepair`,
  `staffCandidates`, `staffXp`; guards and initial state updated.
- [x] C2: fleet entities with per-aircraft loadouts and N-slot combat switching,
  warehouse stock, module install/unequip, the PRC Yanlong, loadout editor and
  warehouse panel.
- [x] C3: sortie damage, grounded repairs (standard + emergency), repair launch gate.
- [x] C4: deterministic monthly staff candidate pool, hire, XP levels, and staff
  contribution in blueprint research.
- [x] C5: Trade Centre building and Trade tab (procurement, surplus sales, relocated
  credit lines), trader manager margin.
- [x] 158 unit tests, lint, typecheck, and the production build pass locally.

## Round-4 playtest fixes (schema v14)

Status: implemented on `test`, awaiting playtest before merging to `main`.

- [x] Finance tab opens (the local `isBaseSection` guard omitted `finance`).
- [x] Abort semantics: `abortRun` yields `extracted: false`; `SETTLE_SORTIE`
  resolves the mission and grants the nation gift only on `extracted`. Abort
  confirmation states the consequences (no reward, no gratitude, threat remains).
- [x] Rocket fire decoupled from movement: Space / right-click fire, left drag
  moves; splash warhead (damage 200, radius 40% of the larger dimension, no
  self-damage); pointer-follow is speed-capped with an F cursor-lock toggle.
- [x] Pilot fatigue rotation: +0.15/sortie active, passive recovery for others,
  monthly recovery, fatigued pilots cannot fly, REST stands down to a rested pilot.
- [x] Staff management: Command roster with dismiss; Operations Director and Trade
  Manager candidate pools rendered; engineer headcount 1 → 3.
- [x] Repaid loans hidden; compact credit formatting in combat HUD and kill
  rewards; debug grants rescaled (+100k/+1M); gratitude folded into the sortie
  result report; reinforced-ammo badge; Settings → NEW GAME.

## Round-5 UX & economy fixes (schema v14)

Status: implemented on `test`, awaiting playtest before merging to `main`.

- [x] Completed the ×1000 economy rescale: trade centre 350 → 350k / upkeep 6 →
  6k; weapon-upgrade research 140/180 → 140k/180k; dead consumable `creditCost`
  rescaled. Added a content validation guard that rejects any credit value below
  1000, so regressions fail fast.
- [x] Loans moved out of the Trade Centre gate into Command (always available);
  the Trade tab is hidden until the trade centre is built; the Research tab is
  hidden until the laboratory is built (progressive disclosure).
- [x] The capturer-manufacture row in Engineering is hidden until its blueprint
  is researched; lab/workshop buttons now show a shortfall note.
- [x] Trader now grants a flat +5% sell margin at hire (+2%/level, capped 15%,
  manager +2%); the `SELL_RATE × (1+margin) < 1` invariant is tested so market
  buy→resell can never turn a profit.
- [x] Staff salaries reduced from 40% → 30% of hire cost per month.
- [x] Month cycle aligned: `MONTH_SORTIE_LENGTH` 6 → 3 (one sortie per mission).
- [x] END MONTH requires a confirmation when threats remain unresolved.

## Round-6 aircraft procurement & market (schema v15)

Status: implemented on `test`, awaiting playtest before merging to `main`.

- [x] Schema v15: `researchedAircraftUpgradeIds` / `manufacturedAircraftUpgradeIds`
  with a v14→v15 migration (older saves upgrade through it).
- [x] Market sells **ready aircraft and aircraft blueprints** (all six types,
  including the starter Interceptor and its blueprint). Aircraft sales also move
  to Trade.
- [x] Blueprints unlock the **Mark II / Mark III upgrade line** (research in the
  laboratory → manufacture in the workshop); upgrades apply to owned aircraft
  stats; `signatureId` reserved for future unique Mark III effects.
- [x] Two new aircraft: UK `Swift` (fast/light, 2 slots) and Japan `Precision`
  (single slot, highest damage).
- [x] Hangar is now a servicing hub: a large procedural-SVG hero panel for the
  active aircraft (stats, status, refuel/repair/activate), compact fleet slots,
  loadout + special equipment, pilots. The hangar's aircraft market was removed.
- [x] Procedural ship SVG upgraded (hull + canopy inset + engine glow) and the
  in-flight ship matches the hangar model.
- [x] Sanity/feedback pass: construction/research/production now toast
  "started — completes after the next sortie" (the old toast wrongly said
  "complete" on start), and sortie settlement toasts buildings delivered, new
  aircraft, and researched blueprints.

## Round-7 difficulty & research pacing (schema v15)

Status: implemented on `test`, awaiting playtest before merging to `main`.

- [x] Weapon and aircraft upgrade research now runs through the shared research
  queue (`researchSorties` 1–2 per tier) instead of completing instantly; the
  queue routes finished projects to weapon/aircraft/blueprint knowledge.
- [x] Month 1 threat ceiling capped at level 2, month 2 at level 3 (was 1–3
  from the first month).
- [x] Enemy spawn rate reduced in early months (month 1 ≈28% fewer, month 2
  ≈23% fewer) via a spawn-cooldown ramp keyed on completed sorties.
- [x] Tests: threat ceiling by month, queued upgrade research + completion
  routing, store flows updated to advance research by sorties.

## Round-8 pilot casualties & the Medical Block (schema v16)

Status: implemented on `test`, awaiting playtest before merging to `main`.

- [x] Schema v16: `pilotInjuries`, `deadPilotIds`, `pilotDeathMonth` with a
  v15→v16 migration; `activePilotId` is now nullable (a fallen active pilot
  leaves the slot open until a new assignment).
- [x] A damaged sortie rolls a seeded casualty (no damage = no roll), scaled by
  the armour fraction lost: death 0.5%·p, severe 1.5%·p, medium 4%·p,
  light 8%·p. Fatalities clear XP/fatigue and move the pilot to the
  Board of Honour.
- [x] Injured pilots cannot fly and only recover while in treatment: a Council
  state heals at the base 1x speed for a one-off fee (light 80k / medium 180k /
  severe 400k, PRC cheapest), or the Medical Block heals free with medics
  accelerating up to 3x.
- [x] Medical Block: researched as an earth building blueprint (laboratory +
  scientist), constructed in the Works (350k + 20 materials, 2 sorties,
  6k/month upkeep); the medic staff role (≤4) is hired there and accelerates
  recovery (`1 + 0.5 × medic contribution`, 2–3 medics ≈ 2x–3x).
- [x] Salary rebalance: explicit per-role `salaryCreditCost` (scientists/
  engineers/traders/medics 8–9k, manager 25k) replaces the `0.3 × hire cost`
  formula; monthly salaries are clamped to 10k for everyone but the manager.
  Pilot candidate salaries are 7–10k.
- [x] UI + i18n (uk/en/zh): pilot cards show wounds/treatment, per-country
  outsource pricing, the Medical Block programme/construction/staff, and the
  Board of Honour.
- [x] Tests: casualty thresholds, injury/death handling, outsource pricing,
  in-house gating, medic acceleration, salary cap, v15→v16 migration.

## Iteration 1 — Base management pass (schema v14)

Status: implemented on `test`.

- [x] Credits format threshold at 1k (`8k` for 8000), player health bar at 50%
  alpha, single REPAIR action (emergency repair removed).
- [x] Removed the MANDATE/FUEL/OBJECTIVE base cards and the HUD objective line;
  credit lines moved to the Finance tab.
- [x] Trade Centre construction moved into Engineering (the old Trade-tab-only
  build path was a dead end) and the Trade tab is always visible with a locked
  note until the Centre is built.
- [x] Staff hire buttons disabled at `maximumHeadcount` with a "LIMIT REACHED"
  chip (fixes the two-Operations-Directors UI bug).
- [x] New base tabs: Staff / Medical / Warehouse.

## Iteration 2 — Mission launch flow (schema v14)

Status: implemented on `test`.

- [x] Mission rows use a single "FLY MISSION" button that opens the aircraft
  picker modal with per-aircraft readiness reasons.
- [x] Launching is disabled with a "No aircraft is ready…" hint when the hangar
  cannot field a sortie; all launch paths share `launchSortie()`.

## Iteration 3 — Repeatable weapon production (schema v14)

Status: implemented on `test`.

- [x] Weapon production (accelerator, alien emitter, canister) is repeatable and
  quantity-based: choose a batch size, per-quantity cost and disabled states,
  and each completed batch adds the units to the warehouse.
- [x] `ProductionJobState` carries `quantity`; `startWeaponProduction(…, quantity)`
  and `weaponProductionCost()` drive the flow; warehouse stock counts display.
- [x] The Medical tab is hidden until the Medical Block is built.

## Iteration 4 — National aircraft fleet (schema v17)

Status: implemented on `test`.

- [x] Replaced the 6 engine-brand aircraft with 7 Council-nation aircraft, each
  with its own root SVG rendered in-game (`public/assets/{india,britain,prc,
  germany,usa,france,japan}.svg`): India light delta interceptor (starter),
  PRC stealth interceptor, France agile multirole, Britain VTOL strike, Germany
  variable-sweep strike, Japan precision fighter, USA stealth strike fighter.
- [x] Balance table is typed content (armour / speed / damage / refuel / slots /
  price); PRC offers a strong mid-tier interceptor lane; names are generic in
  uk/en/zh ("Літак КНР" / "PRC aircraft" / "中国战机").
- [x] Aircraft blueprints (7) and Mk1/Mk2 upgrades (14) regenerated for the new
  fleet; starter aircraft is India.
- [x] Schema v17 migration: v16 saves are reset to the starter aircraft, old
  aircraft blueprint/upgrade references are cleared, and credits, materials,
  staff, buildings, weapons, and warehouse stock are preserved.
- [x] Tests: catalog fleet balance, v16→v17 migration, aircraft production and
  upgrade flows against the new blueprint ids.

## Future ideas (backlog)

- **Scrum teams for staff (scientists, engineers, medics).** Pilots remain
  individual hires, but research/production/medical staff are framed as a
  "lead + team of 8–10 specialists" hired with a single click. Minimal domain
  change: the existing staff/candidate/salary/headcount model stays; only the
  presentation reframes a hire as a team, `maximumHeadcount` becomes "number of
  teams", and the roster shows "Lead X · team of N" instead of individual names.
  This makes the flat per-hire contribution and salary read naturally.


## Durable decisions

- The PRC and the Chinese Communist Party play a key positive role in the game's
  narrative and progression: founding Recovery Council state, permanent Council seat,
  essential funding and staff, and a Chinese-sourced conventional-technology lane.
- The PRC sometimes offers better conditions, technologies, and contracts than other
  Council states, demonstrating China's advantage without making it a constant.
- Ukraine, after the war for its survival and independence, is one of Earth's
  technology-innovation leaders; the strongest hireable engineers, scientists, and
  pilots are often Ukrainian.
- The former Russian state does not exist in the game's present-day world: it collapsed
  after the war, and no Russian actors or references appear in content. This is a hard
  content constraint for all future milestones, content, copy, and localization.

## Stop-and-fix rule

Every milestone must pass `npm run lint`, `npm run typecheck`, `npm test`, and
`npm run build`. Fix failures before moving on.
