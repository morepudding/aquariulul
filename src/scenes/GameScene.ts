import Phaser from 'phaser';
import { DailyWork, WOODCUTTER_WORK } from '../systems/DailyWork';
import { GameState, type Activity } from '../systems/GameState';
import {
  OLD_BRIDGE_PROJECT,
  RegionalProjects,
} from '../systems/RegionalProjects';
import { WorldChronicle } from '../systems/WorldChronicle';
import { Hud } from '../ui/Hud';

const DAY_DURATION_SECONDS = 30;
const FOREST_REGENERATION_DELAY = 10000;
const WOODCUTTER_BAR_LEFT = 190;
const WOODCUTTER_BAR_Y = 355;
const WOODCUTTER_BAR_WIDTH = 520;
const WOODCUTTER_BAR_HEIGHT = 18;
const WOODCUTTER_SUCCESS_ZONE_WIDTH = 125;
const WOODCUTTER_CURSOR_SPEED = 170;

const PLACES: Array<{
  activity: Activity;
  label: string;
  x: number;
  y: number;
  color: number;
}> = [
  { activity: 'forest', label: 'Forêt', x: 190, y: 625, color: 0x315f3c },
  { activity: 'mine', label: 'Mine', x: 450, y: 625, color: 0x65615c },
  { activity: 'village', label: 'Village', x: 710, y: 625, color: 0x8a6d3b },
];

type WoodcutterWorkUi = {
  objects: Phaser.GameObjects.GameObject[];
  cursor: Phaser.GameObjects.Rectangle;
  attemptsText: Phaser.GameObjects.Text;
  successesText: Phaser.GameObjects.Text;
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
  private chronicle!: WorldChronicle;
  private hud!: Hud;
  private nextDayInSeconds = DAY_DURATION_SECONDS;
  private placeShapes = new Map<Activity, Phaser.GameObjects.Rectangle>();
  private placeLabels = new Map<Activity, Phaser.GameObjects.Text>();
  private forestExhaustedText?: Phaser.GameObjects.Text;
  private woodcutterWork?: WoodcutterWorkState;

  constructor() {
    super('GameScene');
  }

  create(): void {
    this.state = new GameState();
    this.dailyWork = new DailyWork();
    this.regionalProjects = new RegionalProjects();
    this.chronicle = new WorldChronicle();
    this.hud = new Hud(
      this,
      this.state,
      this.dailyWork,
      this.regionalProjects,
      this.chronicle,
      () => {
        this.startWoodcutterWork();
      },
      () => {
        this.fundOldBridge();
      },
      () => {
        this.resetSave();
      },
    );

    this.createPlaces();
    this.refresh();

    this.time.addEvent({
      delay: 2000,
      loop: true,
      callback: () => {
        const newForestThresholds = this.state.produce();

        for (const threshold of newForestThresholds) {
          this.chronicle.addForestThresholdEvent(threshold);
        }

        this.refresh();
      },
    });

    this.time.addEvent({
      delay: FOREST_REGENERATION_DELAY,
      loop: true,
      callback: () => {
        this.state.regenerateForest();
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
          for (const eventText of this.regionalProjects.advanceDay()) {
            this.chronicle.addEvent(eventText);
          }
          this.nextDayInSeconds = DAY_DURATION_SECONDS;
        }

        this.refresh();
      },
    });
  }

  update(_time: number, delta: number): void {
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

  private createPlaces(): void {
    for (const place of PLACES) {
      const shape = this.add
        .rectangle(place.x, place.y, 190, 95, place.color)
        .setStrokeStyle(3, 0xf2eee5)
        .setInteractive({ useHandCursor: true });

      const label = this.add
        .text(place.x, place.y, place.label, {
          color: '#ffffff',
          fontFamily: 'Arial',
          fontSize: '26px',
        })
        .setOrigin(0.5);

      shape.on('pointerdown', () => {
        this.state.setActivity(place.activity);
        this.refresh();
      });

      this.placeShapes.set(place.activity, shape);
      this.placeLabels.set(place.activity, label);

      if (place.activity === 'forest') {
        this.forestExhaustedText = this.add
          .text(place.x, place.y + 30, 'Forêt épuisée', {
            color: '#f2eee5',
            fontFamily: 'Arial',
            fontSize: '16px',
          })
          .setOrigin(0.5)
          .setVisible(false);
      }
    }
  }

  private refresh(): void {
    this.hud.refresh(this.nextDayInSeconds, this.woodcutterWork !== undefined);

    for (const place of PLACES) {
      const shape = this.placeShapes.get(place.activity);
      const label = this.placeLabels.get(place.activity);

      if (!shape) {
        continue;
      }

      const isUnavailable =
        place.activity === 'forest' && !this.state.canUseForest();
      const isActive = this.state.activity === place.activity && !isUnavailable;

      if (isUnavailable) {
        shape.disableInteractive();
      } else if (!shape.input?.enabled) {
        shape.setInteractive({ useHandCursor: true });
      }

      shape.setFillStyle(isUnavailable ? 0x2f3630 : place.color);
      shape.setStrokeStyle(
        isActive ? 6 : 3,
        isActive ? 0xffd36d : isUnavailable ? 0x7f8880 : 0xf2eee5,
      );

      label?.setAlpha(isUnavailable ? 0.55 : 1);

      if (place.activity === 'forest') {
        this.forestExhaustedText?.setVisible(isUnavailable);
      }
    }
  }

  private resetSave(): void {
    this.destroyWoodcutterWork();
    this.state.reset();
    this.dailyWork.reset();
    this.regionalProjects.reset();
    this.chronicle.reset();
    this.nextDayInSeconds = DAY_DURATION_SECONDS;
    this.refresh();
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

  private startWoodcutterWork(): void {
    if (
      this.woodcutterWork ||
      !this.dailyWork.canStartWoodcutterWork(
        this.chronicle.currentDay,
        this.state.forestCurrent,
      )
    ) {
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
      .rectangle(450, 345, 900, 690, 0x000000, 0.45)
      .setInteractive({ useHandCursor: true })
      .setDepth(10);
    const panel = this.add
      .rectangle(450, 345, 650, 250, 0x2b3137)
      .setStrokeStyle(2, 0xf2eee5)
      .setDepth(11);
    const titleText = this.add
      .text(450, 245, WOODCUTTER_WORK.name, {
        color: '#f2eee5',
        fontFamily: 'Arial',
        fontSize: '24px',
      })
      .setOrigin(0.5)
      .setDepth(12);
    const attemptsText = this.add
      .text(210, 285, '', {
        color: '#f2eee5',
        fontFamily: 'Arial',
        fontSize: '18px',
      })
      .setDepth(12);
    const successesText = this.add
      .text(525, 285, '', {
        color: '#f2eee5',
        fontFamily: 'Arial',
        fontSize: '18px',
      })
      .setDepth(12);
    const barBackground = this.add
      .rectangle(
        WOODCUTTER_BAR_LEFT + WOODCUTTER_BAR_WIDTH / 2,
        WOODCUTTER_BAR_Y,
        WOODCUTTER_BAR_WIDTH,
        WOODCUTTER_BAR_HEIGHT,
        0x151a1f,
      )
      .setStrokeStyle(2, 0xf2eee5)
      .setDepth(12);
    const successZone = this.add
      .rectangle(
        WOODCUTTER_BAR_LEFT + WOODCUTTER_BAR_WIDTH / 2,
        WOODCUTTER_BAR_Y,
        WOODCUTTER_SUCCESS_ZONE_WIDTH,
        34,
        0x7aa35a,
      )
      .setDepth(13);
    const cursor = this.add
      .rectangle(WOODCUTTER_BAR_LEFT, WOODCUTTER_BAR_Y, 10, 54, 0xffd36d)
      .setDepth(14);
    const instructionText = this.add
      .text(
        450,
        430,
        'Cliquez ou appuyez sur Espace quand le curseur est dans la zone.',
        {
          color: '#f2eee5',
          fontFamily: 'Arial',
          fontSize: '16px',
          wordWrap: { width: 560 },
        },
      )
      .setOrigin(0.5)
      .setDepth(12);

    overlay.on('pointerdown', () => {
      this.handleWoodcutterAttempt();
    });
    this.input.keyboard?.on(
      'keydown-SPACE',
      this.handleWoodcutterSpaceAttempt,
      this,
    );

    return {
      objects: [
        overlay,
        panel,
        titleText,
        attemptsText,
        successesText,
        barBackground,
        successZone,
        cursor,
        instructionText,
      ],
      cursor,
      attemptsText,
      successesText,
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

    const attemptsRemaining =
      WOODCUTTER_WORK.attempts - this.woodcutterWork.attemptsDone;

    this.woodcutterWork.ui.attemptsText.setText(
      `Tentatives restantes : ${attemptsRemaining}`,
    );
    this.woodcutterWork.ui.successesText.setText(
      `Coups réussis : ${this.woodcutterWork.successes}`,
    );
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
}
