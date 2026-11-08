// 목업: 동그라미 아군과 좀비. 그리기는 src/render/blob.js(게임과 같은 코드).
import { ALLIES, TIERS } from '../data/allies.js';
import { drawPerson, allyLook, ZOMBIE_LOOK, hex } from '../render/blob.js';

const DARK = '#161b20';
function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

// ── 화면 1: 전장 ──
function drawField() {
  const cv = document.getElementById('field');
  const ctx = cv.getContext('2d');
  const W = cv.width;
  const H = cv.height;
  ctx.fillStyle = '#2a3326';
  ctx.fillRect(0, 0, W, H);
  let seed = 7;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = rnd() < 0.5 ? '#263021' : '#2f392a';
    ctx.beginPath(); ctx.arc(rnd() * W, rnd() * H, 20 + rnd() * 40, 0, Math.PI * 2); ctx.fill();
  }
  const CX = W / 2;
  const CY = H / 2 + 20;
  const CELL = 92;
  const GAP = 8;
  const HALF = 146;
  const pad = HALF + 22;
  ctx.fillStyle = '#4a5056';
  rr(ctx, CX - pad, CY - pad, pad * 2, pad * 2, 20); ctx.fill();
  ctx.fillStyle = '#5a6168';
  rr(ctx, CX - pad + 8, CY - pad + 8, pad * 2 - 16, pad * 2 - 16, 14); ctx.fill();
  for (let s = -pad + 10; s <= pad - 10; s += 26) {
    for (const [x, y] of [[CX + s, CY - pad], [CX + s, CY + pad], [CX - pad, CY + s], [CX + pad, CY + s]]) {
      ctx.fillStyle = '#2a2620'; ctx.beginPath(); ctx.ellipse(x + 1, y + 2, 13, 9, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#b39a6a'; ctx.beginPath(); ctx.ellipse(x, y, 12, 8, 0, 0, Math.PI * 2); ctx.fill();
    }
  }
  const team = ['wisp', 'gravity', 'dragon', 'mirror', 'echo', 'gambler', 'frog', 'swamp', 'stone'];
  // 좀비들(사방에서 기지 쪽으로)
  const zs = [];
  const kinds = ['walker', 'walker', 'runner', 'walker', 'brute', 'spitter', 'walker', 'runner', 'walker', 'walker', 'spitter', 'runner'];
  kinds.forEach((k, i) => {
    const a = (i / kinds.length) * Math.PI * 2 + 0.3;
    const r = 230 + (i % 3) * 55;
    zs.push({ k, x: CX + Math.cos(a) * r * 1.05, y: CY + Math.sin(a) * r * 1.25 });
  });
  zs.push({ k: 'boss', x: CX - 40, y: CY - 330 });
  const cells = [];
  for (let i = 0; i < 9; i++) {
    const x = CX + ((i % 3) - 1) * (CELL + GAP);
    const y = CY + (Math.floor(i / 3) - 1) * (CELL + GAP);
    const a = ALLIES.find(q => q.id === team[i]);
    ctx.fillStyle = 'rgba(30,37,44,0.92)';
    rr(ctx, x - CELL / 2, y - CELL / 2, CELL, CELL, 12); ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = hex(TIERS[a.tier].color); ctx.stroke();
    cells.push({ x, y, a });
  }
  // 아래쪽에 있는 것부터 그려야 겹침이 자연스럽다
  const things = [
    ...zs.map(z => ({ y: z.y, draw: () => {
      const L = ZOMBIE_LOOK[z.k];
      drawPerson(ctx, z.x, z.y, L.s * 1.35, { ...L, zombie: true, aim: z.x < CX ? 0 : Math.PI });
    } })),
    ...cells.map(c => ({ y: c.y + 38, draw: () => {
      let best = zs[0];
      for (const z of zs) if (Math.hypot(z.x - c.x, z.y - c.y) < Math.hypot(best.x - c.x, best.y - c.y)) best = z;
      const aim = Math.atan2(best.y - c.y, best.x - c.x);
      drawPerson(ctx, c.x, c.y + 36, 1.45, { ...allyLook(c.a, true, true), aim });
      ctx.font = 'bold 15px "Malgun Gothic", sans-serif';
      ctx.fillStyle = '#fff'; ctx.strokeStyle = DARK; ctx.lineWidth = 4; ctx.textAlign = 'right';
      ctx.strokeText('Lv1', c.x + 42, c.y + 42); ctx.fillText('Lv1', c.x + 42, c.y + 42);
    } })),
  ].sort((p, q) => p.y - q.y);
  things.forEach(t => t.draw());
}

// ── 화면 2: 아군 30명 ──
function drawGallery() {
  const root = document.getElementById('gallery');
  TIERS.forEach((t, ti) => {
    const row = document.createElement('section');
    row.innerHTML = `<h3 style="color:${t.text}">${t.name}</h3>`;
    const grid = document.createElement('div');
    grid.className = 'row';
    ALLIES.filter(a => a.tier === ti).forEach(a => {
      const card = document.createElement('div');
      card.className = 'card';
      card.style.borderColor = hex(t.color);
      const cv = document.createElement('canvas');
      cv.width = 120; cv.height = 140;
      const ctx = cv.getContext('2d');
      drawPerson(ctx, 60, 128, a.hero ? 1.55 : 1.85, { ...allyLook(a, true, true), aim: -0.25 });
      card.append(cv);
      const n = document.createElement('div');
      n.innerHTML = a.role ? `${a.name}<br><span style="font-weight:normal;color:#93a39a;font-size:12px">${a.role}</span>` : a.name;
      card.append(n);
      grid.append(card);
    });
    row.append(grid);
    root.append(row);
  });
  const zrow = document.createElement('section');
  zrow.innerHTML = '<h3 style="color:#9be15d">좀비</h3>';
  const zgrid = document.createElement('div');
  zgrid.className = 'row';
  for (const [k, name] of [['walker', '걷는 좀비'], ['runner', '달리는 좀비'], ['brute', '덩치 좀비'], ['spitter', '침 뱉는 좀비'], ['boss', '거대 좀비']]) {
    const card = document.createElement('div');
    card.className = 'card';
    card.style.borderColor = '#36424e';
    const cv = document.createElement('canvas');
    cv.width = 120; cv.height = 140;
    const L = ZOMBIE_LOOK[k];
    drawPerson(cv.getContext('2d'), 56, 128, Math.min(2.3, 1.6 * L.s), { ...L, zombie: true, aim: 0 });
    card.append(cv);
    const n = document.createElement('div');
    n.textContent = name;
    card.append(n);
    zgrid.append(card);
  }
  zrow.append(zgrid);
  root.append(zrow);
}

// ── 비교: 전설·신화 지금 → 옷 입힌 모습 ──
function drawCompare() {
  const root = document.getElementById('compare');
  const heroes = ALLIES.filter(a => a.hero);
  for (const [label, outfit] of [['새 영웅', true]]) {
    const row = document.createElement('div');
    row.className = 'row';
    const tag = document.createElement('div');
    tag.className = 'tag';
    tag.textContent = label;
    row.append(tag);
    for (const a of heroes) {
      const cv = document.createElement('canvas');
      cv.width = 66; cv.height = 92;
      drawPerson(cv.getContext('2d'), 33, 86, 0.95, { ...allyLook(a, true, outfit), aim: -0.25 });
      row.append(cv);
    }
    root.append(row);
  }
}

drawCompare();
drawField();
drawGallery();
