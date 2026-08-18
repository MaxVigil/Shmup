# PLAYTEST — scripted human rounds (Weapons epic E0–E5, UX epic E6)

Purpose: run the arsenal through its paces before `test` is merged to `main`.
Each round is a self-contained scenario with the URL, the setup, the actions, and
the expected outcome. Record the result in the log at the bottom of this file.

Reference numbers live in `docs/BALANCE.md` (generated) and `docs/ENTITIES.md`.

## How to run

```sh
npm install
npm run dev
```

Playtest profiles are URL flags (combine with `&`). Progress is NOT saved while a
profile is active (the PLAYTEST badge shows in the header).

| Flag | Grants | Use for |
| --- | --- | --- |
| `?hardpointsReady=true` | Hangar install list for every auxiliary + module | loadout UI, auxiliaries |
| `?alienReady=true` | USA Gunship with the 3 alien primaries, all auxiliary ammunition, 50k cr | primaries, auxiliary firing |
| `?m2Fast=true` | 20 s encounters, short extraction | fast combat loops |
| `?m3g2Ready=true` | research + production + blueprints loop | terrestrial pipeline |
| `?m3g3aReady=true` | preserved Prism + quarantine + research | containment gate |
| `?stage4Ready=true` | full base + credits/materials | base-wide smoke test |
| `?m3eBankrupt=true` | zero credits | insolvency game-over |

**Recommended full-arsenal URL:**
`npm run dev?alienReady=true&hardpointsReady=true&m2Fast=true`

---

## Round 1 — Hangar arsenal panel & hardpoints

**URL:** `?hardpointsReady=true`
**Setup:** open the Hangar tab.
**Actions:**
- Open the Arsenal hardpoint panel and the AMMUNITION panel.
- Install each auxiliary (Rocket Pod, Homing Missile Rack, Heavy Torpedo Launcher,
  Cluster Missile Pod, Drone Swarm, Stun Module, Flare & Decoy Launcher, Proximity
  Mine Launcher) and each module (Energy Shield, Directional Shield, Dash,
  Targeting Computer, Repair Nanobots, Reflector Field) one at a time.
- Watch the weight / energy gauges and try to overload the aircraft.
- Remove items and reinstall.

**Expected:**
- Every install updates weight/energy; an overload shows the OVERLOAD warning and
  the install is blocked (hard limit, DECISIONS #12).
- AMMUNITION rows show which auxiliary each ammunition feeds and a buy button.
- No "Capturer" / "Програма" / "Programme" UI anywhere in Research, Engineering,
  Hangar, or Databank (E3.2b removal must be invisible).
---

## Round 2 — Primary weapons & variable Marks

**URL:** `?alienReady=true&m2Fast=true`
**Setup:** USA Gunship already carries Disintegration Lance, Plasma Orb Projector,
Singularity Projector.
**Actions:**
- Press `X` (or the sortie weapon control) to switch primaries mid-flight.
- Fire each against the wave, then against a Gunship.

**Expected:**
- Lance: fast, thin white beam; **pierces** through all enemies in a line
  (`all-targets`). A Scout (10 armour) dies in one hit (180 dmg).
- Plasma Orb: slow green orb, large splash-visible body.
- Singularity: slow large purple orb.
- Cadence matches catalog: lance 0.55/s, orb 0.65/s, singularity 0.4/s (with the
  Gunship's fire-rate multiplier 0.85 — expect a deliberate, heavy rhythm).
- Switch never resets the firing cooldown unfairly (cooldown is not reset on swap).

---

## Round 3 — Auxiliary weapons & ammunition consumption

**URL:** `?alienReady=true&hardpointsReady=true&m2Fast=true`
**Setup:** ammo is pre-loaded; install auxiliary weapons in the Hangar Arsenal panel.
**Actions:** for each auxiliary below, fire it at least once per sortie and note the
ammo count in the Hangar AMMUNITION panel after settlement.

| Auxiliary | Fire with | Ammo | Expected per shot |
| --- | --- | --- | --- |
| Rocket Pod | Space / right-click | rocket (12) | 70 dmg, blast 52 |
| Homing Missile Rack | Space / right-click | homing (10) | 62 dmg, curves to target |
| Heavy Torpedo Launcher | Space / right-click | torpedo (4) | 220 dmg, blast 70 |
| Cluster Missile Pod | Space / right-click | cluster (6) | 105 dmg, blast 55 |
| Drone Swarm Module | Space / right-click | drone (20) | ram + area blast |
| Flare & Decoy Launcher | Space / right-click | flare-decoy (6) | decoy deploys |
| Proximity Mine Launcher | Space / right-click | mine (12) | mine drifts up, proximity blast |
| Stun Module | Space / right-click (elite phase) | none | stuns the Warden |

**Expected:**
- Every shot decrements exactly one unit; settlement shows the ammo consumed
---

## Round 4 — Stun → alien recovery (stun is the ONLY path)

**URL:** `?hardpointsReady=true&m2Fast=true`
**Setup:** install the Stun Module in the Hangar; start a sortie and reach the Warden
intercept (after the extraction window, choose intercept).
**Actions:**
1. **Without stun:** destroy the Warden → expect `AIRCRAFT SIGNAL LOST` /
   `ВАРТОВОГО ЗНИЩЕНО // СИГНАЛ АРТЕФАКТУ ВТРАЧЕНО` (no artifact).
2. **With stun:** stun the Warden (Space / right-click; the Warden flashes cyan),
   then destroy it → expect `ARTEFACT RECOVERED` and the install/preserve choice.

**Expected:**
- Stunning only works in the elite phase and once per sortie.
- The stun prompt is never gated on any Capturer/equipment (that device is gone).

---

## Round 5 — Enemy homing threats + decoys

**URL:** `?hardpointsReady=true&m2Fast=true`
**Setup:** install the Flare & Decoy Launcher.
**Actions:**
- Let a Gunship fire Pursuit Missiles (2 per volley, curving toward you).
- Deploy a decoy with Space / right-click while a volley is incoming.
- Also try dodging by lateral strafe and by dash (if a Dash module is installed).

**Expected:**
- Missiles visibly steer with a limited turn rate; they are dodgeable.
- A decoy within ~160 px attracts the volley; missiles hit the decoy and are
  absorbed (decoy expires after ~4 s, drifting slowly upward).

  (`auxiliaryAmmoConsumed` path).
- Firing with 0 remaining ammo does nothing (no negative stock, no soft-lock).
- When several auxiliaries are installed, each Space press fires its own weapon
  (documented behaviour; do not report as a bug).

---

## Round 6 — Ukrainian drone swarm

**URL:** `?hardpointsReady=true&m2Fast=true`
**Setup:** install the Drone Swarm Module (20 drones available).
**Actions:**
- Deploy drones while no enemy is on screen → they circle the aircraft.
- Deploy drones while enemies are present → they pick the nearest enemy, ram it,
  and explode with area damage.

**Expected:**
- Deterministic nearest-target selection; drones expire after 12 s; cleared on
  encounter reset.

---

## Round 7 — Proximity mines (upward drift)

**URL:** `?hardpointsReady=true&m2Fast=true`
**Setup:** install the Proximity Mine Launcher.
**Actions:**
- Drop a mine and fly away; let a Scout/Gunship drift into its proximity radius.
- Drop a mine and wait for its lifetime to expire.

**Expected:**
- The mine drifts slowly upward (55 px/s); an enemy inside ~48 px triggers the
  blast (130 dmg, radius 60); lifetime ~14 s; off-screen mines vanish silently.
---

## Round 9 — Economy & containment (base loop smoke)

**URL:** `?m3g2Ready=true` and `?m3g3aReady=true`
**Actions:**
- Research a blueprint → produce in the Works → equip in the Hangar → fly a sortie.
- With a preserved Prism: confirm quarantine containment is required before alien
  analysis; research the adaptation and manufacture the Split Pulse Emitter.

**Expected:**
- The research → production → equip loop completes; containment gates alien
  analysis; nothing references the removed Capturer.

---

## Round 10 — Insolvency game-over

**URL:** `?m3eBankrupt=true`
**Expected:** zero credits; the base shows the insolvency report and the game-over
state without soft-locking.

---

## Playtest log

| Round | Date | URL flags | Result (pass / fail / notes) |
| --- | --- | --- | --- |
| 1 | | `?hardpointsReady=true` | |
| 2 | | `?alienReady=true&m2Fast=true` | |
| 3 | | `?alienReady=true&hardpointsReady=true&m2Fast=true` | |
| 4 | | `?hardpointsReady=true&m2Fast=true` | |
| 5 | | `?hardpointsReady=true&m2Fast=true` | |
| 6 | | `?hardpointsReady=true&m2Fast=true` | |
| 7 | | `?hardpointsReady=true&m2Fast=true` | |
| 8 | | `?m2Fast=true` | |
| 9 | | `?m3g2Ready=true` / `?m3g3aReady=true` | |
| 10 | | `?m3eBankrupt=true` | |
| 11 | | `?stage4Ready=true` (keyboard-only) | |
| 12 | | `?m2Fast=true` (accessibility) | |

After each round, log concrete observations (numbers that felt too strong/weak,
visual bugs, missing feedback). The E5 balance pass uses these notes.

- Your own aircraft is never damaged by its own mine.

---

## Round 8 — Hardcore destruction (E4)

**URL:** `?m2Fast=true` (normal loadout is fine; optionally `?alienReady=true` first)
**Setup:** take a normal sortie, do NOT abort, and let your armour reach 0 (e.g. take
a Warden Seeker volley or sustained Gunship fire).
**Actions:**
- After the `AIRCRAFT LOST` ending, return to the base.

**Expected:**
- Toast: `AIRCRAFT DESTROYED // installed weapons and equipment are lost` plus the
  pilot-death toast.
- Hangar: the flown aircraft's primary loadout is empty, hardpoints cleared,
  module (if any) gone; the pilot is in the roster as dead and `activePilotId` is
  unset (you must assign a new pilot).
- The aircraft hull remains and can be repaired (it is grounded, not deleted).
- **Abort before dying** (P → Abort) keeps aircraft, weapons, and pilot intact but
  forfeits the bounty.

---

## Round 11 — UX/UI hygiene: overlays, focus, screen flow (E6)

**URL:** `?stage4Ready=true` (any full-base profile is fine)
**Actions — keyboard-only (no mouse):**
- Tab through the base tabs; ArrowLeft/Right/Home/End switch sections with a
  visible focus ring.
- Open Settings (gear); Tab stays inside the menu; Escape closes it and focus
  returns to the gear.
- Open DESIGN SYSTEM OVERVIEW; Tab is trapped inside the dialog; Shift+Tab cycles
  backward; Escape closes and focus returns to the gear.
- Open the sortie picker (LAUNCH SORTIE); the first FLY button receives focus;
  Tab cycles the aircraft; Escape closes.
- End the month (END MONTH → confirm): the month-report dialog focuses CONTINUE,
  Tab is trapped, Escape dismisses it and focus returns to the base.

**Expected:**
- Exactly one Escape path: the top overlay closes first, then the one below it.
- While an overlay is open, sortie hotkeys (P/X/E/C/1/2) are inert.
- `body.has-overlay` is set while any overlay is open (page scroll locked).

## Round 12 — UX/UI accessibility & resize (E6)

**URL:** `?m2Fast=true`
**Actions:**
- Settings → Text size: switch Small/Medium/Large and confirm the whole DOM UI
  rescales (rem-based).
- Settings → Reduce motion effects: enable, launch a sortie, take hits; shake is
  reduced to ~25% and the death flash is skipped. The toggle applies from the
  next sortie.
- Narrow the window to 320 px and confirm no button text is clipped (labels wrap).
- Listen with a screen reader (VoiceOver/NVDA): toasts are announced
  (`role="status"`), and the sortie run report is announced (`aria-live`).

**Expected:** no clipped labels at 320 px; toasts and reports announced once each.

