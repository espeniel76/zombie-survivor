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

  // ── 전설: 저마다 전투 방식이 완전히 다른 영웅 ──
  A('echo', '메아리술사', 4, 'echo', { power: 0.6 }, { shirt: 0x2aa198, gun: 'fork', glow: 0x7fffd4 }, '옆 칸 아군의 공격을 따라 합니다.'),
  A('wisp', '도깨비불 술사', 4, 'wisps', { dmg: 6, rate: 0.8, range: 380, count: 2, max: 6, life: 5, speed: 230, sting: 0.5 }, { shirt: 0x1d2440, gun: 'talisman', glow: 0x6fd8ff }, '끝까지 쫓아가는 도깨비불을 띄웁니다.'),
  A('magnetist', '자력술사', 4, 'push', { dmg: 30, rate: 0.25, range: 240, force: 220 }, { shirt: 0xd8323c, gun: 'magnet', glow: 0x6fa8ff }, '주변 좀비를 한꺼번에 밀쳐 냅니다.'),
  A('clown', '폭탄 광대', 4, 'bounce', { dmg: 38, rate: 0.55, range: 360, radius: 55, bounces: 3, bounceRange: 200 }, { shirt: 0xf4f4f4, gun: 'bomb', glow: 0xff7ad1 }, '폭탄이 좀비 사이를 세 번 튕깁니다.'),
  A('swamp', '늪지 마녀', 4, 'swamp', { dmg: 10, rate: 0.5, range: 320, radius: 42, life: 7, slow: 0.45, max: 5 }, { shirt: 0x4a5a2a, gun: 'broom', glow: 0x9be15d }, '좀비 발밑에 끈적한 늪을 만듭니다.'),

  // ── 신화: 규칙 자체를 바꾸는 영웅 ──
  A('gravity', '중력 조종자', 5, 'gravity', { dmg: 14, rate: 0.17, range: 460, radius: 115, time: 2.6, burst: 160, pull: 170 }, { shirt: 0x3a2a7a, gun: 'orb', glow: 0x8a6cff }, '중력장으로 좀비 떼를 빨아들입니다.'),
  A('demon', '악마 계약자', 5, 'pact', { dmg: 70, rate: 0.9, range: 440, pierce: 3, speed: 760, maxMul: 3 }, { shirt: 0x7a1020, gun: 'scroll', glow: 0xff1f1f }, '기지가 다칠수록 지옥불이 세집니다.'),
  A('puppeteer', '꼭두각시 인형사', 5, 'puppet', { dmg: 40, rate: 0.2, range: 400, time: 7 }, { shirt: 0x5a2a6a, gun: 'cross', glow: 0xd28aff }, '좀비를 조종해 서로 싸우게 합니다.'),
  A('timethief', '시간 도둑', 5, 'timestop', { dmg: 20, rate: 0.12, range: 320, time: 2.2, vuln: 0.6, slowAll: 0.15 }, { shirt: 0x1f4a5a, gun: 'watch', glow: 0x5fe0ff }, '시간을 훔쳐 좀비를 멈춰 세웁니다.'),
  A('mirror', '거울 기사', 5, 'mirror', { dmg: 25, mul: 6, guard: 0.2 }, { shirt: 0x9fb8d0, gun: 'mirror', glow: 0xbfe9ff }, '기지를 때린 좀비에게 되갚아 줍니다.'),
  A('dream', '꿈의 요정', 5, 'sleep', { dmg: 10, rate: 0.2, range: 380, radius: 110, time: 6, wake: 3 }, { shirt: 0xf2a8d8, gun: 'wand', glow: 0xffb8f0 }, '재운 좀비를 깨우며 세 배로 때립니다.'),
  A('gambler', '운명의 도박사', 5, 'dice', { dmg: 45, rate: 1.1, range: 420, speed: 760 }, { shirt: 0x2a5a3a, gun: 'dice', glow: 0xffd84a }, '주사위를 굴려 6이 나오면 대박!'),
  A('scarecrow', '허수아비 술사', 5, 'decoy', { dmg: 120, rate: 0.14, range: 380, hp: 320, time: 9, radius: 170 }, { shirt: 0xb08a4a, gun: 'pitchfork', glow: 0xffc860 }, '허수아비를 세워 좀비를 꾀어냅니다.'),
  A('souls', '영혼 수집가', 5, 'souls', { dmg: 90, need: 10, count: 6 }, { shirt: 0x2a3a3a, gun: 'jar', glow: 0x9fffd0 }, '모은 영혼을 한꺼번에 쏟아 냅니다.'),
  A('dragon', '용 조련사', 5, 'dragon', { dmg: 10, rate: 6, range: 130, orbit: 270, spin: 0.9 }, { shirt: 0xc8202e, gun: 'horn', glow: 0xff8a3a }, '아기 용이 날아다니며 불을 뿜어요.'),
  A('stone', '석화의 눈', 5, 'stone', { dmg: 4, rate: 2, range: 330, arc: 70, build: 0.22, time: 6 }, { shirt: 0x6a7a5a, gun: 'shield', glow: 0xc9c2a0 }, '바라본 좀비를 돌로 만들어 버립니다.'),
  A('frog', '개구리 마법사', 5, 'frog', { dmg: 10, rate: 0.35, range: 380, count: 4, time: 5, vuln: 1, radius: 150 }, { shirt: 0x4fae5a, gun: 'lilystaff', glow: 0x9be15d }, '좀비 무리를 개구리로 바꿔 버립니다.'),
  A('ghost', '유령 소환사', 5, 'ghost', { dmg: 60, chance: 0.35, radius: 60 }, { shirt: 0xd8dde8, gun: 'bell', glow: 0xe8f0ff }, '쓰러진 좀비가 유령이 되어 돌진!'),
  A('tornado', '회오리 술사', 5, 'tornado', { dmg: 25, rate: 0.2, range: 420, speed: 150, life: 3.5, radius: 52 }, { shirt: 0x7a9ab0, gun: 'fan', glow: 0xd7eef8 }, '회오리로 좀비를 휩쓸어 버립니다.'),
  A('plague', '역병 의사', 5, 'plague', { dmg: 16, rate: 1, range: 340, time: 4, spread: 95, speed: 520 }, { shirt: 0x22262c, gun: 'lantern', glow: 0x7fdc4a }, '쓰러진 좀비가 역병을 옮깁니다.'),
];

// 전설·신화 영웅: role = 상점에 작게 나오는 능력 이름, quote = 한 줄 대사.
export const HEROES = {
  echo: { role: '메아리', quote: '네가 한 번 쏘면, 나는 한 번 더.' },
  wisp: { role: '도깨비불', quote: '불을 끄려 해 봐. 쫓아가는 건 불 쪽이니까.' },
  magnetist: { role: '밀어내기', quote: '같은 극끼리는 만날 수 없지.' },
  clown: { role: '튕기는 폭탄', quote: '박수는 세 번째 폭발 뒤에.' },
  swamp: { role: '늪', quote: '한 발짝만 더. 그다음은 늪이 알아서 해.' },
  gravity: { role: '중력장', quote: '모든 것은 결국 한 점으로 떨어진다.' },
  demon: { role: '피의 계약', quote: '대가는 이미 치렀다. 이제 내 차례.' },
  puppeteer: { role: '조종', quote: '실 끝에 매달린 건 너희 쪽이야.' },
  timethief: { role: '시간 정지', quote: '1초면 충분해. 너희 1초는 내 거니까.' },
  plague: { role: '전염', quote: '한 마리면 충분하다. 나머지는 알아서 옮는다.' },
  mirror: { role: '반사', quote: '네가 휘두른 그대로 돌려주지.' },
  dream: { role: '잠', quote: '쉿, 착하지. 깰 때 조금 아플 거야.' },
  gambler: { role: '주사위', quote: '인생은 한 판. 오늘은 6이 나올 것 같은데?' },
  scarecrow: { role: '미끼', quote: '저기 맛있는 게 있네. 가 봐.' },
  souls: { role: '영혼', quote: '쓰러진 자는 모두 내 병 속으로.' },
  dragon: { role: '아기 용', quote: '작아도 용이야. 불은 진짜라고.' },
  stone: { role: '석화', quote: '눈을 마주친 순간, 끝이야.' },
  frog: { role: '변신', quote: '개굴. 그게 너희가 할 수 있는 말의 전부야.' },
  ghost: { role: '유령', quote: '쓰러져도 끝이 아니야. 이제 내 편이지.' },
  tornado: { role: '회오리', quote: '바람이 데려가는 곳이 너희 무덤이야.' },
};
for (const a of ALLIES) {
  const h = HEROES[a.id];
  if (h) Object.assign(a, { role: h.role, quote: h.quote, hero: true });
}

export const ALLY = Object.fromEntries(ALLIES.map(a => [a.id, a]));
export const MAX_ALLY_LEVEL = 5;
