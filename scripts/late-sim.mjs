// 30→50웨이브 버티기 점검: 팀을 정해 두고 3배속으로 돌려 웨이브마다 기지 체력과 걸린 시간을 찍는다.
//   npm run dev 를 켜 두고: node scripts/late-sim.mjs [strong|mid] [시작 웨이브-1]
import { chromium } from 'playwright-core';
const mode = process.argv[2] || 'strong';
const browser = await chromium.launch({ channel: 'msedge', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 450, height: 800 } });
const errs = []; page.on('pageerror', e => errs.push(e.message));
await page.addInitScript(() => localStorage.setItem('zombie-survivor-save-v1', JSON.stringify({ coins: 0, meta: { unlocked: ['gravity', 'timethief', 'shadowlord', 'dragon', 'plague', 'executioner', 'stone', 'souls'] }, story: { prologue: true, seen: [5, 10, 15, 20, 25, 30, 35, 40, 45, 50] } })));
await page.goto('http://localhost:5181/?w=' + (process.argv[3] || 29)); await page.waitForTimeout(2000);
await page.evaluate(() => window.__game.scene.getScene('Title').scene.start('Game', { preview: null }));
await page.waitForTimeout(1200);
await page.evaluate(m => {
  const g = window.__game.scene.getScene('Game');
  g.coins = 1e9;
  // strong: 신화 6 + 전설 3 모두 Lv5 / mid: 50웨이브까지 모을 만한 코인(약 12만)으로 살 수 있는 정도
  const team = m === 'strong'
    ? [['gravity', 5], ['timethief', 5], ['shadowlord', 5], ['dragon', 5], ['plague', 5], ['executioner', 5], ['echo', 5], ['magnetist', 5], ['clown', 5]]
    : [['gravity', 4], ['shadowlord', 4], ['dragon', 3], ['plague', 3], ['echo', 3], ['clown', 3], ['wisp', 3], ['grenadier', 5], ['electrician', 5]];
  team.forEach(([id, lv], i) => { g.buy(id, i); for (let k = 1; k < lv; k++) g.upgrade(i); });
  g.coins = 0;
  g.wave = +(new URLSearchParams(location.search).get('w') || 29); g.phase = 'break'; g.phaseLeft = 0;
  g.setSpeed(3);
}, mode);
const t0 = Date.now();
let last = +(process.argv[3] || 29);
let tw = Date.now();
while (Date.now() - t0 < 520000) {
  const st = await page.evaluate(() => {
    const g = window.__game.scene.getScene('Game');
    const ui = window.__game.scene.getScene('UI');
    if (!g.zombies) return { weird: true, status: g.sys.settings.status, keys: Object.keys(g).length, active: window.__game.scene.getScenes(true).map(x => x.sys.settings.key) };
    if (ui.perkChoices) ui.choosePerk(ui.perkChoices[0]);
    if (ui.storyOpen) return { wave: g.wave, phase: 'ending', hp: g.baseHp };
    // 전장 코인으로 약한 칸부터 강화
    if (g.cells) for (let i = 0; i < 9; i++) if (g.cells[i]) g.upgrade(i);
    return { wave: g.wave, phase: g.phase, hp: Math.round(g.baseHp), max: g.baseMax, event: g.event, alive: g.zombies.length, boss: g.boss ? Math.round(g.boss.hp / g.boss.maxHp * 100) + '%' : null };
  });
  if (st.wave !== last) {
    console.log(`웨이브 ${last} 끝 (${((Date.now() - tw) / 1000).toFixed(0)}초) → ${JSON.stringify(st)}`);
    last = st.wave; tw = Date.now();
  }
  if (st.weird) { console.log('WEIRD', JSON.stringify(st)); await page.waitForTimeout(1000); continue; }
  if (st.phase === 'over' || st.phase === 'ending' || st.wave > 50) { console.log('끝:', JSON.stringify(st)); break; }
  await page.waitForTimeout(1000);
}
console.log('errors:', errs.slice(0, 3));
await browser.close();
