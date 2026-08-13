# ENTITIES — master content reference

> Generated from src/content/catalog.ts via npm run entities. Do not edit by hand.

Legend: implemented in code, prototype, planned.

## Weapons

| Weapon | Origin | Damage | Shots/s | Projectiles | Speed | Spread | Penetration | Acquisition | Market |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Pulse Cannon | earth | 10 | 4 | 1 | 620 | 0 | single-target | Research/production | — |
| Impulse Accelerator | earth | 60 | 1 | 1 | 760 | 0 | all-targets | Market (finished) | 620 cr..680 cr |
| Split Pulse Emitter | alien | 7.5 | 6 | 2 | 620 | 12 | single-target | Research/production | — |
| Canister Aircraft Cannon | earth | 7 | 1.8 | 6 | 760 | 13 | single-target | Research/production | — |
| Rocket Pod | earth | 40 | 0 | 1 | 700 | 0 | single-target | Market (finished) | 380 cr..420 cr |

### Weapon upgrades

| Upgrade | Weapon | Research cost | Production cost | Requirements | Effect |
| --- | --- | --- | --- | --- | --- |
| upgrade-machine-gun-reinforced-ammunition | Pulse Cannon | 140 cr | 90 cr + 4 mat | — + local — | damage x2, cadence x1 |
| upgrade-impulse-accelerator-accumulator | Impulse Accelerator | 180 cr | 120 cr + 6 mat | blueprint-impulse-accelerator-production + local weapon-impulse-accelerator | damage x1, cadence x1.25 |

## Buildings

| Building | Cost | Prerequisites |
| --- | --- | --- |
| building-laboratory | 300 cr + 10 mat | — / — |
| building-workshop | 450 cr + 15 mat | — / building-laboratory |
| building-quarantine-centre | 350 cr + 20 mat | blueprint-safe-containment / building-workshop |
| building-trade-centre | 350 cr + 15 mat | — / building-workshop |

## Staff roles

| Role | Hire cost | Required building | Headcount cap |
| --- | --- | --- | --- |
| staff-scientist | 150 cr | building-laboratory | — |
| staff-engineer | 180 cr | building-workshop | 1 |
| staff-trader | 200 cr | building-trade-centre | 1 |

## Aircraft

| Aircraft | Armour | Speed x | Damage x | Slots | Refuel | Market |
| --- | --- | --- | --- | --- | --- | --- |
| Interceptor | 100 | 1 | 1 | 2 | 30 cr | — |
| Gunship | 150 | 0.82 | 1.15 | 3 | 45 cr | 900 cr..1100 cr |
| Aegis | 210 | 0.68 | 1.3 | 4 | 60 cr | 1300 cr..1600 cr |
| Yanlong | 180 | 0.9 | 1.2 | 4 | 50 cr | 1000 cr..1300 cr |

## Consumables

| Consumable | Cost | Charges per sortie | Market |
| --- | --- | --- | --- |
| consumable-rockets | 40 cr + 1 mat | 3 | 30 cr..50 cr |

## Enemies

| Enemy | Kind | Armour | Speed | Contact | Score | Materials | Credits | Ranged |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Scout | regular | 10 | 150 | 12 | 100 | 1 | 8 | — |
| Weaver | regular | 20 | 105 | 18 | 250 | 2 | 12 | — |
| Warden | elite | 240 | 92 | 35 | 2500 | 18 | 100 | 6 dmg / 1050 ms |
| Gunship | regular | 26 | 70 | 14 | 320 | 2 | 16 | 8 dmg / 2400 ms |

## Equipment (craftable modules)

| Module | Cost | Requirements |
| --- | --- | --- |
| equipment-alien-technology-capturer | 250 cr + 10 mat | building-workshop + staff-engineer |

## Research (blueprint projects)

| Blueprint | Domain | Progress | Requirements | Output |
| --- | --- | --- | --- | --- |
| blueprint-alien-technology-capturer | earth | 3 sorties | building-laboratory + staff-scientist | equipment equipment-alien-technology-capturer |
| blueprint-safe-containment | earth | 3 sorties | building-laboratory + staff-scientist | building building-quarantine-centre |
| blueprint-canister-cannon | earth | 3 sorties | building-laboratory + staff-scientist | weapon weapon-canister-cannon + production 200 cr |
| blueprint-split-pulse-adaptation | alien | alien analysis | quarantine + lab | weapon weapon-split-pulse + production 250 cr |

## Market blueprints

| Blueprint | Weapon | Min sorties | Market | Production |
| --- | --- | --- | --- | --- |
| blueprint-impulse-accelerator-production | Impulse Accelerator | 5 | 180 cr..220 cr | 220 cr + 8 mat |

