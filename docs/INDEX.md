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
| Human playtest script | `docs/PLAYTEST.md` | — |
| Ideas backlog (E5.3 triage) | `docs/IDEAS_BACKLOG.md` | — |
| Weapon upgrade branch designs | `docs/WEAPON_UPGRADES.md` | — |
| Content validation | `src/content/validate.ts` | — |
| Save schema + migrations | `src/domain/model.ts`, `src/persistence/save-repository.ts` | — |
| Loadout helpers (slot bonus, multipliers) | `src/domain/loadout.ts` | — |
| UX/UI epic contract | `docs/UXUI_EPIC.md` | — |

## Arsenal epic (E0–E5)

Status and task breakdown: `docs/WEAPONS_EPIC.md` + `docs/PLAN.md`.

- **E0** design contract — done.
- **E1a** schema + data layer — done.
- **E1b** docs generator (new ENTITIES sections) + index (this file) — done; save v20
  migration deferred to E2 (state shape unchanged so far).
- **E2** loadout & economy (hardpoints, weight/energy, finite ammunition, aircraft
  Marks II/III) — done.
- **E3** combat systems (stun→recovery, auxiliary firing incl. drones/mines,
  homing/decoys, alien primaries) — done.
- **E4** hardcore destruction, variable Marks, balance invariants — done.
- **E5** balance/playtest/backlog — in progress; the human rounds live in
  `docs/PLAYTEST.md`, the 23-idea triage in `docs/IDEAS_BACKLOG.md`.

## UX/UI epic (E6)

Status and task breakdown: `docs/UXUI_EPIC.md` + `docs/PLAN.md`.

- **E6.0** design contract + decisions — done.
- **E6.1** overlay stack — done.
- **E6.2** focus management — done.
- **E6.3** safe-area + accessibility options — pending.
- **E6.4** HUD ownership contract — pending.
- **E6.5** toast/a11y + i18n overflow — pending.
- **E6.6** verification & regression — pending.

## Commands

- Install: `npm ci` · Dev: `npm run dev`
- Validate: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`
- Regenerate docs: `npm run entities` (ENTITIES.md/.xlsx), `npm run balance` (BALANCE.md)
