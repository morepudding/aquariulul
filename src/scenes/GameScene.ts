import Phaser from 'phaser';
import { DailyWork, WOODCUTTER_WORK } from '../systems/DailyWork';
import { GameState, type Activity, type Resources } from '../systems/GameState';
import {
  FOREST_ROAD_PROJECT,
  MINE_SUPPORTS_PROJECT,
  OLD_BRIDGE_PROJECT,
  RegionalProjects,
} from '../systems/RegionalProjects';
import { VillageRequests } from '../systems/VillageRequests';
import { WorldChronicle } from '../systems/WorldChronicle';
import { isSeasonStartDay, seasonForDay } from '../systems/Seasons';
import { Hud } from '../ui/Hud';

const DAY_DURATION_SECONDS = 30;
const DEFAULT_SPEED_MULTIPLIER = 1;
const SPEED_MULTIPLIERS = [1, 2, 3, 4, 5] as const;
const FOREST_REGENERATION_TICK_MS = 1000;
const VIEW_WIDTH = 1280;
const VIEW_HEIGHT = 720;
const WORLD_WIDTH = 1920;
const WORLD_HEIGHT = 1080;
const CAMERA_WHEEL_SPEED = 0.75;
const FOREST_HEALTHY_ASSET_KEY = 'forest-healthy';
const FOREST_HEALTHY_ASSET_PATH = 'assets/forest-healthy.png';
const FOREST_EXHAUSTED_ASSET_KEY = 'forest-exhausted';
const FOREST_EXHAUSTED_ASSET_PATH = 'assets/forest-exhausted.png';
const FOREST_GROUND_PATCH_ASSET_KEY = 'forest-ground-patch';
const FOREST_GROUND_PATCH_ASSET_PATH = 'assets/forest-ground-patch.png';
const MINE_ENTRANCE_ASSET_KEY = 'mine-entrance';
const MINE_ENTRANCE_ASSET_PATH = 'assets/mine-entrance.png';
const VILLAGE_LANDMARK_ASSET_KEY = 'village-landmark';
const VILLAGE_LANDMARK_ASSET_PATH = 'assets/village-landmark.png';
const OLD_BRIDGE_DAMAGED_ASSET_KEY = 'old-bridge-damaged';
const OLD_BRIDGE_DAMAGED_ASSET_PATH = 'assets/old-bridge-damaged.png';
const OLD_BRIDGE_REPAIRED_ASSET_KEY = 'old-bridge-repaired';
const OLD_BRIDGE_REPAIRED_ASSET_PATH = 'assets/old-bridge-repaired.png';
const FOREST_LANDMARK_WIDTH = 210;
const FOREST_EXHAUSTED_LANDMARK_WIDTH = 210;
const FOREST_GROUND_PATCH_WIDTH = 270;
const MINE_LANDMARK_WIDTH = 170;
const VILLAGE_LANDMARK_WIDTH = 190;
const OLD_BRIDGE_LANDMARK_WIDTH = 230;
const OLD_BRIDGE_X = 1235;
const OLD_BRIDGE_Y = 805;
const WOODCUTTER_OVERLAY_DEPTH = 200;
const WOODCUTTER_BAR_LEFT = 340;
const WOODCUTTER_BAR_Y = 370;
const WOODCUTTER_BAR_WIDTH = 560;
const WOODCUTTER_BAR_HEIGHT = 18;
const WOODCUTTER_SUCCESS_ZONE_WIDTH = 132;
const WOODCUTTER_CURSOR_SPEED = 185;
const MERCHANT_NOTIFICATION_DURATION = 3200;
const MERCHANT_NOTIFICATION_DEPTH = 30;
const MERCHANT_NOTIFICATION_X = 1430;
const MERCHANT_NOTIFICATION_Y = 545;
const FOREST_ROAD_STOCK_PRESERVATION_CHANCE = 0.5;
const MINE_SUPPORTS_EXTRA_STONE_CHANCE = 0.25;

type SpeedMultiplier = (typeof SPEED_MULTIPLIERS)[number];

type MerchantReward = {
  resources: Partial<Resources>;
  chronicle: string;
};

const COLORS = {
  night: 0x151d1b,
  grass: 0x5f8750,
  grassLight: 0x719a5a,
  grassDark: 0x4e7343,
  grassSoft: 0x8aa66b,
  grassWarm: 0x7f9456,
  grassMuted: 0x547c4b,
  water: 0x5f8d95,
  waterLight: 0x8eb8b3,
  riverBank: 0x9d8b5f,
  panel: 0x24302c,
  panelSoft: 0x2f4038,
  ink: 0x18211f,
  line: 0xd5be82,
  paper: 0xf6e8bf,
  forest: 0x4f8b55,
  mine: 0x7c8684,
  village: 0xbc8651,
  amber: 0xf0c35b,
  danger: 0x9b4e43,
  wood: 0xb8793c,
};

const OLD_BRIDGE_MERCHANT_REWARDS = [
  {
    resources: { wood: 5 },
    chronicle:
      "Des marchands venus par le vieux pont echangent quelques planches contre l'hospitalite du village.",
  },
  {
    resources: { stone: 5 },
    chronicle:
      "Une charrette traverse enfin l'ancien pont et laisse derriere elle quelques blocs de pierre utiles.",
  },
  {
    resources: { wood: 3, stone: 3 },
    chronicle:
      'Le passage retrouve attire de petits echanges. La region semble un peu moins isolee.',
  },
] satisfies MerchantReward[];

const PLACES: Array<{
  activity: Activity;
  label: string;
  x: number;
  y: number;
  color: number;
}> = [
  { activity: 'forest', label: 'Foret', x: 360, y: 610, color: COLORS.forest },
  { activity: 'mine', label: 'Mine', x: 910, y: 455, color: COLORS.mine },
  {
    activity: 'village',
    label: 'Village',
    x: 1430,
    y: 645,
    color: COLORS.village,
  },
];

type PlaceVisual = {
  hitArea: Phaser.GameObjects.Ellipse;
  ring: Phaser.GameObjects.Ellipse;
  label: Phaser.GameObjects.Text;
  icon: Phaser.GameObjects.Graphics | Phaser.GameObjects.Image;
  statusText: Phaser.GameObjects.Text;
  forestGroundPatch?: Phaser.GameObjects.Image;
  forestGaugeFill?: Phaser.GameObjects.Rectangle;
};

type WoodcutterWorkUi = {
  objects: Phaser.GameObjects.GameObject[];
  cursor: Phaser.GameObjects.Rectangle;
  attemptPips: Phaser.GameObjects.Rectangle[];
  successPips: Phaser.GameObjects.Rectangle[];
};

type WoodcutterWorkState = {
  attemptsDone: number;
  successes: number;
  cursorProgress: number;
  cursorDirection: 1 | -1;
  ui: WoodcutterWorkUi;
};

export class GameScene extends Phaser.Scene {
  private state!: GameState;
  private dailyWork!: DailyWork;
  private regionalProjects!: RegionalProjects;
  private villageRequests!: VillageRequests;
  private chronicle!: WorldChronicle;
  private hud!: Hud;
  private nextDayInSeconds = DAY_DURATION_SECONDS;
  private speedMultiplier: SpeedMultiplier = DEFAULT_SPEED_MULTIPLIER;
  private placeVisuals = new Map<Activity, PlaceVisual>();
  private oldBridgeLandmark?: Phaser.GameObjects.Image;
  private activeMerchantNotifications: Phaser.GameObjects.Container[] = [];
  private woodcutterWork?: WoodcutterWorkState;
  private cameraDragStart?: {
    pointerX: number;
    pointerY: number;
    scrollX: number;
    scrollY: number;
  };
  private dayTimeMs = 0;
  private forestRegenerationElapsedMs = 0;
  private ambientLightOverlay!: Phaser.GameObjects.Rectangle;
  private seasonOverlay!: Phaser.GameObjects.Rectangle;
  private pathsGraphics!: Phaser.GameObjects.Graphics;

  constructor() {
    super('GameScene');
  }

  preload(): void {
    this.load.image(FOREST_HEALTHY_ASSET_KEY, FOREST_HEALTHY_ASSET_PATH);
    this.load.image(FOREST_EXHAUSTED_ASSET_KEY, FOREST_EXHAUSTED_ASSET_PATH);
    this.load.image(
      FOREST_GROUND_PATCH_ASSET_KEY,
      FOREST_GROUND_PATCH_ASSET_PATH,
    );
    this.load.image(MINE_ENTRANCE_ASSET_KEY, MINE_ENTRANCE_ASSET_PATH);
    this.load.image(VILLAGE_LANDMARK_ASSET_KEY, VILLAGE_LANDMARK_ASSET_PATH);
    this.load.image(OLD_BRIDGE_DAMAGED_ASSET_KEY, OLD_BRIDGE_DAMAGED_ASSET_PATH);
    this.load.image(OLD_BRIDGE_REPAIRED_ASSET_KEY, OLD_BRIDGE_REPAIRED_ASSET_PATH);
  }

  create(): void {
    this.state = new GameState();
    this.dailyWork = new DailyWork();
    this.regionalProjects = new RegionalProjects();
    this.villageRequests = new VillageRequests();
    this.chronicle = new WorldChronicle();

    this.setupScrollableMap();
    this.createBackdrop();
    this.pathsGraphics = this.add.graphics().setDepth(1.5);
    this.createOldBridgeLandmark();
    this.createPlaces();
    this.createAmbientLightOverlay();
    this.setupAmbientEnvironment();
    this.hud = new Hud(
      this,
      this.state,
      this.dailyWork,
      this.regionalProjects,
      this.villageRequests,
      this.chronicle,
      () => {
        this.harvestDailyWood();
      },
      () => {
        this.startWoodcutterWork();
      },
      () => {
        this.extractDailyStone();
      },
      () => {
        this.fundOldBridge();
      },
      () => {
        this.fundForestRoad();
      },
      () => {
        this.fundMineSupports();
      },
      () => {
        this.completeVillageRequest();
      },
      () => {
        this.resetSave();
      },
      (speedMultiplier) => {
        this.setSpeedMultiplier(speedMultiplier);
      },
    );
    this.setSpeedMultiplier(DEFAULT_SPEED_MULTIPLIER);
    this.refresh();

    this.time.addEvent({
      delay: 2000,
      loop: true,
      callback: () => {
        const currentActivity = this.state.activity;
        const forestAvailable = this.state.canUseForest();

        const newForestThresholds = this.state.produce(
          this.regionalProjects.hasCompletedForestRoad()
            ? FOREST_ROAD_STOCK_PRESERVATION_CHANCE
            : 0,
          this.regionalProjects.hasCompletedMineSupports()
            ? MINE_SUPPORTS_EXTRA_STONE_CHANCE
            : 0,
        );

        for (const threshold of newForestThresholds) {
          this.chronicle.addForestThresholdEvent(threshold);
        }

        if (currentActivity === 'forest' && forestAvailable) {
          this.showProductionFloatingText('forest');
        } else if (currentActivity === 'mine') {
          this.showProductionFloatingText('mine');
        }

        this.refresh();
      },
    });

    this.time.addEvent({
      delay: FOREST_REGENERATION_TICK_MS,
      loop: true,
      callback: () => {
        this.forestRegenerationElapsedMs += FOREST_REGENERATION_TICK_MS;

        if (
          this.forestRegenerationElapsedMs >=
          seasonForDay(this.chronicle.currentDay).forestRegenerationDelayMs
        ) {
          this.forestRegenerationElapsedMs = 0;
          this.state.regenerateForest();
        }

        this.refresh();
      },
    });

    this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        this.nextDayInSeconds -= 1;

        if (this.nextDayInSeconds <= 0) {
          this.chronicle.advanceDay();
          this.state.resetDailyActions();
          for (const eventText of this.regionalProjects.advanceDay()) {
            this.chronicle.addEvent(eventText);
          }
          for (const eventText of this.villageRequests.advanceDay(
            seasonForDay(this.chronicle.currentDay).villageRequestChance,
          )) {
            this.chronicle.addEvent(eventText);
          }
          this.resolveOldBridgeMerchantRoute();
          if (
            this.chronicle.currentDay > 1 &&
            isSeasonStartDay(this.chronicle.currentDay)
          ) {
            this.chronicle.addEvent(
              seasonForDay(this.chronicle.currentDay).transitionChronicle,
            );
          }
          this.nextDayInSeconds = DAY_DURATION_SECONDS;
          this.dayTimeMs = 0;
        }

        this.refresh();
      },
    });
  }

  private setupScrollableMap(): void {
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.setCameraScroll(280, 190);

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.woodcutterWork) {
        return;
      }

      this.cameraDragStart = {
        pointerX: pointer.x,
        pointerY: pointer.y,
        scrollX: this.cameras.main.scrollX,
        scrollY: this.cameras.main.scrollY,
      };
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.cameraDragStart || this.woodcutterWork) {
        return;
      }

      this.setCameraScroll(
        this.cameraDragStart.scrollX +
          (this.cameraDragStart.pointerX - pointer.x),
        this.cameraDragStart.scrollY +
          (this.cameraDragStart.pointerY - pointer.y),
      );
    });

    this.input.on('pointerup', () => {
      this.cameraDragStart = undefined;
    });
    this.input.on('pointerupoutside', () => {
      this.cameraDragStart = undefined;
    });

    this.input.on(
      'wheel',
      (
        _pointer: Phaser.Input.Pointer,
        _gameObjects: Phaser.GameObjects.GameObject[],
        deltaX: number,
        deltaY: number,
      ) => {
        if (this.woodcutterWork) {
          return;
        }

        this.setCameraScroll(
          this.cameras.main.scrollX + deltaX * CAMERA_WHEEL_SPEED,
          this.cameras.main.scrollY + deltaY * CAMERA_WHEEL_SPEED,
        );
      },
    );
  }

  private setCameraScroll(scrollX: number, scrollY: number): void {
    this.cameras.main.setScroll(
      Phaser.Math.Clamp(scrollX, 0, WORLD_WIDTH - VIEW_WIDTH),
      Phaser.Math.Clamp(scrollY, 0, WORLD_HEIGHT - VIEW_HEIGHT),
    );
  }

  update(_time: number, delta: number): void {
    this.dayTimeMs = (this.dayTimeMs + delta) % (DAY_DURATION_SECONDS * 1000);
    this.updateAmbientLight();
    this.updateSeasonOverlay();

    if (!this.woodcutterWork) {
      return;
    }

    const movement = (WOODCUTTER_CURSOR_SPEED * delta) / 1000;
    this.woodcutterWork.cursorProgress +=
      (movement / WOODCUTTER_BAR_WIDTH) * this.woodcutterWork.cursorDirection;

    if (this.woodcutterWork.cursorProgress >= 1) {
      this.woodcutterWork.cursorProgress = 1;
      this.woodcutterWork.cursorDirection = -1;
    }

    if (this.woodcutterWork.cursorProgress <= 0) {
      this.woodcutterWork.cursorProgress = 0;
      this.woodcutterWork.cursorDirection = 1;
    }

    this.updateWoodcutterCursor();
  }

  private createBackdrop(): void {
    this.add.rectangle(
      WORLD_WIDTH / 2,
      WORLD_HEIGHT / 2,
      WORLD_WIDTH,
      WORLD_HEIGHT,
      COLORS.grass,
    );

    const meadow = this.add.graphics();

    this.createOrganicMeadow(meadow);

    this.createWorldRiver();
  }

  private createOrganicMeadow(meadow: Phaser.GameObjects.Graphics): void {
    const patches = [
      { x: 250, y: 180, w: 520, h: 230, color: COLORS.grassLight, alpha: 0.16 },
      { x: 785, y: 105, w: 780, h: 290, color: COLORS.grassLight, alpha: 0.15 },
      { x: 1390, y: 210, w: 620, h: 260, color: COLORS.grassMuted, alpha: 0.14 },
      { x: 325, y: 545, w: 720, h: 280, color: COLORS.grassSoft, alpha: 0.12 },
      { x: 780, y: 720, w: 860, h: 340, color: COLORS.grassDark, alpha: 0.12 },
      { x: 1505, y: 850, w: 650, h: 280, color: COLORS.grassLight, alpha: 0.14 },
      { x: 1660, y: 510, w: 560, h: 250, color: COLORS.grassWarm, alpha: 0.12 },
      { x: 1120, y: 420, w: 520, h: 210, color: COLORS.grassMuted, alpha: 0.1 },
      { x: 510, y: 975, w: 580, h: 190, color: COLORS.grassLight, alpha: 0.13 },
      { x: 1850, y: 970, w: 520, h: 220, color: COLORS.grassDark, alpha: 0.12 },
    ];

    for (const patch of patches) {
      meadow.fillStyle(patch.color, patch.alpha);
      meadow.fillEllipse(patch.x, patch.y, patch.w, patch.h);
    }

    meadow.fillStyle(COLORS.grassDark, 0.08);
    for (let index = 0; index < 90; index += 1) {
      const x = (index * 197 + 83) % WORLD_WIDTH;
      const y = (index * 113 + 47) % WORLD_HEIGHT;
      const width = 18 + ((index * 7) % 28);
      const height = 5 + ((index * 5) % 10);

      meadow.fillEllipse(x, y, width, height);
    }

    meadow.lineStyle(1, COLORS.grassDark, 0.16);
    for (let index = 0; index < 70; index += 1) {
      const x = (index * 151 + 29) % WORLD_WIDTH;
      const y = (index * 89 + 73) % WORLD_HEIGHT;
      const length = 8 + ((index * 3) % 10);

      meadow.lineBetween(x, y, x + length, y - 2);
    }

    meadow.lineStyle(1, COLORS.grassLight, 0.11);
    for (let index = 0; index < 58; index += 1) {
      const x = (index * 173 + 211) % WORLD_WIDTH;
      const y = (index * 131 + 17) % WORLD_HEIGHT;
      const length = 10 + ((index * 5) % 12);

      meadow.lineBetween(x, y, x + length, y + 2);
    }
  }

  private createWorldRiver(): void {
    const river = this.add.graphics();
    const points = [
      { x: -90, y: 1065 },
      { x: 160, y: 1010 },
      { x: 420, y: 970 },
      { x: 690, y: 925 },
      { x: 930, y: 875 },
      { x: 1115, y: 850 },
      { x: 1245, y: 808 },
      { x: 1410, y: 748 },
      { x: 1630, y: 660 },
      { x: 1880, y: 575 },
      { x: 2010, y: 540 },
    ];

    river.setDepth(1);
    this.drawPolyline(river, points, 72, COLORS.grassDark, 0.16);
    this.drawPolyline(river, points, 58, COLORS.riverBank, 0.38);
    this.drawPolyline(river, points, 42, COLORS.water, 0.72);
    this.drawPolyline(river, points, 16, COLORS.waterLight, 0.25);

    river.fillStyle(COLORS.riverBank, 0.34);
    river.fillEllipse(215, 995, 126, 42);
    river.fillEllipse(760, 912, 132, 46);
    river.fillEllipse(1110, 850, 96, 36);
    river.fillEllipse(1405, 722, 118, 42);
    river.fillEllipse(1810, 595, 138, 44);
    river.fillStyle(COLORS.grassSoft, 0.22);
    river.fillEllipse(285, 985, 84, 34);
    river.fillEllipse(705, 922, 78, 30);
    river.fillEllipse(1065, 873, 72, 32);
    river.fillEllipse(1465, 726, 86, 36);
    river.fillEllipse(1748, 620, 92, 34);

    river.fillStyle(0x6f6754, 0.42);
    river.fillEllipse(360, 974, 10, 6);
    river.fillEllipse(620, 928, 12, 7);
    river.fillEllipse(1160, 842, 10, 6);
    river.fillEllipse(1215, 816, 8, 5);
    river.fillEllipse(1335, 760, 12, 7);
    river.fillEllipse(1432, 728, 9, 5);
    river.fillEllipse(1710, 632, 11, 6);
  }

  private drawPolyline(
    graphics: Phaser.GameObjects.Graphics,
    points: Array<{ x: number; y: number }>,
    width: number,
    color: number,
    alpha: number,
  ): void {
    graphics.lineStyle(width, color, alpha);

    for (let index = 1; index < points.length; index += 1) {
      const previous = points[index - 1];
      const current = points[index];

      graphics.lineBetween(previous.x, previous.y, current.x, current.y);
    }
  }

  private createPlaces(): void {
    for (const place of PLACES) {
      const isForest = place.activity === 'forest';
      const isMine = place.activity === 'mine';
      const isVillage = place.activity === 'village';
      const hitAreaWidth = isForest ? 220 : isMine ? 190 : 210;
      const hitAreaHeight = isForest ? 132 : isMine ? 124 : 142;
      const labelYOffset = isForest ? 72 : isMine ? 70 : 86;
      const statusYOffset = isForest ? 99 : isMine ? 97 : 111;
      const forestGaugeYOffset = isForest ? 123 : 96;
      const hitArea = this.add
        .ellipse(place.x, place.y, hitAreaWidth, hitAreaHeight, place.color, 0.12)
        .setStrokeStyle(2, place.color)
        .setDepth(2)
        .setInteractive({ useHandCursor: true });
      const ring = this.add
        .ellipse(
          place.x,
          place.y,
          hitAreaWidth + 18,
          hitAreaHeight + 14,
          COLORS.amber,
          0,
        )
        .setStrokeStyle(5, COLORS.amber)
        .setDepth(4);
      const forestGroundPatch = isForest
        ? this.createForestGroundPatch(place.x, place.y)
        : undefined;
      if (isForest) {
        this.createForestGroundDetails(place.x, place.y);
      }
      const icon = isForest
        ? this.createForestLandmark(place.x, place.y)
        : isMine
          ? this.createMineLandmark(place.x, place.y)
          : isVillage
            ? this.createVillageLandmark(place.x, place.y)
            : this.createPlaceMarker(place.x, place.y, place.color);
      const label = this.add
        .text(place.x, place.y + labelYOffset, place.label, {
          color: '#f6e8bf',
          fontFamily: 'Georgia, Times New Roman, serif',
          fontSize: '24px',
        })
        .setOrigin(0.5)
        .setDepth(5);
      const statusText = this.add
        .text(place.x, place.y + statusYOffset, '', {
          color: '#f6e8bf',
          fontFamily: 'Arial',
          fontSize: '15px',
        })
        .setOrigin(0.5)
        .setDepth(5);
      const visual: PlaceVisual = {
        hitArea,
        ring,
        label,
        icon,
        statusText,
        forestGroundPatch,
      };

      hitArea.on('pointerdown', () => {
        this.state.setActivity(place.activity);
        this.refresh();
      });

      if (place.activity === 'forest') {
        this.add
          .rectangle(place.x - 58, place.y + forestGaugeYOffset, 116, 8, COLORS.ink, 0.72)
          .setDepth(5);
        visual.forestGaugeFill = this.add.rectangle(
          place.x - 58,
          place.y + forestGaugeYOffset,
          116,
          8,
          COLORS.forest,
        );
        visual.forestGaugeFill.setOrigin(0, 0.5);
        visual.forestGaugeFill.setDepth(6);
      }

      this.placeVisuals.set(place.activity, visual);
    }
  }

  private refresh(): void {
    this.drawPaths();
    this.hud.refresh(
      this.nextDayInSeconds,
      this.woodcutterWork !== undefined,
      this.speedMultiplier,
    );

    for (const place of PLACES) {
      const visual = this.placeVisuals.get(place.activity);

      if (!visual) {
        continue;
      }

      const isUnavailable =
        place.activity === 'forest' && !this.state.canUseForest();
      const isActive = this.state.activity === place.activity && !isUnavailable;

      if (isUnavailable) {
        visual.hitArea.disableInteractive();
      } else if (!visual.hitArea.input?.enabled) {
        visual.hitArea.setInteractive({ useHandCursor: true });
      }

      visual.hitArea.setFillStyle(place.color, isActive ? 0.34 : 0.18);
      visual.ring.setAlpha(isActive ? 1 : 0);
      visual.label.setAlpha(isUnavailable ? 0.45 : 1);
      visual.forestGroundPatch?.setVisible(!isUnavailable);
      visual.icon.setAlpha(isUnavailable ? 0.95 : 1);
      if (place.activity === 'forest' && visual.icon instanceof Phaser.GameObjects.Image) {
        visual.icon.setTexture(
          isUnavailable ? FOREST_EXHAUSTED_ASSET_KEY : FOREST_HEALTHY_ASSET_KEY,
        );
        const landmarkWidth = isUnavailable
          ? FOREST_EXHAUSTED_LANDMARK_WIDTH
          : FOREST_LANDMARK_WIDTH;
        visual.icon.setDisplaySize(
          landmarkWidth,
          this.assetHeightForWidth(visual.icon.texture.key, landmarkWidth),
        );
      }
      visual.statusText.setText(isActive ? 'en cours' : isUnavailable ? 'epuisee' : 'repos');
      visual.statusText.setAlpha(isUnavailable || isActive ? 1 : 0.55);

      if (place.activity === 'forest' && visual.forestGaugeFill) {
        const ratio = Phaser.Math.Clamp(
          this.state.forestCurrent / this.state.forestMax,
          0,
          1,
        );
        visual.forestGaugeFill.setDisplaySize(116 * ratio, 8);
        visual.forestGaugeFill.setFillStyle(this.forestGaugeColor(ratio));
      }
    }

    this.refreshOldBridgeLandmark();
  }

  private resetSave(): void {
    this.destroyWoodcutterWork();
    this.destroyMerchantNotifications();
    this.state.reset();
    this.dailyWork.reset();
    this.regionalProjects.reset();
    this.villageRequests.reset();
    this.chronicle.reset();
    this.nextDayInSeconds = DAY_DURATION_SECONDS;
    this.dayTimeMs = 0;
    this.forestRegenerationElapsedMs = 0;
    this.refresh();
  }

  private setSpeedMultiplier(speedMultiplier: number): void {
    if (!this.isSpeedMultiplier(speedMultiplier)) {
      return;
    }

    this.speedMultiplier = speedMultiplier;
    this.time.timeScale = speedMultiplier;
    this.refresh();
  }

  private isSpeedMultiplier(value: number): value is SpeedMultiplier {
    return SPEED_MULTIPLIERS.includes(value as SpeedMultiplier);
  }

  private fundOldBridge(): void {
    if (!this.regionalProjects.canFundOldBridge(this.state.resources.wood)) {
      return;
    }

    if (!this.state.spendWood(OLD_BRIDGE_PROJECT.costWood)) {
      return;
    }

    const eventText = this.regionalProjects.fundOldBridge();

    if (eventText) {
      this.chronicle.addEvent(eventText);
    }

    this.refresh();
  }

  private fundForestRoad(): void {
    if (
      !this.regionalProjects.canFundForestRoad(
        this.state.resources.wood,
        this.state.resources.stone,
      )
    ) {
      return;
    }

    if (
      !this.state.spendResources({
        wood: FOREST_ROAD_PROJECT.costWood,
        stone: FOREST_ROAD_PROJECT.costStone,
      })
    ) {
      return;
    }

    const eventText = this.regionalProjects.fundForestRoad();

    if (eventText) {
      this.chronicle.addEvent(eventText);
    }

    this.refresh();
  }

  private fundMineSupports(): void {
    if (
      !this.regionalProjects.canFundMineSupports(
        this.state.resources.wood,
        this.state.resources.stone,
      )
    ) {
      return;
    }

    if (
      !this.state.spendResources({
        wood: MINE_SUPPORTS_PROJECT.costWood,
        stone: MINE_SUPPORTS_PROJECT.costStone,
      })
    ) {
      return;
    }

    const eventText = this.regionalProjects.fundMineSupports();

    if (eventText) {
      this.chronicle.addEvent(eventText);
    }

    this.refresh();
  }

  private harvestDailyWood(): void {
    if (!this.state.canUseDailyAction() || this.state.forestCurrent <= 0) {
      this.refresh();
      return;
    }

    const woodAmount = Math.min(6, this.state.forestCurrent);

    if (woodAmount <= 0 || !this.state.spendDailyAction()) {
      this.refresh();
      return;
    }

    const newForestThresholds = this.state.harvestForestWood(woodAmount);

    for (const threshold of newForestThresholds) {
      this.chronicle.addForestThresholdEvent(threshold);
    }

    this.refresh();
  }

  private extractDailyStone(): void {
    if (!this.state.spendDailyAction()) {
      this.refresh();
      return;
    }

    this.state.addResources({ stone: 8 });
    this.refresh();
  }

  private completeVillageRequest(): void {
    const definition = this.villageRequests.getActiveDefinition();

    if (
      !definition ||
      !this.state.canUseDailyAction() ||
      !this.villageRequests.canCompleteActive(this.state.resources)
    ) {
      this.refresh();
      return;
    }

    if (!this.state.spendResources(definition.cost)) {
      this.refresh();
      return;
    }

    if (!this.state.spendDailyAction()) {
      this.refresh();
      return;
    }

    for (const eventText of this.villageRequests.completeActive()) {
      this.chronicle.addEvent(eventText);
    }

    this.refresh();
  }

  private resolveOldBridgeMerchantRoute(): void {
    if (this.regionalProjects.oldBridge.status !== 'completed') {
      return;
    }

    const merchantEventChance = seasonForDay(
      this.chronicle.currentDay,
    ).merchantRouteChance;

    if (Math.random() >= merchantEventChance) {
      return;
    }

    const rewardIndex = Math.floor(
      Math.random() * OLD_BRIDGE_MERCHANT_REWARDS.length,
    );
    const reward = OLD_BRIDGE_MERCHANT_REWARDS[rewardIndex];

    this.state.addResources(reward.resources);
    this.showMerchantRewardNotification(reward.resources);
    this.chronicle.addEvent(reward.chronicle);
  }

  private showMerchantRewardNotification(resources: Partial<Resources>): void {
    const label = this.merchantRewardNotificationText(resources);
    const stackOffset = this.activeMerchantNotifications.length * 34;
    const text = this.add
      .text(0, 0, label, {
        color: '#f6e8bf',
        fontFamily: 'Georgia, Times New Roman, serif',
        fontSize: '17px',
        shadow: { color: '#111a18', blur: 4, fill: true },
      })
      .setOrigin(0.5);
    const panel = this.add
      .rectangle(0, 0, text.width + 30, 30, COLORS.ink, 0.78)
      .setStrokeStyle(1, COLORS.line, 0.45);
    const notification = this.add
      .container(MERCHANT_NOTIFICATION_X, MERCHANT_NOTIFICATION_Y - stackOffset, [
        panel,
        text,
      ])
      .setDepth(MERCHANT_NOTIFICATION_DEPTH);

    this.activeMerchantNotifications.push(notification);
    this.tweens.add({
      targets: notification,
      y: notification.y - 26,
      alpha: 0,
      delay: MERCHANT_NOTIFICATION_DURATION,
      duration: 700,
      ease: 'Sine.easeIn',
      onComplete: () => {
        this.activeMerchantNotifications =
          this.activeMerchantNotifications.filter((item) => item !== notification);
        notification.destroy();
      },
    });
  }

  private merchantRewardNotificationText(resources: Partial<Resources>): string {
    const wood = Math.max(0, Math.floor(resources.wood || 0));
    const stone = Math.max(0, Math.floor(resources.stone || 0));

    if (wood > 0 && stone > 0) {
      return `Echanges : +${wood} bois, +${stone} pierre`;
    }

    if (wood > 0) {
      return `Marchands : +${wood} bois`;
    }

    if (stone > 0) {
      return `Marchands : +${stone} pierre`;
    }

    return 'Marchands : ressources';
  }

  private destroyMerchantNotifications(): void {
    for (const notification of this.activeMerchantNotifications) {
      notification.destroy();
    }

    this.activeMerchantNotifications = [];
  }

  private startWoodcutterWork(): void {
    if (
      this.woodcutterWork ||
      !this.state.canUseDailyAction() ||
      !this.dailyWork.canStartWoodcutterWork(
        this.chronicle.currentDay,
        this.state.forestCurrent,
        this.state.dailyActionsRemaining,
      )
    ) {
      this.refresh();
      return;
    }

    if (!this.state.spendDailyAction()) {
      this.refresh();
      return;
    }

    this.dailyWork.markWoodcutterWorkDone(this.chronicle.currentDay);
    this.woodcutterWork = {
      attemptsDone: 0,
      successes: 0,
      cursorProgress: 0,
      cursorDirection: 1,
      ui: this.createWoodcutterWorkUi(),
    };

    this.updateWoodcutterWorkText();
    this.updateWoodcutterCursor();
    this.refresh();
  }

  private createWoodcutterWorkUi(): WoodcutterWorkUi {
    const overlay = this.add
      .rectangle(VIEW_WIDTH / 2, VIEW_HEIGHT / 2, VIEW_WIDTH, VIEW_HEIGHT, 0x000000, 0.58)
      .setInteractive({ useHandCursor: true })
      .setDepth(WOODCUTTER_OVERLAY_DEPTH);
    const panel = this.add
      .rectangle(VIEW_WIDTH / 2, VIEW_HEIGHT / 2, 760, 280, COLORS.panel)
      .setStrokeStyle(3, COLORS.line)
      .setDepth(WOODCUTTER_OVERLAY_DEPTH + 1);
    const axeIcon = this.drawAxeIcon(640, 262, COLORS.paper).setDepth(
      WOODCUTTER_OVERLAY_DEPTH + 2,
    );
    const titleText = this.add
      .text(640, 302, 'Coupe du bois', {
        color: '#f6e8bf',
        fontFamily: 'Georgia, Times New Roman, serif',
        fontSize: '30px',
      })
      .setOrigin(0.5)
      .setDepth(WOODCUTTER_OVERLAY_DEPTH + 2);
    const attemptPips = Array.from({ length: WOODCUTTER_WORK.attempts }, (_, i) =>
      this.add
        .rectangle(510 + i * 28, 338, 16, 16, COLORS.ink)
        .setStrokeStyle(1, COLORS.line)
        .setDepth(WOODCUTTER_OVERLAY_DEPTH + 2),
    );
    const successPips = Array.from(
      { length: WOODCUTTER_WORK.requiredSuccesses },
      (_, i) =>
        this.add
          .rectangle(670 + i * 28, 338, 16, 16, COLORS.ink)
          .setStrokeStyle(1, COLORS.forest)
          .setDepth(WOODCUTTER_OVERLAY_DEPTH + 2),
    );
    const barBackground = this.add
      .rectangle(
        WOODCUTTER_BAR_LEFT + WOODCUTTER_BAR_WIDTH / 2,
        WOODCUTTER_BAR_Y,
        WOODCUTTER_BAR_WIDTH,
        WOODCUTTER_BAR_HEIGHT,
        COLORS.ink,
      )
      .setStrokeStyle(2, COLORS.line)
      .setDepth(WOODCUTTER_OVERLAY_DEPTH + 2);
    const successZone = this.add
      .rectangle(
        WOODCUTTER_BAR_LEFT + WOODCUTTER_BAR_WIDTH / 2,
        WOODCUTTER_BAR_Y,
        WOODCUTTER_SUCCESS_ZONE_WIDTH,
        44,
        COLORS.forest,
      )
      .setDepth(WOODCUTTER_OVERLAY_DEPTH + 3);
    const cursor = this.add
      .rectangle(WOODCUTTER_BAR_LEFT, WOODCUTTER_BAR_Y, 12, 62, COLORS.amber)
      .setDepth(WOODCUTTER_OVERLAY_DEPTH + 4);
    const instructionText = this.add
      .text(640, 438, 'clic ou espace', {
        color: '#f6e8bf',
        fontFamily: 'Arial',
        fontSize: '20px',
      })
      .setOrigin(0.5)
      .setDepth(WOODCUTTER_OVERLAY_DEPTH + 2);

    overlay.on('pointerdown', () => {
      this.handleWoodcutterAttempt();
    });
    this.input.keyboard?.on(
      'keydown-SPACE',
      this.handleWoodcutterSpaceAttempt,
      this,
    );

    const objects = [
      overlay,
      panel,
      axeIcon,
      titleText,
      ...attemptPips,
      ...successPips,
      barBackground,
      successZone,
      cursor,
      instructionText,
    ];

    for (const object of objects) {
      (
        object as Phaser.GameObjects.GameObject & {
          setScrollFactor?: (x: number, y?: number) => Phaser.GameObjects.GameObject;
        }
      ).setScrollFactor?.(0);
    }

    return {
      objects,
      cursor,
      attemptPips,
      successPips,
    };
  }

  private handleWoodcutterSpaceAttempt(event: KeyboardEvent): void {
    if (event.repeat) {
      return;
    }

    this.handleWoodcutterAttempt();
  }

  private handleWoodcutterAttempt(): void {
    if (!this.woodcutterWork) {
      return;
    }

    if (this.isWoodcutterCursorInSuccessZone()) {
      this.woodcutterWork.successes += 1;
    }

    this.woodcutterWork.attemptsDone += 1;

    if (this.woodcutterWork.attemptsDone >= WOODCUTTER_WORK.attempts) {
      this.finishWoodcutterWork();
      return;
    }

    this.updateWoodcutterWorkText();
  }

  private finishWoodcutterWork(): void {
    if (!this.woodcutterWork) {
      return;
    }

    const isSuccessful =
      this.woodcutterWork.successes >= WOODCUTTER_WORK.requiredSuccesses;
    const woodAmount = isSuccessful
      ? WOODCUTTER_WORK.successWood
      : WOODCUTTER_WORK.failureWood;
    const chronicleText = isSuccessful
      ? WOODCUTTER_WORK.successChronicle
      : WOODCUTTER_WORK.failureChronicle;
    const newForestThresholds = this.state.harvestForestWood(woodAmount);

    for (const threshold of newForestThresholds) {
      this.chronicle.addForestThresholdEvent(threshold);
    }

    this.chronicle.addEvent(chronicleText);
    this.destroyWoodcutterWork();
    this.refresh();
  }

  private destroyWoodcutterWork(): void {
    if (!this.woodcutterWork) {
      return;
    }

    this.input.keyboard?.off(
      'keydown-SPACE',
      this.handleWoodcutterSpaceAttempt,
      this,
    );

    for (const object of this.woodcutterWork.ui.objects) {
      object.destroy();
    }

    this.woodcutterWork = undefined;
  }

  private updateWoodcutterWorkText(): void {
    if (!this.woodcutterWork) {
      return;
    }

    this.woodcutterWork.ui.attemptPips.forEach((pip, index) => {
      pip.setFillStyle(
        index < this.woodcutterWork!.attemptsDone ? COLORS.amber : COLORS.ink,
      );
    });
    this.woodcutterWork.ui.successPips.forEach((pip, index) => {
      pip.setFillStyle(
        index < this.woodcutterWork!.successes ? COLORS.forest : COLORS.ink,
      );
    });
  }

  private updateWoodcutterCursor(): void {
    if (!this.woodcutterWork) {
      return;
    }

    this.woodcutterWork.ui.cursor.setX(this.currentWoodcutterCursorX());
  }

  private isWoodcutterCursorInSuccessZone(): boolean {
    const cursorX = this.currentWoodcutterCursorX();
    const successZoneLeft =
      WOODCUTTER_BAR_LEFT +
      WOODCUTTER_BAR_WIDTH / 2 -
      WOODCUTTER_SUCCESS_ZONE_WIDTH / 2;
    const successZoneRight = successZoneLeft + WOODCUTTER_SUCCESS_ZONE_WIDTH;

    return cursorX >= successZoneLeft && cursorX <= successZoneRight;
  }

  private currentWoodcutterCursorX(): number {
    if (!this.woodcutterWork) {
      return WOODCUTTER_BAR_LEFT;
    }

    return (
      WOODCUTTER_BAR_LEFT +
      WOODCUTTER_BAR_WIDTH * this.woodcutterWork.cursorProgress
    );
  }

  private forestGaugeColor(ratio: number): number {
    if (ratio <= 0.2) {
      return COLORS.danger;
    }

    if (ratio <= 0.5) {
      return COLORS.amber;
    }

    return COLORS.forest;
  }

  private createPlaceMarker(
    x: number,
    y: number,
    color: number,
  ): Phaser.GameObjects.Graphics {
    const icon = this.add.graphics();
    icon.setPosition(x, y);
    icon.fillStyle(COLORS.ink, 0.48);
    icon.fillCircle(0, 0, 24);
    icon.fillStyle(color, 0.82);
    icon.fillCircle(0, 0, 14);
    icon.lineStyle(2, COLORS.paper, 0.5);
    icon.strokeCircle(0, 0, 24);
    icon.setDepth(3);
    return icon;
  }

  private createForestLandmark(x: number, y: number): Phaser.GameObjects.Image {
    return this.add
      .image(x, y + 2, FOREST_HEALTHY_ASSET_KEY)
      .setDisplaySize(
        FOREST_LANDMARK_WIDTH,
        this.assetHeightForWidth(FOREST_HEALTHY_ASSET_KEY, FOREST_LANDMARK_WIDTH),
      )
      .setOrigin(0.5, 0.68)
      .setDepth(3);
  }

  private createVillageLandmark(x: number, y: number): Phaser.GameObjects.Image {
    this.createContactShadow(x, y + 43, 140, 10, 2.35);

    return this.add
      .image(x, y + 8, VILLAGE_LANDMARK_ASSET_KEY)
      .setDisplaySize(
        VILLAGE_LANDMARK_WIDTH,
        this.assetHeightForWidth(VILLAGE_LANDMARK_ASSET_KEY, VILLAGE_LANDMARK_WIDTH),
      )
      .setOrigin(0.5, 0.7)
      .setDepth(3);
  }

  private createMineLandmark(x: number, y: number): Phaser.GameObjects.Image {
    this.createContactShadow(x, y + 34, 100, 8, 2.35);
    this.createMineBackground(x, y);

    return this.add
      .image(x, y + 5, MINE_ENTRANCE_ASSET_KEY)
      .setDisplaySize(
        MINE_LANDMARK_WIDTH,
        this.assetHeightForWidth(MINE_ENTRANCE_ASSET_KEY, MINE_LANDMARK_WIDTH),
      )
      .setOrigin(0.5, 0.68)
      .setDepth(3);
  }

  private createForestGroundPatch(x: number, y: number): Phaser.GameObjects.Image {
    return this.add
      .image(x, y + 22, FOREST_GROUND_PATCH_ASSET_KEY)
      .setDisplaySize(
        FOREST_GROUND_PATCH_WIDTH,
        this.assetHeightForWidth(
          FOREST_GROUND_PATCH_ASSET_KEY,
          FOREST_GROUND_PATCH_WIDTH,
        ),
      )
      .setOrigin(0.5, 0.58)
      .setDepth(2.4);
  }

  private createOldBridgeLandmark(): void {
    this.createBridgeGroundDetails();

    this.oldBridgeLandmark = this.add
      .image(OLD_BRIDGE_X, OLD_BRIDGE_Y, OLD_BRIDGE_DAMAGED_ASSET_KEY)
      .setDisplaySize(
        OLD_BRIDGE_LANDMARK_WIDTH,
        this.assetHeightForWidth(
          OLD_BRIDGE_DAMAGED_ASSET_KEY,
          OLD_BRIDGE_LANDMARK_WIDTH,
        ),
      )
      .setOrigin(0.5, 0.7)
      .setDepth(2.8);
  }

  private refreshOldBridgeLandmark(): void {
    if (!this.oldBridgeLandmark) {
      return;
    }

    const textureKey =
      this.regionalProjects.oldBridge.status === 'completed'
        ? OLD_BRIDGE_REPAIRED_ASSET_KEY
        : OLD_BRIDGE_DAMAGED_ASSET_KEY;

    this.oldBridgeLandmark.setTexture(textureKey);
    this.oldBridgeLandmark.setDisplaySize(
      OLD_BRIDGE_LANDMARK_WIDTH,
      this.assetHeightForWidth(textureKey, OLD_BRIDGE_LANDMARK_WIDTH),
    );
    this.oldBridgeLandmark.setAlpha(
      this.regionalProjects.oldBridge.status === 'not_started' ? 0.9 : 1,
    );
  }

  private createContactShadow(
    x: number,
    y: number,
    width: number,
    height: number,
    depth: number,
  ): Phaser.GameObjects.Graphics {
    const shadow = this.add.graphics();
    shadow.setDepth(depth);

    // Draw a series of thin concentric ellipses with very low opacity to build a soft blur
    const steps = 4;
    for (let i = 0; i < steps; i++) {
      const ratio = (steps - i) / steps;
      const w = width * ratio;
      const h = height * ratio;
      const alpha = 0.05 * (1 - ratio) + 0.02;

      shadow.fillStyle(COLORS.ink, alpha);
      shadow.fillEllipse(x, y, w, h);
    }

    return shadow;
  }

  private assetHeightForWidth(textureKey: string, width: number): number {
    const sourceImage = this.textures.get(textureKey).getSourceImage();

    return width * (sourceImage.height / sourceImage.width);
  }

  private drawAxeIcon(
    x: number,
    y: number,
    color: number,
  ): Phaser.GameObjects.Graphics {
    const icon = this.add.graphics();
    icon.setPosition(x, y);
    icon.lineStyle(5, color);
    icon.lineBetween(-18, 26, 18, -26);
    icon.fillStyle(color);
    icon.fillRoundedRect(7, -31, 30, 15, 3);
    icon.fillStyle(COLORS.ink);
    icon.fillRect(12, -27, 12, 8);
    return icon;
  }

  private createAmbientLightOverlay(): void {
    this.seasonOverlay = this.add
      .rectangle(0, 0, VIEW_WIDTH, VIEW_HEIGHT, 0xffffff, 0)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(8);

    this.ambientLightOverlay = this.add
      .rectangle(0, 0, VIEW_WIDTH, VIEW_HEIGHT, 0x0c102b, 0)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(10);
  }

  private setupAmbientEnvironment(): void {
    this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        const season = seasonForDay(this.chronicle.currentDay).id;
        const isNight = this.dayTimeMs >= 24000 || this.dayTimeMs < 2000;

        if (season === 'winter') {
          this.spawnSnow();
          if (Math.random() < 0.5) {
            this.spawnSnow();
          }
        } else if (season === 'autumn') {
          if (isNight) {
            if (Math.random() < 0.4) {
              this.spawnMist();
            }
          } else {
            if (Math.random() < 0.6) {
              this.spawnAutumnLeaf();
            }
          }
        } else if (season === 'summer') {
          if (isNight) {
            if (Math.random() < 0.8) {
              this.spawnFirefly();
            }
          } else {
            if (Math.random() < 0.5) {
              this.spawnPollen();
            }
          }
        } else { // spring
          if (isNight) {
            if (Math.random() < 0.5) {
              this.spawnFirefly();
            }
          } else {
            if (Math.random() < 0.6) {
              this.spawnSpringPetal();
            }
          }
        }
      },
    });
  }

  private spawnAutumnLeaf(): void {
    const colors = [0xd35400, 0xf1c40f, 0xc0392b];
    const leafColor = colors[Phaser.Math.Between(0, colors.length - 1)];
    const leaf = this.add
      .rectangle(
        Phaser.Math.Between(150, 800),
        Phaser.Math.Between(350, 750),
        Phaser.Math.Between(6, 10),
        Phaser.Math.Between(4, 6),
        leafColor,
        0.8,
      )
      .setDepth(2)
      .setAngle(Phaser.Math.Between(0, 360));

    this.tweens.add({
      targets: leaf,
      x: leaf.x + Phaser.Math.Between(100, 250),
      y: leaf.y + Phaser.Math.Between(80, 180),
      angle: leaf.angle + Phaser.Math.Between(180, 360),
      alpha: 0,
      duration: Phaser.Math.Between(3000, 5000),
      ease: 'Sine.easeOut',
      onComplete: () => {
        leaf.destroy();
      },
    });
  }

  private spawnSpringPetal(): void {
    const isPink = Math.random() < 0.6;
    const color = isPink ? 0xffb7c5 : 0xa8e6cf;
    const petal = this.add
      .ellipse(
        Phaser.Math.Between(150, 800),
        Phaser.Math.Between(350, 750),
        Phaser.Math.Between(5, 8),
        Phaser.Math.Between(3, 5),
        color,
        0.85,
      )
      .setDepth(2)
      .setAngle(Phaser.Math.Between(0, 360));

    this.tweens.add({
      targets: petal,
      x: petal.x + Phaser.Math.Between(70, 180),
      y: petal.y + Phaser.Math.Between(30, 90),
      angle: petal.angle + Phaser.Math.Between(90, 270),
      alpha: 0,
      duration: Phaser.Math.Between(2500, 4500),
      ease: 'Sine.easeOut',
      onComplete: () => {
        petal.destroy();
      },
    });
  }

  private spawnPollen(): void {
    const pollen = this.add
      .circle(
        Phaser.Math.Between(100, 1800),
        Phaser.Math.Between(200, 900),
        Phaser.Math.Between(1, 2),
        0xfffae6,
        0.6,
      )
      .setDepth(2);

    this.tweens.add({
      targets: pollen,
      x: pollen.x + Phaser.Math.Between(-30, 30),
      y: pollen.y - Phaser.Math.Between(40, 100),
      alpha: 0,
      duration: Phaser.Math.Between(3000, 5000),
      ease: 'Sine.easeOut',
      onComplete: () => {
        pollen.destroy();
      },
    });
  }

  private spawnMist(): void {
    const mist = this.add
      .rectangle(
        Phaser.Math.Between(100, 1600),
        Phaser.Math.Between(300, 800),
        Phaser.Math.Between(100, 250),
        Phaser.Math.Between(15, 30),
        0xffffff,
        0.05,
      )
      .setDepth(2);

    this.tweens.add({
      targets: mist,
      x: mist.x + Phaser.Math.Between(50, 150),
      alpha: 0,
      duration: Phaser.Math.Between(4000, 6000),
      ease: 'Sine.easeInOut',
      onComplete: () => {
        mist.destroy();
      },
    });
  }

  private spawnSnow(): void {
    const size = Phaser.Math.Between(2, 5);
    const snowflake = this.add
      .circle(
        Phaser.Math.Between(0, VIEW_WIDTH),
        -10,
        size / 2,
        0xffffff,
        Phaser.Math.Between(60, 95) / 100,
      )
      .setScrollFactor(0)
      .setDepth(15);

    const speed = Phaser.Math.Between(3500, 6000);
    const drift = Phaser.Math.Between(-80, 80);

    this.tweens.add({
      targets: snowflake,
      y: VIEW_HEIGHT + 10,
      x: snowflake.x + drift,
      duration: speed,
      ease: 'Linear',
      onComplete: () => {
        snowflake.destroy();
      },
    });
  }

  private spawnFirefly(): void {
    const firefly = this.add
      .circle(
        Phaser.Math.Between(150, 1750),
        Phaser.Math.Between(200, 950),
        2,
        0xf0c35b,
        0.85,
      )
      .setDepth(15);

    this.tweens.add({
      targets: firefly,
      x: firefly.x + Phaser.Math.Between(-40, 40),
      y: firefly.y + Phaser.Math.Between(-40, 40),
      alpha: 0,
      duration: Phaser.Math.Between(1800, 2800),
      ease: 'Sine.easeInOut',
      onComplete: () => {
        firefly.destroy();
      },
    });
  }

  private showProductionFloatingText(activity: Activity): void {
    const place = PLACES.find((p) => p.activity === activity);
    if (!place) {
      return;
    }

    const spawnY = place.y - 75;
    const textStr = activity === 'forest' ? '+1 Bois' : '+1 Pierre';
    const textColor = activity === 'forest' ? '#d5be82' : '#a7b1ad';

    const floatingText = this.add
      .text(place.x, spawnY, textStr, {
        color: textColor,
        fontFamily: 'Georgia, Times New Roman, serif',
        fontSize: '18px',
        align: 'center',
        shadow: { color: '#111a18', blur: 3, fill: true },
      })
      .setOrigin(0.5)
      .setDepth(15);

    this.tweens.add({
      targets: floatingText,
      y: spawnY - 35,
      alpha: 0,
      duration: 1200,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        floatingText.destroy();
      },
    });
  }

  private updateAmbientLight(): void {
    if (!this.ambientLightOverlay) {
      return;
    }

    let overlayColor = 0x0c102b;
    let overlayAlpha = 0;

    const progress = this.dayTimeMs;

    if (progress < 4000) {
      if (progress < 2000) {
        const t = progress / 2000;
        overlayColor = Phaser.Display.Color.Interpolate.ColorWithColor(
          Phaser.Display.Color.ValueToColor(0x0c102b),
          Phaser.Display.Color.ValueToColor(0xf2994a),
          1,
          t,
        ).color;
        overlayAlpha = 0.38 * (1 - t) + 0.25 * t;
      } else {
        const t = (progress - 2000) / 2000;
        overlayColor = 0xf2994a;
        overlayAlpha = 0.25 * (1 - t);
      }
    } else if (progress >= 4000 && progress < 20000) {
      overlayAlpha = 0;
    } else if (progress >= 20000 && progress < 24000) {
      const t = (progress - 20000) / 4000;
      overlayColor = 0xd05a3f;
      overlayAlpha = 0.28 * t;
    } else {
      if (progress < 26000) {
        const t = (progress - 24000) / 2000;
        overlayColor = Phaser.Display.Color.Interpolate.ColorWithColor(
          Phaser.Display.Color.ValueToColor(0xd05a3f),
          Phaser.Display.Color.ValueToColor(0x0c102b),
          1,
          t,
        ).color;
        overlayAlpha = 0.28 * (1 - t) + 0.38 * t;
      } else {
        overlayColor = 0x0c102b;
        overlayAlpha = 0.38;
      }
    }

    this.ambientLightOverlay.setFillStyle(overlayColor, overlayAlpha);
  }

  private updateSeasonOverlay(): void {
    if (!this.seasonOverlay) {
      return;
    }

    const currentSeason = seasonForDay(this.chronicle.currentDay).id;
    let color = 0xffffff;
    let alpha = 0;

    switch (currentSeason) {
      case 'spring':
        color = 0xe5ffd6;
        alpha = 0.06;
        break;
      case 'summer':
        color = 0xffe599;
        alpha = 0.08;
        break;
      case 'autumn':
        color = 0xd58a3c;
        alpha = 0.14;
        break;
      case 'winter':
        color = 0xe2f0f9;
        alpha = 0.22;
        break;
    }

    this.seasonOverlay.setFillStyle(color, alpha);
  }

  private createMineBackground(x: number, y: number): void {
    const bg = this.add.graphics();
    bg.setDepth(2.2);

    // Draw overlapping rock circles to form a soft rocky mound
    bg.fillStyle(COLORS.mine, 0.7);

    // Center mound
    bg.fillCircle(x, y + 15, 48);
    // Left shoulder
    bg.fillCircle(x - 45, y + 22, 34);
    // Right shoulder
    bg.fillCircle(x + 45, y + 22, 34);
    // Outer edges
    bg.fillCircle(x - 75, y + 26, 20);
    bg.fillCircle(x + 75, y + 26, 20);

    // Draw outlines for each rock circle
    bg.lineStyle(2, COLORS.grassDark, 0.25);
    bg.strokeCircle(x, y + 15, 48);
    bg.strokeCircle(x - 45, y + 22, 34);
    bg.strokeCircle(x + 45, y + 22, 34);
    bg.strokeCircle(x - 75, y + 26, 20);
    bg.strokeCircle(x + 75, y + 26, 20);

    // Add some small rock boulders scattered around the base
    const rockPositions = [
      { rx: -75, ry: 20, r: 8 },
      { rx: -60, ry: 28, r: 12 },
      { rx: 65, ry: 24, r: 9 },
      { rx: 80, ry: 20, r: 7 },
    ];
    bg.fillStyle(0x6b7472, 0.7);
    for (const rock of rockPositions) {
      bg.fillCircle(x + rock.rx, y + rock.ry, rock.r);
      bg.lineStyle(1.5, COLORS.ink, 0.4);
      bg.strokeCircle(x + rock.rx, y + rock.ry, rock.r);
    }
  }

  private createForestGroundDetails(x: number, y: number): void {
    const details = this.add.graphics();
    details.setDepth(2.6);

    const bushes = [
      { bx: -110, by: 40, r: 14 },
      { bx: -95, by: 50, r: 18 },
      { bx: 95, by: 45, r: 16 },
      { bx: 110, by: 35, r: 12 },
      { bx: -40, by: 55, r: 15 },
      { bx: 50, by: 55, r: 17 },
    ];

    for (const bush of bushes) {
      details.fillStyle(COLORS.forest, 0.65);
      details.fillCircle(x + bush.bx, y + bush.by, bush.r);
      details.lineStyle(1.5, COLORS.grassDark, 0.4);
      details.strokeCircle(x + bush.bx, y + bush.by, bush.r);
    }
  }

  private createBridgeGroundDetails(): void {
    const details = this.add.graphics();
    details.setDepth(1.8);

    details.fillStyle(0x8a9491, 0.8);

    details.fillCircle(OLD_BRIDGE_X - 42, OLD_BRIDGE_Y + 12, 12);
    details.fillCircle(OLD_BRIDGE_X - 35, OLD_BRIDGE_Y + 22, 9);

    details.fillCircle(OLD_BRIDGE_X + 42, OLD_BRIDGE_Y - 12, 12);
    details.fillCircle(OLD_BRIDGE_X + 35, OLD_BRIDGE_Y - 22, 9);

    details.lineStyle(1.5, COLORS.ink, 0.4);
    details.strokeCircle(OLD_BRIDGE_X - 42, OLD_BRIDGE_Y + 12, 12);
    details.strokeCircle(OLD_BRIDGE_X - 35, OLD_BRIDGE_Y + 22, 9);
    details.strokeCircle(OLD_BRIDGE_X + 42, OLD_BRIDGE_Y - 12, 12);
    details.strokeCircle(OLD_BRIDGE_X + 35, OLD_BRIDGE_Y - 22, 9);
  }

  private drawPaths(): void {
    if (!this.pathsGraphics) {
      return;
    }
    this.pathsGraphics.clear();

    const pathColor = 0xc5a880;
    const centerColor = 0xe5d0b0;

    const villageToBridge = [
      { x: 1430, y: 645 },
      { x: 1350, y: 720 },
      { x: 1235, y: 805 },
    ];
    this.drawPathPoints(villageToBridge, 16, pathColor, 0.4);
    this.drawPathPoints(villageToBridge, 4, centerColor, 0.28);

    const villageToMine = [
      { x: 1430, y: 645 },
      { x: 1200, y: 580 },
      { x: 1050, y: 520 },
      { x: 910, y: 455 },
    ];
    this.drawPathPoints(villageToMine, 16, pathColor, 0.4);
    this.drawPathPoints(villageToMine, 4, centerColor, 0.28);

    const bridgeToWest = [
      { x: 1235, y: 805 },
      { x: 1220, y: 815 },
      { x: 1080, y: 870 },
      { x: 950, y: 910 },
      { x: 780, y: 940 },
      { x: 600, y: 970 },
      { x: 400, y: 1000 },
      { x: 200, y: 1020 },
      { x: -50, y: 1040 },
    ];
    this.drawPathPoints(bridgeToWest, 16, pathColor, 0.4);
    this.drawPathPoints(bridgeToWest, 4, centerColor, 0.28);

    const forestRoadStatus = this.regionalProjects.forestRoad.status;
    const villageToForest = [
      { x: 1430, y: 645 },
      { x: 1280, y: 640 },
      { x: 1080, y: 620 },
      { x: 880, y: 580 },
      { x: 680, y: 560 },
      { x: 510, y: 580 },
      { x: 360, y: 610 },
    ];

    if (forestRoadStatus === 'completed') {
      this.drawPathPoints(villageToForest, 16, pathColor, 0.45);
      this.drawPathPoints(villageToForest, 4, centerColor, 0.32);
    } else if (forestRoadStatus === 'in_progress') {
      this.drawPathPoints(villageToForest, 10, pathColor, 0.22);
      this.drawPathPoints(villageToForest, 3, centerColor, 0.15);
    } else {
      this.drawPathPoints(villageToForest, 6, pathColor, 0.08);
    }
  }

  private drawPathPoints(
    points: Array<{ x: number; y: number }>,
    width: number,
    color: number,
    alpha: number,
  ): void {
    if (points.length < 2) {
      return;
    }
    this.pathsGraphics.lineStyle(width, color, alpha);
    this.pathsGraphics.beginPath();
    this.pathsGraphics.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      this.pathsGraphics.lineTo(points[i].x, points[i].y);
    }
    this.pathsGraphics.strokePath();
  }
}
