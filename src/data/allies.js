// 아군 등급과 아군 목록.
// kind: bullet(총알) splash(던져서 폭발) strike(표시 후 폭격) flame(화염) beam(관통 광선)
//       chain(연쇄 번개) aura(주변 전체) repair(기지 수리) money(코인 생산) buff(옆 칸 강화)
// rate = 초당 공격 횟수, range = 사거리(px)

export const TIERS = [
  { name: '일반', color: 0x8f9aa5, text: '#b8c2cc', price: 50 },
  { name: '고급', color: 0x2fb344, text: '#55d468', price: 150 },
  { name: '희귀', color: 0x1f7bff, text: '#5a9dff', price: 400 },
  { name: '영웅', color: 0x9b30ff, text: '#b56dff', price: 1000 },
  { name: '전설', color: 0xff8800, text: '#ffa33a', price: 2500 },
  { name: '신화', color: 0xff1f1f, text: '#ff4d4d', price: 6000 },
];

const A = (id, name, tier, kind, stats, look, desc, priceMul = 1) => ({
  id, name, tier, kind, stats, look, desc, price: Math.round(TIERS[tier].price * priceMul),
});

export const ALLIES = [
  // ── 일반 ──
  A('guard', '신입 경비', 0, 'bullet', { dmg: 6, rate: 1, range: 260 }, { shirt: 0x5a6f8a, hat: 0x2c3a4d, gun: 'pistol' }, '권총으로 차근차근 쏩니다.'),
  A('slingkid', '새총 소년', 0, 'bullet', { dmg: 4, rate: 1.7, range: 220, tex: 'pellet', speed: 520 }, { shirt: 0xe0b04a, gun: 'sling' }, '작지만 아주 빠르게 쏩니다.', 0.9),
  A('brick', '벽돌 투수', 0, 'splash', { dmg: 9, rate: 0.6, range: 240, radius: 34, tex: 'brick' }, { shirt: 0x9a5a3a, gun: 'none' }, '벽돌을 던져 근처 좀비까지 맞힙니다.'),
  A('hunter', '사냥꾼', 0, 'bullet', { dmg: 11, rate: 0.7, range: 330, tex: 'arrow', speed: 560 }, { shirt: 0x5f7a3a, hat: 0x6b4f2c, gun: 'bow' }, '멀리 있는 좀비도 활로 맞힙니다.', 1.1),
  A('cook', '요리사', 0, 'bullet', { dmg: 14, rate: 0.8, range: 170, tex: 'pan', speed: 420 }, { shirt: 0xf2f2f2, hat: 0xffffff, gun: 'pan' }, '가까운 좀비에게 프라이팬을 던집니다.'),

  // ── 고급 ──
  A('police', '경찰관', 1, 'bullet', { dmg: 8, rate: 1.5, range: 280, count: 2, spread: 0.08 }, { shirt: 0x2f4d8a, hat: 0x1d2c52, gun: 'pistol' }, '두 발씩 빠르게 쏩니다.'),
  A('firefighter', '소방관', 1, 'flame', { dmg: 4, rate: 6, range: 120, arc: 50 }, { shirt: 0xc8a43a, hat: 0xd94a3a, gun: 'flame' }, '앞쪽 좀비들을 불로 지집니다.'),
  A('mechanic', '정비공', 1, 'repair', { hps: 1.2 }, { shirt: 0x4a6a8a, hat: 0xe0a030, gun: 'wrench' }, '기지 체력을 천천히 고칩니다.', 0.9),
  A('camper', '캠핑족', 1, 'splash', { dmg: 12, rate: 0.7, range: 280, radius: 48, tex: 'firework' }, { shirt: 0x3a8a6a, hat: 0x2a5a4a, gun: 'tube' }, '폭죽을 쏘아 무리를 흩어 놓습니다.'),
  A('courier', '배달부', 1, 'money', { coins: 2, every: 2 }, { shirt: 0xe0583a, hat: 0xe0583a, gun: 'bag' }, '2초마다 코인 2개를 벌어 옵니다.', 1.1),

  // ── 희귀 ──
  A('sniper', '저격수', 2, 'bullet', { dmg: 48, rate: 0.4, range: 620, speed: 1100, target: 'strong', pierce: 2 }, { shirt: 0x4a5a3a, hat: 0x3a4a2a, gun: 'long' }, '가장 강한 좀비를 멀리서 노립니다.'),
  A('gunner', '기관총 사수', 2, 'bullet', { dmg: 5, rate: 6, range: 290, spread: 0.12 }, { shirt: 0x6a6a4a, hat: 0x4a4a2a, gun: 'heavy' }, '총알을 비처럼 쏟아붓습니다.'),
  A('frost', '냉동 기술자', 2, 'bullet', { dmg: 6, rate: 1.2, range: 270, slow: 0.4, slowTime: 2, tex: 'ice' }, { shirt: 0x8ac8e8, hat: 0xd8f0ff, gun: 'rifle' }, '맞은 좀비가 2초 동안 느려집니다.'),
  A('medic', '의무병', 2, 'repair', { hps: 3 }, { shirt: 0xf2f2f2, hat: 0x4cbb6a, gun: 'bag' }, '기지 체력을 빠르게 고칩니다.', 0.9),
  A('shotgunner', '산탄총 사수', 2, 'bullet', { dmg: 7, rate: 0.9, range: 210, count: 6, spread: 0.7, tex: 'pellet', speed: 700, life: 0.4 }, { shirt: 0x7a4a3a, hat: 0x3a2a20, gun: 'rifle' }, '가까운 좀비에게 산탄을 퍼붓습니다.'),

  // ── 영웅 ──
  A('grenadier', '유탄병', 3, 'splash', { dmg: 32, rate: 0.6, range: 340, radius: 72, tex: 'grenade' }, { shirt: 0x5a6a3a, hat: 0x3a4a22, gun: 'tube' }, '유탄으로 넓은 범위를 날려 버립니다.'),
  A('electrician', '전기 기사', 3, 'chain', { dmg: 20, rate: 0.8, range: 290, jumps: 4, jumpRange: 120 }, { shirt: 0xe0c03a, hat: 0x2a2a2a, gun: 'staff' }, '번개가 좀비 5마리를 건너뜁니다.'),
  A('chemist', '독 연구원', 3, 'bullet', { dmg: 4, rate: 1.1, range: 280, poison: 12, poisonTime: 3, tex: 'spit' }, { shirt: 0xd8f0d0, hat: 0x6a9a3a, gun: 'rifle' }, '독을 묻혀 3초간 계속 피해를 줍니다.'),
  A('commander', '지휘관', 3, 'buff', { rateBuff: 0.3 }, { shirt: 0x3a4a6a, hat: 0xc8a43a, gun: 'radio' }, '옆 칸 아군의 공격이 30% 빨라집니다.'),
  A('flamer', '화염방사병', 3, 'flame', { dmg: 9, rate: 6, range: 165, arc: 60 }, { shirt: 0x8a3a2a, hat: 0x2a2a2a, gun: 'flame' }, '거대한 불길로 앞을 휩씁니다.'),

  // ── 전설 ──
  A('laser', '레이저 병사', 4, 'beam', { dmg: 45, rate: 0.75, range: 520, width: 18 }, { shirt: 0x3a5a8a, hat: 0x9fd4ff, gun: 'long', glow: 0x9fd4ff }, '일직선의 좀비를 모두 꿰뚫습니다.'),
  A('mortar', '박격포병', 4, 'strike', { dmg: 70, rate: 0.35, range: 2000, radius: 95, delay: 0.9, target: 'far' }, { shirt: 0x6a5a3a, hat: 0x4a3a22, gun: 'tube' }, '맵 어디든 포탄을 떨어뜨립니다.'),
  A('rocketeer', '로켓 사수', 4, 'splash', { dmg: 90, rate: 0.45, range: 420, radius: 85, tex: 'rocket', speed: 460 }, { shirt: 0x4a4a4a, hat: 0xd94a3a, gun: 'tube' }, '로켓 한 방으로 무리를 지웁니다.'),
  A('tesla', '테슬라 기술자', 4, 'aura', { dmg: 16, rate: 1.6, range: 190 }, { shirt: 0x2a3a5a, hat: 0x5fb4ff, gun: 'staff', glow: 0x5fb4ff }, '주변 좀비를 모두 계속 감전시킵니다.'),
  A('minigunner', '미니건 사수', 4, 'bullet', { dmg: 9, rate: 13, range: 320, spread: 0.1 }, { shirt: 0x5a3a2a, hat: 0x2a2a2a, gun: 'heavy' }, '쉬지 않고 총알을 퍼붓습니다.'),

  // ── 신화 ──
  A('orbital', '궤도 포격 통신병', 5, 'strike', { dmg: 320, rate: 0.22, range: 2000, radius: 150, delay: 1.1, target: 'strong' }, { shirt: 0x2a2a3a, hat: 0xff1f1f, gun: 'radio', glow: 0xff1f1f }, '하늘에서 가장 강한 좀비를 폭격!'),
  A('plasma', '플라즈마 병사', 5, 'beam', { dmg: 130, rate: 0.8, range: 640, width: 26 }, { shirt: 0x5a2a7a, hat: 0xd28aff, gun: 'long', glow: 0xd28aff }, '모든 것을 꿰뚫는 플라즈마를 쏩니다.'),
  A('blizzard', '눈보라 기술자', 5, 'aura', { dmg: 14, rate: 2, range: 250, slow: 0.5, slowTime: 1 }, { shirt: 0xd8f0ff, hat: 0x8ac8e8, gun: 'staff', glow: 0xd8f0ff }, '주변 좀비를 얼려 느리게 만듭니다.'),
  A('merchant', '황금 상인', 5, 'money', { coins: 30, every: 2 }, { shirt: 0xffc83d, hat: 0xffe08a, gun: 'bag', glow: 0xffc83d }, '2초마다 코인 30개를 벌어 옵니다.', 0.8),
  A('lastsurvivor', '최후의 생존자', 5, 'bullet', { dmg: 42, rate: 3, range: 380, count: 3, spread: 0.18, pierce: 3, speed: 820 }, { shirt: 0x8a2a2a, hat: 0x2a2a2a, gun: 'heavy', glow: 0xff1f1f }, '세 발씩, 셋을 꿰뚫는 전설의 사격.'),
];

// 전설·신화는 직업 대신 고유한 이름을 갖는다. role = 원래 직업(상점에 작게 표시), quote = 한 줄 대사.
export const HEROES = {
  laser: { name: '스펙트럼 나이트', quote: '빛은 한 줄로, 끝까지 간다.' },
  mortar: { name: '그라운드 브레이커', quote: '어디에 숨든, 하늘에서 떨어진다.' },
  rocketeer: { name: '크림슨 레인저', quote: '붉은 꼬리가 지나가면 길이 열린다.' },
  tesla: { name: '볼트 위버', quote: '들어오는 건 자유, 나가는 건 아니고.' },
  minigunner: { name: '리드 스톰', quote: '멈추는 법은 배운 적 없다.' },
  orbital: { name: '제니스', quote: '좌표 확인. 하늘이 대답한다.' },
  plasma: { name: '보이드 랜서', quote: '꿰뚫지 못할 것은 없다.' },
  blizzard: { name: '아이스마스터', quote: '이 겨울은 내가 끝낼 때 끝난다.' },
  merchant: { name: '골든 바론', quote: '전쟁도 결국 장사지.' },
  lastsurvivor: { name: '루나 헌터', quote: '마지막까지 서 있는 건 언제나 나.' },
};
for (const a of ALLIES) {
  const h = HEROES[a.id];
  if (h) Object.assign(a, { role: a.name, name: h.name, quote: h.quote, hero: true });
}

export const ALLY = Object.fromEntries(ALLIES.map(a => [a.id, a]));
export const MAX_ALLY_LEVEL = 5;
