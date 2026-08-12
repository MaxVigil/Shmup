# M2 risk and extraction contract

M2 adds the smallest complete version of the game's defining decision loop without
introducing the M3 base-management surface.

## Encounter sequence

1. Regular combat yields deterministic material salvage.
2. Ordinary spawns stop shortly before the extraction window and remaining ordinary
   combat actors are cleared when the decision opens.
3. At 90 seconds, the player extracts safely or chooses to intercept the Warden.
4. Safe extraction secures the current haul without an artefact.
5. Continuing presents a warning beat, then begins an isolated Warden encounter.
6. Destroying the Warden awards its material salvage. The Unclassified Prism drops only
   when the Alien Technology Capturer was installed before launch.
7. The player sees only the Prism's offence category, glyphs, 2/5 reliability, and
   3/5 danger, then installs it or preserves it for research.
8. Choosing the artefact's disposition starts a 35-second escape under renewed enemy
   pressure. Installing grants immediate combat power for this escape; preserving
   turns the Prism into research cargo that must still be delivered.
9. Surviving the escape completes extraction. If the ship is lost during the Warden
   intercept or escape, only 50% of recovered materials and ordinary research are
   retained, rounded down, while the intact Prism is lost. If the Warden survives
   until the final window, forced extraction secures the current haul without an artefact.

## Artefact trade-off

Installing the Prism grants two immediate but prototype-tuned effects:

- **Prismatic Sheath:** contact damage is multiplied by 0.75 and rounded up.
- **Split Pulse:** the Pulse Cannon fires two projectiles. Each deals 75% of normal
  damage and the projectiles are separated laterally, increasing total output while
  changing its coverage.

Preserving the Prism grants no combat benefit. It adds an intact technology sample to
the escape cargo. The sample is delivered only by a successful extraction and can then
be researched at the base for 10 research and a stable weapon-module unlock.

## Optional elite

Continuing past the safe extraction window spawns one Warden. It remains in the
combat area, carries a larger armour pool, deals heavier contact damage, and awards
18 materials if destroyed. The Prism choice is never shown before this kill and is
available afterward only with an equipped Capturer. Surviving
until the final forced extraction secures the current haul even if the Warden remains,
but yields no artefact.

The presentation does not publish the result at the instant the encounter resolves.
Kestrel first centres and exits upward on success; defeat first plays a short destruction
beat. Cinematic launch and richer victory/defeat choreography remain a later feature.

## Testability

The pure transition model in `src/domain/risk-extraction.ts` rejects out-of-order
decisions and produces the existing `SortieOutcome` boundary. Unit tests cover safe
extraction without an artefact, the elite-gated drop, both artefact choices, escape
completion, invalid transitions, and partial loss during the intercept and escape. In
Vite development only, `?m2Fast=true` opens the extraction window after 4.5 seconds,
uses a 20-second encounter, and shortens the escape to 8 seconds; the production build
always uses the normal three-minute schedule and 35-second escape.
