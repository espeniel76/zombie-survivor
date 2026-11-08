// 이야기 화면 공용 부품: 한 장씩 넘기는 이야기, 웨이브 중에 잠깐 뜨는 장 카드
// 글자는 천천히 나타나고 사라진다(번쩍임 없음).
import { W, H, COLOR, text, button } from './ui.js';

// 한 장씩 넘기는 이야기. 다 보거나 건너뛰면 onDone()
export function storyPages(scene, pages, onDone, depth = 200) {
  const c = scene.add.container(0, 0).setDepth(depth);
  const bg = scene.add.rectangle(W / 2, H / 2, W, H, 0x07090c, 0.96).setInteractive();
  c.add(bg);
  // 잿빛 비(가만히 내리는 줄, 아주 옅게)
  const rain = scene.add.graphics();
  rain.lineStyle(2, 0x5a6470, 0.25);
  for (let k = 0; k < 70; k++) {
    const x = (k * 97) % W;
    const y = (k * 173) % H;
    rain.lineBetween(x, y, x - 6, y + 26);
  }
  c.add(rain);
  const body = text(scene, W / 2, H / 2 - 60, '', 38, COLOR.text, { strokeThickness: 0, lineSpacing: 14 });
  const dots = scene.add.graphics();
  c.add([body, dots]);
  let i = 0;
  const next = button(scene, W / 2, H - 230, 360, 96, '다음', () => go(i + 1), { size: 36 });
  const skip = button(scene, W / 2, H - 120, 240, 70, '건너뛰기', () => finish(), { fill: 0x2a323c, textColor: '#93a39a', size: 26 });
  c.add([next, skip]);

  function paint() {
    body.setText(pages[i]).setAlpha(0);
    scene.tweens.add({ targets: body, alpha: 1, duration: 500 });
    next.label.setText(i === pages.length - 1 ? '시작' : '다음');
    skip.setVisible(i < pages.length - 1);
    dots.clear();
    pages.forEach((_, k) => {
      dots.fillStyle(k === i ? 0xeef3ea : 0x3a4652, 1);
      dots.fillCircle(W / 2 + (k - (pages.length - 1) / 2) * 26, H - 320, 6);
    });
  }
  function go(k) {
    if (k >= pages.length) return finish();
    i = k;
    paint();
  }
  function finish() {
    scene.tweens.add({ targets: c, alpha: 0, duration: 300, onComplete: () => c.destroy() });
    onDone?.();
  }
  paint();
  return c;
}

// 웨이브 시작 때 화면 위쪽에 잠깐 뜨는 장 카드(게임은 멈추지 않는다)
export function chapterCard(scene, chapter) {
  const c = scene.add.container(W / 2, 290).setDepth(55).setAlpha(0);
  const g = scene.add.graphics();
  g.fillStyle(0x07090c, 0.88);
  g.fillRoundedRect(-320, -82, 640, 164, 16);
  g.lineStyle(2, 0x5a6470, 1);
  g.strokeRoundedRect(-320, -82, 640, 164, 16);
  const title = text(scene, 0, -50, chapter.title, 28, COLOR.orangeText, { strokeThickness: 0 });
  const body = text(scene, 0, 18, chapter.text, 22, COLOR.text, { strokeThickness: 0, bold: false, wrap: 580, lineSpacing: 6 });
  c.add([g, title, body]);
  scene.tweens.add({ targets: c, alpha: 1, y: 270, duration: 500, ease: 'Quad.Out' });
  scene.tweens.add({ targets: c, alpha: 0, delay: 6500, duration: 700, onComplete: () => c.destroy() });
  return c;
}
