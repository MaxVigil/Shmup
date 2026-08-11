import Phaser from 'phaser';
import { contentCatalog } from '../../content/catalog';
import type { EnemyDefinition } from '../../content/model';
import type { SortieOutcome } from '../../domain/model';
import {
  addMaterials,
  createRiskExtractionState,
  decideExtraction,
  decideTechnology,
  defeatElite,
  failRun,
  forceExtraction,
  offerExtraction,
  toSortieOutcome,
  type RiskExtractionState,
  type TechnologyDecision,
} from '../../domain/risk-extraction';
import { createSeededRng, type RandomSource } from '../../domain/rng';

const PLAYER_SPEED = 330;
const PLAYER_ARMOUR = 100;
const PLAYER_MARGIN = 28;
const ARMOUR_BAR_WIDTH = 44;
const ARMOUR_BAR_HEIGHT = 6;
const ARMOUR_BAR_OFFSET_Y = 27;
const SHOT_SPEED = 620;
const SHOT_DAMAGE = contentCatalog.weapons[0].damage;
const FIRE_INTERVAL_MS = 1000 / contentCatalog.weapons[0].shotsPerSecond;
const M2_FAST_MODE = import.meta.env.DEV &&
  new URLSearchParams(window.location.search).get('m2Fast') === 'true';
const ENCOUNTER_DURATION_MS = M2_FAST_MODE ? 20_000 : 180_000;
const EXTRACTION_WINDOW_MS = M2_FAST_MODE ? 4_500 : 90_000;

interface ShotActor {
  readonly body: Phaser.GameObjects.Rectangle;
  readonly damage: number;
}

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

export interface CombatRunResult {
  readonly outcome: SortieOutcome;
  readonly technologyDecision: RiskExtractionState['technologyDecision'];
  readonly extractionDecision: RiskExtractionState['extractionDecision'];
  readonly eliteDefeated: boolean;
}

export class CombatScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Triangle;
  private playerArmourBarBackground!: Phaser.GameObjects.Rectangle;
  private playerArmourBarFill!: Phaser.GameObjects.Rectangle;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private movementKeys!: Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key>;
  private readonly shots: ShotActor[] = [];
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
  private eliteSpawned = false;
  private completionPublished = false;
  private runState = createRiskExtractionState();
  private decisionLayer: Phaser.GameObjects.Container | null = null;
  private actionKeys!: Record<'install' | 'preserve' | 'extract' | 'continue', Phaser.Input.Keyboard.Key>;
  private armourText!: Phaser.GameObjects.Text;
  private salvageText!: Phaser.GameObjects.Text;
  private technologyText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private timeText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;

  constructor(private readonly onRunComplete: (result: CombatRunResult) => void = () => {}) {
    super('combat');
  }

  create(): void {
    this.resetEncounterState();

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
    this.playerArmourBarBackground = this.add
      .rectangle(
        this.player.x,
        this.player.y + ARMOUR_BAR_OFFSET_Y,
        ARMOUR_BAR_WIDTH,
        ARMOUR_BAR_HEIGHT,
        0x05080d,
        0.9,
      )
      .setStrokeStyle(1, 0xb7d9d2, 0.8);
    this.playerArmourBarFill = this.add
      .rectangle(
        this.player.x - ARMOUR_BAR_WIDTH / 2,
        this.player.y + ARMOUR_BAR_OFFSET_Y,
        ARMOUR_BAR_WIDTH,
        ARMOUR_BAR_HEIGHT - 2,
        0x70d6b3,
      )
      .setOrigin(0, 0.5);

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
    this.actionKeys = keyboard.addKeys({
      install: Phaser.Input.Keyboard.KeyCodes.I,
      preserve: Phaser.Input.Keyboard.KeyCodes.P,
      extract: Phaser.Input.Keyboard.KeyCodes.E,
      continue: Phaser.Input.Keyboard.KeyCodes.C,
    }) as Record<'install' | 'preserve' | 'extract' | 'continue', Phaser.Input.Keyboard.Key>;

    this.armourText = this.createHudText(20, 18, 'ARMOUR 100');
    this.salvageText = this.createHudText(20, 42, 'SALVAGE 000');
    this.scoreText = this.createHudText(width - 20, 18, 'SCORE 000000').setOrigin(1, 0);
    this.technologyText = this.createHudText(width - 20, 42, 'WARDEN SIGNAL').setOrigin(1, 0);
    this.timeText = this.createHudText(width / 2, 18, '03:00').setOrigin(0.5, 0);
    this.statusText = this.add
      .text(width / 2, height - 28, 'MOVE: WASD / ARROWS / HOLD POINTER', {
        color: '#6f8792',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        fontSize: '11px',
      })
      .setOrigin(0.5);
  }

  private resetEncounterState(): void {
    this.shots.length = 0;
    this.enemies.length = 0;
    this.stars.length = 0;
    this.armour = PLAYER_ARMOUR;
    this.score = 0;
    this.elapsedMs = 0;
    this.fireCooldownMs = 0;
    this.spawnCooldownMs = 400;
    this.invulnerableMs = 0;
    this.ended = false;
    this.eliteSpawned = false;
    this.completionPublished = false;
    this.runState = createRiskExtractionState();
    this.decisionLayer?.destroy(true);
    this.decisionLayer = null;
  }

  override update(_time: number, delta: number): void {
    if (this.ended) {
      if (this.input.keyboard?.checkDown(this.cursors.space, 250)) {
        this.scene.restart();
      }
      return;
    }

    if (this.runState.phase === 'technology-choice') {
      if (Phaser.Input.Keyboard.JustDown(this.actionKeys.install)) {
        this.chooseTechnology('install');
      } else if (Phaser.Input.Keyboard.JustDown(this.actionKeys.preserve)) {
        this.chooseTechnology('preserve');
      }
      return;
    }

    if (this.runState.phase === 'extraction-choice') {
      if (Phaser.Input.Keyboard.JustDown(this.actionKeys.extract)) {
        this.chooseExtraction('extract');
      } else if (Phaser.Input.Keyboard.JustDown(this.actionKeys.continue)) {
        this.chooseExtraction('continue');
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
    if (this.ended) {
      return;
    }

    if (
      this.runState.phase === 'combat' &&
      this.elapsedMs >= EXTRACTION_WINDOW_MS
    ) {
      this.presentExtractionWindow();
      return;
    }

    if (this.runState.phase === 'elite' && !this.eliteSpawned) {
      this.spawnElite();
    }

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
      if (this.runState.phase === 'elite') {
        this.runState = forceExtraction(this.runState);
      }
      this.endEncounter(true, 'FORCED EXTRACTION COMPLETE');
    }
  }

  private presentTechnologySignal(): void {
    const technology = contentCatalog.alienTechnologies[0];
    this.showDecision(
      'ARTEFACT RECOVERED FROM WARDEN',
      [
        `${technology.signalGlyphs} // ${technology.category.toUpperCase()}`,
        `RELIABILITY ${technology.reliability}/5 // DANGER ${technology.danger}/5`,
        'Exact effects remain unresolved.',
      ],
      [
        { label: '[I] INSTALL // immediate unknown combat effect', action: () => this.chooseTechnology('install') },
        { label: `[P] PRESERVE // +${technology.preservationResearch} research if recovered`, action: () => this.chooseTechnology('preserve') },
      ],
    );
  }

  private chooseTechnology(decision: TechnologyDecision): void {
    if (this.runState.phase !== 'technology-choice') {
      return;
    }
    const technology = contentCatalog.alienTechnologies[0];
    this.runState = decideTechnology(this.runState, technology, decision);
    this.closeDecision();
    this.statusText.setText(
      decision === 'install'
        ? 'PRISM ACTIVE // SPLIT PULSE + PRISMATIC SHEATH'
        : 'PRISM SEALED // LAB TRANSFER READY',
    );
    this.endEncounter(true, 'ARTEFACT SECURED // EXTRACTION COMPLETE');
  }

  private presentExtractionWindow(): void {
    this.runState = offerExtraction(this.runState);
    this.showDecision(
      'EXTRACTION WINDOW OPEN',
      [
        `SALVAGE ${this.runState.materialsFound} // RESEARCH ${this.runState.researchFound}`,
        'Extract now, or intercept the Warden carrying an unknown signal.',
      ],
      [
        { label: '[E] EXTRACT // secure the complete haul', action: () => this.chooseExtraction('extract') },
        { label: '[C] INTERCEPT // optional elite + unknown artefact', action: () => this.chooseExtraction('continue') },
      ],
    );
  }

  private chooseExtraction(decision: 'extract' | 'continue'): void {
    if (this.runState.phase !== 'extraction-choice') {
      return;
    }
    this.runState = decideExtraction(this.runState, decision);
    this.closeDecision();
    if (decision === 'extract') {
      this.endEncounter(true, 'SAFE EXTRACTION COMPLETE');
      return;
    }
    this.statusText.setText('WARDEN INTERCEPT // SURVIVE OR DESTROY');
    this.spawnElite();
  }

  private showDecision(
    title: string,
    details: readonly string[],
    options: readonly { readonly label: string; readonly action: () => void }[],
  ): void {
    this.closeDecision();
    const { width, height } = this.scale;
    const blocker = this.add.rectangle(width / 2, height / 2, width, height, 0x020407, 0.82)
      .setInteractive();
    const panel = this.add.rectangle(width / 2, height / 2, width - 64, 300, 0x0a1218, 0.98)
      .setStrokeStyle(1, 0x6fa4ad, 0.9);
    const heading = this.add.text(width / 2, height / 2 - 112, title, {
      color: '#dceff0',
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
      fontSize: '20px',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    const detail = this.add.text(width / 2, height / 2 - 66, details.join('\n'), {
      align: 'center',
      color: '#87a8b0',
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
      fontSize: '13px',
      lineSpacing: 8,
    }).setOrigin(0.5, 0);
    const optionObjects = options.map((option, index) => this.add
      .text(width / 2, height / 2 + 54 + index * 48, option.label, {
        backgroundColor: '#12242b',
        color: '#aee7d3',
        fixedWidth: width - 104,
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        fontSize: '13px',
        padding: { x: 12, y: 10 },
        align: 'center',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', function (this: Phaser.GameObjects.Text) { this.setColor('#ffffff'); })
      .on('pointerout', function (this: Phaser.GameObjects.Text) { this.setColor('#aee7d3'); })
      .on('pointerdown', option.action));
    this.decisionLayer = this.add.container(0, 0, [blocker, panel, heading, detail, ...optionObjects])
      .setDepth(30);
  }

  private closeDecision(): void {
    this.decisionLayer?.destroy(true);
    this.decisionLayer = null;
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

  private updatePlayerArmourBar(): void {
    const armourRatio = Phaser.Math.Clamp(this.armour / PLAYER_ARMOUR, 0, 1);
    const fillColour = armourRatio > 0.5 ? 0x70d6b3 : armourRatio > 0.25 ? 0xf2c66d : 0xf07178;

    this.playerArmourBarBackground.setPosition(
      this.player.x,
      this.player.y + ARMOUR_BAR_OFFSET_Y,
    );
    this.playerArmourBarFill
      .setPosition(
        this.player.x - ARMOUR_BAR_WIDTH / 2,
        this.player.y + ARMOUR_BAR_OFFSET_Y,
      )
      .setDisplaySize(ARMOUR_BAR_WIDTH * armourRatio, ARMOUR_BAR_HEIGHT - 2)
      .setFillStyle(fillColour);
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
    const technology = contentCatalog.alienTechnologies[0];
    const installed = this.runState.technologyDecision === 'install';
    const transformation = technology.weaponTransformation;
    const projectileCount = installed ? transformation.projectileCount : 1;
    const damage = SHOT_DAMAGE * (installed ? transformation.damageMultiplier : 1);
    for (let index = 0; index < projectileCount; index += 1) {
      const offset = (index - (projectileCount - 1) / 2) * transformation.spread * 2;
      const body = this.add.rectangle(
        this.player.x + offset,
        this.player.y - 22,
        installed ? 5 : 4,
        18,
        installed ? 0xc5a3ff : 0x8be9fd,
      );
      this.shots.push({ body, damage });
    }
  }

  private updateShots(deltaMs: number): void {
    for (let index = this.shots.length - 1; index >= 0; index -= 1) {
      const shot = this.shots[index];
      if (shot === undefined) {
        continue;
      }
      shot.body.y -= SHOT_SPEED * (deltaMs / 1000);
      if (shot.body.y < -24) {
        shot.body.destroy();
        this.shots.splice(index, 1);
      }
    }
  }

  private spawnEnemy(definition?: EnemyDefinition): void {
    const selectedDefinition = definition ?? (
      this.elapsedMs > 12_000 && this.rng.next() > 0.58
        ? contentCatalog.enemies[1]
        : contentCatalog.enemies[0]
    );
    const isElite = selectedDefinition.kind === 'elite';
    const x = this.rng.integer(42, this.scale.width - 42);
    const isWeaver = selectedDefinition.movementPattern === 'sine';
    const body = this.add.rectangle(
      x,
      -34,
      isElite ? 76 : isWeaver ? 34 : 28,
      isElite ? 56 : isWeaver ? 34 : 28,
      isElite ? 0x9368c7 : isWeaver ? 0xd98ba1 : 0xd6b36a,
    );
    body.setStrokeStyle(isElite ? 3 : 2, isElite ? 0xe0c2ff : isWeaver ? 0xffd1dc : 0xffe3a3, 0.7);

    this.enemies.push({
      body,
      definition: selectedDefinition,
      originX: x,
      phase: this.rng.next() * Math.PI * 2,
      armour: selectedDefinition.armour,
      livedMs: 0,
    });
  }

  private spawnElite(): void {
    if (this.eliteSpawned) {
      return;
    }
    const elite = contentCatalog.enemies.find((enemy) => enemy.kind === 'elite');
    if (elite === undefined) {
      throw new Error('M2 requires one elite enemy definition.');
    }
    this.eliteSpawned = true;
    this.spawnEnemy(elite);
  }

  private updateEnemies(deltaMs: number): void {
    for (let index = this.enemies.length - 1; index >= 0; index -= 1) {
      const enemy = this.enemies[index];
      if (enemy === undefined) {
        continue;
      }
      enemy.livedMs += deltaMs;
      if (enemy.definition.kind === 'elite') {
        enemy.body.y = Math.min(170, enemy.body.y + enemy.definition.speed * (deltaMs / 1000));
      } else {
        enemy.body.y += enemy.definition.speed * (deltaMs / 1000);
      }

      if (enemy.definition.movementPattern === 'sine') {
        enemy.body.x = enemy.originX + Math.sin(enemy.livedMs / 430 + enemy.phase) * 72;
        enemy.body.x = Phaser.Math.Clamp(enemy.body.x, 24, this.scale.width - 24);
      }

      if (enemy.definition.kind !== 'elite' && enemy.body.y > this.scale.height + 40) {
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
        if (!Phaser.Geom.Intersects.RectangleToRectangle(shot.body.getBounds(), enemy.body.getBounds())) {
          continue;
        }

        shot.body.destroy();
        this.shots.splice(shotIndex, 1);
        enemy.armour -= shot.damage;
        enemy.body.setFillStyle(0xffffff);
        this.time.delayedCall(45, () => enemy.body.active && enemy.body.setFillStyle(
          enemy.definition.kind === 'elite'
            ? 0x9368c7
            : enemy.definition.movementPattern === 'sine' ? 0xd98ba1 : 0xd6b36a,
        ));

        if (enemy.armour <= 0) {
          this.score += enemy.definition.score;
          if (enemy.definition.kind === 'elite') {
            this.runState = defeatElite(this.runState, enemy.definition.materialReward);
          } else {
            this.runState = addMaterials(this.runState, enemy.definition.materialReward);
          }
          this.destroyEnemy(enemyIndex);
          if (enemy.definition.kind === 'elite') {
            this.statusText.setText('WARDEN DESTROYED // ARTEFACT RECOVERED');
            this.presentTechnologySignal();
            return;
          }
        }
        break;
      }

      if (
        this.enemies[enemyIndex] === enemy &&
        this.invulnerableMs <= 0 &&
        Phaser.Geom.Intersects.RectangleToRectangle(this.player.getBounds(), enemy.body.getBounds())
      ) {
        const passiveMultiplier = this.runState.technologyDecision === 'install'
          ? contentCatalog.alienTechnologies[0].passiveEffect.armourDamageMultiplier
          : 1;
        const contactDamage = Math.ceil(enemy.definition.contactDamage * passiveMultiplier);
        this.armour = Math.max(0, this.armour - contactDamage);
        this.invulnerableMs = 700;
        this.destroyEnemy(enemyIndex);
        this.cameras.main.shake(110, 0.006);
        if (this.armour === 0) {
          this.endEncounter(false, 'SHIP LOST');
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
    this.updatePlayerArmourBar();
    this.armourText.setText(`ARMOUR ${this.armour.toString().padStart(3, '0')}`);
    this.scoreText.setText(`SCORE ${this.score.toString().padStart(6, '0')}`);
    this.salvageText.setText(`SALVAGE ${this.runState.materialsFound.toString().padStart(3, '0')}`);
    this.technologyText.setText(
      this.runState.technologyDecision === 'install'
        ? 'PRISM INSTALLED'
        : this.runState.technologyDecision === 'preserve'
          ? `PRISM SEALED +${this.runState.researchFound}R`
          : this.runState.phase === 'elite' ? 'WARDEN INTERCEPT' : 'WARDEN SIGNAL',
    );
    this.timeText.setText(`${minutes}:${seconds}`);
  }

  private endEncounter(survived: boolean, message: string): void {
    if (this.ended) {
      return;
    }
    if (!survived) {
      this.runState = failRun(this.runState);
    }
    this.ended = true;
    this.closeDecision();
    this.statusText
      .setText(`${message} // SPACE TO RESTART`)
      .setColor(survived ? '#9dd7c7' : '#f39aaa');
    this.player.setAlpha(survived ? 1 : 0.25);
    if (!this.completionPublished) {
      this.completionPublished = true;
      this.onRunComplete({
        outcome: toSortieOutcome(this.runState),
        technologyDecision: this.runState.technologyDecision,
        extractionDecision: this.runState.extractionDecision,
        eliteDefeated: this.runState.eliteDefeated,
      });
    }
  }
}
