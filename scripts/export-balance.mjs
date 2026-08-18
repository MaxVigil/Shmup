import { contentCatalog as c } from '../src/content/catalog.ts';
import { LOAN_OFFERS, loanRepayment } from '../src/domain/credit.ts';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Domain balance constants that are not part of the typed catalog.
 *
 * Kept here so `npm run balance` works as a plain Node script (no Vite
 * runtime). The guard test `tests/unit/balance-doc.test.ts` cross-checks every
 * value in this object against the real domain modules, so a drift between this
 * file and the source of truth fails CI.
 */
export const DOMAIN_BALANCE = {
  repair: {
    sortiesPerDamage: 3,
    creditsPerDamage: 100_000,
    emergencyMultiplier: 2,
    sortieDamageWeight: 0.6,
    masterCostReduction: 0.4,
    masterSpeedBonus: 0.5,
    costFloor: 0.5,
  },
  hangar: {
    startingSlots: 2,
    slotCost: 1_200_000,
  },
  mission: {
    sortiesPerMonth: 3,
    threatsPerMonth: 3,
    bountyPerThreatLevel: 80_000,
  },
  pilots: {
    hireBase: 150_000,
    hireStartMultiplier: 0.7,
    hireTierMultiplier: 0.3,
    salaryBase: 9_000,
    salaryStartMultiplier: 0.7,
    salaryTierMultiplier: 0.1,
    fatiguePerSortie: 0.15,
    fatigueRecoveryPerSortie: 0.05,
    fatigueRecoveryPerMonth: 0.25,
    fatigueLimit: 0.75,
  },
  medical: {
    deathChance: 0.005,
    severeChance: 0.02,
    mediumChance: 0.06,
    lightChance: 0.14,
    recoveryMonths: { light: 2, medium: 4, severe: 6 },
    outsourceCost: { light: 80_000, medium: 180_000, severe: 400_000 },
    medicHealingRate: 0.5,
    medicHealingMax: 3,
  },
};

const b = DOMAIN_BALANCE;

const cr = (n) => n.toLocaleString('en-US');
const range = (minimum, maximum) => `${cr(minimum)}..${cr(maximum)}`;
const dash = (value) => (value === null || value === undefined ? '\u2014' : String(value));
const aircraftName = (id) => {
  const aircraft = c.aircraft.find((entry) => entry.id === id);
  return aircraft ? aircraft.name : id;
};

export function buildBalanceMarkdown() {
  const L = [];
  const push = (line) => L.push(line);

  push('# BALANCE \u2014 master balance reference');
  push('');
  push('> Generated from src/content/catalog.ts + domain constants via `npm run balance`. Do not edit by hand.');
  push('> After changing any balance value, run `npm run balance` and commit the regenerated docs/BALANCE.md.');
  push('');

  push('## Economy');
  push('');
  push('| Item | Value |');
  push('| --- | --- |');
  push(`| Starting credits | ${cr(c.economy.startingCredits)} |`);
  push(`| Missed-target penalty multiplier | \u00d7${c.economy.missedEnemyPenaltyMultiplier} |`);
  push('');

  push('## Buildings');
  push('');
  push('| Building | Credits | Materials | Sorties | Upkeep /mo | Requires blueprint | Requires building |');
  push('| --- | --- | --- | --- | --- | --- | --- |');
  for (const building of c.buildings) {
    push(`| ${building.id} | ${cr(building.creditCost)} | ${building.materialCost} | ${building.constructionSorties} | ${cr(building.maintenanceCreditCost)} | ${dash(building.requiredBlueprintId)} | ${dash(building.requiredBuildingId)} |`);
  }
  push('');

  push('## Staff roles');
  push('');
  push('| Role | Hire | Salary /mo | Required building | Headcount cap |');
  push('| --- | --- | --- | --- | --- |');
  for (const role of c.staffRoles) {
    push(`| ${role.id} | ${cr(role.creditCost)} | ${cr(role.salaryCreditCost)} | ${dash(role.requiredBuildingId)} | ${dash(role.maximumHeadcount)} |`);
  }
  push('');
  push('### Staff candidate formula');
  push('');
  push('| Constant | Formula |');
  push('| --- | --- |');
  push('| Progress multiplier | 0.8 + tier \u00d7 0.12 (\u00b10.05) |');
  push('| Salary multiplier | 0.8 + tier \u00d7 0.15 (\u00b10.075) |');
  push('| Hire cost | role.creditCost \u00d7 (0.7 + tier \u00d7 0.3) |');
  push('| Salary | role.salaryCreditCost \u00d7 salaryMultiplier (no cap) |');
  push('| Level | 1 + floor(XP / 3), +5% contribution per level |');
  push('');
  push('## Aircraft');
  push('');
  push('| Aircraft | Armour | Speed \u00d7 | Damage \u00d7 | Fire rate \u00d7 | Projectile speed \u00d7 | Slots | Refuel | Market |');
  push('| --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const aircraft of c.aircraft) {
    const market = aircraft.marketPrice ? range(aircraft.marketPrice.minimum, aircraft.marketPrice.maximum) : '\u2014';
    push(`| ${aircraft.name} | ${aircraft.armour} | ${aircraft.speedMultiplier} | ${aircraft.damageMultiplier} | ${aircraft.fireRateMultiplier} | ${aircraft.projectileSpeedMultiplier} | ${aircraft.weaponSlotCount} | ${cr(aircraft.refuelCreditCost)} | ${market} |`);
  }
  push('');

  push('## Aircraft blueprints');
  push('');
  push('| Blueprint | Aircraft | Min sorties | Market | Production |');
  push('| --- | --- | --- | --- | --- |');
  for (const blueprint of c.aircraftBlueprints) {
    push(`| ${blueprint.id} | ${aircraftName(blueprint.outputAircraftId)} | ${blueprint.minimumSorties} | ${range(blueprint.marketPrice.minimum, blueprint.marketPrice.maximum)} | ${cr(blueprint.productionCreditCost)} + ${blueprint.productionMaterialCost} mat / ${blueprint.productionSorties} sorties |`);
  }
  push('');

  push('## Aircraft upgrades (Mark II / III)');
  push('');
  push('| Upgrade | Aircraft | Mark | Research | Production | Deltas (armour / speed \u00d7 / damage \u00d7) |');
  push('| --- | --- | --- | --- | --- | --- |');
  for (const upgrade of c.aircraftUpgrades) {
    const blueprint = c.aircraftBlueprints.find((entry) => entry.id === upgrade.aircraftBlueprintId);
    const name = blueprint ? aircraftName(blueprint.outputAircraftId) : upgrade.aircraftBlueprintId;
    const mark = upgrade.tier === 1 ? 'II' : 'III';
    push(`| ${upgrade.id} | ${name} | ${mark} | ${cr(upgrade.researchCreditCost)} / ${upgrade.researchSorties} sorties | ${cr(upgrade.productionCreditCost)} + ${upgrade.productionMaterialCost} mat / ${upgrade.productionSorties} sorties | +${upgrade.armourDelta} / +${upgrade.speedMultiplierDelta} / +${upgrade.damageMultiplierDelta} |`);
  }
  push('');

  push('## Weapons');
  push('');
  push('| Weapon | Origin | Damage | Shots/s | Projectiles | Speed | Spread | Penetration | Market |');
  push('| --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const weapon of c.weapons) {
    const market = weapon.marketPrice ? range(weapon.marketPrice.minimum, weapon.marketPrice.maximum) : '\u2014';
    push(`| ${weapon.name} | ${weapon.origin} | ${weapon.damage} | ${weapon.shotsPerSecond} | ${weapon.projectileCount} | ${weapon.projectileSpeed} | ${weapon.spread} | ${weapon.penetration} | ${market} |`);
  }
  push('');
  push('### Weapon upgrades');
  push('');
  push('| Upgrade | Weapon | Research | Production | Effect |');
  push('| --- | --- | --- | --- | --- |');
  for (const upgrade of c.weaponUpgrades) {
    const weapon = c.weapons.find((entry) => entry.id === upgrade.weaponId);
    const name = weapon ? weapon.name : upgrade.weaponId;
    push(`| ${upgrade.id} | ${name} | ${cr(upgrade.researchCreditCost)} / ${upgrade.researchSorties} sorties | ${cr(upgrade.productionCreditCost)} + ${upgrade.productionMaterialCost} mat / ${upgrade.productionSorties} sorties | damage \u00d7${upgrade.damageMultiplier}, cadence \u00d7${upgrade.cadenceMultiplier} |`);
  }
  push('');

  push('### Weapon power curve (Mark I)');
  push('');
  push('| Family | Class | Per-shot | Shots/s | DPS | Max-Mark damage | Marks |');
  push('| --- | --- | --- | --- | --- | --- | --- |');
  for (const family of c.weaponFamilies) {
    const lastMark = family.marks[family.marks.length - 1];
    const maxMarkDamage = lastMark
      ? (lastMark.statOverrides.damage ?? family.baseStats.damage)
      : family.baseStats.damage;
    push(`| ${family.id} | ${family.class} | ${family.baseStats.damage} | ${family.baseStats.shotsPerSecond} | ${(family.baseStats.damage * family.baseStats.shotsPerSecond).toFixed(1)} | ${maxMarkDamage} | ${family.marks.length} |`);
  }
  push('');

  push('## Enemies');
  push('');
  push('| Enemy | Kind | Armour | Speed | Contact | Score | Materials | Credits | Ranged |');
  push('| --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const enemy of c.enemies) {
    const ranged = enemy.ranged ? `${enemy.ranged.shotDamage} dmg / ${enemy.ranged.shotIntervalMs} ms` : '\u2014';
    push(`| ${enemy.name} | ${enemy.kind} | ${enemy.armour} | ${enemy.speed} | ${enemy.contactDamage} | ${enemy.score} | ${enemy.materialReward} | ${cr(enemy.creditReward)} | ${ranged} |`);
  }
  push('');

  push('## Equipment (craftable modules)');
  push('');
  push('| Module | Cost | Requirements |');
  push('| --- | --- | --- |');
  for (const equipment of c.equipment) {
    push(`| ${equipment.id} | ${cr(equipment.creditCost)} + ${equipment.materialCost} mat | ${equipment.requiredBuildingId} + ${equipment.requiredStaffRoleId} |`);
  }
  push('');

  push('## Consumables');
  push('');
  push('| Consumable | Cost | Charges /sortie | Market |');
  push('| --- | --- | --- | --- |');
  for (const consumable of c.consumables) {
    const market = consumable.marketPrice ? range(consumable.marketPrice.minimum, consumable.marketPrice.maximum) : '\u2014';
    push(`| ${consumable.id} | ${cr(consumable.creditCost)} + ${consumable.materialCost} mat | ${dash(consumable.chargesPerSortie)} | ${market} |`);
  }
  push('');

  push('## Loans');
  push('');
  push('| Lender | Principal | Interest | Term (months) | Repayment |');
  push('| --- | --- | --- | --- | --- |');
  for (const offer of LOAN_OFFERS) {
    push(`| ${offer.lenderId} | ${cr(offer.principal)} | ${(offer.interestRate * 100).toFixed(0)}% | ${offer.termMonths} | ${cr(loanRepayment(offer))} |`);
  }
  push('');
  push('## Repair');
  push('');
  push('| Constant | Value |');
  push('| --- | --- |');
  push(`| Sorties per damage | ${b.repair.sortiesPerDamage} |`);
  push(`| Credits per damage | ${cr(b.repair.creditsPerDamage)} |`);
  push(`| Emergency multiplier | \u00d7${b.repair.emergencyMultiplier} |`);
  push(`| Sortie damage weight | ${b.repair.sortieDamageWeight} |`);
  push(`| Repair master cost reduction | ${b.repair.masterCostReduction} |`);
  push(`| Repair master speed bonus | +${b.repair.masterSpeedBonus} /sortie/team |`);
  push(`| Repair cost floor | ${b.repair.costFloor} |`);
  push('');

  push('## Hangar');
  push('');
  push('| Constant | Value |');
  push('| --- | --- |');
  push(`| Starting slots | ${b.hangar.startingSlots} |`);
  push(`| New slot cost | ${cr(b.hangar.slotCost)} |`);
  push('');

  push('## Mission & month');
  push('');
  push('| Constant | Value |');
  push('| --- | --- |');
  push(`| Sorties per month | ${b.mission.sortiesPerMonth} |`);
  push(`| Threats per month | ${b.mission.threatsPerMonth} |`);
  push(`| Bounty | threat level \u00d7 ${cr(b.mission.bountyPerThreatLevel)} |`);
  push(`| Breach penalty | bounty \u00d7 penalty multiplier (${c.economy.missedEnemyPenaltyMultiplier}) |`);
  push('');

  push('## Pilots');
  push('');
  push('| Constant | Value |');
  push('| --- | --- |');
  push(`| Hire cost | ${cr(b.pilots.hireBase)} \u00d7 (${b.pilots.hireStartMultiplier} + tier \u00d7 ${b.pilots.hireTierMultiplier}) |`);
  push(`| Salary | ${cr(b.pilots.salaryBase)} \u00d7 (${b.pilots.salaryStartMultiplier} + tier \u00d7 ${b.pilots.salaryTierMultiplier}) |`);
  push('| XP \u2192 level | 1 + floor(XP / 3) |');
  push(`| Fatigue per active sortie | +${b.pilots.fatiguePerSortie} |`);
  push(`| Fatigue recovery per sortie | ${b.pilots.fatigueRecoveryPerSortie} |`);
  push(`| Fatigue recovery per month | ${b.pilots.fatigueRecoveryPerMonth} |`);
  push(`| Fatigue limit | ${b.pilots.fatigueLimit} |`);
  push('');

  push('## Medical');
  push('');
  push('| Injury | Chance (cumulative) | Recovery (months) | Outsource cost |');
  push('| --- | --- | --- | --- |');
  push(`| Death | ${b.medical.deathChance} | \u2014 | \u2014 |`);
  push(`| Severe | ${b.medical.severeChance} | ${b.medical.recoveryMonths.severe} | ${cr(b.medical.outsourceCost.severe)} |`);
  push(`| Medium | ${b.medical.mediumChance} | ${b.medical.recoveryMonths.medium} | ${cr(b.medical.outsourceCost.medium)} |`);
  push(`| Light | ${b.medical.lightChance} | ${b.medical.recoveryMonths.light} | ${cr(b.medical.outsourceCost.light)} |`);
  push('');
  push('| Constant | Value |');
  push('| --- | --- |');
  push(`| Medic healing rate | +${b.medical.medicHealingRate} /contribution |`);
  push(`| Medic healing max | \u00d7${b.medical.medicHealingMax} |`);
  push('');

  push('## Council states & gifts');
  push('');
  push('| State | One-time gift |');
  push('| --- | --- |');
  for (const state of c.councilStates) {
    const gift = c.nationGifts[state.id];
    const value = gift ? `${cr(gift.credits)} + ${gift.materials} mat` : '\u2014';
    push(`| ${state.id} | ${value} |`);
  }
  push('');

  return L.join('\n') + '\n';
}

const isMain = process.argv[1] !== undefined &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isMain) {
  writeFileSync(
    resolve(import.meta.dirname, '..', 'docs', 'BALANCE.md'),
    buildBalanceMarkdown(),
  );
}
