# Shmup

A browser vertical shmup about designing, developing and enjoying aircraft-and-
weapon builds — both in themselves and in 15–20 minute sorties.

The player prepares a pilot and loadout at the base, refines their build between
sorties, and can choose whether to install partly understood alien technology in
the field or preserve it for research. Extraction secures the haul; failure loses
part of it.

## Status

M0 and M1 are merged. M2–M3g.2 form a playable risk-and-extraction prototype with a
departmental Base, separated terrestrial and alien research, guided Capturer
progression, trilingual UI (Ukrainian, English, Chinese), managed sortie endings,
and an operational contract that rewards confirmed targets and penalizes breaches.
The base has grown a fleet (three aircraft types, hangar bays, per-aircraft refuel),
a Command Centre (sortie-counted months, deterministic threat map, credit line), and
a loan system with month-boundary repayment.

## Requirements

- Node.js 24.14.0 (see `.nvmrc`)
- npm 11+

## Start locally

```bash
npm ci
npm run dev
```

The normal M2 encounter lasts three minutes. During local development, append
`?m2Fast=true` to the URL to open the extraction window after 4.5 seconds and leave
enough time to destroy the Warden for repeatable decision-flow checks. After choosing
Install or Preserve, fast mode uses an 8-second escape instead of the normal 35 seconds.
Preserve the Prism, survive the escape, then use the Technology Lab to research and
equip Split Pulse before launching the next sortie.

The application opens on the Command Centre. Use the gear button in the shared top bar to
switch between Ukrainian, English, and Chinese; Ukrainian is used when no preference is stored.
New profiles must earn materials in sorties, construct the Research and Development Centre, and
hire scientists from the Research tab before alien samples can be researched.
The Prototype and Production Works then manufactures purchased and researched
blueprints after a lead engineer is hired there. Scientists advance the Alien Technology Capturer blueprint on completed sorties. Once
researched, manufacture the device in the Works and install it in
Kestrel's special-equipment slot. The Warden can still be intercepted without it, but
its alien artefact is recoverable only while the Capturer is equipped.
The Base highlights the next prerequisite in this chain, shows exact resource
shortfalls, warns about Capturer status before launch, and reports economy and research
payoff separately after every sortie.

The Recovery Council begins a new profile with a 500-credit defence reserve. Scouts
pay 8 credits, Weavers 12, and the Warden 100 when destroyed. A regular enemy that
reaches the protected corridor incurs a penalty equal to five times its bounty. A
reserve of zero or less ends the campaign.

During a sortie, use WASD, the arrow keys, or the pointer to move. Press `X` to switch
between two equipped primary weapons and `P` to pause;
opening Settings also pauses combat. At decision prompts use `E` to extract, `C` to
continue, `1` to install an artefact, and `2` to preserve it.

For a focused local stage 4 check, open
`?m2Fast=true&stage4Ready=true`. This temporary playtest profile starts with a
manufactured Capturer in storage and does not read or overwrite normal game progress.
Use `?m3eBankrupt=true` to inspect the insolvency state without changing the normal save.
Use `?m3g2Ready=true` for a temporary six-sortie industrial profile with the Centre,
Works, credits, and materials ready for the complete blueprint and upgrade check.

## Validate

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Architecture

Phaser renders real-time combat. Plain HTML and CSS will render the management
interface. Pure TypeScript domain rules sit between them, with typed content and a
versioned local save boundary.

See [the game specification](docs/GAME_SPEC.md), [implementation plan](docs/PLAN.md),
and [current status](docs/STATUS.md). The current management-interface contract is
documented in [M3f base information architecture](docs/M3F_BASE_INFORMATION_ARCHITECTURE.md).
The terrestrial market and Impulse Accelerator are documented in
[M3g.1 market and Accelerator](docs/M3G1_MARKET_ACCELERATOR.md); the blueprint,
production, and first-upgrade pipeline is documented in
[M3g.2 terrestrial industry](docs/M3G2_TERRESTRIAL_INDUSTRY.md).

## Project sources

- [Notion project hub](https://app.notion.com/p/3b481cc4e8c28077963cd6198964794e)
- [Game Brief v0.1](https://app.notion.com/p/3b481cc4e8c281c09fe4e1f541e78296)
- [Technical Plan v0.1](https://app.notion.com/p/3b481cc4e8c2815d87c7ce1c4c4bd050)
