# Missions & UX/UI epic — design contract

Living product contract for the missions + UX/UI iteration v0.2, approved 2026-08-18.
Grounds on the product design spec `UX_UI_MISSIONS_ITERATION_v0.2` and the buildcraft
product intent (DECISIONS #25). Durable decisions: `docs/DECISIONS.md`. Execution
contract and progress: `docs/PLAN.md` / `docs/STATUS.md`. This file is the source of
truth for the canonical mission/aircraft state model and the implementation sequence.

## §0. Reachability rule (playability gate)

The hard lesson from the weapons epic: content a human cannot reach, see, use, and get
a result from is not done. Every iteration below therefore ships a **player-facing
result**, not just domain/data.

- An iteration is done only when a human can, from the normal UI in at most three
  clicks and without debug flags: **reach → see → do → see the result**.
- Five common-sense checks per feature:
  1. **Reachability** — a visible entry point exists (a button, a route), never a
     feature with no path in.
  2. **Observability** — the effect is visible (state changed, number moved, feedback
     shown).
  3. **Interactivity** — the action actually runs the domain command, not a mock.
  4. **Round-trip** — the state survives save/load (schema migration intact).
  5. **Failure legibility** — a blocked/disabled action shows why and a route to fix it.
- A `?missionsReady=true` playtest profile provisions a ready fleet and the mission
  map so a human can verify new systems instantly.
- Every iteration adds a scripted human round to `docs/PLAYTEST.md` that proves
  reachability of its player-facing result.

## §1. Canonical state model

One model for mission and aircraft state, aligned with the design spec's marker states
(§4.2), instance availability (§7.1), and outcome taxonomy (§9.3). Three concerns stay
separate:

1. **Instance** — what a mission or aircraft is (content + seeded generation).
2. **Status** — where it is in the lifecycle (derived, never a parallel enum).
3. **Outcome** — how a mission ended (one immutable record).

### 1.1 Mission instance, status, outcome

```ts
type MissionType =
  | 'sweep' | 'interception' | 'escort' | 'defence' | 'recon'
  | 'recovery' | 'strike' | 'survival' | 'boss-hunt';

interface MissionInstance {
  readonly id: string;                 // stable; inherits legacy mission-<month>-<n>
  readonly definitionId: string;       // MissionDefinition (content)
  readonly type: MissionType;
  readonly targetCountryId: string;    // Council state only (incl. PRC, Ukraine)
  readonly regionId: string;
  readonly threatLevel: number;
  readonly seed: number;               // seeded RNG for modifiers/intel/objectives
  readonly modifierIds: readonly string[];
  readonly objectives: readonly ObjectiveInstance[];   // primary + optional
  readonly intel: readonly IntelFact[];
  readonly reward: RewardPreview;
  readonly failure: FailurePreview;
}

// Derived, not stored: single source of truth = activeMissionId + result records + month.
type MissionStatus = 'available' | 'active' | 'resolved' | 'expired';

// UI-only projections (not domain fields):
//   viewed  → persisted set `viewedMissionIds` (keeps the "new" badge across reloads)
//   urgent  → derived from expiry closeness / hard failure consequences

type MissionOutcomeKind =
  | 'success' | 'partial-success' | 'aborted'
  | 'objective-failed-extracted' | 'destroyed';

interface MissionResultRecord {
  readonly id: string;
  readonly missionInstanceId: string;
  readonly missionType: MissionType;
  readonly month: number;
  readonly aircraftInstanceId: string;
  readonly pilotId: string;
  readonly outcome: MissionOutcomeKind;
  readonly objectives: readonly ObjectiveResult[];
  readonly kills: number;
  readonly eliteKills: number;
  readonly damageTakenRatio: number;
  readonly consumablesSpent: Readonly<Record<string, number>>;
  readonly rewards: RewardLedger;
  readonly losses: LossLedger;
  readonly intelDiscovered: readonly IntelFact[];
}
```

Rules:

- `status` is **derived**: `activeMissionId` ⇒ active; a result record exists ⇒
  resolved; the month closed without a result ⇒ expired; otherwise available.
- Marker states on the map are projections of `status + viewed + urgent + outcome` —
  the UI never holds a separate lifecycle enum.
- `MissionResultRecord` is immutable and written once at settlement; it drives
  aircraft history, pilot history, Archive, reports, and Intel.

### 1.2 Aircraft instance

Replaces `hangarSlots: (aircraftDefinitionId | null)[]`:

```ts
interface AircraftInstance {
  readonly id: string;                 // stable unique instance id
  readonly definitionId: string;
  readonly callsign: string;
  readonly mark: number;
  readonly assignedPilotId: string | null;
  readonly loadout: AircraftLoadout;
  readonly damage: number;
  readonly repair: RepairState | null;
  readonly fueled: boolean;
  readonly status: 'ready' | 'damaged' | 'repairing' | 'destroyed';
  readonly historyId: string;          // → AircraftHistoryRecord
}
```

Permanent loss semantics (design spec §2.3): on destruction the instance is removed
from the active fleet, the bay is freed, the assigned pilot dies, installed equipment
and loaded consumables are lost, and only an immutable `AircraftHistoryRecord` moves to
Archive. A destroyed aircraft cannot be repaired, reactivated, or sold.

### 1.3 Mapping and migration (v20 → v21)

Do not change v20 in place; add schema v21. Legacy fields map as follows:

| Legacy (v20) | Target (v21) |
| --- | --- |
| `hangarSlots: (string \| null)[]` | `fleet: AircraftInstance[]` — one instance per occupied slot, stable generated id |
| `activeAircraftId` | sortie default = the ready instance selected at launch |
| `aircraftLoadouts/Modules/Hardpoints/Marks/Damage/Repair` | per-instance `loadout / damage / repair / mark` |
| `fueledAircraftIds` | per-instance `fueled` |
| `activePilotId` | `assignedPilotId` on the active aircraft only; other instances start unassigned |
| `threatMap: MissionState[]` | `missions: MissionInstance[]`, baseline `type: 'sweep'`, legacy id/country/threat preserved |
| `activeMissionId` | `status: 'active'` derivation |
| `resolvedThreatIds` | `status: 'resolved'` derivation |
| `nationThanks` | folded into `RewardLedger` at settlement |

Import rules: start history empty with `legacyImported: true`; never fabricate past
kills. Preserve stock, queues, research, staff, loans, and localization-independent ids.

## §2. Project additions

### 2.1 Durable constraints — light touch

Applied as standing context (AGENTS.md), kept loose; rebalancing is expected later:

- `targetCountryId` is always a Council state (including the PRC and Ukraine); no
  Russian actor ever appears as a faction, country, or label.
- The Market's human-start lane is the Chinese-sourced conventional-technology lane.
- The strongest hireable engineers/scientists/pilots are often Ukrainian; treat as a
  hiring trend, not a hard mechanical rule.
- Alien tech stays on the research/recovery path: Market never sells hybrid/alien or
  above-Mark-I human content.

### 2.2 i18n invariant

All new copy — briefing, Intel facts, capability chips, market cards, retreat warnings,
marker states — routes through the typed localization catalogue `src/i18n` in
Ukrainian, English, and Chinese. No hardcoded visible strings.

### 2.3 Entity reference vs Archive

The Databank stays a technical entity-reference page (content tables, regenerated by
`npm run entities`) reachable from **Settings**. The **Archive** is the in-game campaign
section (enemy intel, technology, aircraft/pilot records, reports). They do not merge.

## §3. Implementation sequence (iterations 0–11)

Each iteration ships a player-facing result. Definition of done per iteration:
`npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, plus a scripted human
round in `docs/PLAYTEST.md` proving the result is reachable.

| # | Iteration | Scope | Player-facing result (a human can …) |
|---|---|---|---|
| 0 | **Playability safety net** | Reachability checklist; `?missionsReady=true` profile | Reach the mission map + full fleet instantly for verification |
| 1 | **Domain foundation** | `AircraftInstance`, `MissionInstance`, `MissionResultRecord`, status derivation, schema v21 migration | See aircraft as instances (callsign, per-aircraft pilot, history stub); a destroyed aircraft leaves the fleet (bay free, Archive record) |
| 2 | **Information architecture** | 7 top-level sections; Finance→Market, Medical→Personnel, Warehouse→shared drawer, Databank→Settings | Navigate 7 sections; old tabs reachable as subsections/drawer, nothing orphaned |
| 3 | **Operations mission map + briefing** | Marker states, 7-question briefing, Intel confidence, compare-ready-aircraft | Click a mission → briefing shows objectives, known/unknown Intel, capability demands, reward/failure preview |
| 4 | **Hybrid preparation + readiness** | Compare, “Prepare in Hangar” with pinned mission context, final readiness check, blockers vs warnings | From briefing prepare a specific aircraft, return, and launch — loop works end-to-end |
| 5 | **Mission wave 1** | Sweep, Interception, Escort, Recon — data-driven objectives/phases; `MissionRuntimeConfig` into CombatScene | Launch different mission types and see distinct objective/failure logic in combat |
| 6 | **Retreat + outcome taxonomy** | Danger ladder, extraction sequence, retreat flow, 5 outcomes, explicit penalties | Request retreat → see ETA → survive withdrawal → settlement as `aborted` with visible penalties |
| 7 | **Intel loop** | `IntelFact` acquisition, briefing integration, Archive states | Complete a Recon → next briefing shows the revealed modifier with confidence |
| 8 | **Aircraft History + Archive** | Event-backed records, lost-aircraft archive, pilot records | See an aircraft's growing timeline; a lost aircraft lives on in Archive |
| 9 | **Market strengthening** | Rotation, stock, wishlist, compare-with-fleet | See offers rotate; wishlist highlights; compare a card with the fleet |
| 10 | **Mission wave 2/3** | Defence, Recovery, Precision Strike; then Survival, Boss Hunt | Each type exercises a distinct build test with distinct failure logic |
| 11 | **Balance + human playtests** | Cross-type balance; no single dominant machine | Verify different mission types demand different builds, with no one-size-fits-all aircraft |

Not deferred (they gate every later step): aircraft instances, per-aircraft pilot
assignment, outcome taxonomy, mission objectives/phases, hybrid preparation flow, and
permanent-loss semantics (design spec §15).

## Composition

Pairs with the `shmup` and `strategic-base-management` skills (buildcraft core), the
`game-ui-ux` skill (screen stack, focus, safe area, event-driven HUD), the
`save-systems` skill (versioned migration), and `docs/UXUI_EPIC.md` (accessibility
contract). Project-specific facts stay in `AGENTS.md`, typed content, and this contract.
