# Shmup

A browser vertical shmup about informed risk, alien technology, and an
international corporate base on Earth.

The player prepares a pilot and loadout, flies a 15–20 minute sortie, and chooses
whether to install partly understood alien technology or preserve it for research.
Extraction secures the haul; failure loses part of it.

## Status

M0 and M1 are merged. M2 is a playable risk-and-extraction prototype with a partly
understood artefact, install-or-preserve choice, transformed weapon, defensive
passive, safe extraction option, optional elite encounter, and partial loss after
failure.

## Requirements

- Node.js 24.14.0 (see `.nvmrc`)
- npm 11+

## Start locally

```bash
npm ci
npm run dev
```

The normal M2 encounter lasts three minutes. During local development, append
`?m2Fast=true` to the URL to compress the signal, extraction, and forced-extraction
timings to 5% for repeatable decision-flow checks.

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
and [current status](docs/STATUS.md).

## Project sources

- [Notion project hub](https://app.notion.com/p/3b481cc4e8c28077963cd6198964794e)
- [Game Brief v0.1](https://app.notion.com/p/3b481cc4e8c281c09fe4e1f541e78296)
- [Technical Plan v0.1](https://app.notion.com/p/3b481cc4e8c2815d87c7ce1c4c4bd050)
