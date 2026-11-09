// 앱 아이콘(홈 화면에 추가했을 때)을 그려 public/에 PNG로 저장한다.
//   node scripts/make-icons.mjs
import { chromium } from 'playwright-core';

const html = `<canvas id="c" width="512" height="512"></canvas><script>
const g = document.getElementById('c').getContext('2d');
g.fillStyle = '#11151a'; g.fillRect(0, 0, 512, 512);
const dark = '#161b20';
const circle = (x, y, r, fill, line = 0) => {
  g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fillStyle = fill; g.fill();
  if (line) { g.lineWidth = line; g.strokeStyle = dark; g.stroke(); }
};
// 뒤에서 다가오는 좀비 둘(초록, 짝짝이 눈)
for (const [x, y, s] of [[118, 150, 0.62], [394, 150, 0.62]]) {
  circle(x, y, 70 * s, '#6f9a4a', 9 * s);
  circle(x - 20 * s, y - 8 * s, 15 * s, '#fff', 5 * s);
  circle(x + 22 * s, y - 4 * s, 11 * s, '#fff', 5 * s);
}
// 가운데 생존자(빨간 몸, 하얀 동그라미 눈 두 개)
circle(256, 300, 150, '#d1202e', 16);
circle(206, 268, 34, '#fff', 9);
circle(306, 268, 34, '#fff', 9);
</script>`;

const browser = await chromium.launch({ channel: 'msedge' });
const page = await browser.newPage({ viewport: { width: 512, height: 512 } });
await page.setContent(html);
const c = page.locator('#c');
for (const size of [512, 192, 180]) {
  await page.evaluate(s => {
    const src = document.getElementById('c');
    let o = document.getElementById('o');
    if (!o) { o = document.createElement('canvas'); o.id = 'o'; document.body.append(o); }
    o.width = o.height = s;
    o.getContext('2d').drawImage(src, 0, 0, s, s);
  }, size);
  const data = await page.evaluate(() => document.getElementById('o').toDataURL('image/png'));
  const { writeFileSync } = await import('node:fs');
  writeFileSync(`public/icon-${size}.png`, Buffer.from(data.split(',')[1], 'base64'));
}
await browser.close();
console.log('public/icon-512.png, icon-192.png, icon-180.png');
