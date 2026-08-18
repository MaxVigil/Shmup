---
name: shmup
description: Design and review shoot-'em-up combat, encounters, enemies, weapons, elites, bosses, readability, difficulty, and moment-to-moment risk. Use for shmup gameplay and combat-design work; combine with engine and implementation skills when code changes are required.
---

# Shmup

Use this skill to make shmup combat readable, fair, tactically varied, and expressive of the player's build. It provides genre design guidance, not project-specific rules or engine instructions.

## Project Authority

Read the repository's `AGENTS.md` and relevant design documents before making project-specific decisions. They define the product fantasy, architecture, content rules, terminology, and durable constraints. If this skill conflicts with project guidance or an explicit user decision, follow the project or user.

Do not copy project-specific balance values, content ladders, run lengths, weapon restrictions, or lore into this skill. Do not introduce real-world timers.

## Core Experience

Design combat around this decision loop:

```text
read threats → choose position → prioritize targets → use the build well
→ take or avoid optional risk → survive → learn → adapt the build
```

The buildcraft fantasy is central: weapons, aircraft, modules, consumables, and other capabilities should change how the player solves encounters, not merely increase a single number. A signature risk-versus-knowledge mechanic may be important without replacing buildcraft as the core.

## Threat Design, Not Bullet Density

Do not use projectile density as the default difficulty lever. This skill does not assume bullet-hell design.

Build pressure through combinations of:

- enemy composition and formation;
- positioning and screen-space control;
- movement, interception, flanking, or pursuit;
- target priority and support relationships;
- telegraphed beams, missiles, mines, hazards, and area denial;
- timing, objective pressure, resource pressure, and optional risk;
- distinct elite mechanics and environmental conditions.

Evaluate **total visual and threat load**, not each hazard in isolation. When movement demands, projectiles, effects, UI, allies, pickups, and objectives overlap, simplify or sequence them until the important decision remains readable.

## Fairness and Readability

- Challenge decisions and execution, not the player's ability to decipher the screen.
- Uncertainty is allowed; obscurity is not. Unknown outcomes may create tension, but actionable danger must be perceivable.
- Telegraph high-impact threats early enough for the available movement model and counters.
- Make hostile projectiles, hazards, enemies, allies, pickups, and background effects visually distinguishable.
- Keep collision and visible silhouettes consistent; communicate the player hitbox when precision matters.
- Avoid untelegraphed off-screen damage, hidden attacks, unavoidable overlaps, and effects that conceal live threats.
- Use feedback to explain hits, blocks, stuns, armour loss, target damage, objective progress, and weapon impact without drowning the playfield.
- Difficulty may reduce reaction time or increase combined demands, but must preserve a legible cause-and-effect chain.

## Enemy and Wave Roles

Define every enemy by the decision it creates, not by appearance or health alone. Record its role, entry, movement, attack, target priority, counterplay, and interaction with other enemies.

Useful roles include interceptor, flanker, bomber, support unit, shield bearer, missile carrier, area controller, objective attacker, armoured target, and high-value enabler. Combine roles deliberately; avoid waves made only of scaled copies.

Each wave should have a purpose: introduce a mechanic, reinforce recognition, test target priority, test a build capability, create a resource decision, or offer optional risk. Remove waves that add duration without a new decision.

## Weapons and Build Expression

Direct forward fire may be a baseline, not a universal constraint. Support weapons and systems such as spread fire, side or rear coverage, homing, rockets, mines, bombs, drones, turrets, beams, chain attacks, deployables, defence, and control when the project allows them.

- Prefer tactical identity over small numerical variants.
- Make range, cadence, coverage, penetration, tracking, ammunition, energy, weight, defence, and utility create meaningful trade-offs.
- Preserve a build's investment: rebalance or evolve it without casually invalidating the player's accumulated choices.
- Keep each intended build fantasy viable enough to learn and enjoy. A specialist build may have poor matchups, but must not be a disguised trap.
- Avoid a single globally dominant build. Situational strengths should come from encounter demands, not arbitrary immunities.
- Do not make every new enemy negate the player's current weapon. Provide multiple forms of counterplay.

## Elite, Boss and Encounter Design

- Telegraph elite and boss attacks through readable animation, audio, positioning, and recognizable patterns.
- Never rely on hidden, unavoidable, or effectively instant high-impact attacks.
- Make phase transitions legible and give the player a brief chance to re-read the encounter.
- Each phase must create a distinct tactical state, not merely add health or damage.
- Use targetable components when they create meaningful priority, sequencing, or capability choices.
- Use vulnerability windows to reward recognition, positioning, resource timing, or deliberate risk.
- Let elites and bosses expose a build's strengths and weaknesses without countering everything the player chose.
- Ensure more than one viable approach whenever the wider build system supports it.
- Shape encounter rhythm as pressure → release → escalation → culmination.
- Give every wave a job: teach, test target priority, alter space, tax a resource, or offer risk/reward.
- Use release beats for recovery, anticipation, repositioning, or a meaningful choice, not empty delay.
- Escalate by combining understood mechanics before introducing additional complexity.
- Avoid HP sponges whose behaviour does not change.
- Avoid unreadable projectile flooding as a substitute for encounter design.
- Avoid bosses that repeat ordinary-enemy behaviour at a larger scale.

## Objectives and Risk

Combat need not reduce every mission to eliminating all enemies. Objectives may involve interception, escort, defence, scanning, recovery, survival, precision strikes, disabling components, or extraction.

- Let objectives change movement, target priority, loadout value, and failure conditions.
- Make optional risks legible: what is known, what remains uncertain, what can be gained, and what can be lost.
- Give the player enough warning and agency to retreat before irreversible destruction when the project supports retreat.
- Retreat may be costly and may require surviving an extraction sequence; it should not be an invisible instant escape.
- Do not erase long-term investment merely to manufacture stakes. Permanent loss must follow explicit project rules and readable risk.

## Difficulty and Tuning

Tune the relationship between player mobility, enemy speed, projectile speed, telegraph time, screen occupancy, time-to-kill, recovery opportunities, and objective load.

Increase difficulty by asking richer or faster decisions after the player has learned their components. Avoid stacking unfamiliar mechanics simultaneously. Keep deterministic or seeded behaviour where the project requires reproducibility.

When reviewing a combat change, ask:

1. What decision does this create?
2. Can the player perceive the cause, response window, and result?
3. Which builds gain or lose value, and is that situational rather than global?
4. Does total threat and visual load remain readable?
5. Does the encounter teach, test, escalate, or pay off something specific?
6. Can a failed player explain what happened and adapt?

## Composition

Pair this skill with the relevant engine, physics, input, AI, game-feel, camera, performance, UI, save, or accessibility skill. Keep genre decisions here and implementation details in the appropriate technical layer.

