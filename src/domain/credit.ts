import type { BaseState, GameState, LoanState } from './model';

export interface LoanOfferDefinition {
  readonly lenderId: string;
  readonly principal: number;
  readonly interestRate: number;
  readonly termMonths: number;
}

export const LOAN_OFFERS: readonly LoanOfferDefinition[] = [
  { lenderId: 'lender-commission', principal: 200, interestRate: 0.1, termMonths: 2 },
  { lenderId: 'lender-prc', principal: 300, interestRate: 0.05, termMonths: 3 },
  { lenderId: 'lender-ukraine', principal: 250, interestRate: 0.08, termMonths: 2 },
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
