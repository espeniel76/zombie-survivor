// 안드로이드 앱 만들기: 웹 게임을 앱용으로 빌드해 app/assets/game 에 넣고, 플러터로 APK를 만든다.
//   npm run app                  → 휴대폰에 바로 깔아 볼 수 있는 APK
//   npm run app -- --debug-web   → 같은 APK인데 PC 크롬(chrome://inspect)으로 앱 속 게임을 들여다볼 수 있다
// 게임을 고쳤으면 이것만 다시 돌리면 된다(플러터 쪽 코드는 그대로).
import { execSync } from 'node:child_process';
import { existsSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';

const run = (cmd, cwd = '.') => execSync(cmd, { stdio: 'inherit', cwd, shell: true });

// 1) 웹 게임을 앱용으로(서비스 워커 없이, 뒤로 가기·일시정지 창구 켜고) 빌드
run('npx vite build --mode app --outDir app/assets/game --emptyOutDir');
for (const f of ['sw.js', '404.html']) rmSync(`app/assets/game/${f}`, { force: true }); // 웹 전용

// 2) 플러터로 APK.
// 폴더 이름(좀비 생존자)에 한글이 있으면 안드로이드·다트 빌드 도구가 경로를 못 읽는다.
// 그래서 빌드하는 동안만 빈 드라이브 글자(Z: 등)에 이 폴더를 잠깐 이어 붙여 영어 경로로 빌드한다.
let root = process.cwd();
let drive = null;
if (process.platform === 'win32' && /[^\x00-\x7f]/.test(root)) {
  drive = [...'ZYXWVUTSRQ'].find(l => !existsSync(`${l}:\\`));
  if (!drive) throw new Error('빈 드라이브 글자가 없어요');
  execSync(`subst ${drive}: "${root}"`);
  root = `${drive}:\\`;
}
try {
  const debugWeb = process.argv.includes('--debug-web');
  run(`flutter build apk --release${debugWeb ? ' --dart-define=WEB_DEBUG=true' : ''}`, join(root, 'app'));
} finally {
  if (drive) execSync(`subst ${drive}: /D`);
}

const apk = 'app/build/app/outputs/flutter-apk/app-release.apk';
console.log(`\nAPK: ${apk} (${(statSync(apk).size / 1024 / 1024).toFixed(1)} MB)`);
