# M3d sortie flow and pause contract

M3d improves the legibility and continuity of the existing sortie without expanding
the progression economy.

## Viewport and controls

The vertical playfield is centred in the available viewport below the persistent top
bar, so no Phaser HUD information sits beneath navigation. The accompanying sortie
brief remains secondary and collapses to a compact overlay on narrow screens.

Keyboard decisions use two groups:

- `E` / `C` — extract or continue;
- `1` / `2` — install or preserve recovered technology.

`P` toggles manual pause. Settings adds its own pause reason, so closing Settings does
not accidentally resume a manually paused game and unpausing manually does not bypass
an open menu. Outside click and Escape close Settings and remove its pause reason.

## Warden handoff

Ordinary spawns stop before the extraction decision. Choosing the intercept clears
remaining ordinary enemies and shots, gives the player a warning beat, and then spawns
the Warden alone. Ordinary spawns remain disabled throughout the elite phase. This
makes the threat transition readable while keeping the artefact attached to its elite
carrier.

## Managed endings

Encounter resolution locks combat before the result reaches the DOM base layer:

- success clears combat pressure, centres Kestrel, and flies it upward beyond the
  playfield before publishing the sortie outcome;
- defeat clears combat pressure, plays a short destruction burst and camera response,
  then publishes the failed outcome.

These are deliberately minimal functional sequences. A later cinematic pass may add a
launch sequence, richer victory choreography, audio, and bespoke defeat presentation
without changing the domain outcome boundary.
