# Weapons & Arsenal epic — design contract

Living product contract for the Weapons epic (E0–E5), locked during the brainstorm
rounds of 2026-08-17/18. This document is the source of truth for the arsenal:
taxonomy, content set, schemas, loadout model, and balance invariants. Durable
decisions are recorded in `docs/DECISIONS.md` (#11+); execution contract and
progress live in `docs/PLAN.md` / `docs/STATUS.md`.

All numbers below are first-pass placeholders to be balanced through playtesting.

## 1. Product intent

- Every loadout decision matters: weapons differ in attack geometry and role, not
  just DPS; aircraft differ in identity, not just slot count.
- Sorties carry hardcore stakes: destruction is permanent; Abort is the safe exit.
- Risk-versus-knowledge stays the core loop: stunning an elite is the only way to
  recover alien technology.

## 2. Locked taxonomy

### Classes (how you obtain + upgrade rules)

| Class | Manufacture | Upgrade | Acquisition | Notes |
| --- | --- | --- | --- | --- |
| `human` | yes (research → production) | yes (short branches) | start / market / research-production | Recovery Council arsenal |
| `hybrid` | yes (R&D invents, Engineering manufactures) | yes (short branches) | research-production | needs an alien sample |
| `alien` | **no** | **no** | alien-recovery (stun) | permanent once acquired; lost if the carrying aircraft is destroyed |

### Technology families

`human-kinetic` · `hybrid-laser` · `hybrid-plasma` · `alien`

Power curve: **Human < Laser < Plasma < Alien**. A fully refined human weapon
(Autocannon Mk VI) must remain final-boss viable.

### Mounts and kinds

- `primary` ×1–3 — auto-fire, switch with `X`; count varies by aircraft model.
- `hardpoint` ×1–5 — non-auto items; count varies by aircraft model/Mark.
- Kinds: `weapon` (primary) · `auxiliary` (hardpoint, active/consumable) ·
  `module` (hardpoint, passive) · `consumable` (ammunition, not a slot).
- Auxiliary types: `rocket` · `homing` · `torpedo` · `cluster` · `drone` · `stun` ·
  `mine` · `decoy`.
- Module types: `shield` · `dash` · `targeting` · `repair` · `reflector` · `other`.

## 3. Content set (target catalog, first-pass)

| Category | Count | Items |
| --- | --- | --- |
| Weapons (primary) | 12 | 6 human (Autocannon, Heavy Autocannon, Gatling, Scatter Cannon, Railgun, Flak), 3 hybrid (Pulse Laser, Plasma MG, Plasma Cannon), 3 alien (Disintegration Lance, Plasma Orb Projector, Singularity Projector) |
| Auxiliary | 6 | Rocket Pod, Homing Missile Rack, Heavy Torpedo Launcher, Cluster Missile Pod, Ukrainian Drone Swarm, Stun Module |
| Modules | 6 | Energy Shield, Directional Shield, Dash, Targeting Computer, Repair Nanobots, Reflector Field |
| Consumables | 5 | Rocket, Homing Missile, Heavy Torpedo, Cluster Missile, Ukrainian Attack Drone |
| Ideas | 23 | new behaviours → triage in E5.3 |

### Reuse mapping (do not duplicate existing code)

- Pulse Cannon → **Autocannon** (starting machine gun).
- Impulse Accelerator → **Railgun**.
- Canister Aircraft Cannon → **Scatter Cannon**.
- Rocket Pod → **hardpoint auxiliary** (manual fire).
- Split Pulse Emitter → **hybrid-laser progression** (reuse dual-emitter behaviour;
  the Prism sample still unlocks the first laser family through alien recovery).

## 4. Schemas (W1 target)

```ts
type LocalizedText = { readonly en: string; readonly uk: string; readonly zh: string };
type WeaponClass = 'human' | 'hybrid' | 'alien';
type TechnologyFamily = 'human-kinetic' | 'hybrid-laser' | 'hybrid-plasma' | 'alien';
type MountType = 'primary' | 'hardpoint';
type Kind = 'weapon' | 'auxiliary' | 'module';
type AuxiliaryType = 'rocket' | 'homing' | 'torpedo' | 'cluster' | 'drone' | 'stun' | 'mine' | 'decoy';
type ModuleType = 'shield' | 'dash' | 'targeting' | 'repair' | 'reflector' | 'other';
type Penetration = 'single-target' | 'all-targets';
type Acquisition = 'start' | 'market' | 'research-production' | 'alien-recovery';

interface WeaponStatOverrides {
  readonly damage?: number;
  readonly shotsPerSecond?: number;
  readonly projectileCount?: number;
  readonly projectileSpeed?: number;
  readonly spreadDegrees?: number;
  readonly energyDraw?: number;
  readonly weight?: number;
}

interface MarkDefinition {
  readonly mark: number;                       // 2..N; Mark I = the base item
  readonly researchCostCredits: number;
  readonly productionCostCredits: number;
  readonly productionCostMaterials: number;
  readonly statOverrides: WeaponStatOverrides; // numeric and executable
  readonly flavour: LocalizedText;
}

interface WeaponFamilyDefinition {
  readonly id: string;                         // 'weapon-autocannon'
  readonly name: LocalizedText;
  readonly class: WeaponClass;
  readonly technologyFamily: TechnologyFamily;
  readonly mount: 'primary';
  readonly kind: 'weapon';
  readonly baseStats: {
    readonly damage: number;
    readonly shotsPerSecond: number;
    readonly projectileCount: number;
    readonly projectileSpeed: number;
    readonly spreadDegrees: number;
    readonly penetration: Penetration;
  };
  readonly weight: number;
  readonly energyDraw: number;
  readonly acquisition: Acquisition;
  readonly tier: number;
  readonly marks: readonly MarkDefinition[];   // alien ⇒ []
  readonly flavour: LocalizedText;
}
// Concrete manufactured item id: `${family.id}-mk-${mark}`; stats = baseStats + statOverrides.
```

```ts
interface AuxiliaryDefinition {
  readonly id: string;
  readonly name: LocalizedText;
  readonly class: WeaponClass;
  readonly technologyFamily: TechnologyFamily;
  readonly mount: 'hardpoint';
  readonly kind: 'auxiliary';
  readonly type: AuxiliaryType;
  readonly ammoConsumableId: string | null;    // null for stun
  readonly chargesPerSortieMin: number;
  readonly chargesPerSortieMax: number;
  readonly trigger: 'manual' | 'automatic';
  readonly damage: number;
  readonly areaRadius: number;
  readonly stunDurationSeconds: number;
  readonly weight: number;
  readonly energyDraw: number;
  readonly acquisition: Acquisition;
  readonly flavour: LocalizedText;
}

interface ModuleDefinition {
  readonly id: string;
  readonly name: LocalizedText;
  readonly class: WeaponClass;                 // may be 'alien' (recovered)
  readonly technologyFamily: TechnologyFamily;
  readonly mount: 'hardpoint';
  readonly kind: 'module';
  readonly type: ModuleType;
  readonly weight: number;
  readonly energyDraw: number;
  readonly effect: { readonly description: string; readonly params: Record<string, number> };
  readonly acquisition: Acquisition;
  readonly flavour: LocalizedText;
}

interface ConsumableDefinition {
  readonly id: string;
  readonly name: LocalizedText;
  readonly weightPerUnit: number;
  readonly costCredits: number;
  readonly usedBy: readonly string[];          // auxiliary ids
}
```

## 5. Aircraft layer (final)

```ts
type AircraftRole =
  | 'glass-cannon'   // Japan  — max damage, fragile
  | 'gunship'        // US     — max armour + hardpoints, slow
  | 'bruiser'        // Britain — endurance
  | 'precision'      // Germany — accuracy + armour
  | 'duelist'        // France  — agility + accuracy
  | 'interceptor'    // PRC     — speed + reactor
  | 'workhorse';     // India   — balanced, cheap

interface AircraftMultipliers {
  readonly damageMultiplier: number;
  readonly fireRateMultiplier: number;
  readonly accuracyMultiplier: number;
}

interface AircraftBaseStats {
  readonly armour: number;
  readonly speedMultiplier: number;
  readonly baseMultipliers: AircraftMultipliers; // identity, hand-set
}

interface AircraftLoadoutModel {
  readonly primarySlots: 1 | 2 | 3;
  readonly hardpointSlots: number;
  readonly reactorCapacity: number;             // energy, scale 1–10
  readonly carryingCapacity: number;            // weight
}

interface AircraftMarkUpgrade {
  readonly mark: 2 | 3;
  readonly name: LocalizedText;
  readonly statDeltas: {                        // additive to base, role-aligned
    readonly armour?: number;
    readonly speedMultiplier?: number;
    readonly damageMultiplier?: number;
    readonly fireRateMultiplier?: number;
    readonly accuracyMultiplier?: number;
    readonly reactorCapacity?: number;
    readonly hardpointSlots?: number;
    readonly carryingCapacity?: number;
  };
  readonly researchCostCredits: number;
  readonly productionCostCredits: number;
  readonly productionCostMaterials: number;
  readonly flavour: LocalizedText;
}

interface AircraftDefinition {
  readonly id: string;
  readonly name: LocalizedText;
  readonly role: AircraftRole;
  readonly baseStats: AircraftBaseStats;
  readonly loadout: AircraftLoadoutModel;       // replaces weaponSlotCount
  readonly marks: readonly AircraftMarkUpgrade[]; // [] for base models
}
```

Slot concentration bonus is **derived** from `primarySlots` (formula, stacking):

| primarySlots | fire× | damage× | accuracy× |
| --- | --- | --- | --- |
| 1 | 1.20 | 1.25 | 1.15 |
| 2 | 1.05 | 1.05 | 1.05 |
| 3 | 1.00 | 1.00 | 1.00 |

| Aircraft | Role | Armour | Speed× | dmg×/fire×/acc× (base) | 1° slots | hardpoints | reactor | capacity | **Final dmg×** |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| India | workhorse | 80 | 1.15 | 0.95/1.00/1.00 | 2 | 2 | 12 | 15 | 0.9975 |
| Britain | bruiser | 125 | 0.92 | 1.15/0.95/1.05 | 3 | 4 | 16 | 25 | 1.15 |
| PRC (Yanlong) | interceptor | 90 | 1.30 | 1.05/1.10/1.00 | 2 | 3 | 14 | 18 | 1.1025 |
| Germany | precision | 135 | 1.00 | 1.10/1.00/1.10 | 3 | 4 | 17 | 28 | 1.10 |
| US | gunship | 165 | 0.88 | 1.25/0.95/0.95 | 3 | 5 | 17 | 32 | 1.25 |
| France | duelist | 105 | 1.20 | 1.05/1.05/1.10 | 2 | 3 | 14 | 19 | 1.1025 |
| Japan | glass-cannon | 100 | 1.10 | 1.45/1.05/1.10 | 1 | 2 | 13 | 16 | **1.8125** |

Final damage multiplier = base × slot bonus (Japan 1.45 × 1.25 = 1.8125).

### Aircraft Mark II/III (role-aligned additive deltas, draft)

| Aircraft | Mark II emphasis |
| --- | --- |
| Japan | damage +0.10, reactor +2; armour does NOT grow (→ 1.55 × 1.25 = 1.94) |
| US | armour +25, hardpoint +1, capacity +8; speed does NOT grow |
| Britain | armour +20, capacity +8 |
| Germany | accuracy +0.05, damage +0.05 |
| France | speed +0.08, accuracy +0.05 |
| PRC | speed +0.08, reactor +2 |
| India | all stats +0.02 (small all-round bump) |

## 6. Energy

- Scale (integer 1–10): `human-kinetic` 1–2 · `hybrid-laser` 3–5 · `hybrid-plasma` 6–8 · `alien` 4–9.
- Hard limit: `Σ energyDraw (installed) ≤ reactorCapacity`.
- Reactor capacities are intentionally below the combined demand of a Plasma Cannon +
  Plasma Machine Gun + Energy Shield, forcing loadout trade-offs.

## 7. Weight

- Hard limit: `Σ installed weight + Σ (ammo × weightPerUnit) ≤ carryingCapacity`.
- 100 Ukrainian drones ≈ 6.0 weight — meaningful on light aircraft (15–19), almost free
  on heavy ones (25–32).

## 8. Canonical damage formula

```
effectiveDamage =
  weapon.damage                                    // Mark item stat
  × (aircraft.baseDamageMultiplier + Σ markDeltas) // additive inside the aircraft
  × slotConcentrationBonus.damage                  // single multiplier from slots
  × pilot.damageMultiplier                         // single pilot multiplier
  × (1 + Σ moduleDamageMultipliers)                // modules additive, small
```

- Marks and modules are additive inside their own group.
- Only three large multiplicative layers remain: aircraft (base + marks), slot bonus, pilot.
- **Guard test:** CI fails if any aircraft × slot bonus × pilot final multiplier exceeds 2.0.

## 9. Stun-Capturer (option A) — implemented (E3.2a + E3.2b)

- A Stun module disables an elite/boss; stunning is the ONLY way to recover an alien
  sample for research (→ hybrid weapons, upgrades, adaptations).
- The Alien Technology Capturer device is removed.

## 10. Hardcore rules

- Aircraft destroyed (armour reaches 0) → all weapons installed on it are irreversibly
  lost and the pilot dies.
- Abort saves the aircraft, weapons, and pilot, but forfeits the sortie bounty and the
  nation gift (existing rule).
- Alien equipment is never manufacturable → its loss is final.

## 11. Ukrainian drones

- Consumable, deliberately cheap and light: 50–100 can be loaded per sortie.
- Behaviour: if ≥1 enemy is on screen, a drone flies to the nearest enemy, rams it and
  explodes with area damage; if no enemy is present, it circles the player's aircraft.
- Deterministic target selection (distance, tie-break by id/angle); a cap on concurrent
  drones for performance; playtesting required.

## 12. Enemy homing threats + decoys

- **Pursuit Missile** (Gunship): speed 220, turn 70°/s, dmg 24, life 6 s, volley 2,
  interval 0.22 s. Counterplay: lateral manoeuvre, dash, point defence, flares.
- **Warden Seeker** (Warden): speed 185, turn 115°/s, dmg 38, life 8 s, volley 3,
  interval 0.35 s. Counterplay: flares/decoys strongly preferred.
- Flares/decoys redirect homing missiles; decoy lifetime ~4 s, attraction radius ~160,
  charges 3–6 (draft, to balance against the threats above).

## 13. Finite ammunition

- One shared system: Engineering produces ammunition → the player loads it before a
  sortie → it is really consumed and counts towards weight.
- Covers rockets, homing missiles, torpedoes, cluster missiles, mines, drones, decoys.

## 14. Work breakdown (E0–E5)

- **E0** design contract (this file) — complete.
- **E1** schema + data: `model.ts`, catalog import + numeric Mark overrides, `ids.ts`,
  validation, save v20 migration, i18n, generator + index-navigator.
- **E2** loadout & economy: hardpoints + weight/energy UI, finite ammunition,
  aircraft Mark II/III.
- **E3** combat systems: vertical slice → stun (replaces Capturer) → auxiliary →
  drones/mines → homing/decoys → alien.
- **E4** hardcore + progression: destruction semantics, variable Marks, balance
  invariants (power curve + multiplier guard).
- **E5** balance, playtest rounds, backlog triage (23 ideas).

## Definition of done

Every E-task closes only when `npm run lint`, `npm run typecheck`, `npm test`, and
`npm run build` pass, and `docs/PLAN.md` / `docs/STATUS.md` are updated.
