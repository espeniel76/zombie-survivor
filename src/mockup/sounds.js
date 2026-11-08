// 효과음 미리 듣기 페이지(sounds.html). 게임과 같은 src/core/sfx.js를 쓴다.
import { sfx, unlockAudio, bakeSounds } from '../core/sfx.js';
import { loadSave } from '../core/save.js';

// 이 페이지에서는 게임 설정의 '소리 꺼짐'과 상관없이 들려준다(저장은 하지 않음)
loadSave().settings.sound = true;

const GROUPS = [
  ['화면·진행', [
    ['click', '버튼'], ['coin', '사기·팔기'], ['level', '강화'], ['wave', '웨이브 시작'],
    ['boss', '거대 좀비 웨이브'], ['win', '웨이브 막아냄'], ['lose', '게임 끝'], ['hurt', '기지가 맞음'],
  ]],
  ['사격', [
    ['pistol', '권총', '신입 경비 · 경찰관'], ['rifle', '소총', '최후의 생존자'], ['sniper', '저격총', '저격수'],
    ['mg', '기관총', '기관총 사수 · 미니건 사수'], ['shotgun', '산탄총', '산탄총 사수'], ['sling', '새총', '새총 소년'],
    ['bow', '활', '사냥꾼'], ['swish', '던지기', '요리사 · 벽돌 투수'], ['dart', '독침', '독 연구원'],
    ['icegun', '얼음 탄', '냉동 기술자'],
  ]],
  ['특수 공격', [
    ['launch', '유탄 발사', '유탄병'], ['rocket', '로켓 발사', '로켓 사수'], ['firework', '폭죽 발사', '캠핑족'],
    ['mortar', '박격포', '박격포병'], ['radio', '폭격 요청', '궤도 포격 통신병'], ['flame', '화염', '소방관 · 화염방사병'],
    ['zap', '번개 사슬', '전기 기사'], ['tesla', '감전 범위', '테슬라 기술자'], ['frost', '눈보라 범위', '눈보라 기술자'],
    ['laser', '레이저', '레이저 병사'], ['plasma', '플라즈마', '플라즈마 병사'],
  ]],
  ['맞음·터짐', [
    ['impact', '벽돌 맞음'], ['boom', '폭발'], ['bigboom', '큰 폭발', '궤도 폭격'], ['sparkle', '폭죽 터짐'],
    ['poof', '좀비 사라짐'], ['bosspoof', '거대 좀비 쓰러짐'],
  ]],
];

const root = document.getElementById('groups');
for (const [title, list] of GROUPS) {
  const h = document.createElement('h2');
  h.textContent = title;
  const row = document.createElement('div');
  row.className = 'row';
  for (const [name, label, who] of list) {
    const b = document.createElement('button');
    b.innerHTML = `${label}${who ? `<small>${who}</small>` : ''}`;
    b.onclick = () => {
      unlockAudio();
      // 처음 누를 때 소리 장치가 켜지는 시간을 조금 기다린다
      setTimeout(() => sfx(name, 0), 30);
    };
    row.append(b);
  }
  root.append(h, row);
}

const status = document.getElementById('status');
bakeSounds().then(() => (status.textContent = '준비됨'));

// 전투 흉내: 아군 여러 명이 쏘고, 터지고, 좀비가 사라지는 10초
const MIX = [
  ['pistol', 1.4], ['rifle', 0.8], ['mg', 7], ['shotgun', 0.6], ['sniper', 0.35], ['flame', 5], ['zap', 0.8],
  ['tesla', 1.6], ['laser', 0.6], ['launch', 0.5], ['boom', 0.6], ['poof', 3.5], ['hurt', 0.3],
];
let battle = 0;
document.getElementById('battle').onclick = () => {
  unlockAudio();
  clearInterval(battle);
  const start = performance.now();
  const flameSide = Math.random() < 0.5 ? -0.6 : 0.6;
  let big = false;
  setTimeout(() => sfx('wave'), 30);
  battle = setInterval(() => {
    const t = (performance.now() - start) / 1000;
    if (t > 10) {
      clearInterval(battle);
      sfx('win');
      return;
    }
    if (t < 1.4) return;
    for (const [name, perSec] of MIX) {
      if (Math.random() < perSec * 0.02) sfx(name, name === 'flame' ? flameSide : Math.random() * 2 - 1);
    }
    if (!big && t > 6) {
      big = true;
      sfx('bigboom');
    }
  }, 20);
};
