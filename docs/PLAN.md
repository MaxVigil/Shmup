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
