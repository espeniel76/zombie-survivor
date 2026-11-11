window.__load?.set(0.7, '그림 그리는 중…');
import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene.js';
import { TitleScene } from './scenes/TitleScene.js';
import { GameScene } from './scenes/GameScene.js';
import { UIScene } from './scenes/UIScene.js';
import { W, H, COLOR } from './core/ui.js';
import { unlockAudio, bakeSounds } from './core/sfx.js';
import { writeSave } from './core/save.js';
import { installAppBridge } from './core/app.js';

// 안드로이드 앱 안에서 도는 판(npm run app → vite --mode app)
const IN_APP = import.meta.env.MODE === 'app';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: W,
  height: H,
  backgroundColor: COLOR.bg,
  // expandParent: false → #game 크기는 index.html의 CSS가 정한다(Phaser가 덮어쓰지 않게)
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, expandParent: false },
  input: { activePointers: 2 },
  render: { antialias: true },
  scene: [BootScene, TitleScene, GameScene, UIScene],
});

// 화면 크기가 0인 채로 켜지면(안드로이드 앱을 처음 켤 때 등) Phaser가 그 뒤에 크기를 못 맞춰
// 게임이 안 보이는 일이 있다. 그럴 때 다시 맞춘다.
game.events.on(Phaser.Core.Events.PRE_STEP, () => {
  const s = game.scale;
  if (s.displaySize.width === 0 && s.parent?.clientHeight > 0) s.refresh();
});

// 효과음은 시작하자마자 미리 구워 둔다(소리 장치 허락 없이도 가능)
bakeSounds();
window.addEventListener('pointerdown', unlockAudio, { passive: true });
window.addEventListener('keydown', unlockAudio);
// 주운 코인은 웨이브가 끝날 때 저장하지만, 창을 닫거나 다른 앱으로 갈 때도 저장해 둔다
window.addEventListener('pagehide', writeSave);
document.addEventListener('visibilitychange', () => document.hidden && writeSave());

// 한 번 받은 게임 파일은 휴대폰에 저장해 두고 다음부터 바로 켠다(서비스 워커).
// 앱은 게임 파일이 이미 안에 들어 있으니 필요 없다.
if (!IN_APP && import.meta.env.PROD && 'serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}

if (IN_APP) installAppBridge(game);

// 개발용: 콘솔/자동 점검에서 상태 확인(앱은 PC 크롬으로 들여다볼 때 쓴다)
if (import.meta.env.DEV || IN_APP) {
  window.__game = game;
  import('./data/allies.js').then(m => (window.__allies = m.ALLIES));
  import('./core/rules.js').then(m => (window.__rules = m));
}
