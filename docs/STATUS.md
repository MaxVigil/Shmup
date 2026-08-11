# Project status

Last updated: 2026-08-11

## Current milestone

M2 — Risk and extraction.

## Completed

- Product interview and Game Brief v0.1.
- Technical Plan v0.1 approved for M0.
- Phaser 4 + TypeScript + Vite selected.
- Reuse-first policy confirmed.
- Foundation source, domain boundaries, tests, and CI prepared locally.
- Local lint and typecheck pass.
- All 11 unit tests pass.
- Production build completes successfully.
- M0 published in draft pull request #1; GitHub Actions CI passes.
- M0 pull request #1 reviewed and merged into `main`.
- Playable MVP scope recorded in the repository specification.
- First M1 greybox increment implemented locally.
- M1 combat prototype merged in PR #2.
- One partly understood Prism signal implemented with install-or-preserve choice.
- Installing activates Prismatic Sheath and transforms the Pulse Cannon into Split Pulse.
- Preserving creates a 10-research payload that remains at risk until extraction.
- Safe extraction and the optional Warden intercept are playable.
- Failed sorties retain half of recovered materials and research.
- Recovered totals persist in the existing browser-local v1 save.
- All 19 unit tests, lint, typecheck, and the production build pass locally.
- Both M2 decision branches were exercised in the local browser without runtime errors.

## Next

1. Review and playtest the M2 draft pull request.
2. Record M1 combat metrics and tune Prism values, extraction timing, and Warden
   pressure from playtest evidence.
3. Merge M2 before beginning the M3 base loop.

## Known gaps

- Working title and narrative premise remain open.
- M1 combat tuning still lacks a repeatable metrics pass.
- M2 values are first-pass prototype tuning and need player evidence.
- Production art and audio intentionally remain out of scope.
- Phaser currently forms one large production chunk; defer code splitting until the
  combat and base routes are separated in M1–M3.
