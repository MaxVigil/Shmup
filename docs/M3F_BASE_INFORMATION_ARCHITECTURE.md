# M3f base information architecture contract

M3f replaces the single long management page with four stable departments while
keeping the existing progression rules and save compatible.

## Department map

- **Overview** presents the Directorate mandate, persistent resources, next objective,
  and latest sortie report.
- **Research** separates understood terrestrial development from quarantined alien
  artefact analysis.
- **Engineering** owns facilities, staffing, workshop construction, and manufacturing.
- **Hangar** owns aircraft loadout, recovery capability, and sortie authorization.

Only the active department is rendered as the visible tab panel. Credits, materials,
and research remain in a compact persistent strip, so players do not need to return to
Overview to understand whether an action is affordable. Tabs support click and keyboard
arrow navigation.

## Research boundary

The Alien Technology Capturer is classified as an `earth` blueprint: humans design it
through controlled engineering even though its purpose is to recover alien hardware.
It appears alongside explicit terrestrial airframe and conventional-weapons lanes.
Those lanes currently communicate the future structure without inventing unlocks that
do not yet exist.

The Prism programme occupies a separate alien quarantine panel. It continues to require
an operational laboratory, scientists, and an intact recovered sample. Alien research
does not subsume future armour, mobility, repair, or conventional-weapon progression.

## Guidance and continuity

The Overview derives the same deterministic next objective as M3c, but now provides one
direct action that opens the responsible department. Research objectives route to
Research; construction and manufacturing to Engineering; loadout and recovery to the
Hangar. Returning from a sortie always opens Overview so the settlement is visible.

No persisted fields change. Blueprint research-domain metadata is content-only, so save
schema v5 remains compatible and no migration is required.
