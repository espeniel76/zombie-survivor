// 링크로 공유할 한 장짜리 페이지를 만든다(Phaser는 cdnjs에서, 게임 코드는 페이지 안에).
//   node scripts/build-page.mjs [출력 파일]   기본: dist-page/zombie-survivor.html
import esbuild from 'esbuild';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const out = process.argv[2] || 'dist-page/zombie-survivor.html';
const r = await esbuild.build({
  entryPoints: ['src/main.js'],
  bundle: true,
  format: 'iife',
  minify: true,
  write: false,
  target: 'es2020',
  alias: { phaser: './scripts/phaser-global.js' },
  define: { 'import.meta.env.DEV': 'false' },
});
const js = r.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const html = `<title>좀비 생존자</title>
<style>
  html, body { height: 100%; margin: 0; background: #0b0e12; overflow: hidden; touch-action: none;
    -webkit-tap-highlight-color: transparent; user-select: none; -webkit-user-select: none; overscroll-behavior: none; }
  #game { width: 100%; height: 100%; }
  canvas { display: block; touch-action: none; }
</style>
<div id="game"></div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/phaser/3.90.0/phaser.min.js"></script>
<script>
${js}
</script>
`;
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, html);
console.log(`${out} (${html.length} bytes)`);
