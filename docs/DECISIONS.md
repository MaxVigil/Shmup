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

## 11. Arsenal taxonomy: classes, technology families, mounts, kinds

**Context:** The arsenal grew ad hoc: flat weapon entries with `origin: 'earth' |
'alien'`, a separate flat upgrade list, and no mount/slot/energy/weight model.

**Decision:** Adopt the three-class taxonomy (`human` / `hybrid` / `alien`),
technology families (`human-kinetic` / `hybrid-laser` / `hybrid-plasma` / `alien`),
mounts (`primary` ×1–3 auto-fire, `hardpoint` ×1–5 non-auto), and kinds (`weapon` /
`auxiliary` / `module` / `consumable`). Weapons split into family + concrete Mark
items (`weapon-autocannon` family → `weapon-autocannon-mk-4` item). Upgrade-chain
length is data-driven, not hardcoded.

**Consequence:** New weapons are data entries in the catalog; reclassifying existing
items requires a save migration; `docs/WEAPONS_EPIC.md` is the canonical contract.

## 12. Weight and energy are hard loadout limits

**Context:** The player wanted a real loadout puzzle and a secondary cost beyond credits.

**Decision:** Every weapon/auxiliary/module has `weight`; consumables have
`weightPerUnit`; every aircraft has `carryingCapacity` and `reactorCapacity`.
Installed weight (plus loaded ammunition) must not exceed carrying capacity;
installed energy draw must not exceed reactor capacity. Both are hard limits.

**Consequence:** Loadout is a constrained optimisation; the Hangar UI must surface
both gauges and block overloads; validation guards both invariants.

## 13. Multipliers stack, with a guard

**Context:** Aircraft must differ noticeably; a one-slot aircraft should hit hard
(Japan "glass cannon").

**Decision:** Final damage = weapon.damage × (base + Σ mark deltas) × slot
concentration bonus × pilot multiplier × (1 + Σ module bonuses). Marks and modules
are additive inside their groups; only three large multiplicative layers remain
(aircraft base, slot bonus, pilot). A guard test fails CI if any final multiplier
exceeds 2.0.

**Consequence:** Japan (1.45 base × 1.25 slot bonus) reaches 1.81 effective damage;
runaway compounding is caught in CI.

## 14. Aircraft roles and Mark philosophy

**Context:** Upgrades must not homogenise the fleet.

**Decision:** Each aircraft has a role (`glass-cannon`, `gunship`, `bruiser`,
`precision`, `duelist`, `interceptor`, `workhorse`). Mark II/III stat deltas are
additive and reinforce the role (Japan gains damage/energy, never armour; US gains
armour/hardpoints/capacity, never speed). The slot concentration bonus stacks on top.

**Consequence:** Aircraft remain distinct at every stage of progression.

## 15. Hardcore destruction: weapons lost, pilot dies; Abort saves

**Context:** The player asked to make the game "a little hardcore".

**Decision:** If an aircraft is destroyed (armour reaches 0), all weapons installed
on it are irreversibly lost and the pilot dies. A proactive Abort saves the
aircraft, weapons, and pilot, but forfeits the sortie bounty and nation gift
(existing rule). Alien equipment is never manufacturable, so its loss is final.

**Consequence:** Destruction has real permanence; defeat logic must strip the
installed loadout and kill the pilot.

## 16. Stun replaces the Capturer

**Context:** Recovering alien technology previously required destroying the elite
while carrying the Alien Technology Capturer.

**Decision:** Option A: a Stun module disables an elite/boss; stunning is the ONLY
way to recover an alien sample for research (→ hybrid weapons, upgrades,
adaptations). The Capturer device is removed.

**Consequence:** M2 core-loop documentation and preflight special-equipment gating
change; the Capturer blueprint/equipment is removed or converted.

## 17. Ukrainian drones and finite ammunition

**Context:** Ukraine is a drone leader in the game's world; rockets were the only
consumable.

**Decision:** All rocket/mine/drone ordnance shares one finite-ammunition system:
Engineering produces ammunition, the player loads it before a sortie, it has weight
and is really consumed. Ukrainian attack drones are cheap and light (50–100 per
sortie); behaviour: nearest enemy → ram + area explosion; no enemy → circle the
aircraft. A Heavy Combat Drone (permanent wingman) is a separate, expensive idea
(E5.3 backlog).

**Consequence:** A unified consumable/production pipeline covers rockets, homing
missiles, torpedoes, cluster missiles, mines, drones, and decoys.

## 18. Enemy homing threats and decoys

**Context:** Flares/decoys need a real threat to counter.

**Decision:** Add two deterministic homing missile types from the accepted draft:
Pursuit Missile (Gunship, speed 220, 70°/s turn, 24 dmg, 6 s) and Warden Seeker
(Warden, 185, 115°/s turn, 38 dmg, 8 s). Flares/decoys redirect them; point
defence, dash, and sharp lateral movement are also counters.

**Consequence:** Decoy values (lifetime, attraction radius, charges) get a concrete
threat to balance against; homing stays dodgeable via limited turn rate.

## 19. Capturer removed: stun is the only alien-recovery path (implemented)

**Context:** Decision #11 chose the stun-Capturer model with the Capturer device kept
as a transitional fallback.

**Decision:** The Alien Technology Capturer is fully removed from the shipped build —
catalog (`blueprints`/`equipment` are empty), `content/ids.ts`, CombatScene recovery
gating, the Research/Engineering UI, template, i18n (en/uk/zh), and the store's
blueprint telemetry gate. Stunning the Warden is the only way to recover alien
technology. Legacy saves that still carry the old Capturer ids keep their content
(`hadCapturerProgress` still derives `telemetryRecorded` from them); the generic
`equippedEquipmentId` / `manufacturedEquipmentIds` state and
`EQUIP_SPECIAL_EQUIPMENT` / `MANUFACTURE_EQUIPMENT` commands remain as
future-proof infrastructure for a later equipment item.

**Consequence:** `progression-guidance` routes workshop + telemetry directly to
artefact recovery → containment → adaptation; the Warden "destroyed without recovery"
ending reads `combat.wardenDestroyedNoRecovery`. Legacy saves are compatible without a
new schema bump.

## 20. E3.4c: recovered alien primaries are combat-ready; proximity mines

**Context:** The three alien primary weapons existed only as weapon-family data
(`weaponFamilies`, no marks, no market price) but could not be fired — `CombatScene`
resolved primaries through the legacy `catalog.weapons` and needed a `visualProfile`
to render them. The mine auxiliary from the content set had no catalog entries or
behaviour.

**Decision:** Add the alien primaries to the legacy `contentCatalog.weapons` with
dedicated `visualProfile`s (`alien-lance`, `alien-orb`, `alien-singularity`) and
`penetration: 'all-targets'`; combat renders them with distinct projectiles and
piercing. Add `aux-proximity-mine` (type `mine`, hardpoint, manual trigger) with
finite ammunition `consumable-proximity-mine`: a deployed mine drifts slowly upward
and detonates in an area blast when an enemy enters its proximity radius. Both use
the shared ammo-consumption/settlement path. Alien items remain `alien-recovery`
acquisition with no market price (never manufactured or sold).

**Consequence:** E3 closes with the full auxiliary type set firing (rocket, homing,
torpedo, cluster, drone, stun, decoy, mine) and the alien power tier usable in
flight (via the `?alienReady=true` playtest profile) ahead of E4's acquisition and
destruction semantics.
