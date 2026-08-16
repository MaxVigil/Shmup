import { contentCatalog as c } from '../src/content/catalog.ts';
import { deflateRawSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const CRC_TABLE = new Int32Array(256).map((unused, n) => {
  let value = n;
  for (let k = 0; k < 8; k += 1) {
    value = value & 1 ? (0xEDB88320 ^ (value >>> 1)) : (value >>> 1);
  }
  return value;
});

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (const byte of buf) crc = CRC_TABLE[(crc ^ byte) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function makeZip(entries) {
  const chunks = [];
  const central = [];
  let localOffset = 0;
  for (const entry of entries) {
    const nameBuf = Buffer.from(entry.name, 'utf8');
    const crc = crc32(entry.data);
    const comp = deflateRawSync(entry.data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(0x0008, 8);
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0x21, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(comp.length, 18);
    local.writeUInt32LE(entry.data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);
    chunks.push(local, nameBuf, comp);
    const cen = Buffer.alloc(46);
    cen.writeUInt32LE(0x02014b50, 0);
    cen.writeUInt16LE(20, 4);
    cen.writeUInt16LE(20, 6);
    cen.writeUInt16LE(0, 8);
    cen.writeUInt16LE(0x0008, 10);
    cen.writeUInt16LE(0, 12);
    cen.writeUInt16LE(0x21, 14);
    cen.writeUInt32LE(crc, 16);
    cen.writeUInt32LE(comp.length, 20);
    cen.writeUInt32LE(entry.data.length, 24);
    cen.writeUInt16LE(nameBuf.length, 28);
    cen.writeUInt16LE(0, 30);
    cen.writeUInt16LE(0, 32);
    cen.writeUInt16LE(0, 34);
    cen.writeUInt16LE(0, 36);
    cen.writeUInt32LE(0, 38);
    cen.writeUInt32LE(localOffset, 42);
    central.push(cen, nameBuf);
    localOffset += 30 + nameBuf.length + comp.length;
  }
  const centralStart = localOffset;
  const centralSize = central.reduce((acc, part) => acc + part.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(centralStart, 16);
  end.writeUInt16LE(0, 20);
  return Buffer.concat([...chunks, ...central, end]);
}

function colName(index) {
  let name = '';
  let n = index;
  while (n >= 0) {
    name = String.fromCharCode(65 + (n % 26)) + name;
    n = Math.floor(n / 26) - 1;
  }
  return name;
}

function xmlEscape(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function sheetXml(rows) {
  const parts = ['<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">',
    '<sheetData>'];
  rows.forEach((row, rowIndex) => {
    const cells = row.map((cell, colIndex) => {
      const ref = colName(colIndex) + String(rowIndex + 1);
      return '<c r="' + ref + '" t="inlineStr"><is><t>' + xmlEscape(cell) + '</t></is></c>';
    }).join('');
    parts.push('<row r="' + String(rowIndex + 1) + '">' + cells + '</row>');
  });
  parts.push('</sheetData></worksheet>');
  return Buffer.from(parts.join(''), 'utf8');
}

function contentTypesXml(sheetCount) {
  const overrides = [];
  for (let i = 1; i <= sheetCount; i += 1) {
    overrides.push('<Override PartName="/xl/worksheets/sheet' + i + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>');
  }
  return Buffer.from('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
    overrides.join('') +
    '</Types>', 'utf8');
}

function rootRelsXml() {
  return Buffer.from('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
    '</Relationships>', 'utf8');
}

function workbookXml(sheetNames) {
  const sheets = sheetNames.map((name, i) =>
    '<sheet name="' + xmlEscape(name) + '" sheetId="' + String(i + 1) + '" r:id="rId' + String(i + 1) + '"/>').join('');
  return Buffer.from('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    '<sheets>' + sheets + '</sheets></workbook>', 'utf8');
}

function workbookRelsXml(sheetCount) {
  const rels = [];
  for (let i = 1; i <= sheetCount; i += 1) {
    rels.push('<Relationship Id="rId' + i + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + i + '.xml"/>');
  }
  return Buffer.from('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    rels.join('') +
    '</Relationships>', 'utf8');
}

const cr = (n) => String(n) + ' cr';
const mtr = (n) => String(n) + ' mat';
const dash = (v) => (v === null || v === undefined ? '\u2014' : String(v));
const weaponById = (id) => c.weapons.find((w) => w.id === id);

const sheets = [];

sheets.push({ name: 'Weapons', rows: [
  ['Weapon', 'Origin', 'Damage', 'Shots/s', 'Projectiles', 'Speed', 'Spread', 'Penetration', 'Acquisition', 'Market'],
  ...c.weapons.map((w) => [
    w.name, w.origin, w.damage, w.shotsPerSecond, w.projectileCount, w.projectileSpeed, w.spread, w.penetration,
    w.marketPrice ? 'Market (finished)' : 'Research/production',
    w.marketPrice ? cr(w.marketPrice.minimum) + '..' + cr(w.marketPrice.maximum) : '\u2014',
  ]),
]});

sheets.push({ name: 'Weapon upgrades', rows: [
  ['Upgrade', 'Weapon', 'Research cost', 'Production cost', 'Requirements', 'Effect'],
  ...c.weaponUpgrades.map((u) => {
    const base = weaponById(u.weaponId);
    const name = base ? base.name : u.weaponId;
    const req = dash(u.requiredBlueprintId) + ' + local ' + dash(u.requiredLocallyProducedWeaponId);
    return [u.id, name, cr(u.researchCreditCost), cr(u.productionCreditCost) + ' + ' + mtr(u.productionMaterialCost), req, 'damage x' + u.damageMultiplier + ', cadence x' + u.cadenceMultiplier];
  }),
]});

sheets.push({ name: 'Buildings', rows: [
  ['Building', 'Cost', 'Prerequisites'],
  ...c.buildings.map((b) => [b.id, cr(b.creditCost) + ' + ' + mtr(b.materialCost), dash(b.requiredBlueprintId) + ' / ' + dash(b.requiredBuildingId)]),
]});

sheets.push({ name: 'Staff', rows: [
  ['Role', 'Hire cost', 'Required building', 'Headcount cap'],
  ...c.staffRoles.map((r) => [r.id, cr(r.creditCost), r.requiredBuildingId, dash(r.maximumHeadcount)]),
]});

sheets.push({ name: 'Aircraft', rows: [
  ['Aircraft', 'Armour', 'Speed x', 'Damage x', 'Slots', 'Refuel', 'Market'],
  ...c.aircraft.map((a) => [a.name, a.armour, a.speedMultiplier, a.damageMultiplier, a.weaponSlotCount, cr(a.refuelCreditCost), a.marketPrice ? cr(a.marketPrice.minimum) + '..' + cr(a.marketPrice.maximum) : '\u2014']),
]});

sheets.push({ name: 'Consumables', rows: [
  ['Consumable', 'Cost', 'Charges per sortie', 'Market'],
  ...c.consumables.map((x) => [x.id, cr(x.creditCost) + ' + ' + mtr(x.materialCost), dash(x.chargesPerSortie), x.marketPrice ? cr(x.marketPrice.minimum) + '..' + cr(x.marketPrice.maximum) : '\u2014']),
]});

sheets.push({ name: 'Enemies', rows: [
  ['Enemy', 'Kind', 'Armour', 'Speed', 'Contact', 'Score', 'Materials', 'Credits', 'Ranged'],
  ...c.enemies.map((e) => [e.name, e.kind, e.armour, e.speed, e.contactDamage, e.score, e.materialReward, e.creditReward, e.ranged ? e.ranged.shotDamage + ' dmg / ' + e.ranged.shotIntervalMs + ' ms' : '\u2014']),
]});

sheets.push({ name: 'Equipment', rows: [
  ['Module', 'Cost', 'Requirements'],
  ...c.equipment.map((eq) => [eq.id, cr(eq.creditCost) + ' + ' + mtr(eq.materialCost), eq.requiredBuildingId + ' + ' + eq.requiredStaffRoleId]),
]});

const researchRows = [
  ['Blueprint', 'Domain', 'Progress', 'Requirements', 'Output'],
  ...c.blueprints.map((b) => [b.id, b.researchDomain, b.requiredProgress + ' sorties', b.requiredBuildingId + ' + ' + b.requiredStaffRoleId, 'equipment ' + b.outputEquipmentId]),
  ...c.buildingBlueprints.map((b) => [b.id, b.researchDomain, b.requiredProgress + ' sorties', b.requiredBuildingId + ' + ' + b.requiredStaffRoleId, 'building ' + b.outputBuildingId]),
  ...c.researchWeaponBlueprints.map((b) => [b.id, b.researchDomain, b.requiredProgress + ' sorties', b.requiredBuildingId + ' + ' + b.requiredStaffRoleId, 'weapon ' + b.outputWeaponId + ' + production ' + cr(b.productionCreditCost)]),
  ...c.adaptedWeaponBlueprints.map((b) => [b.id, b.researchDomain, 'alien analysis', 'quarantine + lab', 'weapon ' + b.outputWeaponId + ' + production ' + cr(b.productionCreditCost)]),
];
sheets.push({ name: 'Research', rows: researchRows });

sheets.push({ name: 'Market blueprints', rows: [
  ['Blueprint', 'Weapon', 'Min sorties', 'Market', 'Production'],
  ...c.marketWeaponBlueprints.map((b) => { const w = weaponById(b.weaponId); return [b.id, w ? w.name : b.weaponId, b.minimumSorties, cr(b.marketPrice.minimum) + '..' + cr(b.marketPrice.maximum), cr(b.productionCreditCost) + ' + ' + mtr(b.productionMaterialCost)]; }),
]});

const zipEntries = [
  { name: '[Content_Types].xml', data: contentTypesXml(sheets.length) },
  { name: '_rels/.rels', data: rootRelsXml() },
  { name: 'xl/workbook.xml', data: workbookXml(sheets.map((s) => s.name)) },
  { name: 'xl/_rels/workbook.xml.rels', data: workbookRelsXml(sheets.length) },
  ...sheets.map((s, i) => ({ name: 'xl/worksheets/sheet' + (i + 1) + '.xml', data: sheetXml(s.rows) })),
];

writeFileSync(resolve(import.meta.dirname, '..', 'docs', 'ENTITIES.xlsx'), makeZip(zipEntries));
