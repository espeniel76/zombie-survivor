// 효과음. 파일 없이 WebAudio로 합성한다.
// 게임이 켜지면 소리마다 변형 몇 개를 OfflineAudioContext로 미리 구워 두고(층 쌓기·필터·왜곡까지),
// 실제로 날 때는 구운 소리를 틀기만 한다. 그래서 복잡하게 만들어도 전투 중에 버벅이지 않는다.
// 재생 쪽: 소리 → (좌우 위치) → 마스터 압축기 → 스피커, 그리고 일부는 공간 울림(리버브)으로도 보낸다.
import { loadSave } from './save.js';

const BAKE_RATE = 44100;
const MAX_VOICES = 32; // 동시에 나는 소리 상한(넘으면 전투 소리는 건너뜀)

let ctx = null;
let dryIn = null;
let wetIn = null;
let voices = 0;
const baked = {};
const last = {};
const active = {};

const rnd = (a, b) => a + Math.random() * (b - a);

// ── 굽기 도구 ──

function noiseBuffer(c, seconds, color) {
  const n = Math.ceil(c.sampleRate * seconds);
  const buf = c.createBuffer(1, n, c.sampleRate);
  const d = buf.getChannelData(0);
  if (color === 'brown') {
    // 낮게 웅웅거리는 잡음(폭발 울림, 불길)
    let y = 0;
    for (let i = 0; i < n; i++) {
      y = (y + 0.02 * (Math.random() * 2 - 1)) / 1.02;
      d[i] = y * 3.5;
    }
  } else {
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  }
  return buf;
}

function tanhCurve(k) {
  const n = 1024;
  const curve = new Float32Array(n);
  const norm = Math.tanh(k);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    curve[i] = Math.tanh(k * x) / norm;
  }
  return curve;
}

// 굽는 동안 쓰는 작은 신시사이저. 모든 시간은 초, 음량은 0~1.
// 공통 봉투: t(시작) a(올라가는 시간) peak(최고) hold(유지) d(줄어드는 속도, 시간상수)
function kit(c) {
  const sr = c.sampleRate;
  const noises = {};
  const noiseLen = Math.min(2, c.length / sr + 0.05);
  const noiseOf = color => noises[color] || (noises[color] = noiseBuffer(c, noiseLen, color));
  const endOf = o => (o.t || 0) + (o.a ?? 0.002) + (o.hold || 0) + (o.d ?? 0.05) * 7;

  function vca(dest, o) {
    const t = o.t || 0;
    const a = Math.max(0.0005, o.a ?? 0.002);
    const peak = o.peak ?? 1;
    const g = c.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    if (o.hold) g.gain.setValueAtTime(peak, t + a + o.hold);
    g.gain.setTargetAtTime(0, t + a + (o.hold || 0), o.d ?? 0.05);
    g.connect(dest);
    return g;
  }

  function sweep(param, from, to, t, dur) {
    param.setValueAtTime(from, t);
    if (to && to !== from) param.exponentialRampToValueAtTime(to, t + dur);
  }

  function filter(dest, type, freq, q = 0.707) {
    const f = c.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    f.connect(dest);
    return f;
  }

  function osc(dest, o, end) {
    const t = o.t || 0;
    const n = c.createOscillator();
    n.type = o.wave || 'sine';
    sweep(n.frequency, o.f, o.to, t, o.glide ?? (o.d ?? 0.05) * 2);
    if (o.detune) n.detune.value = o.detune;
    if (o.vib) {
      // vib: [빠르기(Hz), 깊이(주파수 비율)]
      const lfo = c.createOscillator();
      const depth = c.createGain();
      lfo.frequency.value = o.vib[0];
      depth.gain.value = o.f * o.vib[1];
      lfo.connect(depth).connect(n.frequency);
      lfo.start(t);
      lfo.stop(end);
    }
    n.connect(dest);
    n.start(t);
    n.stop(end);
    return n;
  }

  return {
    sr,
    out: c.destination,
    gain(dest, v) {
      const g = c.createGain();
      g.gain.value = v;
      g.connect(dest);
      return g;
    },
    lp: (dest, f, q) => filter(dest, 'lowpass', f, q),
    hp: (dest, f, q) => filter(dest, 'highpass', f, q),
    bp: (dest, f, q) => filter(dest, 'bandpass', f, q),
    // 따뜻하게 찌그러뜨리기. k가 클수록 거칠다.
    drive(dest, k) {
      const s = c.createWaveShaper();
      s.curve = tanhCurve(k);
      s.oversample = '2x';
      s.connect(dest);
      return s;
    },
    // 잡음 한 겹. lp/hp/bp: 필터 종류와 주파수, to: 그 주파수가 sweep초 동안 옮겨 갈 곳
    // 필터로 깎인 만큼(통과하는 폭이 좁을수록) 흰 잡음 크기를 되돌려, peak가 귀에 들리는 크기에 가깝게 한다.
    noise(dest, o) {
      const t = o.t || 0;
      const type = o.lp ? 'lowpass' : o.hp ? 'highpass' : o.bp ? 'bandpass' : null;
      const f0 = o.lp || o.hp || o.bp;
      const q = o.q ?? (type === 'bandpass' ? 0.9 : 0.707);
      let boost = 1;
      if (type && (o.color || 'white') === 'white') {
        const nyq = sr / 2;
        const bw = type === 'bandpass' ? f0 / q : type === 'lowpass' ? f0 : nyq - f0;
        boost = Math.min(4, Math.sqrt(nyq / Math.max(bw, 1)));
      }
      let head = vca(dest, { ...o, peak: (o.peak ?? 1) * boost });
      if (type) {
        const f = filter(head, type, f0, q);
        sweep(f.frequency, f0, o.to, t, o.sweep ?? (o.hold || 0) + (o.d ?? 0.05) * 3);
        head = f;
      }
      const src = c.createBufferSource();
      src.buffer = noiseOf(o.color || 'white');
      src.loop = true;
      src.connect(head);
      src.start(t, Math.random() * noiseLen * 0.95);
      src.stop(endOf(o));
    },
    // 음 한 겹. f → to 로 glide초 동안 미끄러진다.
    tone(dest, o) {
      osc(vca(dest, o), o, endOf(o));
    },
    // 금관 소리: 톱니파 두 개를 살짝 어긋나게 + 열렸다 닫히는 필터
    brass(dest, o) {
      const t = o.t || 0;
      const a = o.a ?? 0.04;
      const len = o.len ?? 0.3;
      const bright = o.bright ?? 1800;
      const env = { t, a, peak: o.peak ?? 1, hold: len, d: o.rel ?? 0.12 };
      const end = endOf(env);
      const f = filter(vca(dest, env), 'lowpass', bright, 1.2);
      f.frequency.setValueAtTime(bright * 0.15, t);
      f.frequency.exponentialRampToValueAtTime(bright, t + a + 0.03);
      f.frequency.setTargetAtTime(bright * 0.55, t + a + 0.06, 0.25);
      for (const det of [-8, 7]) osc(f, { t, f: o.f, wave: 'sawtooth', detune: det, vib: [5.2, 0.004] }, end);
      osc(f, { t, f: o.f / 2, wave: 'triangle' }, end);
    },
    // 종소리(FM): 맑고 금속성
    bell(dest, o) {
      const t = o.t || 0;
      const d = o.d ?? 0.3;
      const end = t + d * 7;
      const out = vca(dest, { t, a: 0.001, peak: o.peak ?? 1, d });
      const car = c.createOscillator();
      const mod = c.createOscillator();
      const idx = c.createGain();
      car.frequency.value = o.f;
      mod.frequency.value = o.f * (o.ratio ?? 3.5);
      idx.gain.setValueAtTime(o.f * (o.index ?? 2), t);
      idx.gain.setTargetAtTime(0, t, d * 0.5);
      mod.connect(idx).connect(car.frequency);
      car.connect(out);
      for (const n of [car, mod]) {
        n.start(t);
        n.stop(end);
      }
    },
    // 동전처럼 맑게 울리는 금속: 배음이 정수배가 아니다
    metal(dest, o) {
      const parts = o.parts || [[1, 1, 0.16], [2.76, 0.5, 0.08], [5.4, 0.28, 0.045], [8.93, 0.14, 0.025]];
      for (const [ratio, amp, d] of parts) {
        this.tone(dest, { t: o.t, f: o.f * ratio, peak: (o.peak ?? 1) * amp, a: 0.0008, d: d * (o.ring ?? 1) });
      }
      this.noise(dest, { t: o.t, hp: 6000, peak: (o.peak ?? 1) * 0.35, d: 0.002 });
    },
    // 자바스크립트로 만든 파형 틀기
    play(dest, data, t = 0, peak = 1) {
      const buf = c.createBuffer(1, data.length, sr);
      buf.getChannelData(0).set(data);
      const src = c.createBufferSource();
      src.buffer = buf;
      const g = c.createGain();
      g.gain.value = peak;
      src.connect(g).connect(dest);
      src.start(t);
    },
    // 줄 튕기는 소리(Karplus–Strong)
    pluck(f, dur, damp = 0.99) {
      const n = Math.floor(sr * dur);
      const N = Math.max(2, Math.round(sr / f));
      const ring = new Float32Array(N);
      let prev = 0;
      for (let i = 0; i < N; i++) {
        prev = prev * 0.4 + (Math.random() * 2 - 1) * 0.6;
        ring[i] = prev;
      }
      const out = new Float32Array(n);
      let k = 0;
      for (let i = 0; i < n; i++) {
        const a = ring[k];
        const b = ring[(k + 1) % N];
        out[i] = a;
        ring[k] = damp * 0.5 * (a + b);
        k = (k + 1) % N;
      }
      return out;
    },
    // 타닥타닥(불꽃, 파편). rate = 처음 1초당 튀는 수, decay = 줄어드는 시간상수
    crackle(dur, rate, decay = dur / 3) {
      const n = Math.floor(sr * dur);
      const out = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        const fade = Math.exp(-i / sr / decay);
        if (Math.random() < (rate * fade) / sr) {
          const amp = (0.3 + Math.random() * 0.7) * fade * (Math.random() < 0.5 ? -1 : 1);
          const len = 15 + Math.floor(Math.random() * 110);
          for (let j = 0; j < len && i + j < n; j++) out[i + j] += amp * (Math.random() * 2 - 1) * Math.exp(-j / (len * 0.25));
        }
      }
      return out;
    },
    // 전기 아크: 웅- 하는 전원 소리가 불규칙하게 끊겼다 붙었다 한다
    arc(dur, f, decay) {
      const n = Math.floor(sr * dur);
      const out = new Float32Array(n);
      let level = 1;
      let next = 0;
      let p1 = 0;
      let p2 = 0;
      for (let i = 0; i < n; i++) {
        if (i >= next) {
          level = Math.random() < 0.22 ? 0.04 : 0.35 + Math.random() * 0.65;
          next = i + Math.floor(sr * (0.002 + Math.random() * 0.011));
        }
        p1 = (p1 + f / sr) % 1;
        p2 = (p2 + (f * 2.013) / sr) % 1;
        const buzz = (p1 * 2 - 1) + 0.6 * (p2 * 2 - 1);
        out[i] = level * (buzz * 0.55 + (Math.random() * 2 - 1) * 0.5) * Math.exp(-i / sr / decay);
      }
      return out;
    },
  };
}

// ── 레시피 ──
// 공통: b = 굽기 도구, p = 변형마다 조금씩 다른 음높이 배율
function drum(b, dest, t, p = 1, peak = 1) {
  b.tone(dest, { t, f: 95 * p, to: 46 * p, glide: 0.12, peak, d: 0.12 });
  b.tone(dest, { t, f: 190 * p, to: 90 * p, glide: 0.05, wave: 'triangle', peak: peak * 0.25, d: 0.05 });
  b.noise(dest, { t, lp: 900, peak: peak * 0.45, d: 0.035 });
}

function gunshot(b, p, o) {
  // 총소리 = 날카로운 '탁'(crack) + 몸통 '쾅'(body) + 낮은 '쿵'(thump) + 남는 가스 소리(tail)
  const m = b.drive(b.lp(b.out, o.top ?? 7500), o.drive ?? 2.2);
  b.noise(m, { hp: o.crackHp ?? 2500, peak: o.crack ?? 1, a: 0.0005, d: o.crackD ?? 0.006 });
  b.noise(m, { bp: o.body * p, q: 0.9, peak: 0.9, a: 0.001, d: o.bodyD, to: o.bodyTo && o.bodyTo * p, sweep: 0.08 });
  b.tone(m, { f: o.thump * p, to: o.thumpTo * p, glide: o.thumpD * 1.5, peak: o.thumpPeak ?? 1, a: 0.001, d: o.thumpD });
  b.noise(m, { lp: o.tailLp ?? 650, peak: o.tail ?? 0.25, a: 0.004, d: o.tailD ?? 0.08 });
}

const SOUNDS = {
  // ── 화면·진행 ──
  click: {
    vol: 0.4, gap: 40, dur: 0.12, ui: true,
    make(b, p) {
      b.tone(b.out, { f: 1750 * p, to: 1150 * p, glide: 0.02, peak: 0.6, a: 0.0008, d: 0.012 });
      b.tone(b.out, { f: 430 * p, peak: 0.35, a: 0.0008, d: 0.01 });
      b.noise(b.out, { bp: 4200, q: 1.2, peak: 0.45, a: 0.0004, d: 0.004 });
    },
  },
  coin: {
    vol: 0.4, gap: 60, dur: 0.9, send: 0.25, ui: true, n: 2,
    make(b, p) {
      b.metal(b.out, { t: 0, f: 1850 * p, peak: 0.9 });
      b.metal(b.out, { t: 0.075, f: 2480 * p, peak: 1, ring: 1.6 });
    },
  },
  level: {
    vol: 0.42, gap: 100, dur: 1.8, send: 0.5, ui: true, n: 1,
    make(b) {
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => b.bell(b.out, { t: i * 0.07, f, ratio: 3, index: 1.4, d: 0.32, peak: 0.7 }));
      b.bell(b.out, { t: 0.3, f: 2093, ratio: 3, index: 0.8, d: 0.4, peak: 0.3 });
      b.bell(b.out, { t: 0.34, f: 2637, ratio: 3, index: 0.8, d: 0.4, peak: 0.22 });
      b.noise(b.out, { t: 0.05, hp: 7000, a: 0.15, peak: 0.08, d: 0.25 });
    },
  },
  wave: {
    vol: 0.73, gap: 300, dur: 2.2, send: 0.4, ui: true, n: 1,
    make(b) {
      // 북 두 번 + 낮은 나팔
      drum(b, b.out, 0);
      drum(b, b.out, 0.22, 1, 0.9);
      const horn = b.drive(b.out, 1.4);
      b.brass(horn, { t: 0.46, f: 110, len: 0.75, bright: 1500, peak: 0.6, a: 0.06, rel: 0.18 });
      b.brass(horn, { t: 0.46, f: 164.8, len: 0.75, bright: 1500, peak: 0.4, a: 0.08, rel: 0.18 });
    },
  },
  boss: {
    vol: 0.75, gap: 500, dur: 3.6, send: 0.55, ui: true, n: 1,
    make(b) {
      // 땅이 울리는 낮은 뿔나팔 + 심장 박동 북
      const horn = b.drive(b.lp(b.out, 2400), 3);
      b.brass(horn, { t: 0.05, f: 55, len: 1.9, bright: 900, peak: 0.8, a: 0.3, rel: 0.35 });
      b.brass(horn, { t: 0.05, f: 82.4, len: 1.9, bright: 900, peak: 0.55, a: 0.35, rel: 0.35 });
      b.brass(horn, { t: 0.05, f: 110, len: 1.9, bright: 1100, peak: 0.3, a: 0.4, rel: 0.35 });
      b.noise(b.out, { color: 'brown', lp: 160, a: 0.4, hold: 1.4, peak: 0.7, d: 0.4 });
      for (const [t, k] of [[0, 1], [0.27, 0.75], [1.1, 1], [1.37, 0.75], [2.2, 0.9]]) drum(b, b.out, t, 0.8, k);
    },
  },
  win: {
    vol: 0.5, gap: 500, dur: 2.6, send: 0.45, ui: true, n: 1,
    make(b) {
      // 짧은 팡파르: 솔-도-미 → 큰 화음
      const m = b.drive(b.out, 1.2);
      [[392, 0], [523.25, 0.15], [659.25, 0.3]].forEach(([f, t]) => b.brass(m, { t, f, len: 0.1, bright: 3200, peak: 0.55, a: 0.02, rel: 0.06 }));
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => b.brass(m, { t: 0.46, f, len: 0.75, bright: 3000, peak: 0.42 - i * 0.05, a: 0.03, rel: 0.3 }));
      b.noise(b.out, { t: 0.46, hp: 5000, peak: 0.25, a: 0.01, d: 0.45 });
      drum(b, b.out, 0.46, 1.1, 0.8);
    },
  },
  lose: {
    vol: 0.5, gap: 500, dur: 3.4, send: 0.5, ui: true, n: 1,
    make(b) {
      // 내려가는 세 음 → 어두운 단조 화음이 천천히 닫힌다
      const pad = b.lp(b.out, 1400);
      [[392, 0], [311.1, 0.36], [261.6, 0.72]].forEach(([f, t]) => b.brass(pad, { t, f, len: 0.25, bright: 1300, peak: 0.5, a: 0.04, rel: 0.12 }));
      [130.8, 155.6, 196, 261.6].forEach(f => b.brass(pad, { t: 1.08, f, len: 1.2, bright: 900, peak: 0.35, a: 0.12, rel: 0.45 }));
      drum(b, b.out, 1.08, 0.8, 1);
    },
  },
  hurt: {
    vol: 0.25, gap: 180, dur: 0.6, send: 0.18, ui: true, n: 3,
    make(b, p) {
      // 기지 바리케이드를 두들기는 둔탁한 소리 + 나무 부서지는 소리
      const m = b.drive(b.out, 2.5);
      b.tone(m, { f: 115 * p, to: 45 * p, glide: 0.1, peak: 1, d: 0.08 });
      b.noise(m, { lp: 1500 * p, to: 400, peak: 0.7, d: 0.045 });
      b.noise(m, { bp: 360 * p, q: 1.6, peak: 0.55, d: 0.07 });
      b.play(b.bp(m, 1700, 0.8), b.crackle(0.15, 500, 0.05), 0.005, 0.5);
    },
  },

  // ── 사격 ──
  pistol: {
    vol: 0.31, gap: 70, dur: 0.4, send: 0.22, max: 5, n: 3,
    make(b, p) {
      gunshot(b, p, { body: 1300, bodyD: 0.028, thump: 170, thumpTo: 55, thumpD: 0.035 });
      b.noise(b.out, { t: 0.05, bp: 3400, q: 4, peak: 0.12, d: 0.004 });
    },
  },
  rifle: {
    vol: 0.33, gap: 80, dur: 0.5, send: 0.26, max: 5, n: 3,
    make(b, p) {
      gunshot(b, p, { body: 1000, bodyD: 0.04, thump: 140, thumpTo: 48, thumpD: 0.045, crackD: 0.008, tailLp: 800, tailD: 0.11, tail: 0.3 });
    },
  },
  sniper: {
    vol: 0.4, gap: 150, dur: 1.3, send: 0.5, max: 3, n: 2,
    make(b, p) {
      gunshot(b, p, { body: 3400, bodyTo: 700, bodyD: 0.09, thump: 120, thumpTo: 34, thumpD: 0.12, crack: 1, crackHp: 3000, crackD: 0.011, drive: 3, tailLp: 500, tail: 0.45, tailD: 0.28 });
      // 노리쇠 당기는 소리
      for (const t of [0.48, 0.6]) b.noise(b.out, { t, bp: 2400 * p, q: 3, peak: 0.16, d: 0.006 });
    },
  },
  mg: {
    vol: 0.28, gap: 55, dur: 0.22, send: 0.12, max: 5, n: 4,
    make(b, p) {
      gunshot(b, p, { body: 1600, bodyD: 0.016, thump: 150, thumpTo: 60, thumpD: 0.022, crack: 0.6, crackHp: 3000, crackD: 0.004, drive: 2.5, top: 7000, tail: 0.12, tailD: 0.03 });
    },
  },
  shotgun: {
    vol: 0.35, gap: 120, dur: 0.8, send: 0.3, max: 3, n: 2,
    make(b, p) {
      gunshot(b, p, { body: 2600, bodyTo: 600, bodyD: 0.07, thump: 110, thumpTo: 38, thumpD: 0.08, crackHp: 2000, crackD: 0.008, drive: 3, top: 6500, tail: 0.35, tailD: 0.12 });
      // 펌프 당기는 '척-척'
      for (const [t, f] of [[0.34, 1800], [0.43, 2700]]) {
        b.noise(b.out, { t, bp: f * p, q: 2.5, peak: 0.26, d: 0.011 });
        b.tone(b.out, { t, f: 320 * p, to: 200 * p, peak: 0.12, d: 0.012 });
      }
    },
  },
  sling: {
    vol: 0.38, gap: 60, dur: 0.3, send: 0.1, max: 4, n: 3,
    make(b, p) {
      b.tone(b.out, { f: 260 * p, to: 140 * p, glide: 0.05, wave: 'triangle', peak: 0.55, d: 0.03 });
      b.noise(b.out, { bp: 900 * p, to: 2800 * p, sweep: 0.09, q: 1.6, peak: 0.7, a: 0.012, d: 0.045 });
      b.noise(b.out, { hp: 4000, peak: 0.3, a: 0.0005, d: 0.002 });
    },
  },
  bow: {
    vol: 0.45, gap: 80, dur: 0.6, send: 0.18, max: 4, n: 3,
    make(b, p) {
      // 시위 튕김 + 화살 나가는 바람 소리
      b.play(b.lp(b.out, 2600), b.pluck(rnd(92, 104) * p, 0.45, 0.9), 0, 0.8);
      b.noise(b.out, { t: 0.01, bp: 1200 * p, to: 3600 * p, sweep: 0.12, q: 2, peak: 0.45, a: 0.01, d: 0.05 });
      b.tone(b.out, { f: 165 * p, to: 100 * p, peak: 0.4, d: 0.02 });
    },
  },
  swish: {
    vol: 0.4, gap: 80, dur: 0.4, send: 0.1, max: 4, n: 3,
    make(b, p) {
      // 무언가 휙 던지는 바람 소리
      b.noise(b.out, { bp: 330 * p, to: 1500 * p, sweep: 0.13, q: 1.4, peak: 1, a: 0.06, hold: 0.03, d: 0.05 });
      b.tone(b.out, { f: 120 * p, to: 85 * p, peak: 0.22, a: 0.05, d: 0.06 });
    },
  },
  dart: {
    vol: 0.52, gap: 70, dur: 0.3, send: 0.12, max: 4, n: 3,
    make(b, p) {
      // 압축 공기 '푸슉'
      b.noise(b.out, { bp: 2200 * p, q: 1.2, peak: 1, a: 0.002, d: 0.035 });
      b.tone(b.out, { f: 320 * p, to: 150 * p, peak: 0.5, d: 0.015 });
      b.noise(b.out, { t: 0.01, lp: 700, peak: 0.3, d: 0.03 });
    },
  },
  icegun: {
    vol: 0.46, gap: 80, dur: 0.6, send: 0.3, max: 4, n: 3,
    make(b, p) {
      b.noise(b.out, { bp: 2600 * p, q: 1.1, peak: 0.9, a: 0.002, d: 0.03 });
      b.tone(b.out, { f: 380 * p, to: 180 * p, peak: 0.45, d: 0.015 });
      // 얼음 알갱이 짤랑
      for (let k = 0; k < 3; k++) b.bell(b.out, { t: 0.02 + k * rnd(0.025, 0.045), f: rnd(2800, 4600), ratio: 1.41, index: 0.7, d: 0.07, peak: 0.25 });
    },
  },
  launch: {
    vol: 0.33, gap: 100, dur: 0.6, send: 0.25, max: 4, n: 3,
    make(b, p) {
      // 유탄 발사기 '퉁'
      const m = b.drive(b.out, 2);
      b.tone(m, { f: 240 * p, to: 70 * p, glide: 0.06, peak: 1, d: 0.05 });
      b.noise(m, { bp: 420 * p, q: 3, peak: 0.7, d: 0.03 });
      b.noise(m, { lp: 1500, peak: 0.5, d: 0.015 });
      b.noise(b.out, { hp: 3000, peak: 0.15, a: 0.01, d: 0.08 });
    },
  },
  rocket: {
    vol: 0.35, gap: 120, dur: 1.2, send: 0.3, max: 3, n: 2,
    make(b, p) {
      const m = b.drive(b.out, 1.8);
      b.tone(m, { f: 130 * p, to: 50 * p, peak: 0.8, d: 0.06 });
      b.noise(m, { bp: 400 * p, to: 2200 * p, sweep: 0.5, q: 0.9, a: 0.03, peak: 1, hold: 0.1, d: 0.22 });
      b.noise(m, { color: 'brown', lp: 700, a: 0.02, peak: 0.6, hold: 0.15, d: 0.18 });
      b.play(b.bp(b.out, 3000, 0.7), b.crackle(0.7, 300, 0.3), 0.02, 0.3);
    },
  },
  firework: {
    vol: 0.4, gap: 120, dur: 0.9, send: 0.25, max: 3, n: 2,
    make(b, p) {
      // 휘이익 올라가는 폭죽
      b.tone(b.out, { f: 900 * p, to: 2600 * p, glide: 0.45, peak: 0.3, a: 0.02, hold: 0.3, d: 0.08, vib: [28, 0.03] });
      b.noise(b.out, { bp: 1500, to: 4000, sweep: 0.4, q: 1, peak: 0.5, a: 0.02, hold: 0.25, d: 0.09 });
      b.play(b.hp(b.out, 3000), b.crackle(0.5, 220, 1), 0, 0.35);
    },
  },
  flame: {
    vol: 0.28, gap: 110, dur: 0.6, send: 0.15, max: 5, n: 4,
    make(b, p) {
      // 화르륵: 낮은 불길 + 쉬익 + 타닥
      const m = b.drive(b.out, 1.5);
      b.noise(m, { color: 'brown', lp: 1100 * p, a: 0.05, peak: 1, hold: 0.12, d: 0.1 });
      b.noise(m, { bp: 2400 * p, q: 0.6, a: 0.04, peak: 0.32, hold: 0.1, d: 0.08 });
      b.noise(m, { bp: 230 * p, q: 1.2, a: 0.05, peak: 0.6, hold: 0.12, d: 0.1 });
      b.play(b.hp(b.out, 1500), b.crackle(0.4, 70, 2), 0.02, 0.5);
    },
  },
  zap: {
    vol: 0.72, gap: 100, dur: 0.55, send: 0.3, max: 4, n: 3,
    make(b, p) {
      // 번개 사슬: 지지직 아크 + 날카로운 딱
      b.play(b.drive(b.hp(b.out, 300), 3), b.arc(0.4, 110 * p, 0.12), 0, 0.8);
      b.noise(b.out, { hp: 5000, peak: 1, a: 0.0005, d: 0.004 });
      b.noise(b.out, { bp: 6000, q: 0.7, peak: 0.4, d: 0.06 });
    },
  },
  tesla: {
    vol: 0.64, gap: 120, dur: 0.4, send: 0.2, max: 4, n: 3,
    make(b, p) {
      b.play(b.drive(b.bp(b.out, 1100, 0.6), 2.5), b.arc(0.3, 62 * p, 0.09), 0, 0.9);
      b.play(b.hp(b.out, 4000), b.crackle(0.2, 400, 0.08), 0, 0.5);
    },
  },
  frost: {
    vol: 0.36, gap: 150, dur: 0.8, send: 0.45, max: 3, n: 3,
    make(b, p) {
      // 차가운 바람 한 줄기 + 얼음 결정 짤랑
      b.noise(b.out, { bp: 3000 * p, to: 1500 * p, sweep: 0.4, q: 1.5, a: 0.06, peak: 0.5, hold: 0.05, d: 0.14 });
      const n = 3 + Math.floor(Math.random() * 3);
      for (let k = 0; k < n; k++) b.bell(b.out, { t: rnd(0, 0.16), f: rnd(2400, 4800), ratio: 1.41, index: 0.8, d: 0.12, peak: 0.25 });
    },
  },
  laser: {
    vol: 0.44, gap: 120, dur: 0.8, send: 0.35, max: 3, n: 3,
    make(b, p) {
      // 뿅이 아니라 '부웅-' 하고 꺼지는 광선
      const f = b.lp(b.drive(b.out, 1.4), 6000, 4);
      f.frequency.setValueAtTime(6000, 0);
      f.frequency.exponentialRampToValueAtTime(500, 0.3);
      for (const det of [-12, 12]) b.tone(f, { f: 880 * p, to: 220 * p, glide: 0.25, wave: 'sawtooth', detune: det, peak: 0.6, d: 0.12 });
      b.tone(b.out, { f: 440 * p, to: 110 * p, glide: 0.25, peak: 0.5, d: 0.12 });
      b.noise(b.out, { hp: 4000, peak: 0.3, d: 0.02 });
    },
  },
  plasma: {
    vol: 0.44, gap: 140, dur: 1.2, send: 0.4, max: 3, n: 2,
    make(b, p) {
      const f = b.lp(b.drive(b.out, 3), 4000, 6);
      f.frequency.setValueAtTime(4000, 0);
      f.frequency.exponentialRampToValueAtTime(300, 0.45);
      for (const det of [-20, 0, 20]) b.tone(f, { f: 220 * p, to: 55 * p, glide: 0.4, wave: 'sawtooth', detune: det, peak: 0.6, a: 0.005, d: 0.2 });
      b.tone(b.out, { f: 110 * p, to: 40 * p, glide: 0.3, peak: 0.8, d: 0.2 });
      b.noise(b.out, { bp: 1200, to: 400, q: 1, peak: 0.4, d: 0.15 });
    },
  },
  mortar: {
    vol: 0.35, gap: 150, dur: 0.9, send: 0.4, max: 3, n: 2,
    make(b, p) {
      // 박격포 '텅-'
      const m = b.drive(b.out, 2);
      b.tone(m, { f: 150 * p, to: 45 * p, glide: 0.08, peak: 1, d: 0.07 });
      b.noise(m, { bp: 220 * p, q: 2, peak: 0.8, d: 0.05 });
      b.noise(m, { lp: 2500, peak: 0.5, d: 0.01 });
      b.noise(b.out, { hp: 2000, a: 0.01, peak: 0.15, d: 0.1 });
    },
  },
  radio: {
    vol: 0.21, gap: 200, dur: 0.6, send: 0.15, max: 2, n: 1,
    make(b) {
      // 무전기 '치직 삐-삐'
      const radio = b.bp(b.drive(b.out, 2), 1500, 1.5);
      b.noise(radio, { bp: 1800, q: 0.8, peak: 0.35, a: 0.005, hold: 0.3, d: 0.03 });
      for (const t of [0.03, 0.17]) b.tone(radio, { t, f: 1500, peak: 0.6, a: 0.003, hold: 0.07, d: 0.01 });
    },
  },

  // ── 맞음·터짐·처치 ──
  impact: {
    vol: 0.3, gap: 60, dur: 0.45, send: 0.15, max: 4, n: 3,
    make(b, p) {
      // 벽돌이 퍽 하고 맞는 소리
      const m = b.drive(b.out, 2);
      b.tone(m, { f: 140 * p, to: 60 * p, glide: 0.05, peak: 1, d: 0.04 });
      b.noise(m, { lp: 1800 * p, to: 500, peak: 0.8, d: 0.03 });
      b.play(b.bp(m, 2000, 0.8), b.crackle(0.1, 900, 0.03), 0, 0.4);
    },
  },
  boom: {
    vol: 0.42, gap: 90, dur: 1.6, send: 0.45, max: 4, n: 3,
    make(b, p) {
      // 폭발 = 터지는 딱 + 쏟아지는 굉음 + 배를 울리는 저음 + 남는 웅웅 + 파편
      const m = b.lp(b.drive(b.out, 3), 9000);
      b.noise(m, { hp: 1500, peak: 0.8, a: 0.001, d: 0.01 });
      b.noise(m, { lp: 4000 * p, to: 250, sweep: 0.5, q: 0.8, peak: 1, a: 0.002, d: 0.18 });
      b.tone(m, { f: 85 * p, to: 30, glide: 0.4, peak: 1, a: 0.002, d: 0.25 });
      b.noise(m, { color: 'brown', lp: 300, a: 0.02, peak: 0.7, hold: 0.05, d: 0.35 });
      b.play(b.bp(b.out, 2500, 0.7), b.crackle(0.7, 150, 0.25), 0.03, 0.3);
    },
  },
  bigboom: {
    vol: 0.53, gap: 150, dur: 2.6, send: 0.55, max: 3, n: 2,
    make(b, p) {
      const m = b.lp(b.drive(b.out, 3.2), 8000);
      b.noise(m, { hp: 1200, peak: 0.9, a: 0.001, d: 0.014 });
      b.noise(m, { lp: 3000 * p, to: 150, sweep: 0.9, q: 0.8, peak: 1, a: 0.003, d: 0.3 });
      b.tone(m, { f: 65 * p, to: 25, glide: 0.7, peak: 1, a: 0.003, d: 0.45 });
      b.noise(m, { color: 'brown', lp: 200, a: 0.04, peak: 0.85, hold: 0.2, d: 0.6 });
      b.play(b.bp(b.out, 2200, 0.7), b.crackle(1.3, 140, 0.5), 0.05, 0.35);
    },
  },
  sparkle: {
    vol: 0.74, gap: 100, dur: 1.4, send: 0.4, max: 3, n: 2,
    make(b, p) {
      // 폭죽 '팡!' + 타다닥 불꽃 + 반짝임
      b.noise(b.out, { hp: 1000, peak: 1, a: 0.0005, d: 0.012 });
      b.tone(b.out, { f: 200 * p, to: 80 * p, peak: 0.6, d: 0.03 });
      b.play(b.hp(b.out, 2000), b.crackle(1.1, 160, 0.4), 0.06, 0.65);
      for (let k = 0; k < 4; k++) b.bell(b.out, { t: rnd(0.05, 0.4), f: rnd(2500, 5000), ratio: 2.1, index: 0.6, d: 0.1, peak: 0.14 });
    },
  },
  poof: {
    vol: 0.45, gap: 40, dur: 0.4, send: 0.12, max: 6, n: 4,
    make(b, p) {
      // 좀비가 연기로 '푸슉' 사라짐(피 튀는 소리 없음)
      b.noise(b.out, { bp: 900 * p, to: 280 * p, sweep: 0.15, q: 0.9, peak: 1, a: 0.004, d: 0.06 });
      b.tone(b.out, { f: 130 * p, to: 70 * p, glide: 0.06, peak: 0.7, d: 0.04 });
    },
  },
  bosspoof: {
    vol: 0.49, gap: 300, dur: 2, send: 0.5, max: 1, n: 1,
    make(b) {
      // 거대 좀비가 쿵 쓰러지며 낮게 으르렁
      const m = b.drive(b.out, 2);
      b.tone(m, { f: 70, to: 30, glide: 0.5, peak: 1, d: 0.3 });
      b.noise(m, { lp: 1500, to: 200, sweep: 0.6, peak: 1, a: 0.01, d: 0.25 });
      b.noise(m, { color: 'brown', lp: 250, a: 0.05, peak: 0.8, hold: 0.2, d: 0.4 });
      b.tone(b.bp(m, 520, 4), { f: 92, to: 45, glide: 0.8, wave: 'sawtooth', a: 0.05, hold: 0.3, peak: 0.5, d: 0.3 });
    },
  },
};

// ── 굽기 ──

function renderOffline(c) {
  return new Promise((resolve, reject) => {
    c.oncomplete = e => resolve(e.renderedBuffer);
    const p = c.startRendering();
    if (p && p.then) p.then(resolve, reject);
  });
}

async function bakeOne(s) {
  const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  const c = new OAC(1, Math.ceil(BAKE_RATE * s.dur), BAKE_RATE);
  s.make(kit(c), rnd(0.94, 1.06));
  const out = await renderOffline(c);
  const d = out.getChannelData(0);
  let peak = 0;
  let end = 0;
  for (let i = 0; i < d.length; i++) {
    const v = Math.abs(d[i]);
    if (v > peak) peak = v;
    if (v > 2e-4) end = i;
  }
  if (peak < 1e-5) return null;
  // 끝의 조용한 부분은 자르고, 크기를 맞추고, 끝을 부드럽게 줄여 '틱' 소리를 막는다
  const n = Math.min(d.length, end + Math.floor(BAKE_RATE * 0.01));
  const buf = c.createBuffer(1, n, BAKE_RATE);
  const o = buf.getChannelData(0);
  const scale = 0.9 / peak;
  const fade = Math.floor(Math.min(BAKE_RATE * 0.06, n * 0.2));
  for (let i = 0; i < n; i++) o[i] = d[i] * scale * Math.min(1, (n - i) / fade);
  return buf;
}

let baking = null;
export function bakeSounds() {
  if (baking) return baking;
  baking = (async () => {
    if (typeof window === 'undefined' || !(window.OfflineAudioContext || window.webkitOfflineAudioContext)) return;
    for (const [name, s] of Object.entries(SOUNDS)) {
      const list = [];
      for (let k = 0; k < (s.n || 1); k++) {
        try {
          const buf = await bakeOne(s);
          if (buf) list.push(buf);
        } catch {
          // 이 변형은 건너뛴다
        }
      }
      baked[name] = list;
    }
    performance.mark('baked');
  })();
  return baking;
}

// ── 재생 ──

// 공간 울림: 짧은 마당 정도의 잔향을 잡음으로 만든다(뒤로 갈수록 높은 소리가 먼저 사라짐)
function impulse(c, seconds = 1.6, tau = 0.26) {
  const sr = c.sampleRate;
  const n = Math.floor(sr * seconds);
  const pre = Math.floor(sr * 0.012);
  const ir = c.createBuffer(2, n, sr);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    let y = 0;
    for (let i = pre; i < n; i++) {
      const t = (i - pre) / sr;
      y += (0.6 * Math.exp(-t / 0.5) + 0.08) * ((Math.random() * 2 - 1) - y);
      d[i] = y * Math.exp(-t / tau);
    }
    for (let r = 0; r < 6; r++) {
      const at = pre + Math.floor(sr * rnd(0.006, 0.07));
      d[at] += (Math.random() < 0.5 ? -1 : 1) * (0.5 - r * 0.06);
    }
  }
  return ir;
}

function ensure() {
  if (ctx) return ctx;
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    // 여러 소리가 겹쳐도 깨지지 않게 마스터 압축기
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.knee.value = 12;
    comp.ratio.value = 5;
    comp.attack.value = 0.003;
    comp.release.value = 0.25;
    const master = ctx.createGain();
    master.gain.value = 0.9;
    comp.connect(master).connect(ctx.destination);
    dryIn = ctx.createGain();
    dryIn.connect(comp);
    const verb = ctx.createConvolver();
    verb.buffer = impulse(ctx);
    const wet = ctx.createGain();
    wet.gain.value = 0.5;
    wetIn = ctx.createBiquadFilter();
    wetIn.type = 'highpass';
    wetIn.frequency.value = 180;
    wetIn.connect(verb).connect(wet).connect(comp);
  } catch {
    ctx = null;
  }
  bakeSounds();
  return ctx;
}

export function unlockAudio() {
  const c = ensure();
  if (c && c.state === 'suspended') c.resume();
}

// name: 소리 이름, pan: -1(왼쪽) ~ 1(오른쪽)
export function sfx(name, pan = 0) {
  if (!loadSave().settings.sound) return;
  const c = ensure();
  if (!c || c.state !== 'running') return;
  const s = SOUNDS[name];
  const bufs = baked[name];
  if (!s || !bufs || !bufs.length) return;
  const now = performance.now();
  if (last[name] && now - last[name] < s.gap) return;
  if (!s.ui && voices >= MAX_VOICES) return;
  if ((active[name] || 0) >= (s.max || 4)) return;
  last[name] = now;

  const src = c.createBufferSource();
  src.buffer = bufs[Math.floor(Math.random() * bufs.length)];
  // 같은 소리가 반복돼도 기계처럼 들리지 않게 높낮이를 아주 조금씩 흔든다
  src.playbackRate.value = 1 + (Math.random() - 0.5) * (s.ui ? 0.02 : 0.07);
  const g = c.createGain();
  g.gain.value = s.vol;
  const nodes = [src, g];
  let head = src.connect(g);
  if (pan && c.createStereoPanner) {
    const pn = c.createStereoPanner();
    pn.pan.value = Math.max(-1, Math.min(1, pan)) * 0.55;
    head = head.connect(pn);
    nodes.push(pn);
  }
  head.connect(dryIn);
  if (s.send) {
    const send = c.createGain();
    send.gain.value = s.send;
    head.connect(send).connect(wetIn);
    nodes.push(send);
  }
  voices++;
  active[name] = (active[name] || 0) + 1;
  src.onended = () => {
    voices--;
    active[name]--;
    for (const n of nodes) n.disconnect();
  };
  src.start();
}

// 점검 스크립트(scripts/sound-check.mjs)용
export const SOUND_NAMES = Object.keys(SOUNDS);
export const bakedBuffers = baked;
export const soundVolume = name => SOUNDS[name].vol;
