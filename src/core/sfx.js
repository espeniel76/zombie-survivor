// 아주 작은 합성 효과음. 파일 없이 WebAudio로 만든다.
import { loadSave } from './save.js';

let ctx = null;
let master = null;
const last = {};

function ensure() {
  if (ctx) return ctx;
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0.25;
    master.connect(ctx.destination);
  } catch {
    ctx = null;
  }
  return ctx;
}

export function unlockAudio() {
  const c = ensure();
  if (c && c.state === 'suspended') c.resume();
}

function tone({ freq, to = freq, dur = 0.08, type = 'square', vol = 0.3, delay = 0 }) {
  const t0 = ctx.currentTime + delay;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, to), t0 + dur);
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  o.connect(g).connect(master);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

function noise({ dur = 0.15, vol = 0.25, filter = 900 }) {
  const len = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = filter;
  const g = ctx.createGain();
  g.gain.value = vol;
  src.connect(f).connect(g).connect(master);
  src.start();
}

const SOUNDS = {
  shoot: { gap: 60, play: () => tone({ freq: 520, to: 180, dur: 0.06, vol: 0.12 }) },
  shotgun: { gap: 80, play: () => noise({ dur: 0.12, vol: 0.25, filter: 1400 }) },
  swing: { gap: 80, play: () => noise({ dur: 0.1, vol: 0.18, filter: 600 }) },
  throw: { gap: 100, play: () => tone({ freq: 300, to: 600, dur: 0.12, type: 'triangle', vol: 0.15 }) },
  fire: { gap: 150, play: () => noise({ dur: 0.3, vol: 0.15, filter: 500 }) },
  zap: { gap: 90, play: () => tone({ freq: 1400, to: 600, dur: 0.07, type: 'sawtooth', vol: 0.06 }) },
  beam: { gap: 120, play: () => tone({ freq: 900, to: 1800, dur: 0.18, type: 'sine', vol: 0.12 }) },
  boom: { gap: 90, play: () => noise({ dur: 0.35, vol: 0.3, filter: 400 }) },
  pop: { gap: 45, play: () => tone({ freq: 200, to: 90, dur: 0.07, type: 'triangle', vol: 0.15 }) },
  gem: { gap: 40, play: () => tone({ freq: 880, to: 1320, dur: 0.05, type: 'sine', vol: 0.12 }) },
  coin: { gap: 60, play: () => { tone({ freq: 990, dur: 0.06, type: 'square', vol: 0.08 }); tone({ freq: 1320, dur: 0.1, type: 'square', vol: 0.08, delay: 0.06 }); } },
  heal: { gap: 100, play: () => { tone({ freq: 523, dur: 0.1, type: 'sine', vol: 0.2 }); tone({ freq: 784, dur: 0.16, type: 'sine', vol: 0.2, delay: 0.1 }); } },
  hurt: { gap: 200, play: () => tone({ freq: 160, to: 70, dur: 0.18, type: 'sawtooth', vol: 0.18 }) },
  level: {
    gap: 100,
    play: () => [523, 659, 784, 1047].forEach((f, i) => tone({ freq: f, dur: 0.12, type: 'triangle', vol: 0.2, delay: i * 0.07 })),
  },
  boss: { gap: 500, play: () => { tone({ freq: 110, to: 82, dur: 0.8, type: 'sawtooth', vol: 0.2 }); tone({ freq: 55, dur: 0.9, type: 'sine', vol: 0.3 }); } },
  warn: { gap: 300, play: () => tone({ freq: 330, to: 300, dur: 0.25, type: 'triangle', vol: 0.15 }) },
  click: { gap: 50, play: () => tone({ freq: 660, dur: 0.04, type: 'square', vol: 0.08 }) },
  win: {
    gap: 500,
    play: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone({ freq: f, dur: 0.2, type: 'triangle', vol: 0.22, delay: i * 0.12 })),
  },
  lose: {
    gap: 500,
    play: () => [392, 330, 262, 196].forEach((f, i) => tone({ freq: f, dur: 0.25, type: 'triangle', vol: 0.2, delay: i * 0.16 })),
  },
};

export function sfx(name) {
  if (!loadSave().settings.sound) return;
  const c = ensure();
  if (!c || c.state !== 'running') return;
  const s = SOUNDS[name];
  if (!s) return;
  const now = performance.now();
  if (last[name] && now - last[name] < s.gap) return;
  last[name] = now;
  s.play();
}
