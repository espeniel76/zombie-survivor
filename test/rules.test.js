import { describe, it, expect } from 'vitest';
import {
  awakenStats,
  neighbors, upgradeCost, sellPrice, rateBuffAt, allyStats, hpMul, waveSpec, pickZombie,
  zombieHp, isBossWave, dropCoins, isUnlocked, unlockMythic, MYTHIC_UNLOCK,
  bossKind, waveEvent, EVENTS, FINAL_WAVE, MAPS, mapUnlocked,
} from '../src/core/rules.js';
import { rollPerks, perkMods } from '../src/data/perks.js';
import { ALLIES, ALLY, TIERS, MAX_ALLY_LEVEL } from '../src/data/allies.js';

describe('3×3 칸', () => {
  it('가운데 칸은 상하좌우 4칸과 붙어 있다', () => {
    expect(neighbors(4).sort()).toEqual([1, 3, 5, 7]);
  });
  it('모서리 칸은 2칸, 변 칸은 3칸과 붙어 있다', () => {
    expect(neighbors(0).sort()).toEqual([1, 3]);
    expect(neighbors(8).sort()).toEqual([5, 7]);
    expect(neighbors(1).sort()).toEqual([0, 2, 4]);
  });
});

describe('아군 목록', () => {
  it('일반~전설은 5명씩, 신화는 15명, 모두 이름과 설명이 있다', () => {
    TIERS.forEach((_, t) => expect(ALLIES.filter(a => a.tier === t)).toHaveLength(t === 5 ? 15 : 5));
    for (const a of ALLIES) {
      expect(a.name).toBeTruthy();
      expect(a.desc).toBeTruthy();
      expect(a.price).toBeGreaterThan(0);
    }
    expect(new Set(ALLIES.map(a => a.id)).size).toBe(ALLIES.length);
  });
  it('공격하는 아군은 사거리와 공격 속도가 있다', () => {
    for (const a of ALLIES) {
      // 스스로 노려 쏘지 않는 아군(보조·패시브 영웅)
      if (['repair', 'money', 'buff', 'echo', 'mirror', 'souls', 'dragon', 'sweep'].includes(a.kind)) continue;
      expect(a.stats.rate, a.id).toBeGreaterThan(0);
      expect(a.stats.range, a.id).toBeGreaterThan(0);
      expect(a.stats.dmg, a.id).toBeGreaterThan(0);
    }
  });
});

describe('강화와 판매', () => {
  it('강화 비용은 레벨마다 오르고 최대 레벨이면 없다', () => {
    expect(upgradeCost('guard', 1)).toBe(30);
    expect(upgradeCost('guard', 2)).toBe(60);
    expect(upgradeCost('guard', 9)).toBe(270);
    expect(upgradeCost('guard', 10)).toBeNull();
  });
  it('Lv10 영웅 수치는 정해진 한도를 넘지 않는다', () => {
    expect(allyStats('echo', 10).power).toBe(1.5);
    expect(allyStats('timethief', 10).slowAll).toBe(0.4);
    expect(allyStats('executioner', 10).threshold).toBe(0.5);
  });
  it('판매하면 쓴 돈의 절반을 돌려준다', () => {
    expect(sellPrice('guard', 1)).toBe(25);
    expect(sellPrice('guard', 3)).toBe(Math.round((50 + 30 + 60) / 2));
  });
  it('레벨이 오르면 피해가 늘어난다(정수로 반올림)', () => {
    expect(allyStats('guard', 3).dmg).toBe(11); // 6 × 1.8 = 10.8
  });
  it('피해·독·수리 수치는 모든 레벨에서 1 이상의 정수', () => {
    for (const a of ALLIES) {
      for (let lv = 1; lv <= MAX_ALLY_LEVEL; lv++) {
        const s = allyStats(a.id, lv);
        for (const k of ['dmg', 'poison', 'hps']) {
          if (s[k] === undefined) continue;
          expect(Number.isInteger(s[k]), `${a.id} Lv${lv} ${k}=${s[k]}`).toBe(true);
          expect(s[k]).toBeGreaterThanOrEqual(1);
        }
      }
    }
  });
});

describe('전설·신화 영웅', () => {
  it('20명 모두 서로 다른 전투 방식(kind)을 가진다', () => {
    const heroes = ALLIES.filter(a => a.hero);
    expect(heroes).toHaveLength(20);
    expect(new Set(heroes.map(a => a.kind)).size).toBe(20);
    for (const a of heroes) {
      expect(a.role, a.id).toBeTruthy();
      expect(a.quote, a.id).toBeTruthy();
    }
  });
  it('메아리 위력은 레벨마다 오르고 100%를 넘지 않는다', () => {
    expect(allyStats('echo', 1).power).toBe(0.6);
    expect(allyStats('echo', 5).power).toBe(1);
  });
});

describe('각성', () => {
  it('각성하면 피해와 속도가 두 배, 범위가 넓어진다', () => {
    const base = allyStats('gravity', 1);
    const up = awakenStats(base);
    expect(up.dmg).toBe(base.dmg * 2);
    expect(up.rate).toBeCloseTo(base.rate * 2);
    expect(up.radius).toBeGreaterThan(base.radius);
    expect(awakenStats(allyStats('echo', 1)).power).toBe(1);
    expect(awakenStats(allyStats('echo', 10)).power).toBe(1.5); // Lv10 메아리는 각성해도 약해지지 않는다
    expect(awakenStats(allyStats('executioner', 5)).threshold).toBeLessThanOrEqual(0.6);
  });
});

describe('지휘관', () => {
  it('바로 옆 칸만 공격 속도가 빨라진다', () => {
    const cells = Array(9).fill(null);
    cells[4] = { id: 'commander', level: 1 };
    expect(rateBuffAt(cells, 1)).toBeCloseTo(0.3);
    expect(rateBuffAt(cells, 0)).toBe(0);
    expect(allyStats('guard', 1, rateBuffAt(cells, 1)).rate).toBeCloseTo(1.3);
  });
});

describe('웨이브', () => {
  it('5웨이브마다 거대 좀비', () => {
    expect(isBossWave(5)).toBe(true);
    expect(isBossWave(4)).toBe(false);
    expect(waveSpec(5).boss).toBe(true);
  });
  it('뒤로 갈수록 좀비가 많고 튼튼하다', () => {
    expect(waveSpec(4).count).toBeGreaterThan(waveSpec(1).count);
    expect(hpMul(10)).toBeGreaterThan(hpMul(2));
    expect(zombieHp('walker', 1)).toBe(14);
  });
  it('1웨이브는 걷는 좀비만', () => {
    for (let r = 0; r < 1; r += 0.05) expect(pickZombie(1, () => r)).toBe('walker');
  });
  it('10웨이브에는 여러 좀비가 섞인다', () => {
    const seen = new Set();
    for (let r = 0; r < 1; r += 0.01) seen.add(pickZombie(10, () => r));
    expect([...seen].sort()).toEqual(['brute', 'runner', 'spitter', 'walker']);
  });
});

it('모든 아군 id로 찾을 수 있다', () => {
  for (const a of ALLIES) expect(ALLY[a.id]).toBe(a);
});

describe('메인 상점', () => {
  const fresh = coins => ({ coins, meta: {} });
  it('신화만 해금이 필요하다', () => {
    expect(isUnlocked(fresh(0), 'echo')).toBe(true);
    expect(isUnlocked(fresh(0), 'gravity')).toBe(false);
  });
  it('보유 코인이 모자라면 해금되지 않는다', () => {
    const s = fresh(MYTHIC_UNLOCK - 1);
    expect(unlockMythic(s, 'gravity')).toBe(false);
    expect(s.coins).toBe(MYTHIC_UNLOCK - 1);
  });
  it('해금하면 2000코인이 빠지고, 두 번 사지 않는다', () => {
    const s = fresh(5000);
    expect(unlockMythic(s, 'gravity')).toBe(true);
    expect(s.coins).toBe(3000);
    expect(isUnlocked(s, 'gravity')).toBe(true);
    expect(unlockMythic(s, 'gravity')).toBe(false);
    expect(s.coins).toBe(3000);
  });
  it('센 좀비일수록 코인을 많이 떨어뜨린다', () => {
    expect(dropCoins('walker')).toBe(1);
    expect(dropCoins('brute')).toBeGreaterThan(dropCoins('runner'));
    expect(dropCoins('boss')).toBeGreaterThan(dropCoins('brute'));
  });
});

describe('30웨이브 이후', () => {
  it('20웨이브부터 새 좀비가 섞이고, 그 전에는 없다', () => {
    const kinds = w => {
      const seen = new Set();
      for (let r = 0; r < 1; r += 0.005) seen.add(pickZombie(w, () => r));
      return seen;
    };
    expect(kinds(19).has('armored')).toBe(false);
    expect(kinds(20).has('armored')).toBe(true);
    expect(kinds(30).has('healer')).toBe(true);
  });
  it('5~50웨이브 거대 좀비는 모두 다르고, 50웨이브는 마지막 보스', () => {
    const list = [];
    for (let w = 5; w <= FINAL_WAVE; w += 5) list.push(bossKind(w));
    expect(new Set(list).size).toBe(10);
    expect(bossKind(5)).toBe('boss');
    expect(bossKind(20)).toBe('charger');
    expect(bossKind(FINAL_WAVE)).toBe('rainlord');
    expect(bossKind(55)).toBe('spewer'); // 50 뒤로는 다시 돈다
  });
  it('이변은 31웨이브부터, 같은 이변이 두 번 연달아 나오지 않는다', () => {
    expect(waveEvent(30)).toBe(null);
    expect(waveEvent(FINAL_WAVE)).toBe(null);
    expect(waveEvent(35)).toBe(null); // 보스 웨이브에는 이변이 없다
    for (let r = 0; r < 1; r += 0.1) {
      const e = waveEvent(31, 'fog', () => r);
      expect(EVENTS[e]).toBeTruthy();
      expect(e).not.toBe('fog');
    }
  });
  it('보상 카드는 서로 다른 3장, 겹치면 더 세진다', () => {
    const c = rollPerks(() => 0.5);
    expect(new Set(c).size).toBe(3);
    expect(perkMods({}).dmg).toBe(1);
    expect(perkMods({ power: 2 }).dmg).toBeCloseTo(1.3);
    expect(perkMods({ crit: 9 }).crit).toBe(0.5);
  });
});

describe('맵', () => {
  it('두 번째 맵은 처음엔 잠겨 있고, 열리면 쓸 수 있다', () => {
    expect(mapUnlocked({ meta: {} }, 'field')).toBe(true);
    expect(mapUnlocked({ meta: {} }, 'mall')).toBe(false);
    expect(mapUnlocked({ meta: { map2: true } }, 'mall')).toBe(true);
  });
  it('두 번째 맵은 더 어렵지만 코인을 더 준다', () => {
    expect(MAPS.mall.hp).toBeGreaterThan(MAPS.field.hp);
    expect(MAPS.mall.coin).toBeGreaterThan(MAPS.field.coin);
  });
});
