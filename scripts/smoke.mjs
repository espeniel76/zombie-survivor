// 실제 브라우저(Edge, 화면 없이)로 게임을 켜서 굴려 본다. 빌드가 통과해도 런타임에서 죽는 경우를 거른다.
//   npm run dev  (먼저 켜 둔다)
//   npm run smoke
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const URL = process.env.SMOKE_URL || 'http://localhost:5181/';
mkdirSync('shots', { recursive: true });

const browser = await chromium.launch({
  channel: 'msedge',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 450, height: 800 } });
const problems = [];
page.on('pageerror', e => problems.push(`pageerror: ${e.message}`));
page.on('console', m => m.type() === 'error' && problems.push(`console: ${m.text()}`));

const wait = ms => page.waitForTimeout(ms);
const shot = name => page.screenshot({ path: `shots/${name}.png` });
const tapGame = async (gx, gy) => {
  const box = await page.locator('#game canvas').boundingBox();
  await page.mouse.click(box.x + (gx * box.width) / 720, box.y + (gy * box.height) / 1280);
};

await page.goto(URL);
await wait(1200);
await shot('1-title');

await tapGame(360, 878); // 아군 도감
await wait(400);
await tapGame(110, 216);
await wait(300);
await shot('2-book');
await tapGame(360, 1170); // 뒤로
await wait(300);

await tapGame(360, 660); // 게임 시작
await wait(1000);
await tapGame(360, 1160); // 처음 이야기(프롤로그) 건너뛰기
await wait(600);
await tapGame(360, 650); // 가운데 빈 칸 → 상점
await wait(400);
await shot('3-shop');
await tapGame(600, 386); // 첫 아군 구매
await wait(300);
await tapGame(360, 1180); // 닫기
await wait(300);

// 테스트용: 코인을 넣고 여러 등급 아군을 세운 뒤 3배속으로 돌린다
await page.evaluate(() => {
  const g = window.__game.scene.getScene('Game');
  g.coins = 99999;
  ['sniper', 'firefighter', 'electrician', 'commander', 'echo', 'gravity', 'puppeteer', 'plague'].forEach(id => g.buy(id));
  g.setSpeed(3);
  g.skipBreak();
});
await wait(9000);
await shot('4-battle');
await tapGame(260, 650); // 아군 누르기 → 정보
await wait(300);
await shot('5-ally');
await tapGame(360, 300);
await page.evaluate(() => {
  const g = window.__game.scene.getScene('Game');
  g.wave = 9;
  g.endWave();
  g.skipBreak();
});
await wait(5000);
await shot('6-midwave');
await wait(10000);
const state = await page.evaluate(() => {
  const g = window.__game.scene.getScene('Game');
  return { wave: g.wave, phase: g.phase, alive: g.zombies.length, hp: Math.round(g.baseHp), kills: g.kills, boss: !!g.boss };
});
console.log('state', state);
await page.evaluate(() => {
  window.__game.scene.getScene('Game').baseHp = 0;
});
await wait(800);
await shot('7-result');
await tapGame(360, 640 + 140); // 다시 하기
await wait(800);
const after = await page.evaluate(() => {
  const g = window.__game.scene.getScene('Game');
  return { wave: g.wave, phase: g.phase, coins: g.coins, ui: window.__game.scene.isActive('UI') };
});
console.log('restart', after);
await shot('8-restart');

await browser.close();
if (problems.length) {
  console.log('PROBLEMS:\n' + [...new Set(problems)].join('\n'));
  process.exit(1);
}
console.log('OK');
