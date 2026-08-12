import { describe, expect, it } from 'vitest';
import {
  EMPTY_SORTIE_CONTRACT,
  contractCreditDelta,
  isBankrupt,
  recordTargetBreached,
  recordTargetDestroyed,
} from '../../src/domain/operational-economy';

describe('operational economy', () => {
  it('records confirmed targets as earned credits', () => {
    const ledger = recordTargetDestroyed(EMPTY_SORTIE_CONTRACT, 8);

    expect(ledger).toEqual({
      targetsDestroyed: 1,
      targetsBreached: 0,
      creditsEarned: 8,
      creditsPenalized: 0,
    });
    expect(contractCreditDelta(ledger)).toBe(8);
  });

  it('charges five times the bounty when a target breaches the corridor', () => {
    const ledger = recordTargetBreached(EMPTY_SORTIE_CONTRACT, 12, 5);

    expect(ledger.targetsBreached).toBe(1);
    expect(ledger.creditsPenalized).toBe(60);
    expect(contractCreditDelta(ledger)).toBe(-60);
  });

  it('combines rewards and penalties deterministically', () => {
    const withKill = recordTargetDestroyed(EMPTY_SORTIE_CONTRACT, 12);
    const withBreach = recordTargetBreached(withKill, 8, 5);

    expect(contractCreditDelta(withBreach)).toBe(-28);
  });

  it('treats zero and negative reserves as bankruptcy', () => {
    expect(isBankrupt(1)).toBe(false);
    expect(isBankrupt(0)).toBe(true);
    expect(isBankrupt(-1)).toBe(true);
  });
});
