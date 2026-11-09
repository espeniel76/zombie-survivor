window.__load?.set(0.7, '그림 그리는 중…');
import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene.js';
import { TitleScene } from './scenes/TitleScene.js';
import { GameScene } from './scenes/GameScene.js';
import { UIScene } from './scenes/UIScene.js';
import { W, H, COLOR } from './core/ui.js';
import { unlockAudio, bakeSounds } from './core/sfx.js';
import { writeSave } from './core/save.js';

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
// 주운 코인은 웨이브가 끝날 때 저장하지만, 창을 닫거나 다른 앱으로 갈 때도 저장해 둔다
window.addEventListener('pagehide', writeSave);
document.addEventListener('visibilitychange', () => document.hidden && writeSave());

// 한 번 받은 게임 파일은 휴대폰에 저장해 두고 다음부터 바로 켠다(서비스 워커).
if (import.meta.env.PROD && 'serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}

// 개발용: 콘솔/자동 점검에서 상태 확인
if (import.meta.env.DEV) {
  window.__game = game;
  import('./data/allies.js').then(m => (window.__allies = m.ALLIES));
  import('./core/rules.js').then(m => (window.__rules = m));
}
