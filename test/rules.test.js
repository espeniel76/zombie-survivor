import { describe, it, expect } from 'vitest';
import {
  neighbors, upgradeCost, sellPrice, rateBuffAt, allyStats, hpMul, waveSpec, pickZombie,
  zombieHp, isBossWave,
} from '../src/core/rules.js';
import { ALLIES, ALLY, TIERS } from '../src/data/allies.js';

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
    expect(upgradeCost('guard', 5)).toBeNull();
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
      for (let lv = 1; lv <= 5; lv++) {
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
