// 좀비 걸음걸이. 게임(sprites.js)과 목업(walk.html)이 같이 쓴다.
// 단위는 그림 단위(크기 배율 곱하기 전).
// stride: 발이 앞뒤로 오가는 폭  lift: 발 드는 높이  bob: 몸 출렁임  sway: 좌우로 기우는 정도(라디안)
// lean: 앞으로 숙임  drag: 뒷발 드는 높이 비율(작을수록 질질 끈다)  stomp: 디딜 때 몸이 눌림 + 먼지
export const GAIT = {
  walker: { stride: 9, lift: 3.5, bob: 2, sway: 0.15, lean: 0.05, drag: 0.2, note: '비틀비틀, 한쪽 발을 질질 끌며' },
  runner: { stride: 10, lift: 7, bob: 3.5, sway: 0.04, lean: 0.22, note: '앞으로 숙이고 다다닥' },
  brute: { stride: 7, lift: 4.5, bob: 2.6, sway: 0.16, lean: 0.02, stomp: 1, note: '쿵쿵, 좌우로 크게 흔들' },
  spitter: { stride: 8, lift: 3.5, bob: 1.8, sway: 0.07, lean: 0.12, note: '구부정하게' },
  armored: { stride: 6.5, lift: 2.5, bob: 1.2, sway: 0.05, lean: 0, note: '갑옷이 무거워 뻣뻣하게' },
  splitter: { stride: 8, lift: 4, bob: 2.2, sway: 0.09, lean: 0.06, note: '흐느적흐느적' },
  splitling: { stride: 6, lift: 4.5, bob: 3, sway: 0.08, lean: 0.18, note: '작은 발로 종종종' },
  healer: { stride: 7, lift: 3, bob: 1.4, sway: 0.05, lean: 0.03, note: '천천히 또박또박' },
  giant: { stride: 6, lift: 5, bob: 3, sway: 0.1, lean: 0.03, stomp: 2, note: '쿵… 쿵… 디딜 때마다 먼지' },
};
// 거대 좀비(보스)는 모두 giant
export const gaitOf = kind => GAIT[kind] || GAIT.giant;

export const TAU = Math.PI * 2;

// 발 위치. 걸음 위상 ph(0~2π)에서 두 발의 [앞뒤, 높이].
// 디딘 발은 몸이 나아가는 만큼 뒤로 가서 땅에 붙어 있다(미끄러지지 않는다).
export function feetAt(g, ph) {
  return [0, 1].map(i => {
    const s = (((ph + i * Math.PI) % TAU) + TAU) % TAU;
    if (s < Math.PI) return [g.stride * (1 - (2 * s) / Math.PI), 0];
    const u = (s - Math.PI) / Math.PI;
    const e = u * u * (3 - 2 * u);
    const lift = g.lift * (i === 1 && g.drag ? g.drag : 1);
    return [g.stride * (-1 + 2 * e), -lift * Math.sin(u * Math.PI)];
  });
}

// 몸 자세: dy(위아래), rot(기울기, 앞쪽이 +), sx·sy(디딜 때 눌림)
export function bodyAt(g, ph) {
  const up = Math.abs(Math.sin(ph));
  const land = Math.pow(1 - up, 6); // 발 디딘 순간 1
  const squash = g.stomp ? 0.035 * g.stomp * land : 0;
  return {
    dy: -g.bob * up + (g.stomp ? 1.2 * land : 0),
    rot: g.lean - g.sway * Math.sin(ph),
    sx: 1 + squash,
    sy: 1 - squash,
  };
}

// 한 걸음 = 위상 π. 걸은 거리 → 위상 증가량(stride는 크기 배율을 곱한 값)
export const phaseFor = (dist, stridePx) => (dist / (2 * stridePx)) * Math.PI;

// 위상이 prev → ph로 지나는 동안 땅을 디딘 발(0, 1). 먼지 낼 때 쓴다.
export function landed(prev, ph) {
  const out = [];
  for (const i of [0, 1]) if (Math.floor((ph + i * Math.PI) / TAU) !== Math.floor((prev + i * Math.PI) / TAU)) out.push(i);
  return out;
}
