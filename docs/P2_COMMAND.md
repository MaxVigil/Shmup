# P2 — Command Centre and fuel (save schema v11)

Status: contract; implementation follows on `test`.

## Scope

The base grows from a single launch button into a small operational command. P2 adds
the **Command Centre** (current month and threat map), a **sortie-counted month**, a
**fuel economy** per aircraft with a launch gate, and the persisted state that makes
them deterministic. Pilots (P3) and salaries (P4) remain future slices.

Out of scope for P2: pilot hire/assignment, enriched staff, monthly salaries, weapon
branch trees, hybrid aircraft, and reward scaling from the threat map (the map is
narrative and structural foundation now; its reward/escort hooks arrive with P3+).

## Content

- `CouncilStateDefinition` — typed states of the Recovery Council with localized
  names: the PRC, Ukraine, plus two generic founding states (prototype). The PRC and
  Ukraine are always present in the pool.
- `AircraftDefinition.refuelCreditCost` — fuel cost for one sortie per aircraft
  (prototype: Interceptor 30, Gunship 45, Aegis 60).
- `MissionState { id, targetCountryId, threatLevel }` — one threat-map entry.

## Numbers (prototype, for playtest tuning)

- `MONTH_SORTIE_LENGTH = 6` completed sorties per month.
- The threat map shows three attacked states per month with threat levels 1–3,
  generated deterministically from the market seed and month.
- Refuel costs are per-aircraft; a sortie consumes the active aircraft's fuel.

## Save schema v10 → v11

`BaseState` gains:

- `month: number` — starts at 1.
- `fueledAircraftIds: readonly string[]` — aircraft currently ready to fly.
- `threatMap: readonly MissionState[]` — regenerated at each month boundary.

The v10 migration provisions month 1, fuels every owned aircraft, and generates the
month-1 threat map from the market seed.

## Domain rules (`src/domain/command-centre.ts`)

- `monthForSorties(sortiesCompleted)` — pure derivation (`floor / 6 + 1`).
- `generateThreatMap(marketSeed, month)` — deterministic, seeded, picks three states
  with threat levels from the content pool.
- `refuelAircraft(state, aircraft, cost)` — validates credits and adds fuel.
- `isAircraftFueled(state, aircraftId)` — launch-gate helper.
- `consumeAircraftFuel(base, aircraftId)` — removes fuel after a sortie.

## Store

- `REFUEL_AIRCRAFT { aircraftId }`.
- `SETTLE_SORTIE` additionally consumes the active aircraft's fuel and, when the
  derived month advances, regenerates the threat map.
- Launch remains a UI action; the shell disables it unless the active aircraft is
  fueled and shows the fuel state in preflight.

## UI and i18n

- A new **Command** tab in the base navigation shows the current month, the threat
  map (attacked states and threat levels), and a fuel summary.
- The Hangar fleet panel shows each aircraft's fuel state with a refuel action.
- Preflight warns when the active aircraft is unfueled.
- All strings are typed keys in uk/en/zh.

## Tests

- Domain: month derivation, deterministic threat map, refuel validation, fuel
  consumption.
- Store: `REFUEL_AIRCRAFT` and settlement fuel/month behaviour.
- Migration: v10 → v11 provisioning.
- Content: council-state pool and refuel costs.
