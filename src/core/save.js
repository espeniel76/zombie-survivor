// 브라우저 저장소. 막혀 있어도 게임은 돌아가야 한다.
const KEY = 'zombie-survivor-save-v1';

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
