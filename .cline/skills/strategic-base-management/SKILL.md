---
name: strategic-base-management
description: Design and review strategic base-management layers that turn combat outcomes into persistent buildcraft decisions through research, engineering, personnel, facilities, resources, preparation, recovery, and progression. Use for strategy-layer systems and their connection to missions; not for moment-to-moment combat implementation.
---

# Strategic Base Management

Use this skill to make a strategic base layer produce meaningful preparation, opportunity cost, persistent development, and adaptation. It supplies general design guidance, not project-specific content or balance.

## Project Authority

Read the repository's `AGENTS.md` and relevant design documents before making project-specific decisions. They define the product fantasy, architecture, terminology, content boundaries, economy, persistence, and durable constraints. If this skill conflicts with project guidance or an explicit user decision, follow the project or user.

Do not duplicate project-specific factions, technology ladders, buildings, resources, costs, durations, or content catalogs here. Do not introduce real-world timers; progress through explicit game events or campaign actions according to project rules.

## Core Strategic Loop

```text
combat outcome → resources, damage, knowledge, experience, opportunities
→ assess constraints → choose investments and preparation
→ configure a build and accept risk → next mission plays differently
→ receive clear feedback → reinforce, repair, or change direction
```

Combat must feed the base, and the base must change combat. Avoid a weak loop in which missions only add currency and the base only buys linear percentage increases.

The core is buildcraft: developing and enjoying persistent combinations of platforms, equipment, personnel, and supporting capabilities. A signature risk-versus-knowledge choice may remain important without becoming the sole progression system.

## Meaningful Strategic Decisions

- Put complexity in choices, not paperwork.
- Make scarcity produce opportunity cost: choosing one capability delays, weakens, or excludes another useful path.
- Avoid a single globally dominant build order, research order, facility order, or equipment path.
- Give players enough information to reason about consequences; uncertainty is allowed, obscurity is not.
- Preserve investment. New tiers and discoveries should extend, specialize, or create alternatives rather than routinely nullifying prior work.
- Keep intended build fantasies viable enough to reward commitment. A path may be situational without becoming a trap.
- Let recovery from a poor decision remain possible but meaningfully costly.
- Avoid irreversible choices whose consequences could not reasonably be understood when chosen.

## Research, Engineering and Preparation

Keep responsibilities clear:

- Research creates knowledge, reveals properties, reduces uncertainty, and unlocks designs or capabilities.
- Engineering constructs facilities and produces physical platforms, weapons, modules, upgrades, and consumables.
- Storage or inventory accounts for physical items without becoming clerical busywork.
- Preparation assigns personnel, configures loadouts, loads finite resources, repairs, and verifies readiness.

Do not duplicate a full loadout editor across several screens. Keep one authoritative preparation surface and let mission briefing provide context, comparison, warnings, and a direct return path.

Research should create decisions rather than punish curiosity. If small analysis, lore, or intelligence projects always lose to direct combat upgrades in one shared bottleneck, reconsider capacity, duration, or project structure.

## Personnel, Buildings and Resources

- Personnel roles may include research, engineering, operations, pilots, and specialists.
- Personnel should affect throughput, quality, capacity, availability, or which projects can be attempted.
- Make assignment and hiring decisions strategically legible; avoid repetitive transfers and routine confirmations.
- Keep complexity in choices, not paperwork: personnel management should not become roster administration for its own sake.
- Buildings must create a capability, constraint, capacity, or meaningful decision.
- Useful building effects include research or production capacity, storage or hangar slots, trade access, repair, and medical support.
- Do not use buildings as arbitrary prerequisite gates with no visible operational purpose.
- Make construction compete with other valuable uses of time, staff, space, energy, or resources.
- Give every resource a clear, distinct role that cannot be replaced by renaming another currency.
- Credits, materials, energy, research, capacity, and rare recovered matter should answer different strategic questions.
- Resource scarcity should force prioritization and trade-offs, not merely slow every action equally.
- Avoid redundant currencies, opaque conversion chains, and resources with only one automatic sink.
- Show why an action is blocked and which capability or resource resolves it.
- Keep upkeep and recurring costs decision-relevant without turning the base into accounting chores.
- Validate the cross-layer chain: base decision → opportunity cost → combat consequence → feedback → adaptation.
- If any link is missing, the system is probably decorative, disconnected, or insufficiently legible.

## Progression and Build Identity

Progression should create new capabilities, interactions, and specializations—not only larger values.

- Support competing development paths with recognizable strengths and weaknesses.
- Make advanced options change what the player can attempt or how a mission is approached.
- Retain meaningful uses for refined early technology where project rules call for it.
- Avoid compulsory upgrades that make every experienced player converge on the same final configuration.
- Use soft specialization and opportunity cost before hard locks unless exclusivity is central and clearly communicated.
- Let personnel experience, platform history, equipment investment, and institutional capacity create attachment and continuity.

## Damage, Recovery and Persistent Stakes

Persistent damage, repair time, fatigue, injury, maintenance, and replacement costs can make mission outcomes matter between sorties.

- Surface readiness and consequences before launch.
- Give players a costly recovery path that avoids accidental campaign deadlocks.
- Distinguish repairable damage from irreversible destruction.
- If permanent loss exists, apply it consistently to the actual persistent entity and its project-defined attached losses.
- Telegraph severe risk and provide the project-defined opportunity to retreat or extract before destruction.
- Keep retreat costly enough to preserve stakes, but preferable to losing major long-term investment.
- Record meaningful history so survival, damage, recovery, and loss remain part of the campaign narrative.

## Information, Intelligence and Uncertainty

Strategic information should improve decisions without solving them automatically.

- Separate confirmed, probable, possible, and unknown information.
- Let observation, missions, personnel, research, facilities, or other project-approved sources improve knowledge.
- Show actionable implications, such as likely threats, useful capabilities, risks, and countermeasures.
- Preserve bounded uncertainty even at high knowledge when mystery is part of the product.
- Do not conceal rules that the player needs to understand costs, readiness, failure, or permanent consequences.

## Markets and Alternative Acquisition

Markets may provide speed, flexibility, replacement capacity, or access to project-approved baseline goods. Research and production may provide efficiency, specialization, refinement, or capabilities unavailable through trade.

Follow `AGENTS.md` and project documents for strict market content boundaries. Never infer that every technology tier, recovered item, upgrade level, or rare capability should be purchasable.

- Ensure buying, producing, researching, recovering, and selling solve meaningfully different problems.
- Prevent trade from bypassing the progression paths it is meant to support.
- Make rotation, stock, pricing, and specialist effects create choices rather than random frustration.
- Explain whether an offer is a replacement, sidegrade, shortcut, blueprint, consumable, or long-term investment.

## Interface and Information Architecture

Each major screen should answer one primary question. Prefer stable departments and contextual links over many equal top-level tabs.

- Keep persistent campaign resources and urgent status visible without forcing a return to an overview screen.
- Put actions where their consequences are understandable: research with knowledge, production with physical output, preparation with the persistent build.
- Preserve task context across transitions, especially mission briefing ↔ preparation.
- Explain disabled actions and provide a route to resolve blockers.
- Use comparison to show trade-offs; avoid dense tables when roles and consequences can be communicated more clearly.
- Keep state authoritative in the domain/store and preserve accessibility, focus, localization, and save contracts.

## Cross-Layer Design Test

For every strategic feature, trace this chain:

```text
base decision
→ opportunity cost
→ combat consequence
→ observable feedback
→ informed adaptation
```

Reject or revise the feature when the decision has no real alternative, the cost is merely delay, combat does not change, feedback cannot identify the effect, or the player cannot adapt afterward.

Also ask:

1. Does this create or strengthen a distinct build fantasy?
2. Can the player understand why the choice matters now and later?
3. Does it avoid a globally dominant path?
4. Does it preserve prior investment while allowing strategic change?
5. Does it connect the next mission back to the base in a visible way?

## Composition

Pair this skill with game UI/UX, save systems, economy/balance, content modeling, accessibility, and the relevant engine skill. Pair it with a combat genre skill when evaluating how base decisions alter missions. Keep project-specific facts in `AGENTS.md`, repository documentation, and typed content.

