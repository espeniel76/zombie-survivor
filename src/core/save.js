// 브라우저 저장소. 막혀 있어도 게임은 돌아가야 한다.
import { ALLIES } from '../data/allies.js';

// 테스트판: 주소 끝에 ?test 를 붙이면 열린다. 원래 저장과 따로 저장하고, 신화·두 번째 맵을 모두 열어 둔다.
export const TEST = typeof location !== 'undefined' && new URLSearchParams(location.search).has('test');
const KEY = TEST ? 'zombie-survivor-test-v1' : 'zombie-survivor-save-v1';

const DEFAULTS = () => ({
  coins: 0,
  meta: {},
  best: { wave: 0, kills: 0 },
  // 이야기: 프롤로그를 봤는지, 본 장(웨이브 번호)
  story: { prologue: false, seen: [] },
  // flash: 번쩍임 효과. 기본은 꺼짐(번쩍임 없음).
  settings: { flash: false, sound: true, numbers: true },
});

let cache = null;

export function loadSave() {
  if (cache) return cache;
  let data = DEFAULTS();
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      data = {
        ...data,
        ...parsed,
        best: { ...data.best, ...parsed.best },
        settings: { ...data.settings, ...parsed.settings },
        story: { ...data.story, ...parsed.story },
        meta: { ...parsed.meta },
      };
    }
  } catch {
    // 저장소를 못 쓰면 기본값으로
  }
  if (TEST) {
    data.meta.unlocked = ALLIES.filter(a => a.tier === 5).map(a => a.id);
    data.meta.map2 = true;
    data.story.prologue = true;
    data.coins = Math.max(data.coins || 0, 99999);
  }
  cache = data;
  return cache;
}

export function writeSave() {
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    // 무시
  }
}
