import Phaser from 'phaser';

export class FoundationScene extends Phaser.Scene {
  constructor() {
    super('foundation');
  }

  create(): void {
    const { width, height } = this.scale;

    this.add.rectangle(width / 2, height / 2, width, height, 0x05080d);

    const graphics = this.add.graphics();
    graphics.fillStyle(0x7dd3fc, 0.28);

    for (let index = 0; index < 90; index += 1) {
      const x = (index * 97) % width;
      const y = (index * 193) % height;
      const radius = index % 7 === 0 ? 1.5 : 0.75;
      graphics.fillCircle(x, y, radius);
    }

    this.add.triangle(
      width / 2,
      height * 0.7,
      0,
      34,
      17,
      0,
      34,
      34,
      0x9dd7c7,
    );

    this.add
      .text(width / 2, 52, 'M0 // FOUNDATION', {
        color: '#8fa6b8',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        fontSize: '16px',
        letterSpacing: 3,
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height - 54, 'COMBAT SYSTEMS OFFLINE', {
        color: '#486173',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        fontSize: '12px',
      })
      .setOrigin(0.5);
  }
}
