// 안드로이드 앱(플러터, app/ 폴더)이 게임을 부르는 창구. 웹에서는 쓰이지 않는다.
// 앱은 이 게임을 화면 가득 띄워 두고, 휴대폰 버튼이 눌리면 아래 함수를 부른다.
import { writeSave } from './save.js';
import { suspendAudio, resumeAudio } from './sfx.js';

export function installAppBridge(game) {
  const active = key => (game.scene.isActive(key) ? game.scene.getScene(key) : null);
  window.__app = {
    // 뒤로 가기 버튼. 'exit'이면 처음 화면이라 더 돌아갈 곳이 없다는 뜻
    // (앱이 "한 번 더 누르면 종료" 안내를 띄운다)
    back() {
      const ui = active('UI');
      if (ui) {
        ui.back();
        return 'handled';
      }
      const title = active('Title');
      if (title) return title.back() ? 'handled' : 'exit';
      return 'handled'; // 장면이 바뀌는 중
    },
    // 홈 버튼·전화 등으로 앱이 뒤로 갈 때: 저장하고, 싸우는 중이면 일시정지 창을 열고, 소리를 쉰다
    pause() {
      writeSave();
      active('UI')?.pauseForApp();
      suspendAudio();
    },
    resume() {
      resumeAudio();
    },
  };
}
