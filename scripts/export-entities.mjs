import { contentCatalog as c } from '../src/content/catalog.ts';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const L = [];
const push = (line) => L.push(line);

const weaponById = (id) => c.weapons.find((w) => w.id === id);
const cr = (n) => String(n) + ' cr';
const mtr = (n) => String(n) + ' mat';
const dash = (v) => (v === null || v === undefined ? '\u2014' : String(v));

push('# ENTITIES \u2014 master content reference');
push('');
push('> Generated from src/content/catalog.ts via npm run entities. Do not edit by hand.');
push('');
push('Legend: implemented in code, prototype, planned.');
push('');

push('## Weapons');
push('');
push('| Weapon | Origin | Damage | Shots/s | Projectiles | Speed | Spread | Penetration | Acquisition | Market |');
push('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
for (const w of c.weapons) {
  const acq = w.marketPrice ? 'Market (finished)' : 'Research/production';
  const mk = w.marketPrice ? cr(w.marketPrice.minimum) + '..' + cr(w.marketPrice.maximum) : '\u2014';
  push('| ' + w.name + ' | ' + w.origin + ' | ' + w.damage + ' | ' + w.shotsPerSecond + ' | ' + w.projectileCount + ' | ' + w.projectileSpeed + ' | ' + w.spread + ' | ' + w.penetration + ' | ' + acq + ' | ' + mk + ' |');
}
push('');

push('### Weapon upgrades');
push('');
push('| Upgrade | Weapon | Research cost | Production cost | Requirements | Effect |');
push('| --- | --- | --- | --- | --- | --- |');
for (const u of c.weaponUpgrades) {
  const base = weaponById(u.weaponId);
  const name = base ? base.name : u.weaponId;
  const req = dash(u.requiredBlueprintId) + " + local " + dash(u.requiredLocallyProducedWeaponId);
  const eff = 'damage x' + u.damageMultiplier + ', cadence x' + u.cadenceMultiplier;
  push('| ' + u.id + ' | ' + name + ' | ' + cr(u.researchCreditCost) + ' | ' + cr(u.productionCreditCost) + ' + ' + mtr(u.productionMaterialCost) + ' | ' + req + ' | ' + eff + ' |');
}
push('');
push('## Buildings');
push('');
push('| Building | Cost | Prerequisites |');
push('| --- | --- | --- |');
for (const b of c.buildings) {
  const pre = (b.requiredBlueprintId ? b.requiredBlueprintId : '\u2014') + ' / ' + (b.requiredBuildingId ? b.requiredBuildingId : '\u2014');
  push('| ' + b.id + ' | ' + cr(b.creditCost) + ' + ' + mtr(b.materialCost) + ' | ' + pre + ' |');
}
push('');

push('## Staff roles');
push('');
push('| Role | Hire cost | Required building | Headcount cap |');
push('| --- | --- | --- | --- |');
for (const r of c.staffRoles) {
  push('| ' + r.id + ' | ' + cr(r.creditCost) + ' | ' + r.requiredBuildingId + ' | ' + dash(r.maximumHeadcount) + ' |');
}
push('');

push('## Aircraft');
push('');
push('| Aircraft | Armour | Speed x | Damage x | Slots | Refuel | Market |');
push('| --- | --- | --- | --- | --- | --- | --- |');
for (const a of c.aircraft) {
  const mk = a.marketPrice ? cr(a.marketPrice.minimum) + '..' + cr(a.marketPrice.maximum) : '\u2014';
  push('| ' + a.name + ' | ' + a.armour + ' | ' + a.speedMultiplier + ' | ' + a.damageMultiplier + ' | ' + a.weaponSlotCount + ' | ' + cr(a.refuelCreditCost) + ' | ' + mk + ' |');
}
push('');
push('## Consumables');
push('');
push('| Consumable | Cost | Charges per sortie | Market |');
push('| --- | --- | --- | --- |');
for (const x of c.consumables) {
  const mk = x.marketPrice ? cr(x.marketPrice.minimum) + '..' + cr(x.marketPrice.maximum) : '\u2014';
  push('| ' + x.id + ' | ' + cr(x.creditCost) + ' + ' + mtr(x.materialCost) + ' | ' + dash(x.chargesPerSortie) + ' | ' + mk + ' |');
}
push('');

push('## Enemies');
push('');
push('| Enemy | Kind | Armour | Speed | Contact | Score | Materials | Credits | Ranged |');
push('| --- | --- | --- | --- | --- | --- | --- | --- | --- |');
for (const e of c.enemies) {
  const rg = e.ranged ? e.ranged.shotDamage + ' dmg / ' + e.ranged.shotIntervalMs + ' ms' : '\u2014';
  push('| ' + e.name + ' | ' + e.kind + ' | ' + e.armour + ' | ' + e.speed + ' | ' + e.contactDamage + ' | ' + e.score + ' | ' + e.materialReward + ' | ' + e.creditReward + ' | ' + rg + ' |');
}
push('');

push('## Equipment (craftable modules)');
push('');
push('| Module | Cost | Requirements |');
push('| --- | --- | --- |');
for (const eq of c.equipment) {
  push('| ' + eq.id + ' | ' + cr(eq.creditCost) + ' + ' + mtr(eq.materialCost) + ' | ' + eq.requiredBuildingId + ' + ' + eq.requiredStaffRoleId + ' |');
}
push('');
push('## Research (blueprint projects)');
push('');
push('| Blueprint | Domain | Progress | Requirements | Output |');
push('| --- | --- | --- | --- | --- |');
const researchRows = [];
for (const b of c.blueprints) {
  researchRows.push('| ' + b.id + ' | ' + b.researchDomain + ' | ' + b.requiredProgress + ' sorties | ' + b.requiredBuildingId + ' + ' + b.requiredStaffRoleId + ' | equipment ' + b.outputEquipmentId + ' |');
}
for (const b of c.buildingBlueprints) {
  researchRows.push('| ' + b.id + ' | ' + b.researchDomain + ' | ' + b.requiredProgress + ' sorties | ' + b.requiredBuildingId + ' + ' + b.requiredStaffRoleId + ' | building ' + b.outputBuildingId + ' |');
}
for (const b of c.researchWeaponBlueprints) {
  researchRows.push('| ' + b.id + ' | ' + b.researchDomain + ' | ' + b.requiredProgress + ' sorties | ' + b.requiredBuildingId + ' + ' + b.requiredStaffRoleId + ' | weapon ' + b.outputWeaponId + ' + production ' + cr(b.productionCreditCost) + ' |');
}
for (const b of c.adaptedWeaponBlueprints) {
  researchRows.push('| ' + b.id + ' | ' + b.researchDomain + ' | alien analysis | quarantine + lab | weapon ' + b.outputWeaponId + ' + production ' + cr(b.productionCreditCost) + ' |');
}
for (const r of researchRows) { push(r); }
push('');

push('## Market blueprints');
push('');
push('| Blueprint | Weapon | Min sorties | Market | Production |');
push('| --- | --- | --- | --- | --- |');
for (const b of c.marketWeaponBlueprints) {
  const mk = cr(b.marketPrice.minimum) + '..' + cr(b.marketPrice.maximum);
  push('| ' + b.id + ' | ' + (weaponById(b.weaponId) ? weaponById(b.weaponId).name : b.weaponId) + ' | ' + b.minimumSorties + ' | ' + mk + ' | ' + cr(b.productionCreditCost) + ' + ' + mtr(b.productionMaterialCost) + ' |');
}
push('');

writeFileSync(resolve(import.meta.dirname, '..', 'docs', 'ENTITIES.md'), L.join('\n') + '\n');
