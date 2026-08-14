import { describe, expect, it } from 'vitest';
import {
  availableLoanOffers,
  hasOutstandingLoan,
  LOAN_OFFERS,
  loanRepayment,
  repayLoan,
  settleDueLoans,
  takeLoan,
  type LoanOfferDefinition,
} from '../../src/domain/credit';
import { createInitialGameState } from '../../src/domain/initial-state';

describe('credit line', () => {
  const commission = LOAN_OFFERS[0] as LoanOfferDefinition;
  const prc = LOAN_OFFERS[1] as LoanOfferDefinition;

  it('computes deterministic repayment from principal and interest', () => {
    expect(loanRepayment(commission)).toBe(660);
    expect(loanRepayment(prc)).toBe(1260);
  });

  it('grants a loan, credits the reserve, and records its due month', () => {
    const state = createInitialGameState();
    const updated = takeLoan(state, prc);
    expect(updated.base.credits).toBe(state.base.credits + prc.principal);
    expect(updated.base.loans).toHaveLength(1);
    const loan = updated.base.loans[0];
    expect(loan?.lenderId).toBe(prc.lenderId);
    expect(loan?.repaymentDue).toBe(1260);
    expect(loan?.dueMonth).toBe(state.base.month + prc.termMonths);
    expect(loan?.repaid).toBe(false);
  });

  it('allows only one outstanding loan per lender', () => {
    const state = createInitialGameState();
    const withLoan = takeLoan(state, commission);
    expect(hasOutstandingLoan(withLoan.base, commission.lenderId)).toBe(true);
    expect(availableLoanOffers(withLoan.base).map((offer) => offer.lenderId)).not.toContain(
      commission.lenderId,
    );
    expect(() => takeLoan(withLoan, commission)).toThrowError(/outstanding/i);
  });

  it('settles due loans at the month boundary and deducts the repayment', () => {
    const state = createInitialGameState();
    const withLoan = takeLoan(state, commission);
    const due = {
      ...withLoan,
      base: {
        ...withLoan.base,
        month: withLoan.base.loans[0]?.dueMonth ?? 3,
      },
    };
    const settled = settleDueLoans(due.base);
    expect(settled.credits).toBe(due.base.credits - 660);
    expect(settled.loans[0]?.repaid).toBe(true);
  });

  it('repays a loan partially and then fully before its term', () => {
    const state = createInitialGameState();
    const withLoan = takeLoan(state, prc);
    const partially = repayLoan(withLoan.base, withLoan.base.loans[0]?.id ?? '', 500);
    expect(partially.loans[0]?.repaid).toBe(false);
    expect(partially.loans[0]?.repaymentDue).toBe(760);
    expect(partially.credits).toBe(withLoan.base.credits - 500);

    const fully = repayLoan(partially, partially.loans[0]?.id ?? '', 760);
    expect(fully.loans[0]?.repaid).toBe(true);
    expect(fully.loans[0]?.repaymentDue).toBe(0);
    expect(fully.credits).toBe(partially.credits - 760);
  });

  it('refunds overpayment when settling a loan in full', () => {
    const state = createInitialGameState();
    const withLoan = takeLoan(state, commission);
    const base = withLoan.base;
    const settled = repayLoan(base, base.loans[0]?.id ?? '', 1000);
    expect(settled.loans[0]?.repaid).toBe(true);
    expect(settled.credits).toBe(base.credits - 660 + 340);
  });

  it('leaves undue loans untouched', () => {
    const state = createInitialGameState();
    const withLoan = takeLoan(state, commission);
    const before = withLoan.base;
    const settled = settleDueLoans({ ...before, month: before.month });
    expect(settled.credits).toBe(before.credits);
    expect(settled.loans[0]?.repaid).toBe(false);
  });
});
