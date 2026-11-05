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
};
