import { describe, expect, it } from 'vitest';
import {
  DOMAIN_BALANCE,
  buildBalanceMarkdown,
} from '../../scripts/export-balance.mjs';
import {
  EMERGENCY_REPAIR_MULTIPLIER,
  REPAIR_COST_FLOOR,
  REPAIR_CREDIT_PER_DAMAGE,
  REPAIR_MASTER_COST_REDUCTION,
  REPAIR_MASTER_SPEED_BONUS,
  REPAIR_SORTIES_PER_DAMAGE,
  SORTIE_DAMAGE_WEIGHT,
} from '../../src/domain/aircraft-integrity';
import { HANGAR_SLOT_COST, STARTING_HANGAR_SLOTS } from '../../src/domain/hangar';
import {
  MONTH_SORTIE_LENGTH,
  THREAT_MAP_MISSION_COUNT,
  missionBounty,
} from '../../src/domain/command-centre';
import {
  PILOT_FATIGUE_LIMIT,
  PILOT_FATIGUE_PER_SORTIE,
  PILOT_FATIGUE_RECOVERY_PER_MONTH,
  PILOT_FATIGUE_RECOVERY_PER_SORTIE,
} from '../../src/domain/pilot-market';
import {
  INJURY_DEATH_CHANCE,
  INJURY_LIGHT_CHANCE,
  INJURY_MEDIUM_CHANCE,
  INJURY_RECOVERY_MONTHS,
  INJURY_SEVERE_CHANCE,
  MEDIC_HEALING_MAX_MULTIPLIER,
  MEDIC_HEALING_RATE_PER_CONTRIBUTION,
  OUTSOURCE_TREATMENT_COST,
} from '../../src/domain/pilot-medical';

describe('balance documentation', () => {
  it('mirrors the real repair, hangar, mission, pilot, and medical constants', () => {
    expect(DOMAIN_BALANCE.repair.sortiesPerDamage).toBe(REPAIR_SORTIES_PER_DAMAGE);
    expect(DOMAIN_BALANCE.repair.creditsPerDamage).toBe(REPAIR_CREDIT_PER_DAMAGE);
    expect(DOMAIN_BALANCE.repair.emergencyMultiplier).toBe(EMERGENCY_REPAIR_MULTIPLIER);
    expect(DOMAIN_BALANCE.repair.sortieDamageWeight).toBe(SORTIE_DAMAGE_WEIGHT);
    expect(DOMAIN_BALANCE.repair.masterCostReduction).toBe(REPAIR_MASTER_COST_REDUCTION);
    expect(DOMAIN_BALANCE.repair.masterSpeedBonus).toBe(REPAIR_MASTER_SPEED_BONUS);
    expect(DOMAIN_BALANCE.repair.costFloor).toBe(REPAIR_COST_FLOOR);

    expect(DOMAIN_BALANCE.hangar.startingSlots).toBe(STARTING_HANGAR_SLOTS);
    expect(DOMAIN_BALANCE.hangar.slotCost).toBe(HANGAR_SLOT_COST);

    expect(DOMAIN_BALANCE.mission.sortiesPerMonth).toBe(MONTH_SORTIE_LENGTH);
    expect(DOMAIN_BALANCE.mission.threatsPerMonth).toBe(THREAT_MAP_MISSION_COUNT);
    expect(DOMAIN_BALANCE.mission.bountyPerThreatLevel).toBe(
      missionBounty({ id: 't', targetCountryId: 'x', threatLevel: 1 }),
    );

    expect(DOMAIN_BALANCE.pilots.fatiguePerSortie).toBe(PILOT_FATIGUE_PER_SORTIE);
    expect(DOMAIN_BALANCE.pilots.fatigueRecoveryPerSortie).toBe(
      PILOT_FATIGUE_RECOVERY_PER_SORTIE,
    );
    expect(DOMAIN_BALANCE.pilots.fatigueRecoveryPerMonth).toBe(
      PILOT_FATIGUE_RECOVERY_PER_MONTH,
    );
    expect(DOMAIN_BALANCE.pilots.fatigueLimit).toBe(PILOT_FATIGUE_LIMIT);

    expect(DOMAIN_BALANCE.medical.deathChance).toBe(INJURY_DEATH_CHANCE);
    expect(DOMAIN_BALANCE.medical.severeChance).toBe(INJURY_SEVERE_CHANCE);
    expect(DOMAIN_BALANCE.medical.mediumChance).toBe(INJURY_MEDIUM_CHANCE);
    expect(DOMAIN_BALANCE.medical.lightChance).toBe(INJURY_LIGHT_CHANCE);
    expect(DOMAIN_BALANCE.medical.recoveryMonths).toEqual(INJURY_RECOVERY_MONTHS);
    expect(DOMAIN_BALANCE.medical.outsourceCost).toEqual(OUTSOURCE_TREATMENT_COST);
    expect(DOMAIN_BALANCE.medical.medicHealingRate).toBe(
      MEDIC_HEALING_RATE_PER_CONTRIBUTION,
    );
    expect(DOMAIN_BALANCE.medical.medicHealingMax).toBe(MEDIC_HEALING_MAX_MULTIPLIER);
  });

  it('matches the committed docs/BALANCE.md (run npm run balance after tuning)', () => {
    const committed = Object.values(
      import.meta.glob('../../docs/BALANCE.md', {
        query: '?raw',
        import: 'default',
        eager: true,
      }) as Record<string, string>,
    )[0] ?? '';
    expect(buildBalanceMarkdown()).toBe(committed);
  });
});
