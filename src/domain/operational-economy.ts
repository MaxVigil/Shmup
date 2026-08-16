import { contentCatalog } from '../content/catalog';
import type { BaseState } from './model';

export interface SortieContractLedger {
  readonly targetsDestroyed: number;
  readonly targetsBreached: number;
  readonly creditsEarned: number;
  readonly creditsPenalized: number;
}

export const EMPTY_SORTIE_CONTRACT: SortieContractLedger = Object.freeze({
  targetsDestroyed: 0,
  targetsBreached: 0,
  creditsEarned: 0,
  creditsPenalized: 0,
});

function assertCreditReward(creditReward: number): void {
  if (!Number.isInteger(creditReward) || creditReward <= 0) {
    throw new RangeError('Target credit reward must be a positive integer.');
  }
}

export function recordTargetDestroyed(
  ledger: SortieContractLedger,
  creditReward: number,
): SortieContractLedger {
  assertCreditReward(creditReward);
  return {
    ...ledger,
    targetsDestroyed: ledger.targetsDestroyed + 1,
    creditsEarned: ledger.creditsEarned + creditReward,
  };
}

export function recordTargetBreached(
  ledger: SortieContractLedger,
  creditReward: number,
  penaltyMultiplier: number,
): SortieContractLedger {
  assertCreditReward(creditReward);
  if (!Number.isInteger(penaltyMultiplier) || penaltyMultiplier < 2) {
    throw new RangeError('Breach penalty multiplier must be an integer of at least two.');
  }
  return {
    ...ledger,
    targetsBreached: ledger.targetsBreached + 1,
    creditsPenalized: ledger.creditsPenalized + creditReward * penaltyMultiplier,
  };
}

export function contractCreditDelta(ledger: SortieContractLedger): number {
  return ledger.creditsEarned - ledger.creditsPenalized;
}

export function isBankrupt(credits: number): boolean {
  if (!Number.isFinite(credits)) {
    throw new RangeError('Credit balance must be finite.');
  }
  return credits <= 0;
}

export interface MonthlyExpenseBreakdown {
  readonly salaries: number;
  readonly upkeep: number;
  readonly total: number;
}

/** Monthly recurring expenses: staff salaries plus constructed facility upkeep. */
export function monthlyExpenses(base: BaseState): MonthlyExpenseBreakdown {
  let salaries = 0;
  for (const member of base.staff) {
    const role = contentCatalog.staffRoles.find((entry) => entry.id === member.roleId);
    if (role === undefined) {
      continue;
    }
    salaries += Math.round(role.salaryCreditCost * member.salaryMultiplier);
  }
  for (const pilot of base.pilots) {
    salaries += pilot.salaryCreditCost ?? 0;
  }
  let upkeep = 0;
  for (const buildingId of base.constructedBuildingIds) {
    const building = contentCatalog.buildings.find((entry) => entry.id === buildingId);
    upkeep += building?.maintenanceCreditCost ?? 0;
  }
  return { salaries, upkeep, total: salaries + upkeep };
}

/** Deducts the monthly recurring expenses from the credit balance. */
export function chargeMonthlyExpenses(base: BaseState): BaseState {
  const expenses = monthlyExpenses(base);
  return expenses.total === 0
    ? base
    : { ...base, credits: base.credits - expenses.total };
}
