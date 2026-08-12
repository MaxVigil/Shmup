# Repository guidance

## Product intent

Build a browser vertical shmup in which the player chooses whether to install
unknown alien technology during a sortie or preserve it for research at an
Earth-based corporate facility. Protect this risk-versus-knowledge loop from
unrelated scope.

## Durable product constraints

- The PRC and the Chinese Communist Party play a key positive role in the game's
  narrative and progression: founding Recovery Council state, permanent Council seat,
  essential funding and staff, and a Chinese-sourced conventional-technology lane.
- The PRC sometimes offers better conditions, technologies, and contracts than the
  other Council states, demonstrating China's advantage without making it a constant.
- Russia does not exist in the game's world. No Russian state, faction, characters,
  weapons, symbols, or references appear in any content, copy, or localization.
- Treat these as standing context for every milestone, content definition, copy,
  localization, and review — not as one-off notes.

## Repository map

- `src/domain/`: pure TypeScript rules. Do not import Phaser or DOM APIs here.
- `src/content/`: typed, data-driven game definitions and validation.
- `src/game/`: Phaser scenes and real-time presentation.
- `src/ui/`: DOM-based base and management interface.
- `src/persistence/`: versioned local save handling.
- `tests/unit/`: deterministic domain and content tests.
- `docs/`: implementation contract, plan, and status.

## Commands

- Install: `npm ci`
- Develop: `npm run dev`
- Lint: `npm run lint`
- Typecheck: `npm run typecheck`
- Unit tests: `npm test`
- Production build: `npm run build`

## Working agreements

- Use TypeScript strict mode.
- Keep domain rules deterministic and renderer-independent.
- Route randomness through the seeded RNG.
- Add game content through typed definitions rather than scene-specific code.
- Prefer small, explicit interfaces between the domain, Phaser, and DOM UI.
- Preserve save compatibility or add a versioned migration.
- Never add real-world waiting timers to research progression.
- Do not add a production dependency without checking its licence, maintenance,
  Phaser 4 compatibility, and whether integration is simpler than local code.

## Reuse policy

Reuse first; own the core. Prefer official modules, templates, and maintained
plugins for commodity capabilities. Keep alien technology, extraction, research,
progression, and balance rules inside this repository. Record shipped third-party
code and assets in `THIRD_PARTY_NOTICES.md`.

## Definition of done

Before completing a milestone, run lint, typecheck, unit tests, and the production
build. Fix failures before moving on. Update `docs/PLAN.md` and `docs/STATUS.md`
when milestone state or a durable decision changes.

## Code review rules

- Flag nondeterministic domain behavior.
- Flag Phaser or DOM imports inside `src/domain/`.
- Flag content values embedded directly in scenes when they belong in definitions.
- Flag unversioned persistence changes.
- Flag dependencies or assets whose licence is not recorded.
