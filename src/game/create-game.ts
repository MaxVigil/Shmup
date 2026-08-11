import Phaser from 'phaser';
import { FoundationScene } from './scenes/FoundationScene';

export const LOGICAL_WIDTH = 540;
export const LOGICAL_HEIGHT = 960;

export function createGame(parent: HTMLElement): Phaser.Game {
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
    scene: [FoundationScene],
  };

  return new Phaser.Game(config);
}
