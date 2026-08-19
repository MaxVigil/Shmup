import { contentCatalog } from '../content/catalog';
import {
  aircraftById,
  aircraftId,
  aircraftLoadoutByAircraftId,
  ammunitionId,
  auxiliaryId,
  staffRoleId,
  weaponId,
} from '../content/ids';
import { createInitialGameState } from '../domain/initial-state';
import type { GameState } from '../domain/model';
import {
  assignPilotToAircraft,
  ensureAircraftInstance,
} from '../domain/aircraft-instances';

/**
 * Pure playtest-profile factories (no `window`/DOM) so unit tests can import them
 * under the node test environment. `?missionsReady=true` (see `playtest.ts`) is the
 * Iteration 0 safety-net profile: a full, launchable fleet plus populated missions.
 */

/** Every aircraft in the catalogue, in hangar order. */
export const MISSIONS_READY_FLEET: readonly string[] = [
  aircraftId.india,
  aircraftId.britain,
  aircraftId.prc,
  aircraftId.germany,
  aircraftId.usa,
  aircraftId.france,
  aircraftId.japan,
];

/** A distinct primary per aircraft so every build is launchable and testable. */
const PRIMARY_BY_AIRCRAFT: Readonly<Record<string, string>> = {
  [aircraftId.india]: weaponId.pulseCannon,
  [aircraftId.britain]: weaponId.impulseAccelerator,
  [aircraftId.prc]: weaponId.canisterCannon,
  [aircraftId.germany]: weaponId.rocketPod,
  [aircraftId.usa]: weaponId.impulseAccelerator,
  [aircraftId.france]: weaponId.pulseCannon,
  [aircraftId.japan]: weaponId.rocketPod,
};

/** One pilot per fleet aircraft; the active pilot is assigned to the active aircraft. */
const MISSIONS_READY_PILOTS: Readonly<Array<{
  id: string;
  firstName: string;
  lastName: string;
  specialization: 'speed' | 'damage' | 'recovery';
}>> = [
  { id: 'pilot-kestrel', firstName: 'Kestrel', lastName: '', specialization: 'recovery' },
  { id: 'pilot-yaroslava', firstName: 'Yaroslava', lastName: 'Kovalenko', specialization: 'speed' },
  { id: 'pilot-oleksii', firstName: 'Oleksii', lastName: 'Bondarenko', specialization: 'speed' },
  { id: 'pilot-kateryna', firstName: 'Kateryna', lastName: 'Petrenko', specialization: 'damage' },
  { id: 'pilot-andrii', firstName: 'Andrii', lastName: 'Shevchenko', specialization: 'recovery' },
  { id: 'pilot-mykola', firstName: 'Mykola', lastName: 'Tkachenko', specialization: 'damage' },
  { id: 'pilot-iryna', firstName: 'Iryna', lastName: 'Koval', specialization: 'recovery' },
];

/** Full auxiliary ammunition so every hardpoint weapon is testable in one session. */
const FULL_AUXILIARY_AMMO: Readonly<Record<string, number>> = {
  [ammunitionId.rocket]: 12,
  [ammunitionId.homingMissile]: 10,
  [ammunitionId.heavyTorpedo]: 4,
  [ammunitionId.clusterMissile]: 6,
  [ammunitionId.ukrainianAttackDrone]: 20,
  [ammunitionId.flareDecoy]: 6,
  [ammunitionId.proximityMine]: 12,
};

export function createMissionsReadyState(): GameState {
  const state = createInitialGameState();
  const fleet = [...MISSIONS_READY_FLEET];
  const loadouts: Record<string, (string | null)[]> = {};
  const hardpoints: Record<string, (string | null)[]> = {};
  const modules: Record<string, string | null> = {};
  const weaponStock: Record<string, number> = {};

  for (const id of fleet) {
    const definition = aircraftById(id);
    if (definition === undefined) continue;
    const primary = PRIMARY_BY_AIRCRAFT[id]!;
    loadouts[id] = [
      primary,
      ...Array.from({ length: definition.weaponSlotCount - 1 }, () => null),
    ];
    weaponStock[primary] = (weaponStock[primary] ?? 0) + 1;
    const hardpointSlots = aircraftLoadoutByAircraftId(id)?.loadout.hardpointSlots ?? 0;
    hardpoints[id] = [
      auxiliaryId.rocketPod,
      ...Array.from({ length: Math.max(0, hardpointSlots - 1) }, () => null),
    ];
    modules[id] = null;
  }

  const pilots = MISSIONS_READY_PILOTS.map((pilot) => ({
    id: pilot.id,
    unlocked: true,
    firstName: pilot.firstName,
    lastName: pilot.lastName,
    specialization: pilot.specialization,
    salaryCreditCost: 8_000,
  }));
  const pilotXp: Record<string, number> = Object.fromEntries(
    MISSIONS_READY_PILOTS.map((pilot) => [pilot.id, 100]),
  );

  // Provision an instance + history record for every fleet aircraft and assign
  // one pilot per machine (MISSIONS_EPIC §1.2).
  let readyBase: GameState['base'] = { ...state.base, pilots };
  for (const definitionId of MISSIONS_READY_FLEET) {
    readyBase = ensureAircraftInstance(readyBase, definitionId, 1);
  }
  MISSIONS_READY_PILOTS.forEach((pilot, index) => {
    const aircraftIdForPilot = MISSIONS_READY_FLEET[index];
    if (aircraftIdForPilot !== undefined) {
      readyBase = assignPilotToAircraft(readyBase, aircraftIdForPilot, pilot.id);
    }
  });

  return {
    ...state,
    base: {
      ...readyBase,
      credits: 50_000,
      materials: 500,
      research: 500,
      hangarSlots: fleet,
      activeAircraftId: aircraftId.india,
      fueledAircraftIds: fleet,
      aircraftLoadouts: loadouts,
      aircraftHardpoints: hardpoints,
      aircraftModules: modules,
      aircraftDamage: {},
      aircraftRepair: {},
      aircraftMarks: {},
      equippedPrimaryWeaponIds: loadouts[aircraftId.india] ?? [null],
      weaponStock: {
        ...weaponStock,
        [weaponId.disintegrationLance]: 1,
        [weaponId.plasmaOrbProjector]: 1,
        [weaponId.singularityProjector]: 1,
      },
      consumableStock: { ...FULL_AUXILIARY_AMMO },
      constructedBuildingIds: contentCatalog.buildings.map((building) => building.id),
      staff: [
        {
          id: 'staff-scientist-1',
          roleId: staffRoleId.scientist,
          firstName: 'Playtest',
          lastName: 'Scientist',
          tier: 1,
          progressMultiplier: 1,
          salaryMultiplier: 1,
        },
        {
          id: 'staff-engineer-1',
          roleId: staffRoleId.engineer,
          firstName: 'Playtest',
          lastName: 'Engineer',
          tier: 1,
          progressMultiplier: 1,
          salaryMultiplier: 1,
        },
      ],
      pilots,
      activePilotId: 'pilot-kestrel',
      pilotXp,
    },
  };
}
