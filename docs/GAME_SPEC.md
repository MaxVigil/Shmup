# Game specification v0.1

Source of product truth: [Game Brief v0.1 in Notion](https://app.notion.com/p/3b481cc4e8c281c09fe4e1f541e78296).

## Product core

A browser vertical shmup where partly understood alien technology connects combat
builds, informed risk, extraction, and persistent development of an international
corporate base on Earth.

## Player experience

- Discover a clever weapon and technology combination.
- Decide whether the expected reward justifies another dangerous encounter.
- Infer enough about unknown technology to take an informed risk.

## Confirmed constraints

- Browser target with keyboard and mouse.
- Vertical auto-scrolling combat.
- Weapons fire automatically forward; movement is the primary input.
- Armour depletes progressively.
- A typical sortie lasts 15–20 minutes.
- Loadouts are prepared at the base and improved during the sortie.
- Failed sorties lose part, not all, of the collected resources.
- The first complete version contains one polished sector and the full loop.
- Visual direction: restrained, dark industrial science fiction.

## Core loop

1. Allocate staff and energy at the base.
2. Select a pilot and loadout.
3. Launch a sortie.
4. Fight, investigate anomalies, and hunt optional elite enemies.
5. Install an unknown artefact or preserve it for the laboratory.
6. Extract or continue for a greater possible reward.
7. Return resources, progress research, repair, and prepare the next sortie.

## Playable MVP

The first playable product test is one short, complete loop. It is smaller than the
first vertical slice and exists to test whether combat, uncertain technology, and
the extraction decision create useful tension.

- One pilot and one starting weapon.
- One 5–8 minute sortie.
- Bounded movement, automatic forward fire, and armour.
- Two regular enemy types and one elite encounter.
- One partly understood artefact with install-or-preserve choice.
- One extraction decision: leave safely or continue for a better reward.
- Partial loss after defeat.
- One research result or permanent improvement after return.
- Browser-local persistence.

Art, audio, narrative expansion, multiple sectors, and a deep base economy are not
required to validate this MVP.

## Alien technology

Before use, the player sees a broad category, symbols, reliability, and danger.
The exact effect, side effect, compatibility, and research value can remain unknown.
Technology can provide passive modules or transform weapons. Laboratory work reveals
properties over time.

## Base

- Management is divided into Overview, Research, Engineering, and Hangar departments.
- Terrestrial research covers understood airframe, survivability, repair, mobility, and
  conventional weapons; alien research handles quarantined recovered artefacts.
- Earth equipment may be bought as an expensive finished market item or produced more
  cheaply after acquiring its blueprint and constructing the Prototype and Production
  Works. Research creates designs, the Works manufactures physical upgrades, and the
  Hangar installs them.
- The terrestrial market is intended to grow into a rotating offer surface: finished
  weapons, production blueprints, and consumable munitions such as rocket-pod charges.
  This is a design intent for a later cycle; today it offers one finished weapon and
  one production licence, and a purchased offer disappears from the market.
- Primary weapons fire automatically, and only one is equipped at a time. Market and
  Hangar surfaces communicate roles qualitatively; exact combat coefficients remain
  hidden unless a later diagnostic interface gives the player a reason to need them.
- The Quarantine Centre is a researched terrestrial safe-containment extension to the
  Research and Development Centre. The Works constructs it after the first preserved
  alien sample reveals the containment requirement.
- A preserved artefact is analysed in Quarantine into an adapted blueprint, then built
  in the Works and equipped in the Hangar. Field installation remains temporary and
  does not advance permanent adaptation.
- Purchased and manufactured weapons remain owned after defeat during the current
  prototype phase.
- The operating reserve is funded in credits; confirmed targets earn bounties and
  hostile aircraft that breach the protected corridor incur larger penalties.
- Reaching a zero or negative credit reserve ends the campaign.
- Materials and research remain the recovered development resources.
- Energy is capacity, not consumable currency.
- Permanent specialists have roles and random traits.
- Pilots have skills that modify combat statistics.
- Research progresses through game events, never real-world timers.

## Recovery Council composition

- The Recovery Council is an international body founded after the First Breach. The
  People's Republic of China is among its key founding states, and the Chinese
  Communist Party organises the PRC's contribution to the Directorate.
- China holds a permanent Council seat and provides essential positive contributions:
  seed funding for the defence reserve, specialist research and production staff, and
  the industrial base behind parts of the terrestrial arsenal.
- The PRC sometimes offers better conditions, better technologies, and better contracts
  than the other Council states — not always, but often enough that China's advantage
  is visible to the player.
- Chinese characters appear in key constructive roles across Research, Engineering, and
  the Council. Chinese-sourced conventional technology is a credible progression path
  through the terrestrial lanes.
- Russia does not exist in this game's present-day world. Ukraine won the war, and the
  former Russian state collapsed into small, locally organised factions that never
  appear and are never identified as Russian. No Russian state, faction, characters,
  weapons, or symbols appear in gameplay, content, copy, or localization.

## Ukraine

- Ukraine has become one of Earth's technology-innovation leaders after the war for
  its survival and independence. The strongest engineers, scientists, and pilots are
  often Ukrainian, and the best available hireable staff frequently come from Ukraine.
- In the game's present-day world the former Russian state no longer exists: Ukraine
  won the war, and the collapsed state left no unified actor, characters, weapons,
  symbols, or references in current content.
- Ukrainian staff appear in future personnel systems with characteristics and
  progression; Ukrainian hires are meant to be a desirable, high-skill option.

## First vertical slice

Target content remains a recommendation until balancing begins: three pilots, three
specialists, three weapons, about six alien technologies, four regular enemies, two
elite enemy types, three extraction windows, and one final threat.
