# P1 — Aircraft fleet and hangar

Status: implemented on `test` (2026-08-13); awaiting playtest before merging to `main`.

## Scope

The player commands a small fleet, not a single aircraft. Aircraft are typed
`AircraftDefinition`s, bought from verified suppliers with deterministic seeded
prices, stored in finite hangar slots, and selected per sortie. Combat uses the
**active** aircraft's armour, speed multiplier, and damage multiplier instead of
fixed constants. All numbers below are prototype values for playtest tuning.

## Aircraft catalogue

| Aircraft | Role | Armour | Speed × | Damage × | Market price |
|---|---|---|---|---|---|
| `aircraft-interceptor` (starting) | Light interceptor — balanced | 100 | 1.0 | 1.0 | — (not offered) |
| `aircraft-gunship` | Assault gunship — heavier armour, slower, harder hits | 150 | 0.82 | 1.15 | 900–1100 |
| `aircraft-aegis` | Heavy tank — most armour, slowest, heaviest hits | 210 | 0.68 | 1.30 | 1300–1600 |

- The starting hangar has 2 slots; the Interceptor occupies slot I.
- Prices are quoted deterministically from the seeded RNG using the market seed,
  the aircraft id, and `sortiesCompleted + 1` — identical input yields an identical
  quote, and the quote refreshes only after a sortie.
- A purchase requires a free slot and the quoted credits; expanding the hangar
  costs a flat `HANGAR_SLOT_COST` (1200 credits) and adds one empty slot.
- The active aircraft is selected from occupied slots and drives the next sortie.

## Schema change

Save schema **v9 → v10** adds to `BaseState`:

- `hangarSlots: readonly (string | null)[]` — the slots, `null` means empty.
- `activeAircraftId: string | null` — the aircraft flown on the next sortie.

The v9 migration (`LEGACY_V9_SAVE_KEY` → `SAVE_KEY`) provisions the starting fleet
(`[interceptorId, null]`, active = interceptor) so existing saves keep working.

## Domain rules

Pure rules live in `src/domain/hangar.ts`:

- `marketAircraftPrice(aircraft, marketSeed, sortiesCompleted)` — deterministic.
- `purchaseAircraft(state, aircraft, price)` — rejects unknown/already-owned
  aircraft, full hangars, and unaffordable purchases.
- `purchaseHangarSlot(state, cost)` — rejects unaffordable expansion.
- `setActiveAircraft(state, aircraftId | null)` — validates hangar membership.

## Store commands

- `PURCHASE_AIRCRAFT { aircraftId }`
- `PURCHASE_HANGAR_SLOT`
- `SET_ACTIVE_AIRCRAFT { aircraftId }`

## Combat integration

`CombatScene` receives `getAircraftStats()` (armour, speed multiplier, damage
multiplier) from the shell, resolved from the active aircraft:

- Max armour and the armour bar use the aircraft armour.
- Movement speed = base 330 × speed multiplier.
- Shot damage = weapon damage × damage multiplier.

## UI

The Hangar tab gains a fleet panel listing every slot (occupied/empty, stats,
active badge or "set active"), the aircraft offers with deterministic prices and
affordability/slot-full notes, and the hangar-expansion row.

## Tests

- `tests/unit/hangar.test.ts` — deterministic pricing and purchase/expansion/
  selection rules.
- `tests/unit/store.test.ts` — the three fleet commands.
- `tests/unit/content.test.ts` — aircraft balance ordering.
- `tests/unit/save-repository.test.ts` — v9 → v10 migration provisions the fleet.
- `tests/unit/i18n.test.ts` — Chinese locale.

## Open tuning

- Aircraft prices, slot cost, and combat multipliers are prototypes.
- Hardpoint rockets and the Capturer remain shared equipment across the fleet.
