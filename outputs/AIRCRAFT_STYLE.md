# Shmup aircraft SVG style

## Palette

- Hull shadow: `#414b55`
- Hull midtone: `#737d85`
- Hull highlight: `#7d878e`
- Wing shadow: `#3d4751`
- Wing midtone: `#647079`
- Deep mechanical recess: `#18232c`
- Canopy shadow: `#263d48`
- Canopy midtone: `#6e929e`
- Canopy highlight: `#b7d5dc`
- Outline: `#929ca2`
- Fine highlight: `#aeb6ba`
- Neutral marking: `#dce4e6`
- Engine core: `#d7edf0`
- Engine glow: `#fff4c1` → `#8bcfe4` → transparent `#377488`

National accents may be used sparingly on markings only. They must not replace the
shared hull palette.

## Shape language

- Orthographic top-down silhouette.
- Slight bilateral asymmetry is allowed only in markings or equipment.
- One strong primary silhouette; internal detail must remain legible at 96–128 px.
- Broad geometric surfaces, clipped corners, restrained panel lines.
- Real aircraft are references only: alter proportions, wing planform, intakes,
  canopy, tail and engine treatment.
- No real manufacturer logos, serials or military insignia.

## Rendering

- Transparent canvas, normally `viewBox="0 0 512 768"`.
- Main outline: 3 px; secondary outline: 2 px.
- Horizontal hull gradient and vertical wing gradient.
- Panel lines use `#aeb6ba` at 25–35% opacity.
- Keep glow in a separate `engine-glow` group so it can be animated or hidden.
- Prefer named groups: `aircraft`, `main-wing`, `fuselage`, `canopy`, `intakes`,
  `panel-lines`, `engines`, `markings`.

