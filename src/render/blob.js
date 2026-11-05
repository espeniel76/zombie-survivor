// 동그라미 캐릭터(아군·좀비) 그리기. Canvas 2D로 그려 게임 텍스처와 목업(mockup.html)에 같이 쓴다.
// 둥근 몸에 빛 받는 그라데이션, 반짝이는 하이라이트, 몸 색에 맞춘 테두리, 작은 발.

export const hex = n => `#${n.toString(16).padStart(6, '0')}`;
const DARK = '#161b20';
const SKIN = '#f2c79a';

export const HAT_STYLE = {
  cook: 'chef', firefighter: 'helmet', gunner: 'helmet', grenadier: 'helmet', minigunner: 'helmet',
  rocketeer: 'helmet', mortar: 'helmet', sniper: 'beanie', hunter: 'beanie', camper: 'beanie',
  medic: 'cap', police: 'cap', guard: 'cap', mechanic: 'cap', courier: 'cap', commander: 'beret',
  laser: 'visor', plasma: 'visor', orbital: 'visor', tesla: 'goggles', electrician: 'goggles',
  frost: 'beanie', blizzard: 'beanie', chemist: 'goggles', merchant: 'tophat', lastsurvivor: 'band',
};

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function rgb(c) {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
// amt > 0 밝게, < 0 어둡게 (-1 ~ 1)
function shade(c, amt) {
  const [r, g, b] = rgb(c);
  const f = v => Math.round(amt >= 0 ? v + (255 - v) * amt : v * (1 + amt));
  return `#${[f(r), f(g), f(b)].map(v => v.toString(16).padStart(2, '0')).join('')}`;
}
function rgba(c, a) {
  const [r, g, b] = rgb(c);
  return `rgba(${r},${g},${b},${a})`;
}

// 테두리는 검정 대신 채움 색을 진하게 한 색 → 부드러운 느낌
function fillStroke(ctx, fill, lw = 2, stroke = null) {
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = lw;
  ctx.strokeStyle = stroke || (fill.startsWith('#') ? shade(fill, -0.62) : DARK);
  ctx.lineJoin = 'round';
  ctx.stroke();
}

// 둥근 덮개(모자 윗부분 등)에 얹는 하이라이트
function sheen(ctx, x, y, r, a0 = 1.15, a1 = 1.55) {
  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.lineWidth = Math.max(1.5, r * 0.16);
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(x, y, r * 0.72, Math.PI * a0, Math.PI * a1); ctx.stroke();
  ctx.lineCap = 'butt';
}

function weapon(ctx, gun, medic = false) {
  const box = (x, y, w, h, c) => {
    rr(ctx, x, y, w, h, Math.min(3, h / 2));
    fillStroke(ctx, c, 1.8);
    ctx.fillStyle = rgba(shade(c, 0.55), 0.7);
    rr(ctx, x + 1.5, y + 1, Math.max(1, w - 3), Math.max(1, Math.min(1.8, h / 3)), 1);
    ctx.fill();
  };
  switch (gun) {
    case 'pistol': box(4, -3, 14, 6, '#3a3f45'); box(4, 0, 5, 8, '#3a3f45'); break;
    case 'rifle': box(-4, -3, 30, 6, '#3a3f45'); box(-2, 0, 6, 7, '#6b4a26'); break;
    case 'long': box(-8, -2.5, 40, 5, '#2f343a'); box(4, -7, 12, 4, '#2f343a'); break;
    case 'heavy': box(-6, -5, 30, 10, '#2f343a'); box(22, -3.5, 8, 7, '#1e2226'); break;
    case 'tube': box(-10, -5, 34, 10, '#5a6a3a'); break;
    case 'flame': box(0, -3, 24, 6, '#c0392b'); break;
    case 'sling':
      ctx.strokeStyle = '#8a6436';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(4, 0); ctx.lineTo(13, 0); ctx.lineTo(19, -6); ctx.moveTo(13, 0); ctx.lineTo(19, 6);
      ctx.stroke();
      break;
    case 'bow':
      ctx.strokeStyle = '#8a6436';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(4, 0, 16, -1.2, 1.2);
      ctx.stroke();
      ctx.strokeStyle = '#e8e8e8';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(4 + 16 * Math.cos(-1.2), 16 * Math.sin(-1.2));
      ctx.lineTo(4 + 16 * Math.cos(1.2), 16 * Math.sin(1.2));
      ctx.stroke();
      break;
    case 'pan':
      box(4, -2, 10, 4, '#6b4a26');
      ctx.beginPath(); ctx.arc(20, 0, 8, 0, Math.PI * 2); fillStroke(ctx, '#2a2a2a');
      break;
    case 'wrench': box(2, -2, 18, 4, '#9aa6b2'); box(18, -6, 6, 12, '#9aa6b2'); break;
    case 'radio':
      box(2, -6, 11, 12, '#3a4a3a');
      ctx.strokeStyle = '#9aa6b2'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(10, -6); ctx.lineTo(15, -15); ctx.stroke();
      break;
    case 'staff':
      ctx.strokeStyle = '#6b4a26'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(22, 0); ctx.stroke();
      ctx.beginPath(); ctx.arc(24, 0, 6, 0, Math.PI * 2); fillStroke(ctx, '#9fd4ff');
      ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.arc(22, -2, 2, 0, Math.PI * 2); ctx.fill();
      break;
    case 'none': box(6, -5, 12, 8, '#b5562e'); break; // 벽돌을 들고 있음
    case 'bag':
      box(4, -8, 16, 14, medic ? '#ffffff' : '#d9c49a');
      if (medic) {
        ctx.fillStyle = '#4cbb6a'; ctx.fillRect(10.5, -5, 3, 8); ctx.fillRect(7.5, -2.5, 9, 3);
      } else {
        ctx.beginPath(); ctx.arc(12, -1, 4.5, 0, Math.PI * 2); fillStroke(ctx, '#ffc83d', 1.5);
      }
      break;
    default: break;
  }
}

function hat(ctx, style, color) {
  const c = color != null ? hex(color) : null;
  if (!c) return;
  switch (style) {
    case 'chef':
      rr(ctx, -12, -64, 24, 8, 2); fillStroke(ctx, '#ffffff');
      for (const [x, y] of [[-8, -68], [0, -73], [8, -68]]) { ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); fillStroke(ctx, '#ffffff'); }
      break;
    case 'helmet':
      ctx.beginPath(); ctx.arc(0, -49, 18, Math.PI, 0); ctx.closePath(); fillStroke(ctx, c);
      sheen(ctx, 0, -49, 18);
      rr(ctx, -20, -51, 40, 5, 2.5); fillStroke(ctx, shade(c, -0.12));
      break;
    case 'beanie':
      ctx.beginPath(); ctx.arc(0, -50, 16, Math.PI, 0); ctx.closePath(); fillStroke(ctx, c);
      sheen(ctx, 0, -50, 16);
      rr(ctx, -17, -53, 34, 6, 3); fillStroke(ctx, shade(c, -0.15));
      ctx.beginPath(); ctx.arc(0, -67, 4, 0, Math.PI * 2); fillStroke(ctx, shade(c, 0.35));
      break;
    case 'beret':
      ctx.beginPath(); ctx.ellipse(-3, -59, 18, 8, -0.15, 0, Math.PI * 2); fillStroke(ctx, c);
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.ellipse(-8, -62, 7, 2.5, -0.15, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffd84a'; ctx.beginPath(); ctx.arc(6, -59, 2.5, 0, Math.PI * 2); ctx.fill();
      break;
    case 'visor':
      ctx.beginPath(); ctx.arc(0, -49, 18, Math.PI, 0); ctx.closePath(); fillStroke(ctx, '#3a4250');
      sheen(ctx, 0, -49, 18);
      rr(ctx, -15, -58, 30, 7, 3.5); fillStroke(ctx, c);
      ctx.fillStyle = 'rgba(255,255,255,0.55)'; rr(ctx, -12, -57, 10, 2, 1); ctx.fill();
      break;
    case 'goggles':
      rr(ctx, -16, -57, 32, 4, 2); fillStroke(ctx, '#2a2a2a');
      for (const x of [-7, 7]) {
        ctx.beginPath(); ctx.arc(x, -55, 5, 0, Math.PI * 2); fillStroke(ctx, c);
        ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.beginPath(); ctx.arc(x - 1.6, -56.6, 1.5, 0, Math.PI * 2); ctx.fill();
      }
      break;
    case 'tophat':
      rr(ctx, -19, -56, 38, 5, 2); fillStroke(ctx, '#2a2a2a');
      rr(ctx, -11, -76, 22, 21, 2); fillStroke(ctx, '#2a2a2a');
      ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(-8, -74, 3, 11);
      rr(ctx, -11, -62, 22, 4, 0); fillStroke(ctx, c);
      break;
    case 'band':
      rr(ctx, -17, -55, 34, 6, 2); fillStroke(ctx, c);
      ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(15, -54); ctx.lineTo(24, -48); ctx.lineTo(22, -58); ctx.fill();
      break;
    default: // cap
      ctx.beginPath(); ctx.ellipse(0, -50, 20, 4.5, 0, 0, Math.PI * 2); fillStroke(ctx, shade(c, -0.15));
      ctx.beginPath(); ctx.arc(0, -50, 16, Math.PI, 0); ctx.closePath(); fillStroke(ctx, c);
      sheen(ctx, 0, -50, 16);
      if (style === 'cap' && color === 0x4cbb6a) { ctx.fillStyle = '#fff'; ctx.fillRect(-2, -62, 4, 9); ctx.fillRect(-5, -59, 10, 3); }
  }
}

// 동그라미 캐릭터 한 명. (x, y) = 발밑. aim = 무기 방향(라디안). 왼쪽을 노리면 좌우를 뒤집는다.
export const R = 21; // 몸 반지름
export const BY = -23; // 몸 중심 높이(발밑 기준)
export const HAND = { x: 13, y: 7 }; // 몸 중심에서 무기 쥔 손까지

// ── 전설·신화 고유 장식 ── phase: back(몸 뒤) / mid(몸 위, 눈 아래) / front(맨 위)
// 모자를 대신하는 장식이 있으면 모자를 빼고 그린다.
export const HERO_NO_HAT = new Set(['blizzard', 'lastsurvivor']);

function poly(ctx, pts, fill, lw = 2) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (const [x, y] of pts.slice(1)) ctx.lineTo(x, y);
  ctx.closePath();
  fillStroke(ctx, fill, lw);
}

function star(ctx, x, y, r, fill) {
  const pts = [];
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 5;
    const rad = k % 2 ? r * 0.45 : r;
    pts.push([x + Math.cos(a) * rad, y + Math.sin(a) * rad]);
  }
  poly(ctx, pts, fill, 1);
}


// ── 전설·신화 옷 ── 몸은 그대로 동그라미(말랑함 유지), 옷은 몸 모양을 따라 감싼다.
// phase: back(망토 등 몸 뒤) / body(몸 위에 입히는 옷, 어깨 장식, 깃)
const OUTFIT = {
  laser: { // 스펙트럼 나이트: 은빛 흉갑 + 금 장식 + 파란 망토
    cape: ['#2f5fd0', '#ffd84a'], coat: '#c9d3de', inner: '#3a5a8a', v: 8, trim: '#e8b923',
    pauldron: ['#d7dfe8', '#e8b923'], belt: ['#6b4a26', '#ffd84a'], ridge: true,
  },
  mortar: { // 그라운드 브레이커: 리벳 박힌 전투 조끼 + 큰 어깨 갑옷
    coat: '#7a6a45', inner: '#4a3a22', v: 6, pauldron: ['#5a4a30', '#c9a24a'], big: true,
    belt: ['#3a2a18', '#c9a24a'], rivets: '#c9c2b0', pouches: '#5a4a30',
  },
  rocketeer: { // 크림슨 레인저: 붉은 레인저 재킷 + 높은 깃 + 지퍼
    coat: '#c8202e', inner: '#2a2a2a', v: 10, collar: '#c8202e', zipper: '#d7dde2',
    belt: ['#1e1e24', '#d7dde2'], badge: '#ffd84a',
  },
  tesla: { // 볼트 위버: 회로가 빛나는 기술자 코트
    coat: '#1d2a4a', inner: '#5fe0ff', v: 9, collar: '#1d2a4a', trim: '#5fe0ff', circuit: '#5fe0ff', tails: ['#1d2a4a', '#5fe0ff'],
    belt: ['#11182a', '#5fe0ff'],
  },
  minigunner: { // 리드 스톰: 전술 조끼 + 한쪽 어깨 갑옷
    coat: '#3d4a2c', inner: '#5a3a2a', v: 5, pauldronLeft: ['#2a2a2a', '#7a7a7a'], pockets: '#2f3a22',
    belt: ['#2a2a2a', '#9aa6b2'],
  },
  orbital: { // 제니스: 금 장식 하얀 성기사 로브
    coat: '#f4f4f8', inner: '#c8202e', v: 9, trim: '#e8b923', pauldron: ['#ffd84a', '#ffffff'], gem: '#ff1f1f',
    belt: ['#e8b923', '#ff1f1f'],
  },
  plasma: { // 보이드 랜서: 보랏빛이 흐르는 검은 갑옷 + 가시 어깨 + 망토
    cape: ['#2a1a3a', '#9b30ff'], coat: '#2a1a3a', inner: '#d28aff', v: 8, trim: '#d28aff', spikes: ['#3a2450', '#d28aff'],
    circuit: '#b56dff', belt: ['#1a1024', '#d28aff'],
  },
  blizzard: { // 아이스마스터: 털 깃 달린 얼음 왕실 로브 + 수정 브로치
    cape: ['#2f6fb0', '#ffffff'], coat: '#5fa8e0', inner: '#e8f6ff', v: 9, fur: '#ffffff', brooch: '#bfe9ff', trim: '#ffffff',
  },
  merchant: { // 골든 바론: 검은 연미복 + 나비넥타이 + 금 시계줄
    coat: '#1e1e24', inner: '#ffffff', v: 13, lapel: '#2e2e36', bow: '#d1202e', chain: '#ffd84a',
  },
  lastsurvivor: { // 루나 헌터: 은빛 초승달 걸쇠 망토 + 가죽 벨트
    cape: ['#2a2a3a', '#5a1a2a'], coat: '#2a2a3a', inner: '#8a2a2a', v: 14, clasp: '#d7dde2', belt: ['#5a3a22', '#d7dde2'],
  },
};
export const OUTFIT_IDS = Object.keys(OUTFIT);

function clothGrad(ctx, c, y0 = BY, y1 = BY + R) {
  const g = ctx.createLinearGradient(-R, y0, R * 0.6, y1);
  g.addColorStop(0, shade(c, 0.28));
  g.addColorStop(0.5, c);
  g.addColorStop(1, shade(c, -0.3));
  return g;
}

function softShape(ctx, fill, stroke, lw = 1.8) {
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = lw;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = stroke;
  ctx.stroke();
}

function heroOutfit(ctx, id, phase) {
  const o = OUTFIT[id];
  if (!o) return;
  if (phase === 'back') {
    if (o.tails) { // 코트 자락 두 갈래
      const [c, edge] = o.tails;
      for (const sx of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(sx * 6, BY + 10); ctx.lineTo(sx * 22, BY + 26); ctx.lineTo(sx * 12, BY + 24); ctx.lineTo(sx * 3, BY + 18); ctx.closePath();
        softShape(ctx, clothGrad(ctx, c, BY + 10, BY + 26), edge, 1.6);
      }
    }
    if (o.cape) {
      const [c, lining] = o.cape;
      // 왼쪽 뒤로 살짝 휘날리는 망토
      ctx.beginPath();
      ctx.moveTo(-15, BY - 8);
      ctx.quadraticCurveTo(-36, BY + 6, -34, BY + 25);
      ctx.lineTo(-24, BY + 21); ctx.lineTo(-16, BY + 27); ctx.lineTo(-6, BY + 22);
      ctx.lineTo(16, BY + 24);
      ctx.quadraticCurveTo(24, BY + 6, 15, BY - 8);
      ctx.closePath();
      softShape(ctx, clothGrad(ctx, c, BY - 8, BY + 26), shade(c, -0.6), 2);
      // 안감이 보이는 자락
      ctx.beginPath();
      ctx.moveTo(-34, BY + 25); ctx.lineTo(-24, BY + 21); ctx.lineTo(-28, BY + 12); ctx.closePath();
      softShape(ctx, lining, shade(lining, -0.55), 1.4);
    }
    return;
  }
  // ── 몸 위 옷: 몸 동그라미 안으로만 그린다 ──
  ctx.save();
  ctx.beginPath(); ctx.arc(0, BY, R - 1.2, 0, Math.PI * 2); ctx.clip();
  const top = BY + 5; // 옷 윗선(눈 아래로 여유를 둔다)
  // 안쪽 셔츠(V 사이로 보이는 부분)
  ctx.fillStyle = o.inner;
  ctx.fillRect(-8, top, 16, o.v + 2);
  // 겉옷: V자로 열린 앞섶
  ctx.beginPath();
  ctx.moveTo(-R - 2, top); ctx.lineTo(-7, top); ctx.lineTo(0, top + o.v); ctx.lineTo(7, top); ctx.lineTo(R + 2, top);
  ctx.lineTo(R + 2, BY + R + 2); ctx.lineTo(-R - 2, BY + R + 2); ctx.closePath();
  softShape(ctx, clothGrad(ctx, o.coat), shade(o.coat, -0.6), 1.8);
  // 옷깃(라펠)
  if (o.lapel) {
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sx * 7, top); ctx.lineTo(sx * 1, top + o.v); ctx.lineTo(sx * 5, top + o.v - 2); ctx.lineTo(sx * 12, top + 3); ctx.closePath();
      softShape(ctx, o.lapel, '#0e0e12', 1.2);
    }
  }
  if (o.trim) { // V선 장식
    ctx.strokeStyle = o.trim; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(-7, top + 0.8); ctx.lineTo(0, top + o.v + 0.8); ctx.lineTo(7, top + 0.8); ctx.stroke();
  }
  if (o.ridge) { // 흉갑 가운데 능선 + 반사
    ctx.strokeStyle = shade(o.coat, -0.35); ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(0, top + o.v); ctx.lineTo(0, BY + R); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.beginPath(); ctx.ellipse(-10, top + 8, 4, 2, -0.5, 0, Math.PI * 2); ctx.fill();
  }
  if (o.zipper) {
    ctx.strokeStyle = o.zipper; ctx.lineWidth = 1.4; ctx.setLineDash([1.6, 1.4]);
    ctx.beginPath(); ctx.moveTo(0, top + o.v); ctx.lineTo(0, BY + R); ctx.stroke();
    ctx.setLineDash([]);
  }
  if (o.circuit) { // 빛나는 회로 선(가만히 있음)
    ctx.strokeStyle = o.circuit; ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(-15, top + 6); ctx.lineTo(-9, top + 6); ctx.lineTo(-6, top + 10); ctx.lineTo(-6, BY + 18);
    ctx.moveTo(15, top + 6); ctx.lineTo(9, top + 6); ctx.lineTo(6, top + 10); ctx.lineTo(6, BY + 18);
    ctx.stroke();
    ctx.fillStyle = o.circuit;
    for (const [cx, cy] of [[-15, top + 6], [15, top + 6], [-6, BY + 18], [6, BY + 18]]) {
      ctx.beginPath(); ctx.arc(cx, cy, 1.4, 0, Math.PI * 2); ctx.fill();
    }
  }
  if (o.rivets) {
    ctx.fillStyle = o.rivets;
    for (const [rx, ry] of [[-14, top + 5], [-10, top + 9], [14, top + 5], [10, top + 9]]) {
      ctx.beginPath(); ctx.arc(rx, ry, 1.2, 0, Math.PI * 2); ctx.fill();
    }
  }
  if (o.pockets) {
    for (const px of [-11, 5]) { rr(ctx, px, top + 9, 6, 5, 1.2); softShape(ctx, o.pockets, shade(o.pockets, -0.5), 1); }
    ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-12, top); ctx.lineTo(-12, BY + R); ctx.moveTo(12, top); ctx.lineTo(12, BY + R); ctx.stroke();
  }
  if (o.belt) {
    const [bc, buckle] = o.belt;
    const by = BY + 15;
    ctx.fillStyle = bc; ctx.fillRect(-R, by, R * 2, 3.6);
    if (o.pouches) for (const px of [-13, 9]) { rr(ctx, px, by - 1, 5, 6, 1); softShape(ctx, o.pouches, shade(o.pouches, -0.5), 1); }
    rr(ctx, -2.8, by - 0.8, 5.6, 5.2, 1.2); softShape(ctx, buckle, shade(buckle, -0.55), 1);
  }
  if (o.chain) { // 금 시계줄
    ctx.strokeStyle = o.chain; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(-12, top + 9); ctx.quadraticCurveTo(-6, top + 14, -1, top + 11); ctx.stroke();
  }
  ctx.restore();

  // ── 몸 밖으로 나오는 것들 ──
  if (o.collar) { // 높이 세운 깃
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sx * 6, top + 1); ctx.lineTo(sx * 16, top - 6); ctx.lineTo(sx * 17, top + 2); ctx.lineTo(sx * 10, top + 5); ctx.closePath();
      softShape(ctx, clothGrad(ctx, o.collar), shade(o.collar, -0.6), 1.6);
    }
  }
  if (o.fur) { // 복슬복슬한 털 깃
    for (let k = -4; k <= 4; k++) {
      const x = k * 4.2;
      const y = top + 1.5 + Math.abs(k) * 0.5;
      ctx.beginPath(); ctx.arc(x, y, 3.3, 0, Math.PI * 2); softShape(ctx, o.fur, '#a9c6dc', 1);
    }
  }
  const pauldron = (side, [c, trim], big) => {
    ctx.save();
    ctx.translate(side * (big ? 18 : 17), top + 2);
    ctx.rotate(side * 0.45);
    ctx.beginPath(); ctx.ellipse(0, 0, big ? 10 : 8.5, big ? 7.5 : 6, 0, Math.PI, 0); ctx.closePath();
    const g = ctx.createLinearGradient(-8, -7, 8, 2);
    g.addColorStop(0, shade(c, 0.4)); g.addColorStop(1, shade(c, -0.25));
    softShape(ctx, g, shade(c, -0.6), 1.8);
    ctx.strokeStyle = trim; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.ellipse(0, 0, big ? 8 : 6.6, big ? 5.6 : 4.4, 0, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
    ctx.restore();
  };
  if (o.pauldron) { pauldron(-1, o.pauldron, o.big); pauldron(1, o.pauldron, o.big); }
  if (o.pauldronLeft) pauldron(-1, o.pauldronLeft, true);
  if (o.spikes) {
    const [c, glow] = o.spikes;
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sx * 10, top + 4); ctx.lineTo(sx * 26, top - 6); ctx.lineTo(sx * 21, top + 2); ctx.lineTo(sx * 25, top + 6); ctx.lineTo(sx * 15, top + 8); ctx.closePath();
      softShape(ctx, clothGrad(ctx, c), glow, 1.6);
    }
  }
  if (o.badge) star(ctx, -10, top + 7, 3.6, o.badge);
  if (o.gem) {
    ctx.beginPath(); ctx.moveTo(0, top + o.v - 4); ctx.lineTo(3.4, top + o.v); ctx.lineTo(0, top + o.v + 4); ctx.lineTo(-3.4, top + o.v); ctx.closePath();
    softShape(ctx, o.gem, shade(o.gem, -0.55), 1.2);
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.arc(-1, top + o.v - 1.2, 1, 0, Math.PI * 2); ctx.fill();
  }
  if (o.brooch) {
    ctx.beginPath(); ctx.moveTo(0, top + 2); ctx.lineTo(4, top + 7); ctx.lineTo(0, top + 12); ctx.lineTo(-4, top + 7); ctx.closePath();
    softShape(ctx, o.brooch, '#5fa8e0', 1.4);
    ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.arc(-1, top + 5.5, 1.1, 0, Math.PI * 2); ctx.fill();
  }
  if (o.bow) { // 나비넥타이(V 안쪽 흰 셔츠 위)
    const ty = top + 5;
    ctx.beginPath(); ctx.moveTo(0, ty); ctx.lineTo(-5, ty - 3); ctx.lineTo(-5, ty + 3); ctx.closePath(); softShape(ctx, o.bow, shade(o.bow, -0.55), 1);
    ctx.beginPath(); ctx.moveTo(0, ty); ctx.lineTo(5, ty - 3); ctx.lineTo(5, ty + 3); ctx.closePath(); softShape(ctx, o.bow, shade(o.bow, -0.55), 1);
    ctx.beginPath(); ctx.arc(0, ty, 1.5, 0, Math.PI * 2); softShape(ctx, shade(o.bow, -0.2), shade(o.bow, -0.55), 1);
  }
  if (o.clasp) { // 초승달 걸쇠
    ctx.fillStyle = o.clasp; ctx.beginPath(); ctx.arc(0, top + 3, 3.6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = o.coat; ctx.beginPath(); ctx.arc(1.7, top + 2, 3.1, 0, Math.PI * 2); ctx.fill();
  }
}

// 옷을 입으면 겹치는 기존 장식은 뺀다
const MID_SKIP_WITH_OUTFIT = new Set(['rocketeer', 'plasma', 'blizzard']);

function heroDeco(ctx, id, phase, outfitOn = false) {
  if (outfitOn && phase === 'mid' && MID_SKIP_WITH_OUTFIT.has(id)) return;
  if (outfitOn && phase === 'back' && id === 'lastsurvivor') return; // 큰 망토가 대신함
  const top = BY - R; // 머리 꼭대기
  switch (id) {
    case 'laser': // 스펙트럼 나이트: 무지개 깃털 장식
      if (phase === 'front') {
        // 투구 꼭대기에서 부채꼴로 솟은 깃털 4개
        ['#ff7d91', '#ffd84a', '#9be15d', '#9fd4ff'].forEach((c, k) => {
          ctx.save();
          ctx.translate(0, top - 6);
          ctx.rotate(-0.75 + k * 0.42);
          ctx.beginPath(); ctx.ellipse(0, -13, 4.2, 12, 0, 0, Math.PI * 2); fillStroke(ctx, c, 1.4);
          ctx.restore();
        });
        ctx.beginPath(); ctx.arc(0, top - 6, 4, 0, Math.PI * 2); fillStroke(ctx, '#d7dde2', 1.4);
      }
      break;
    case 'mortar': // 그라운드 브레이커: 뿔 투구
      if (phase === 'front') {
        poly(ctx, [[-15, top - 6], [-30, top - 24], [-23, top]], '#e8dcc0');
        poly(ctx, [[15, top - 6], [30, top - 24], [23, top]], '#e8dcc0');
      }
      break;
    case 'rocketeer': // 크림슨 레인저: 휘날리는 붉은 목도리 + 별
      if (phase === 'back') {
        poly(ctx, [[-6, BY + 8], [-30, BY + 2], [-38, BY + 10], [-28, BY + 12], [-36, BY + 20], [-8, BY + 16]], '#e5414f');
      }
      if (phase === 'mid') {
        rr(ctx, -16, BY + 7, 32, 7, 3.5); fillStroke(ctx, '#e5414f');
        star(ctx, 0, BY + 15, 5, '#ffd84a');
      }
      break;
    case 'tesla': // 볼트 위버: 머리 위 코일 두 개 + 번개 문양
      if (phase === 'front') {
        for (const x of [-9, 9]) {
          ctx.strokeStyle = DARK; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(x, top - 8); ctx.lineTo(x * 1.25, top - 20); ctx.stroke();
          ctx.beginPath(); ctx.arc(x * 1.25, top - 23, 4.5, 0, Math.PI * 2); fillStroke(ctx, '#9fd4ff', 1.5);
        }
      }
      if (phase === 'mid') poly(ctx, [[3, BY + 6], [-4, BY + 14], [0, BY + 14], [-3, BY + 20], [5, BY + 11], [1, BY + 11]], '#ffd84a', 1.2);
      break;
    case 'minigunner': // 리드 스톰: 몸을 가로지르는 탄띠
      if (phase === 'mid') {
        ctx.save();
        ctx.beginPath(); ctx.arc(0, BY, R - 1, 0, Math.PI * 2); ctx.clip();
        ctx.strokeStyle = '#6b4a26'; ctx.lineWidth = 7;
        ctx.beginPath(); ctx.moveTo(-R, BY + 2); ctx.lineTo(R, BY + 20); ctx.stroke();
        for (let k = 0; k < 5; k++) {
          const x = -14 + k * 7;
          const y = BY + 2 + ((x + R) * 18) / (2 * R);
          rr(ctx, x - 1.8, y - 4, 3.6, 7, 1.5); fillStroke(ctx, '#ffc83d', 1);
        }
        ctx.restore();
      }
      break;
    case 'orbital': // 제니스: 하얀 날개 + 후광
      if (phase === 'back') {
        for (const sx of [-1, 1]) {
          ctx.save(); ctx.scale(sx, 1);
          poly(ctx, [[14, BY - 6], [38, BY - 22], [42, BY - 12], [36, BY - 4], [38, BY + 4], [16, BY + 6]], '#f4f4f8');
          ctx.restore();
        }
      }
      if (phase === 'front') {
        ctx.lineWidth = 3.5; ctx.strokeStyle = '#ffd84a';
        ctx.beginPath(); ctx.ellipse(0, top - 17, 13, 3.6, 0, 0, Math.PI * 2); ctx.stroke();
      }
      break;
    case 'plasma': // 보이드 랜서: 뒤로 뻗은 보라 뿔 + 별
      if (phase === 'front') {
        poly(ctx, [[-11, top - 6], [-30, top - 22], [-18, top - 1]], '#d28aff');
        poly(ctx, [[11, top - 6], [30, top - 22], [18, top - 1]], '#d28aff');
      }
      if (phase === 'mid') star(ctx, 0, BY + 13, 5, '#d28aff');
      break;
    case 'blizzard': // 아이스마스터: 얼음 왕관 + 눈꽃
      if (phase === 'front') {
        const pts = [[-17, top + 7], [-18, top - 6], [-11, top + 1], [-6, top - 15], [0, top - 2], [6, top - 15], [11, top + 1], [18, top - 6], [17, top + 7]];
        poly(ctx, pts, '#bfe9ff');
        ctx.fillStyle = '#5fb4ff';
        ctx.beginPath(); ctx.arc(0, top + 3, 2.6, 0, Math.PI * 2); ctx.fill();
      }
      if (phase === 'mid') {
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.8;
        for (let k = 0; k < 3; k++) {
          const a = (k * Math.PI) / 3;
          ctx.beginPath(); ctx.moveTo(Math.cos(a) * 5.5, BY + 13 + Math.sin(a) * 5.5); ctx.lineTo(-Math.cos(a) * 5.5, BY + 13 - Math.sin(a) * 5.5); ctx.stroke();
        }
      }
      break;
    case 'merchant': // 골든 바론: 외눈 안경 + 콧수염
      if (phase === 'front') {
        ctx.lineWidth = 2.2; ctx.strokeStyle = '#b3861a';
        ctx.beginPath(); ctx.arc(9, BY - 3, 7.2, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(15, BY + 1); ctx.quadraticCurveTo(19, BY + 10, 14, BY + 17); ctx.stroke();
        ctx.fillStyle = '#4a3020';
        ctx.beginPath(); ctx.ellipse(-3, BY + 5.5, 5.5, 2.4, -0.3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(7, BY + 5.5, 5.5, 2.4, 0.3, 0, Math.PI * 2); ctx.fill();
      }
      break;
    case 'lastsurvivor': // 루나 헌터: 후드 + 초승달 + 뒤로 날리는 망토 끝
      if (phase === 'back') {
        poly(ctx, [[-8, BY + 10], [-34, BY + 16], [-28, BY + 24], [-8, BY + 19]], '#2a2a3a');
      }
      if (phase === 'mid') {
        ctx.beginPath();
        ctx.arc(0, BY, R + 2.5, Math.PI * 0.95, Math.PI * 2.05);
        ctx.quadraticCurveTo(0, BY - 16, -(R + 2.5) * Math.cos(Math.PI * 0.05), BY + (R + 2.5) * Math.sin(Math.PI * 0.05));
        ctx.closePath();
        fillStroke(ctx, '#2a2a3a');
        ctx.fillStyle = '#ffe08a';
        ctx.beginPath(); ctx.arc(0, top + 7, 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#2a2a3a';
        ctx.beginPath(); ctx.arc(2.6, top + 5.5, 4.4, 0, Math.PI * 2); ctx.fill();
      }
      break;
    default: break;
  }
}

// part: 'all' | 'body'(무기 빼고)
export function drawPerson(ctx, x, y, s, o, part = 'all') {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  let aim = o.aim ?? 0;
  if (Math.cos(aim) < 0) {
    ctx.scale(-1, 1);
    aim = Math.PI - aim;
  }
  if (o.glow) {
    const gc = hex(o.glow);
    const g = ctx.createRadialGradient(0, BY, R * 0.8, 0, BY, 40);
    g.addColorStop(0, rgba(gc, 0.55));
    g.addColorStop(1, rgba(gc, 0));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, BY, 40, 0, Math.PI * 2); ctx.fill();
    // 신화는 주변에 작은 반짝이(가만히 있음, 깜빡이지 않음)
    if (o.sparkle) {
      for (const [sx, sy, sr] of [[-30, BY - 16, 3.2], [31, BY - 8, 2.6], [-26, BY + 14, 2.2], [27, BY + 16, 3]]) {
        ctx.fillStyle = shade(gc, 0.6);
        ctx.beginPath();
        ctx.moveTo(sx, sy - sr * 1.8); ctx.quadraticCurveTo(sx, sy, sx + sr * 1.8, sy);
        ctx.quadraticCurveTo(sx, sy, sx, sy + sr * 1.8); ctx.quadraticCurveTo(sx, sy, sx - sr * 1.8, sy);
        ctx.quadraticCurveTo(sx, sy, sx, sy - sr * 1.8); ctx.fill();
      }
    }
  }
  // 부드러운 그림자
  const sh = ctx.createRadialGradient(0, 0, 2, 0, 0, 20);
  sh.addColorStop(0, 'rgba(0,0,0,0.38)');
  sh.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save(); ctx.scale(1, 0.3); ctx.fillStyle = sh;
  ctx.beginPath(); ctx.arc(0, 0, 20, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  // 화염방사기 연료통(등 뒤)
  if (o.gun === 'flame') { rr(ctx, -27, -36, 11, 22, 4); fillStroke(ctx, '#e2701f'); }
  if (o.hero && o.outfit) heroOutfit(ctx, o.hero, 'back');
  if (o.hero) heroDeco(ctx, o.hero, 'back', o.outfit);
  const body = o.zombie ? o.skin : o.shirt;
  const edge = shade(body, -0.6);
  // 작은 발 두 개
  for (const fx of [-8, 8]) {
    ctx.beginPath(); ctx.ellipse(fx, -2.5, 6, 4, 0, 0, Math.PI * 2); fillStroke(ctx, shade(body, -0.35), 2, edge);
  }
  // 몸(동그라미): 왼쪽 위에서 빛을 받는 그라데이션
  const grad = ctx.createRadialGradient(-7, BY - 9, 2, 0, BY, R * 1.25);
  grad.addColorStop(0, shade(body, 0.38));
  grad.addColorStop(0.55, body);
  grad.addColorStop(1, shade(body, -0.28));
  ctx.beginPath(); ctx.arc(0, BY, R, 0, Math.PI * 2);
  ctx.fillStyle = grad; ctx.fill();
  ctx.lineWidth = 2.6; ctx.strokeStyle = edge; ctx.stroke();
  // 아래쪽 반사광(테두리 안쪽에 밝은 띠)
  ctx.strokeStyle = rgba(shade(body, 0.5), 0.45); ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.arc(0, BY, R - 3, Math.PI * 0.15, Math.PI * 0.6); ctx.stroke();
  // 반짝이는 하이라이트
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.beginPath(); ctx.ellipse(-9, BY - 11, 5.5, 3, -0.7, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.beginPath(); ctx.arc(-13.5, BY - 5, 1.4, 0, Math.PI * 2); ctx.fill();
  if (o.zombie) { // 옷 조각
    ctx.save();
    ctx.beginPath(); ctx.arc(0, BY, R - 1.2, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = o.shirt;
    ctx.beginPath(); ctx.moveTo(-R, BY + 8); ctx.lineTo(-6, BY + 5); ctx.lineTo(0, BY + 10); ctx.lineTo(7, BY + 5); ctx.lineTo(R, BY + 8); ctx.lineTo(R, 0); ctx.lineTo(-R, 0); ctx.fill();
    ctx.restore();
  }
  if (o.hero && o.outfit) heroOutfit(ctx, o.hero, 'body');
  if (o.hero) heroDeco(ctx, o.hero, 'mid', o.outfit);
  // 하얀 동그라미 눈 두 개(바라보는 쪽으로 살짝 치우침)
  const ex = 2;
  const eyes = o.zombie ? [[-7 + ex, BY - 3, 5.8], [7.5 + ex, BY - 1.5, 4.6]] : [[-7 + ex, BY - 3, 5.5], [7 + ex, BY - 3, 5.5]];
  for (const [ex_, ey, er] of eyes) {
    // 눈 아래 살짝 그늘 → 눈이 몸 위에 떠 보이게
    ctx.fillStyle = rgba(edge, 0.25);
    ctx.beginPath(); ctx.arc(ex_ + 0.6, ey + 1.4, er + 0.4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(ex_, ey, er + 0.3, 0, Math.PI * 2); fillStroke(ctx, '#ffffff', 1.5, edge);
  }
  // 모자
  if (!o.zombie) {
    // 모자는 눈 위(머리 꼭대기)에 얹는다
    const k = 1.15;
    ctx.save();
    ctx.translate(0, BY);
    ctx.scale(k, k);
    ctx.translate(0, 46 - 13 / k + 4);
    if (!(o.hero && HERO_NO_HAT.has(o.hero))) hat(ctx, o.hatStyle, o.hat);
    ctx.restore();
    if (o.hero) heroDeco(ctx, o.hero, 'front');
  }
  // 손 + 무기 / 좀비는 앞으로 뻗은 짧은 팔
  if (o.zombie) {
    rr(ctx, 12, BY + 1, 15, 8, 4); fillStroke(ctx, shade(o.skin, -0.08), 2, edge);
  } else if (part === 'all') {
    ctx.save();
    ctx.translate(HAND.x, BY + HAND.y);
    ctx.rotate(o.gun === 'bag' ? 0 : Math.max(-1.2, Math.min(1.2, aim)));
    weapon(ctx, o.gun, o.medic);
    hand(ctx, o.shirt);
    ctx.restore();
  }
  ctx.restore();
}

function hand(ctx, color) {
  ctx.beginPath(); ctx.arc(4, 1, 4.8, 0, Math.PI * 2); fillStroke(ctx, color, 2);
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.beginPath(); ctx.arc(2.6, -0.6, 1.5, 0, Math.PI * 2); ctx.fill();
}

// withHero: 전설·신화 고유 장식(날개, 후광, 왕관 등)을 붙일지
// withOutfit: 전설·신화 옷(지금은 목업에서만 켬)
export function allyLook(a, withHero = true, withOutfit = false) {
  return {
    hero: withHero && a.hero ? a.id : null,
    outfit: withOutfit && a.hero,
    shirt: hex(a.look.shirt), pants: '#3a3f4a', skin: SKIN, hair: '#4a3020',
    hat: a.look.hat, hatStyle: HAT_STYLE[a.id] || 'cap', gun: a.look.gun, glow: a.look.glow,
    medic: a.id === 'medic',
    sparkle: a.tier >= 5,
  };
}

export const ZOMBIE_LOOK = {
  walker: { shirt: '#58677a', skin: '#8fb07a', pants: '#3a3a44', s: 1 },
  runner: { shirt: '#b86b3a', skin: '#9fc283', pants: '#3a3a44', s: 0.9 },
  brute: { shirt: '#6a5a8a', skin: '#86a672', pants: '#3a3a44', s: 1.5 },
  spitter: { shirt: '#6d7a3a', skin: '#b4c95a', pants: '#3a3a44', s: 1 },
  boss: { shirt: '#3f4a5c', skin: '#7d9a68', pants: '#2a2a34', s: 2.4 },
};

// 무기 + 손만. (x, y) = 손(회전 중심), 오른쪽을 향함.
export function drawWeapon(ctx, x, y, s, o) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  weapon(ctx, o.gun, o.medic);
  hand(ctx, o.shirt);
  ctx.restore();
}
