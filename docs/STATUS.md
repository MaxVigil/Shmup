# Project status

Last updated: 2026-08-12

## Current milestone

M3g.3a — safe containment and the adapted Split Pulse Emitter loop — is implemented
and awaiting playtest. M3g.3b (early Warden signal and Capturer telemetry) is next.

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

## Next

1. ~~Playtest the M3g.2a staffing gate and the complete terrestrial research → blueprint
   → production pipeline before further numerical tuning.~~ Completed in the local
   browser; recorded in the status history above.
2. Continue M3g with the alien-containment stage. M3g.3a (safe containment and the
   Quarantine Centre) is implemented and needs a playtest pass; M3g.3b adds the early
   Warden signal, Capturer telemetry unlock, and the adapted-blueprint manufacturing
   loop, using the agreed 1–2, 5–7, 7–10, and 10–15-sortie progression beats.
3. Preserve M3h–M3j as the ranged enemy, Canister Aircraft Cannon, and auxiliary
   hardpoint plus manually fired rocket pod cycles.
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
  equipment loss, durability, repair, and insurance remain deliberately deferred.
- Phaser currently forms one large production chunk; defer code splitting until the
  combat and base routes are separated in M1–M3.
- Standing product constraints are recorded in `AGENTS.md`, `docs/GAME_SPEC.md`, and
  `docs/PLAN.md`: the PRC is a key positive Recovery Council state that sometimes
  offers better conditions, technologies, and contracts; Ukraine is a technology-
  innovation leader whose best engineers, scientists, and pilots are often Ukrainian;
  Russia does not exist in the game's present-day world.
