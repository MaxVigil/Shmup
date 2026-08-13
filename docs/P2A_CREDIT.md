# P2a — Credit line (save schema v12)

Status: implemented on `test` (2026-08-13); awaiting playtest before merging to `main`.

## Why

The 500-credit start plus per-sortie refuel costs can strand a player who is short on
liquidity. A small, deterministic credit line is a pressure valve that fits the
existing rules: the month is already a sortie counter, and the insolvency rule
already triggers when the reserve reaches zero. The lenders also carry narrative
weight: the PRC offers the best terms, exercising the standing product constraint
that China sometimes provides better conditions.

## Lenders (prototype numbers)

| Lender | Principal | Interest | Term | Repayment |
|---|---|---|---|---|
| Recovery Commission | 200 | +10% | 2 months | 220 |
| PRC | 300 | +5% | 3 months | 315 |
| Ukraine | 250 | +8% | 2 months | 270 |

- One outstanding loan per lender; a lender can be used again after repayment.
- Terms are fixed constants in `src/domain/credit.ts` — deterministic, no RNG.
- Repayment falls due at the month boundary (`dueMonth = month + termMonths`).

## Domain rules (`src/domain/credit.ts`)

- `loanRepayment(offer)` — principal × (1 + interest), rounded.
- `hasOutstandingLoan(base, lenderId)` — one loan per lender.
- `availableLoanOffers(base)` — lenders without an outstanding loan.
- `takeLoan(state, offer)` — validates no outstanding loan, credits the principal,
  records `LoanState { id, lenderId, principal, repaymentDue, dueMonth, repaid }`.
- `settleDueLoans(base)` — at the month boundary, each unpaid loan with
  `dueMonth <= month` is repaid from the reserve and marked `repaid`. If the reserve
  cannot cover the repayment, the existing insolvency rule (reserve ≤ 0) applies.

## Schema change v11 → v12

`BaseState` gains `loans: readonly LoanState[]`. The v11 migration starts with no
loans; every older migration also provisions `loans: []`.

## Store

- `TAKE_LOAN { lenderId }`.
- `SETTLE_SORTIE` applies `settleDueLoans` when the month advances.

## UI

The Command Centre gains a **Credit line** section: lender offers with principal,
repayment, interest, and term plus a TAKE LOAN action; and an active-loans list with
due months and repaid state. All strings are typed keys in uk/en/zh.

## Tests

- `tests/unit/credit.test.ts` — repayment math, one loan per lender, month-boundary
  settlement.
- `tests/unit/store.test.ts` — `TAKE_LOAN` and repayment at the month boundary.
- `tests/unit/save-repository.test.ts` — v11 → v12 migration starts loan-free.

## Open tuning

- Principal, interest, and terms are prototypes for playtest balance.
- No compound interest, late penalties, or reputation; the cascade into insolvency is
  intentional.
