// 좀비 종류. hp와 damage는 웨이브에 따라 커진다(rules.js).
// damage = 기지에 붙었을 때 1초마다 주는 피해, coins = 처치 보상
export const ZOMBIES = {
  walker: { name: '걷는 좀비', tex: 'z_walker', hp: 14, speed: 38, damage: 3, coins: 3, radius: 20 },
  runner: { name: '달리는 좀비', tex: 'z_runner', hp: 10, speed: 78, damage: 2, coins: 3, radius: 18 },
  brute: { name: '덩치 좀비', tex: 'z_brute', hp: 90, speed: 28, damage: 8, coins: 10, radius: 30, heavy: true },
  spitter: {
    name: '침 뱉는 좀비', tex: 'z_spitter', hp: 20, speed: 36, damage: 4, coins: 5, radius: 20,
    spit: { keep: 150, cooldown: 2.5, speed: 190 },
  },
  boss: { name: '거대 좀비', tex: 'z_boss', hp: 520, speed: 24, damage: 10, coins: 120, radius: 46, heavy: true, boss: true },

  // ── 20웨이브부터 새로 나오는 좀비 ──
  // armor = 받는 피해를 이만큼 덜 받는다
  armored: { name: '철갑 좀비', tex: 'z_armored', hp: 40, speed: 30, damage: 5, coins: 7, radius: 22, armor: 0.4 },
  // 쓰러지면 작은 좀비 둘로 갈라진다
  splitter: { name: '분열 좀비', tex: 'z_splitter', hp: 30, speed: 40, damage: 4, coins: 6, radius: 21, split: { kind: 'splitling', count: 2 } },
  splitling: { name: '갈라진 좀비', tex: 'z_splitling', hp: 9, speed: 72, damage: 2, coins: 1, radius: 15 },
  // 주변 좀비를 1초마다 고친다(최대 체력의 pct만큼)
  healer: { name: '치유 좀비', tex: 'z_healer', hp: 26, speed: 34, damage: 3, coins: 9, radius: 20, heal: { radius: 140, pct: 0.05, every: 1 } },

  // ── 20웨이브부터 번갈아 나오는 거대 좀비들 ──
  // 돌진: 잠깐 멈춰 힘을 모았다가 기지 쪽으로 빠르게 달려든다
  charger: { name: '돌진 거인', tex: 'z_charger', hp: 470, speed: 26, damage: 12, coins: 130, radius: 44, heavy: true, boss: true,
    dash: { every: 5, windup: 0.9, time: 0.55, mul: 6 } },
  // 소환: 몇 초마다 주변에 좀비를 불러낸다
  gravedigger: { name: '무덤지기', tex: 'z_gravedigger', hp: 430, speed: 22, damage: 10, coins: 130, radius: 44, heavy: true, boss: true,
    summon: { every: 6, count: 3, kinds: ['walker', 'runner', 'walker'] } },
  ironclad: { name: '철갑 거인', tex: 'z_ironclad', hp: 520, speed: 18, damage: 14, coins: 140, radius: 48, heavy: true, boss: true, armor: 0.45 },
  // 마지막 보스(50웨이브): 소환 + 체력이 2/3, 1/3일 때 검은 비(아군 공격 속도 느려짐)
  rainlord: { name: '비를 부르는 자', tex: 'z_rainlord', hp: 2300, speed: 13, damage: 20, coins: 1500, radius: 58, heavy: true, boss: true, final: true,
    armor: 0.2, summon: { every: 7, count: 4, kinds: ['armored', 'splitter', 'healer', 'runner'] }, blackRain: { at: [0.66, 0.33], time: 6, slow: 0.35 } },
};
