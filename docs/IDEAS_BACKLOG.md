# Ideas backlog — E5.3 triage (23 ideas)

Status markers: **[x]** implemented · **[~]** prototype / partial · **[ ]** backlog ·
**[✗]** reject (not now / against the contract). Triage recorded 2026-08-18, E5.3.
Provenance: the Weapons-epic brainstorm (2026-08-17/18) plus the in-repo backlog
references (`docs/WEAPONS_EPIC.md`, `docs/DECISIONS.md`, `docs/PLAN.md`,
`docs/WEAPON_UPGRADES.md`).

| # | Idea | Status | Note |
| --- | --- | --- | --- |
| 1 | Finite ammunition for all ordnance (rockets, homing, torpedoes, cluster, mines, drones, decoys) | [x] | E2b-3a + E3.3a–E3.4c; single consume/settlement path |
| 2 | Ukrainian attack drone swarm (cheap, light, 50–100 per sortie) | [x] | E3.3b; nearest-enemy ram + orbit |
| 3 | Heavy Combat Drone (permanent wingman, expensive) | [ ] | DECISIONS #17; separate economy, E5.x or later |
| 4 | Enemy homing threats (Pursuit Missile, Warden Seeker) | [x] | E3.4a |
| 5 | Flares/decoys redirecting homing missiles | [x] | E3.4b |
| 6 | Stun → the only alien-recovery path (Capturer removed) | [x] | E3.2a + E3.2b, DECISIONS #16/#19 |
| 7 | Proximity mine auxiliary (slow upward drift) | [x] | E3.4c |
| 8 | Hardcore destruction: weapons lost + pilot dies at armour 0; Abort saves | [x] | E4, DECISIONS #15/#21 |
| 9 | Variable-length weapon Marks as real items in combat | [~] | E1 data + E4 `resolveWeaponFamilyItem`; research→production→equip pipeline pending |
| 10 | Alien primaries combat-ready (lance / orb / singularity) | [x] | E3.4c + E4 resolver |
| 11 | Hybrid laser/plasma research-production lane | [~] | families + adapted blueprints exist; full economy wiring staged |
| 12 | Weapon upgrade branches (rate-of-fire control, armour-piercing rounds, thermal jacket, capacitor/focusing-coil, canister choke/hardened shot/overpressure, split-pulse branches, rocket-pod magazine/warhead/fins) | [ ] | full tree spec in `docs/WEAPON_UPGRADES.md` |
| 13 | Module combat effects (shield buffer, dash, targeting spread, repair, reflector) | [ ] | catalog data only; E5.x combat wiring |
| 14 | Scrum teams for staff (lead + 8–10 specialists as one hire) | [ ] | PLAN backlog; presentation-only reframe |
| 15 | 2D art search, licence verification, sprite integration | [ ] | separate later stage; no open-licence set selected |
| 16 | Aircraft Mark II/III research → production → apply pipeline | [x] | E2b-3b |
| 17 | Loadout weight/energy hard limits + Hangar gauges | [x] | E2b-1/E2b-2, DECISIONS #12 |
| 18 | Slot concentration bonus (1/2/3 slots) | [x] | E1/`loadout.ts`, DECISIONS #13 |
| 19 | Pilot roster with injuries, fatigue, XP, medical treatment | [x] | P-series (pre-epic) |
| 20 | Deterministic monthly market (staff, pilots, weapons, blueprints, aircraft) | [x] | P-series (pre-epic) |
| 21 | Containment gate for preserved alien samples | [x] | M3g.3a (pre-epic) |
| 22 | Power-curve rebalance to a strict Human < Laser < Plasma < Alien ladder | [ ] | E5; the alien per-shot guard is pinned, but the railgun (48) still out-per-shots the laser (20) — needs playtest data before renumbering |
| 23 | Post-victory / campaign progression surface (fleet history, month reports, records) | [ ] | keep for the next epic; not weapons-scope |

## Triage rules applied

- Implemented/partial items stay; the backlog keeps only items that preserve the
  hardcore-risk contract (no insurance, no spare-item logistics — DECISIONS #15,
  M3G roadmap "Do not add weapon loss, durability, repair, insurance … yet" for
  pre-E4; E4 changed that for destruction only).
- Rejected: none hard-rejected; #15 (art) is deliberately deferred as a separate
  stage, #23 is out of the weapons epic's scope.
- E5 balance notes from `docs/PLAYTEST.md` feed #12/#13/#22 before they are
  scheduled.
