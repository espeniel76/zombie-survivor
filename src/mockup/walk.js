// 목업: 좀비가 진짜로 걸어오는 모습. 그리기는 게임과 같은 blob.js(o.walk).
import { drawPerson, allyLook, ZOMBIE_LOOK, BY, hex } from '../render/blob.js';
import { ZOMBIE_SCALE, ALLY_SCALE } from '../render/sprites.js';
import { ZOMBIES } from '../data/zombies.js';
import { ALLIES, TIERS } from '../data/allies.js';
import { gaitOf, feetAt, bodyAt, TAU } from '../render/gait.js';

// 걸음걸이는 게임과 같은 것(src/render/gait.js)
const pose = (g, ph) => ({ feet: feetAt(g, ph), ...bodyAt(g, ph) });
// 공격 중: 발은 멈춘다
const STAND = { feet: [[0, 0], [0, 0]], dy: 0, rot: 0, sx: 1, sy: 1 };

// 한 걸음 디딜 때마다 먼지(덩치·거인)
function stepDust(list, x, footY, s, g, facing, ph, prev) {
  if (!g.stomp) return;
  for (const i of [0, 1]) {
    const k = Math.floor((ph + i * Math.PI) / TAU);
    const k0 = Math.floor((prev + i * Math.PI) / TAU);
    if (k === k0) continue;
    const fx = x + ([-8, 8][i] + g.stride) * s * facing;
    for (let n = 0; n < 2 + g.stomp * 2; n++) {
      const a = Math.PI + (n % 2 ? 0.25 : -0.25) + (Math.random() - 0.5) * 0.6;
      const side = n % 2 ? 1 : -1;
      list.push({ x: fx, y: footY, vx: side * (14 + Math.random() * 16) * s * 0.5, vy: -4 * s * Math.random(),
        r: 4 * s, grow: 7 * s, t: 0, life: 0.55 + g.stomp * 0.15, a: 0.38 + g.stomp * 0.07, _: a });
    }
  }
}
function drawDust(ctx, list, dt) {
  for (let i = list.length - 1; i >= 0; i--) {
    const p = list[i];
    p.t += dt;
    if (p.t >= p.life) { list.splice(i, 1); continue; }
    const k = p.t / p.life;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    ctx.fillStyle = `rgba(${p.color || '190,190,180'},${p.a * (1 - k)})`;
    ctx.beginPath(); ctx.ellipse(p.x, p.y, p.r + p.grow * k, (p.r + p.grow * k) * 0.55, 0, 0, TAU); ctx.fill();
  }
}

let walkOn = true;
let speed = 1;

// ── 전장 ──
const CX = 360;
const CY = 650;
const OY = 150; // 화면 위쪽 = 맵 y 150
const HALF = 146;
const CELL = 92;
const GAP = 8;

function roadLayer() {
  const cv = document.createElement('canvas');
  cv.width = 720; cv.height = 1000;
  const g = cv.getContext('2d');
  const cy = CY - OY;
  const RW = 170;
  g.fillStyle = '#4d5258'; g.fillRect(0, 0, 720, 1000);
  g.strokeStyle = '#43484e'; g.lineWidth = 2;
  for (let y = 0; y < 1000; y += 44) { g.beginPath(); g.moveTo(0, y); g.lineTo(720, y); g.stroke(); }
  for (let x = 0; x < 720; x += 44) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 1000); g.stroke(); }
  g.fillStyle = '#2c3036';
  g.fillRect(CX - RW, 0, RW * 2, 1000);
  g.fillRect(0, cy - RW, 720, RW * 2);
  g.strokeStyle = '#737980'; g.lineWidth = 6;
  const line = (a, b, c, d) => { g.beginPath(); g.moveTo(a, b); g.lineTo(c, d); g.stroke(); };
  for (const x of [CX - RW, CX + RW]) { line(x, 0, x, cy - RW); line(x, cy + RW, x, 1000); }
  for (const y of [cy - RW, cy + RW]) { line(0, y, CX - RW, y); line(CX + RW, y, 720, y); }
  const STOP = RW + 80;
  g.strokeStyle = 'rgba(216,178,58,0.85)'; g.lineWidth = 3;
  for (const d of [-4, 4]) {
    line(CX + d, 0, CX + d, cy - STOP); line(CX + d, cy + STOP, CX + d, 1000);
    line(0, cy + d, CX - STOP, cy + d); line(CX + STOP, cy + d, 720, cy + d);
  }
  g.fillStyle = 'rgba(223,227,230,0.7)';
  for (const x of [CX - RW / 2, CX + RW / 2]) for (let y = 0; y < 1000; y += 70) if (Math.abs(y + 15 - cy) > STOP) g.fillRect(x - 2, y, 4, 34);
  for (const y of [cy - RW / 2, cy + RW / 2]) for (let x = 0; x < 720; x += 70) if (Math.abs(x + 15 - CX) > STOP) g.fillRect(x, y - 2, 34, 4);
  g.fillStyle = 'rgba(230,233,236,0.75)';
  for (let k = -RW + 14; k < RW - 14; k += 26) {
    g.fillRect(CX + k, cy - RW - 70, 13, 52); g.fillRect(CX + k, cy + RW + 18, 13, 52);
    g.fillRect(CX - RW - 70, cy + k, 52, 13); g.fillRect(CX + RW + 18, cy + k, 52, 13);
  }
  // 기지: 모래주머니 + 9칸
  const pad = HALF + 14;
  g.fillStyle = '#3a4048';
  g.beginPath(); g.roundRect(CX - pad, cy - pad, pad * 2, pad * 2, 14); g.fill();
  for (let s = -pad; s <= pad; s += 22) {
    for (const [x, y] of [[CX + s, cy - pad], [CX + s, cy + pad], [CX - pad, cy + s], [CX + pad, cy + s]]) {
      g.fillStyle = '#7a6a48'; g.beginPath(); g.ellipse(x, y + 2, 12, 8, 0, 0, TAU); g.fill();
      g.fillStyle = '#c8b07a'; g.beginPath(); g.ellipse(x, y, 11, 7, 0, 0, TAU); g.fill();
    }
  }
  return cv;
}

const TEAM = ['guard', 'hunter', 'police', 'firefighter', 'sniper', 'gunner', 'frost', 'camper', 'cook'];
const cells = TEAM.map((id, i) => ({
  a: ALLIES.find(q => q.id === id),
  x: CX + ((i % 3) - 1) * (CELL + GAP),
  y: CY + (Math.floor(i / 3) - 1) * (CELL + GAP),
}));

const MIX = ['walker', 'walker', 'walker', 'walker', 'runner', 'runner', 'brute', 'spitter', 'armored', 'splitter', 'splitling', 'splitling', 'healer'];
const zs = [];
const dust = [];
function spawn(kind, delay = 0) {
  const a = Math.random() * TAU;
  const def = ZOMBIES[kind];
  zs.push({ kind, def, s: ZOMBIE_SCALE[kind], g: gaitOf(kind), x: CX + Math.cos(a) * 640, y: CY + Math.sin(a) * 640,
    ph: Math.random() * TAU, wait: delay, hits: 0, atkT: 0.6, bump: 0, gone: 0 });
}
MIX.forEach((k, i) => spawn(k, i * 0.7));
spawn('foreman', 2);

function stepField(dt) {
  for (const z of zs) {
    if (z.wait > 0) { z.wait -= dt; continue; }
    if (z.gone > 0) { // 연기로 사라진 뒤 다시 나온다
      z.gone -= dt;
      if (z.gone <= 0) {
        const kind = z.kind === 'foreman' ? 'foreman' : MIX[Math.floor(Math.random() * MIX.length)];
        Object.assign(z, { kind, def: ZOMBIES[kind], s: ZOMBIE_SCALE[kind], g: gaitOf(kind), hits: 0, atkT: 0.6 });
        const a = Math.random() * TAU;
        z.x = CX + Math.cos(a) * 640; z.y = CY + Math.sin(a) * 640;
      }
      continue;
    }
    z.bump = Math.max(0, z.bump - dt);
    const dx = CX - z.x;
    const dy = CY - z.y;
    z.face = dx < 0 ? -1 : 1;
    const edge = Math.max(Math.abs(dx), Math.abs(dy)) - HALF;
    z.attacking = edge <= z.def.radius * 0.7;
    if (z.attacking) {
      z.atkT -= dt;
      if (z.atkT <= 0) {
        z.atkT = 1; z.bump = 0.16; z.hits++;
        if (z.hits >= 3) { // 연기
          for (let n = 0; n < 6; n++) dust.push({ x: z.x + (Math.random() - 0.5) * 20 * z.s, y: z.y + (Math.random() - 0.5) * 20 * z.s, vx: 0, vy: -10, r: 6 * z.s, grow: 14 * z.s, t: 0, life: 0.7, a: 0.5, color: '184,191,196' });
          z.gone = 1.2;
        }
      }
      continue;
    }
    const d = Math.hypot(dx, dy) || 1;
    const v = z.def.speed * dt;
    z.x += (dx / d) * v;
    z.y += (dy / d) * v;
    const prev = z.ph;
    z.ph += (v / (2 * z.g.stride * z.s)) * Math.PI;
    if (walkOn) stepDust(dust, z.x, z.y - OY - BY * z.s, z.s, z.g, z.face, z.ph, prev);
  }
  // 서로 겹치지 않게
  for (let i = 0; i < zs.length; i++) {
    for (let j = i + 1; j < zs.length; j++) {
      const a = zs[i]; const b = zs[j];
      if (a.wait > 0 || b.wait > 0 || a.gone > 0 || b.gone > 0) continue;
      const dx = b.x - a.x; const dy = b.y - a.y;
      const min = (a.def.radius + b.def.radius) * 0.85;
      const d2 = dx * dx + dy * dy;
      if (d2 >= min * min || d2 === 0) continue;
      const d = Math.sqrt(d2); const push = (min - d) / d / 2;
      a.x -= dx * push; a.y -= dy * push; b.x += dx * push; b.y += dy * push;
    }
  }
  for (const z of zs) {
    const lim = HALF + z.def.radius * 0.5;
    const dx = z.x - CX; const dy = z.y - CY;
    if (Math.abs(dx) < lim && Math.abs(dy) < lim) {
      if (Math.abs(dx) > Math.abs(dy)) z.x = CX + Math.sign(dx || 1) * lim;
      else z.y = CY + Math.sign(dy || 1) * lim;
    }
  }
}

const field = document.getElementById('field');
const fctx = field.getContext('2d');
const road = roadLayer();

function drawField(dt) {
  fctx.drawImage(road, 0, 0);
  // 아군(가장 가까운 좀비를 바라본다)
  const live = zs.filter(z => z.wait <= 0 && z.gone <= 0);
  for (const c of cells) {
    fctx.fillStyle = 'rgba(30,37,44,0.92)';
    fctx.beginPath(); fctx.roundRect(c.x - CELL / 2, c.y - OY - CELL / 2, CELL, CELL, 12); fctx.fill();
    fctx.lineWidth = 3; fctx.strokeStyle = hex(TIERS[c.a.tier].color); fctx.stroke();
    let best = null; let bd = 1e9;
    for (const z of live) { const d = Math.hypot(z.x - c.x, z.y - c.y); if (d < bd) { bd = d; best = z; } }
    const aim = best ? Math.atan2(best.y - c.y, best.x - c.x) : -0.25;
    drawPerson(fctx, c.x, c.y - OY - BY * ALLY_SCALE, ALLY_SCALE, { ...allyLook(c.a, false, false), aim });
  }
  drawDust(fctx, dust, dt);
  for (const z of [...live].sort((p, q) => p.y - q.y)) {
    let x = z.x; let y = z.y;
    if (z.bump > 0) { // 기지를 때릴 때 앞으로 툭
      const a = Math.atan2(CY - z.y, CX - z.x); const k = Math.sin((z.bump / 0.16) * Math.PI) * 6;
      x += Math.cos(a) * k; y += Math.sin(a) * k;
    }
    const walk = !walkOn ? null : z.attacking ? STAND : pose(z.g, z.ph);
    drawPerson(fctx, x, y - OY - BY * z.s, z.s, { ...ZOMBIE_LOOK[z.kind], zombie: true, aim: z.face < 0 ? Math.PI : 0, walk });
  }
}

// ── 좀비별 카드(제자리 걸음, 바닥이 뒤로 흐른다) ──
const CARDS = [
  ['walker', 1.5], ['runner', 1.5], ['brute', 1.2], ['spitter', 1.5], ['armored', 1.5], ['splitter', 1.5],
  ['splitling', 1.5], ['healer', 1.5], ['boss', 0.9], ['foreman', 0.9], ['rainlord', 0.75],
];
const cards = CARDS.map(([kind, zoom]) => {
  const s = ZOMBIE_SCALE[kind] * zoom;
  const big = ZOMBIES[kind].boss;
  const el = document.createElement('div');
  el.className = big ? 'card big' : 'card';
  const cv = document.createElement('canvas');
  cv.width = big ? 700 : 240;
  cv.height = Math.round(76 * s + 28);
  el.append(cv);
  const g = gaitOf(kind);
  el.insertAdjacentHTML('beforeend', `<b>${ZOMBIES[kind].name}</b><span>${g.note}</span>`);
  document.getElementById('cards').append(el);
  // 바닥 얼룩(고정 무늬가 뒤로 흐른다)
  const specks = Array.from({ length: big ? 40 : 16 }, () => ({ x: Math.random() * cv.width, y: Math.random() * cv.height, r: 2 + Math.random() * 5 }));
  return { kind, s, g, cv, ctx: cv.getContext('2d'), specks, off: 0, ph: 0, dust: [] };
});

function drawCards(dt) {
  for (const c of cards) {
    const v = ZOMBIES[c.kind].speed * (c.s / ZOMBIE_SCALE[c.kind]) * dt;
    c.off += v;
    const prev = c.ph;
    c.ph += (v / (2 * c.g.stride * c.s)) * Math.PI;
    const { ctx, cv } = c;
    const footY = cv.height - 16;
    const x = cv.width / 2;
    ctx.fillStyle = '#2c3036'; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.fillStyle = 'rgba(70,76,84,0.9)';
    for (const p of c.specks) {
      const sx = ((((p.x - c.off) % cv.width) + cv.width) % cv.width);
      ctx.beginPath(); ctx.ellipse(sx, p.y, p.r * 1.6, p.r * 0.7, 0, 0, TAU); ctx.fill();
    }
    ctx.fillStyle = 'rgba(223,227,230,0.6)';
    for (let k = -1; k < cv.width / 60 + 1; k++) {
      const sx = k * 60 - (c.off % 60);
      ctx.fillRect(sx, footY + 6, 30, 3);
    }
    stepDust(c.dust, x, footY, c.s, c.g, 1, c.ph, prev);
    for (const p of c.dust) p.x -= v; // 먼지도 바닥과 함께 뒤로
    drawDust(ctx, c.dust, dt);
    drawPerson(ctx, x, footY, c.s, { ...ZOMBIE_LOOK[c.kind], zombie: true, aim: 0, walk: pose(c.g, c.ph) });
  }
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000) * speed;
  last = now;
  let left = dt;
  while (left > 0) { const d = Math.min(left, 0.02); stepField(d); left -= d; }
  drawField(dt);
  drawCards(dt);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

const bOld = document.getElementById('old');
const bNew = document.getElementById('new');
const bSpd = document.getElementById('spd');
bOld.onclick = () => { walkOn = false; bOld.classList.add('on'); bNew.classList.remove('on'); };
bNew.onclick = () => { walkOn = true; bNew.classList.add('on'); bOld.classList.remove('on'); };
bSpd.onclick = () => { speed = speed % 3 + 1; bSpd.textContent = `${speed}배속`; };
