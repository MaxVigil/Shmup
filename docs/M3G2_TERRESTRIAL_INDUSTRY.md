# M3g.2 terrestrial development and production contract

M3g.2 turns terrestrial weapons into a complete Base pipeline without adding
real-world timers, spare-item logistics, equipment loss, or broad upgrade trees.

## Institutions

- The former Technology Laboratory is now the **Research and Development Centre**
  (**Науково-дослідний центр**). Staffed terrestrial projects produce manufacturing
  blueprints here.
- The former Engineering Workshop is now the **Prototype and Production Works**
  (**Дослідно-виробничий цех**, compact UI: **Виробничий цех**). It requires the
  Centre rather than the Capturer blueprint and manufactures all current terrestrial
  hardware.
- The Capturer remains a terrestrial special project, but it no longer acts as the
  artificial prerequisite for general production infrastructure.

## M3g.2a staffing contract

- Scientists are hired and presented inside the Research tab, where their current
  contribution is understandable. Existing scientist progression remains sortie-based.
- The Works presents its own production staff. A single lead engineer costs 180
  credits and is required to manufacture the Capturer, an Accelerator qualification
  example, or either weapon improvement.
- Only one engineer can be hired in this adaptation. Additional engineers would be a
  misleading purchase until production duration, staffing power, and payroll exist.
- Funding a weapon-improvement research project produces an explicit production
  blueprint; manufacturing that blueprint remains a separate Engineering action.
- Current weapon-improvement research resolves immediately. Research difficulty,
  scientist power, engineer throughput, recurring salaries, staffing allocation, and
  production duration are deliberately deferred to one coherent personnel-economy
  cycle. They must use campaign/gameplay steps rather than real-world waiting timers.

## Accelerator industrialisation

1. A finished Impulse Accelerator remains available early for 620–680 credits.
2. After five completed sorties, the market reveals a separate deterministic
   180–220-credit production licence.
3. A staffed Works manufactures one qualification example for 220 credits and 8
   materials.
4. If the organisation did not already own the finished weapon, the qualification
   example becomes its first usable Accelerator.
5. The first local example records production mastery and unlocks the Accelerator
   improvement branch. Additional redundant copies are not offered while the campaign
   has one aircraft and weapons cannot be lost.

The licence plus first example costs 400–440 credits and 8 materials, materially less
than buying a finished weapon. The finished-weapon route buys immediate access; the
blueprint route buys patience, lower cost, and future development.

## First improvements

Both improvements use the same two-step contract: fund development in the Centre,
then manufacture and integrate the resulting hardware in the Works.

- **Reinforced machine-gun ammunition** requires only a staffed Centre. Development
  costs 140 credits; production costs 90 credits and 4 materials. It doubles projectile
  damage from 10 to 20 while preserving the four-shot-per-second cadence.
- **Upgraded impulse accumulator** appears only after Accelerator production mastery.
  Development costs 180 credits; production costs 120 credits and 6 materials. It
  raises cadence from 1 to 1.25 shots per second while retaining 60 damage and unlimited
  vertical piercing.

Manufactured improvements apply permanently to the matching owned weapon and survive
every sortie outcome. The Hangar communicates the changed role qualitatively; exact
coefficients remain in typed content, tests, and this implementation contract.

## Information boundary

- The blueprint offer is not shown before its five-sortie reveal.
- The Accelerator improvement is not shown before local production is mastered.
- Engineering shows only manufacturing actions backed by an owned or researched
  blueprint.
- No UI invents future aircraft, spare weapons, durability, or production queues.

## Persistence

Save schema v8 adds local-production mastery plus researched and manufactured weapon
improvements. v7 campaigns retain both primary slots, inventory, facilities, staff,
market state, Capturer progress, and alien research; their new M3g.2 fields begin empty.
