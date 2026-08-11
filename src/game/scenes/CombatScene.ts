import Phaser from 'phaser';
import { contentCatalog } from '../../content/catalog';
import type { EnemyDefinition } from '../../content/model';
import { createSeededRng, type RandomSource } from '../../domain/rng';

const PLAYER_SPEED = 330;
const PLAYER_ARMOUR = 100;
const PLAYER_MARGIN = 28;
const SHOT_SPEED = 620;
const SHOT_DAMAGE = contentCatalog.weapons[0].damage;
const FIRE_INTERVAL_MS = 1000 / contentCatalog.weapons[0].shotsPerSecond;
const ENCOUNTER_DURATION_MS = 180_000;

interface EnemyActor {
  readonly body: Phaser.GameObjects.Rectangle;
  readonly definition: EnemyDefinition;
  readonly originX: number;
  readonly phase: number;
  armour: number;
  livedMs: number;
}

interface Star {
  readonly body: Phaser.GameObjects.Arc;
  readonly speed: number;
}

export class CombatScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Triangle;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private movementKeys!: Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key>;
  private readonly shots: Phaser.GameObjects.Rectangle[] = [];
  private readonly enemies: EnemyActor[] = [];
  private readonly stars: Star[] = [];
  private rng!: RandomSource;
  private armour = PLAYER_ARMOUR;
  private score = 0;
  private elapsedMs = 0;
  private fireCooldownMs = 0;
  private spawnCooldownMs = 400;
  private invulnerableMs = 0;
  private ended = false;
  private armourText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private timeText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;

  constructor() {
    super('combat');
  }

  create(): void {
    const { width, height } = this.scale;
    this.rng = createSeededRng(0x5eed2026);

    this.add.rectangle(width / 2, height / 2, width, height, 0x05080d);
    this.createStarfield(width, height);

    this.player = this.add.triangle(
      width / 2,
      height * 0.78,
      0,
      36,
      18,
      0,
      36,
      36,
      0x9dd7c7,
    );

    const keyboard = this.input.keyboard;
    if (keyboard === null) {
      throw new Error('Keyboard input is unavailable.');
    }

    this.cursors = keyboard.createCursorKeys();
    this.movementKeys = keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    }) as Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key>;

    this.armourText = this.createHudText(20, 18, 'ARMOUR 100');
    this.scoreText = this.createHudText(width - 20, 18, 'SCORE 000000').setOrigin(1, 0);
    this.timeText = this.createHudText(width / 2, 18, '03:00').setOrigin(0.5, 0);
    this.statusText = this.add
      .text(width / 2, height - 28, 'MOVE: WASD / ARROWS / HOLD POINTER', {
        color: '#6f8792',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        fontSize: '11px',
      })
      .setOrigin(0.5);
  }

  override update(_time: number, delta: number): void {
    if (this.ended) {
      if (this.input.keyboard?.checkDown(this.cursors.space, 250)) {
        this.scene.restart();
      }
      return;
    }

    const frameMs = Math.min(delta, 50);
    this.elapsedMs += frameMs;
    this.fireCooldownMs -= frameMs;
    this.spawnCooldownMs -= frameMs;
    this.invulnerableMs = Math.max(0, this.invulnerableMs - frameMs);

    this.updatePlayer(frameMs);
    this.updateStarfield(frameMs);
    this.updateShots(frameMs);
    this.updateEnemies(frameMs);
    this.resolveCollisions();

    if (this.fireCooldownMs <= 0) {
      this.fire();
      this.fireCooldownMs += FIRE_INTERVAL_MS;
    }

    if (this.spawnCooldownMs <= 0) {
      this.spawnEnemy();
      const pressure = Math.min(500, this.elapsedMs / 180);
      this.spawnCooldownMs = 920 - pressure + this.rng.integer(0, 280);
    }

    this.updateHud();

    if (this.elapsedMs >= ENCOUNTER_DURATION_MS) {
      this.endEncounter(true);
    }
  }

  private createStarfield(width: number, height: number): void {
    for (let index = 0; index < 75; index += 1) {
      const depth = 1 + (index % 3);
      const body = this.add.circle(
        (index * 97) % width,
        (index * 193) % height,
        depth === 3 ? 1.3 : 0.7,
        0x7dd3fc,
        0.14 + depth * 0.08,
      );
      this.stars.push({ body, speed: 28 + depth * 22 });
    }
  }

  private createHudText(x: number, y: number, text: string): Phaser.GameObjects.Text {
    return this.add.text(x, y, text, {
      color: '#b7d9d2',
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
      fontSize: '13px',
    });
  }

  private updatePlayer(deltaMs: number): void {
    const horizontal = Number(this.cursors.right.isDown || this.movementKeys.right.isDown) -
      Number(this.cursors.left.isDown || this.movementKeys.left.isDown);
    const vertical = Number(this.cursors.down.isDown || this.movementKeys.down.isDown) -
      Number(this.cursors.up.isDown || this.movementKeys.up.isDown);
    const length = Math.hypot(horizontal, vertical) || 1;
    const distance = PLAYER_SPEED * (deltaMs / 1000);

    this.player.x += (horizontal / length) * distance;
    this.player.y += (vertical / length) * distance;

    const pointer = this.input.activePointer;
    if (pointer.isDown) {
      const follow = Math.min(1, deltaMs / 70);
      this.player.x = Phaser.Math.Linear(this.player.x, pointer.x, follow);
      this.player.y = Phaser.Math.Linear(this.player.y, pointer.y, follow);
    }

    this.player.x = Phaser.Math.Clamp(this.player.x, PLAYER_MARGIN, this.scale.width - PLAYER_MARGIN);
    this.player.y = Phaser.Math.Clamp(this.player.y, 90, this.scale.height - 58);
    this.player.setAlpha(this.invulnerableMs > 0 && Math.floor(this.invulnerableMs / 80) % 2 === 0 ? 0.3 : 1);
  }

  private updateStarfield(deltaMs: number): void {
    for (const star of this.stars) {
      star.body.y += star.speed * (deltaMs / 1000);
      if (star.body.y > this.scale.height + 4) {
        star.body.y = -4;
      }
    }
  }

  private fire(): void {
    const shot = this.add.rectangle(this.player.x, this.player.y - 22, 4, 18, 0x8be9fd);
    this.shots.push(shot);
  }

  private updateShots(deltaMs: number): void {
    for (let index = this.shots.length - 1; index >= 0; index -= 1) {
      const shot = this.shots[index];
      if (shot === undefined) {
        continue;
      }
      shot.y -= SHOT_SPEED * (deltaMs / 1000);
      if (shot.y < -24) {
        shot.destroy();
        this.shots.splice(index, 1);
      }
    }
  }

  private spawnEnemy(): void {
    const definition = this.elapsedMs > 12_000 && this.rng.next() > 0.58
      ? contentCatalog.enemies[1]
      : contentCatalog.enemies[0];
    const x = this.rng.integer(42, this.scale.width - 42);
    const isWeaver = definition.movementPattern === 'sine';
    const body = this.add.rectangle(
      x,
      -34,
      isWeaver ? 34 : 28,
      isWeaver ? 34 : 28,
      isWeaver ? 0xd98ba1 : 0xd6b36a,
    );
    body.setStrokeStyle(2, isWeaver ? 0xffd1dc : 0xffe3a3, 0.65);

    this.enemies.push({
      body,
      definition,
      originX: x,
      phase: this.rng.next() * Math.PI * 2,
      armour: definition.armour,
      livedMs: 0,
    });
  }

  private updateEnemies(deltaMs: number): void {
    for (let index = this.enemies.length - 1; index >= 0; index -= 1) {
      const enemy = this.enemies[index];
      if (enemy === undefined) {
        continue;
      }
      enemy.livedMs += deltaMs;
      enemy.body.y += enemy.definition.speed * (deltaMs / 1000);

      if (enemy.definition.movementPattern === 'sine') {
        enemy.body.x = enemy.originX + Math.sin(enemy.livedMs / 430 + enemy.phase) * 72;
        enemy.body.x = Phaser.Math.Clamp(enemy.body.x, 24, this.scale.width - 24);
      }

      if (enemy.body.y > this.scale.height + 40) {
        enemy.body.destroy();
        this.enemies.splice(index, 1);
      }
    }
  }

  private resolveCollisions(): void {
    for (let enemyIndex = this.enemies.length - 1; enemyIndex >= 0; enemyIndex -= 1) {
      const enemy = this.enemies[enemyIndex];
      if (enemy === undefined) {
        continue;
      }

      for (let shotIndex = this.shots.length - 1; shotIndex >= 0; shotIndex -= 1) {
        const shot = this.shots[shotIndex];
        if (shot === undefined) {
          continue;
        }
        if (!Phaser.Geom.Intersects.RectangleToRectangle(shot.getBounds(), enemy.body.getBounds())) {
          continue;
        }

        shot.destroy();
        this.shots.splice(shotIndex, 1);
        enemy.armour -= SHOT_DAMAGE;
        enemy.body.setFillStyle(0xffffff);
        this.time.delayedCall(45, () => enemy.body.active && enemy.body.setFillStyle(
          enemy.definition.movementPattern === 'sine' ? 0xd98ba1 : 0xd6b36a,
        ));

        if (enemy.armour <= 0) {
          this.score += enemy.definition.score;
          this.destroyEnemy(enemyIndex);
        }
        break;
      }

      if (
        this.enemies[enemyIndex] === enemy &&
        this.invulnerableMs <= 0 &&
        Phaser.Geom.Intersects.RectangleToRectangle(this.player.getBounds(), enemy.body.getBounds())
      ) {
        this.armour = Math.max(0, this.armour - enemy.definition.contactDamage);
        this.invulnerableMs = 700;
        this.destroyEnemy(enemyIndex);
        this.cameras.main.shake(110, 0.006);
        if (this.armour === 0) {
          this.endEncounter(false);
          return;
        }
      }
    }
  }

  private destroyEnemy(index: number): void {
    const enemy = this.enemies[index];
    if (enemy === undefined) {
      return;
    }
    enemy.body.destroy();
    this.enemies.splice(index, 1);
  }

  private updateHud(): void {
    const remainingSeconds = Math.max(0, Math.ceil((ENCOUNTER_DURATION_MS - this.elapsedMs) / 1000));
    const minutes = Math.floor(remainingSeconds / 60).toString().padStart(2, '0');
    const seconds = (remainingSeconds % 60).toString().padStart(2, '0');
    this.armourText.setText(`ARMOUR ${this.armour.toString().padStart(3, '0')}`);
    this.scoreText.setText(`SCORE ${this.score.toString().padStart(6, '0')}`);
    this.timeText.setText(`${minutes}:${seconds}`);
  }

  private endEncounter(survived: boolean): void {
    this.ended = true;
    this.statusText
      .setText(survived ? 'SECTOR HELD // SPACE TO RESTART' : 'SHIP LOST // SPACE TO RESTART')
      .setColor(survived ? '#9dd7c7' : '#f39aaa');
    this.player.setAlpha(survived ? 1 : 0.25);
  }
}
