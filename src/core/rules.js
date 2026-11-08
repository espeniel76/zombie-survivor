// 화면과 상관없는 순수 규칙들. test/rules.test.js 에서 확인한다.
import { ALLY, MAX_ALLY_LEVEL } from '../data/allies.js';
import { ZOMBIES } from '../data/zombies.js';

export const START_COINS = 200;
export const BASE_HP = 300;
export const BREAK_TIME = 20; // 웨이브 사이 쉬는 시간(초)
export const BOSS_EVERY = 5;
export const MAX_ALIVE = 160;

// ── 3×3 칸 ──
// 0 1 2
// 3 4 5
// 6 7 8
export function neighbors(i) {
  const r = Math.floor(i / 3);
  const c = i % 3;
  const out = [];
  if (r > 0) out.push(i - 3);
  if (r < 2) out.push(i + 3);
  if (c > 0) out.push(i - 1);
  if (c < 2) out.push(i + 1);
  return out;
}

// ── 아군 ──
export function levelMul(lv) {
  return 1 + 0.4 * (lv - 1);
}

// lv → lv+1 강화 비용. 최대면 null
export function upgradeCost(id, lv) {
  if (lv >= MAX_ALLY_LEVEL) return null;
  return Math.round(ALLY[id].price * 0.6 * lv);
}

// 판매: 지금까지 쓴 돈의 절반
export function sellPrice(id, lv) {
  let spent = ALLY[id].price;
  for (let l = 1; l < lv; l++) spent += upgradeCost(id, l);
  return Math.round(spent * 0.5);
}

// cells: 길이 9 배열, 각 칸은 null 또는 { id, level }
export function rateBuffAt(cells, i) {
  let buff = 0;
  for (const n of neighbors(i)) {
    const u = cells[n];
    if (u && ALLY[u.id].kind === 'buff') buff += ALLY[u.id].stats.rateBuff * (1 + 0.25 * (u.level - 1));
  }
  return buff;
}

// 레벨과 옆 칸 강화를 반영한 실제 수치
export function allyStats(id, lv, rateBuff = 0) {
  const s = { ...ALLY[id].stats };
  const m = levelMul(lv);
  // 피해·독·수리는 정수로(가장 작은 단위 1)
  if (s.dmg) s.dmg = Math.max(1, Math.round(s.dmg * m));
  if (s.poison) s.poison = Math.max(1, Math.round(s.poison * m));
  if (s.hps) s.hps = Math.max(1, Math.round(s.hps * m));
  if (s.coins) s.coins = Math.round(s.coins * m);
  if (s.burst) s.burst = Math.round(s.burst * m);
  if (s.threshold) s.threshold = Math.min(0.5, Math.round((s.threshold + 0.03 * (lv - 1)) * 100) / 100); // 처형 기준
  // 영웅 전용 수치
  if (s.power) s.power = Math.min(1, Math.round((s.power + 0.1 * (lv - 1)) * 100) / 100); // 메아리 위력
  if (s.max) s.max += lv - 1; // 벌 최대 수, 가시밭 최대 수
  if (s.slowAll) s.slowAll = Math.round((s.slowAll + 0.03 * (lv - 1)) * 100) / 100; // 시간 도둑: 모든 좀비 느리게
  if (s.rateBuff) s.rateBuff = s.rateBuff * (1 + 0.25 * (lv - 1));
  if (s.rate) s.rate = s.rate * (1 + rateBuff);
  return s;
}

// ── 웨이브 ──
export function hpMul(w) {
  return (1 + 0.16 * (w - 1)) * Math.pow(1.035, w - 1);
}

export function damageMul(w) {
  return 1 + 0.04 * (w - 1);
}

export function isBossWave(w) {
  return w % BOSS_EVERY === 0;
}

export function waveWeights(w) {
  return {
    walker: 1,
    runner: w >= 3 ? Math.min(0.6, 0.15 + (w - 3) * 0.05) : 0,
    brute: w >= 6 ? Math.min(0.3, 0.06 + (w - 6) * 0.02) : 0,
    spitter: w >= 8 ? 0.15 : 0,
  };
}

export function waveSpec(w) {
  const base = 8 + 3 * (w - 1);
  return {
    count: isBossWave(w) ? Math.round(base * 0.6) : base,
    interval: Math.max(0.22, 1.1 - w * 0.03),
    boss: isBossWave(w),
  };
}

export function pickZombie(w, rng = Math.random) {
  const weights = waveWeights(w);
  let total = 0;
  for (const k in weights) total += weights[k];
  let r = rng() * total;
  for (const k in weights) {
    r -= weights[k];
    if (r < 0) return k;
  }
  return 'walker';
}

export function zombieHp(kind, w) {
  return Math.round(ZOMBIES[kind].hp * hpMul(w));
}

export function zombieReward(kind, w) {
  return Math.round(ZOMBIES[kind].coins * (1 + 0.15 * (w - 1)));
}

export function waveBonus(w) {
  return 40 + w * 20;
}

// 웨이브를 막을 때마다 기지가 조금 고쳐진다
export const WAVE_REPAIR = 0.15;

export function formatNum(n) {
  return Math.round(n).toLocaleString('ko-KR');
}
