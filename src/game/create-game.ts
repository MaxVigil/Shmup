import Phaser from 'phaser';
import { CombatScene, type CombatRunResult } from './scenes/CombatScene';

export const LOGICAL_WIDTH = 540;
export const LOGICAL_HEIGHT = 960;

export function createGame(
  parent: HTMLElement,
  onRunComplete: (result: CombatRunResult) => void = () => {},
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
    scene: [new CombatScene(onRunComplete)],
  };

  return new Phaser.Game(config);
}
