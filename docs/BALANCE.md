# BALANCE — master balance reference

> Generated from src/content/catalog.ts + domain constants via `npm run balance`. Do not edit by hand.
> After changing any balance value, run `npm run balance` and commit the regenerated docs/BALANCE.md.

## Economy

| Item | Value |
| --- | --- |
| Starting credits | 500,000 |
| Missed-target penalty multiplier | ×5 |

## Buildings

| Building | Credits | Materials | Sorties | Upkeep /mo | Requires blueprint | Requires building |
| --- | --- | --- | --- | --- | --- | --- |
| building-research-centre | 300,000 | 10 | 1 | 5,000 | — | — |
| building-production-works | 450,000 | 15 | 2 | 8,000 | — | building-research-centre |
| building-quarantine-centre | 350,000 | 20 | 2 | 6,000 | blueprint-safe-containment | building-production-works |
| building-trade-centre | 350,000 | 15 | 1 | 6,000 | — | building-production-works |
| building-medical-block | 350,000 | 20 | 2 | 6,000 | blueprint-medical-block | building-production-works |

## Staff roles

| Role | Hire | Salary /mo | Required building | Headcount cap |
| --- | --- | --- | --- | --- |
| staff-scientist | 250,000 | 30,000 | building-research-centre | — |
| staff-engineer | 300,000 | 40,000 | building-production-works | 3 |
| staff-trader | 250,000 | 20,000 | building-trade-centre | 1 |
| staff-manager | 400,000 | 50,000 | — | 1 |
| staff-medic | 280,000 | 30,000 | building-medical-block | 4 |
| staff-repair-master | 300,000 | 35,000 | building-production-works | — |

### Staff candidate formula

| Constant | Formula |
| --- | --- |
| Progress multiplier | 0.8 + tier × 0.12 (±0.05) |
| Salary multiplier | 0.8 + tier × 0.15 (±0.075) |
| Hire cost | role.creditCost × (0.7 + tier × 0.3) |
| Salary | role.salaryCreditCost × salaryMultiplier (no cap) |
| Level | 1 + floor(XP / 3), +5% contribution per level |

## Aircraft

| Aircraft | Armour | Speed × | Damage × | Fire rate × | Projectile speed × | Slots | Refuel | Market |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| India aircraft | 80 | 1.15 | 0.95 | 1.25 | 1.15 | 2 | 26,000 | 320,000..390,000 |
| British aircraft | 125 | 0.92 | 1.15 | 1 | 1 | 3 | 42,000 | 760,000..920,000 |
| PRC aircraft | 90 | 1.3 | 1.05 | 1.2 | 1.25 | 2 | 32,000 | 520,000..620,000 |
| German aircraft | 135 | 1 | 1.1 | 1 | 1 | 3 | 44,000 | 820,000..980,000 |
| US aircraft | 165 | 0.88 | 1.25 | 0.85 | 0.95 | 3 | 54,000 | 1,150,000..1,400,000 |
| French aircraft | 105 | 1.2 | 1.05 | 1.1 | 1.1 | 2 | 34,000 | 580,000..700,000 |
| Japanese aircraft | 100 | 1.1 | 1.45 | 0.8 | 1.05 | 1 | 56,000 | 620,000..740,000 |

## Aircraft blueprints

| Blueprint | Aircraft | Min sorties | Market | Production |
| --- | --- | --- | --- | --- |
| blueprint-aircraft-india | India aircraft | 0 | 190,000..240,000 | 120,000 + 3 mat / 1 sorties |
| blueprint-aircraft-france | French aircraft | 1 | 340,000..400,000 | 220,000 + 5 mat / 1 sorties |
| blueprint-aircraft-prc | PRC aircraft | 1 | 310,000..370,000 | 200,000 + 5 mat / 1 sorties |
| blueprint-aircraft-britain | British aircraft | 2 | 450,000..540,000 | 300,000 + 7 mat / 2 sorties |
| blueprint-aircraft-germany | German aircraft | 2 | 490,000..580,000 | 320,000 + 7 mat / 2 sorties |
| blueprint-aircraft-japan | Japanese aircraft | 3 | 380,000..440,000 | 260,000 + 6 mat / 2 sorties |
| blueprint-aircraft-usa | US aircraft | 4 | 690,000..830,000 | 480,000 + 9 mat / 3 sorties |

## Aircraft upgrades (Mark II / III)

| Upgrade | Aircraft | Mark | Research | Production | Deltas (armour / speed × / damage ×) |
| --- | --- | --- | --- | --- | --- |
| upgrade-aircraft-india-mk1 | India aircraft | II | 110,000 / 1 sorties | 70,000 + 3 mat / 1 sorties | +15 / +0.08 / +0.08 |
| upgrade-aircraft-india-mk2 | India aircraft | III | 150,000 / 2 sorties | 100,000 + 5 mat / 1 sorties | +30 / +0.15 / +0.15 |
| upgrade-aircraft-france-mk1 | French aircraft | II | 120,000 / 1 sorties | 80,000 + 4 mat / 1 sorties | +18 / +0.08 / +0.08 |
| upgrade-aircraft-france-mk2 | French aircraft | III | 160,000 / 2 sorties | 110,000 + 6 mat / 1 sorties | +35 / +0.15 / +0.15 |
| upgrade-aircraft-prc-mk1 | PRC aircraft | II | 120,000 / 1 sorties | 80,000 + 4 mat / 1 sorties | +12 / +0.1 / +0.06 |
| upgrade-aircraft-prc-mk2 | PRC aircraft | III | 160,000 / 2 sorties | 110,000 + 6 mat / 1 sorties | +25 / +0.18 / +0.12 |
| upgrade-aircraft-britain-mk1 | British aircraft | II | 130,000 / 1 sorties | 90,000 + 5 mat / 1 sorties | +20 / +0.06 / +0.1 |
| upgrade-aircraft-britain-mk2 | British aircraft | III | 170,000 / 2 sorties | 120,000 + 7 mat / 1 sorties | +40 / +0.12 / +0.18 |
| upgrade-aircraft-germany-mk1 | German aircraft | II | 140,000 / 2 sorties | 90,000 + 5 mat / 1 sorties | +22 / +0.06 / +0.1 |
| upgrade-aircraft-germany-mk2 | German aircraft | III | 180,000 / 3 sorties | 120,000 + 7 mat / 1 sorties | +45 / +0.1 / +0.2 |
| upgrade-aircraft-japan-mk1 | Japanese aircraft | II | 130,000 / 1 sorties | 85,000 + 4 mat / 1 sorties | +12 / +0.05 / +0.12 |
| upgrade-aircraft-japan-mk2 | Japanese aircraft | III | 170,000 / 2 sorties | 115,000 + 6 mat / 1 sorties | +25 / +0.1 / +0.22 |
| upgrade-aircraft-usa-mk1 | US aircraft | II | 170,000 / 2 sorties | 110,000 + 6 mat / 1 sorties | +25 / +0.05 / +0.1 |
| upgrade-aircraft-usa-mk2 | US aircraft | III | 210,000 / 3 sorties | 140,000 + 8 mat / 1 sorties | +50 / +0.08 / +0.2 |

## Weapons

| Weapon | Origin | Damage | Shots/s | Projectiles | Speed | Spread | Penetration | Market |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Pulse Cannon | earth | 10 | 4 | 1 | 620 | 0 | single-target | — |
| Impulse Accelerator | earth | 60 | 1 | 1 | 760 | 0 | all-targets | 620,000..680,000 |
| Split Pulse Emitter | alien | 7.5 | 6 | 2 | 620 | 12 | single-target | — |
| Canister Aircraft Cannon | earth | 7 | 1.8 | 6 | 760 | 13 | single-target | — |
| Rocket Pod | earth | 40 | 0 | 1 | 700 | 0 | single-target | 380,000..420,000 |

### Weapon upgrades

| Upgrade | Weapon | Research | Production | Effect |
| --- | --- | --- | --- | --- |
| upgrade-machine-gun-reinforced-ammunition | Pulse Cannon | 140,000 / 2 sorties | 90,000 + 4 mat / 1 sorties | damage ×2, cadence ×1 |
| upgrade-impulse-accelerator-accumulator | Impulse Accelerator | 180,000 / 2 sorties | 120,000 + 6 mat / 1 sorties | damage ×1, cadence ×1.25 |

## Enemies

| Enemy | Kind | Armour | Speed | Contact | Score | Materials | Credits | Ranged |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Scout | regular | 10 | 150 | 12 | 100 | 1 | 8,000 | — |
| Weaver | regular | 20 | 105 | 18 | 250 | 2 | 12,000 | — |
| Warden | elite | 240 | 92 | 35 | 2500 | 18 | 100,000 | 6 dmg / 1050 ms |
| Gunship | regular | 26 | 70 | 14 | 320 | 2 | 16,000 | 8 dmg / 2400 ms |

## Equipment (craftable modules)

| Module | Cost | Requirements |
| --- | --- | --- |
| equipment-alien-technology-capturer | 250,000 + 10 mat | building-production-works + staff-engineer |

## Consumables

| Consumable | Cost | Charges /sortie | Market |
| --- | --- | --- | --- |
| consumable-rockets | 40,000 + 1 mat | 3 | 30,000..50,000 |

## Loans

| Lender | Principal | Interest | Term (months) | Repayment |
| --- | --- | --- | --- | --- |
| lender-commission | 600,000 | 10% | 2 | 660,000 |
| lender-prc | 1,200,000 | 5% | 4 | 1,260,000 |
| lender-ukraine | 900,000 | 8% | 3 | 972,000 |
| lender-usa | 1,000,000 | 9% | 3 | 1,090,000 |
| lender-uk | 800,000 | 9% | 3 | 872,000 |
| lender-germany | 750,000 | 8% | 3 | 810,000 |
| lender-japan | 700,000 | 8% | 3 | 756,000 |
| lender-france | 650,000 | 9% | 2 | 708,500 |

## Repair

| Constant | Value |
| --- | --- |
| Sorties per damage | 3 |
| Credits per damage | 100,000 |
| Emergency multiplier | ×2 |
| Sortie damage weight | 0.6 |
| Repair master cost reduction | 0.4 |
| Repair master speed bonus | +0.5 /sortie/team |
| Repair cost floor | 0.5 |

## Hangar

| Constant | Value |
| --- | --- |
| Starting slots | 2 |
| New slot cost | 1,200,000 |

## Mission & month

| Constant | Value |
| --- | --- |
| Sorties per month | 3 |
| Threats per month | 3 |
| Bounty | threat level × 80,000 |
| Breach penalty | bounty × penalty multiplier (5) |

## Pilots

| Constant | Value |
| --- | --- |
| Hire cost | 150,000 × (0.7 + tier × 0.3) |
| Salary | 9,000 × (0.7 + tier × 0.1) |
| XP → level | 1 + floor(XP / 3) |
| Fatigue per active sortie | +0.15 |
| Fatigue recovery per sortie | 0.05 |
| Fatigue recovery per month | 0.25 |
| Fatigue limit | 0.75 |

## Medical

| Injury | Chance (cumulative) | Recovery (months) | Outsource cost |
| --- | --- | --- | --- |
| Death | 0.005 | — | — |
| Severe | 0.02 | 6 | 400,000 |
| Medium | 0.06 | 4 | 180,000 |
| Light | 0.14 | 2 | 80,000 |

| Constant | Value |
| --- | --- |
| Medic healing rate | +0.5 /contribution |
| Medic healing max | ×3 |

## Council states & gifts

| State | One-time gift |
| --- | --- |
| council-prc | 100,000 + 2 mat |
| council-ukraine | 90,000 + 2 mat |
| council-brazil | 40,000 + 1 mat |
| council-india | 50,000 + 1 mat |
| council-usa | 120,000 + 1 mat |
| council-uk | 80,000 + 1 mat |
| council-germany | 70,000 + 2 mat |
| council-japan | 60,000 + 2 mat |
| council-france | 70,000 + 1 mat |

