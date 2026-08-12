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
5. With the Quarantine Centre operational, the sealed sample can be analysed safely.
   The existing lab analysis action (consume the sample for research and the stable
   Split Pulse module) is re-enabled; the adapted-blueprint loop replaces it in
   M3g.3b.

## Progression guidance

A fresh profile still follows the Capturer chain first. After the Capturer is equipped
and an artefact is recovered, the next-objective chain extends through:

1. `recover-artefact` — intercept a Warden while the Capturer is installed;
2. `start-containment` / `advance-containment` — research safe-containment protocols;
3. `construct-quarantine` — build the Quarantine Centre in Engineering;
4. `analyse-sample` — analyse the sealed artefact in Quarantine (M3g.3b surface).

## Content and persistence

- New content: `blueprint-safe-containment` (a `BuildingBlueprintDefinition` whose
  output is a building) and `building-quarantine-centre` (350 credits / 20 materials,
  requires the containment blueprint and the Works).
- The building-blueprint research reuses the existing sortie-driven research queue, so
  no new persisted state is required.
- Save schema remains **v8**: the sealed-sample state is derived from existing fields
  (`preservedTechnologyIds`, `unlockedBlueprintIds`, `constructedBuildingIds`), and no
  migration is needed.

## Testability

- Development-only `?m3g3aReady=true` starts a profile with a delivered Prism, an
  operational Centre, a scientist, and the Works, so the containment chain is
  reachable immediately.
- Unit tests cover the quarantine analysis gate, building-blueprint research and
  construction, the containment guidance chain, content validation, and the full
  store flow from delivery to quarantine analysis.

## Deliberately deferred

- Adapted-blueprint analysis (analyse → adapted blueprint → manufacture → equip),
  Capturer telemetry unlock, and the early Warden signal remain in **M3g.3b**.
