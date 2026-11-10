// 보상 카드: 거대 좀비를 쓰러뜨릴 때마다(5웨이브마다) 3장 중 하나를 고른다. 같은 카드를 여러 번 고르면 겹쳐진다.
export const PERKS = [
  { id: 'power', name: '화력', desc: '모든 아군 피해 +15%', color: 0xff8a5a },
  { id: 'haste', name: '속사', desc: '모든 아군 공격 속도 +12%', color: 0xffd84a },
  { id: 'reach', name: '긴 사거리', desc: '모든 아군 사거리 +10%', color: 0x5fb4ff },
  { id: 'crit', name: '급소 공격', desc: '공격의 10%가 피해 2배', color: 0xff5a7a },
  { id: 'wall', name: '두꺼운 벽', desc: '기지 최대 체력 +100 · 바로 100 수리', color: 0x9be15d },
  { id: 'mend', name: '수리 전문가', desc: '웨이브가 끝날 때 기지를 10% 더 고쳐요', color: 0x7fdc9a },
  { id: 'greed', name: '황금 손', desc: '좀비 처치 코인 +25%', color: 0xffc83d },
  { id: 'loot', name: '보급품', desc: '바로 전장 코인 +(웨이브 × 80)', color: 0xe0b04a },
  { id: 'spark', name: '각성 촉진', desc: '영웅 각성 게이지가 40% 빨리 차요', color: 0xc9b8ff },
];
export const PERK = Object.fromEntries(PERKS.map(p => [p.id, p]));

// 서로 다른 카드 n장 뽑기
export function rollPerks(rng = Math.random, n = 3) {
  const pool = PERKS.map(p => p.id);
  const out = [];
  while (out.length < n && pool.length) out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  return out;
}

// 고른 카드들(id → 개수)을 숫자로
export function perkMods(owned = {}) {
  const n = id => owned[id] || 0;
  return {
    dmg: 1 + 0.15 * n('power'),
    rate: 1 + 0.12 * n('haste'),
    range: 1 + 0.1 * n('reach'),
    crit: Math.min(0.5, 0.1 * n('crit')),
    repair: 0.1 * n('mend'),
    coin: 1 + 0.25 * n('greed'),
    gauge: 1 + 0.4 * n('spark'),
  };
}
