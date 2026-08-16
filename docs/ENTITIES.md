# ENTITIES — master content reference

> Generated from src/content/catalog.ts via npm run entities. Do not edit by hand.

Legend: implemented in code, prototype, planned.

## Weapons

| Weapon | Origin | Damage | Shots/s | Projectiles | Speed | Spread | Penetration | Acquisition | Market |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Pulse Cannon | earth | 10 | 4 | 1 | 620 | 0 | single-target | Research/production | — |
| Impulse Accelerator | earth | 60 | 1 | 1 | 760 | 0 | all-targets | Market (finished) | 620000 cr..680000 cr |
| Split Pulse Emitter | alien | 7.5 | 6 | 2 | 620 | 12 | single-target | Research/production | — |
| Canister Aircraft Cannon | earth | 7 | 1.8 | 6 | 760 | 13 | single-target | Research/production | — |
| Rocket Pod | earth | 40 | 0 | 1 | 700 | 0 | single-target | Market (finished) | 380000 cr..420000 cr |

### Weapon upgrades

| Upgrade | Weapon | Research cost | Production cost | Requirements | Effect |
| --- | --- | --- | --- | --- | --- |
| upgrade-machine-gun-reinforced-ammunition | Pulse Cannon | 140000 cr | 90000 cr + 4 mat | — + local — | damage x2, cadence x1 |
| upgrade-impulse-accelerator-accumulator | Impulse Accelerator | 180000 cr | 120000 cr + 6 mat | blueprint-impulse-accelerator-production + local weapon-impulse-accelerator | damage x1, cadence x1.25 |

## Buildings

| Building | Cost | Prerequisites |
| --- | --- | --- |
| building-command-centre | 400000 cr + 10 mat | — / — |
| building-hangar | 500000 cr + 20 mat | — / — |
| building-research-centre | 300000 cr + 10 mat | — / — |
| building-production-works | 450000 cr + 15 mat | — / building-research-centre |
| building-quarantine-centre | 350000 cr + 20 mat | blueprint-safe-containment / building-production-works |
| building-trade-centre | 350000 cr + 15 mat | — / building-production-works |
| building-medical-block | 350000 cr + 20 mat | blueprint-medical-block / building-production-works |

## Staff roles

| Role | Hire cost | Required building | Headcount cap |
| --- | --- | --- | --- |
| staff-scientist | 250000 cr | building-research-centre | — |
| staff-engineer | 300000 cr | building-production-works | 3 |
| staff-trader | 250000 cr | building-trade-centre | 1 |
| staff-manager | 400000 cr | null | 1 |
| staff-medic | 280000 cr | building-medical-block | 4 |
| staff-repair-master | 300000 cr | building-production-works | — |

## Aircraft

| Aircraft | Armour | Speed x | Damage x | Slots | Refuel | Market |
| --- | --- | --- | --- | --- | --- | --- |
| India aircraft | 80 | 1.15 | 0.95 | 2 | 26000 cr | 320000 cr..390000 cr |
| British aircraft | 125 | 0.92 | 1.15 | 3 | 42000 cr | 760000 cr..920000 cr |
| PRC aircraft | 90 | 1.3 | 1.05 | 2 | 32000 cr | 520000 cr..620000 cr |
| German aircraft | 135 | 1 | 1.1 | 3 | 44000 cr | 820000 cr..980000 cr |
| US aircraft | 165 | 0.88 | 1.25 | 3 | 54000 cr | 1150000 cr..1400000 cr |
| French aircraft | 105 | 1.2 | 1.05 | 2 | 34000 cr | 580000 cr..700000 cr |
| Japanese aircraft | 100 | 1.1 | 1.45 | 1 | 56000 cr | 620000 cr..740000 cr |

## Consumables

| Consumable | Cost | Charges per sortie | Market |
| --- | --- | --- | --- |
| consumable-rockets | 40000 cr + 1 mat | 3 | 30000 cr..50000 cr |

## Enemies

| Enemy | Kind | Armour | Speed | Contact | Score | Materials | Credits | Ranged |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Scout | regular | 10 | 150 | 12 | 100 | 1 | 8000 | — |
| Weaver | regular | 20 | 105 | 18 | 250 | 2 | 12000 | — |
| Warden | elite | 240 | 92 | 35 | 2500 | 18 | 100000 | 6 dmg / 1050 ms |
| Gunship | regular | 26 | 70 | 14 | 320 | 2 | 16000 | 8 dmg / 2400 ms |

## Equipment (craftable modules)

| Module | Cost | Requirements |
| --- | --- | --- |
| equipment-alien-technology-capturer | 250000 cr + 10 mat | building-production-works + staff-engineer |

## Research (blueprint projects)

| Blueprint | Domain | Progress | Requirements | Output |
| --- | --- | --- | --- | --- |
| blueprint-alien-technology-capturer | earth | 3 sorties | building-research-centre + staff-scientist | equipment equipment-alien-technology-capturer |
| blueprint-safe-containment | earth | 3 sorties | building-research-centre + staff-scientist | building building-quarantine-centre |
| blueprint-medical-block | earth | 3 sorties | building-research-centre + staff-scientist | building building-medical-block |
| blueprint-canister-cannon | earth | 3 sorties | building-research-centre + staff-scientist | weapon weapon-canister-cannon + production 200000 cr |
| blueprint-split-pulse-adaptation | alien | alien analysis | quarantine + lab | weapon weapon-split-pulse + production 250000 cr |

## Market blueprints

| Blueprint | Weapon | Min sorties | Market | Production |
| --- | --- | --- | --- | --- |
| blueprint-impulse-accelerator-production | Impulse Accelerator | 5 | 180000 cr..220000 cr | 220000 cr + 8 mat |

