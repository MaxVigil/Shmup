# M3e operational economy contract

M3e makes ordinary combat economically consequential without adding another currency
or management subsystem.

## Narrative premise

After the First Breach, the states represented on the Recovery Council fund one
independent defence operator: the International Recovery Directorate. The player is
its chief executive and receives a 500-credit operating reserve. The reserve is both
working capital and political confidence; reaching zero or less revokes the mandate.

The Base communicates this once in a compact Council brief. Combat and debrief screens
then carry the premise through numbers rather than repeated exposition.

## Contract ledger

Confirmed destruction pays the target's typed bounty:

- Scout: 8 credits;
- Weaver: 12 credits;
- Warden: 100 credits.

A regular target reaching the bottom of the protected corridor incurs a penalty equal
to five times its own bounty. Cleared actors at an extraction transition are not
breaches. Bounties and penalties settle whether or not Kestrel extracts; material and
research retention continues to follow the existing success/failure rules.

The sortie HUD shows the projected reserve and gross `earned / penalized` ledger. A
small local value marker confirms each kill or breach. The debrief separates target
counts, gross values, net credit movement, reserve, materials, and research.

## Insolvency

After settlement, a reserve of zero or less is bankruptcy. Construction, hiring,
research actions, loadout changes, and new sorties are disabled. A Council directive
explains that the mandate has been revoked and offers an explicit new-programme reset.

This rule is derived from the existing persisted credit balance, so save schema v5
remains compatible and no migration is required. Development-only
`?m3eBankrupt=true` opens a temporary zero-credit profile without reading or writing
normal progress.

## Warden contact correction

Aircraft contact still damages Kestrel, but the Warden is no longer removed by the
generic regular-enemy collision path. It survives, and the M3e contact hotfix separates
both actors along their actual contact axis. This keeps the elite encounter resolvable and prevents the
sortie from waiting in an empty elite phase with ordinary spawns disabled. Pure tests
protect both the regular-versus-elite distinction and directional separation.
