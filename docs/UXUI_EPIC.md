# UX/UI hygiene & accessibility epic — design contract

Living product contract for the UX/UI epic (E6), approved 2026-08-18. This
document is the source of truth for the management-UI work: the overlay stack,
focus management, accessibility, and HUD ownership. Durable decisions are
recorded in `docs/DECISIONS.md` (#23+); execution contract and progress live in
`docs/PLAN.md` / `docs/STATUS.md`.

## 1. Product intent

- Overlays (modal dialogs, the settings menu) behave as a single stack: the top
  overlay owns input, Escape closes it, and opening one over another restores
  the previous one.
- Every `aria-modal` dialog is keyboard-safe: it receives initial focus, traps
  Tab while open, and restores focus to the trigger on close.
- The UI survives every viewport and assistive-technology setup: safe-area
  insets, a text-size option, colour-independent status, and reduced-motion
  respect.
- HUD ownership (DOM vs Phaser) is an explicit decision, not an accident.

## 2. Non-goals

- Gameplay, balance, content, and the save schema are untouched.
- The audio layer and the `shmup` genre skill are separate workstreams.
- No rewrite of `h()`/template rendering, the store, or the Phaser scene.

## 3. Baseline (2026-08-18)

- Overlays were managed with scattered `hidden = true` toggles and three
  separate Escape paths (`window` keydown for design-system/sortie-picker,
  `document` keydown for settings).
- `aria-modal` dialogs had no initial focus, no focus trap, and no focus
  restore.
- No safe-area insets, no text-size option; some status was conveyed by colour
  alone.
- HUD split between DOM (credits/month/route) and Phaser (armour/score/weapon).

## 4. Work breakdown

### E6.0 — Design contract + decisions (done)

`docs/UXUI_EPIC.md`, `docs/DECISIONS.md` #23, `docs/INDEX.md`, PLAN/STATUS.

### E6.1 — Overlay stack (done)

`src/ui/overlay.ts` (DOM-free push/pop/remove stack) + `app-shell.ts` wiring
(ids → elements, visibility, pause side effects, unified Escape). Unit tests in
`tests/unit/overlay.test.ts`. Acceptance: one Escape path; modal-over-modal
push/pop; top overlay owns input; `body.has-overlay` scroll lock.

### E6.2 — Focus management (done)

Initial focus (`[data-overlay-focus]` or first focusable), Tab trap while a
modal is top, focus restore to the trigger (or the settings toggle) on close.
Acceptance: keyboard-only open/close; Tab never escapes the dialog.

### E6.3 — Safe-area + accessibility options (pending)

`env(safe-area-inset-*)` on the top bar and sortie frame; a text-size setting
(`--text-scale`); colour-independent status (label/icon next to colour); a
reduce-shake/reduce-flash toggle consumed by `CombatScene`.

### E6.4 — HUD ownership contract (pending)

Record the DOM-vs-Phaser HUD split and who owns the active-weapon label
(DECISIONS #24); consolidation only if the decision demands it.

### E6.5 — Toast/a11y + i18n overflow hardening (pending)

`toast.ts` gets `role="status"` + an `aria-live` container with a stack limit;
verify en/uk/zh labels do not overflow buttons at 320px.

### E6.6 — Verification & regression (pending)

Keyboard-only / gamepad / resize / reduced-motion human checklist in
`docs/PLAYTEST.md`; keep the overlay-stack unit tests green.

## Definition of done

Every E6 task closes only when `npm run lint`, `npm run typecheck`, `npm test`,
and `npm run build` pass, and `docs/PLAN.md` / `docs/STATUS.md` are updated.
