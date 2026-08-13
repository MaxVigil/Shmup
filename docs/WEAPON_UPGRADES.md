# Weapon upgrade branches — design backlog

Purpose: single design reference for every weapon upgrade branch (implemented + planned).
Companion to docs/ENTITIES.md (current data). Status markers: [x] implemented, [~] prototype, [ ] planned.

## Design rules for an upgrade branch

Every branch is a small tree on one weapon:
- Name — player-facing label.
- Requirements — which building, staff role, blueprint, and local production must exist.
- Research cost — credits spent to unlock the branch.
- Production cost — credits + materials to manufacture the upgrade once.
- Effect — numeric change (damage / cadence / projectiles / speed / spread) and optional secondary effect.
- Conflicts — whether branches are exclusive or stackable.
- Status — [x]/[~]/[ ].

Weapon primary stats are in docs/ENTITIES.md. Rebalance values here are prototypes for playtest.

---

## Pulse Cannon (machine gun)

Baseline: 10 dmg, 4 shots/s, single target.

### [x] Reinforced ammunition
- Requirements: laboratory + scientist.
- Research: 140 cr. Production: 90 cr + 4 mat.
- Effect: damage x2 (10 to 20), cadence unchanged.
- Notes: the default first upgrade; teaches the branch loop.

### [ ] Rate-of-fire control
- Requirements: laboratory + scientist + reinforced ammunition.
- Research: 160 cr. Production: 100 cr + 5 mat.
- Effect: cadence x1.25 (4 to 5 shots/s).
- Conflicts: none, stacks with reinforced ammunition.

### [ ] Armour-piercing rounds
- Requirements: laboratory + scientist + reinforced ammunition.
- Research: 200 cr. Production: 130 cr + 6 mat.
- Effect: damage x1.3 and penetration 'single-target' to 'all-targets' (line hits).
- Conflicts: exclusive with rate-of-fire control.

### [ ] Rapid thermal jacket
- Requirements: laboratory + scientist + reinforced ammunition.
- Research: 180 cr. Production: 110 cr + 5 mat.
- Effect: reduces weapon overheat pause (spread +8 to +4), cadence unchanged.
- Notes: optional QoL branch; lower priority.

---

## Impulse Accelerator

Baseline: 60 dmg, 1 shot/s, pierces all targets in line.

### [x] Upgraded impulse accumulator
- Requirements: accelerator production blueprint (market) + local accelerator.
- Research: 180 cr. Production: 120 cr + 6 mat.
- Effect: cadence x1.25 (1 to 1.25 shots/s).

### [ ] Overcharged capacitors
- Requirements: laboratory + scientist + upgraded accumulator.
- Research: 220 cr. Production: 150 cr + 8 mat.
- Effect: damage x1.2 (60 to 72).
- Conflicts: none, stacks.

### [ ] Focusing coils
- Requirements: laboratory + scientist + upgraded accumulator.
- Research: 240 cr. Production: 160 cr + 8 mat.
- Effect: projectile speed x1.3 (760 to 988), damage x1.1.
- Notes: makes long-line piercing more reliable.

---

## Canister Aircraft Cannon (shotgun)

Baseline: 7 dmg, 6 pellets, 1.8 shots/s, short-lived fan, capped knockback.

### [ ] Choke tube
- Requirements: laboratory + scientist + canister cannon.
- Research: 150 cr. Production: 90 cr + 5 mat.
- Effect: spread -4 (13 to 9); more pellets land at mid range.

### [ ] Hardened shot
- Requirements: laboratory + scientist + canister cannon.
- Research: 170 cr. Production: 110 cr + 6 mat.
- Effect: damage per pellet +2 (7 to 9).
- Conflicts: none, stacks with choke tube.

### [ ] Overpressure loading
- Requirements: laboratory + scientist + canister cannon.
- Research: 200 cr. Production: 140 cr + 7 mat.
- Effect: cadence x1.25 (1.8 to 2.25 shots/s) and knockback x1.5.
- Notes: close-range burst for elite stagger.

---

## Split Pulse Emitter (alien)

Baseline: 7.5 dmg, 2 projectiles, 6 shots/s, alien origin.

### [ ] Resonant phasing
- Requirements: quarantine + lab + adapted emitter.
- Research: 260 cr. Production: 180 cr + 10 mat.
- Effect: damage per pulse +1.5 (7.5 to 9).

### [ ] Dual-pulse drive
- Requirements: quarantine + lab + adapted emitter.
- Research: 300 cr. Production: 200 cr + 12 mat.
- Effect: projectiles 2 to 3 per volley.
- Notes: strongest alien-branch DPS lever.

### [ ] Emitter cooling lattice
- Requirements: quarantine + lab + adapted emitter.
- Research: 240 cr. Production: 160 cr + 8 mat.
- Effect: cadence x1.15 (6 to 6.9 shots/s).

---

## Rocket Pod

Baseline: manual fire (Space / mouse), 90 dmg, fast projectile, 3 charges per sortie.

### [ ] Expanded magazine
- Requirements: works + engineer + rocket pod.
- Research: 120 cr. Production: 80 cr + 4 mat.
- Effect: charges per sortie 3 to 5.

### [ ] Heavy warhead
- Requirements: works + engineer + rocket pod.
- Research: 160 cr. Production: 110 cr + 6 mat.
- Effect: rocket damage 90 to 120.

### [ ] Streamlined fins
- Requirements: works + engineer + rocket pod.
- Research: 140 cr. Production: 90 cr + 5 mat.
- Effect: rocket projectile speed 700 to 900 (harder to dodge, faster acquisition).

---

## Open design questions

1. Should branches be exclusive per tier (pick one of three) or fully stackable?
2. Should alien branches require a second preserved sample (limit how many branches per weapon)?
3. Where do branches show in the UI — a per-weapon upgrade panel in the Hangar?
