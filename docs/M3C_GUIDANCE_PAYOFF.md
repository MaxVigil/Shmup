# M3c progression guidance and payoff contract

M3c makes the complete Capturer progression understandable from a clean profile
without adding another management system.

## Guided progression

The Base always shows one next objective, derived deterministically from saved state:

1. Recover materials and construct the laboratory.
2. Hire a scientist.
3. Start and advance the Capturer blueprint.
4. Construct the engineering workshop.
5. Manufacture the Capturer.
6. Install it in Kestrel's special-equipment slot.
7. Intercept a Warden and recover its artefact.

Construction and manufacturing objectives state whether their credit and material
requirements are ready or show the exact shortfall. Existing action buttons remain the
source of truth and stay disabled until their domain prerequisites are satisfied.

## Preflight clarity

The loadout panel always gives a prominent preflight status. It explicitly warns that
alien artefacts cannot be recovered when the Capturer is offline and confirms recovery
availability when the device is installed. Launching without it remains a valid choice
because salvage-only sorties and Warden encounters are still useful.

## Sortie payoff

The post-sortie report separates:

- extraction and artefact outcome;
- contract credits and retained material salvage;
- Capturer blueprint progress or completion.

The payoff summary is calculated by pure domain code from the before/after settlement
states. Research remains sortie-driven and deterministic.

## Pacing note

The original four-sortie fixed-payment baseline was retired by M3e. Progression income
now depends on confirmed targets and breaches, so laboratory and Capturer costs require
a new playtest-based tuning pass rather than a guaranteed sortie count.
