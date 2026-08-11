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

Status: implemented; draft publication in progress.

Add artefact signals, install-or-preserve choice, one passive effect, one weapon
transformation, an optional elite encounter, extraction, and partial loss on failure.

- [x] Show broad signal category, glyphs, reliability, and danger before the choice.
- [x] Install the Prism for Prismatic Sheath and the Split Pulse transformation.
- [x] Preserve the Prism for recoverable research value.
- [x] Offer a safe extraction window or an optional Warden intercept.
- [x] Award deterministic salvage and retain only 50% after defeat.
- [x] Persist recovered materials and research in the existing versioned local save.
- [x] Add deterministic domain tests and a fast local playtest mode.

## M3 — Base loop

Status: planned.

Add the base UI, pilots, specialists, energy capacity, materials, research, loadout,
research queue, technology catalogue, mission launch, results, and versioned save.

## M4 — Vertical slice

Status: planned.

Expand only after the short loop is enjoyable. Build the 15–20 minute sector, target
content set, extraction windows, final threat, audio, effects, onboarding, balance,
and browser smoke flow.

## Stop-and-fix rule

Every milestone must pass `npm run lint`, `npm run typecheck`, `npm test`, and
`npm run build`. Fix failures before moving on.
