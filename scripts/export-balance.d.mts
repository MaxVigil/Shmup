export interface DomainBalance {
  repair: {
    sortiesPerDamage: number;
    creditsPerDamage: number;
    emergencyMultiplier: number;
    sortieDamageWeight: number;
    masterCostReduction: number;
    masterSpeedBonus: number;
    costFloor: number;
  };
  hangar: {
    startingSlots: number;
    slotCost: number;
  };
  mission: {
    sortiesPerMonth: number;
    threatsPerMonth: number;
    bountyPerThreatLevel: number;
  };
  pilots: {
    hireBase: number;
    hireStartMultiplier: number;
    hireTierMultiplier: number;
    salaryBase: number;
    salaryStartMultiplier: number;
    salaryTierMultiplier: number;
    fatiguePerSortie: number;
    fatigueRecoveryPerSortie: number;
    fatigueRecoveryPerMonth: number;
    fatigueLimit: number;
  };
  medical: {
    deathChance: number;
    severeChance: number;
    mediumChance: number;
    lightChance: number;
    recoveryMonths: { light: number; medium: number; severe: number };
    outsourceCost: { light: number; medium: number; severe: number };
    medicHealingRate: number;
    medicHealingMax: number;
  };
}

export const DOMAIN_BALANCE: DomainBalance;
export function buildBalanceMarkdown(): string;
