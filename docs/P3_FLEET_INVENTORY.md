# P3 — Fleet entities, inventory, damage/repair, staff, and trade

Cycle: schema v13 (single migration), Commits C1–C5.

## Scope

- Fix Command tab navigation; add Restart mission (Settings) and Abort sortie (pause).
- Fleet entities with per-aircraft loadouts and warehouse inventory.
- Damage/repair with grounded aircraft, standard and emergency repair.
- Deterministic monthly staff market with traits and XP.
- Trade Centre building gating procurement, sales, and credit lines.

## Implementation order

1. **C1** tab fixes, restart-with-confirmation, abort sortie (146 tests).
2. **Schema v13** foundation: `aircraftLoadouts`, `weaponStock`, `consumableStock`,
   `aircraftModules`, `aircraftDamage`, `aircraftRepair`, `staffCandidates`,
   `staffXp`; one v12→v13 migration; guards; initial state.
3. **C2** `armory.ts` (install/unequip/move/replace, modules, consumables), N-slot
   combat switching, Yanlong aircraft, loadout editor + warehouse panel.
4. **C3** `aircraft-integrity.ts` (damage weight 0.6, repair 100 cr/damage, 3
   sorties/damage, emergency 2×), settlement damage dispatch, repair launch gate.
5. **C4** `staff-market.ts` (candidates, hire, XP, staff contribution), candidate UI.
6. **C5** `trade.ts` (margin, sell weapon/aircraft), Trade Centre building + tab,
   relocated credit lines, manager margin.

## Definition of done

- [x] Lint, typecheck, unit tests, and production build pass.
- [x] Save schema v13 with v12 migration test.
- [x] Docs: `DECISIONS.md`, `GAME_SPEC.md`, `PLAN.md`, `STATUS.md` updated.

## Tuning targets (prototype)

- Aircraft prices, slot costs, refuel costs, repair cost/rate, candidate tiers, and
  the 0.6 damage weight are first-pass values awaiting playtest evidence.
