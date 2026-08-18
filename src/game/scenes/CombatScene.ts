import Phaser from 'phaser';
import { contentCatalog } from '../../content/catalog';
import { resolveWeaponFamilyItem } from '../../content/weapon-families';
import {
  alienTechnologyById,
  alienTechnologyId,
  aircraftById,
  aircraftId,
  auxiliaryById,
  auxiliaryId,
  weaponById,
  weaponId,
} from '../../content/ids';
import type {
  AircraftDefinition,
  EnemyDefinition,
  EnemyHomingProfile,
  WeaponDefinition,
} from '../../content/model';
import { formatCredits } from '../../ui/credits';
import { silhouetteCentroid } from '../../ui/ship-svg';
import { MONTH_SORTIE_LENGTH } from '../../domain/command-centre';
import type { SortieOutcome } from '../../domain/model';
import {
  calculateMutualKnockback,
  resolveAircraftContact,
} from '../../domain/combat-contact';
import {
  EMPTY_SORTIE_CONTRACT,
  contractCreditDelta,
  recordTargetBreached,
  recordTargetDestroyed,
  type SortieContractLedger,
} from '../../domain/operational-economy';
import {
  EMPTY_PAUSE_STATE,
  isPaused,
  setPauseReason as updatePauseReason,
  type PauseReason,
  type PauseState,
} from '../../domain/pause-state';
import {
  abortRun,
  addMaterials,
  completeEscape,
  createRiskExtractionState,
  decideExtraction,
  decideTechnology,
  defeatElite,
  failRun,
  forceExtraction,
  offerExtraction,
  recordWardenSignal,
  stunElite,
  toSortieOutcome,
  type RiskExtractionState,
  type TechnologyDecision,
} from '../../domain/risk-extraction';
import { createSeededRng, type RandomSource } from '../../domain/rng';
import { applyWeaponUpgrades } from '../../domain/terrestrial-production';
import {
  translate,
  type Locale,
  type TranslationKey,
  type TranslationParams,
} from '../../i18n';

const PLAYER_BASE_SPEED = 330;
const DEFAULT_PLAYER_ARMOUR = 100;
const PLAYER_MARGIN = 28;
const PLAYER_COLLISION_HALF_SIZE = 18;
const ARMOUR_BAR_WIDTH = 44;
const ARMOUR_BAR_HEIGHT = 6;
const ARMOUR_BAR_OFFSET_Y = 27;
const M2_FAST_MODE = import.meta.env.DEV &&
  new URLSearchParams(window.location.search).get('m2Fast') === 'true';
const ENCOUNTER_DURATION_MS = M2_FAST_MODE ? 20_000 : 180_000;
const EXTRACTION_WINDOW_MS = M2_FAST_MODE ? 4_500 : 90_000;
const CONTROLS_HINT_DURATION_MS = 15_000;
const ROCKET_CHARGES_DEFAULT = 3;
const ROCKET_DAMAGE = 200;
const ROCKET_SPEED = 820;
/** Blast radius as a fraction of the larger screen dimension. */
const ROCKET_BLAST_RADIUS_FRACTION = 0.4;
const DRONE_SPEED = 300;
const DRONE_LIFETIME_MS = 12_000;
const DRONE_ORBIT_RADIUS = 34;
const DRONE_ORBIT_RADIANS_PER_SECOND = 2.4;
const ENEMY_BOUNCE_DAMPING = 0.5;
const ENEMY_BOUND_MARGIN = 24;
const ESCAPE_DURATION_MS = M2_FAST_MODE ? 8_000 : 35_000;
const PRE_EXTRACTION_CLEARANCE_MS = M2_FAST_MODE ? 1_000 : 3_000;
const BOSS_WARNING_DURATION_MS = M2_FAST_MODE ? 900 : 1_500;
const ARTIFACT_REVEAL_DELAY_MS = 650;
const VICTORY_CENTER_DURATION_MS = 650;
const VICTORY_EXIT_SPEED = 620;
const DEFEAT_DURATION_MS = 1_200;
const PLAYER_CONTACT_KNOCKBACK = 64;
const ELITE_CONTACT_KNOCKBACK = 46;
const ELITE_KNOCKBACK_RECOVERY_MS = 360;
const ELITE_DURATION_MS = ENCOUNTER_DURATION_MS - EXTRACTION_WINDOW_MS;
const SPLIT_PULSE_MODULE_ID = alienTechnologyById(alienTechnologyId.prism)!.weaponTransformation.id;
const STANDARD_WEAPON_ID = weaponId.pulseCannon;
const STUN_MODULE_ID = auxiliaryId.stunModule;
const AUX_ROCKET_POD_ID = auxiliaryId.rocketPod;
const AUX_DRONE_SWARM_ID = auxiliaryId.ukrainianDroneSwarm;
const AUX_FLARE_DECOY_ID = auxiliaryId.flareDecoyLauncher;
const AUX_MINE_ID = auxiliaryId.proximityMine;
const DECOY_LIFETIME_MS = 4_000;
const DECOY_ATTRACTION_RADIUS = 160;
const DECOY_DRIFT_SPEED = 40;
const MINE_DRIFT_SPEED = 55;
const MINE_PROXIMITY_RADIUS = 48;
const MINE_LIFETIME_MS = 14_000;
const AUX_MISSILE_IDS = [
  auxiliaryId.homingMissileRack,
  auxiliaryId.heavyTorpedoLauncher,
  auxiliaryId.clusterMissilePod,
] as const;

interface ShotActor {
  readonly body: Phaser.GameObjects.Rectangle;
  readonly damage: number;
  readonly projectileSpeed: number;
  readonly penetratesAllTargets: boolean;
  readonly hitEnemyIds: Set<number>;
  readonly visualProfile: WeaponDefinition['visualProfile'];
  readonly vx: number;
  lifetimeMs: number | null;
  readonly knockbackVolleyId: number | null;
  readonly knockbackImpulse: number;
}

interface EnemyActor {
  readonly actorId: number;
  readonly body: Phaser.GameObjects.Rectangle;
  readonly definition: EnemyDefinition;
  readonly originX: number;
  readonly phase: number;
  readonly armourBarBackground: Phaser.GameObjects.Rectangle | null;
  readonly armourBarFill: Phaser.GameObjects.Rectangle | null;
  armour: number;
  livedMs: number;
  knockbackX: number;
  knockbackY: number;
  nextShotAtMs: number;
  knockbackVolleyApplied: number | null;
}

interface HostileShot {
  readonly body: Phaser.GameObjects.Rectangle;
  readonly damage: number;
  readonly vx: number;
  readonly vy: number;
}

interface DecoyActor {
  readonly body: Phaser.GameObjects.Rectangle;
  readonly attractionRadius: number;
  readonly lifetimeMs: number;
  elapsedMs: number;
}

interface HomingMissileActor {
  readonly body: Phaser.GameObjects.Rectangle;
  readonly speed: number;
  readonly turnRateRad: number;
  readonly damage: number;
  readonly lifetimeMs: number;
  angle: number;
  elapsedMs: number;
}

interface RocketActor {
  readonly body: Phaser.GameObjects.Rectangle;
  readonly targetId: number;
  readonly damage: number;
  readonly speed: number;
  readonly areaRadius: number;
  targetX: number;
  targetY: number;
  elapsedMs: number;
}

interface DroneActor {
  readonly body: Phaser.GameObjects.Rectangle;
  targetId: number | null;
  state: 'circle' | 'hunt';
  angle: number;
  readonly speed: number;
  readonly damage: number;
  readonly areaRadius: number;
  elapsedMs: number;
}

interface MineActor {
  readonly body: Phaser.GameObjects.Rectangle;
  readonly damage: number;
  readonly areaRadius: number;
  readonly proximityRadius: number;
  readonly driftSpeed: number;
  readonly lifetimeMs: number;
  elapsedMs: number;
}

interface Star {
  readonly body: Phaser.GameObjects.Arc;
  readonly speed: number;
}

interface EndingState {
  readonly survived: boolean;
  readonly messageKey: TranslationKey;
  phase: 'centering' | 'exiting' | 'defeat';
  elapsedMs: number;
}

export interface CombatRunResult {
  readonly outcome: SortieOutcome;
  readonly technologyDecision: RiskExtractionState['technologyDecision'];
  readonly extractionDecision: RiskExtractionState['extractionDecision'];
  readonly eliteDefeated: boolean;
  readonly armourLostRatio: number;
  /** True when the active aircraft's armour reached 0 (hardcore loss). */
  readonly aircraftDestroyed: boolean;
  readonly rocketsFired: number;
  readonly auxiliaryAmmoConsumed: Readonly<Record<string, number>>;
}

export interface AircraftCombatStats {
  readonly armour: number;
  readonly speedMultiplier: number;
  readonly damageMultiplier: number;
  readonly fireRateMultiplier: number;
  readonly projectileSpeedMultiplier: number;
}

export class CombatScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Image | Phaser.GameObjects.Graphics;
  private playerArmourBarBackground!: Phaser.GameObjects.Rectangle;
  private playerArmourBarFill!: Phaser.GameObjects.Rectangle;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private movementKeys!: Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key>;
  private readonly shots: ShotActor[] = [];
  private readonly hostileShots: HostileShot[] = [];
  private readonly homingMissiles: HomingMissileActor[] = [];
  private decoy: DecoyActor | null = null;
  private readonly rockets: RocketActor[] = [];
  private readonly drones: DroneActor[] = [];
  private readonly mines: MineActor[] = [];
  private readonly enemies: EnemyActor[] = [];
  private readonly stars: Star[] = [];
  private rng!: RandomSource;
  private armour = DEFAULT_PLAYER_ARMOUR;
  private maxArmour = DEFAULT_PLAYER_ARMOUR;
  private aircraftSpeed = PLAYER_BASE_SPEED;
  private aircraftDamageMultiplier = 1;
  private aircraftFireRateMultiplier = 1;
  private aircraftProjectileSpeedMultiplier = 1;
  private score = 0;
  private startingCredits = 0;
  private contractLedger: SortieContractLedger = EMPTY_SORTIE_CONTRACT;
  private nextEnemyActorId = 1;
  private nextVolleyId = 1;
  private elapsedMs = 0;
  private fireCooldownMs = 0;
  private spawnCooldownMs = 400;
  private escapeElapsedMs = 0;
  private eliteElapsedMs = 0;
  private invulnerableMs = 0;
  private ended = false;
  private eliteSpawned = false;
  private completionPublished = false;
  private ending: EndingState | null = null;
  private bossWarningElapsedMs: number | null = null;
  private artifactRevealElapsedMs: number | null = null;
  private equippedPrimaryWeaponIds: readonly (string | null)[] = [
    STANDARD_WEAPON_ID,
    null,
  ];
  private activePrimaryWeaponSlot = 0;
  private manufacturedWeaponUpgradeIds: readonly string[] = [];
  private equippedHardpointItemIds: readonly (string | null)[] = [];
  private eliteStunned = false;
  private runState = createRiskExtractionState();
  private decisionLayer: Phaser.GameObjects.Container | null = null;
  private pauseLayer: Phaser.GameObjects.Container | null = null;
  private bossWarningLayer: Phaser.GameObjects.Container | null = null;
  private endingText: Phaser.GameObjects.Text | null = null;
  private pauseState: PauseState = EMPTY_PAUSE_STATE;
  private abortArmed = false;
  private armourText!: Phaser.GameObjects.Text;
  private reserveText!: Phaser.GameObjects.Text;
  private timeText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private statusKey: TranslationKey = 'combat.controls';
  private statusParams: TranslationParams = {};
  private controlsHintVisible = true;
  private rocketsText: Phaser.GameObjects.Text | null = null;
  private rocketCharges = 0;
  private rocketsFired = 0;
  private auxiliaryAmmoConsumed: Readonly<Record<string, number>> = {};
  private pointerFollowLock = false;
  private endStatusKey: TranslationKey | null = null;
  private debugInvincible = false;
  private threatLevel = 1;

  constructor(
    private readonly onRunComplete: (result: CombatRunResult) => void = () => {},
    private readonly getEquippedPrimaryWeaponIds: () => readonly (string | null)[] = () => [
      STANDARD_WEAPON_ID,
      null,
    ],
    private readonly getAvailableCredits: () => number = () => 0,
    private readonly getManufacturedWeaponUpgradeIds: () => readonly string[] = () => [],
    private readonly getSortiesCompleted: () => number = () => 0,
    private readonly getAircraftStats: () => Readonly<AircraftCombatStats> = () => ({
      armour: DEFAULT_PLAYER_ARMOUR,
      speedMultiplier: 1,
      damageMultiplier: 1,
      fireRateMultiplier: 1,
      projectileSpeedMultiplier: 1,
    }),
    private readonly getActiveAircraftId: () => string | null = () => null,
    private readonly getRocketStock: () => number = () => 0,
    private readonly getEquippedHardpointItemIds: () => readonly (string | null)[] = () => [],
    private readonly getAmmunitionStock: (ammunitionId: string) => number = () => 0,
    private readonly getLocale: () => Locale = () => 'uk',
    private readonly onActiveWeaponChanged: (
      weaponId: string,
      canSwitch: boolean,
    ) => void = () => {},
    private readonly getThreatLevel: () => number = () => 1,
  ) {
    super('combat');
  }

  preload(): void {
    for (const aircraft of contentCatalog.aircraft) {
      const imageUrl = 'imageUrl' in aircraft.visual ? aircraft.visual.imageUrl : undefined;
      if (imageUrl !== undefined) {
        this.load.image(`ship-${aircraft.id}`, imageUrl);
      }
    }
  }

  create(): void {
    this.resetEncounterState();
    this.threatLevel = Math.max(1, Math.round(this.getThreatLevel()));

    const { width, height } = this.scale;
    this.rng = createSeededRng(0x5eed2026);

    this.add.rectangle(width / 2, height / 2, width, height, 0x05080d);
    this.createStarfield(width, height);

    const aircraftId = this.getActiveAircraftId();
    const visual = this.activeAircraftVisual();
    const shipTexture = aircraftId === null || visual.imageUrl === undefined
      ? null
      : `ship-${aircraftId}`;
    if (shipTexture !== null && this.textures.exists(shipTexture)) {
      this.player = this.add
        .image(width / 2, height * 0.78, shipTexture)
        .setDisplaySize(48, 54);
    } else {
      this.player = this.add.graphics();
      this.player.setPosition(width / 2, height * 0.78);
      this.drawPlayerShip();
    }
    this.playerArmourBarBackground = this.add
      .rectangle(
        this.player.x,
        this.player.y + ARMOUR_BAR_OFFSET_Y,
        ARMOUR_BAR_WIDTH,
        ARMOUR_BAR_HEIGHT,
        0x05080d,
        0.5,
      )
      .setStrokeStyle(1, 0xb7d9d2, 0.5);
    this.playerArmourBarFill = this.add
      .rectangle(
        this.player.x - ARMOUR_BAR_WIDTH / 2,
        this.player.y + ARMOUR_BAR_OFFSET_Y,
        ARMOUR_BAR_WIDTH,
        ARMOUR_BAR_HEIGHT - 2,
        0x70d6b3,
        0.5,
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
    this.armourText = this.createHudText(20, 18, this.t('combat.armour', { value: '100' }));
    this.reserveText = this.createHudText(width - 20, 18, '').setOrigin(1, 0);
    this.timeText = this.createHudText(width / 2, 18, '03:00').setOrigin(0.5, 0);
    this.statusText = this.add
      .text(
        width / 2,
        height - 28,
        this.t(this.isRocketPodEquipped() ? 'combat.controlsRockets' : 'combat.controls'),
        {
          color: '#6f8792',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          fontSize: '11px',
        },
      )
      .setOrigin(0.5);

    if (this.isRocketPodEquipped()) {
      this.rocketsText = this.createHudText(
        20,
        66,
        this.t('combat.rockets', { value: String(this.rocketCharges) }),
      );
      this.input.keyboard?.on('keydown-SPACE', () => this.tryFireRocket());
      // Right-click fires a rocket; the left button is reserved for movement.
      this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        if (pointer.rightButtonDown()) {
          this.tryFireRocket();
        }
      });
      this.input.keyboard?.on('keydown-F', () => this.togglePointerFollow());
    }
    if (this.isStunModuleEquipped()) {
      this.input.keyboard?.on('keydown-SPACE', () => this.tryFireStun());
      this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        if (pointer.rightButtonDown()) {
          this.tryFireStun();
        }
      });
    }
    if (this.isDroneSwarmEquipped()) {
      this.input.keyboard?.on('keydown-SPACE', () => this.tryFireDrone());
      this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        if (pointer.rightButtonDown()) {
          this.tryFireDrone();
        }
      });
    }
    if (AUX_MISSILE_IDS.some((auxId) => this.equippedHardpointItemIds.includes(auxId))) {
      this.input.keyboard?.on('keydown-SPACE', () => this.tryFireMissileAuxiliary());
      this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        if (pointer.rightButtonDown()) {
          this.tryFireMissileAuxiliary();
        }
      });
    }
    if (this.equippedHardpointItemIds.includes(AUX_FLARE_DECOY_ID)) {
      this.input.keyboard?.on('keydown-SPACE', () => this.tryFireDecoy());
      this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        if (pointer.rightButtonDown()) {
          this.tryFireDecoy();
        }
      });
    }
    if (this.equippedHardpointItemIds.includes(AUX_MINE_ID)) {
      this.input.keyboard?.on('keydown-SPACE', () => this.tryFireMine());
      this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        if (pointer.rightButtonDown()) {
          this.tryFireMine();
        }
      });
    }
  }

  public setPointerFollowLock(locked: boolean): void {
    this.pointerFollowLock = locked;
  }

  public getPointerFollowLock(): boolean {
    return this.pointerFollowLock;
  }

  private togglePointerFollow(): void {
    this.pointerFollowLock = !this.pointerFollowLock;
  }

  private playerCollisionBounds(): Phaser.Geom.Rectangle {
    return new Phaser.Geom.Rectangle(
      this.player.x - PLAYER_COLLISION_HALF_SIZE,
      this.player.y - PLAYER_COLLISION_HALF_SIZE,
      PLAYER_COLLISION_HALF_SIZE * 2,
      PLAYER_COLLISION_HALF_SIZE * 2,
    );
  }

  private activeAircraftVisual(): AircraftDefinition['visual'] {
    const activeAircraftId = this.getActiveAircraftId();
    const definition = activeAircraftId === null
      ? undefined
      : contentCatalog.aircraft.find((entry) => entry.id === activeAircraftId);
    return definition?.visual ?? aircraftById(aircraftId.india)!.visual;
  }

  private drawPlayerShip(): void {
    if (!(this.player instanceof Phaser.GameObjects.Graphics)) {
      return;
    }
    const visual = this.activeAircraftVisual();
    const points: Phaser.Math.Vector2[] = [];
    for (let index = 0; index < visual.silhouette.length; index += 2) {
      points.push(
        new Phaser.Math.Vector2(
          visual.silhouette[index] ?? 0,
          visual.silhouette[index + 1] ?? 0,
        ),
      );
    }
    this.player.clear();
    this.player.fillStyle(visual.hullColor, 1);
    this.player.fillPoints(points, true);
    // Canopy inset, matching the hangar model.
    const centroid = silhouetteCentroid(visual.silhouette);
    const canopy: Phaser.Math.Vector2[] = points.map((point) =>
      new Phaser.Math.Vector2(
        centroid.x + (point.x - centroid.x) * 0.42,
        centroid.y + (point.y - centroid.y) * 0.42,
      ),
    );
    this.player.fillStyle(visual.accentColor, 0.55);
    this.player.fillPoints(canopy, true);
    this.player.fillStyle(visual.accentColor, 1);
    this.player.fillCircle(0, -4, 3);
  }

  private resetEncounterState(): void {
    this.shots.length = 0;
    this.homingMissiles.length = 0;
    this.decoy = null;
    this.enemies.length = 0;
    this.stars.length = 0;
    const stats = this.getAircraftStats();
    this.maxArmour = Math.max(1, Math.round(stats.armour));
    this.armour = this.maxArmour;
    this.aircraftSpeed = PLAYER_BASE_SPEED * stats.speedMultiplier;
    this.aircraftDamageMultiplier = stats.damageMultiplier;
    this.aircraftFireRateMultiplier = stats.fireRateMultiplier;
    this.aircraftProjectileSpeedMultiplier = stats.projectileSpeedMultiplier;
    this.score = 0;
    this.startingCredits = this.getAvailableCredits();
    this.contractLedger = EMPTY_SORTIE_CONTRACT;
    this.nextEnemyActorId = 1;
    this.nextVolleyId = 1;
    this.rockets.length = 0;
    this.drones.length = 0;
    this.mines.length = 0;
    this.rocketsFired = 0;
    const chargesPerSortie = this.getRocketChargesPerSortie();
    this.rocketCharges = this.isRocketPodEquipped()
      ? Math.min(chargesPerSortie, Math.max(0, this.getRocketStockValue()))
      : 0;
    this.auxiliaryAmmoConsumed = {};
    this.elapsedMs = 0;
    this.fireCooldownMs = 0;
    this.spawnCooldownMs = 400;
    this.escapeElapsedMs = 0;
    this.eliteElapsedMs = 0;
    this.invulnerableMs = 0;
    this.ended = false;
    this.eliteSpawned = false;
    this.completionPublished = false;
    this.ending = null;
    this.bossWarningElapsedMs = null;
    this.artifactRevealElapsedMs = null;
    this.equippedPrimaryWeaponIds = this.getEquippedPrimaryWeaponIds();
    this.activePrimaryWeaponSlot = this.equippedPrimaryWeaponIds[0] === null ? 1 : 0;
    this.equippedHardpointItemIds = this.getEquippedHardpointItemIds();
    this.eliteStunned = false;
    this.manufacturedWeaponUpgradeIds = this.getManufacturedWeaponUpgradeIds();
    this.runState = createRiskExtractionState();
    this.publishActiveWeapon();
    this.statusKey = 'combat.controls';
    this.statusParams = {};
    this.controlsHintVisible = true;
    this.endStatusKey = null;
    this.pauseState = EMPTY_PAUSE_STATE;
    this.tweens.resumeAll();
    this.decisionLayer?.destroy(true);
    this.decisionLayer = null;
    this.pauseLayer?.destroy(true);
    this.pauseLayer = null;
    this.bossWarningLayer?.destroy(true);
    this.bossWarningLayer = null;
    this.endingText?.destroy();
    this.endingText = null;
  }

  override update(_time: number, delta: number): void {
    if (this.ended) {
      return;
    }

    if (isPaused(this.pauseState)) {
      return;
    }

    const frameMs = Math.min(delta, 50);

    if (this.ending !== null) {
      this.updateEnding(frameMs);
      return;
    }

    if (this.artifactRevealElapsedMs !== null) {
      this.artifactRevealElapsedMs += frameMs;
      this.updateStarfield(frameMs);
      this.updateHud();
      if (this.artifactRevealElapsedMs >= ARTIFACT_REVEAL_DELAY_MS) {
        this.artifactRevealElapsedMs = null;
        this.presentTechnologySignal();
      }
      return;
    }

    if (this.bossWarningElapsedMs !== null) {
      this.bossWarningElapsedMs += frameMs;
      this.updateStarfield(frameMs);
      this.updateHud();
      if (this.bossWarningElapsedMs >= BOSS_WARNING_DURATION_MS) {
        this.finishBossIntro();
      }
      return;
    }

    if (this.runState.phase === 'technology-choice') {
      return;
    }

    if (this.runState.phase === 'extraction-choice') {
      return;
    }

    this.elapsedMs += frameMs;
    if (this.runState.phase === 'escape') {
      this.escapeElapsedMs += frameMs;
    }
    if (this.runState.phase === 'elite' && this.eliteSpawned) {
      this.eliteElapsedMs += frameMs;
    }
    this.fireCooldownMs -= frameMs;
    this.spawnCooldownMs -= frameMs;
    this.invulnerableMs = Math.max(0, this.invulnerableMs - frameMs);
    if (
      this.controlsHintVisible &&
      (this.elapsedMs > CONTROLS_HINT_DURATION_MS || this.isMovementInputActive())
    ) {
      this.controlsHintVisible = false;
      if (this.statusKey === 'combat.controls') {
        this.statusText.setText('');
      }
    }

    this.updatePlayer(frameMs);
    this.updateStarfield(frameMs);
    this.updateShots(frameMs);
    this.updateEnemies(frameMs);
    this.updateHostileShots(frameMs);
    this.updateHomingMissiles(frameMs);
    this.updateDecoys(frameMs);
    this.updateRockets(frameMs);
    this.updateDrones(frameMs);
    this.updateMines(frameMs);
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
      this.beginBossIntro();
      return;
    }

    if (this.fireCooldownMs <= 0) {
      const weapon = this.currentWeapon();
      if (weapon.shotsPerSecond > 0) {
        this.fire(weapon);
        this.fireCooldownMs += 1000 / (weapon.shotsPerSecond * this.aircraftFireRateMultiplier);
      } else {
        this.fireCooldownMs = 1000;
      }
    }

    const canSpawnRegularEnemy = (
      this.runState.phase === 'escape' ||
      (
        this.runState.phase === 'combat' &&
        this.elapsedMs < EXTRACTION_WINDOW_MS - PRE_EXTRACTION_CLEARANCE_MS
      )
    );
    if (canSpawnRegularEnemy && this.spawnCooldownMs <= 0) {
      this.spawnEnemy();
      const pressure = Math.min(500, this.elapsedMs / 180);
      // The first two months spawn fewer hostiles so the starting fleet can
      // establish itself (month 1 ≈28% fewer, month 2 ≈23% fewer).
      const month = Math.floor(this.getSortiesCompleted() / MONTH_SORTIE_LENGTH) + 1;
      const spawnRamp = month === 1 ? 1.4 : month === 2 ? 1.3 : 1;
      this.spawnCooldownMs = Math.max(
        360,
        Math.round((920 - pressure - (this.threatLevel - 1) * 70) * spawnRamp) +
          this.rng.integer(0, 280),
      );
    }

    this.updateHud();

    if (this.runState.phase === 'escape' && this.escapeElapsedMs >= ESCAPE_DURATION_MS) {
      this.runState = completeEscape(this.runState);
      this.beginEnding(true, 'combat.artifactSecured');
      return;
    }

    if (this.runState.phase === 'elite' && this.eliteElapsedMs >= ELITE_DURATION_MS) {
      this.runState = forceExtraction(this.runState);
      this.beginEnding(true, 'combat.forcedExtraction');
    }
  }

  private presentTechnologySignal(): void {
    const technology = alienTechnologyById(alienTechnologyId.prism)!;
    this.showDecision(
      this.t('combat.artifactTitle'),
      [
        this.t('combat.signalDetails', {
          glyphs: technology.signalGlyphs,
          category: this.t('content.categoryOffence'),
        }),
        this.t('combat.riskDetails', {
          reliability: technology.reliability,
          danger: technology.danger,
        }),
        this.t('combat.effectsUnknown'),
      ],
      [
        { label: this.t('combat.installOption'), action: () => this.chooseTechnology('install') },
        { label: this.t('combat.preserveOption'), action: () => this.chooseTechnology('preserve') },
      ],
    );
  }

  private chooseTechnology(decision: TechnologyDecision): void {
    if (this.runState.phase !== 'technology-choice') {
      return;
    }
    const technology = alienTechnologyById(alienTechnologyId.prism)!;
    this.runState = decideTechnology(this.runState, technology, decision);
    this.publishActiveWeapon();
    this.closeDecision();
    this.setStatus(decision === 'install' ? 'combat.escapeInstall' : 'combat.escapePreserve');
    this.escapeElapsedMs = 0;
    this.spawnCooldownMs = 250;
  }

  private presentExtractionWindow(): void {
    const signalPresent = this.getSortiesCompleted() >= 1;
    if (this.runState.phase === 'combat') {
      this.runState = offerExtraction(this.runState);
      if (signalPresent) {
        this.runState = recordWardenSignal(this.runState);
      }
      this.clearRegularEnemies();
      this.clearShots();
      this.clearHostileShots();
    }
    if (!signalPresent) {
      this.showDecision(
        this.t('combat.extractionTitle'),
        [
          this.t('combat.haulDetails', {
            salvage: this.runState.materialsFound,
            research: this.runState.researchFound,
          }),
          this.t('combat.extractionNoSignal'),
        ],
        [
          { label: this.t('combat.extractOption'), action: () => this.chooseExtraction('extract') },
        ],
      );
      return;
    }
    this.showDecision(
      this.t('combat.extractionTitle'),
      [
        this.t('combat.haulDetails', {
          salvage: this.runState.materialsFound,
          research: this.runState.researchFound,
        }),
        this.t('combat.extractionPrompt'),
      ],
      [
        { label: this.t('combat.extractOption'), action: () => this.chooseExtraction('extract') },
        {
          label: this.t('combat.interceptOption'),
          action: () => this.chooseExtraction('continue'),
        },
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
      this.beginEnding(true, 'combat.safeExtraction');
      return;
    }
    this.beginBossIntro();
  }

  private beginBossIntro(): void {
    if (this.eliteSpawned || this.bossWarningElapsedMs !== null) {
      return;
    }
    this.clearRegularEnemies();
    this.clearShots();
    this.clearHostileShots();
    this.bossWarningElapsedMs = 0;
    this.setStatus('combat.wardenApproach');
    this.renderBossWarning();
  }

  private finishBossIntro(): void {
    this.bossWarningElapsedMs = null;
    this.bossWarningLayer?.destroy(true);
    this.bossWarningLayer = null;
    this.setStatus('combat.wardenFight');
    this.spawnElite();
  }

  private renderBossWarning(): void {
    this.bossWarningLayer?.destroy(true);
    const { width, height } = this.scale;
    const line = this.add.rectangle(width / 2, height / 2, width, 86, 0x310f19, 0.88);
    const warning = this.add.text(width / 2, height / 2, this.t('combat.wardenWarning'), {
      align: 'center',
      color: '#f39aaa',
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
      fontSize: '22px',
      fontStyle: 'bold',
      letterSpacing: 3,
    }).setOrigin(0.5);
    this.bossWarningLayer = this.add.container(0, 0, [line, warning]).setDepth(25);
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
      fixedWidth: width - 112,
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
      fontSize: '13px',
      lineSpacing: 8,
      wordWrap: { width: width - 128, useAdvancedWrap: true },
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

  public setPauseReason(reason: PauseReason, active: boolean): void {
    const nextState = updatePauseReason(this.pauseState, reason, active);
    if (nextState === this.pauseState) {
      return;
    }
    this.pauseState = nextState;
    if (isPaused(this.pauseState)) {
      this.tweens.pauseAll();
      this.renderPauseLayer();
    } else {
      this.pauseLayer?.destroy(true);
      this.pauseLayer = null;
      this.tweens.resumeAll();
    }
  }

  public toggleManualPause(): void {
    if (this.ended || this.ending !== null) {
      return;
    }
    this.setPauseReason('manual', !this.pauseState.reasons.includes('manual'));
  }

  public handleActionKey(code: 'Digit1' | 'Digit2' | 'KeyE' | 'KeyC'): void {
    if (this.ended || this.ending !== null || isPaused(this.pauseState)) {
      return;
    }
    if (this.runState.phase === 'technology-choice') {
      if (code === 'Digit1') {
        this.chooseTechnology('install');
      } else if (code === 'Digit2') {
        this.chooseTechnology('preserve');
      }
      return;
    }
    if (this.runState.phase === 'extraction-choice') {
      if (code === 'KeyE') {
        this.chooseExtraction('extract');
      } else if (code === 'KeyC') {
        this.chooseExtraction('continue');
      }
    }
  }

  public switchPrimaryWeapon(): void {
    if (
      this.ended ||
      this.ending !== null ||
      isPaused(this.pauseState) ||
      this.runState.technologyDecision === 'install' ||
      !this.canSwitchPrimaryWeapon()
    ) {
      return;
    }
    const count = this.equippedPrimaryWeaponIds.length;
    for (let step = 1; step <= count; step += 1) {
      const nextIndex = (this.activePrimaryWeaponSlot + step) % count;
      const weaponId = this.equippedPrimaryWeaponIds[nextIndex];
      if (weaponId !== null) {
        this.activePrimaryWeaponSlot = nextIndex;
        this.publishActiveWeapon();
        return;
      }
    }
  }

  private renderPauseLayer(): void {
    this.pauseLayer?.destroy(true);
    const { width, height } = this.scale;
    const blocker = this.add.rectangle(width / 2, height / 2, width, height, 0x020407, 0.72)
      .setInteractive();
    blocker.on('pointerdown', () => {
      if (this.abortArmed) {
        this.abortArmed = false;
        this.renderPauseLayer();
      }
    });
    const panel = this.add.rectangle(width / 2, height / 2, width - 112, 220, 0x091218, 0.98)
      .setStrokeStyle(1, 0x70a897, 0.8);
    const heading = this.add.text(width / 2, height / 2 - 44, this.t('combat.paused'), {
      color: '#dceff0',
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
      fontSize: '24px',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    const detailKey = this.pauseState.reasons.includes('settings')
      ? 'combat.pausedSettings'
      : 'combat.pausedManual';
    const detail = this.add.text(width / 2, height / 2 + 6, this.t(detailKey), {
      align: 'center',
      color: '#87a8b0',
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
      fontSize: '13px',
    }).setOrigin(0.5);
    const abortAvailable = this.runState.phase === 'combat';
    let warning: Phaser.GameObjects.Text | null = null;
    if (abortAvailable) {
      warning = this.add.text(
        width / 2,
        height / 2 + 88,
        this.t(this.abortArmed ? 'combat.abortWarning' : 'combat.abortHint'),
        {
          align: 'center',
          color: this.abortArmed ? '#ffd7dd' : '#87a8b0',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          fontSize: '11px',
          wordWrap: { width: width - 150 },
        },
      ).setOrigin(0.5, 0);
    }
    const abortButton = this.add.text(
      width / 2,
      height / 2 + 64,
      this.t(this.abortArmed ? 'combat.confirmAbort' : 'combat.abort'),
      {
        align: 'center',
        color: this.abortArmed ? '#ffd7dd' : '#d78795',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        fontSize: '13px',
        fontStyle: 'bold',
      },
    ).setOrigin(0.5);
    if (abortAvailable) {
      abortButton.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
        if (!this.abortArmed) {
          this.abortArmed = true;
          this.renderPauseLayer();
          return;
        }
        this.abortArmed = false;
        this.abortSortie();
      });
    } else {
      abortButton.setAlpha(0.4);
    }
    const panelHeight = warning === null ? 220 : 268;
    panel.setSize(width - 112, panelHeight);
    this.pauseLayer = this.add.container(
      0,
      0,
      [blocker, panel, heading, detail, abortButton],
    ).setDepth(50);
    if (warning !== null) {
      this.pauseLayer.add(warning);
    }
  }

  public abortSortie(): void {
    if (this.ended || this.ending !== null || this.runState.phase !== 'combat') {
      return;
    }
    this.runState = abortRun(this.runState);
    this.setPauseReason('manual', false);
    this.beginEnding(true, 'combat.aborted');
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
    }).setDepth(15);
  }

  private isMovementInputActive(): boolean {
    return (
      this.cursors.up.isDown ||
      this.cursors.down.isDown ||
      this.cursors.left.isDown ||
      this.cursors.right.isDown ||
      this.movementKeys.up.isDown ||
      this.movementKeys.down.isDown ||
      this.movementKeys.left.isDown ||
      this.movementKeys.right.isDown ||
      this.input.activePointer.isDown
    );
  }

  private updatePlayer(deltaMs: number): void {
    const horizontal = Number(this.cursors.right.isDown || this.movementKeys.right.isDown) -
      Number(this.cursors.left.isDown || this.movementKeys.left.isDown);
    const vertical = Number(this.cursors.down.isDown || this.movementKeys.down.isDown) -
      Number(this.cursors.up.isDown || this.movementKeys.up.isDown);
    const length = Math.hypot(horizontal, vertical) || 1;
    const distance = this.aircraftSpeed * (deltaMs / 1000);

    this.player.x += (horizontal / length) * distance;
    this.player.y += (vertical / length) * distance;

    const pointer = this.input.activePointer;
    const pointerInBounds = pointer.x >= 0 &&
      pointer.x <= this.scale.width &&
      pointer.y >= 0 &&
      pointer.y <= this.scale.height;
    const followPointer = this.pointerFollowLock
      ? pointerInBounds
      : pointer.isDown;
    if (followPointer) {
      const dx = pointer.x - this.player.x;
      const dy = pointer.y - this.player.y;
      const pointerDistance = Math.hypot(dx, dy);
      if (pointerDistance > 1) {
        const step = Math.min(
          this.aircraftSpeed * (deltaMs / 1000),
          pointerDistance,
        );
        this.player.x += (dx / pointerDistance) * step;
        this.player.y += (dy / pointerDistance) * step;
      }
    }

    this.player.x = Phaser.Math.Clamp(this.player.x, PLAYER_MARGIN, this.scale.width - PLAYER_MARGIN);
    this.player.y = Phaser.Math.Clamp(this.player.y, 90, this.scale.height - 58);
    this.player.setAlpha(this.invulnerableMs > 0 && Math.floor(this.invulnerableMs / 80) % 2 === 0 ? 0.3 : 1);
  }

  private updatePlayerArmourBar(): void {
    const armourRatio = Phaser.Math.Clamp(this.armour / this.maxArmour, 0, 1);
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

  private currentWeapon(): WeaponDefinition {
    const activeWeaponId = this.runState.technologyDecision === 'install'
      ? SPLIT_PULSE_MODULE_ID
      : this.activePrimaryWeaponId();
    const weapon = contentCatalog.weapons.find((entry) => entry.id === activeWeaponId) ??
      resolveWeaponFamilyItem(activeWeaponId) ??
      weaponById(weaponId.pulseCannon)!;
    return applyWeaponUpgrades(
      weapon,
      this.manufacturedWeaponUpgradeIds,
      contentCatalog.weaponUpgrades,
    );
  }

  private activePrimaryWeaponId(): string {
    return this.equippedPrimaryWeaponIds[this.activePrimaryWeaponSlot] ?? STANDARD_WEAPON_ID;
  }

  private canSwitchPrimaryWeapon(): boolean {
    return this.equippedPrimaryWeaponIds.filter(
      (weaponId) => weaponId !== null,
    ).length >= 2;
  }

  private publishActiveWeapon(): void {
    this.onActiveWeaponChanged(
      this.runState.technologyDecision === 'install'
        ? SPLIT_PULSE_MODULE_ID
        : this.activePrimaryWeaponId(),
      this.canSwitchPrimaryWeapon() && this.runState.technologyDecision !== 'install',
    );
  }

  private fire(weapon: WeaponDefinition): void {
    const canister = weapon.visualProfile === 'canister-cannon';
    const alienOrb = weapon.visualProfile === 'alien-orb';
    const alienSingularity = weapon.visualProfile === 'alien-singularity';
    const projectileSpeed = weapon.projectileSpeed * this.aircraftProjectileSpeedMultiplier;
    const dimensions = weapon.visualProfile === 'impulse-accelerator'
      ? { width: 9, height: 30 }
      : weapon.visualProfile === 'split-pulse'
        ? { width: 5, height: 18 }
        : weapon.visualProfile === 'alien-lance'
          ? { width: 3, height: 40 }
          : alienOrb
            ? { width: 10, height: 10 }
            : alienSingularity
              ? { width: 14, height: 14 }
              : canister
                ? { width: 4, height: 4 }
                : { width: 3, height: 16 };
    const colour = weapon.visualProfile === 'split-pulse'
      ? 0xc5a3ff
      : weapon.visualProfile === 'impulse-accelerator' ? 0xffc15c
        : weapon.visualProfile === 'alien-lance' ? 0x9df5ff
          : alienOrb ? 0x6bffd0
            : alienSingularity ? 0xc07bff
              : canister ? 0xffb46a : 0xffd98a;
    const volleyId = canister ? this.nextVolleyId : null;
    if (canister) {
      this.nextVolleyId += 1;
    }
    for (let index = 0; index < weapon.projectileCount; index += 1) {
      const offset = (index - (weapon.projectileCount - 1) / 2) * weapon.spread;
      const vx = canister ? offset * (projectileSpeed / 210) : 0;
      const body = this.add.rectangle(
        this.player.x + offset,
        this.player.y - 22,
        dimensions.width,
        dimensions.height,
        colour,
      );
      if (
        weapon.visualProfile === 'impulse-accelerator' ||
        weapon.visualProfile === 'alien-lance' ||
        weapon.visualProfile === 'alien-orb' ||
        weapon.visualProfile === 'alien-singularity'
      ) {
        body.setStrokeStyle(2, 0xffffff, 0.85);
      }
      this.shots.push({
        body,
        damage: weapon.damage * this.aircraftDamageMultiplier,
        projectileSpeed,
        penetratesAllTargets: weapon.penetration === 'all-targets',
        hitEnemyIds: new Set<number>(),
        visualProfile: weapon.visualProfile,
        vx,
        lifetimeMs: canister ? 340 : null,
        knockbackVolleyId: volleyId,
        knockbackImpulse: canister ? 26 : 0,
      });
    }
    this.createMuzzleFlash(weapon.visualProfile, colour);
  }

  private updateShots(deltaMs: number): void {
    for (let index = this.shots.length - 1; index >= 0; index -= 1) {
      const shot = this.shots[index];
      if (shot === undefined) {
        continue;
      }
      shot.body.x += shot.vx * (deltaMs / 1000);
      shot.body.y -= shot.projectileSpeed * (deltaMs / 1000);
      if (shot.lifetimeMs !== null) {
        shot.lifetimeMs -= deltaMs;
        if (shot.lifetimeMs <= 0) {
          shot.body.destroy();
          this.shots.splice(index, 1);
          continue;
        }
      }
      if (shot.body.y < -24) {
        shot.body.destroy();
        this.shots.splice(index, 1);
      }
    }
  }

  private spawnEnemy(definition?: EnemyDefinition): void {
    const selectedDefinition = definition ?? this.pickRegularEnemy();
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
    const armourBarBackground = isElite
      ? this.add.rectangle(this.scale.width / 2, 94, 262, 8, 0x05080d, 0.9)
        .setStrokeStyle(1, 0xc6a2e4, 0.72)
        .setDepth(12)
      : null;
    const armourBarFill = isElite
      ? this.add.rectangle(this.scale.width / 2 - 130, 94, 260, 6, 0xb67ad7)
        .setOrigin(0, 0.5)
        .setDepth(12)
      : null;

    this.enemies.push({
      actorId: this.nextEnemyActorId,
      body,
      definition: selectedDefinition,
      originX: x,
      phase: this.rng.next() * Math.PI * 2,
      armourBarBackground,
      armourBarFill,
      armour: Math.round(
        selectedDefinition.armour * (1 + (this.threatLevel - 1) * 0.25),
      ),
      livedMs: 0,
      knockbackX: 0,
      knockbackY: 0,
      nextShotAtMs: selectedDefinition.ranged === null
        ? Number.POSITIVE_INFINITY
        : 1_400 + this.rng.integer(0, 1_200),
      knockbackVolleyApplied: null,
    });
    this.nextEnemyActorId += 1;
  }

  private pickRegularEnemy(): EnemyDefinition {
    const first = contentCatalog.enemies[0];
    if (first === undefined) {
      throw new Error('No regular enemies are defined.');
    }
    const regular = contentCatalog.enemies.filter((entry) => entry.kind === 'regular');
    if (this.elapsedMs > 20_000 && this.rng.next() > 0.72) {
      return regular[2] ?? first;
    }
    if (this.elapsedMs > 12_000 && this.rng.next() > 0.58) {
      return regular[1] ?? first;
    }
    return regular[0] ?? first;
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
      const knockbackRecovery = Math.max(0, 1 - deltaMs / ELITE_KNOCKBACK_RECOVERY_MS);
      enemy.knockbackX *= knockbackRecovery;
      enemy.knockbackY *= knockbackRecovery;
      if (enemy.definition.kind === 'elite') {
        const flightY = Math.min(
          170,
          -34 + enemy.definition.speed * (enemy.livedMs / 1000),
        );
        enemy.body.y = Phaser.Math.Clamp(
          flightY + enemy.knockbackY,
          34,
          this.scale.height - 72,
        );
      } else {
        enemy.body.y += enemy.definition.speed * (deltaMs / 1000) + enemy.knockbackY;
      }

      if (enemy.definition.movementPattern === 'sine') {
        enemy.body.x = enemy.originX +
          Math.sin(enemy.livedMs / 430 + enemy.phase) * 72 +
          enemy.knockbackX;
      } else {
        enemy.body.x += enemy.knockbackX;
      }

      if (enemy.definition.kind !== 'elite') {
        this.applySoftBounce(enemy);
      }

      if (enemy.definition.ranged !== null) {
        this.updateEnemyRanged(enemy, deltaMs);
      }

      this.updateEnemyArmourBar(enemy);

      if (enemy.definition.kind !== 'elite' && enemy.body.y > this.scale.height + 40) {
        const penalty = enemy.definition.creditReward *
          contentCatalog.economy.missedEnemyPenaltyMultiplier;
        this.contractLedger = recordTargetBreached(
          this.contractLedger,
          enemy.definition.creditReward,
          contentCatalog.economy.missedEnemyPenaltyMultiplier,
        );
        this.showContractChange(enemy.body.x, this.scale.height - 52, -penalty);
        this.destroyEnemy(index);
      }
    }
  }

  private applySoftBounce(enemy: EnemyActor): void {
    const left = ENEMY_BOUND_MARGIN;
    const right = this.scale.width - ENEMY_BOUND_MARGIN;
    const top = ENEMY_BOUND_MARGIN;
    if (enemy.body.x < left) {
      enemy.body.x = left;
      enemy.knockbackX = Math.abs(enemy.knockbackX) * ENEMY_BOUNCE_DAMPING;
    } else if (enemy.body.x > right) {
      enemy.body.x = right;
      enemy.knockbackX = -Math.abs(enemy.knockbackX) * ENEMY_BOUNCE_DAMPING;
    }
    if (enemy.body.y < top) {
      enemy.body.y = top;
      enemy.knockbackY = Math.abs(enemy.knockbackY) * ENEMY_BOUNCE_DAMPING;
    }
  }

  private updateEnemyRanged(enemy: EnemyActor, deltaMs: number): void {
    const profile = enemy.definition.ranged;
    if (profile === null) {
      return;
    }
    enemy.nextShotAtMs -= deltaMs;
    if (enemy.nextShotAtMs <= 0) {
      if (profile.homing !== undefined) {
        const homing = profile.homing;
        for (let index = 0; index < homing.volleySize; index += 1) {
          this.time.delayedCall(index * homing.volleyIntervalMs, () => {
            if (enemy.body.active) {
              this.fireHomingMissile(enemy, homing);
            }
          });
        }
      } else {
        const targetX = Phaser.Math.Clamp(this.player.x, 36, this.scale.width - 36);
        const targetY = this.player.y - 18;
        const dx = targetX - enemy.body.x;
        const dy = targetY - enemy.body.y;
        const length = Math.max(1, Math.hypot(dx, dy));
        this.fireHostileShot(enemy, dx / length, dy / length);
      }
      enemy.nextShotAtMs = profile.shotIntervalMs + this.rng.integer(0, 600);
    }
  }

  private fireHomingMissile(enemy: EnemyActor, homing: EnemyHomingProfile): void {
    const angle = Math.atan2(
      this.player.y - enemy.body.y,
      this.player.x - enemy.body.x,
    );
    const body = this.add.rectangle(enemy.body.x, enemy.body.y, 8, 14, 0xff6b5a);
    body.setStrokeStyle(1, 0xffe0c0, 0.8);
    this.homingMissiles.push({
      body,
      speed: homing.shotSpeed,
      turnRateRad: (homing.turnRateDegPerSec * Math.PI) / 180,
      damage: homing.shotDamage,
      lifetimeMs: homing.lifetimeMs,
      angle,
      elapsedMs: 0,
    });
  }

  private updateHomingMissiles(deltaMs: number): void {
    for (let index = this.homingMissiles.length - 1; index >= 0; index -= 1) {
      const missile = this.homingMissiles[index];
      if (missile === undefined) {
        continue;
      }
      missile.elapsedMs += deltaMs;
      if (missile.elapsedMs > missile.lifetimeMs) {
        missile.body.destroy();
        this.homingMissiles.splice(index, 1);
        continue;
      }
      const decoy = this.decoy;
      const decoyActive = decoy !== null &&
        Math.hypot(decoy.body.x - missile.body.x, decoy.body.y - missile.body.y) <=
          decoy.attractionRadius;
      const targetX = decoyActive ? decoy!.body.x : this.player.x;
      const targetY = decoyActive ? decoy!.body.y : this.player.y;
      const desired = Math.atan2(targetY - missile.body.y, targetX - missile.body.x);
      let delta = desired - missile.angle;
      while (delta > Math.PI) {
        delta -= Math.PI * 2;
      }
      while (delta < -Math.PI) {
        delta += Math.PI * 2;
      }
      const maxTurn = missile.turnRateRad * (deltaMs / 1000);
      missile.angle += Phaser.Math.Clamp(delta, -maxTurn, maxTurn);
      const step = missile.speed * (deltaMs / 1000);
      missile.body.x += Math.cos(missile.angle) * step;
      missile.body.y += Math.sin(missile.angle) * step;
      if (
        decoyActive &&
        Phaser.Geom.Intersects.RectangleToRectangle(
          missile.body.getBounds(),
          decoy!.body.getBounds(),
        )
      ) {
        missile.body.destroy();
        this.homingMissiles.splice(index, 1);
        this.createDestructionBurst(missile.body.x, missile.body.y, 0xffc15c);
        continue;
      }
      const hitPlayer =
        this.invulnerableMs <= 0 &&
        Phaser.Geom.Intersects.RectangleToRectangle(
          this.playerCollisionBounds(),
          missile.body.getBounds(),
        );
      if (hitPlayer) {
        const impactX = missile.body.x;
        const impactY = missile.body.y;
        missile.body.destroy();
        this.homingMissiles.splice(index, 1);
        if (!this.debugInvincible) {
          this.armour = Math.max(0, this.armour - missile.damage);
        }
        this.invulnerableMs = 700;
        this.createContactBurst(impactX, impactY);
        this.cameras.main.shake(70, 0.004);
        if (this.armour === 0) {
          this.beginEnding(false, 'combat.shipLost');
          return;
        }
        continue;
      }
      if (
        missile.body.y > this.scale.height + 20 ||
        missile.body.y < -40 ||
        missile.body.x < -40 ||
        missile.body.x > this.scale.width + 40
      ) {
        missile.body.destroy();
        this.homingMissiles.splice(index, 1);
      }
    }
  }

  private fireHostileShot(enemy: EnemyActor, unitX: number, unitY: number): void {
    const profile = enemy.definition.ranged;
    if (profile === null) {
      return;
    }
    const body = this.add.rectangle(enemy.body.x, enemy.body.y, 7, 7, 0xff5a4f);
    body.setStrokeStyle(1, 0xffd1c6, 0.8);
    this.hostileShots.push({
      body,
      damage: profile.shotDamage,
      vx: unitX * profile.shotSpeed,
      vy: unitY * profile.shotSpeed,
    });
  }

  private updateHostileShots(deltaMs: number): void {
    for (let index = this.hostileShots.length - 1; index >= 0; index -= 1) {
      const shot = this.hostileShots[index];
      if (shot === undefined) {
        continue;
      }
      shot.body.x += shot.vx * (deltaMs / 1000);
      shot.body.y += shot.vy * (deltaMs / 1000);
      const hitPlayer =
        this.invulnerableMs <= 0 &&
        Phaser.Geom.Intersects.RectangleToRectangle(
          this.playerCollisionBounds(),
          shot.body.getBounds(),
        );
      if (hitPlayer) {
        const impactX = shot.body.x;
        const impactY = shot.body.y;
        shot.body.destroy();
        this.hostileShots.splice(index, 1);
        if (!this.debugInvincible) {
          this.armour = Math.max(0, this.armour - shot.damage);
        }
        this.invulnerableMs = 700;
        this.createContactBurst(impactX, impactY);
        this.cameras.main.shake(70, 0.004);
        if (this.armour === 0) {
          this.beginEnding(false, 'combat.shipLost');
          return;
        }
        continue;
      }
      if (
        shot.body.y > this.scale.height + 20 ||
        shot.body.y < -40 ||
        shot.body.x < -40 ||
        shot.body.x > this.scale.width + 40
      ) {
        shot.body.destroy();
        this.hostileShots.splice(index, 1);
      }
    }
  }

  private clearHostileShots(): void {
    for (const shot of this.hostileShots) {
      shot.body.destroy();
    }
    this.hostileShots.length = 0;
  }

  private tryFireRocket(): void {
    if (
      this.ended ||
      isPaused(this.pauseState) ||
      this.rocketCharges <= 0 ||
      this.runState.phase === 'technology-choice' ||
      this.runState.phase === 'extraction-choice'
    ) {
      return;
    }
    const elite = this.enemies.find((enemy) => enemy.definition.kind === 'elite');
    const target = elite ?? this.acquireRocketTarget();
    if (target === undefined) {
      return;
    }
    this.rocketCharges -= 1;
    if (this.isAuxRocketPodEquipped()) {
      const ammoId = this.auxRocketAmmunitionId();
      if (ammoId !== null) {
        this.auxiliaryAmmoConsumed = {
          ...this.auxiliaryAmmoConsumed,
          [ammoId]: (this.auxiliaryAmmoConsumed[ammoId] ?? 0) + 1,
        };
      }
    } else {
      this.rocketsFired += 1;
    }
    const body = this.add.rectangle(this.player.x, this.player.y - 28, 6, 16, 0xffd98a);
    body.setStrokeStyle(1, 0xfff0b0, 0.85);
    const aux = this.isAuxRocketPodEquipped()
      ? auxiliaryById(AUX_ROCKET_POD_ID)
      : undefined;
    const damage = aux?.damage ?? ROCKET_DAMAGE;
    const areaRadius = aux?.areaRadius ??
      Math.max(this.scale.width, this.scale.height) * ROCKET_BLAST_RADIUS_FRACTION;
    this.rockets.push({
      body,
      targetId: target.actorId,
      damage,
      speed: ROCKET_SPEED,
      targetX: target.body.x,
      targetY: target.body.y,
      areaRadius,
      elapsedMs: 0,
    });
    this.updateRocketHud();
    this.cameras.main.shake(60, 0.003);
  }

  private tryFireMissileAuxiliary(): void {
    if (
      this.ended ||
      isPaused(this.pauseState) ||
      this.runState.phase === 'technology-choice' ||
      this.runState.phase === 'extraction-choice'
    ) {
      return;
    }
    const elite = this.enemies.find((enemy) => enemy.definition.kind === 'elite');
    const target = elite ?? this.acquireRocketTarget();
    if (target === undefined) {
      return;
    }
    for (const auxId of AUX_MISSILE_IDS) {
      const aux = auxiliaryById(auxId);
      if (aux === undefined || !this.equippedHardpointItemIds.includes(auxId)) {
        continue;
      }
      const ammoId = aux.ammoConsumableId;
      if (ammoId === null) {
        continue;
      }
      const fired = this.auxiliaryAmmoConsumed[ammoId] ?? 0;
      if (this.getAmmunitionStock(ammoId) <= fired) {
        continue;
      }
      const body = this.add.rectangle(this.player.x, this.player.y - 28, 6, 16, 0xffd98a);
      body.setStrokeStyle(1, 0xfff0b0, 0.85);
      this.rockets.push({
        body,
        targetId: target.actorId,
        damage: aux.damage,
        speed: ROCKET_SPEED,
        targetX: target.body.x,
        targetY: target.body.y,
        areaRadius: aux.areaRadius,
        elapsedMs: 0,
      });
      this.auxiliaryAmmoConsumed = {
        ...this.auxiliaryAmmoConsumed,
        [ammoId]: fired + 1,
      };
      this.cameras.main.shake(60, 0.003);
      return;
    }
  }

  private isRocketPodEquipped(): boolean {
    const rocketPod = contentCatalog.weapons.find(
      (weapon) => weapon.visualProfile === 'rocket-pod',
    );
    return (rocketPod !== undefined &&
      this.equippedPrimaryWeaponIds.includes(rocketPod.id)) ||
      this.isAuxRocketPodEquipped();
  }

  private isAuxRocketPodEquipped(): boolean {
    return this.equippedHardpointItemIds.includes(AUX_ROCKET_POD_ID);
  }

  private auxRocketAmmunitionId(): string | null {
    return auxiliaryById(AUX_ROCKET_POD_ID)?.ammoConsumableId ?? null;
  }

  private getRocketStockValue(): number {
    const ammoId = this.auxRocketAmmunitionId();
    return ammoId !== null && this.isAuxRocketPodEquipped()
      ? this.getAmmunitionStock(ammoId)
      : this.getRocketStock();
  }

  private getRocketChargesPerSortie(): number {
    if (this.isAuxRocketPodEquipped()) {
      return Number.MAX_SAFE_INTEGER;
    }
    const loaded = contentCatalog.consumables.find(
      (entry) => entry.chargesPerSortie !== undefined,
    );
    return loaded?.chargesPerSortie ?? ROCKET_CHARGES_DEFAULT;
  }

  private acquireRocketTarget(): EnemyActor | undefined {
    let best: EnemyActor | undefined;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const enemy of this.enemies) {
      if (enemy.body.y >= this.player.y - 20) {
        continue;
      }
      const distance = Math.hypot(
        enemy.body.x - this.player.x,
        enemy.body.y - this.player.y,
      );
      if (distance < bestDistance) {
        bestDistance = distance;
        best = enemy;
      }
    }
    return best;
  }

  private updateRockets(deltaMs: number): void {
    for (let index = this.rockets.length - 1; index >= 0; index -= 1) {
      const rocket = this.rockets[index];
      if (rocket === undefined) {
        continue;
      }
      const target = this.enemies.find((enemy) => enemy.actorId === rocket.targetId);
      if (target !== undefined) {
        rocket.targetX = target.body.x;
        rocket.targetY = target.body.y;
      }
      const dx = rocket.targetX - rocket.body.x;
      const dy = rocket.targetY - rocket.body.y;
      const length = Math.max(1, Math.hypot(dx, dy));
      const step = Math.min(rocket.speed * (deltaMs / 1000), length);
      rocket.body.x += (dx / length) * step;
      rocket.body.y += (dy / length) * step;
      rocket.elapsedMs += deltaMs;

      if (
        target !== undefined &&
        Phaser.Geom.Intersects.RectangleToRectangle(
          rocket.body.getBounds(),
          target.body.getBounds(),
        )
      ) {
        this.explodeRocket(index, rocket);
        continue;
      }
      if (rocket.elapsedMs >= 2600 || rocket.body.y < -60) {
        this.explodeRocket(index, rocket);
      }
    }
  }

  private explodeRocket(
    index: number,
    rocket: RocketActor,
  ): void {
    const x = rocket.body.x;
    const y = rocket.body.y;
    rocket.body.destroy();
    this.rockets.splice(index, 1);
    this.createDestructionBurst(x, y, 0xffd98a);
    this.cameras.main.shake(140, 0.008);
    // The warhead blasts every enemy within a wide radius; the player's own
    // aircraft is never damaged by its own rockets.
    const blastRadius = rocket.areaRadius;
    for (let enemyIndex = this.enemies.length - 1; enemyIndex >= 0; enemyIndex -= 1) {
      const enemy = this.enemies[enemyIndex];
      if (enemy === undefined) {
        continue;
      }
      const distance = Math.hypot(enemy.body.x - x, enemy.body.y - y);
      if (distance > blastRadius) {
        continue;
      }
      enemy.armour -= rocket.damage;
      enemy.body.setFillStyle(0xffffff);
      this.time.delayedCall(45, () => enemy.body.active && enemy.body.setFillStyle(
        enemy.definition.kind === 'elite'
          ? 0x9368c7
          : enemy.definition.movementPattern === 'sine' ? 0xd98ba1 : 0xd6b36a,
      ));
      this.updateEnemyArmourBar(enemy);
      if (enemy.armour <= 0) {
        this.applyEnemyDefeat(enemyIndex);
      }
    }
  }

  private updateRocketHud(): void {
    if (this.rocketsText !== null) {
      this.rocketsText.setText(
        this.t('combat.rockets', { value: String(this.rocketCharges) }),
      );
    }
  }

  private applyEnemyDefeat(enemyIndex: number): void {
    const enemy = this.enemies[enemyIndex];
    if (enemy === undefined || enemy.armour > 0) {
      return;
    }
    const defeatedX = enemy.body.x;
    const defeatedY = enemy.body.y;
    this.score += enemy.definition.score;
    this.contractLedger = recordTargetDestroyed(
      this.contractLedger,
      enemy.definition.creditReward,
    );
    this.showContractChange(defeatedX, defeatedY, enemy.definition.creditReward);
    const eliteRecoveryAvailable = this.eliteStunned;
    if (enemy.definition.kind === 'elite') {
      this.runState = defeatElite(
        this.runState,
        enemy.definition.materialReward,
        eliteRecoveryAvailable,
      );
    } else {
      this.runState = addMaterials(this.runState, enemy.definition.materialReward);
    }
    this.destroyEnemy(enemyIndex);
    if (enemy.definition.kind === 'elite') {
      this.createDestructionBurst(defeatedX, defeatedY, 0xd9a7ff);
      if (eliteRecoveryAvailable) {
        this.setStatus('combat.wardenDestroyed');
        this.clearCombatActors();
        this.artifactRevealElapsedMs = 0;
      } else {
        this.beginEnding(true, 'combat.wardenDestroyedNoRecovery');
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
        if (shot.hitEnemyIds.has(enemy.actorId)) {
          continue;
        }
        if (!Phaser.Geom.Intersects.RectangleToRectangle(shot.body.getBounds(), enemy.body.getBounds())) {
          continue;
        }

        shot.hitEnemyIds.add(enemy.actorId);
        if (!shot.penetratesAllTargets) {
          shot.body.destroy();
          this.shots.splice(shotIndex, 1);
        }
        if (
          shot.knockbackVolleyId !== null &&
          enemy.knockbackVolleyApplied !== shot.knockbackVolleyId
        ) {
          enemy.knockbackVolleyApplied = shot.knockbackVolleyId;
          const direction = enemy.body.x >= this.player.x ? 1 : -1;
          enemy.knockbackX = direction * shot.knockbackImpulse;
          enemy.knockbackY = -shot.knockbackImpulse * 0.5;
        }
        enemy.armour -= shot.damage;
        this.createProjectileImpact(
          shot.body.x,
          shot.body.y,
          shot.visualProfile,
        );
        this.updateEnemyArmourBar(enemy);
        enemy.body.setFillStyle(0xffffff);
        this.time.delayedCall(45, () => enemy.body.active && enemy.body.setFillStyle(
          enemy.definition.kind === 'elite'
            ? 0x9368c7
            : enemy.definition.movementPattern === 'sine' ? 0xd98ba1 : 0xd6b36a,
        ));

        if (enemy.armour <= 0) {
          this.applyEnemyDefeat(enemyIndex);
          if (this.artifactRevealElapsedMs !== null || this.ending !== null) {
            return;
          }
        }
        break;
      }

      if (
        this.enemies[enemyIndex] === enemy &&
        this.invulnerableMs <= 0 &&
        Phaser.Geom.Intersects.RectangleToRectangle(
          this.playerCollisionBounds(),
          enemy.body.getBounds(),
        )
      ) {
        const passiveMultiplier = this.runState.technologyDecision === 'install'
          ? alienTechnologyById(alienTechnologyId.prism)!.passiveEffect.armourDamageMultiplier
          : 1;
        const contactDamage = Math.ceil(enemy.definition.contactDamage * passiveMultiplier);
        if (!this.debugInvincible) {
          this.armour = Math.max(0, this.armour - contactDamage);
        }
        this.invulnerableMs = 700;
        const contact = resolveAircraftContact(enemy.definition.kind);
        if (contact.countsAsDestroyed) {
          this.score += enemy.definition.score;
          this.runState = addMaterials(this.runState, enemy.definition.materialReward);
          this.contractLedger = recordTargetDestroyed(
            this.contractLedger,
            enemy.definition.creditReward,
          );
          this.showContractChange(enemy.body.x, enemy.body.y, enemy.definition.creditReward);
        }
        if (contact.removeEnemy) {
          this.destroyEnemy(enemyIndex);
        } else {
          this.applyEliteContactKnockback(enemy);
        }
        this.cameras.main.shake(110, 0.006);
        if (this.armour === 0) {
          this.beginEnding(false, 'combat.shipLost');
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
    enemy.armourBarBackground?.destroy();
    enemy.armourBarFill?.destroy();
    this.enemies.splice(index, 1);
  }

  private applyEliteContactKnockback(enemy: EnemyActor): void {
    const contactX = (this.player.x + enemy.body.x) / 2;
    const contactY = (this.player.y + enemy.body.y) / 2;
    const knockback = calculateMutualKnockback(
      { x: this.player.x, y: this.player.y },
      { x: enemy.body.x, y: enemy.body.y },
      PLAYER_CONTACT_KNOCKBACK,
      ELITE_CONTACT_KNOCKBACK,
    );

    this.player.x = Phaser.Math.Clamp(
      this.player.x + knockback.player.x,
      PLAYER_MARGIN,
      this.scale.width - PLAYER_MARGIN,
    );
    this.player.y = Phaser.Math.Clamp(
      this.player.y + knockback.player.y,
      PLAYER_MARGIN,
      this.scale.height - PLAYER_MARGIN,
    );
    enemy.knockbackX += knockback.enemy.x;
    enemy.knockbackY += knockback.enemy.y;
    enemy.body.x = Phaser.Math.Clamp(
      enemy.body.x + knockback.enemy.x,
      38,
      this.scale.width - 38,
    );
    enemy.body.y = Phaser.Math.Clamp(
      enemy.body.y + knockback.enemy.y,
      34,
      this.scale.height - 72,
    );
    this.updatePlayerArmourBar();
    this.createContactBurst(contactX, contactY);
  }

  private createContactBurst(x: number, y: number): void {
    const ring = this.add.circle(x, y, 12, 0xffffff, 0)
      .setStrokeStyle(3, 0xf3c6ff, 0.95)
      .setDepth(24);
    this.tweens.add({
      targets: ring,
      scale: 2.8,
      alpha: 0,
      duration: 280,
      ease: 'Cubic.Out',
      onComplete: () => ring.destroy(),
    });
  }

  private createMuzzleFlash(
    profile: WeaponDefinition['visualProfile'],
    colour: number,
  ): void {
    const heavy = profile === 'impulse-accelerator' || profile === 'canister-cannon';
    const flash = this.add.circle(
      this.player.x,
      this.player.y - 25,
      heavy ? 13 : 6,
      colour,
      heavy ? 0.95 : 0.72,
    ).setDepth(18);
    this.tweens.add({
      targets: flash,
      scale: heavy ? 2.2 : 1.6,
      alpha: 0,
      duration: heavy ? 150 : 75,
      ease: 'Cubic.Out',
      onComplete: () => flash.destroy(),
    });
    if (heavy) {
      this.cameras.main.shake(75, 0.0025);
    }
  }

  private createProjectileImpact(
    x: number,
    y: number,
    profile: WeaponDefinition['visualProfile'],
  ): void {
    const alien = profile === 'split-pulse';
    const heavy = profile === 'impulse-accelerator';
    const colour = alien ? 0xd9a7ff : heavy ? 0xffc15c : 0xffdf9a;
    const fragments = heavy ? 7 : 3;
    for (let index = 0; index < fragments; index += 1) {
      const angle = (-Math.PI * 0.85) + (Math.PI * 1.7 * index) / Math.max(1, fragments - 1);
      const spark = this.add.rectangle(x, y, heavy ? 5 : 3, 2, colour, 0.9).setDepth(20);
      this.tweens.add({
        targets: spark,
        x: x + Math.cos(angle) * (heavy ? 30 : 14),
        y: y + Math.sin(angle) * (heavy ? 30 : 14),
        alpha: 0,
        duration: heavy ? 220 : 130,
        ease: 'Cubic.Out',
        onComplete: () => spark.destroy(),
      });
    }
    if (heavy) {
      const ring = this.add.circle(x, y, 8, colour, 0)
        .setStrokeStyle(2, colour, 0.85)
        .setDepth(20);
      this.tweens.add({
        targets: ring,
        scale: 2.8,
        alpha: 0,
        duration: 210,
        ease: 'Cubic.Out',
        onComplete: () => ring.destroy(),
      });
    }
  }

  private updateEnemyArmourBar(enemy: EnemyActor): void {
    if (enemy.armourBarBackground === null || enemy.armourBarFill === null) {
      return;
    }
    const ratio = Phaser.Math.Clamp(enemy.armour / enemy.definition.armour, 0, 1);
    enemy.armourBarFill
      .setPosition(this.scale.width / 2 - 130, 94)
      .setDisplaySize(260 * ratio, 6);
  }

  private clearRegularEnemies(): void {
    for (let index = this.enemies.length - 1; index >= 0; index -= 1) {
      if (this.enemies[index]?.definition.kind !== 'elite') {
        this.destroyEnemy(index);
      }
    }
  }

  private clearShots(): void {
    for (const shot of this.shots) {
      shot.body.destroy();
    }
    this.shots.length = 0;
  }

  private clearCombatActors(): void {
    this.clearShots();
    this.clearHostileShots();
    for (const missile of this.homingMissiles) {
      missile.body.destroy();
    }
    this.homingMissiles.length = 0;
    if (this.decoy !== null) {
      this.decoy.body.destroy();
      this.decoy = null;
    }
    for (const rocket of this.rockets) {
      rocket.body.destroy();
    }
    this.rockets.length = 0;
    for (const drone of this.drones) {
      drone.body.destroy();
    }
    this.drones.length = 0;
    for (const mine of this.mines) {
      mine.body.destroy();
    }
    this.mines.length = 0;
    for (const enemy of this.enemies) {
      enemy.body.destroy();
      enemy.armourBarBackground?.destroy();
      enemy.armourBarFill?.destroy();
    }
    this.enemies.length = 0;
  }

  private createDestructionBurst(x: number, y: number, colour: number): void {
    for (let index = 0; index < 8; index += 1) {
      const angle = (Math.PI * 2 * index) / 8;
      const fragment = this.add.circle(x, y, 5 + index % 3, colour, 0.9).setDepth(20);
      this.tweens.add({
        targets: fragment,
        x: x + Math.cos(angle) * (46 + index * 3),
        y: y + Math.sin(angle) * (46 + index * 3),
        alpha: 0,
        scale: 0.35,
        duration: 520,
        ease: 'Cubic.Out',
        onComplete: () => fragment.destroy(),
      });
    }
  }

  private showContractChange(x: number, y: number, amount: number): void {
    const positive = amount >= 0;
    const text = this.add.text(
      x,
      y,
      `${positive ? '+' : '−'}${formatCredits(Math.abs(amount))}`,
      {
        color: positive ? '#70d6b3' : '#f39aaa',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        fontSize: '16px',
        fontStyle: 'bold',
      },
    ).setOrigin(0.5).setDepth(24);
    this.tweens.add({
      targets: text,
      y: y - 34,
      alpha: 0,
      duration: 650,
      ease: 'Cubic.Out',
      onComplete: () => text.destroy(),
    });
  }

  private updateHud(): void {
    const remainingMs = this.runState.phase === 'escape'
      ? ESCAPE_DURATION_MS - this.escapeElapsedMs
      : ENCOUNTER_DURATION_MS - this.elapsedMs;
    const remainingSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
    const minutes = Math.floor(remainingSeconds / 60).toString().padStart(2, '0');
    const seconds = (remainingSeconds % 60).toString().padStart(2, '0');
    this.updatePlayerArmourBar();
    this.armourText.setText(this.t('combat.armour', {
      value: this.armour.toString().padStart(3, '0'),
    }));
    const projectedCredits = this.startingCredits + contractCreditDelta(this.contractLedger);
    this.reserveText
      .setText(this.t('combat.reserve', { value: formatCredits(projectedCredits) }))
      .setColor(projectedCredits <= 0 ? '#f39aaa' : '#b7d9d2');
    this.timeText.setText(`${minutes}:${seconds}`);
    this.updateRocketHud();
  }

  public refreshLocale(): void {
    if (this.statusText === undefined) {
      return;
    }
    this.updateHud();
    if (this.runState.phase === 'technology-choice') {
      this.presentTechnologySignal();
    } else if (this.runState.phase === 'extraction-choice') {
      this.presentExtractionWindow();
    }
    if (isPaused(this.pauseState)) {
      this.renderPauseLayer();
    }
    if (this.bossWarningElapsedMs !== null) {
      this.renderBossWarning();
    }
    if (this.endingText !== null && this.ending !== null) {
      this.endingText.setText(this.t(
        this.ending.survived ? 'combat.operationComplete' : 'combat.aircraftLost',
      ));
    }
    if (this.endStatusKey !== null) {
      this.statusText.setText(
        this.ended
          ? this.t('combat.returnBase', { message: this.t(this.endStatusKey) })
          : this.t(this.ending?.survived ? 'combat.extractionSequence' : 'combat.failureSequence'),
      );
    } else {
      this.statusText.setText(
        this.statusKey === 'combat.controls' && !this.controlsHintVisible
          ? ''
          : this.t(this.statusKey, this.statusParams),
      );
    }
  }

  private t(key: TranslationKey, params: TranslationParams = {}): string {
    return translate(this.getLocale(), key, params);
  }

  private isStunModuleEquipped(): boolean {
    return this.equippedHardpointItemIds.includes(STUN_MODULE_ID);
  }

  private tryFireStun(): void {
    if (this.ended || this.ending !== null || this.runState.phase !== 'elite') {
      return;
    }
    const elite = this.enemies.find((enemy) => enemy.definition.kind === 'elite');
    if (elite === undefined || this.eliteStunned) {
      return;
    }
    this.eliteStunned = true;
    this.runState = stunElite(this.runState);
    elite.body.setFillStyle(0xbfe3ff);
    this.setStatus('combat.wardenStunned');
    this.createDestructionBurst(elite.body.x, elite.body.y, 0xbfe3ff);
  }

  private isDroneSwarmEquipped(): boolean {
    return this.equippedHardpointItemIds.includes(AUX_DRONE_SWARM_ID);
  }

  private droneSwarmAmmunitionId(): string | null {
    return auxiliaryById(AUX_DRONE_SWARM_ID)?.ammoConsumableId ?? null;
  }

  private tryFireDrone(): void {
    if (this.ended || this.ending !== null) {
      return;
    }
    const ammoId = this.droneSwarmAmmunitionId();
    if (ammoId === null) {
      return;
    }
    const fired = this.auxiliaryAmmoConsumed[ammoId] ?? 0;
    if (this.getAmmunitionStock(ammoId) <= fired) {
      return;
    }
    const aux = auxiliaryById(AUX_DRONE_SWARM_ID);
    const body = this.add.rectangle(
      this.player.x,
      this.player.y - 24,
      8,
      8,
      0x9ad0ff,
    );
    this.drones.push({
      body,
      targetId: null,
      state: 'circle',
      angle: (this.rng.integer(0, 360) * Math.PI) / 180,
      speed: DRONE_SPEED,
      damage: aux?.damage ?? 28,
      areaRadius: aux?.areaRadius ?? 28,
      elapsedMs: 0,
    });
    this.auxiliaryAmmoConsumed = {
      ...this.auxiliaryAmmoConsumed,
      [ammoId]: fired + 1,
    };
    this.cameras.main.shake(40, 0.002);
  }

  private nearestEnemyId(x: number, y: number): number | null {
    let best: EnemyActor | undefined;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const enemy of this.enemies) {
      if (!enemy.body.active) {
        continue;
      }
      const distance = Math.hypot(enemy.body.x - x, enemy.body.y - y);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = enemy;
      }
    }
    return best === undefined ? null : best.actorId;
  }

  private updateDrones(deltaMs: number): void {
    const enemies = this.enemies.filter((enemy) => enemy.body.active);
    for (let index = this.drones.length - 1; index >= 0; index -= 1) {
      const drone = this.drones[index];
      if (drone === undefined) {
        continue;
      }
      drone.elapsedMs += deltaMs;
      if (drone.elapsedMs > DRONE_LIFETIME_MS) {
        drone.body.destroy();
        this.drones.splice(index, 1);
        continue;
      }
      if (drone.state === 'circle' && enemies.length === 0) {
        drone.angle += (deltaMs / 1000) * DRONE_ORBIT_RADIANS_PER_SECOND;
        drone.body.x = this.player.x + Math.cos(drone.angle) * DRONE_ORBIT_RADIUS;
        drone.body.y = this.player.y + Math.sin(drone.angle) * DRONE_ORBIT_RADIUS;
        continue;
      }
      drone.state = 'hunt';
      const target = drone.targetId === null
        ? undefined
        : enemies.find((enemy) => enemy.actorId === drone.targetId);
      if (target === undefined) {
        const next = this.nearestEnemyId(drone.body.x, drone.body.y);
        if (next === null) {
          drone.state = 'circle';
          continue;
        }
        drone.targetId = next;
        continue;
      }
      const dx = target.body.x - drone.body.x;
      const dy = target.body.y - drone.body.y;
      const length = Math.max(1, Math.hypot(dx, dy));
      const step = Math.min(drone.speed * (deltaMs / 1000), length);
      drone.body.x += (dx / length) * step;
      drone.body.y += (dy / length) * step;
      if (
        Phaser.Geom.Intersects.RectangleToRectangle(
          drone.body.getBounds(),
          target.body.getBounds(),
        )
      ) {
        this.explodeDrone(index, drone);
      }
    }
  }

  private decoyAmmunitionId(): string | null {
    return auxiliaryById(AUX_FLARE_DECOY_ID)?.ammoConsumableId ?? null;
  }

  private tryFireDecoy(): void {
    if (this.ended || this.ending !== null) {
      return;
    }
    const ammoId = this.decoyAmmunitionId();
    if (ammoId === null) {
      return;
    }
    const fired = this.auxiliaryAmmoConsumed[ammoId] ?? 0;
    if (this.getAmmunitionStock(ammoId) <= fired) {
      return;
    }
    if (this.decoy !== null) {
      this.decoy.body.destroy();
    }
    const body = this.add.rectangle(
      this.player.x,
      this.player.y - 30,
      6,
      6,
      0xffc15c,
    );
    body.setStrokeStyle(1, 0xffe8a0, 0.9);
    this.decoy = {
      body,
      attractionRadius: DECOY_ATTRACTION_RADIUS,
      lifetimeMs: DECOY_LIFETIME_MS,
      elapsedMs: 0,
    };
    this.auxiliaryAmmoConsumed = {
      ...this.auxiliaryAmmoConsumed,
      [ammoId]: fired + 1,
    };
  }

  private updateDecoys(deltaMs: number): void {
    if (this.decoy === null) {
      return;
    }
    this.decoy.elapsedMs += deltaMs;
    this.decoy.body.y -= DECOY_DRIFT_SPEED * (deltaMs / 1000);
    if (this.decoy.elapsedMs > this.decoy.lifetimeMs) {
      this.decoy.body.destroy();
      this.decoy = null;
    }
  }

  private mineAmmunitionId(): string | null {
    return auxiliaryById(AUX_MINE_ID)?.ammoConsumableId ?? null;
  }

  private tryFireMine(): void {
    if (
      this.ended ||
      this.ending !== null ||
      this.runState.phase === 'technology-choice' ||
      this.runState.phase === 'extraction-choice'
    ) {
      return;
    }
    const ammoId = this.mineAmmunitionId();
    if (ammoId === null) {
      return;
    }
    const fired = this.auxiliaryAmmoConsumed[ammoId] ?? 0;
    if (this.getAmmunitionStock(ammoId) <= fired) {
      return;
    }
    const aux = auxiliaryById(AUX_MINE_ID);
    const body = this.add.rectangle(
      this.player.x,
      this.player.y + 26,
      10,
      10,
      0xffd166,
    );
    body.setStrokeStyle(1, 0xfff0b0, 0.9);
    this.mines.push({
      body,
      damage: aux?.damage ?? 130,
      areaRadius: aux?.areaRadius ?? 60,
      proximityRadius: MINE_PROXIMITY_RADIUS,
      driftSpeed: MINE_DRIFT_SPEED,
      lifetimeMs: MINE_LIFETIME_MS,
      elapsedMs: 0,
    });
    this.auxiliaryAmmoConsumed = {
      ...this.auxiliaryAmmoConsumed,
      [ammoId]: fired + 1,
    };
    this.cameras.main.shake(40, 0.002);
  }

  private updateMines(deltaMs: number): void {
    for (let index = this.mines.length - 1; index >= 0; index -= 1) {
      const mine = this.mines[index];
      if (mine === undefined) {
        continue;
      }
      mine.elapsedMs += deltaMs;
      mine.body.y -= mine.driftSpeed * (deltaMs / 1000);
      if (mine.elapsedMs > mine.lifetimeMs || mine.body.y < -30) {
        mine.body.destroy();
        this.mines.splice(index, 1);
        continue;
      }
      // Proximity fuse: any enemy drifting within the blast radius detonates the mine.
      const proxied = this.enemies.some(
        (enemy) =>
          enemy.body.active &&
          Math.hypot(enemy.body.x - mine.body.x, enemy.body.y - mine.body.y) <=
            mine.proximityRadius,
      );
      if (proxied) {
        this.explodeMine(index, mine);
      }
    }
  }

  private explodeMine(index: number, mine: MineActor): void {
    const x = mine.body.x;
    const y = mine.body.y;
    mine.body.destroy();
    this.mines.splice(index, 1);
    this.createDestructionBurst(x, y, 0xffd166);
    this.cameras.main.shake(140, 0.008);
    for (let enemyIndex = this.enemies.length - 1; enemyIndex >= 0; enemyIndex -= 1) {
      const enemy = this.enemies[enemyIndex];
      if (enemy === undefined || !enemy.body.active) {
        continue;
      }
      const distance = Math.hypot(enemy.body.x - x, enemy.body.y - y);
      if (distance > mine.areaRadius) {
        continue;
      }
      enemy.armour -= mine.damage;
      enemy.body.setFillStyle(0xffffff);
      this.time.delayedCall(45, () => enemy.body.active && enemy.body.setFillStyle(
        enemy.definition.kind === 'elite'
          ? 0x9368c7
          : enemy.definition.movementPattern === 'sine' ? 0xd98ba1 : 0xd6b36a,
      ));
      this.updateEnemyArmourBar(enemy);
      if (enemy.armour <= 0) {
        this.applyEnemyDefeat(enemyIndex);
      }
    }
  }

  private explodeDrone(index: number, drone: DroneActor): void {
    const x = drone.body.x;
    const y = drone.body.y;
    drone.body.destroy();
    this.drones.splice(index, 1);
    this.createDestructionBurst(x, y, 0x9ad0ff);
    this.cameras.main.shake(90, 0.006);
    for (let enemyIndex = this.enemies.length - 1; enemyIndex >= 0; enemyIndex -= 1) {
      const enemy = this.enemies[enemyIndex];
      if (enemy === undefined || !enemy.body.active) {
        continue;
      }
      const distance = Math.hypot(enemy.body.x - x, enemy.body.y - y);
      if (distance > drone.areaRadius) {
        continue;
      }
      enemy.armour -= drone.damage;
      enemy.body.setFillStyle(0xffffff);
      this.time.delayedCall(45, () => enemy.body.active && enemy.body.setFillStyle(
        enemy.definition.kind === 'elite'
          ? 0x9368c7
          : enemy.definition.movementPattern === 'sine' ? 0xd98ba1 : 0xd6b36a,
      ));
      this.updateEnemyArmourBar(enemy);
      if (enemy.armour <= 0) {
        this.applyEnemyDefeat(enemyIndex);
      }
    }
  }

  private setStatus(key: TranslationKey, params: TranslationParams = {}): void {
    this.statusKey = key;
    this.statusParams = params;
    this.statusText.setText(this.t(key, params));
  }

  private beginEnding(survived: boolean, messageKey: TranslationKey): void {
    if (this.ended || this.ending !== null) {
      return;
    }
    if (!survived) {
      this.runState = failRun(this.runState);
    }
    this.ending = {
      survived,
      messageKey,
      phase: survived ? 'centering' : 'defeat',
      elapsedMs: 0,
    };
    this.endStatusKey = messageKey;
    this.closeDecision();
    this.bossWarningLayer?.destroy(true);
    this.bossWarningLayer = null;
    this.bossWarningElapsedMs = null;
    this.artifactRevealElapsedMs = null;
    this.clearCombatActors();
    this.statusText.setText(this.t(survived ? 'combat.extractionSequence' : 'combat.failureSequence'))
      .setColor(survived ? '#9dd7c7' : '#f39aaa');
    this.endingText = this.add.text(
      this.scale.width / 2,
      this.scale.height * 0.42,
      this.t(survived ? 'combat.operationComplete' : 'combat.aircraftLost'),
      {
        align: 'center',
        color: survived ? '#dceff0' : '#f39aaa',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        fontSize: '23px',
        fontStyle: 'bold',
      },
    ).setOrigin(0.5).setDepth(35).setAlpha(survived ? 0 : 1);

    if (!survived) {
      this.createDestructionBurst(this.player.x, this.player.y, 0xff8b9d);
      this.player.setAlpha(0.12);
      this.playerArmourBarBackground.setVisible(false);
      this.playerArmourBarFill.setVisible(false);
      this.cameras.main.shake(180, 0.012);
      this.cameras.main.flash(120, 110, 18, 30, false);
    }
  }

  private updateEnding(deltaMs: number): void {
    const ending = this.ending;
    if (ending === null) {
      return;
    }
    ending.elapsedMs += deltaMs;
    this.updateStarfield(deltaMs);

    if (ending.phase === 'defeat') {
      if (ending.elapsedMs >= DEFEAT_DURATION_MS) {
        this.finishEncounter();
      }
      return;
    }

    if (ending.phase === 'centering') {
      const follow = Math.min(1, deltaMs / 150);
      this.player.x = Phaser.Math.Linear(this.player.x, this.scale.width / 2, follow);
      this.player.y = Phaser.Math.Linear(this.player.y, this.scale.height * 0.68, follow);
      this.updatePlayerArmourBar();
      this.endingText?.setAlpha(Math.min(1, ending.elapsedMs / 380));
      if (ending.elapsedMs >= VICTORY_CENTER_DURATION_MS) {
        ending.phase = 'exiting';
        ending.elapsedMs = 0;
      }
      return;
    }

    this.player.y -= VICTORY_EXIT_SPEED * (deltaMs / 1000);
    this.updatePlayerArmourBar();
    if (this.player.y < -64) {
      this.finishEncounter();
    }
  }

  private finishEncounter(): void {
    if (this.ended || this.ending === null) {
      return;
    }
    const ending = this.ending;
    this.ended = true;
    this.statusText.setText(this.t('combat.returnBase', {
      message: this.t(ending.messageKey),
    }));
    if (!this.completionPublished) {
      this.completionPublished = true;
      const armourLostRatio = Math.max(
        0,
        Math.min(1, 1 - this.armour / this.maxArmour),
      );
      this.onRunComplete({
        outcome: toSortieOutcome(this.runState, this.contractLedger),
        technologyDecision: this.runState.technologyDecision,
        extractionDecision: this.runState.extractionDecision,
        eliteDefeated: this.runState.eliteDefeated,
        armourLostRatio,
        aircraftDestroyed: this.armour <= 0,
        rocketsFired: this.rocketsFired,
        auxiliaryAmmoConsumed: this.auxiliaryAmmoConsumed,
      });
    }
  }

  public setDebugInvincible(flag: boolean): void {
    this.debugInvincible = flag;
  }

  public debugSpawnElite(): void {
    if (this.eliteSpawned) {
      return;
    }
    const elite = contentCatalog.enemies.find((enemy) => enemy.kind === "elite");
    if (elite !== undefined) {
      this.spawnEnemy(elite);
      this.eliteSpawned = true;
    }
  }

  public debugSkipToExtraction(): void {
    this.elapsedMs = Math.max(this.elapsedMs, EXTRACTION_WINDOW_MS);
  }
}
