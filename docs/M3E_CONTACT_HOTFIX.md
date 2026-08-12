# M3e contact hotfix contract

This post-M3e correction makes contact with the Warden spatially consistent while
preserving the isolated elite encounter and operational economy.

## Mutual separation

When Kestrel and the Warden overlap, the domain calculates a normalized axis from the
Warden's centre to Kestrel's centre. Kestrel moves 64 logical pixels along that axis;
the Warden moves 46 pixels in the opposite direction. The same rule covers contact
from the left, right, above, below, and every diagonal angle.

If both centres are mathematically identical, the deterministic fallback moves Kestrel
down and the Warden up. Both positions are clamped to safe playfield bounds, so edge
contacts still separate the actors as far as the available space permits.

The Warden stores knockback offsets that decay over 360 ms. Contact creates a short
impact ring and camera shake, immediately updates Kestrel's armour bar, and retains the
existing 700 ms invulnerability window. Ramming never damages or destroys the Warden
and grants no bounty, salvage, or artefact.
