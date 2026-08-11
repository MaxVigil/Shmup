# M2 risk and extraction contract

M2 adds the smallest complete version of the game's defining decision loop without
introducing the M3 base-management surface.

## Encounter sequence

1. Regular combat yields deterministic material salvage.
2. At 90 seconds, the player extracts safely or chooses to intercept the Warden.
3. Safe extraction secures the current haul without an artefact.
4. Destroying the Warden drops the Unclassified Prism and awards its material salvage.
5. The player sees only the Prism's offence category, glyphs, 2/5 reliability, and
   3/5 danger, then installs it or preserves it for research.
6. Choosing the artefact's disposition completes extraction. If the ship is lost
   during the Warden intercept, only 50% of recovered salvage is retained, rounded
   down. If the Warden survives until the final window, forced extraction secures the
   current haul without an artefact.

## Artefact trade-off

Installing the Prism grants two immediate but prototype-tuned effects:

- **Prismatic Sheath:** contact damage is multiplied by 0.75 and rounded up.
- **Split Pulse:** the Pulse Cannon fires two projectiles. Each deals 75% of normal
  damage and the projectiles are separated laterally, increasing total output while
  changing its coverage.

Preserving the Prism grants no combat benefit. It transfers the recovered artefact to
the laboratory as 10 research when extraction completes.

## Optional elite

Continuing past the safe extraction window spawns one Warden. It remains in the
combat area, carries a larger armour pool, deals heavier contact damage, and awards
18 materials if destroyed. The Prism choice is never shown before this kill. Surviving
until the final forced extraction secures the current haul even if the Warden remains,
but yields no artefact.

## Testability

The pure transition model in `src/domain/risk-extraction.ts` rejects out-of-order
decisions and produces the existing `SortieOutcome` boundary. Unit tests cover safe
extraction without an artefact, the elite-gated drop, both artefact choices, invalid
transitions, and partial loss during the intercept. In Vite development only,
`?m2Fast=true` opens the extraction window after 4.5 seconds and uses a 20-second
encounter, leaving enough time to defeat the Warden; the production build always uses
the normal three-minute schedule.
