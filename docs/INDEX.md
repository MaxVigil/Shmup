# Project map (index)

Navigational index for the Shmup repository. This file deliberately contains NO
content data (no lists, numbers, or balance values) — every fact lives in its single
source of truth and is referenced here.

## What this is

A browser vertical shmup about informed risk, alien technology, and an international
corporate base on Earth. See `docs/GAME_SPEC.md`.

## Where things live

| Concern | Source of truth | Generated reference |
| --- | --- | --- |
| Game product spec (GDD) | `docs/GAME_SPEC.md` | — |
| Implementation plan + status | `docs/PLAN.md`, `docs/STATUS.md` | — |
| Durable decisions | `docs/DECISIONS.md` | — |
| Weapons & Arsenal epic contract | `docs/WEAPONS_EPIC.md` | — |
| All game content (weapons, buildings, staff, aircraft, ...) | `src/content/catalog.ts` | `docs/ENTITIES.md` / `ENTITIES.xlsx` (`npm run entities`) |
| Balance constants | `src/content/catalog.ts` + `src/domain/*` | `docs/BALANCE.md` (`npm run balance`) |
| Content validation | `src/content/validate.ts` | — |
| Save schema + migrations | `src/domain/model.ts`, `src/persistence/save-repository.ts` | — |
| Loadout helpers (slot bonus, multipliers) | `src/domain/loadout.ts` | — |

## Arsenal epic (E0–E5)

Status and task breakdown: `docs/WEAPONS_EPIC.md` + `docs/PLAN.md`.

- **E0** design contract — done.
- **E1a** schema + data layer — done.
- **E1b** docs generator (new ENTITIES sections) + index (this file) — done; save v20
  migration deferred to E2 (state shape unchanged so far).
- **E2–E5** — planned: loadout & economy, combat systems, hardcore + progression,
  balance/playtest/backlog.

## Commands

- Install: `npm ci` · Dev: `npm run dev`
- Validate: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`
- Regenerate docs: `npm run entities` (ENTITIES.md/.xlsx), `npm run balance` (BALANCE.md)
