# M3g.3a safe-containment stage contract

M3g.3a is the first increment of the alien-containment stage. It introduces the
containment gate that protects preserved alien samples until the player builds a
quarantine facility, without yet adding the adapted-blueprint analysis loop (that is
M3g.3b).

## Flow

1. A preserved artefact (the Prism) is delivered to the base after a successful
   extraction. The sample is **sealed**: it cannot be analysed until containment
   exists.
2. Delivering the first preserved sample unlocks the terrestrial **safe-containment
   project** in the Research and Development Centre (requires the Centre and at least
   one scientist; sortie-driven progress, one point per scientist).
3. Completing the project unlocks the **Quarantine Centre** blueprint.
4. The Quarantine Centre is a specialised extension of the Research and Development
   Centre, physically constructed by the Prototype and Production Works. Its
   construction action lives in Engineering; its analysis surface lives in Research.
5. With the Quarantine Centre operational, the sealed sample can be analysed. Analysis
   consumes the sample, records its research value, and unlocks the adapted Split Pulse
   Emitter blueprint. The Prototype and Production Works manufactures the Emitter
   (requires the lead engineer), and only then can it be equipped in the Hangar.

## Adapted Split Pulse Emitter loop

Analysis never grants the Emitter directly. The complete loop is:

1. Analyse the sealed Prism in Quarantine → research + adapted blueprint unlocked;
2. Manufacture the Split Pulse Emitter in the Works (250 credits / 8 materials,
   lead engineer required);
3. Equip the manufactured Emitter in a primary slot from the Hangar;
4. Recover further Wardens to analyse additional samples for research.

## Progression guidance

A fresh profile still follows the Capturer chain first. After the Capturer is equipped
and an artefact is recovered, the next-objective chain extends through:

1. `recover-artefact` — intercept a Warden while the Capturer is installed;
2. `start-containment` / `advance-containment` — research safe-containment protocols;
3. `construct-quarantine` — build the Quarantine Centre in Engineering;
4. `analyse-sample` — analyse the sealed artefact in Quarantine;
5. `manufacture-adapted-weapon` — build the adapted Emitter in the Works;
6. `equip-adapted-weapon` — install the Emitter in a primary slot;
7. `recover-artefact` — repeat the loop for further samples.

## Content and persistence

- New content: `blueprint-safe-containment` (a `BuildingBlueprintDefinition` whose
  output is a building), `building-quarantine-centre` (350 credits / 20 materials,
  requires the containment blueprint and the Works), and
  `blueprint-split-pulse-adaptation` (an `AdaptedWeaponBlueprintDefinition` that
  produces the Split Pulse Emitter).
- The building-blueprint and adapted-weapon research reuse the existing sortie-driven
  research queue and the Works manufacturing surface, so no new persisted state is
  required.
- Save schema remains **v8**: blueprints live in `unlockedBlueprintIds` and ownership
  in `ownedPrimaryWeaponIds`, both existing fields, and no migration is needed.

## Emitter balance

The Split Pulse Emitter fires 6 volleys per second (two pellets each, spread 12) for
≈90 single-target DPS, which beats the upgraded machine gun (≈80 DPS). This is a
playtest-driven tuning of the prototype values.

## Testability

- Development-only `?m3g3aReady=true` starts a profile with a delivered Prism, an
  operational Centre, a scientist, and the Works, so the containment chain is
  reachable immediately.
- Unit tests cover the quarantine analysis gate, building-blueprint research and
  construction, the containment guidance chain, content validation, and the full
  store flow from delivery to quarantine analysis.

## Deliberately deferred

- Early Warden signal and Capturer telemetry unlock remain in **M3g.3b**.
