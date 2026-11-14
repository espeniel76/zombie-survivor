// 화면과 상관없는 순수 규칙들. test/rules.test.js 에서 확인한다.
import { ALLY, ALLIES, MAX_ALLY_LEVEL, BOX_ONLY } from '../data/allies.js';
import { ZOMBIES } from '../data/zombies.js';

export const START_COINS = 200;
export const BASE_HP = 300;
export const BREAK_TIME = 8; // 웨이브 사이 쉬는 시간(초). 지나면 다음 웨이브가 저절로 시작된다
export const FIRST_BREAK = 15; // 첫 웨이브 전 준비 시간(초)
export const BOSS_EVERY = 5;
export const MAX_ALIVE = 160;

// ── 메인 화면 상점(판이 끝나도 남는 것) ──
// 좀비를 잡으면 코인을 떨어뜨리고, 주운 코인(보유 코인)은 판이 끝나도 남는다.
// 신화는 메인 화면 상점에서 보유 코인으로 한 번 해금해야 전장 상점에 나온다.
export const MYTHIC_UNLOCK = 2000;
const DROP = {
  walker: 1, runner: 1, spitter: 2, brute: 4, boss: 30,
  armored: 3, splitter: 2, splitling: 0, healer: 3,
  charger: 35, gravedigger: 35, ironclad: 40, rainlord: 500,
  spewer: 30, shade: 30, frostgiant: 40, drummer: 40, foreman: 45,
};
export function dropCoins(kind) {
  return DROP[kind] ?? 1;
}
export function needsUnlock(id) {
  return ALLY[id].tier >= 5;
}
// 메인 상점에서 코인으로 해금할 수 있는 신화(상자 전용·이터널 빼고)
export function shopMythics() {
  return ALLIES.filter(a => a.tier === 5 && !BOX_ONLY.has(a.id));
}

// ── 황금 열쇠 이벤트 ──
// 좀비 5마리 중 1마리꼴로 금빛 좀비. 쓰러뜨리면 황금 열쇠 1개. 열쇠 50개로 전설 상자 하나.
export const GOLDEN_CHANCE = 0.2;
export const BOX_PRICE = 50;
// 전설 상자: 1% 이터널, 12%씩 상자 신화 둘, 25% 잠긴 신화 하나 해금, 나머지는 보유 코인
export function openBox(save, rng = Math.random) {
  if ((save.keys || 0) < BOX_PRICE) return null;
  save.keys -= BOX_PRICE;
  save.meta.unlocked = save.meta.unlocked || [];
  const has = id => save.meta.unlocked.includes(id);
  const give = id => {
    if (has(id)) { // 이미 있으면 보유 코인으로
      save.coins = (save.coins || 0) + 2000;
      return { type: 'dup', id, coins: 2000 };
    }
    save.meta.unlocked.push(id);
    return { type: 'hero', id };
  };
  const r = rng();
  if (r < 0.01) return give('guardian');
  if (r < 0.13) return give('emperor');
  if (r < 0.25) return give('goldlord');
  if (r < 0.5) {
    const locked = shopMythics().filter(a => !has(a.id));
    if (locked.length) return give(locked[Math.floor(rng() * locked.length)].id);
  }
  const coins = 500 + Math.floor(rng() * 11) * 100;
  save.coins = (save.coins || 0) + coins;
  return { type: 'coins', coins };
}

// ── 오늘의 도전: 날마다 규칙 하나, 목표 웨이브를 넘기면 황금 열쇠 10개(하루 한 번) ──
export const DAILY = [
  { id: 'low', name: '일반·고급만', desc: '일반·고급 아군만 쓸 수 있어요', goal: 12, maxTier: 1 },
  { id: 'wall', name: '얇은 벽', desc: '기지 체력 100으로 시작해요', goal: 15, baseHp: 100 },
  { id: 'fast', name: '빠른 좀비', desc: '모든 좀비가 35% 빨라요', goal: 15, zSpeed: 1.35 },
  { id: 'nomyth', name: '신화 금지', desc: '전설까지만 쓸 수 있어요', goal: 25, maxTier: 4 },
  { id: 'tough', name: '튼튼한 좀비', desc: '모든 좀비 체력 1.5배', goal: 15, zHp: 1.5 },
  { id: 'poor', name: '빈손 시작', desc: '시작 코인 50', goal: 15, startCoins: 50 },
  { id: 'nohero', name: '영웅 없이', desc: '영웅 등급까지만 쓸 수 있어요', goal: 20, maxTier: 3 },
];
export const DAILY_KEYS = 10;
export function dayKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function dailyFor(d = new Date()) {
  const n = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
  return DAILY[n % DAILY.length];
}

// ── 주말 보스 러시: 토·일에만. 거대 좀비만 연달아 ──
export function isWeekend(d = new Date()) {
  return d.getDay() === 0 || d.getDay() === 6;
}
export const RUSH_KEYS = 2; // 보스 하나 잡을 때마다 황금 열쇠
export function isUnlocked(save, id) {
  return !needsUnlock(id) || (save?.meta?.unlocked || []).includes(id);
}
// 해금: 성공하면 save를 바꾸고 true
export function unlockMythic(save, id) {
  if (!needsUnlock(id) || isUnlocked(save, id) || (save.coins || 0) < MYTHIC_UNLOCK) return false;
  save.coins -= MYTHIC_UNLOCK;
  save.meta.unlocked = [...(save.meta.unlocked || []), id];
  return true;
}

// ── 맵 ──
// 1번째 맵은 도로 사거리, 2번째 맵(폐허 상점가)은 50웨이브에 도달하면 열린다.
// 2번째 맵은 좀비가 더 세고 새 좀비·이변이 10웨이브 일찍 오지만, 코인을 더 준다.
export const MAPS = {
  field: {
    name: '텅 빈 사거리', desc: '도시 한가운데, 네 길이 만나는 곳', bg: 'map_road',
    props: ['prop_car', 'prop_car', 'prop_cone', 'prop_cone', 'prop_cone', 'prop_barrel', 'prop_crate'],
    shift: 0, hp: 1, dmg: 1, coin: 1, drop: 1, startCoins: START_COINS,
  },
  mall: {
    name: '폐허 상점가', desc: '무너진 가게들 사이 골목 · 좀비가 더 세고 새 좀비가 일찍 와요 · 코인 1.3배 · 떨어뜨리는 코인 2배', bg: 'map_mall',
    props: ['prop_cart', 'prop_cart', 'prop_sign', 'prop_vending', 'prop_bags', 'prop_bags', 'prop_crate'],
    shift: 10, hp: 1.25, dmg: 1.15, coin: 1.3, drop: 2, startCoins: 400, baseHp: 450, tint: 0.1,
  },
};
export const MAP2_WAVE = 50;
export function mapUnlocked(save, id) {
  return id === 'field' || !!save?.meta?.map2;
}

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
  if (s.power) s.power = Math.min(1.5, Math.round((s.power + 0.1 * (lv - 1)) * 100) / 100); // 메아리 위력(Lv5 100%, Lv10 150%)
  if (s.max) s.max += lv - 1; // 벌 최대 수, 가시밭 최대 수
  if (s.slowAll) s.slowAll = Math.min(0.4, Math.round((s.slowAll + 0.03 * (lv - 1)) * 100) / 100); // 시간 도둑: 모든 좀비 느리게(최대 40%)
  if (s.rateBuff) s.rateBuff = s.rateBuff * (1 + 0.25 * (lv - 1));
  if (s.rate) s.rate = s.rate * (1 + rateBuff);
  return s;
}

// ── 웨이브 ──
// 30웨이브까지는 그대로, 그 뒤로는 체력이 덜 가파르게 오른다(대신 새 좀비·이변·보스로 어려워진다)
export function hpMul(w) {
  return (1 + 0.16 * (w - 1)) * Math.pow(1.035, Math.min(w, 30) - 1) * Math.pow(1.015, Math.max(0, w - 30));
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
    // 20웨이브가 넘으면 능력 있는 좀비가 섞인다
    armored: w >= 20 ? Math.min(0.3, 0.1 + (w - 20) * 0.01) : 0,
    splitter: w >= 25 ? Math.min(0.25, 0.1 + (w - 25) * 0.01) : 0,
    healer: w >= 30 ? 0.08 : 0,
  };
}

export function waveSpec(w) {
  // 20웨이브까지는 3마리씩, 그 뒤로는 1마리씩만 늘린다(웨이브가 너무 길어지면 지루하다)
  const base = w <= 20 ? 8 + 3 * (w - 1) : 65 + (w - 20);
  return {
    // 보스 웨이브는 좀비를 줄이고, 마지막 보스 웨이브는 보스가 불러내니 더 줄인다
    count: w === FINAL_WAVE ? Math.round(base * 0.3) : isBossWave(w) ? Math.round(base * 0.6) : base,
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

// ── 거대 좀비 차례 ──
// 5웨이브마다 매번 다른 거대 좀비가 나온다. 50은 마지막 보스, 그 뒤로는 처음부터 다시 돈다.
export const FINAL_WAVE = 50;
export const BOSS_ORDER = ['boss', 'spewer', 'shade', 'charger', 'gravedigger', 'ironclad', 'frostgiant', 'drummer', 'foreman'];
export function bossKind(w) {
  if (w === FINAL_WAVE) return 'rainlord';
  return BOSS_ORDER[(w / BOSS_EVERY - 1) % BOSS_ORDER.length];
}

// ── 웨이브 이변(31웨이브부터, 마지막 보스 웨이브 빼고) ──
// 화면은 밝기만 천천히 바뀐다(번쩍임 없음)
export const EVENTS = {
  fog: { name: '안개', desc: '아군 사거리 -25%', range: 0.75 },
  storm: { name: '폭우', desc: '좀비가 25% 빨라요', zSpeed: 1.25 },
  gold: { name: '황금 웨이브', desc: '처치 코인 2배', coin: 2 },
  horde: { name: '대군', desc: '좀비 1.5배 · 체력 -30%', count: 1.5, hp: 0.7 },
  giants: { name: '거인의 밤', desc: '좀비 절반 · 체력 2배', count: 0.5, hp: 2, size: 1.2 },
  redmoon: { name: '붉은 달', desc: '좀비 공격력 +40% · 코인 +50%', zDmg: 1.4, coin: 1.5 },
};
export function waveEvent(w, prev = null, rng = Math.random) {
  if (w <= 30 || isBossWave(w)) return null; // 보스 웨이브는 보스가 곧 이변
  const keys = Object.keys(EVENTS).filter(k => k !== prev);
  return keys[Math.floor(rng() * keys.length)];
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

// ── 각성 ──
export const AWAKEN_TIME = 8; // 각성이 이어지는 시간(초)
export const AWAKEN_CHARGE = 26; // 웨이브 중 게이지가 가득 차는 데 걸리는 시간(초)

// 각성한 영웅의 수치: 더 세고, 더 빠르고, 더 넓게
export function awakenStats(st) {
  const s = { ...st };
  for (const k of ['dmg', 'poison', 'burst', 'hps']) if (s[k]) s[k] = Math.round(s[k] * 2);
  if (s.rate) s.rate *= 2;
  if (s.range && s.range < 1500) s.range = Math.round(s.range * 1.25);
  if (s.radius) s.radius = Math.round(s.radius * 1.3);
  if (s.spin) s.spin *= 2;
  if (s.width) s.width *= 1.5;
  if (s.count) s.count += 1;
  if (s.max) s.max += 2;
  if (s.power) s.power = Math.max(1, s.power); // Lv6 이상 메아리술사는 이미 100%가 넘으니 깎지 않는다
  if (s.threshold) s.threshold = Math.min(0.6, s.threshold + 0.15);
  if (s.guard) s.guard = Math.min(0.6, s.guard + 0.2);
  if (s.time) s.time = Math.round(s.time * 1.3 * 10) / 10;
  return s;
}
