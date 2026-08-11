# M2 risk and extraction contract

M2 adds the smallest complete version of the game's defining decision loop without
introducing the M3 base-management surface.

## Encounter sequence

1. Regular combat yields deterministic material salvage.
2. At 45 seconds, the ship detects the Unclassified Prism.
3. The player sees only its offence category, glyphs, 2/5 reliability, and 3/5 danger.
4. The player installs the Prism or seals it for recovery.
5. At 90 seconds, the player extracts safely or remains for the Warden intercept.
6. Safe extraction, destroying the Warden, or surviving to the forced extraction
   secures the complete haul. Ship loss retains 50%, rounded down.

## Artefact trade-off

Installing the Prism grants two immediate but prototype-tuned effects:

- **Prismatic Sheath:** contact damage is multiplied by 0.75 and rounded up.
- **Split Pulse:** the Pulse Cannon fires two projectiles. Each deals 75% of normal
  damage and the projectiles are separated laterally, increasing total output while
  changing its coverage.

Preserving the Prism grants no combat benefit. It adds 10 research to the recoverable
payload, which is secured in full after extraction or reduced by the failure rule.

## Optional elite

Continuing past the safe extraction window spawns one Warden. It remains in the
combat area, carries a larger armour pool, deals heavier contact damage, and awards
18 materials if destroyed. Surviving until the final forced extraction secures the
current haul even if the Warden remains.

## Testability

The pure transition model in `src/domain/risk-extraction.ts` rejects out-of-order
decisions and produces the existing `SortieOutcome` boundary. Unit tests cover both
artefact choices, safe extraction, elite reward, invalid transitions, and partial
loss. In Vite development only, `?m2Fast=true` scales decision timings to 5%; the
production build always uses the normal three-minute schedule.
