import Phaser from 'phaser';
import { GameScene } from './scenes/GameScene';
import './style.css';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  width: 900,
  height: 690,
  backgroundColor: '#20252a',
  scene: [GameScene],
};

new Phaser.Game(config);
