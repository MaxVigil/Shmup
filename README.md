# Shmup

A browser vertical shmup about informed risk, alien technology, and an
international corporate base on Earth.

The player prepares a pilot and loadout, flies a 15–20 minute sortie, and chooses
whether to install partly understood alien technology or preserve it for research.
Extraction secures the haul; failure loses part of it.

## Status

M0 Foundation is published for review. M1 combat prototyping is in progress with a
playable greybox encounter, automatic fire, armour, two enemy types, and a HUD.

## Requirements

- Node.js 24.14.0 (see `.nvmrc`)
- npm 11+

## Start locally

```bash
npm ci
npm run dev
```

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
