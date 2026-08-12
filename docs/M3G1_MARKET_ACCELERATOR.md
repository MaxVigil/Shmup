# M3g.1 terrestrial market and Impulse Accelerator contract

M3g.1 introduces an early terrestrial weapon payoff without exposing the later
blueprint, production, or improvement systems before they exist.

## Player-facing loop

1. Engineering presents one verified terrestrial-market offer.
2. A finished Impulse Accelerator costs 620–680 credits, with the exact quote derived
   deterministically from the campaign market seed and completed-sortie count.
3. The quote survives reloads and refreshes only when a sortie is settled. Reloading
   the page cannot reroll it.
4. Purchasing delivers the weapon immediately to the Hangar but does not equip it.
5. The Hangar presents only owned primary weapons and allows one to be equipped.
6. Purchased and equipped weapons remain owned after every sortie outcome.

The 500-credit starting reserve keeps the weapon out of immediate reach. The intended
successful-campaign timing is one or two sorties, depending on confirmed bounties,
breach penalties, and the current quote.

## Information boundary

The market shows the current price, availability, and a short role description. The
Hangar shows qualitative differences such as heavy impact or rapid sustained fire.
Exact damage, cadence, projectile speed, price bounds, and RNG inputs remain developer
and test information. The combat HUD does not repeat market or weapon-stat data; the
weapon communicates its role through behavior and feedback.

## Primary weapons

- **Aircraft Machine Gun**: 10 damage at 4 shots per second; narrow metallic tracer.
- **Impulse Accelerator**: 60 damage at 1 shot per second; its large fast metallic
  projectile pierces every target in its vertical path, with each target damaged at
  most once. It uses a strong muzzle flash, recoil shake, and heavy impact burst.
- **Split Pulse Emitter**: two 7.5-damage pulses at 4 volleys per second; wide alien
  presentation. Existing researched and field-installed behavior remains intact.

These values are prototype balance data and should change only after comparative
playtest evidence.

The initial 0.75-shot-per-second single-target Accelerator lost too much wave control
to overkill against numerous light enemies. The first M3g.1 playtest therefore raised
its cadence to one shot per second and established unlimited vertical piercing as a
baseline identity rather than a later upgrade.

## Combat feedback

- Earth projectiles use warm ballistic colours; Split Pulse retains alien violet.
- Every hit flashes the target and emits a profile-specific impact effect.
- Heavy Accelerator shots add a larger muzzle flash, subtle recoil shake, impact
  fragments, and a ring.
- Warden receives one fixed, unlabelled armour bar beneath the upper HUD. It exposes
  actionable progress without adding numeric combat noise.
- Long decision explanations wrap within their panels; the boss bar and combat HUD do
  not occlude one another.

## Persistence

Save schema v8 retains the two primary-weapon slots introduced in v7 and adds M3g.2
production and improvement progress. A v6 campaign migrates its previously
equipped weapon into slot I and leaves slot II empty; earlier migrations follow the
same rule. Each owned weapon can occupy only one slot. A sortie begins on the first
occupied slot, and the player can switch between two equipped weapons with `X` or the
control beside the combat field. Switching does not reset the current firing cooldown.
Older infrastructure, equipment, market, and technology progress remain compatible.
