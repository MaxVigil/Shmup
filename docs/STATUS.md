# Project status

Last updated: 2026-08-16

## Iteration 11 — Material buttons + full button UX audit

Implemented on `test`.

- `base-action` now has real Material interaction: an ink ripple from the
  press point (respects `prefers-reduced-motion`), currentColor state-layer
  overlays for hover/focus/press, elevation changes, and `touch-action:
  manipulation`. Keyboard keeps native Enter/Space + a visible focus ring.
- Whole UI audited and standardized on the single `base-action` primitive.
  Removed the custom `.launch-action`, `.return-action`,
  `.weapon-switch-action`, and `.icon-button` classes: launch/return are now
  `base-action is-primary`, the menu gear and close buttons are `base-action
  is-icon`.
- No schema change. 213 unit tests, lint, typecheck, and the production build
  pass.

## Iteration 10 — Aircraft upgrade chain: blueprint → queued manufacture

Implemented on `test`.

- Mark II/Mark III research now ends in the Research tab with a "researched —
  manufacture in the Works" status; manufacturing has moved to the Engineering
  tab as a real queued production job (cost + sorties, ≥1 engineer team) instead
  of an instant button. Mark III research requires Mark II research; Mark III
  manufacture requires Mark II manufacture.
- The hangar shows a MARK II / MARK III badge on upgraded aircraft.
- No schema change: the new production job kind is additive. 213 unit tests,
  lint, typecheck, and the production build pass.

## Iteration 9 — Repair Master teams + in-building hiring

Implemented on `test`.

- Repair Master teams can now be hired directly in the Engineering (Works)
  panel, next to the production engineers; the max-1 headcount limit is gone,
  so several teams can share repairs. Extra teams stack via staff contribution:
  the cost discount is floored at 50% and each team adds +0.5 repair ticks per
  completed sortie.
- No schema change: content + presentation only. 211 unit tests, lint,
  typecheck, and the production build pass.

## Iteration 8 — Scrum teams + salaries

Implemented on `test`.

- Scientist/engineer/medic/repair-master hires are presented as scrum teams
  ("LEAD X · TEAM OF 8"); the trader and the operations director remain
  individual hires.
- Salaries are back at team scale: 30k (scientist/medic), 40k (engineer),
  35k (repair master), 20k (trader), 50k (director); hire costs scale
  accordingly. The old 10k monthly salary clamp is gone from candidate
  generation, monthly expenses, and the roster.
- No schema change: content + presentation only. 210 unit tests, lint,
  typecheck, and the production build pass.

## Iteration 7 — Aircraft fire-rate & projectile-speed multipliers

Implemented on `test`.

- Two new **independent** per-aircraft multipliers: `fireRateMultiplier` (fires
  every equipped automatic weapon faster/slower) and `projectileSpeedMultiplier`
  (bullets travel faster/slower). They are separate fields, decoupled from
  `damageMultiplier` — damage, cadence, and projectile speed are tuned
  independently; DPS is never stored as a single number.
- Catalog: India 1.25×/1.15×, PRC 1.2×/1.25×, France 1.1×/1.1×,
  Britain/Germany 1×/1×, USA 0.85×/0.95×, Japan 0.8×/1.05× (rough balance).
  Rocket Pod remains manual (shotsPerSecond = 0) and is unaffected.
- Combat reads both from `getAircraftStats()`; fire cooldown becomes
  `1000 / (shotsPerSecond × fireRateMultiplier)` and shot speed scales with the
  projectile multiplier (canister horizontal spread scales too, preserving the
  cone). Hangar hero lists FIRE RATE / PROJECTILE SPEED per aircraft (uk/en/zh).
- No schema change: content + runtime presentation only. 207 unit tests, lint,
  typecheck, and the production build pass.

## Iteration 5–6 — Unified buttons + Repair Master

Implemented on `test`.

- **Iteration 5 — unified button system:** removed the `.text-action` control
  (CSS and the settings "Design system" button now use `base-action`). One
  Material-style button primitive covers default, hover, pressed, focus,
  disabled, primary, danger, and launch states; the design-system page now
  demonstrates every state instead of the old TEXT ACTION sample. Whole UI
  audited — every DOM action is `base-action` (+ modifiers).
- **Iteration 6 — Repair Master role:** new `staff-repair-master` role (Works,
  max 1, 9k salary). Without a master, repairs are outsourced at full cost;
  with one, standard repair becomes in-house: up to 40% cheaper (floored at
  50% cost) and repairs tick 50% faster per contribution unit. The hangar
  labels the mode (IN-HOUSE / OUTSOURCED REPAIR) and shows a status note; the
  duplicate emergency-repair button was removed from fleet slots.
- No schema change: the repair master is a regular staff member. 206 unit
  tests, lint, typecheck, and the production build pass.

## Iteration 4 — National aircraft fleet (schema v17)

Implemented on `test`. The six engine-brand aircraft were replaced with seven
Council-nation aircraft, each rendered from its own root SVG copied to
`public/assets/` (india, britain, prc, germany, usa, france, japan). India is
the starter aircraft.

- Schema v17 with a v16→v17 migration that resets the hangar to the starter
  aircraft, clears old aircraft blueprint/upgrade references, and preserves
  credits, materials, staff, buildings, weapons, and warehouse stock.
- 7 aircraft + 7 aircraft blueprints + 14 Mk1/Mk2 upgrades in the typed
  catalogue; PRC keeps a strong mid-tier interceptor lane; generic names
  ("Літак КНР" / "PRC aircraft" / "中国战机") in uk/en/zh.
- Iterations 1–3 (base management pass, mission launch flow, repeatable weapon
  production) are also recorded in `docs/PLAN.md`. 204 unit tests, lint,
  typecheck, and the production build pass.

## Round-8 pilot casualties & the Medical Block (schema v16)

Implemented on `test`. Full loop: damaged sorties roll seeded casualties
(death/severe/medium/light scaled by armour lost), injured pilots can only
recover via paid state outsourcing or the free Medical Block treatment
accelerated by hired medics, fatalities move to the Board of Honour, and the
salary economy was reset to a 10k monthly cap (manager excepted).

- Schema v16 (`pilotInjuries`, `deadPilotIds`, `pilotDeathMonth`, nullable
  `activePilotId`) with a v15→v16 migration; 200 unit tests, lint, typecheck,
  and the production build pass.
- New `src/domain/pilot-medical.ts` (seeded casualty roll, treatment modes,
  medic healing rate) and the Medical Block building/blueprint/medic role in
  the content catalogue; store commands `TREAT_PILOT_OUTSOURCE` /
  `TREAT_PILOT_MEDICAL`; per-role `salaryCreditCost` (8–9k, manager 25k).
- UI (uk/en/zh): pilot injury/treatment cards with per-country outsource
  pricing, Board of Honour, Medical Block programme/construction/medic staff.

## Theme B — Industrial Dark UX rebuild (test2)

The full base + sortie presentation has been re-layered onto a real design-token
system on branch `test2` (not yet merged). Domain, store, content, and save schema
are untouched; all 168 unit tests, lint, typecheck, and the production build pass.

- Design tokens: 4 surface layers, 3 border tiers, 5 text tiers, semantic/status
  colours, 4px spacing scale, type scale, mono data font (`:root` block).
- Theme B component surfaces: panels, navigation, buttons (primary/danger),
  launch actions, global HUD card, sortie console, toasts, research/fleet cards.
- Theme B2 visual overhaul: panel corner brackets, mono uppercase panel headers,
  brighter accent palette, geoscope theatre (coordinate grid, sweep animation,
  pulsing threat blips), command dashboard (two-column), research cards band +
  two domain columns, hangar pre-launch two-column layout.
- Trade layout fixed with a two-column `trade-content` grid (market + credit lines)
  that stacks on narrow screens; empty states added.
- Databank is now a real in-game feature: entity tables (weapons, fleet, hostiles,
  facilities, personnel roles, research projects) rendered from the content catalog
  in uk/en/zh via the new typed DOM builder `src/ui/h.ts`.
- `ui-template-ids` coverage extended with the databank tables container.
- Dead CSS removed (~200 lines): legacy overview/status-grid/market-offer/
  weapon-slot-summary/base-resource-strip classes with zero DOM usage.

## Current milestone

The funding-nations expansion and the round-4 playtest fixes are implemented on
`test` (schema v14). Round-4 playtest feedback was triaged and fixed:

- Finance tab now opens (`isBaseSection` guard omitted `finance`).
- Aborted sorties no longer resolve the mission or grant the nation gift
  (`abortRun` yields `extracted: false`; `SETTLE_SORTIE` resolves + thanks only on
  `extracted`). The abort confirmation now spells out the consequences.
- Rocket fire no longer conflicts with mouse-drag movement (Space / right-click
  fire; left drag moves); the Rocket Pod gained a large splash warhead.
- Pointer-follow is speed-capped (no teleporting) with an `F` cursor-lock toggle.
- Pilot fatigue is now a real rotation mechanic: +0.15/sortie for the active
  pilot, passive recovery for the rest, monthly recovery, fatigued pilots cannot
  fly, and REST stands the active pilot down to a rested replacement.
- Staff management: hired-staff roster in Command with DISMISS, plus Operations
  Director and Trade Manager candidate pools (previously generated but hidden);
  engineer headcount raised 1 → 3.
- Repaid loans no longer linger in Trade; combat HUD and kill rewards use compact
  credit formatting; debug grants are rescaled (+100k/+1M).
- Sortie result window now includes the nation's gratitude line (single summary);
  upgraded (reinforced-ammo) machine gun shows a badge; "New Game" relabeled in
  Settings (2-step confirm, full wipe).
- Round-5: economy rescale finished (trade centre, upgrade research, validation
  guard), loans moved to Command (unlocked), Research/Trade tabs hidden until
  their facilities exist, capturer row hidden until researched, trader grants a
  flat +5% margin with a tested no-arbitrage invariant, salaries 40%→30%, month
  cycle 6→3 sorties, END MONTH confirm when threats remain.
- Round-6 (schema v15): aircraft procurement reworked — Trade sells ready
  aircraft and aircraft blueprints (incl. Interceptor); blueprints unlock the
  Mark II/III upgrade line; two new aircraft (UK Swift, JP Precision); Hangar is
  a servicing hub with a large SVG hero panel and no market; construction/
  research/production feedback toasts fixed (start vs complete).
- Round-7: upgrade research is queued (not instant); month 1 threat ceiling 2,
  month 2 ceiling 3; early-month spawn-rate ramp (~28%/~23% fewer hostiles).

## Completed

- Product interview and Game Brief v0.1.
- Technical Plan v0.1 approved for M0.
- Phaser 4 + TypeScript + Vite selected.
- Reuse-first policy confirmed.
- Foundation source, domain boundaries, tests, and CI prepared locally.
- Local lint and typecheck pass.
- All 11 unit tests pass.
- Production build completes successfully.
- M0 published in draft pull request #1; GitHub Actions CI passes.
- M0 pull request #1 reviewed and merged into `main`.
- Playable MVP scope recorded in the repository specification.
- First M1 greybox increment implemented locally.
- M1 combat prototype merged in PR #2.
- The optional Warden carries the partly understood Prism; destroying it opens the
  install-or-preserve choice.
- Installing activates Prismatic Sheath and transforms the Pulse Cannon into Split Pulse.
- Preserving the recovered Prism carries an intact sample through the final escape;
  the sample is lost if the ship fails to extract.
- Choosing Install or Preserve starts a 35-second escape (8 seconds in fast mode), so
  the Prism's combat effects and the preserved-sample risk are both playable.
- Safe extraction and the optional Warden intercept are playable.
- Failed sorties retain half of recovered materials and research.
- Delivered Prism samples can be researched at the base for 10 research and a permanent
  Split Pulse Emitter unlock.
- The unlocked module can be equipped on Kestrel and applies Split Pulse from the start
  of the next sortie; field installation remains temporary and uniquely grants Sheath.
- The complete Preserve → Research → Equip → next-sortie flow was exercised in the
  local browser without runtime errors, including persistence across a page reload.
- The application now starts on a dedicated Base screen and launches combat as a
  separate Sortie screen with an explicit post-sortie return path.
- A shared top bar provides a settings menu with live Ukrainian/English switching;
  Ukrainian is the default and the preference persists independently of progress.
- All visible DOM and Phaser strings use the typed localization catalogue, including
  decisions already open when the language changes.
- Localization tests cover Ukrainian defaults, preference persistence, and interpolation.
- New profiles start with a 500-credit defence reserve.
- The laboratory costs 300 credits and 10 materials; scientists cost 150 credits and
  require the completed laboratory.
- Alien-technology research now requires both the laboratory and at least one scientist.
- Save schema v3 persists credits, constructed buildings, and staff; v1/v2 migrations
  retain progress and provision legacy research infrastructure when needed.
- The fresh-save browser flow from sortie rewards through construction, hiring, and
  reload persistence passes without runtime errors.
- The Capturer blueprint requires 3 sortie-driven progress and scales with the number
  of scientists without real-world waiting.
- Blueprint completion unlocks the 450-credit/15-material engineering workshop; the
  Capturer costs another 250 credits and 10 materials to manufacture.
- Save schema v5 persists research projects, unlocked blueprints, the workshop,
  manufactured equipment, and special-equipment loadout while migrating v1–v4 saves.
- The complete migrated-save browser flow through 0/3→3/3 research, workshop
  construction, manufacturing, and reload persistence passes without runtime errors.
- A manufactured Capturer can be installed or removed in Kestrel's preflight special-
  equipment slot and remains equipped across reloads.
- Without an equipped Capturer, defeating the Warden yields salvage but no artefact;
  with it installed, the complete install-or-preserve decision remains available.
- Browser checks confirm the empty-slot warning, stored/equipped loadout states, and
  distinct salvage-only versus artefact-recovery intercept prompts.
- The Base derives one deterministic next objective from the save, including exact
  resource shortfalls and blueprint progress.
- Preflight now presents a prominent recovery-enabled/offline status without preventing
  useful salvage-only launches.
- Post-sortie reporting separates credits, retained materials, and Capturer research
  progress or completion from the combat result.
- Browser checks on a clean profile confirm the initial resource shortfall and offline
  warning; the ready profile transitions to the Warden-recovery objective and online
  preflight confirmation immediately after equipping the Capturer.
- The Sortie canvas is centred in the viewport below the persistent top bar, keeping
  the complete Phaser HUD visible at desktop and compact viewport sizes.
- `P` toggles a manual pause and opening Settings adds an independent pause reason;
  closing Settings by its button, outside click, or Escape removes only that reason.
- Decision shortcuts are now grouped as `E`/`C` for extraction and `1`/`2` for the
  artefact, avoiding the previous conflict between Preserve and Pause.
- The Warden intercept clears ordinary combat actors, presents a warning beat, and
  begins as a readable one-on-one phase without continued regular spawns.
- Successful missions centre Kestrel and fly it out before publishing the result;
  defeat uses a short destruction beat before returning control to the Base report.
- Browser checks confirm manual/settings pause, the warning-to-Warden transition, the
  centred HUD, and delayed settlement after managed extraction.
- Fixed sortie payments have been replaced by per-target bounties: 8 credits for a
  Scout, 12 for a Weaver, and 100 for the Warden.
- A regular target that reaches the protected corridor incurs a deterministic penalty
  equal to five times its bounty; the live HUD shows gross rewards, penalties, and the
  projected reserve without restoring the old score noise.
- Post-sortie settlement reports confirmed targets, breaches, gross reward, penalties,
  net credit movement, the resulting reserve, materials, and research separately.
- A reserve of zero or less revokes the operating mandate, disables sorties and base
  spending, and presents an explicit GAME OVER directive with a new-programme action.
- The Council mandate introduces the initial funding and contract stakes in one compact
  Base brief rather than routing all progression copy toward alien recovery.
- Aircraft contact no longer removes the Warden. The elite survives the collision and
  is displaced, preventing the empty elite phase reported during playtesting; regular
  targets remain removable by contact.
- Browser checks confirm live `+8 / −80` accounting, the projected reserve, the
  insolvency directive, disabled bankrupt actions, and clean programme restart.
- Contact with the Warden now calculates the centre-to-centre collision axis, moves
  Kestrel away by 64 logical pixels, and moves the Warden in the opposite direction by
  46 pixels regardless of whether contact came from above, below, left, or right.
- Both actors remain clamped to playable bounds; the Warden carries a short decaying
  knockback offset so its sine movement does not erase a horizontal or downward hit on
  the next frame.
- A short impact ring, camera shake, armour loss, and the existing 700 ms invulnerability
  window make one collision readable without turning overlap into repeated damage.
- M3e bounty, penalty, and progression values remain unchanged pending full-sortie
  playtest evidence.
- The Base is now divided into Overview, Research, Engineering, and Hangar tab panels;
  only one department is visible at a time while credits, materials, and research remain
  in a compact persistent strip.
- Overview contains the Council mandate, next objective, and latest settlement. Its
  direct action routes research objectives to Research, construction/manufacturing to
  Engineering, and equipment/recovery objectives to the Hangar.
- The Capturer blueprint is explicitly classified as terrestrial research and appears
  beside future airframe/survivability and conventional-weapons lanes.
- The Prism programme is isolated in an alien quarantine panel with its existing
  laboratory, scientist, and preserved-sample prerequisites.
- Engineering now owns infrastructure, staff, workshop, and manufacturing actions;
  Hangar exclusively owns weapon modules, special equipment, preflight status, and
  sortie launch.
- Tab semantics, arrow-key navigation, Ukrainian/English labels, launch from Hangar,
  and return-to-Overview settlement were exercised in the local browser.
- Save schema remains v5 because research-domain classification is content metadata,
  not persisted campaign state.
- All 78 unit tests, lint, typecheck, and the production build pass locally.
- Engineering now presents one verified terrestrial-market offer for a finished
  Impulse Accelerator. Its 620–680-credit quote is seeded by campaign state, survives
  reloads, and changes only after sortie settlement.
- The Base now owns explicit primary weapons and equips up to two distinct weapons.
  The Hangar exposes two compact slots without showing unowned weapon options.
- The Hangar compares weapons through concise player-facing roles rather than raw
  damage coefficients; exact balance values remain in typed content and tests.
- The Impulse Accelerator fires one 60-damage metallic projectile per second with a
  distinct muzzle flash, recoil shake, heavy hit fragments, and impact ring. Its shot
  pierces every enemy in the vertical path while damaging each actor only once. This
  is a baseline role correction from the initial 0.75-rate single-target prototype.
- The Aircraft Machine Gun and Split Pulse retain clearly different cadence and
  coverage.
- Warden now has a compact non-numeric armour bar. Combat decision copy wraps inside
  its panel, and HUD text remains above an entering elite.
- Save schema v7 persists both primary-weapon slots. v6 migration puts its single
  equipped weapon into slot I and preserves all owned weapons and campaign progress.
- During a sortie, `X` and the control beside the combat field switch between the two
  installed primary weapons without resetting the current firing cooldown.
- Browser checks cover Ukrainian and English procurement, purchase, Hangar equipment,
  Accelerator combat, Warden armour, decision wrapping, and a 520-pixel-wide Base
  without runtime warnings or horizontal overflow.
- Browser checks additionally cover slot-I/slot-II assignment, a Machine Gun start,
  `X` switching to the Accelerator, pointer switching back, and Ukrainian/English
  active-weapon controls beside the combat field.
- All 85 unit tests, lint, typecheck, and the production build pass locally.
- The Research and Development Centre now owns staffed terrestrial weapon projects;
  the Prototype and Production Works is general infrastructure that requires the
  Centre rather than the Capturer blueprint.
- After five completed sorties, the market reveals a deterministic 180–220-credit
  Accelerator production licence without exposing that future option earlier.
- A licensed 220-credit/8-material qualification example establishes local production
  and becomes the first usable Accelerator when no finished market example was bought.
- Production mastery unlocks the Accelerator improvement branch; the starting machine
  gun branch needs only an operational staffed Centre.
- Reinforced machine-gun ammunition is developed for 140 credits and manufactured for
  90 credits plus 4 materials, doubling projectile damage from 10 to 20.
- The upgraded impulse accumulator is developed for 180 credits and manufactured for
  120 credits plus 6 materials, raising cadence from 1 to 1.25 shots per second while
  preserving 60 damage and full vertical piercing.
- Hangar descriptions reflect installed upgrades without exposing raw coefficients,
  and both upgraded weapons remain compatible with dual-slot sortie switching.
- Save schema v8 persists local production, researched upgrades, and manufactured
  upgrades; v7 migration preserves both weapon slots and all prior campaign progress.
- Browser checks cover the hidden early licence, Ukrainian/English market copy, licence
  purchase, qualification production, both development projects, both manufacturing
  actions, upgraded Hangar roles, and dual-slot combat launch.
- All 92 unit tests, lint, typecheck, and the production build pass locally.
- Scientist hiring now lives inside the Research and Development Centre rather than
  the Engineering infrastructure panel.
- The Production Works has a distinct lead-engineer role costing 180 credits. The
  engineer can be hired only after the Works exists, current headcount is capped at
  one, and every manufacturing path requires that role.
- Upgrade actions now say “Start research”; completion explicitly creates a production
  blueprint, keeping research and manufacture legible as different stages.
- Capturer guidance routes scientist hiring to Research and lead-engineer hiring to
  Engineering without blocking already manufactured legacy equipment.
- Salaries, larger teams, staff power, project difficulty, manufacturing duration, and
  production queues remain deferred as one future personnel-economy system.
- Save schema remains v8: staff already uses typed role IDs, so existing campaigns need
  no structural migration and simply hire their first engineer before new production.
- Browser checks confirm that scientist hiring is present in Research, a newly licensed
  production example remains blocked without an engineer, hiring the lead engineer
  unlocks it, and completing a weapon project explicitly creates its production
  blueprint.
- All 96 unit tests, lint, typecheck, and the production build pass locally.
- The M3g.2a staffing gate and the full terrestrial research → blueprint → production
  pipeline were playtested in the local browser from a clean profile: sortie income,
  scientist hiring inside Research, the Accelerator licence reveal after five sorties,
  qualification production gated behind the lead engineer, both weapon development
  projects, both manufacturing actions, upgraded Hangar roles, and dual-slot combat
  launch all work without runtime errors.
- The M2–M3g.2a change set is published on `main` (commits 9b1e40d, 5ec64fc). Lint,
  typecheck, all 96 unit tests, the production build, and GitHub Actions CI pass.
- M3g.3a adds the safe-containment gate. Delivering the first preserved sample locks
  it as a sealed artefact: analysis is impossible until containment exists.
- The terrestrial safe-containment project is researched in the Research and
  Development Centre through the existing sortie-driven queue, then unlocks the
  Quarantine Centre blueprint.
- The Quarantine Centre is a researched extension constructed by the Production Works
  (350 credits / 20 materials). Construction lives in Engineering; analysis surface
  lives in Research.
- With Quarantine operational, the sealed Prism sample can be analysed again; the
  adapted-blueprint loop is deferred to M3g.3b.
- The next-objective chain extends through start/advance containment, construct
  quarantine, and analyse sample, routed to Research/Engineering/Hangar correctly.
- No schema change was required: the sealed state derives from existing persisted
  fields, so save schema remains v8 and no migration is needed.
- Development-only `?m3g3aReady=true` starts a profile with a delivered Prism, an
  operational Centre, a scientist, and the Works for immediate containment testing.
- All 101 unit tests, lint, typecheck, and the production build pass locally.
- Analysing the sealed Prism now unlocks an adapted blueprint instead of granting the
  Split Pulse Emitter directly; the Emitter is manufactured in the Works (250 credits /
  8 materials, lead engineer required) and only then equippable in the Hangar.
- The next-objective chain extends through `manufacture-adapted-weapon` and
  `equip-adapted-weapon` before returning to Warden recovery for further samples.
- Playtest feedback rebalanced the Split Pulse Emitter to 6 volleys per second with
  spread 12 (≈90 single-target DPS), beating the upgraded machine gun (≈80 DPS).
- All 106 unit tests, lint, typecheck, and the production build pass locally.
- M3g.3b adds the Warden signal gate: the signal appears from the second sortie
  onward, the first detection records telemetry whether the player intercepts or
  avoids, and the terrestrial Capturer project unlocks only after that telemetry.
  Save schema is now v9 with a v8→v9 migration that derives telemetry from prior
  Capturer progress.
- M3h adds the Gunship: a ranged regular enemy that telegraphs a shot toward the
  sampled player position and fires slow, sparse, high-contrast projectiles with a
  lifecycle that is safe across pause, elite isolation, extraction, and defeat.
- M3i adds the Canister Aircraft Cannon (Дробовик): a terrestrial research →
  production → equip pipeline, a short-lived fan of pellets with close-range payoff,
  and one capped knockback impulse per target per volley.
- M3j adds the auxiliary hardpoint (terrestrial research → Works manufacture → Hangar
  status) and a manual rocket pod activated with Space or the right mouse button.
  Rockets prioritise a living elite target, otherwise acquire the nearest forward
  target, and expose a small per-sortie charge counter.
- The controls hint auto-hides on first movement or after 15 seconds; phase warnings
  still appear in the bottom status line.
- A full Chinese (`zh`) locale now covers every typed translation key in the base and
  sortie UIs, with the language selector, `isLocale('zh')`, persistence, and unit-test
  coverage; Ukrainian remains the default.
- The Hangar now manages a small fleet: typed `AircraftDefinition`s (Interceptor
  starting, Gunship, Aegis), finite hangar slots, deterministic seeded market pricing,
  and per-sortie active-aircraft selection (save schema v10 with a v9 migration).
- Combat reads the active aircraft's armour, speed multiplier, and damage multiplier
  instead of fixed constants.
- A Command tab now shows the sortie-counted month, a deterministic threat map of
  Council states under attack (PRC, Ukraine, and two other founding states), and
  fleet fuel readiness.
- Sorties consume the active aircraft's fuel; launching requires a fueled aircraft
  and the Hangar offers refuel at a per-aircraft credit cost (schema v11 with a v10
  migration provisioning month one, full fuel, and the first threat map).
- All 137 unit tests, lint, typecheck, and the production build pass locally.
- Selecting Chinese in Settings now re-renders the whole interface immediately; the
  Overview tab is gone and Command is the landing page (objective, post-sortie
  report, mandate, month, threat map, fleet fuel, credit line), with the save-schema
  status in Settings and the insolvency modal as a global overlay.
- Each aircraft now has a distinct combat silhouette and hull colour (Interceptor
  dart, Gunship wings, Aegis hexagon), and the Hangar uses fleet bay cards with
  ACTIVE/FUELED/UNFUELED status chips, visible refuel costs, and market offers with
  deltas against the active aircraft.
- A deterministic credit line (Recovery Commission 200/+10%/2m, PRC 300/+5%/3m,
  Ukraine 250/+8%/2m) lives in the Command Centre; repayment falls due at the month
  boundary and cascades into insolvency when the reserve cannot cover it
  (schema v12 with a v11 migration).
- All 145 unit tests, lint, typecheck, and the production build pass locally.
- Command navigation is fixed (`command` is the landing tab, no `overview` remnants), a
  Settings "Restart mission" button clears the save with a two-step confirmation, and the
  pause menu offers an armed two-step "Abort sortie" that keeps the collected haul
  (schema v13 foundation shipped together with the fleet cycle).
- Aircraft are now individual fleet entities: each has its own weapon slots
  (Interceptor 2, Gunship 3, Aegis 4) and loadout, warehouse counts physical weapons
  (`weaponStock`), rockets (`consumableStock`), and modules (`aircraftModules`), and the
  active aircraft's loadout mirrors the combat weapon switcher across N slots.
- A fourth PRC-sourced aircraft, the Yanlong (four primary slots, competitive economy),
  joins the market, and a warehouse panel in the Hangar lists all stock with
  install/unequip actions from the per-aircraft loadout editor.
- Aircraft now take damage from sorties, grounded until repaired; standard repairs cost
  credits plus sortie-time, emergency repairs cost 2× and are instant, and repairing
  aircraft cannot be activated or launched.
- A monthly staff market offers deterministic named candidates (Ukrainian, Chinese, and
  other Council pools) with tiers, efficiency and salary multipliers; hiring consumes
  the candidate, staff gain XP per sortie (levels raise contribution), and blueprint
  research uses the summed staff contribution.
- A Trade Centre building gates a new Trade tab: procurement (weapons, rockets),
  surplus sales, and the relocated Council credit lines; a hireable trade manager adds
  up to 15% margin from level 2 onward.
- All 167 unit tests, lint, typecheck, and the production build pass locally.

## Fixes landed on `test` (2026-08-13)

- Action-button text (`launch-sortie`, `return-to-base`) is now re-applied on every
  base render, not only on locale change, and disabled-button text contrast was
  raised so an inactive launch button stays readable.
- Soft-lock removal: a damaged aircraft no longer grounds the fleet. Damage scales
  combat armour (`maxArmour × (1 − damage)`), so a damaged aircraft is flyable but
  fragile. Standard and emergency repairs remain available to restore full armour;
  an in-progress standard repair only shows a countdown, never blocks flight.
- The elite Warden now fires aimed shots, using the same generic ranged path as the
  Gunship.
- Staff-candidate hiring now enforces the same building gate as direct hiring:
  `hireCandidate` requires the role's `requiredBuildingId` and respects
  `maximumHeadcount`; the candidate hire button is disabled until the facility is
  built. The Engineering Research Centre / Production Works build-first order is
  enforced on every path.

## Playtest round 2 landed on `test` (2026-08-13)

- **Button text root cause fixed**: `renderLocale` carried eleven stale `setText`
  calls for removed loadout elements; the first missing id threw and aborted the
  whole locale render before the action buttons were populated. The stale calls are
  gone and a regression test now asserts every `byId`/`setText` id exists in the
  template.
- **Bigger sortie screen**: on a sortie the top bar collapses to just the settings
  gear (no brand, no breadcrumb) and the combat field fills the viewport.
- **Warden fires ~3× more often**: `shotIntervalMs` 3200 → 1050.
- **Direct staff hiring removed**: only the monthly candidate pool hires scientists,
  engineers, and the trade manager; counts and candidate cards remain.
- **Research queue**: one blueprint project at a time; `advanceBlueprintResearch`
  advances only the front project and the research start buttons are disabled while
  the queue is busy.
- **Accelerator moved to the Trade tab**: the Engineering procurement panel is gone;
  the Impulse Accelerator (finished) and its production blueprint are now offered in
  Trade.
- **Rocket Pod is now a weapon**: the auxiliary hardpoint system is fully removed.
  The Rocket Pod is a purchasable primary weapon (Trade → warehouse → weapon slot),
  carries up to `chargesPerSortie` rockets from `consumableStock`, fires manually via
  `Space` or left/right mouse click, and spent rockets are consumed on return.

## Next

1. Playtest round 4 on `test` (fresh profile via Settings → NEW GAME): staff roster
   + dismiss, manager/trader hiring, engineer cap, pilot fatigue rotation, aborted
   sortie consequences, rocket splash + Space/right-click, pointer-follow, Finance
   tab, combined sortie report, repaid-loan cleanup, debug grants.
2. Adjust balance from the round-4 evidence (rocket damage/radius, engineer cap,
   fatigue recovery, loan terms) and confirm the 9-nation threat/gift economy.
3. Merge `test` → `main` once the playtest batch is green.
4. Keep the slowly ascending proximity mine as an auxiliary follow-up after rocket
   controls are validated.

## Known gaps

- Working title and narrative premise remain open.
- M1 combat tuning still lacks a repeatable metrics pass.
- M2 values are first-pass prototype tuning and need player evidence.
- Production art and audio intentionally remain out of scope.
- The reviewed open-license shmup art sets were not selected. Asset search, visual
  comparison, licence verification, and integration are deferred to a separate stage.
- Defeat currently returns every purchased or manufactured weapon safely to Base;
  pilot equipment loss, insurance, and pilot casualties remain deliberately deferred.
- Phaser currently forms one large production chunk; defer code splitting until the
  combat and base routes are separated in M1–M3.
- Standing product constraints are recorded in `AGENTS.md`, `docs/GAME_SPEC.md`, and
  `docs/PLAN.md`: the PRC is a key positive Recovery Council state that sometimes
  offers better conditions, technologies, and contracts; Ukraine is a technology-
  innovation leader whose best engineers, scientists, and pilots are often Ukrainian;
  Russia does not exist in the game's present-day world.

## Playtest round 3 landed on test (2026-08-13)

- SET ACTIVE now shows for any non-active aircraft, including damaged ones.
- The combat field now fills the whole browser viewport on a sortie (top bar overlaid, combat-frame at 100dvh).
- Persistence verified with a progressed round-trip test; a refresh reset is caused by a playtest URL parameter or private browsing, so a visible PLAYTEST PROFILE badge now appears whenever a playtest profile is active.
- Debug mode v1 (?debug=true, dev builds only): F3 toggles a panel with economy grants, build-all, staff, fleet-ready, rockets, finish-research, combat invincibility, Warden spawn, skip-to-extraction, save-now, and a window.__shmup console bridge.
