// 효과음 점검: 화면 없는 Edge에서 모든 소리를 구워 보고 길이·크기를 표로 보여 준다.
//   npm run dev  (먼저 켜 둔다)
//   node scripts/sound-check.mjs
// 크게(dB) = 가장 시끄러운 50ms 구간의 평균 크기 × 재생 음량. 0에 가까울수록 크다.
import { chromium } from 'playwright-core';

const URL = (process.env.SMOKE_URL || 'http://localhost:5181/') + 'sounds.html';
const browser = await chromium.launch({ channel: 'msedge' });
const page = await browser.newPage();
const problems = [];
page.on('pageerror', e => problems.push(`pageerror: ${e.message}`));
page.on('console', m => m.type() === 'error' && problems.push(`console: ${m.text()}`));
await page.goto(URL);

const rows = await page.evaluate(async () => {
  const m = await import('/src/core/sfx.js');
  const t0 = performance.now();
  await m.bakeSounds();
  const ms = Math.round(performance.now() - t0);
  const db = v => (v > 0 ? (20 * Math.log10(v)).toFixed(1) : '-inf');
  let bytes = 0;
  const out = m.SOUND_NAMES.map(name => {
    const list = m.bakedBuffers[name] || [];
    const vol = m.soundVolume(name);
    let loud = 0;
    let len = 0;
    let bad = false;
    for (const b of list) {
      const d = b.getChannelData(0);
      bytes += d.length * 4;
      len = Math.max(len, b.duration);
      const win = Math.floor(b.sampleRate * 0.05);
      let sum = 0;
      for (let i = 0; i < d.length; i++) {
        if (!Number.isFinite(d[i])) bad = true;
        sum += d[i] * d[i];
        if (i >= win) sum -= d[i - win] * d[i - win];
        if (i >= win - 1) loud = Math.max(loud, Math.sqrt(Math.max(0, sum) / win));
      }
    }
    return { name, variants: list.length, sec: len.toFixed(2), loudDb: db(loud * vol), bad };
  });
  return { ms, mb: (bytes / 1048576).toFixed(1), out };
});

console.table(rows.out);
console.log(`굽는 시간 ${rows.ms}ms, 메모리 ${rows.mb}MB`);
await browser.close();
const broken = rows.out.filter(r => !r.variants || r.bad).map(r => r.name);
if (broken.length) problems.push(`못 구운 소리: ${broken.join(', ')}`);
if (problems.length) {
  console.log('PROBLEMS:\n' + [...new Set(problems)].join('\n'));
  process.exit(1);
}
console.log('OK');
