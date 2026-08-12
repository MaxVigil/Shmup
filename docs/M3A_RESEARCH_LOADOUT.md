# M3a research-to-loadout contract

M3a closes the smallest persistent progression loop without implementing the full base.

## Flow

1. Installing the unknown Prism grants Split Pulse and Prismatic Sheath only for the
   current sortie.
2. Preserving it grants no immediate combat benefit. The intact sample must survive
   the escape and is lost completely with the ship.
3. A delivered sample appears in the base technology lab.
4. Research consumes the sample, records 10 research, reveals the weapon transformation,
   and permanently unlocks the stable Split Pulse Emitter.
5. The player equips the module on Kestrel and launches the next sortie.
6. The equipped module provides Split Pulse from the start of each sortie until removed.
   It does not grant the field-installed Prism's Prismatic Sheath.

Additional Prism samples can be analysed for their 10 research value after the module
has been unlocked. Research completes through the player's base action and never uses a
real-world timer.

## Persistence

Save schema v5 stores delivered samples, unlocked weapon modules, equipped modules,
credits, infrastructure, staff, and special-equipment loadout. Valid v1–v4 saves migrate automatically while
retaining materials, research, pilot state, research queue, and technology knowledge.
