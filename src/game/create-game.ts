import Phaser from 'phaser';
import type { Locale } from '../i18n';
import { CombatScene, type CombatRunResult } from './scenes/CombatScene';

export const LOGICAL_WIDTH = 540;
export const LOGICAL_HEIGHT = 960;

export function createGame(
  parent: HTMLElement,
  onRunComplete: (result: CombatRunResult) => void = () => {},
  getEquippedPrimaryWeaponIds: () => readonly [string | null, string | null] = () => [
    'weapon-pulse-cannon',
    null,
  ],
  getEquippedEquipmentId: () => string | null = () => null,
  getAvailableCredits: () => number = () => 0,
  getManufacturedWeaponUpgradeIds: () => readonly string[] = () => [],
  getLocale: () => Locale = () => 'uk',
  onActiveWeaponChanged: (weaponId: string, canSwitch: boolean) => void = () => {},
): Phaser.Game {
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent,
    width: LOGICAL_WIDTH,
    height: LOGICAL_HEIGHT,
    backgroundColor: '#05080d',
    render: {
      antialias: true,
      pixelArt: false,
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [new CombatScene(
      onRunComplete,
      getEquippedPrimaryWeaponIds,
      getEquippedEquipmentId,
      getAvailableCredits,
      getManufacturedWeaponUpgradeIds,
      getLocale,
      onActiveWeaponChanged,
    )],
  };

  const game = new Phaser.Game(config);
  game.canvas.tabIndex = 0;
  return game;
}
