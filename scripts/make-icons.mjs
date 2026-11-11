// 앱 아이콘을 그려 PNG로 저장한다.
//   node scripts/make-icons.mjs
// - public/icon-*.png : 웹(홈 화면에 추가했을 때)
// - app/icon/icon.png, app/icon/foreground.png : 안드로이드 앱
//   (그다음 app 폴더에서 `dart run flutter_launcher_icons`)
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'node:fs';

// bg: 배경을 칠할지, s: 그림 크기 배율(512 기준), cy: 그림 가운데 높이
const html = `<canvas id="c"></canvas><script>
window.draw = (size, bg, s, cy) => {
  const cv = document.getElementById('c');
  cv.width = cv.height = size;
  const g = cv.getContext('2d');
  g.clearRect(0, 0, size, size);
  if (bg) { g.fillStyle = '#11151a'; g.fillRect(0, 0, size, size); }
  g.save();
  g.translate(size / 2, size / 2);
  g.scale((size / 512) * s, (size / 512) * s);
  g.translate(-256, -cy);
  const dark = '#161b20';
  const circle = (x, y, r, fill, line = 0) => {
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fillStyle = fill; g.fill();
    if (line) { g.lineWidth = line; g.strokeStyle = dark; g.stroke(); }
  };
  // 뒤에서 다가오는 좀비 둘(초록, 짝짝이 눈)
  for (const [x, y, k] of [[118, 150, 0.62], [394, 150, 0.62]]) {
    circle(x, y, 70 * k, '#6f9a4a', 9 * k);
    circle(x - 20 * k, y - 8 * k, 15 * k, '#fff', 5 * k);
    circle(x + 22 * k, y - 4 * k, 11 * k, '#fff', 5 * k);
  }
  // 가운데 생존자(빨간 몸, 하얀 동그라미 눈 두 개)
  circle(256, 300, 150, '#d1202e', 16);
  circle(206, 268, 34, '#fff', 9);
  circle(306, 268, 34, '#fff', 9);
  g.restore();
  return cv.toDataURL('image/png');
};
</script>`;

const browser = await chromium.launch({ channel: 'msedge' });
const page = await browser.newPage();
await page.setContent(html);
const save = async (path, size, bg, s, cy) => {
  const data = await page.evaluate(([size, bg, s, cy]) => window.draw(size, bg, s, cy), [size, bg, s, cy]);
  writeFileSync(path, Buffer.from(data.split(',')[1], 'base64'));
  console.log(path);
};

for (const size of [512, 192, 180]) await save(`public/icon-${size}.png`, size, true, 1, 256);

// 안드로이드 적응형 아이콘: 휴대폰마다 동그라미·둥근 네모 등으로 잘라 내므로,
// 앞 그림은 가운데 지름 66% 원 안에 들어가게 줄이고 가운데로 옮긴다(배경색은 pubspec.yaml)
mkdirSync('app/icon', { recursive: true });
await save('app/icon/icon.png', 1024, true, 1, 256);
await save('app/icon/foreground.png', 1024, false, 0.7, 279);
await browser.close();
