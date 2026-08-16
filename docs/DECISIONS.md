# Decisions — Fleet entities, inventory, damage/repair, staff, and trade

Standing decisions recorded during the consolidated P3 fleet/inventory cycle.
Each entry records the context, the decision, and the consequence. Treat these as
durable unless a later entry explicitly reverses them.

## 1. One schema bump for the whole cycle

**Context:** The fleet cycle (entities + inventory + damage + staff + trade) needs
many new base fields. Splitting them into several migrations would churn saves
without any shipped gameplay in between.

**Decision:** Ship a single `schemaVersion` 12→13 migration containing
`aircraftLoadouts`, `weaponStock`, `consumableStock`, `aircraftModules`,
`aircraftDamage`, `aircraftRepair`, `staffCandidates`, and `staffXp`, then land the
features as sequential commits. Legacy v12 loadouts are folded onto the previously
active aircraft, equipped weapons become warehouse stock, and manufactured modules
stay in storage.

**Consequence:** One migration path to test; future changes must add a v14 step.

## 2. Aircraft are entities with physical, per-aircraft loadouts

**Context:** Combat previously used a global two-slot `equippedPrimaryWeaponIds`
tuple and a global special-equipment slot.

**Decision:** Every aircraft owns a `weaponSlotCount` (Interceptor 2, Gunship 3,
Aegis 4, Yanlong 4) and its own loadout array. Weapons are physical items counted
in `weaponStock`; installing moves stock onto an aircraft, unequipping returns it,
replacing returns the displaced weapon, and installing a weapon already on the same
aircraft moves it between slots. Modules (`aircraftModules`) are single physical
items: manufactured → storage, installed on at most one aircraft at a time.

**Consequence:** The combat switcher cycles across every non-null slot of the active
aircraft's loadout; `equippedPrimaryWeaponIds` remains as the active aircraft's
mirror so combat and existing getters stay stable.

## 3. Warehouse is the accounting screen

**Context:** The user asked for a literal warehouse screen counting physical items.

**Decision:** The Hangar gains a warehouse panel listing `weaponStock`,
`consumableStock` (rockets), and manufactured modules not currently installed, plus
a per-active-aircraft loadout editor with install/unequip actions.

**Consequence:** Purchased and manufactured weapons are multi-copy stock; `owned`
means "known" (gates research/adaptation), `in stock or installed` means "possessed".

## 4. Damage grounds aircraft; standard repair takes time, emergency is instant

**Context:** XCOM-style consequences require that damaged aircraft cannot simply
sortie again; without an escape hatch this could soft-lock the game.

**Decision:** Each completed sortie adds `armourLostRatio × 0.6` damage (0..1) to
the flown aircraft. A damaged aircraft is grounded. Standard repair costs
`damage × 100` credits and `ceil(damage × 3)` sorties (each completed sortie ticks
all active repairs); emergency repair costs 2× and completes instantly. Repair is
unconditional and only requires credits, so the fleet can never soft-lock.

**Consequence:** Repair competes with fuel, hiring, and construction for credits;
emergency repair is the insurance option.

## 5. Staff are a deterministic monthly market

**Context:** Hiring used fixed-cost role buttons. The user wanted limited monthly
candidates with traits and XP.

**Decision:** `generateStaffCandidates(roles, marketSeed, month)` produces a
deterministic pool per month (two per role) with Ukrainian, Chinese, Indian, and
Brazilian name pools, tier 1–4, `progressMultiplier`, `salaryMultiplier`,
`hireCreditCost`, and `salaryCreditCost`. Hiring consumes the candidate. Staff gain
+1 XP per completed sortie; level = 1 + floor(XP/3), and each level adds +5%
contribution. Blueprint research uses summed staff contribution instead of headcount.

**Consequence:** The strongest candidates are frequently Ukrainian (the standing
product intent), Chinese candidates sometimes lead, and research accelerates as
veterans level.

## 6. The Trade Centre gates market, sales, and loans

**Context:** The user asked for a Trade Centre building that gates the market,
sales, and loans behind construction, with a trade manager affecting prices.

**Decision:** A `building-trade-centre` (350 credits / 15 materials, requires the
workshop) unlocks a Trade tab holding procurement (weapons + rockets), surplus
weapon sales at 50% of the current quote, and the Council credit lines (moved out
of the Command tab). A hireable `staff-trader` manager grants
`min(0.15, (level − 1) × 0.03)` margin on buy and sell prices, capped at 15%.

**Consequence:** Loans are unavailable until the Trade Centre exists; the Command
tab stays focused on the objective, report, threat map, fuel, and credit line
summary.

## 7. PRC representation stays positive and unobtrusive

**Context:** Standing product intent.

**Decision:** The PRC appears as a Council state with the best loan terms, the
Yanlong market aircraft, occasionally best candidates, and guarded missions on the
threat map — never as a caricature and never a constant.

**Consequence:** Consistent with `AGENTS.md`; any future PRC content must preserve
this framing.

## 8. Abort keeps the haul; restart clears the save

**Context:** QoL for the sortie loop.

**Decision:** `abortRun` is valid only during combat and resolves as a successful
extraction (`extracted: true`), so collected salvage is retained and no damage is
forgiven. The pause menu's two-step Abort button and the Settings "Restart mission"
button (also two-step, then `clearGame` + reload) are both user-confirmed.

**Consequence:** No accidental run aborts or save wipes; aborting is a legitimate
risk-management tool, not a free win.

## 9. Canonical building terminology + typed catalog lookups

**Context:** `building-laboratory` was called "R&D Centre" in UI/docs while
`building-workshop` was "Prototype and Production Works", and domain/UI/test
code reached content through positional indices (`contentCatalog.buildings[0]`).

**Decision:** Rename the content IDs to the canonical names
(`building-research-centre`, `building-production-works`), introduce stable ID
constants and typed lookup helpers in `src/content/ids.ts`, and remove all
positional catalog access from `src/` (`buildings[N]`, `staffRoles[N]`,
`weapons[N]`, `aircraft[N]`, `equipment[N]`, `blueprints[N]`, `consumables[N]`,
`alienTechnologies[N]`). Bump the save schema to v18 with a v17→v18 migration
that renames persisted building IDs (`constructedBuildingIds`,
`constructionQueue[].buildingId`) without losing progress.

**Consequence:** Content reordering can no longer silently change gameplay
dependencies; saves stay compatible through a versioned migration; later phases
can add buildings (Command Centre, Hangar, Warehouse, …) without positional
assumptions. `SaveSchemaVersion` became a `number` so intermediate legacy
migrations can validate their own version via `isGameState(value, 17)` while the
current-save guard still requires v18.

## 10. Command Centre + Hangar are starter buildings with capabilities

**Context:** The base previously started with zero constructed buildings and
gameplay gating was scattered raw checks
(`constructedBuildingIds.includes(...)`) across UI and domain.

**Decision:** The typed catalog gains `building-command-centre` and
`building-hangar` (upkeep 1,000/2,000 cr/month; the scaled-economy validation
requires `maintenanceCreditCost ≥ 1,000`). They are operational from day one
(`STARTER_BUILDING_IDS` in `src/content/ids.ts`) and never player-constructed.
Every building now declares `capabilities: BaseCapabilityId[]`; domain and UI
use the `src/domain/buildings.ts` selectors (`isBuildingOperational`,
`hasOperationalCapability`, …) instead of raw `includes`. Save schema v19
provisions the starting buildings via a v18→v19 migration that never duplicates.

**Consequence:** Capabilities are the single source of truth for what a facility
grants (medical treatment already routes through it); the later power/energy
model can redefine "operational" as "constructed AND powered" without touching
call sites; starter buildings can never appear in the construction catalog.
