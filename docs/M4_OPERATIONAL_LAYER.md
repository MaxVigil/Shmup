# M4 operational layer — design map

This document is the repository-resident design map for the M4 operational layer: the
fleet, Command Centre, pilots, personnel economy, weapon branches, and hybrid
aircraft. It is the parent contract; each slice gets a focused contract document
before implementation. This map is written at design altitude — structure, decisions,
and prototype starting numbers — not as a final specification.

## Product direction

The base grows from a single-aircraft operation into a small private military
company. The player manages multiple aircraft in an expandable hangar, reads a
Command Centre that shows where the aliens attack, hires pilots with specialisations
and progression, and keeps salaried specialists employed by flying profitable
sorties. Terrestrial weapons grow through branch trees, and the Quarantine adaptation
loop eventually produces hybrid Earth-alien aircraft.

## Standing durable constraints

- The PRC plays a key positive role; **Chinese becomes a playable language** to
  promote that role. Chinese staff appear and are occasionally the best in their field.
- Ukraine is a technology-innovation leader; the strongest hireable specialists often
  come from Ukraine.
- Russia does not exist in the game's world.
- No real-world waiting timers anywhere. All time is sortie- or action-based.

## In-game time model — the month

- A **month** is a fixed number of completed sorties (prototype: **6**). There is no
  real-world clock.
- Each month has three phases:
  1. **Planning** — the Command Centre shows a fresh threat map (which Council states
     are attacked), the market refreshes, and the player hires/fires, buys hangar
     slots or aircraft, assigns pilots, refuels, and buys/sells.
  2. **Execution** — the player flies the month's sorties; base actions remain
     available between sorties.
  3. **Settlement** — after the Nth sortie: monthly salaries are paid, the threat map
     regenerates, the market refreshes, and the month counter advances.
- If the reserve cannot cover salaries at settlement, staff may leave and the deficit
  can cascade into the existing insolvency (mandate revoked) rule.
- Research, XP, and blueprint progress remain sortie-driven as today.

## Domain state model (big picture)

Additions to the persisted base state, by concern:

```ts
interface BaseState {
  // ... existing fields ...

  month: number;                                    // P2, sortie-counted calendar
  fleet: readonly AircraftInstance[];               // P1
  hangarSlots: readonly (string | null)[];          // P1, starts with two slots
  activeAircraftId: string | null;                  // P1, the aircraft that flies
  fuelState: Record<string, boolean>;               // P2, fueled per aircraft
  threatMap: readonly MissionState[];               // P2, regenerated per month
  pilots: readonly PilotInstance[];                 // P3
  pilotAssignments: Record<string, string>;         // P3, aircraftId -> pilotId
  staff: readonly StaffMemberState[];               // P4, enriched
  monthlySalaryDebt: number;                        // P4, settled at month end
  weaponBranchRanks: Record<string, Record<string, number>>; // P5
  hybridAircraftProgress: readonly string[];        // P6
}

interface AircraftInstance {
  id: string;
  definitionId: string;          // AircraftDefinition from content
  hullUpgradeRanks: Record<string, number>;  // optional per-airframe branches
  fueled: boolean;               // P2
  assignedPilotId: string | null; // P3
}

interface PilotInstance {
  id: string;
  firstName: string;
  lastName: string;
  portraitId: string;            // placeholder avatar for now
  specializationId: string;      // e.g. weapon-family affinity
  level: number;
  xp: number;
}

interface StaffMemberState {
  id: string;
  roleId: string;                // scientist / engineer / ...
  firstName: string;
  lastName: string;
  portraitId: string;
  tier: number;                  // drives skill and salary
  specializationId: string;      // e.g. machine guns, containment, airframe
}

interface MissionState {
  id: string;
  targetCountryId: string;       // Council state, incl. PRC and Ukraine
  threatLevel: number;           // scales rewards and enemy pressure
}
```

Aircraft definitions are typed content: base armour, speed and damage multipliers,
slot size, market price range, refuel cost, and later hull-upgrade branches.

## Slice plan and dependencies

Each slice: domain rules + content + UI + i18n (uk/en/zh) + tests + schema migration
+ contract doc, developed on `test`, playtested, then merged to `main`.

| # | Slice | Content | Schema |
|---|-------|---------|--------|
| P0 | Chinese language | Third locale `zh` in the typed catalogue and settings | — |
| P1 | Fleet and hangar | Aircraft definitions, two starting slots, buyable slots, market purchases, active aircraft; combat reads its stats | v10 |
| P2 | Command Centre and fuel | Threat map, missions, refuel costs, launch gate (fueled + pilot), month counter | v11 |
| P3 | Pilots | Hire, specialisations, XP/levels → aircraft boosts, assignment | v12 |
| P4 | Personnel economy | Enriched staff (names/portraits/tiers), monthly salaries, sell materials/artifacts, Chinese and Ukrainian name pools | v13 |
| P5 | Weapon branches | Per-terrestrial-weapon trees: power, rate, secondary effects | v14 |
| P6 | Hybrid aircraft | Research + manufacture of Earth-alien aircraft via the Quarantine loop | v15 |

Dependencies: pilots require the fleet (assignment) and Command Centre (missions), so
P1/P2 precede P3. The month economy (P4) depends on pilots and the month counter.
P5 and P6 are independent and come last.

## Economy skeleton (prototype numbers)

All values are first-pass placeholders for playtest tuning, not final balance.

- Month length: 6 completed sorties.
- Monthly salaries (prototype): scientist 60, engineer 90, lead engineer 140, pilot
  70, scaled by tier.
- Market sell rates: 1 material ≈ 4 credits; a preserved artifact sample sells for a
  large lump (≈250 credits) but sacrifices the research sample.
- Aircraft: light interceptor ≈ 900 credits, heavier gunship ≈ 1500 credits; an extra
  hangar slot ≈ 1200 credits.
- Refuel: ≈ 40 credits per sortie per aircraft.
- Pilot XP: +2 per extracted sortie, +1 per failed sortie, +1 per Warden destroyed.
  Level thresholds are rising (3, 6, 10, 15, 21, …). Each level grants a small boost
  to the assigned aircraft (≈+2% damage, capped at +20%).

## Save trajectory

- v10: fleet, hangar slots, active aircraft.
- v11: month, fuel, threat map.
- v12: pilots, assignments.
- v13: enriched staff, salaries.
- v14: weapon branch ranks.
- v15: hybrid aircraft progress.

Each bump ships a versioned migration from the previous schema; older saves migrate
forward preserving progress.

## Confirmed design decisions

1. **Time model B**: the month is a sortie counter; salaries are settled monthly;
   insolvency applies if the reserve cannot cover settlement.
2. **Selling an artifact** sacrifices the research sample — a deliberate
   knowledge-versus-money choice.
3. **XP and threat generation are deterministic** (seeded RNG + sortie counts); no
   real-world timers.
4. **Combat uses the active aircraft's stats** instead of fixed player constants.

## Per-slice contract documents

`docs/P1_FLEET.md`, `docs/P2_COMMAND.md`, `docs/P3_PILOTS.md`,
`docs/P4_PERSONNEL_ECONOMY.md`, `docs/P5_WEAPON_BRANCHES.md`,
`docs/P6_HYBRID_AIRCRAFT.md` — each written immediately before its slice starts,
following the repository convention.

