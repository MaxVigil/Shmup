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
| Disintegration Lance | alien | 180 | 0.55 | 1 | 1800 | 0 | all-targets | Research/production | — |
| Plasma Orb Projector | alien | 125 | 0.65 | 1 | 300 | 0 | all-targets | Research/production | — |
| Singularity Projector | alien | 105 | 0.4 | 1 | 260 | 0 | all-targets | Research/production | — |

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

## Research (blueprint projects)

| Blueprint | Domain | Progress | Requirements | Output |
| --- | --- | --- | --- | --- |
| blueprint-safe-containment | earth | 3 sorties | building-research-centre + staff-scientist | building building-quarantine-centre |
| blueprint-medical-block | earth | 3 sorties | building-research-centre + staff-scientist | building building-medical-block |
| blueprint-canister-cannon | earth | 3 sorties | building-research-centre + staff-scientist | weapon weapon-canister-cannon + production 200000 cr |
| blueprint-split-pulse-adaptation | alien | alien analysis | quarantine + lab | weapon weapon-split-pulse + production 250000 cr |

## Market blueprints

| Blueprint | Weapon | Min sorties | Market | Production |
| --- | --- | --- | --- | --- |
| blueprint-impulse-accelerator-production | Impulse Accelerator | 5 | 180000 cr..220000 cr | 220000 cr + 8 mat |

## Weapon families (E1 arsenal)

| Family | Class | Tech family | Damage | Shots/s | Projectiles | Speed | Spread | Penetration | Weight | Energy | Acquisition | Marks |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| weapon-autocannon | human | human-kinetic | 10 | 6 | 1 | 620 | 2 | single-target | 3 | 1 | start | Mk2, Mk3, Mk4, Mk5, Mk6 |
| weapon-heavy-autocannon | human | human-kinetic | 24 | 2.4 | 1 | 560 | 1.5 | single-target | 5 | 2 | research-production | Mk2, Mk3, Mk4, Mk5 |
| weapon-gatling-gun | human | human-kinetic | 7 | 9 | 1 | 650 | 4 | single-target | 5 | 2 | research-production | Mk2, Mk3, Mk4, Mk5 |
| weapon-scatter-cannon | human | human-kinetic | 8 | 1.8 | 6 | 520 | 24 | single-target | 4 | 1 | research-production | Mk2, Mk3, Mk4, Mk5 |
| weapon-railgun | human | human-kinetic | 48 | 0.75 | 1 | 1050 | 0.5 | all-targets | 6 | 3 | research-production | Mk2, Mk3, Mk4 |
| weapon-flak-cannon | human | human-kinetic | 16 | 2.2 | 1 | 500 | 3 | single-target | 5 | 2 | research-production | Mk2, Mk3, Mk4, Mk5 |
| weapon-pulse-laser | hybrid | hybrid-laser | 20 | 6.5 | 1 | 1250 | 0.8 | single-target | 4 | 4 | research-production | Mk2, Mk3, Mk4 |
| weapon-plasma-machine-gun | hybrid | hybrid-plasma | 28 | 7.5 | 1 | 760 | 2.5 | single-target | 5 | 6 | research-production | Mk2, Mk3 |
| weapon-plasma-cannon | hybrid | hybrid-plasma | 92 | 0.9 | 1 | 520 | 1 | single-target | 7 | 7 | research-production | Mk2, Mk3 |
| weapon-disintegration-lance | alien | alien | 180 | 0.55 | 1 | 1800 | 0 | all-targets | 5 | 8 | alien-recovery | — |
| weapon-plasma-orb-projector | alien | alien | 125 | 0.65 | 1 | 300 | 0 | all-targets | 6 | 7 | alien-recovery | — |
| weapon-singularity-projector | alien | alien | 105 | 0.4 | 1 | 260 | 0 | all-targets | 7 | 9 | alien-recovery | — |

### Weapon Marks

| Item | Mark | Research cost | Production cost | Overrides |
| --- | --- | --- | --- | --- |
| weapon-autocannon-mk-2 | 2 | 100000 cr | 50000 cr + 5 mat | damage=12 |
| weapon-autocannon-mk-3 | 3 | 160000 cr | 80000 cr + 8 mat | shotsPerSecond=6.5, spreadDegrees=1.8 |
| weapon-autocannon-mk-4 | 4 | 240000 cr | 120000 cr + 12 mat | damage=15, projectileSpeed=660 |
| weapon-autocannon-mk-5 | 5 | 360000 cr | 180000 cr + 18 mat | damage=18, shotsPerSecond=7, spreadDegrees=1.6 |
| weapon-autocannon-mk-6 | 6 | 520000 cr | 280000 cr + 26 mat | damage=22, shotsPerSecond=7.5, spreadDegrees=1.4 |
| weapon-heavy-autocannon-mk-2 | 2 | 140000 cr | 90000 cr + 9 mat | shotsPerSecond=2.6 |
| weapon-heavy-autocannon-mk-3 | 3 | 220000 cr | 130000 cr + 13 mat | damage=30 |
| weapon-heavy-autocannon-mk-4 | 4 | 340000 cr | 190000 cr + 19 mat | damage=34, shotsPerSecond=2.8, spreadDegrees=1.3 |
| weapon-heavy-autocannon-mk-5 | 5 | 480000 cr | 270000 cr + 25 mat | damage=40, shotsPerSecond=3 |
| weapon-gatling-gun-mk-2 | 2 | 140000 cr | 90000 cr + 9 mat | shotsPerSecond=10 |
| weapon-gatling-gun-mk-3 | 3 | 220000 cr | 140000 cr + 14 mat | spreadDegrees=3.2 |
| weapon-gatling-gun-mk-4 | 4 | 340000 cr | 200000 cr + 20 mat | damage=8.5, shotsPerSecond=10.5 |
| weapon-gatling-gun-mk-5 | 5 | 480000 cr | 290000 cr + 27 mat | damage=10, shotsPerSecond=12 |
| weapon-scatter-cannon-mk-2 | 2 | 130000 cr | 80000 cr + 8 mat | damage=9 |
| weapon-scatter-cannon-mk-3 | 3 | 200000 cr | 120000 cr + 12 mat | damage=10, projectileCount=7 |
| weapon-scatter-cannon-mk-4 | 4 | 300000 cr | 180000 cr + 18 mat | damage=11, projectileCount=8, projectileSpeed=540 |
| weapon-scatter-cannon-mk-5 | 5 | 440000 cr | 250000 cr + 24 mat | damage=12, projectileCount=8, projectileSpeed=560 |
| weapon-railgun-mk-2 | 2 | 240000 cr | 160000 cr + 16 mat | shotsPerSecond=0.85 |
| weapon-railgun-mk-3 | 3 | 380000 cr | 240000 cr + 23 mat | damage=60, projectileSpeed=1150 |
| weapon-railgun-mk-4 | 4 | 560000 cr | 350000 cr + 32 mat | damage=72, shotsPerSecond=0.95 |
| weapon-flak-cannon-mk-2 | 2 | 160000 cr | 100000 cr + 10 mat | damage=18 |
| weapon-flak-cannon-mk-3 | 3 | 240000 cr | 150000 cr + 15 mat | damage=20 |
| weapon-flak-cannon-mk-4 | 4 | 360000 cr | 210000 cr + 21 mat | damage=23, projectileSpeed=540 |
| weapon-flak-cannon-mk-5 | 5 | 500000 cr | 290000 cr + 28 mat | damage=27, projectileSpeed=560 |
| weapon-pulse-laser-mk-2 | 2 | 320000 cr | 200000 cr + 18 mat | damage=24, shotsPerSecond=7 |
| weapon-pulse-laser-mk-3 | 3 | 480000 cr | 300000 cr + 26 mat | damage=28, spreadDegrees=0.6 |
| weapon-pulse-laser-mk-4 | 4 | 680000 cr | 440000 cr + 36 mat | damage=34, shotsPerSecond=7.5 |
| weapon-plasma-machine-gun-mk-2 | 2 | 640000 cr | 420000 cr + 34 mat | damage=34, shotsPerSecond=8 |
| weapon-plasma-machine-gun-mk-3 | 3 | 940000 cr | 620000 cr + 48 mat | damage=40, shotsPerSecond=8.5 |
| weapon-plasma-cannon-mk-2 | 2 | 700000 cr | 460000 cr + 38 mat | damage=104 |
| weapon-plasma-cannon-mk-3 | 3 | 1040000 cr | 700000 cr + 54 mat | damage=120, shotsPerSecond=1 |

## Auxiliary (hardpoints)

| Auxiliary | Type | Class | Ammo | Charges | Damage | Radius | Stun s | Weight | Energy | Acquisition |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| aux-rocket-pod | rocket | human | consumable-rocket | 3..12 | 70 | 52 | 0 | 3 | 1 | market |
| aux-homing-missile-rack | homing | human | consumable-homing-missile | 4..10 | 62 | 42 | 0 | 4 | 2 | research-production |
| aux-heavy-torpedo-launcher | torpedo | human | consumable-heavy-torpedo | 1..4 | 220 | 70 | 0 | 6 | 2 | research-production |
| aux-cluster-missile-pod | cluster | human | consumable-cluster-missile | 2..6 | 105 | 105 | 0 | 5 | 2 | research-production |
| aux-ukrainian-drone-swarm | drone | human | consumable-ukrainian-attack-drone | 50..100 | 28 | 28 | 0 | 2 | 2 | research-production |
| aux-stun-module | stun | human | — | 0..0 | 0 | 0 | 5 | 4 | 3 | research-production |
| aux-flare-decoy-launcher | decoy | human | consumable-flare-decoy | 3..6 | 0 | 0 | 0 | 2 | 1 | research-production |
| aux-proximity-mine | mine | human | consumable-proximity-mine | 3..12 | 130 | 60 | 0 | 3 | 1 | market |

## Modules

| Module | Type | Class | Weight | Energy | Effect | Acquisition |
| --- | --- | --- | --- | --- | --- | --- |
| module-energy-shield | shield | hybrid | 5 | 4 | Adds a regenerating damage buffer that absorbs incoming damage before armour. | research-production |
| module-directional-energy-shield | shield | hybrid | 4 | 4 | Stronger shield against the forward arc, little protection from the rear. | research-production |
| module-dash | dash | human | 2 | 2 | Enables a short high-speed directional dash with a cooldown. | research-production |
| module-targeting-computer | targeting | human | 2 | 2 | Improves primary-weapon accuracy and precision damage. | research-production |
| module-repair-nanobots | repair | hybrid | 4 | 3 | Slowly restores armour during flight after avoiding damage. | research-production |
| module-reflector-field | reflector | hybrid | 5 | 5 | Periodically reflects a fraction of eligible hostile projectiles back. | research-production |

## Ammunition

| Ammo | Weight/unit | Cost | Used by |
| --- | --- | --- | --- |
| consumable-rocket | 0.7 | 40 cr | aux-rocket-pod |
| consumable-homing-missile | 0.8 | 70 cr | aux-homing-missile-rack |
| consumable-heavy-torpedo | 1 | 120 cr | aux-heavy-torpedo-launcher |
| consumable-cluster-missile | 0.9 | 100 cr | aux-cluster-missile-pod |
| consumable-ukrainian-attack-drone | 0.06 | 6 cr | aux-ukrainian-drone-swarm |
| consumable-flare-decoy | 0.4 | 25 cr | aux-flare-decoy-launcher |
| consumable-proximity-mine | 0.5 | 55 cr | aux-proximity-mine |

## Aircraft loadouts

| Aircraft | Role | Armour | Speed x | dmg x / fire x / acc x | 1° slots | Hardpoints | Reactor | Capacity | Marks |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| aircraft-india | workhorse | 80 | 1.15 | 0.95 / 1 / 1 | 2 | 2 | 12 | 15 | Mk2, Mk3 |
| aircraft-britain | bruiser | 125 | 0.92 | 1.15 / 0.95 / 1.05 | 3 | 4 | 16 | 25 | Mk2, Mk3 |
| aircraft-prc | interceptor | 90 | 1.3 | 1.05 / 1.1 / 1 | 2 | 3 | 14 | 18 | Mk2, Mk3 |
| aircraft-germany | precision | 135 | 1 | 1.1 / 1 / 1.1 | 3 | 4 | 17 | 28 | Mk2, Mk3 |
| aircraft-usa | gunship | 165 | 0.88 | 1.25 / 0.95 / 0.95 | 3 | 5 | 17 | 32 | Mk2, Mk3 |
| aircraft-france | duelist | 105 | 1.2 | 1.05 / 1.05 / 1.1 | 2 | 3 | 14 | 19 | Mk2, Mk3 |
| aircraft-japan | glass-cannon | 100 | 1.1 | 1.45 / 1.05 / 1.1 | 1 | 2 | 13 | 16 | Mk2, Mk3 |

