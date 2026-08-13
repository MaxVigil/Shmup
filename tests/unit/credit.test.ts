import { describe, expect, it } from 'vitest';
import {
  availableLoanOffers,
  hasOutstandingLoan,
  LOAN_OFFERS,
  loanRepayment,
  settleDueLoans,
  takeLoan,
  type LoanOfferDefinition,
} from '../../src/domain/credit';
import { createInitialGameState } from '../../src/domain/initial-state';

describe('credit line', () => {
  const commission = LOAN_OFFERS[0] as LoanOfferDefinition;
  const prc = LOAN_OFFERS[1] as LoanOfferDefinition;

  it('computes deterministic repayment from principal and interest', () => {
    expect(loanRepayment(commission)).toBe(220);
    expect(loanRepayment(prc)).toBe(315);
  });

  it('grants a loan, credits the reserve, and records its due month', () => {
    const state = createInitialGameState();
    const updated = takeLoan(state, prc);
    expect(updated.base.credits).toBe(state.base.credits + prc.principal);
    expect(updated.base.loans).toHaveLength(1);
    const loan = updated.base.loans[0];
    expect(loan?.lenderId).toBe(prc.lenderId);
    expect(loan?.repaymentDue).toBe(315);
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
    expect(settled.credits).toBe(due.base.credits - 220);
    expect(settled.loans[0]?.repaid).toBe(true);
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
