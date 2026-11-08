import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene.js';
import { TitleScene } from './scenes/TitleScene.js';
import { GameScene } from './scenes/GameScene.js';
import { UIScene } from './scenes/UIScene.js';
import { W, H, COLOR } from './core/ui.js';
import { unlockAudio, bakeSounds } from './core/sfx.js';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: W,
  height: H,
  backgroundColor: COLOR.bg,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  input: { activePointers: 2 },
  render: { antialias: true },
  scene: [BootScene, TitleScene, GameScene, UIScene],
});

// 효과음은 시작하자마자 미리 구워 둔다(소리 장치 허락 없이도 가능)
bakeSounds();
window.addEventListener('pointerdown', unlockAudio, { passive: true });
window.addEventListener('keydown', unlockAudio);

// 개발용: 콘솔/자동 점검에서 상태 확인
if (import.meta.env.DEV) {
  window.__game = game;
  import('./data/allies.js').then(m => (window.__allies = m.ALLIES));
  import('./core/rules.js').then(m => (window.__rules = m));
}
