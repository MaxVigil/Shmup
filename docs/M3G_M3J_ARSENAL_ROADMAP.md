# M3g–M3j terrestrial arsenal roadmap

This document records the agreed post-M3f sequence for procurement, terrestrial
research, production, alien containment, and new weapon roles. It is a product
contract, not an instruction to implement every stage at once. Each stage and cycle
must be playtested before the next one begins.

## Product principles

- Earth weapons fire visibly metallic ammunition and read as mechanical hardware
  through tracers, muzzle flash, recoil, impact sparks, and ballistic audio.
- Alien weapons retain a visually and sonically unnatural identity.
- Kestrel has two automatically fired primary-weapon slots and uses only the selected
  weapon at a time. `X` or the adjacent sortie control switches between installed
  weapons without resetting the firing cooldown.
- A later permanent aircraft upgrade adds one manually activated auxiliary hardpoint.
- Purchased, manufactured, and equipped weapons always return to Base after defeat.
  Do not add weapon loss, durability, repair, insurance, or spare-item logistics yet.
- Research creates a blueprint, the Prototype and Production Works creates a physical
  item, and the Hangar installs it on an aircraft.
- The Works also manufactures researched airframe, armour, mounting, sensor, and other
  permanent aircraft upgrades; it is not limited to weapons.
- The reviewed open-license shmup art sets were not selected. Art direction, asset
  search, licence verification, and sprite integration remain a separate later stage.

## Base institutions

### Research and Development Centre

The Research and Development Centre owns understood terrestrial work: weapons,
airframe, armour, auxiliary mounts, the Capturer, and safe xenotechnology-containment
protocols. The starting aircraft machine gun can be improved here once the Centre is
operational and suitable staff have been hired.

### Prototype and Production Works

Ukrainian full name: **Дослідно-виробничий цех**; compact UI name:
**Виробничий цех**. It manufactures all researched or purchased blueprints and
installs permanent facility or aircraft expansions. A successful campaign should be
able to build it after roughly five to seven sorties.

### Quarantine Centre

The Quarantine Centre is not an independent starting institution. It is a specialised
extension of the Research and Development Centre, researched as a terrestrial safe-
containment project and physically constructed by the Works. Its construction action
lives in Engineering; after completion its alien-analysis surface lives in Research.

## M3g — Terrestrial procurement and industrialisation

M3g is staged because the early market payoff and the longer industrial loop occur at
different campaign times.

### M3g.1 — Market weapon and combat feedback

- Generalise the current Split Pulse-specific loadout into a primary-weapon slot.
- Add terrestrial procurement to Engineering.
- Offer a complete Impulse Accelerator early enough that a successful player can buy
  it after roughly one or two sorties without first owning the Works.
- Generate its price deterministically within a narrow balanced range. Persist the
  offer across reloads, refresh it only on a defined campaign event such as sortie
  settlement, and guarantee early availability.
- Give the Accelerator a measured cadence, a large metallic projectile, much greater
  per-shot damage than the starting machine gun, and unlimited piercing along its
  vertical path. The first M3g.1 playtest established that single-target overkill left
  it too weak against the existing wave density.
- Add compact weapon comparisons in the Hangar and improve combat feedback with
  distinct muzzle flashes, tracers, hit reactions, impact effects, recoil, and
  readable Warden armour.

### M3g.2 — Blueprints, production, and terrestrial improvements

- Establish the Research and Development Centre and the Prototype and Production
  Works as the shared terrestrial pipeline.
- Allow the market to sell an Accelerator blueprint separately from the expensive
  finished weapon.
- Manufacture additional Accelerators from the blueprint for substantially fewer
  credits plus materials.
- Unlock the Accelerator improvement branch only after the organisation owns its
  blueprint and has manufactured the first local example.
- Give the starting machine gun an immediately eligible terrestrial improvement
  branch once the Centre and required staff exist; it needs no purchased blueprint.
- Begin with one clearly perceptible improvement for each weapon rather than a broad
  tree of small percentage increases.

Implemented values and persistence rules are recorded in
[M3g.2 terrestrial development and production contract](M3G2_TERRESTRIAL_INDUSTRY.md).

### M3g.3 — Elite signals and alien containment

- Permit the first Warden signal from sortie two onward and guarantee it by roughly
  sortie four or five if randomness has not produced one.
- Present a Base warning before the optional intercept. Suggested tone:
  "Unidentified high-power signature. Capabilities unknown. Avoiding contact is
  advised; intercept authority remains with you."
- Whether the player accepts or avoids the first intercept, the recorded telemetry
  unlocks the terrestrial Alien Technology Capturer project. A cautious player must
  not accidentally block campaign progress.
- The Capturer remains manufactured by the Works and equipped in the Hangar.
- Delivering the first preserved artefact unlocks the terrestrial safe-containment
  project. Until containment exists, the sample remains sealed and cannot be analysed.
- Research that project to obtain the Quarantine Centre blueprint, then use the Works
  to construct the Centre as an extension of Research and Development.
- Analyse a preserved alien artefact in Quarantine to produce an adapted blueprint;
  manufacture the adaptation in the Works, then equip it in the Hangar.
- Field installation remains the immediate-risk path: it lasts only for the current
  sortie and does not deliver a sample or advance permanent adaptation.
- Target the first successful artefact recovery around sorties seven to ten and the
  first completed adaptation around sorties ten to fifteen. The 10–20-sortie window
  is better reserved for a second elite type or a larger campaign escalation than the
  first elite appearance.

## M3h — Ranged threat

- Add one regular enemy that fires at Kestrel.
- Telegraph every shot, aim at a sampled player position, and begin with slow,
  sparse, high-contrast hostile projectiles rather than bullet-hell density.
- Make hostile-projectile lifecycle safe across pause, elite isolation, extraction,
  defeat, and scene cleanup.
- Use the result to test whether movement becomes more deliberate before balancing
  the close-range weapon.

## M3i — Canister Aircraft Cannon

- Add terrestrial research, manufacture, and equipment of the **Canister Aircraft
  Cannon** (Ukrainian: **Картечна авіаційна гармата**; field nickname: **Дробовик**).
- Fire a short-lived fan of metallic pellets at a lower cadence than the standard
  machine gun.
- Reward close range with high combined damage and sharply reduce effectiveness at
  distance.
- Accumulate pellet impacts into one capped knockback impulse per target per volley,
  preventing unstable per-pellet displacement.
- Balance the weapon against the risk of approaching the ranged enemy introduced in
  M3h.

## M3j — Auxiliary hardpoint and rocket pod

- Research a permanent auxiliary-hardpoint airframe upgrade, manufacture and install
  it through the Works, and expose the new slot in the Hangar.
- Ship the hardpoint with one complete payoff: a terrestrial rocket pod.
- Keep the primary weapon automatic. Activate the auxiliary weapon deliberately with
  `Space` or the right mouse button over the game canvas; retain the left mouse button
  for pointer movement.
- Give the rocket a small fixed number of charges per sortie and a clear ready/charge
  indicator without adding broad HUD noise.
- On activation, prioritise a living elite target and otherwise acquire a suitable
  target in the forward sector. The intended player moment is seeing the Warden and
  choosing to spend a rocket on it.

## Auxiliary follow-up candidate — drifting mine

After the rocket control scheme is validated, test a mine deployed from Kestrel that
slowly travels upward through the playfield. It should create temporary area denial,
detonate on proximity, and differ from the faster target-seeking rocket. Do not add it
to M3j merely to fill the slot with multiple weapons.

## Deferred visual-asset stage

Run a separate later stage for art direction, asset search, licence verification,
visual comparison, and sprite integration. Any shipped third-party art must be
recorded in `THIRD_PARTY_NOTICES.md`.
