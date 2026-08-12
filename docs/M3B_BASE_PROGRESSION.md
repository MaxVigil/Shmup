# M3b staged base-progression contract

M3b introduces the infrastructure required to gate alien artefact recovery behind a
player-built equipment chain. It is delivered in independently testable stages.

## Stage 1 — application shell and localization

Status: complete locally.

- The application starts on a dedicated DOM-based Base screen.
- A sortie launches into a separate combat screen and returns to the Base only through
  the post-sortie action.
- A shared top bar identifies the active screen and exposes settings through a gear icon.
- Ukrainian is the default presentation language; English can be selected at runtime.
- The language choice persists under its own browser preference key and does not change
  the game-progress save schema.
- All visible DOM and Phaser strings come from one typed localization catalogue.
- Open combat decisions and HUD text refresh immediately when the language changes.

## Stage 2 — economy, laboratory, and scientists

Status: complete locally.

- A new profile starts with 500 credits and no recovered materials.
- M3e supersedes the original fixed successful/failed sortie payments: credits now
  come from confirmed target bounties minus breach penalties.
- The technology laboratory costs 300 credits and 10 materials.
- Scientists cost 150 credits each and can only be hired into a constructed laboratory.
- Alien-sample research requires both the laboratory and at least one scientist.
- Save schema v3 persists credits, buildings, and staff. V2 technology progress migrates
  with one laboratory and scientist so existing unlocks remain coherent.

## Stage 3 — Capturer research and manufacturing

Status: complete locally.

- The Alien Technology Capturer blueprint requires 3 research progress.
- Starting the project requires the laboratory and at least one scientist.
- Every completed sortie advances the project by one point per employed scientist;
  research never uses a real-world timer.
- Completing the blueprint unlocks the engineering workshop, which costs 450 credits
  and 15 materials.
- Manufacturing the Capturer costs 250 credits and 10 materials and stores the finished
  device at the base.
- Save schema v5 persists active blueprint progress, unlocked blueprints, the workshop,
  manufactured equipment, and the preflight slot while migrating v1–v4 saves.

## Stage 4 — preflight equipment and recovery gate

Status: complete locally.

- A manufactured Capturer can be installed or removed in Kestrel's special-equipment
  slot before launch; the choice persists between sessions.
- The combat HUD and extraction decision identify whether the Capturer is active.
- Without the device, the Warden still awards salvage but its artefact signal is lost
  immediately after the kill and no install-or-preserve decision appears.
- With the device installed, destroying the Warden recovers the Prism and preserves the
  complete temporary-install versus base-research decision loop.
- Development-only `?m2Fast=true&stage4Ready=true` provides a temporary manufactured
  Capturer profile for focused playtesting without reading or overwriting normal progress.
