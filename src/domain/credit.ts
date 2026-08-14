import type { BaseState, GameState, LoanState } from './model';

export interface LoanOfferDefinition {
  readonly lenderId: string;
  readonly principal: number;
  readonly interestRate: number;
  readonly termMonths: number;
}

export const LOAN_OFFERS: readonly LoanOfferDefinition[] = [
  { lenderId: 'lender-commission', principal: 600, interestRate: 0.1, termMonths: 2 },
  { lenderId: 'lender-prc', principal: 1200, interestRate: 0.05, termMonths: 4 },
  { lenderId: 'lender-ukraine', principal: 900, interestRate: 0.08, termMonths: 3 },
];

export function loanRepayment(offer: LoanOfferDefinition): number {
  return Math.round(offer.principal * (1 + offer.interestRate));
}

export function hasOutstandingLoan(base: BaseState, lenderId: string): boolean {
  return base.loans.some((loan) => loan.lenderId === lenderId && !loan.repaid);
}

export function availableLoanOffers(base: BaseState): readonly LoanOfferDefinition[] {
  return LOAN_OFFERS.filter((offer) => !hasOutstandingLoan(base, offer.lenderId));
}

export function takeLoan(state: GameState, offer: LoanOfferDefinition): GameState {
  if (hasOutstandingLoan(state.base, offer.lenderId)) {
    throw new Error(`A loan from ${offer.lenderId} is already outstanding.`);
  }
  const loan: LoanState = {
    id: `loan-${state.base.loans.length + 1}`,
    lenderId: offer.lenderId,
    principal: offer.principal,
    repaymentDue: loanRepayment(offer),
    dueMonth: state.base.month + offer.termMonths,
    repaid: false,
  };
  return {
    ...state,
    base: {
      ...state.base,
      credits: state.base.credits + offer.principal,
      loans: [...state.base.loans, loan],
    },
  };
}

export function settleDueLoans(base: BaseState): BaseState {
  let credits = base.credits;
  let changed = false;
  const loans = base.loans.map((loan) => {
    if (!loan.repaid && loan.dueMonth <= base.month) {
      credits -= loan.repaymentDue;
      changed = true;
      return { ...loan, repaid: true };
    }
    return loan;
  });
  return changed ? { ...base, credits, loans } : base;
}

/** Remaining amount owed on a loan after any partial early repayment. */
export function loanRemaining(loan: LoanState): number {
  return loan.repaid ? 0 : loan.repaymentDue;
}

/** Partially or fully repays an outstanding loan early; refunds overpayment. */
export function repayLoan(base: BaseState, loanId: string, amount: number): BaseState {
  const loan = base.loans.find((entry) => entry.id === loanId && !entry.repaid);
  if (loan === undefined) {
    throw new Error(`Loan ${loanId} is not outstanding.`);
  }
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new RangeError('Loan repayment must be a positive integer.');
  }
  if (base.credits < loan.repaymentDue && base.credits < amount) {
    throw new Error('Insufficient credits to repay the loan.');
  }
  const repayment = Math.min(amount, loan.repaymentDue);
  const refund = amount - repayment;
  const repaid = repayment >= loan.repaymentDue;
  return {
    ...base,
    credits: base.credits - repayment + refund,
    loans: base.loans.map((entry) =>
      entry.id === loanId
        ? { ...entry, repaymentDue: entry.repaymentDue - repayment, repaid }
        : entry,
    ),
  };
}
