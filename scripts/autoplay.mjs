// 균형 확인용 자동 플레이. 단순한 전략(빈 칸엔 살 수 있는 가장 비싼 공격 아군, 꽉 차면 강화/교체)으로
// 몇 웨이브까지 가는지 본다.   npm run dev 를 켠 뒤:  node scripts/autoplay.mjs [실제 초]
import { chromium } from 'playwright-core';

const SECONDS = Number(process.argv[2] || 150);
const browser = await chromium.launch({ channel: 'msedge', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 450, height: 800 } });
page.on('pageerror', e => console.log('pageerror', e.message));
await page.goto(process.env.SMOKE_URL || 'http://localhost:5181/');
await page.waitForTimeout(1000);
await page.evaluate(() => window.__game.scene.getScene('Title').scene.start('Game', { preview: null }));
await page.waitForTimeout(800);

let lastWave = -1;
for (let s = 0; s < SECONDS; s++) {
  const st = await page.evaluate(() => {
    const g = window.__game.scene.getScene('Game');
    if (!g || g.phase === 'over') return { over: true, wave: g?.wave, kills: g?.kills };
    g.setSpeed(3);
    const allies = window.__allies;
    const R = window.__rules;
    const attackers = allies.filter(a => !['repair', 'money', 'buff'].includes(a.kind));
    // 빈 칸 채우기
    for (;;) {
      const i = g.firstEmpty();
      if (i < 0) break;
      const empty = g.cells.filter(x => !x).length;
      const budget = empty > 4 ? g.coins / 2 : g.coins;
      const pick = attackers.filter(a => a.price <= Math.max(budget, 55)).sort((a, b) => b.price - a.price)[0];
      if (pick && pick.price > g.coins) break;
      if (!pick) break;
      g.buy(pick.id);
    }
    // 꽉 찼으면: 더 높은 등급으로 교체하거나 강화
    if (g.firstEmpty() < 0) {
      let worst = -1;
      for (let i = 0; i < 9; i++) {
        const u = g.cells[i];
        if (worst < 0 || allies.find(a => a.id === u.id).price < allies.find(a => a.id === g.cells[worst].id).price) worst = i;
      }
      const wu = g.cells[worst];
      const wa = allies.find(a => a.id === wu.id);
      const better = attackers.filter(a => a.tier > wa.tier && a.price <= g.coins + R.sellPrice(wu.id, wu.level)).sort((a, b) => b.price - a.price)[0];
      if (better && better.price > wa.price * 2) {
        g.sell(worst);
        g.buy(better.id, worst);
      } else {
        for (let i = 0; i < 9; i++) {
          const u = g.cells[i];
          const c = R.upgradeCost(u.id, u.level);
          if (c != null && c <= g.coins * 0.5) g.upgrade(i);
        }
      }
    }
    if (g.phase === 'break') g.skipBreak();
    return {
      wave: g.wave, phase: g.phase, hp: Math.round(g.baseHp), coins: g.coins, alive: g.zombies.length,
      team: g.cells.map(u => (u ? `${u.id}${u.level}` : '-')).join(' '), fps: Math.round(window.__game.loop.actualFps),
    };
  });
  if (st.over) {
    console.log(`GAME OVER at wave ${st.wave}, kills ${st.kills}, after ${s}s real`);
    break;
  }
  if (st.wave !== lastWave) {
    console.log(`[${s}s] wave ${st.wave} hp ${st.hp} coins ${st.coins} fps ${st.fps} | ${st.team}`);
    lastWave = st.wave;
  }
  await page.waitForTimeout(1000);
}
await browser.close();
