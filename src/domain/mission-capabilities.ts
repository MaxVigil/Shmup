import type { MissionType } from '../content/model';

export interface CapabilityDemand {
  readonly primary: string;
  readonly secondary: readonly string[];
}

/**
 * Primary build demands per mission type (MISSIONS_EPIC §7.3, M10 balance gate).
 * The four wave-1 types must demand different primary capabilities so no single
 * aircraft/build dominates every mission.
 */
export const MISSION_CAPABILITY_DEMANDS: Readonly<Record<MissionType, CapabilityDemand>> = {
  sweep: {
    primary: 'sustained-fire',
    secondary: ['survivability', 'target-priority'],
  },
  interception: {
    primary: 'burst-damage',
    secondary: ['speed', 'homing-precision'],
  },
  escort: {
    primary: 'threat-control',
    secondary: ['interception', 'defence'],
  },
  recon: {
    primary: 'mobility',
    secondary: ['survivability', 'endurance'],
  },
};
