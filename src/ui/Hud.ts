import Phaser from 'phaser';
import { type DailyWork, WOODCUTTER_WORK } from '../systems/DailyWork';
import type { GameState } from '../systems/GameState';
import {
  OLD_BRIDGE_PROJECT,
  type RegionalProjects,
} from '../systems/RegionalProjects';
import type { WorldChronicle } from '../systems/WorldChronicle';

const ACTIVITY_LABELS = {
  forest: 'Forêt',
  mine: 'Mine',
  village: 'Village',
};

export class Hud {
  private woodText: Phaser.GameObjects.Text;
  private stoneText: Phaser.GameObjects.Text;
  private forestStateText: Phaser.GameObjects.Text;
  private activityText: Phaser.GameObjects.Text;
  private dayText: Phaser.GameObjects.Text;
  private nextDayText: Phaser.GameObjects.Text;
  private chronicleEventsText: Phaser.GameObjects.Text;
  private projectNameText: Phaser.GameObjects.Text;
  private projectCostText: Phaser.GameObjects.Text;
  private projectStatusText: Phaser.GameObjects.Text;
  private fundOldBridgeButton!: Phaser.GameObjects.Rectangle;
  private fundOldBridgeButtonLabel!: Phaser.GameObjects.Text;
  private woodcutterWorkButton!: Phaser.GameObjects.Rectangle;
  private woodcutterWorkButtonLabel!: Phaser.GameObjects.Text;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly state: GameState,
    private readonly dailyWork: DailyWork,
    private readonly regionalProjects: RegionalProjects,
    private readonly chronicle: WorldChronicle,
    onStartWoodcutterWork: () => void,
    onFundOldBridge: () => void,
    onReset: () => void,
  ) {
    this.woodText = this.scene.add.text(40, 34, '', this.textStyle());
    this.stoneText = this.scene.add.text(40, 66, '', this.textStyle());
    this.activityText = this.scene.add.text(40, 98, '', this.textStyle());
    this.forestStateText = this.scene.add.text(40, 130, '', this.textStyle());

    this.scene.add.text(520, 34, 'Projets régionaux', {
      color: '#f2eee5',
      fontFamily: 'Arial',
      fontSize: '20px',
    });

    this.projectNameText = this.scene.add.text(520, 66, '', this.textStyle(16));
    this.projectCostText = this.scene.add.text(520, 91, '', this.textStyle(16));
    this.projectStatusText = this.scene.add.text(520, 116, '', {
      ...this.textStyle(14),
      wordWrap: { width: 330 },
    });
    this.createFundOldBridgeButton(onFundOldBridge);
    this.createWoodcutterWorkButton(onStartWoodcutterWork);

    this.scene.add
      .rectangle(450, 365, 820, 420, 0x2b3137)
      .setStrokeStyle(2, 0x5f6870);

    this.scene.add.text(70, 170, 'Chroniques du monde', {
      color: '#f2eee5',
      fontFamily: 'Arial',
      fontSize: '24px',
    });

    this.dayText = this.scene.add.text(70, 205, '', this.textStyle(18));
    this.nextDayText = this.scene.add.text(70, 230, '', this.textStyle(18));
    this.createResetButton(onReset);
    this.chronicleEventsText = this.scene.add.text(70, 265, '', {
      color: '#f2eee5',
      fontFamily: 'Arial',
      fontSize: '13px',
      lineSpacing: 2,
    });
  }

  refresh(nextDayInSeconds: number, isWoodcutterWorkActive: boolean): void {
    this.woodText.setText(`Bois : ${this.state.resources.wood}`);
    this.stoneText.setText(`Pierre : ${this.state.resources.stone}`);
    this.activityText.setText(
      `Action en cours : ${ACTIVITY_LABELS[this.state.activity]}`,
    );
    this.forestStateText.setText(
      `État de la forêt : Forêt : ${this.state.forestCurrent} / ${this.state.forestMax}`,
    );
    this.dayText.setText(`Jour actuel : ${this.chronicle.currentDay}`);
    this.nextDayText.setText(`Prochain jour dans : ${nextDayInSeconds}s`);
    this.projectNameText.setText(OLD_BRIDGE_PROJECT.name);
    this.projectCostText.setText(`Coût : ${OLD_BRIDGE_PROJECT.costWood} bois`);
    this.projectStatusText.setText(this.oldBridgeStatusText());
    this.refreshFundOldBridgeButton();
    this.refreshWoodcutterWorkButton(isWoodcutterWorkActive);
    this.chronicleEventsText.setText(
      this.chronicle.events
        .map((event) => `Jour ${event.day} : ${event.text}`)
        .join('\n'),
    );
  }

  private textStyle(fontSize = 22): Phaser.Types.GameObjects.Text.TextStyle {
    return {
      color: '#f2eee5',
      fontFamily: 'Arial',
      fontSize: `${fontSize}px`,
    };
  }

  private oldBridgeStatusText(): string {
    const project = this.regionalProjects.oldBridge;

    if (project.status === 'not_started') {
      return 'Statut : Non démarré';
    }

    if (project.status === 'completed') {
      return 'Statut : Terminé';
    }

    if (project.daysUntilBridgePassable > 0) {
      return `Statut : En cours (${project.daysUntilBridgePassable}j avant le pont praticable)`;
    }

    return `Statut : En cours (${project.daysUntilMerchantsMoreNumerous}j avant une route plus fréquentée)`;
  }

  private createFundOldBridgeButton(onFundOldBridge: () => void): void {
    this.fundOldBridgeButton = this.scene.add
      .rectangle(750, 91, 130, 38, 0x315f3c)
      .setStrokeStyle(2, 0xf2eee5)
      .setInteractive({ useHandCursor: true });

    this.fundOldBridgeButtonLabel = this.scene.add
      .text(750, 91, 'Financer', {
        color: '#ffffff',
        fontFamily: 'Arial',
        fontSize: '16px',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    this.fundOldBridgeButton.on('pointerdown', onFundOldBridge);
    this.fundOldBridgeButtonLabel.on('pointerdown', onFundOldBridge);
  }

  private refreshFundOldBridgeButton(): void {
    const canFund = this.regionalProjects.canFundOldBridge(
      this.state.resources.wood,
    );
    const fillColor = canFund ? 0x315f3c : 0x454a50;
    const strokeColor = canFund ? 0xf2eee5 : 0x7a8086;
    const alpha = canFund ? 1 : 0.65;

    this.fundOldBridgeButton.setFillStyle(fillColor);
    this.fundOldBridgeButton.setStrokeStyle(2, strokeColor);
    this.fundOldBridgeButton.setAlpha(alpha);
    this.fundOldBridgeButtonLabel.setAlpha(alpha);

    if (canFund) {
      if (!this.fundOldBridgeButton.input?.enabled) {
        this.fundOldBridgeButton.setInteractive({ useHandCursor: true });
      }

      if (!this.fundOldBridgeButtonLabel.input?.enabled) {
        this.fundOldBridgeButtonLabel.setInteractive({ useHandCursor: true });
      }

      return;
    }

    this.fundOldBridgeButton.disableInteractive();
    this.fundOldBridgeButtonLabel.disableInteractive();
  }

  private createWoodcutterWorkButton(onStartWoodcutterWork: () => void): void {
    this.woodcutterWorkButton = this.scene.add
      .rectangle(700, 162, 260, 38, 0x315f3c)
      .setStrokeStyle(2, 0xf2eee5)
      .setInteractive({ useHandCursor: true })
      .setDepth(1);

    this.woodcutterWorkButtonLabel = this.scene.add
      .text(700, 162, WOODCUTTER_WORK.name, {
        color: '#ffffff',
        fontFamily: 'Arial',
        fontSize: '16px',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .setDepth(1);

    this.woodcutterWorkButton.on('pointerdown', onStartWoodcutterWork);
    this.woodcutterWorkButtonLabel.on('pointerdown', onStartWoodcutterWork);
  }

  private refreshWoodcutterWorkButton(
    isWoodcutterWorkActive: boolean,
  ): void {
    const canStart =
      !isWoodcutterWorkActive &&
      this.dailyWork.canStartWoodcutterWork(
        this.chronicle.currentDay,
        this.state.forestCurrent,
      );
    const fillColor = canStart ? 0x315f3c : 0x454a50;
    const strokeColor = canStart ? 0xf2eee5 : 0x7a8086;
    const alpha = canStart ? 1 : 0.65;

    this.woodcutterWorkButton.setFillStyle(fillColor);
    this.woodcutterWorkButton.setStrokeStyle(2, strokeColor);
    this.woodcutterWorkButton.setAlpha(alpha);
    this.woodcutterWorkButtonLabel.setAlpha(alpha);

    if (canStart) {
      if (!this.woodcutterWorkButton.input?.enabled) {
        this.woodcutterWorkButton.setInteractive({ useHandCursor: true });
      }

      if (!this.woodcutterWorkButtonLabel.input?.enabled) {
        this.woodcutterWorkButtonLabel.setInteractive({ useHandCursor: true });
      }

      return;
    }

    this.woodcutterWorkButton.disableInteractive();
    this.woodcutterWorkButtonLabel.disableInteractive();
  }

  private createResetButton(onReset: () => void): void {
    const button = this.scene.add
      .rectangle(665, 217, 265, 40, 0x6b3f3f)
      .setStrokeStyle(2, 0xf2eee5)
      .setInteractive({ useHandCursor: true });

    const label = this.scene.add
      .text(665, 217, 'Réinitialiser la sauvegarde', {
        color: '#ffffff',
        fontFamily: 'Arial',
        fontSize: '15px',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    button.on('pointerdown', onReset);
    label.on('pointerdown', onReset);
  }
}
