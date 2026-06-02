import Phaser from 'phaser';
import type { DailyWork } from '../systems/DailyWork';
import {
  DAILY_ACTIONS_PER_DAY,
  type Activity,
  type GameState,
} from '../systems/GameState';
import {
  FOREST_ROAD_PROJECT,
  MINE_SUPPORTS_PROJECT,
  OLD_BRIDGE_PROJECT,
  type RegionalProjects,
} from '../systems/RegionalProjects';
import { seasonForDay } from '../systems/Seasons';
import type { VillageRequests } from '../systems/VillageRequests';
import type { WorldChronicle } from '../systems/WorldChronicle';

const DAY_DURATION_SECONDS = 30;
const HUD_DEPTH = 100;
const NEXT_DAY_GAUGE_WIDTH = 86;
const FOREST_GAUGE_WIDTH = 106;
const PROJECT_GAUGE_WIDTH = 76;

const COLORS = {
  ink: 0x111a18,
  veil: 0x16231f,
  line: 0xe3c978,
  paper: 0xf7eac2,
  muted: 0xc4b98d,
  wood: 0xb8793c,
  stone: 0xa7b1ad,
  forest: 0x5d995a,
  mine: 0x8a9491,
  village: 0xc48b55,
  amber: 0xf0c35b,
  danger: 0xaa5548,
};

const TEXT = {
  paper: '#f7eac2',
  muted: '#c4b98d',
};

const ACTIVITY_LABELS: Record<Activity, string> = {
  forest: 'Foret',
  mine: 'Mine',
  village: 'Village',
};

const ACTIVITY_COLORS: Record<Activity, number> = {
  forest: COLORS.forest,
  mine: COLORS.mine,
  village: COLORS.village,
};

type SpeedButton = {
  multiplier: number;
  button: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
};

type VisibleHudObject = Phaser.GameObjects.GameObject & {
  setVisible: (visible: boolean) => Phaser.GameObjects.GameObject;
};

export class Hud {
  private dayText!: Phaser.GameObjects.Text;
  private seasonText!: Phaser.GameObjects.Text;
  private nextDayFill!: Phaser.GameObjects.Rectangle;
  private nextDayText!: Phaser.GameObjects.Text;
  private activityText!: Phaser.GameObjects.Text;
  private woodText!: Phaser.GameObjects.Text;
  private stoneText!: Phaser.GameObjects.Text;
  private forestFill!: Phaser.GameObjects.Rectangle;
  private forestText!: Phaser.GameObjects.Text;
  private chronicleText!: Phaser.GameObjects.Text;
  private dailyActionsText!: Phaser.GameObjects.Text;
  private bridgeFill!: Phaser.GameObjects.Rectangle;
  private bridgeStatusText!: Phaser.GameObjects.Text;
  private roadFill!: Phaser.GameObjects.Rectangle;
  private roadStatusText!: Phaser.GameObjects.Text;
  private roadFundButton!: Phaser.GameObjects.Rectangle;
  private roadFundButtonLabel!: Phaser.GameObjects.Text;
  private roadObjects: VisibleHudObject[] = [];
  private mineSupportsFill!: Phaser.GameObjects.Rectangle;
  private mineSupportsStatusText!: Phaser.GameObjects.Text;
  private mineSupportsFundButton!: Phaser.GameObjects.Rectangle;
  private mineSupportsFundButtonLabel!: Phaser.GameObjects.Text;
  private mineSupportsObjects: VisibleHudObject[] = [];
  private villageRequestNameText!: Phaser.GameObjects.Text;
  private villageRequestCostText!: Phaser.GameObjects.Text;
  private villageRequestDaysText!: Phaser.GameObjects.Text;
  private villageRequestHelpButton!: Phaser.GameObjects.Rectangle;
  private villageRequestHelpButtonLabel!: Phaser.GameObjects.Text;
  private villageRequestObjects: VisibleHudObject[] = [];
  private fundButton!: Phaser.GameObjects.Rectangle;
  private fundButtonLabel!: Phaser.GameObjects.Text;
  private harvestWoodButton!: Phaser.GameObjects.Rectangle;
  private harvestWoodButtonLabel!: Phaser.GameObjects.Text;
  private workButton!: Phaser.GameObjects.Rectangle;
  private workButtonLabel!: Phaser.GameObjects.Text;
  private extractStoneButton!: Phaser.GameObjects.Rectangle;
  private extractStoneButtonLabel!: Phaser.GameObjects.Text;
  private speedButtons: SpeedButton[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly state: GameState,
    private readonly dailyWork: DailyWork,
    private readonly regionalProjects: RegionalProjects,
    private readonly villageRequests: VillageRequests,
    private readonly chronicle: WorldChronicle,
    onHarvestWood: () => void,
    onStartWoodcutterWork: () => void,
    onExtractStone: () => void,
    onFundOldBridge: () => void,
    onFundForestRoad: () => void,
    onFundMineSupports: () => void,
    onCompleteVillageRequest: () => void,
    onReset: () => void,
    onSetSpeed: (speedMultiplier: number) => void,
  ) {
    this.createTopStatus();
    this.createActionDock(
      onHarvestWood,
      onStartWoodcutterWork,
      onExtractStone,
      onFundOldBridge,
      onFundForestRoad,
      onFundMineSupports,
      onReset,
      onSetSpeed,
    );
    this.createVillageRequestStrip(onCompleteVillageRequest);
    this.createChronicleStrip();
  }

  refresh(
    nextDayInSeconds: number,
    isWoodcutterWorkActive: boolean,
    speedMultiplier: number,
  ): void {
    const forestRatio = Phaser.Math.Clamp(
      this.state.forestCurrent / this.state.forestMax,
      0,
      1,
    );
    const dayRatio = Phaser.Math.Clamp(
      nextDayInSeconds / DAY_DURATION_SECONDS,
      0,
      1,
    );

    this.dayText.setText(`J${this.chronicle.currentDay}`);
    const season = seasonForDay(this.chronicle.currentDay);
    this.seasonText.setText(`${season.label} · Jour ${season.dayInSeason}/10`);
    this.nextDayText.setText(`${nextDayInSeconds}s`);
    this.nextDayFill.setDisplaySize(NEXT_DAY_GAUGE_WIDTH * dayRatio, 4);
    this.activityText.setText(ACTIVITY_LABELS[this.state.activity]);
    this.activityText.setColor(this.hexText(ACTIVITY_COLORS[this.state.activity]));
    this.woodText.setText(`${this.state.resources.wood}`);
    this.stoneText.setText(`${this.state.resources.stone}`);
    this.forestText.setText(`${this.state.forestCurrent}/${this.state.forestMax}`);
    this.dailyActionsText.setText(
      `Actions : ${this.state.dailyActionsRemaining}/${DAILY_ACTIONS_PER_DAY}`,
    );
    this.forestFill.setDisplaySize(FOREST_GAUGE_WIDTH * forestRatio, 5);
    this.forestFill.setFillStyle(this.forestGaugeColor(forestRatio));

    this.refreshBridge();
    this.refreshForestRoad();
    this.refreshMineSupports();
    this.refreshVillageRequest();
    this.refreshFundButton();
    this.refreshHarvestWoodButton(isWoodcutterWorkActive);
    this.refreshWorkButton(isWoodcutterWorkActive);
    this.refreshExtractStoneButton(isWoodcutterWorkActive);
    this.refreshSpeedButtons(speedMultiplier);
    this.chronicleText.setText(
      this.chronicle.events
        .slice(0, 1)
        .map((event) => `J${event.day}  ${event.text}`)
        .join('\n'),
    );
  }

  private createTopStatus(): void {
    this.glassPanel(24, 20, 852, 50, 0.26);
    this.dayText = this.text(42, 29, '', this.valueStyle(23));
    this.seasonText = this.text(94, 34, '', this.labelStyle(13));

    this.gaugeBack(268, 52, NEXT_DAY_GAUGE_WIDTH, 4);
    this.nextDayFill = this.rect(268, 52, NEXT_DAY_GAUGE_WIDTH, 4, COLORS.amber, 0.95);
    this.nextDayFill.setOrigin(0, 0.5);
    this.nextDayText = this.text(364, 36, '', this.labelStyle(13));

    this.text(424, 31, 'act.', this.labelStyle(11));
    this.activityText = this.text(460, 29, '', this.valueStyle(18));

    this.resourceInline(548, 45, COLORS.wood, () => this.drawWood(548, 45));
    this.woodText = this.text(572, 30, '', this.valueStyle(20));

    this.resourceInline(636, 45, COLORS.stone, () => this.drawStone(636, 45));
    this.stoneText = this.text(660, 30, '', this.valueStyle(20));

    this.text(724, 31, 'Foret', this.labelStyle(11));
    this.forestText = this.text(766, 31, '', this.labelStyle(13));
    this.gaugeBack(766, 53, FOREST_GAUGE_WIDTH, 5);
    this.forestFill = this.rect(766, 53, FOREST_GAUGE_WIDTH, 5, COLORS.forest, 0.95);
    this.forestFill.setOrigin(0, 0.5);
  }

  private createActionDock(
    onHarvestWood: () => void,
    onStartWoodcutterWork: () => void,
    onExtractStone: () => void,
    onFundOldBridge: () => void,
    onFundForestRoad: () => void,
    onFundMineSupports: () => void,
    onReset: () => void,
    onSetSpeed: (speedMultiplier: number) => void,
  ): void {
    this.glassPanel(880, 20, 336, 86, 0.24);
    this.dailyActionsText = this.text(898, 28, '', this.labelStyle(13));

    this.harvestWoodButton = this.rect(918, 72, 62, 26, COLORS.forest, 0.46);
    this.harvestWoodButton.setStrokeStyle(1, COLORS.line, 0.55);
    this.harvestWoodButton.setInteractive({ useHandCursor: true });
    this.harvestWoodButtonLabel = this.text(918, 64, 'Bois', this.buttonStyle(12));
    this.harvestWoodButtonLabel.setOrigin(0.5, 0);
    this.harvestWoodButtonLabel.setInteractive({ useHandCursor: true });
    this.harvestWoodButton.on('pointerdown', onHarvestWood);
    this.harvestWoodButtonLabel.on('pointerdown', onHarvestWood);

    this.workButton = this.rect(1018, 72, 66, 26, COLORS.forest, 0.46);
    this.workButton.setStrokeStyle(1, COLORS.line, 0.55);
    this.workButton.setInteractive({ useHandCursor: true });
    this.workButtonLabel = this.text(1018, 64, 'Couper', this.buttonStyle(12));
    this.workButtonLabel.setOrigin(0.5, 0);
    this.workButtonLabel.setInteractive({ useHandCursor: true });
    this.workButton.on('pointerdown', onStartWoodcutterWork);
    this.workButtonLabel.on('pointerdown', onStartWoodcutterWork);

    this.extractStoneButton = this.rect(1096, 72, 62, 26, COLORS.forest, 0.46);
    this.extractStoneButton.setStrokeStyle(1, COLORS.line, 0.55);
    this.extractStoneButton.setInteractive({ useHandCursor: true });
    this.extractStoneButtonLabel = this.text(
      1096,
      64,
      'Pierre',
      this.buttonStyle(12),
    );
    this.extractStoneButtonLabel.setOrigin(0.5, 0);
    this.extractStoneButtonLabel.setInteractive({ useHandCursor: true });
    this.extractStoneButton.on('pointerdown', onExtractStone);
    this.extractStoneButtonLabel.on('pointerdown', onExtractStone);

    this.speedButtons = [1, 2, 3, 4, 5].map((multiplier, index) => {
      const x = 1038 + index * 32;
      const button = this.rect(x, 45, 27, 24, COLORS.ink, 0.3);
      button.setStrokeStyle(1, COLORS.line, 0.4);
      button.setInteractive({ useHandCursor: true });
      const label = this.text(x, 37, `x${multiplier}`, this.buttonStyle(11));
      label.setOrigin(0.5, 0);
      label.setInteractive({ useHandCursor: true });
      button.on('pointerdown', () => {
        onSetSpeed(multiplier);
      });
      label.on('pointerdown', () => {
        onSetSpeed(multiplier);
      });

      return {
        multiplier,
        button,
        label,
      };
    });

    const resetButton = this.rect(1194, 45, 24, 24, COLORS.danger, 0.34);
    resetButton.setStrokeStyle(1, COLORS.line, 0.45);
    resetButton.setInteractive({ useHandCursor: true });
    this.text(1194, 37, 'R', this.buttonStyle(12)).setOrigin(0.5, 0);
    resetButton.on('pointerdown', onReset);

    this.glassPanel(880, 590, 336, 106, 0.24);
    this.text(898, 601, 'Projets', this.labelStyle(12));

    this.drawBridge(936, 618, 0.24, COLORS.line);
    this.text(958, 610, `Pont ${OLD_BRIDGE_PROJECT.costWood}b`, this.labelStyle(12));
    this.gaugeBack(958, 627, PROJECT_GAUGE_WIDTH, 4);
    this.bridgeFill = this.rect(958, 627, PROJECT_GAUGE_WIDTH, 4, COLORS.amber, 0.95);
    this.bridgeFill.setOrigin(0, 0.5);
    this.bridgeStatusText = this.text(1126, 610, '', this.labelStyle(12));

    this.fundButton = this.rect(1186, 618, 24, 24, COLORS.forest, 0.42);
    this.fundButton.setStrokeStyle(1, COLORS.line, 0.5);
    this.fundButton.setInteractive({ useHandCursor: true });
    this.fundButtonLabel = this.text(1186, 609, '+', this.buttonStyle(18));
    this.fundButtonLabel.setOrigin(0.5);
    this.fundButtonLabel.setInteractive({ useHandCursor: true });
    this.fundButton.on('pointerdown', onFundOldBridge);
    this.fundButtonLabel.on('pointerdown', onFundOldBridge);

    const roadIcon = this.drawRoad(936, 650, 0.25, COLORS.line);
    const roadLabel = this.text(958, 641, 'Route foret', this.labelStyle(12));
    const roadCost = this.text(
      1048,
      641,
      `${FOREST_ROAD_PROJECT.costWood}b ${FOREST_ROAD_PROJECT.costStone}p`,
      this.labelStyle(11),
    );
    const roadGaugeBack = this.gaugeBack(958, 659, PROJECT_GAUGE_WIDTH, 4);
    this.roadFill = this.rect(958, 659, PROJECT_GAUGE_WIDTH, 4, COLORS.amber, 0.95);
    this.roadFill.setOrigin(0, 0.5);
    this.roadStatusText = this.text(1126, 641, '', this.labelStyle(12));

    this.roadFundButton = this.rect(1186, 650, 24, 24, COLORS.forest, 0.42);
    this.roadFundButton.setStrokeStyle(1, COLORS.line, 0.5);
    this.roadFundButton.setInteractive({ useHandCursor: true });
    this.roadFundButtonLabel = this.text(1186, 641, '+', this.buttonStyle(18));
    this.roadFundButtonLabel.setOrigin(0.5);
    this.roadFundButtonLabel.setInteractive({ useHandCursor: true });
    this.roadFundButton.on('pointerdown', onFundForestRoad);
    this.roadFundButtonLabel.on('pointerdown', onFundForestRoad);

    this.roadObjects = [
      roadIcon,
      roadLabel,
      roadCost,
      roadGaugeBack,
      this.roadFill,
      this.roadStatusText,
      this.roadFundButton,
      this.roadFundButtonLabel,
    ];

    const mineSupportsIcon = this.drawMineSupports(936, 682, 0.25, COLORS.line);
    const mineSupportsLabel = this.text(958, 673, 'Etayer mine', this.labelStyle(12));
    const mineSupportsCost = this.text(
      1048,
      673,
      `${MINE_SUPPORTS_PROJECT.costWood}b ${MINE_SUPPORTS_PROJECT.costStone}p`,
      this.labelStyle(11),
    );
    const mineSupportsGaugeBack = this.gaugeBack(958, 690, PROJECT_GAUGE_WIDTH, 4);
    this.mineSupportsFill = this.rect(
      958,
      690,
      PROJECT_GAUGE_WIDTH,
      4,
      COLORS.amber,
      0.95,
    );
    this.mineSupportsFill.setOrigin(0, 0.5);
    this.mineSupportsStatusText = this.text(1126, 673, '', this.labelStyle(12));

    this.mineSupportsFundButton = this.rect(1186, 682, 24, 24, COLORS.forest, 0.42);
    this.mineSupportsFundButton.setStrokeStyle(1, COLORS.line, 0.5);
    this.mineSupportsFundButton.setInteractive({ useHandCursor: true });
    this.mineSupportsFundButtonLabel = this.text(1186, 673, '+', this.buttonStyle(18));
    this.mineSupportsFundButtonLabel.setOrigin(0.5);
    this.mineSupportsFundButtonLabel.setInteractive({ useHandCursor: true });
    this.mineSupportsFundButton.on('pointerdown', onFundMineSupports);
    this.mineSupportsFundButtonLabel.on('pointerdown', onFundMineSupports);

    this.mineSupportsObjects = [
      mineSupportsIcon,
      mineSupportsLabel,
      mineSupportsCost,
      mineSupportsGaugeBack,
      this.mineSupportsFill,
      this.mineSupportsStatusText,
      this.mineSupportsFundButton,
      this.mineSupportsFundButtonLabel,
    ];
  }

  private createChronicleStrip(): void {
    this.glassPanel(24, 650, 620, 46, 0.22);
    this.text(42, 663, 'Chronique', this.labelStyle(12));
    this.chronicleText = this.text(122, 660, '', {
      color: TEXT.paper,
      fontFamily: 'Georgia, Times New Roman, serif',
      fontSize: '14px',
      wordWrap: { width: 488 },
    });
  }

  private createVillageRequestStrip(onCompleteVillageRequest: () => void): void {
    const panel = this.glassPanel(24, 586, 620, 52, 0.22);
    const title = this.text(42, 595, 'Village', this.labelStyle(12));
    this.villageRequestNameText = this.text(104, 592, '', {
      color: TEXT.paper,
      fontFamily: 'Georgia, Times New Roman, serif',
      fontSize: '14px',
      wordWrap: { width: 330 },
      shadow: { color: '#111a18', blur: 3, fill: true },
    });
    this.villageRequestCostText = this.text(104, 616, '', this.labelStyle(12));
    this.villageRequestDaysText = this.text(462, 603, '', this.labelStyle(13));
    this.villageRequestHelpButton = this.rect(590, 612, 76, 26, COLORS.forest, 0.42);
    this.villageRequestHelpButton.setStrokeStyle(1, COLORS.line, 0.5);
    this.villageRequestHelpButton.setInteractive({ useHandCursor: true });
    this.villageRequestHelpButtonLabel = this.text(
      590,
      604,
      'Aider',
      this.buttonStyle(13),
    );
    this.villageRequestHelpButtonLabel.setOrigin(0.5, 0);
    this.villageRequestHelpButtonLabel.setInteractive({ useHandCursor: true });
    this.villageRequestHelpButton.on('pointerdown', onCompleteVillageRequest);
    this.villageRequestHelpButtonLabel.on('pointerdown', onCompleteVillageRequest);

    this.villageRequestObjects = [
      panel,
      title,
      this.villageRequestNameText,
      this.villageRequestCostText,
      this.villageRequestDaysText,
      this.villageRequestHelpButton,
      this.villageRequestHelpButtonLabel,
    ];
  }

  private refreshBridge(): void {
    const project = this.regionalProjects.oldBridge;

    if (project.status === 'not_started') {
      this.bridgeFill.setFillStyle(COLORS.amber);
      this.bridgeFill.setDisplaySize(0, 4);
      this.bridgeStatusText.setText('0%');
      return;
    }

    if (project.status === 'completed') {
      this.bridgeFill.setFillStyle(COLORS.forest);
      this.bridgeFill.setDisplaySize(PROJECT_GAUGE_WIDTH, 4);
      this.bridgeStatusText.setText('ok');
      return;
    }

    const progress = Phaser.Math.Clamp(
      (6 - project.daysUntilMerchantsMoreNumerous) / 6,
      0,
      1,
    );
    this.bridgeFill.setFillStyle(COLORS.amber);
    this.bridgeFill.setDisplaySize(PROJECT_GAUGE_WIDTH * progress, 4);
    this.bridgeStatusText.setText(`${Math.round(progress * 100)}%`);
  }

  private refreshForestRoad(): void {
    const isVisible = this.regionalProjects.oldBridge.status === 'completed';
    const project = this.regionalProjects.forestRoad;

    for (const object of this.roadObjects) {
      object.setVisible(isVisible);
    }

    if (!isVisible) {
      this.setButtonState(this.roadFundButton, this.roadFundButtonLabel, false);
      return;
    }

    if (project.status === 'not_started') {
      this.roadFill.setFillStyle(COLORS.amber);
      this.roadFill.setDisplaySize(0, 4);
      this.roadStatusText.setText('0%');
      return;
    }

    if (project.status === 'completed') {
      this.roadFill.setFillStyle(COLORS.forest);
      this.roadFill.setDisplaySize(PROJECT_GAUGE_WIDTH, 4);
      this.roadStatusText.setText('ok');
      return;
    }

    const progress = Phaser.Math.Clamp(
      (FOREST_ROAD_PROJECT.completionDays - project.daysUntilCompleted) /
        FOREST_ROAD_PROJECT.completionDays,
      0,
      1,
    );
    this.roadFill.setFillStyle(COLORS.amber);
    this.roadFill.setDisplaySize(PROJECT_GAUGE_WIDTH * progress, 4);
    this.roadStatusText.setText(`${Math.round(progress * 100)}%`);
  }

  private refreshMineSupports(): void {
    const isVisible = this.regionalProjects.oldBridge.status === 'completed';
    const project = this.regionalProjects.mineSupports;

    for (const object of this.mineSupportsObjects) {
      object.setVisible(isVisible);
    }

    if (!isVisible) {
      this.setButtonState(
        this.mineSupportsFundButton,
        this.mineSupportsFundButtonLabel,
        false,
      );
      return;
    }

    if (project.status === 'not_started') {
      this.mineSupportsFill.setFillStyle(COLORS.amber);
      this.mineSupportsFill.setDisplaySize(0, 4);
      this.mineSupportsStatusText.setText('0%');
      return;
    }

    if (project.status === 'completed') {
      this.mineSupportsFill.setFillStyle(COLORS.forest);
      this.mineSupportsFill.setDisplaySize(PROJECT_GAUGE_WIDTH, 4);
      this.mineSupportsStatusText.setText('ok');
      return;
    }

    const progress = Phaser.Math.Clamp(
      (MINE_SUPPORTS_PROJECT.completionDays - project.daysUntilCompleted) /
        MINE_SUPPORTS_PROJECT.completionDays,
      0,
      1,
    );
    this.mineSupportsFill.setFillStyle(COLORS.amber);
    this.mineSupportsFill.setDisplaySize(PROJECT_GAUGE_WIDTH * progress, 4);
    this.mineSupportsStatusText.setText(`${Math.round(progress * 100)}%`);
  }

  private refreshVillageRequest(): void {
    const definition = this.villageRequests.getActiveDefinition();
    const activeRequest = this.villageRequests.activeRequest;
    const isVisible = definition !== null && activeRequest !== null;

    for (const object of this.villageRequestObjects) {
      object.setVisible(isVisible);
    }

    if (!definition || !activeRequest) {
      this.setButtonState(
        this.villageRequestHelpButton,
        this.villageRequestHelpButtonLabel,
        false,
      );
      return;
    }

    this.villageRequestNameText.setText(definition.name);
    this.villageRequestCostText.setText(`Cout: ${this.costText(definition.cost)}`);
    this.villageRequestDaysText.setText(`${activeRequest.daysRemaining}j`);
    this.setButtonState(
      this.villageRequestHelpButton,
      this.villageRequestHelpButtonLabel,
      this.state.canUseDailyAction() &&
        this.villageRequests.canCompleteActive(this.state.resources),
    );
  }

  private refreshFundButton(): void {
    this.setButtonState(
      this.fundButton,
      this.fundButtonLabel,
      this.regionalProjects.canFundOldBridge(this.state.resources.wood),
    );
    this.setButtonState(
      this.roadFundButton,
      this.roadFundButtonLabel,
      this.regionalProjects.canFundForestRoad(
        this.state.resources.wood,
        this.state.resources.stone,
      ),
    );
    this.setButtonState(
      this.mineSupportsFundButton,
      this.mineSupportsFundButtonLabel,
      this.regionalProjects.canFundMineSupports(
        this.state.resources.wood,
        this.state.resources.stone,
      ),
    );
  }

  private refreshHarvestWoodButton(isWoodcutterWorkActive: boolean): void {
    this.setButtonState(
      this.harvestWoodButton,
      this.harvestWoodButtonLabel,
      !isWoodcutterWorkActive &&
        this.state.canUseDailyAction() &&
        this.state.forestCurrent > 0,
    );
  }

  private refreshWorkButton(isWoodcutterWorkActive: boolean): void {
    this.setButtonState(
      this.workButton,
      this.workButtonLabel,
      !isWoodcutterWorkActive &&
        this.state.canUseDailyAction() &&
        this.dailyWork.canStartWoodcutterWork(
          this.chronicle.currentDay,
          this.state.forestCurrent,
          this.state.dailyActionsRemaining,
        ),
    );
  }

  private refreshExtractStoneButton(isWoodcutterWorkActive: boolean): void {
    this.setButtonState(
      this.extractStoneButton,
      this.extractStoneButtonLabel,
      !isWoodcutterWorkActive && this.state.canUseDailyAction(),
    );
  }

  private refreshSpeedButtons(speedMultiplier: number): void {
    for (const speedButton of this.speedButtons) {
      const isActive = speedButton.multiplier === speedMultiplier;

      speedButton.button.setFillStyle(
        isActive ? COLORS.amber : COLORS.ink,
        isActive ? 0.72 : 0.3,
      );
      speedButton.button.setStrokeStyle(
        1,
        isActive ? COLORS.paper : COLORS.line,
        isActive ? 0.82 : 0.4,
      );
      speedButton.label.setColor(isActive ? '#111a18' : TEXT.paper);
    }
  }

  private costText(cost: { wood?: number; stone?: number }): string {
    const parts: string[] = [];

    if ((cost.wood || 0) > 0) {
      parts.push(`${cost.wood} bois`);
    }

    if ((cost.stone || 0) > 0) {
      parts.push(`${cost.stone} pierre`);
    }

    return parts.join(', ');
  }

  private setButtonState(
    button: Phaser.GameObjects.Rectangle,
    label: Phaser.GameObjects.Text,
    enabled: boolean,
  ): void {
    button.setFillStyle(enabled ? COLORS.forest : COLORS.ink, enabled ? 0.46 : 0.3);
    button.setAlpha(enabled ? 1 : 0.48);
    label.setAlpha(enabled ? 1 : 0.5);

    if (enabled) {
      if (!button.input?.enabled) {
        button.setInteractive({ useHandCursor: true });
      }
      if (!label.input?.enabled) {
        label.setInteractive({ useHandCursor: true });
      }
      return;
    }

    button.disableInteractive();
    label.disableInteractive();
  }

  private glassPanel(
    x: number,
    y: number,
    width: number,
    height: number,
    alpha: number,
  ): Phaser.GameObjects.Rectangle {
    const panel = this.rect(x, y, width, height, COLORS.veil, alpha);
    panel.setOrigin(0);
    panel.setStrokeStyle(1, COLORS.line, 0.16);
    return panel;
  }

  private resourceInline(
    x: number,
    y: number,
    color: number,
    drawIcon: () => void,
  ): void {
    this.circle(x, y, 15, color, 0.22);
    drawIcon();
  }

  private gaugeBack(
    x: number,
    y: number,
    width: number,
    height: number,
  ): Phaser.GameObjects.Rectangle {
    return this.rect(x, y, width, height, COLORS.ink, 0.58).setOrigin(0, 0.5);
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

  private hexText(color: number): string {
    return `#${color.toString(16).padStart(6, '0')}`;
  }

  private text(
    x: number,
    y: number,
    value: string,
    style: Phaser.Types.GameObjects.Text.TextStyle,
  ): Phaser.GameObjects.Text {
    return this.scene.add
      .text(x, y, value, style)
      .setDepth(HUD_DEPTH)
      .setScrollFactor(0);
  }

  private rect(
    x: number,
    y: number,
    width: number,
    height: number,
    color: number,
    alpha = 1,
  ): Phaser.GameObjects.Rectangle {
    return this.scene.add
      .rectangle(x, y, width, height, color, alpha)
      .setDepth(HUD_DEPTH)
      .setScrollFactor(0);
  }

  private circle(
    x: number,
    y: number,
    radius: number,
    color: number,
    alpha = 1,
  ): Phaser.GameObjects.Arc {
    return this.scene.add
      .circle(x, y, radius, color, alpha)
      .setDepth(HUD_DEPTH)
      .setScrollFactor(0);
  }

  private graphics(): Phaser.GameObjects.Graphics {
    return this.scene.add.graphics().setDepth(HUD_DEPTH).setScrollFactor(0);
  }

  private valueStyle(fontSize = 24): Phaser.Types.GameObjects.Text.TextStyle {
    return {
      color: TEXT.paper,
      fontFamily: 'Georgia, Times New Roman, serif',
      fontSize: `${fontSize}px`,
      shadow: { color: '#111a18', blur: 4, fill: true },
    };
  }

  private labelStyle(fontSize = 13): Phaser.Types.GameObjects.Text.TextStyle {
    return {
      color: TEXT.muted,
      fontFamily: 'Arial',
      fontSize: `${fontSize}px`,
      shadow: { color: '#111a18', blur: 3, fill: true },
    };
  }

  private buttonStyle(fontSize = 18): Phaser.Types.GameObjects.Text.TextStyle {
    return {
      color: TEXT.paper,
      fontFamily: 'Arial',
      fontSize: `${fontSize}px`,
      shadow: { color: '#111a18', blur: 4, fill: true },
    };
  }

  private drawWood(x: number, y: number): void {
    const icon = this.graphics();
    icon.fillStyle(COLORS.wood);
    icon.fillRoundedRect(x - 7, y - 11, 14, 22, 3);
    icon.lineStyle(1, COLORS.ink, 0.9);
    icon.lineBetween(x - 2, y - 9, x - 2, y + 9);
    icon.lineBetween(x + 4, y - 8, x + 4, y + 8);
  }

  private drawStone(x: number, y: number): void {
    const icon = this.graphics();
    icon.fillStyle(COLORS.stone);
    icon.fillCircle(x - 5, y + 3, 8);
    icon.fillCircle(x + 6, y + 1, 10);
    icon.fillCircle(x, y - 7, 7);
  }

  private drawBridge(
    x: number,
    y: number,
    scale: number,
    color: number,
  ): void {
    const icon = this.graphics();
    icon.setPosition(x, y);
    icon.scale = scale;
    icon.lineStyle(5, color, 0.72);
    icon.lineBetween(-34, 16, 34, 16);
    icon.lineBetween(-24, 16, -24, 34);
    icon.lineBetween(0, 16, 0, 34);
    icon.lineBetween(24, 16, 24, 34);
    icon.lineBetween(-34, 16, -12, -4);
    icon.lineBetween(-12, -4, 12, -4);
    icon.lineBetween(12, -4, 34, 16);
  }

  private drawRoad(
    x: number,
    y: number,
    scale: number,
    color: number,
  ): Phaser.GameObjects.Graphics {
    const icon = this.graphics();
    icon.setPosition(x, y);
    icon.scale = scale;
    icon.lineStyle(5, color, 0.72);
    icon.lineBetween(-30, 20, -8, -12);
    icon.lineBetween(8, 20, 30, -12);
    icon.lineStyle(2, color, 0.5);
    icon.lineBetween(0, 16, 0, 7);
    icon.lineBetween(0, 1, 0, -8);
    return icon;
  }

  private drawMineSupports(
    x: number,
    y: number,
    scale: number,
    color: number,
  ): Phaser.GameObjects.Graphics {
    const icon = this.graphics();
    icon.setPosition(x, y);
    icon.scale = scale;
    icon.lineStyle(5, color, 0.72);
    icon.lineBetween(-28, 20, -18, -10);
    icon.lineBetween(28, 20, 18, -10);
    icon.lineBetween(-18, -10, 18, -10);
    icon.lineStyle(3, color, 0.5);
    icon.lineBetween(-18, 7, 18, 7);
    icon.lineBetween(0, -10, 0, 20);
    return icon;
  }
}
