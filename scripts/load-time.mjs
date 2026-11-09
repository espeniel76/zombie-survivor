// 휴대폰 비슷한 조건(CPU 4배 느리게, 4G 정도 인터넷)에서 켜지는 시간을 잰다.
//   npm run build && npx vite preview --port 4173
//   node scripts/load-time.mjs [주소] [CPU 배수]
import { chromium } from 'playwright-core';

const URL = process.argv[2] || 'http://localhost:4173/';
const cpu = +(process.argv[3] || 4);
const browser = await chromium.launch({ channel: 'msedge', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 450, height: 800 } });
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
await cdp.send('Network.enable');
await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 9e6 / 8, uploadThroughput: 1e6 / 8 });
await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
const mark = name => page.waitForFunction(n => performance.getEntriesByName(n).length > 0, name, { timeout: 120000 }).catch(() => {});
for (const run of ['처음', '두 번째']) {
  let bytes = 0;
  const onRes = r => r.request().sizes().then(s => (bytes += s.responseBodySize + s.responseHeadersSize)).catch(() => {});
  page.on('response', onRes);
  const t0 = Date.now();
  await page.goto(URL, { waitUntil: 'commit' });
  await mark('title');
  const tTitle = Date.now() - t0;
  // 화면에 처음 뭔가 보인 때(불러오기 화면) — 페이지 기준 시각에 요청 지연을 더한다
  const tLoader = await page.evaluate(() => Math.round(performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? -1));
  await mark('baked');
  const tSound = Date.now() - t0;
  page.off('response', onRes);
  console.log(`${run}: 처음 보이는 화면 ${tLoader}ms(페이지 시작부터) · 첫 화면 ${tTitle}ms · 효과음 준비 ${tSound}ms · 받은 양 ${(bytes / 1024).toFixed(0)}KB`);
  await page.waitForTimeout(2500); // 서비스 워커가 저장할 시간
}
await browser.close();
