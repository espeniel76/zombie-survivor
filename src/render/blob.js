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
    // ── 영웅 소품 ──
    case 'fork': // 소리굽쇠
      box(1, -1.6, 11, 3.2, '#9aa6b2');
      box(10, -6.5, 3.4, 13, '#d7dde2');
      box(12, -6.5, 14, 3, '#d7dde2');
      box(12, 3.5, 14, 3, '#d7dde2');
      break;
    case 'magnet': // 손에 든 말굽 자석(오른쪽으로 벌어짐)
      ctx.strokeStyle = '#3a0e12'; ctx.lineWidth = 8.5;
      ctx.beginPath(); ctx.arc(12, 0, 7, Math.PI * 0.5, Math.PI * 1.5); ctx.stroke();
      ctx.strokeStyle = '#d8323c'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(12, 0, 7, Math.PI * 0.5, Math.PI * 1.5); ctx.stroke();
      box(12, -10, 8, 6, '#d7dde2');
      box(12, 4, 8, 6, '#d7dde2');
      break;
    case 'bomb': // 광대 폭탄
      ctx.strokeStyle = '#8a6436'; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.moveTo(18, -6); ctx.quadraticCurveTo(21, -12, 25, -11); ctx.stroke();
      ctx.fillStyle = '#ffb347'; ctx.beginPath(); ctx.arc(25.5, -11, 2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(15, 0, 7.5, 0, Math.PI * 2); fillStroke(ctx, '#2a2f45', 1.8);
      ctx.fillStyle = '#ff7ad1'; ctx.fillRect(8, -1.4, 14, 2.8);
      ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.arc(12.5, -3, 1.8, 0, Math.PI * 2); ctx.fill();
      break;
    case 'orb': { // 작은 블랙홀 구슬
      const g2 = ctx.createRadialGradient(16, 0, 1, 16, 0, 8);
      g2.addColorStop(0, '#000000'); g2.addColorStop(0.7, '#3a2a7a'); g2.addColorStop(1, '#8a6cff');
      ctx.beginPath(); ctx.arc(16, 0, 8, 0, Math.PI * 2); ctx.fillStyle = g2; ctx.fill();
      ctx.strokeStyle = '#c9b8ff'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.ellipse(16, 0, 13, 3.4, -0.35, 0, Math.PI * 2); ctx.stroke();
      break;
    }
    case 'scroll': // 계약서 두루마리 + 붉은 봉인
      box(6, -7, 16, 14, '#efe2c0');
      box(4, -8, 4, 16, '#d9c49a');
      box(20, -8, 4, 16, '#d9c49a');
      ctx.strokeStyle = 'rgba(90,60,30,0.6)'; ctx.lineWidth = 1;
      for (const y of [-3, 0, 3]) { ctx.beginPath(); ctx.moveTo(9, y); ctx.lineTo(18, y); ctx.stroke(); }
      ctx.beginPath(); ctx.arc(17, 4.5, 2.6, 0, Math.PI * 2); fillStroke(ctx, '#c8202e', 1);
      break;
    case 'cross': // 손에 든 작은 조종대
      box(4, -1.6, 20, 3.2, '#8a6436');
      box(12, -8, 3.2, 16, '#8a6436');
      ctx.strokeStyle = 'rgba(232,200,255,0.9)'; ctx.lineWidth = 0.9;
      for (const x of [5, 23]) { ctx.beginPath(); ctx.moveTo(x, 1.6); ctx.lineTo(x, 14); ctx.stroke(); }
      break;
    case 'watch': // 회중시계
      ctx.strokeStyle = '#c9a24a'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(3, 1); ctx.quadraticCurveTo(7, 7, 10, 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(16, 0, 7.5, 0, Math.PI * 2); fillStroke(ctx, '#e8b923', 1.6);
      ctx.beginPath(); ctx.arc(16, 0, 5.4, 0, Math.PI * 2); fillStroke(ctx, '#fff8e8', 1);
      ctx.strokeStyle = '#1f2a30'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(16, 0); ctx.lineTo(16, -4); ctx.moveTo(16, 0); ctx.lineTo(19, 1); ctx.stroke();
      break;
    case 'talisman': // 부적
      box(6, -8, 12, 16, '#f2d24a');
      ctx.strokeStyle = '#c8202e'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(9, -5); ctx.lineTo(15, -5); ctx.moveTo(12, -6); ctx.lineTo(12, 5); ctx.moveTo(9, 0); ctx.lineTo(15, 3); ctx.stroke();
      break;
    case 'broom': // 마녀 빗자루
      box(-6, -1.5, 26, 3, '#8a6436');
      ctx.beginPath(); ctx.moveTo(18, -2); ctx.lineTo(32, -7); ctx.lineTo(33, 7); ctx.lineTo(18, 2); ctx.closePath(); fillStroke(ctx, '#d9b25a', 1.4);
      ctx.fillStyle = '#6b4a26'; ctx.fillRect(17, -3, 3, 6);
      break;
    case 'mirror': // 손거울
      box(2, -1.6, 9, 3.2, '#c9a24a');
      ctx.beginPath(); ctx.ellipse(17, 0, 7, 8.5, 0, 0, Math.PI * 2); fillStroke(ctx, '#c9a24a', 1.6);
      ctx.beginPath(); ctx.ellipse(17, 0, 5, 6.5, 0, 0, Math.PI * 2); fillStroke(ctx, '#d8f4ff', 1);
      ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fillRect(15, -4, 1.6, 5);
      break;
    case 'wand': // 별 지팡이
      box(2, -1.3, 16, 2.6, '#f2f2f2');
      star(ctx, 21, 0, 6, '#ffe08a');
      break;
    case 'dice': // 주사위 두 개
      for (const [x, y, n] of [[6, -8, 5], [15, -1, 6]]) {
        rr(ctx, x, y, 9, 9, 2); fillStroke(ctx, '#ffffff', 1.4);
        ctx.fillStyle = '#1a1a20';
        const dots = n === 5 ? [[2.2, 2.2], [6.8, 2.2], [4.5, 4.5], [2.2, 6.8], [6.8, 6.8]] : [[2.4, 2], [6.6, 2], [2.4, 4.5], [6.6, 4.5], [2.4, 7], [6.6, 7]];
        for (const [dx, dy] of dots) { ctx.beginPath(); ctx.arc(x + dx, y + dy, 0.9, 0, Math.PI * 2); ctx.fill(); }
      }
      break;
    case 'jar': { // 영혼 병
      box(10, -10, 8, 3, '#8a6436');
      ctx.beginPath(); ctx.ellipse(14, 0, 7, 8, 0, 0, Math.PI * 2); fillStroke(ctx, 'rgba(200,255,235,0.55)', 1.6);
      ctx.fillStyle = '#9fffd0';
      for (const [x, y, r] of [[12, 2, 2.2], [16, -2, 1.6], [15, 4, 1.4]]) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
      break;
    }
    case 'horn': // 용을 부르는 뿔피리
      ctx.beginPath(); ctx.moveTo(4, -2); ctx.quadraticCurveTo(16, -6, 26, -12); ctx.lineTo(29, -4); ctx.quadraticCurveTo(16, 2, 4, 2); ctx.closePath();
      fillStroke(ctx, '#e8dcc0', 1.6);
      ctx.fillStyle = '#c9a24a'; ctx.fillRect(12, -4, 2.4, 6);
      break;
    case 'shield': // 뱀 문양 둥근 돌 방패
      ctx.beginPath(); ctx.arc(14, 0, 10, 0, Math.PI * 2); fillStroke(ctx, '#9a9690', 2);
      ctx.strokeStyle = '#c9a24a'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(14, 0, 7.5, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = '#2f5a24'; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.moveTo(10, 4); ctx.quadraticCurveTo(18, 2, 12, -1); ctx.quadraticCurveTo(8, -4, 17, -5); ctx.stroke();
      break;
    case 'axe': // 처형인의 큰 도끼
      box(-8, -1.8, 32, 3.6, '#5a3a22');
      ctx.beginPath(); ctx.moveTo(19, -2); ctx.lineTo(22, -13); ctx.quadraticCurveTo(38, -10, 37, 7); ctx.lineTo(22, 4); ctx.closePath();
      fillStroke(ctx, '#c0c8d0', 1.6);
      ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(24, -11); ctx.quadraticCurveTo(36, -8, 35, 5); ctx.stroke();
      break;
    case 'scepter': { // 그림자 군주의 홀
      box(-6, -1.6, 24, 3.2, '#2a1a3a');
      ctx.strokeStyle = '#3a2450'; ctx.lineWidth = 2.6;
      ctx.beginPath(); ctx.arc(24, 0, 8, Math.PI * 0.6, Math.PI * 1.4, true); ctx.stroke();
      const g2 = ctx.createRadialGradient(24, 0, 1, 24, 0, 6);
      g2.addColorStop(0, '#120a1a'); g2.addColorStop(1, '#8a5cff');
      ctx.beginPath(); ctx.arc(24, 0, 6, 0, Math.PI * 2); ctx.fillStyle = g2; ctx.fill();
      ctx.lineWidth = 1.4; ctx.strokeStyle = '#d8c8ff'; ctx.stroke();
      break;
    }
    case 'flamesword': // 불사조 기사의 불꽃 검
      box(2, -6, 3.4, 12, '#8a5a20');
      box(-3, -1.6, 6, 3.2, '#5a3a14');
      box(5, -2.4, 22, 4.8, '#ffe08a');
      ctx.beginPath(); ctx.moveTo(26, -3); ctx.quadraticCurveTo(34, -6, 36, 0); ctx.quadraticCurveTo(33, 4, 26, 3); ctx.closePath();
      fillStroke(ctx, '#ff8a2a', 1.2);
      ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillRect(8, -1.6, 16, 1.2);
      break;
    case 'fan': // 접부채
      for (let k = 0; k < 6; k++) {
        const a = -0.9 + k * 0.36;
        ctx.beginPath(); ctx.moveTo(4, 0); ctx.lineTo(4 + Math.cos(a) * 22, Math.sin(a) * 22); ctx.lineTo(4 + Math.cos(a + 0.36) * 22, Math.sin(a + 0.36) * 22); ctx.closePath();
        fillStroke(ctx, k % 2 ? '#d7eef8' : '#ffffff', 1);
      }
      break;
    case 'lantern': // 초록 불빛 등불
      ctx.strokeStyle = '#3a3f45'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(15, -8, 4, Math.PI, 0); ctx.stroke();
      box(9, -8, 12, 3, '#3a3f45');
      box(10, -5, 10, 11, '#7fdc4a');
      box(9, 6, 12, 3, '#3a3f45');
      ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fillRect(12, -3, 2, 6);
      break;
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

// ── 전설·신화 영웅 그림 ── 몸은 말랑한 동그라미 그대로, 옷·소품·장식으로 저마다 다르게.
// phase: back(몸 뒤) / mid(몸 위, 눈 아래) / front(맨 위: 머리 장식)
export const HERO_NO_HAT = new Set(); // 영웅은 모자 대신 각자 머리 장식을 쓴다

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

function circle(ctx, x, y, r, fill, lw = 1.6) {
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); fillStroke(ctx, fill, lw);
}

function glint(ctx, x, y, r = 1.4) {
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
}

// 옷 설정
const OUTFIT = {
  echo: { coat: '#1f6f68', inner: '#7fffd4', v: 9, trim: '#7fffd4', collar: '#1f6f68', belt: ['#123f3b', '#7fffd4'], waves: '#7fffd4' },
  wisp: { coat: '#f2efe6', inner: '#1d2440', v: 10, ribbon: '#2f7fd0', hem: '#d8d4c8' },
  magnetist: { split: ['#d8323c', '#2f6fd0'], inner: '#d7dde2', v: 8, trim: '#ffffff', belt: ['#2a2a2a', '#d7dde2'] },
  clown: { coat: '#f4f4f4', inner: '#ff4d6a', v: 6, diamonds: ['#ff4d6a', '#4aa3ff', '#ffd84a'], ruff: '#ffffff', buttons: '#ff4d6a' },
  swamp: { coat: '#3a4a22', inner: '#6a5a3a', v: 8, hem: '#2a3a18', belt: ['#8a6436', '#c9a24a'] },
  gravity: { coat: '#22184a', inner: '#8a6cff', v: 10, trim: '#c9b8ff', stars: '#c9b8ff', cape: ['#22184a', '#8a6cff'] },
  demon: { coat: '#1a0e12', inner: '#ff1f1f', v: 12, lapel: '#2a1218', tie: '#ff1f1f' },
  puppeteer: { stripes: ['#3a1a4a', '#6a3a7a'], inner: '#ffffff', v: 9, bow: '#d28aff', buttons: '#ffd84a' },
  timethief: { coat: '#173a46', inner: '#5fe0ff', v: 9, gears: '#c9a24a', chain: '#ffd84a', collar: '#173a46', tails: ['#173a46', '#c9a24a'] },
  plague: { coat: '#1a1d22', inner: '#3a3f45', v: 6, collar: '#1a1d22', belt: ['#5a3a22', '#c9a24a'], cape: ['#1a1d22', '#3a3f45'] },
  mirror: { coat: '#c9d3de', inner: '#5a7aa0', v: 8, ridge: true, trim: '#e8f4ff', pauldron: ['#d7dfe8', '#9fd4ff'], cape: ['#3a5a8a', '#bfe9ff'] },
  dream: { stripes: ['#f2a8d8', '#fff0f8'], inner: '#ffffff', v: 6, buttons: '#ffd84a' },
  gambler: { coat: '#1f3a2a', inner: '#ffffff', v: 12, bow: '#d1202e', suits: true, chain: '#ffd84a' },
  executioner: { coat: '#4a3426', inner: '#1c1c22', v: 6, belt: ['#2a1a12', '#9aa6b2'], pauldron: ['#5a5f68', '#9aa6b2'], rivets: true },
  souls: { coat: '#1e2a2a', inner: '#9fffd0', v: 10, trim: '#9fffd0', hem: '#121a1a', cape: ['#1e2a2a', '#3a6a5a'] },
  dragon: { coat: '#8a1a20', inner: '#ffc860', v: 7, scales: '#c8323c', belt: ['#3a1a10', '#ffc860'] },
  stone: { coat: '#f0ead8', inner: '#6a7a5a', v: 5, trim: '#c9a24a', sash: '#c9a24a' },
  shadowlord: { coat: '#1a1424', inner: '#8a5cff', v: 10, trim: '#8a5cff', collar: '#1a1424', cape: ['#120c1a', '#5a2a8a'] },
  phoenix: { coat: '#c8401a', inner: '#ffd84a', v: 8, ridge: true, trim: '#ffd84a', pauldron: ['#e8b923', '#ffd84a'], belt: ['#5a2a10', '#ffd84a'] },
  tornado: { coat: '#6a4a30', inner: '#d7eef8', v: 8, zipper: '#d7dde2', fur: '#f0e8d8' },
  emperor: { coat: '#1a1020', inner: '#9a3aff', v: 11, trim: '#d8b84a', lapel: '#2a1830', cape: ['#120a18', '#6a1a8a'] },
  goldlord: { coat: '#c8961a', inner: '#fff3c0', v: 10, trim: '#fff3c0', belt: ['#8a6410', '#fff3c0'], cape: ['#8a6410', '#ffd84a'] },
  guardian: { coat: '#e8c040', inner: '#ffffff', v: 9, ridge: true, trim: '#fff6c8', pauldron: ['#ffe680', '#fff6c8'], cape: ['#fff3c0', '#e8b923'] },
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
    if (o.cape) { // 왼쪽 뒤로 휘날리는 망토
      const [c, lining] = o.cape;
      ctx.beginPath();
      ctx.moveTo(-15, BY - 8);
      ctx.quadraticCurveTo(-36, BY + 6, -34, BY + 25);
      ctx.lineTo(-24, BY + 21); ctx.lineTo(-16, BY + 27); ctx.lineTo(-6, BY + 22);
      ctx.lineTo(16, BY + 24);
      ctx.quadraticCurveTo(24, BY + 6, 15, BY - 8);
      ctx.closePath();
      softShape(ctx, clothGrad(ctx, c, BY - 8, BY + 26), shade(c, -0.6), 2);
      ctx.beginPath();
      ctx.moveTo(-34, BY + 25); ctx.lineTo(-24, BY + 21); ctx.lineTo(-28, BY + 12); ctx.closePath();
      softShape(ctx, lining, shade(lining, -0.55), 1.4);
    }
    return;
  }
  const top = BY + 5; // 옷 윗선(눈 아래로 여유)
  ctx.save();
  ctx.beginPath(); ctx.arc(0, BY, R - 1.2, 0, Math.PI * 2); ctx.clip();
  const coatPath = () => {
    ctx.beginPath();
    ctx.moveTo(-R - 2, top); ctx.lineTo(-7, top); ctx.lineTo(0, top + o.v); ctx.lineTo(7, top); ctx.lineTo(R + 2, top);
    ctx.lineTo(R + 2, BY + R + 2); ctx.lineTo(-R - 2, BY + R + 2); ctx.closePath();
  };
  if (o.apron) {
    // 앞치마: 가슴받이 + 주머니 + 어깨끈
    rr(ctx, -10, top + 1, 20, 22, 4); softShape(ctx, clothGrad(ctx, o.apron), shade(o.apron, -0.55), 1.6);
    ctx.strokeStyle = shade(o.apron, -0.2); ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(-9, top + 2); ctx.lineTo(-16, top - 3); ctx.moveTo(9, top + 2); ctx.lineTo(16, top - 3); ctx.stroke();
    rr(ctx, -6, top + 9, 12, 7, 2); softShape(ctx, shade(o.apron, 0.15), shade(o.apron, -0.55), 1.2);
    ctx.fillStyle = '#9aa6b2'; ctx.fillRect(2, top + 4, 2, 6); // 꽂아 둔 모종삽
  } else {
    ctx.fillStyle = o.inner;
    ctx.fillRect(-8, top, 16, o.v + 2);
    if (o.split) {
      ctx.save(); coatPath(); ctx.clip();
      ctx.fillStyle = clothGrad(ctx, o.split[0]); ctx.fillRect(-R - 2, top, R + 2, R + 4);
      ctx.fillStyle = clothGrad(ctx, o.split[1]); ctx.fillRect(0, top, R + 2, R + 4);
      ctx.restore();
      coatPath(); ctx.lineWidth = 1.6; ctx.strokeStyle = '#1a1a22'; ctx.stroke();
    } else if (o.stripes) {
      ctx.save(); coatPath(); ctx.clip();
      for (let k = -6; k < 6; k++) { ctx.fillStyle = o.stripes[(k + 6) % 2]; ctx.fillRect(k * 4, top, 4, R + 4); }
      ctx.restore();
      coatPath(); ctx.lineWidth = 1.6; ctx.strokeStyle = shade(o.stripes[0], -0.6); ctx.stroke();
    } else {
      coatPath(); softShape(ctx, clothGrad(ctx, o.coat), shade(o.coat, -0.6), 1.8);
    }
  }
  if (o.lapel) {
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sx * 7, top); ctx.lineTo(sx * 1, top + o.v); ctx.lineTo(sx * 5, top + o.v - 2); ctx.lineTo(sx * 12, top + 3); ctx.closePath();
      softShape(ctx, o.lapel, '#0e0e12', 1.2);
    }
  }
  if (o.tie) { // 길게 늘어진 넥타이
    ctx.beginPath(); ctx.moveTo(-2.2, top + 2); ctx.lineTo(2.2, top + 2); ctx.lineTo(3, top + 14); ctx.lineTo(0, top + 17); ctx.lineTo(-3, top + 14); ctx.closePath();
    softShape(ctx, o.tie, shade(o.tie, -0.55), 1.1);
  }
  if (o.trim && o.v) {
    ctx.strokeStyle = o.trim; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(-7, top + 0.8); ctx.lineTo(0, top + o.v + 0.8); ctx.lineTo(7, top + 0.8); ctx.stroke();
  }
  if (o.zipper) {
    ctx.strokeStyle = o.zipper; ctx.lineWidth = 1.4; ctx.setLineDash([1.6, 1.4]);
    ctx.beginPath(); ctx.moveTo(0, top + o.v); ctx.lineTo(0, BY + R); ctx.stroke();
    ctx.setLineDash([]);
  }
  if (o.waves) { // 옷자락에 퍼지는 물결
    ctx.strokeStyle = o.waves; ctx.lineWidth = 1.2;
    for (const k of [0, 1]) { ctx.beginPath(); ctx.arc(0, BY + R + 4, 10 + k * 5, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); }
  }
  if (o.diamonds) {
    let n = 0;
    for (let y = top + 5; y < BY + R; y += 7) {
      for (let x = -15 + ((y / 7) % 2) * 3.5; x < 16; x += 9) {
        ctx.fillStyle = o.diamonds[n++ % 3];
        ctx.beginPath(); ctx.moveTo(x, y - 3); ctx.lineTo(x + 2.6, y); ctx.lineTo(x, y + 3); ctx.lineTo(x - 2.6, y); ctx.closePath(); ctx.fill();
      }
    }
  }
  if (o.stars) {
    ctx.fillStyle = o.stars;
    for (const [x, y, r] of [[-12, top + 8, 1], [-6, top + 14, 0.8], [10, top + 9, 1.1], [14, top + 15, 0.8], [4, top + 17, 0.9]]) {
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    star(ctx, -9, top + 11, 2.6, o.stars);
  }
  if (o.gears) {
    for (const [gx, gy, gr] of [[-11, top + 9, 4], [-5, top + 15, 3]]) {
      ctx.fillStyle = o.gears;
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2;
        ctx.fillRect(gx + Math.cos(a) * gr - 0.9, gy + Math.sin(a) * gr - 0.9, 1.8, 1.8);
      }
      ctx.beginPath(); ctx.arc(gx, gy, gr - 0.6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = o.coat; ctx.beginPath(); ctx.arc(gx, gy, gr * 0.35, 0, Math.PI * 2); ctx.fill();
    }
  }
  if (o.buttons) {
    for (const by of [top + o.v + 3, top + o.v + 8]) circle(ctx, 0, by, 1.4, o.buttons, 0.8);
  }
  if (o.pockets) {
    for (const px of [-11, 5]) { rr(ctx, px, top + 9, 6, 5, 1.2); softShape(ctx, o.pockets, shade(o.pockets, -0.5), 1); }
  }
  if (o.ridge) { // 흉갑 능선 + 반사
    ctx.strokeStyle = shade(o.coat, -0.35); ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(0, top + o.v); ctx.lineTo(0, BY + R); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath(); ctx.ellipse(-10, top + 8, 4, 2, -0.5, 0, Math.PI * 2); ctx.fill();
  }
  if (o.hem) { // 너덜너덜한 옷자락
    ctx.fillStyle = o.hem;
    ctx.beginPath(); ctx.moveTo(-R, BY + 14);
    let up = false;
    for (let x = -R; x <= R; x += 4) {
      ctx.lineTo(x, BY + (up ? 12 : 16));
      up = !up;
    }
    ctx.lineTo(R, BY + R); ctx.lineTo(-R, BY + R); ctx.closePath(); ctx.fill();
  }
  if (o.rivets) { // 가죽 조끼의 쇠징
    ctx.fillStyle = '#c0c8d0';
    for (const [x, y] of [[-14, top + 5], [-10, top + 9], [14, top + 5], [10, top + 9], [-12, top + 13], [12, top + 13]]) {
      ctx.beginPath(); ctx.arc(x, y, 1.1, 0, Math.PI * 2); ctx.fill();
    }
  }
  if (o.suits) { // 카드 무늬
    ctx.fillStyle = '#d1202e';
    ctx.beginPath(); ctx.arc(-11, top + 10, 1.8, 0, Math.PI * 2); ctx.arc(-8.6, top + 10, 1.8, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-12.6, top + 10.6); ctx.lineTo(-7, top + 10.6); ctx.lineTo(-9.8, top + 14); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#e8e8e8';
    ctx.beginPath(); ctx.moveTo(10, top + 8); ctx.lineTo(13, top + 11.5); ctx.lineTo(10, top + 15); ctx.lineTo(7, top + 11.5); ctx.closePath(); ctx.fill();
  }
  if (o.patches) { // 덧댄 천 조각 + 바늘땀
    o.patches.forEach((c, k) => {
      const px = k ? 6 : -13;
      const py = top + (k ? 11 : 6);
      ctx.fillStyle = c; ctx.fillRect(px, py, 7, 6);
      ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = 0.8; ctx.setLineDash([1.2, 1.2]);
      ctx.strokeRect(px + 0.8, py + 0.8, 5.4, 4.4); ctx.setLineDash([]);
    });
  }
  if (o.scales) { // 비늘
    ctx.strokeStyle = o.scales; ctx.lineWidth = 1.2;
    for (let y = top + 6; y < BY + R; y += 5) {
      for (let x = -16 + ((y / 5) % 2) * 3; x < 17; x += 6) { ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI); ctx.stroke(); }
    }
  }
  if (o.sash) { // 어깨에서 비스듬히 내려오는 띠
    ctx.strokeStyle = o.sash; ctx.lineWidth = 3.6;
    ctx.beginPath(); ctx.moveTo(-R, top - 2); ctx.lineTo(R, BY + R - 2); ctx.stroke();
  }
  if (o.belt) {
    const [bc, buckle] = o.belt;
    const by = BY + 15;
    ctx.fillStyle = bc; ctx.fillRect(-R, by, R * 2, 3.6);
    rr(ctx, -2.8, by - 0.8, 5.6, 5.2, 1.2); softShape(ctx, buckle, shade(buckle, -0.55), 1);
  }
  if (o.chain) {
    ctx.strokeStyle = o.chain; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(-12, top + 9); ctx.quadraticCurveTo(-6, top + 14, -1, top + 11); ctx.stroke();
  }
  ctx.restore();

  // 몸 밖으로 나오는 것들
  if (o.collar) {
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sx * 6, top + 1); ctx.lineTo(sx * 16, top - 6); ctx.lineTo(sx * 17, top + 2); ctx.lineTo(sx * 10, top + 5); ctx.closePath();
      softShape(ctx, clothGrad(ctx, o.collar), shade(o.collar, -0.6), 1.6);
    }
  }
  if (o.ruff) { // 광대 주름 깃
    for (let k = -4; k <= 4; k++) {
      ctx.beginPath(); ctx.ellipse(k * 4.2, top + 1 + Math.abs(k) * 0.4, 3, 3.8, 0, 0, Math.PI * 2);
      softShape(ctx, k % 2 ? '#ffffff' : '#ffe0ea', '#c9a9b4', 1);
    }
  }
  if (o.ribbon) { // 한복 고름
    ctx.beginPath(); ctx.moveTo(-1, top + 6); ctx.quadraticCurveTo(-8, top + 10, -6, top + 19); ctx.lineTo(-3, top + 18); ctx.quadraticCurveTo(-4, top + 11, 1, top + 8); ctx.closePath();
    softShape(ctx, o.ribbon, shade(o.ribbon, -0.5), 1.1);
    ctx.beginPath(); ctx.moveTo(1, top + 6); ctx.quadraticCurveTo(5, top + 12, 3, top + 16); ctx.lineTo(5.5, top + 16); ctx.quadraticCurveTo(7, top + 11, 2, top + 6); ctx.closePath();
    softShape(ctx, o.ribbon, shade(o.ribbon, -0.5), 1.1);
    circle(ctx, 0, top + 6, 2.2, shade(o.ribbon, 0.2), 1);
  }
  if (o.straw) { // 소매·목에서 삐져나온 지푸라기
    ctx.strokeStyle = o.straw; ctx.lineWidth = 1.6;
    for (const [x0, y0, x1, y1] of [[-18, top + 3, -24, top - 2], [-19, top + 5, -25, top + 4], [18, top + 3, 23, top - 3], [-3, top + 1, -5, top - 4], [3, top + 1, 6, top - 4]]) {
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    }
  }
  if (o.fur) { // 털 달린 깃
    for (let k = -4; k <= 4; k++) circle(ctx, k * 4.2, top + 1.5 + Math.abs(k) * 0.5, 3.3, o.fur, 1);
  }
  if (o.pauldron) {
    const [c, trimC] = o.pauldron;
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.translate(side * 17, top + 2);
      ctx.rotate(side * 0.45);
      ctx.beginPath(); ctx.ellipse(0, 0, 8.5, 6, 0, Math.PI, 0); ctx.closePath();
      const g2 = ctx.createLinearGradient(-8, -7, 8, 2);
      g2.addColorStop(0, shade(c, 0.4)); g2.addColorStop(1, shade(c, -0.25));
      softShape(ctx, g2, shade(c, -0.6), 1.8);
      ctx.strokeStyle = trimC; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.ellipse(0, 0, 6.6, 4.4, 0, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
      ctx.restore();
    }
  }
  if (o.bow) {
    const ty = top + 5;
    ctx.beginPath(); ctx.moveTo(0, ty); ctx.lineTo(-5, ty - 3); ctx.lineTo(-5, ty + 3); ctx.closePath(); softShape(ctx, o.bow, shade(o.bow, -0.55), 1);
    ctx.beginPath(); ctx.moveTo(0, ty); ctx.lineTo(5, ty - 3); ctx.lineTo(5, ty + 3); ctx.closePath(); softShape(ctx, o.bow, shade(o.bow, -0.55), 1);
    circle(ctx, 0, ty, 1.5, shade(o.bow, -0.2), 1);
  }
}

// 머리 장식·소품
function heroDeco(ctx, id, phase) {
  const top = BY - R; // 머리 꼭대기 -44
  switch (id) {
    case 'echo': // 메아리술사: 헤드폰 + 양옆으로 퍼지는 소리 물결
      if (phase === 'front') {
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#123f3b'; ctx.lineWidth = 5.4;
        ctx.beginPath(); ctx.arc(0, BY, R + 3, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
        ctx.strokeStyle = '#2aa198'; ctx.lineWidth = 3.2;
        ctx.beginPath(); ctx.arc(0, BY, R + 3, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
        ctx.lineCap = 'butt';
        for (const sx of [-1, 1]) {
          rr(ctx, sx * (R + 1) - 5, BY - 9, 10, 14, 5); fillStroke(ctx, '#2aa198', 1.8);
          glint(ctx, sx * (R + 1) - 2, BY - 5, 1.6);
          ctx.strokeStyle = 'rgba(127,255,212,0.85)'; ctx.lineWidth = 1.6;
          for (const k of [1, 2]) {
            ctx.beginPath();
            const a0 = sx > 0 ? -0.55 : Math.PI - 0.55;
            ctx.arc(sx * (R + 4), BY - 2, 4 + k * 4, a0, a0 + 1.1);
            ctx.stroke();
          }
        }
      }
      break;
    case 'wisp': // 도깨비불 술사: 검은 갓 + 어깨 위 도깨비불
      if (phase === 'back') {
        for (const [x, y, k] of [[-27, BY - 12, 1], [26, BY - 20, 0.8]]) {
          ctx.fillStyle = 'rgba(111,216,255,0.35)';
          ctx.beginPath(); ctx.arc(x, y + 3 * k, 7 * k, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#6fd8ff';
          ctx.beginPath(); ctx.arc(x, y + 3 * k, 4.4 * k, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.moveTo(x - 4.4 * k, y + 3 * k); ctx.lineTo(x, y - 9 * k); ctx.lineTo(x + 4.4 * k, y + 3 * k); ctx.fill();
          ctx.fillStyle = '#e8fbff'; ctx.beginPath(); ctx.arc(x, y + 3.5 * k, 2 * k, 0, Math.PI * 2); ctx.fill();
        }
      }
      if (phase === 'front') {
        ctx.fillStyle = 'rgba(20,20,26,0.82)';
        ctx.beginPath(); ctx.ellipse(0, top + 7, 30, 6, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#0c0c10'; ctx.lineWidth = 1.6; ctx.stroke();
        rr(ctx, -9, top - 14, 18, 21, 4); fillStroke(ctx, '#1a1a20', 1.6);
        ctx.fillStyle = 'rgba(255,255,255,0.14)'; ctx.fillRect(-6, top - 12, 3, 16);
        ctx.fillStyle = '#d9c49a';
        for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.arc(20 - k * 0.4, top + 10 + k * 4, 1.3, 0, Math.PI * 2); ctx.fill(); }
      }
      break;
    case 'swamp': // 늪지 마녀: 끝이 꺾인 마녀 모자 + 버섯
      if (phase === 'front') {
        ctx.beginPath(); ctx.ellipse(0, top + 7, 27, 6, 0, 0, Math.PI * 2); fillStroke(ctx, '#2f3a1a', 1.8);
        ctx.beginPath(); ctx.moveTo(-12, top + 6); ctx.lineTo(12, top + 6); ctx.lineTo(6, top - 14); ctx.lineTo(16, top - 22); ctx.lineTo(2, top - 18); ctx.closePath();
        fillStroke(ctx, '#3a4a22', 1.8);
        ctx.fillStyle = '#6a5a3a'; ctx.fillRect(-11, top, 22, 3.4);
        ctx.beginPath(); ctx.arc(-14, top + 3, 5, Math.PI, 0); ctx.closePath(); fillStroke(ctx, '#c8202e', 1.2);
        ctx.fillStyle = '#ffffff'; for (const x of [-16, -12.5]) { ctx.beginPath(); ctx.arc(x, top + 1, 0.9, 0, Math.PI * 2); ctx.fill(); }
        ctx.fillStyle = '#efe2c0'; ctx.fillRect(-15, top + 3, 2, 3);
      }
      break;
    case 'magnetist': // 자력술사: 머리 위 말굽 자석 + 자력선
      if (phase === 'front') {
        ctx.strokeStyle = '#3a0e12'; ctx.lineWidth = 10;
        ctx.beginPath(); ctx.arc(0, top - 11, 9, 0, Math.PI); ctx.stroke();
        ctx.strokeStyle = '#d8323c'; ctx.lineWidth = 7;
        ctx.beginPath(); ctx.arc(0, top - 11, 9, 0, Math.PI); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.arc(0, top - 11, 9, Math.PI * 0.55, Math.PI * 0.9); ctx.stroke();
        for (const x of [-12.5, 5.5]) { rr(ctx, x, top - 20, 7, 9, 1.5); fillStroke(ctx, '#d7dde2', 1.6); }
        ctx.strokeStyle = 'rgba(111,168,255,0.85)'; ctx.lineWidth = 1.4;
        for (const k of [0, 1]) { ctx.beginPath(); ctx.arc(0, top - 20, 7 + k * 5, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); }
      }
      break;
    case 'clown': // 폭탄 광대: 줄무늬 고깔모자
      if (phase === 'front') {
        ctx.save();
        ctx.translate(2, top + 6); ctx.rotate(0.18);
        ctx.beginPath(); ctx.moveTo(-11, 0); ctx.lineTo(11, 0); ctx.lineTo(0, -28); ctx.closePath();
        ctx.save(); ctx.clip();
        ['#ff4d6a', '#ffffff', '#4aa3ff', '#ffffff', '#ffd84a', '#ffffff'].forEach((c, k) => { ctx.fillStyle = c; ctx.fillRect(-12, -k * 5 - 5, 24, 5); });
        ctx.restore();
        ctx.beginPath(); ctx.moveTo(-11, 0); ctx.lineTo(11, 0); ctx.lineTo(0, -28); ctx.closePath();
        ctx.lineWidth = 1.8; ctx.strokeStyle = '#5a2a3a'; ctx.stroke();
        circle(ctx, 0, -29, 4, '#ff4d6a', 1.4);
        glint(ctx, -1.2, -30.2, 1.2);
        ctx.restore();
      }
      break;
    case 'gravity': // 중력 조종자: 머리 둘레 고리 + 떠다니는 돌
      if (phase === 'back') {
        ctx.strokeStyle = 'rgba(138,108,255,0.9)'; ctx.lineWidth = 2.6;
        ctx.beginPath(); ctx.ellipse(0, BY - 4, 30, 8, -0.2, Math.PI, Math.PI * 2); ctx.stroke();
      }
      if (phase === 'front') {
        ctx.strokeStyle = 'rgba(138,108,255,0.95)'; ctx.lineWidth = 2.6;
        ctx.beginPath(); ctx.ellipse(0, BY - 4, 30, 8, -0.2, 0, Math.PI); ctx.stroke();
        for (const [x, y, r] of [[-22, top - 6, 4.5], [3, top - 15, 5.5], [24, top - 4, 3.8]]) {
          poly(ctx, [[x - r, y], [x - r * 0.3, y - r], [x + r, y - r * 0.4], [x + r * 0.6, y + r * 0.8], [x - r * 0.6, y + r * 0.7]], '#6a6480', 1.4);
          glint(ctx, x - r * 0.3, y - r * 0.4, 1);
        }
      }
      break;
    case 'demon': // 악마 계약자: 굽은 뿔 + 박쥐 날개 + 꼬리
      if (phase === 'back') {
        for (const sx of [-1, 1]) {
          ctx.save(); ctx.scale(sx, 1);
          poly(ctx, [[12, BY - 4], [34, BY - 22], [40, BY - 8], [33, BY - 6], [36, BY + 2], [28, BY + 1], [26, BY + 8], [14, BY + 6]], '#5a0e18', 1.8);
          ctx.strokeStyle = 'rgba(255,90,90,0.4)'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(14, BY); ctx.lineTo(34, BY - 20); ctx.moveTo(16, BY + 2); ctx.lineTo(33, BY - 5); ctx.stroke();
          ctx.restore();
        }
        ctx.strokeStyle = '#3a0a10'; ctx.lineWidth = 2.6;
        ctx.beginPath(); ctx.moveTo(-10, BY + 16); ctx.quadraticCurveTo(-28, BY + 22, -30, BY + 8); ctx.stroke();
        poly(ctx, [[-30, BY + 2], [-34, BY + 9], [-26, BY + 9]], '#ff1f1f', 1.2);
      }
      if (phase === 'front') {
        for (const sx of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(sx * 7, top + 6);
          ctx.quadraticCurveTo(sx * 13, top - 6, sx * 21, top - 16);
          ctx.quadraticCurveTo(sx * 18, top - 2, sx * 15, top + 7);
          ctx.closePath();
          const g = ctx.createLinearGradient(0, top + 6, 0, top - 16);
          g.addColorStop(0, '#2a1a1e'); g.addColorStop(1, '#ff3a2a');
          softShape(ctx, g, '#120608', 1.6);
        }
      }
      break;
    case 'puppeteer': // 꼭두각시 인형사: 머리 위 조종 십자대 + 늘어진 실
      if (phase === 'front') {
        ctx.strokeStyle = 'rgba(232,200,255,0.85)'; ctx.lineWidth = 1;
        for (const [x0, y0, x1, y1] of [[-15, top - 14, -19, BY + 14], [15, top - 14, 19, BY + 14], [0, top - 22, 0, top - 2]]) {
          ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
        }
        rr(ctx, -17, top - 16, 34, 4.2, 2); fillStroke(ctx, '#8a6436', 1.4);
        rr(ctx, -2.1, top - 26, 4.2, 18, 2); fillStroke(ctx, '#8a6436', 1.4);
        circle(ctx, 0, top - 14, 2, '#d28aff', 1);
        for (const sx of [-1, 1]) circle(ctx, sx * 19, BY + 15, 1.8, '#d28aff', 0.8);
      }
      break;
    case 'timethief': // 시간 도둑: 머리 뒤 커다란 시계
      if (phase === 'back') {
        circle(ctx, -3, BY - 12, 25, '#f4ecd8', 2.6);
        ctx.strokeStyle = '#c9a24a'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(-3, BY - 12, 25, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = '#5a4a30'; ctx.lineWidth = 1.6;
        for (let k = 0; k < 12; k++) {
          const a = (k / 12) * Math.PI * 2;
          ctx.beginPath(); ctx.moveTo(-3 + Math.cos(a) * 21, BY - 12 + Math.sin(a) * 21); ctx.lineTo(-3 + Math.cos(a) * 24, BY - 12 + Math.sin(a) * 24); ctx.stroke();
        }
        ctx.strokeStyle = '#1f2a30'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-3, BY - 12); ctx.lineTo(-3 + 4, BY - 12 - 30); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-3, BY - 12); ctx.lineTo(-3 - 22, BY - 12 - 10); ctx.stroke();
        ctx.lineCap = 'butt';
      }
      if (phase === 'front') { // 외눈 시계 안경
        ctx.strokeStyle = '#c9a24a'; ctx.lineWidth = 2.2;
        ctx.beginPath(); ctx.arc(9, BY - 3, 7.4, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = '#c9a24a';
        for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; ctx.fillRect(9 + Math.cos(a) * 8.6 - 1, BY - 3 + Math.sin(a) * 8.6 - 1, 2, 2); }
      }
      break;
    case 'plague': // 역병 의사: 새부리 가면 + 챙 넓은 모자
      if (phase === 'mid') {
        ctx.beginPath();
        // 앞을 보고 있으니 부리는 눈 아래로 길게 내려온다
        ctx.moveTo(-8, BY + 1); ctx.quadraticCurveTo(2, BY - 2, 12, BY + 1); ctx.quadraticCurveTo(9, BY + 12, 4, BY + 21); ctx.quadraticCurveTo(-3, BY + 11, -8, BY + 1); ctx.closePath();
        const g = ctx.createLinearGradient(-8, BY, 12, BY + 20);
        g.addColorStop(0, '#f2e6c8'); g.addColorStop(1, '#b8a888');
        softShape(ctx, g, '#5a4a30', 1.6);
        ctx.strokeStyle = 'rgba(90,74,48,0.6)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(2, BY + 1); ctx.quadraticCurveTo(4, BY + 10, 4, BY + 19); ctx.stroke();
        ctx.fillStyle = '#5a4a30';
        for (const x of [-2, 7]) { ctx.beginPath(); ctx.arc(x, BY + 4, 0.9, 0, Math.PI * 2); ctx.fill(); }
        ctx.strokeStyle = '#5a3a22'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-R + 2, BY - 6); ctx.lineTo(R - 2, BY - 6); ctx.stroke();
      }
      if (phase === 'front') {
        ctx.beginPath(); ctx.ellipse(0, top + 7, 28, 6, 0, 0, Math.PI * 2); fillStroke(ctx, '#1a1d22', 1.8);
        rr(ctx, -12, top - 13, 24, 21, 3); fillStroke(ctx, '#1a1d22', 1.8);
        ctx.fillStyle = '#5a3a22'; ctx.fillRect(-12, top + 1, 24, 3.4);
        ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(-9, top - 11, 3, 12);
      }
      break;
    case 'mirror': // 거울 기사: 은빛 투구 + 거울 조각 볏
      if (phase === 'front') {
        ctx.beginPath(); ctx.arc(0, top + 8, 18, Math.PI, 0); ctx.closePath(); fillStroke(ctx, '#d7dfe8', 1.8);
        sheen(ctx, 0, top + 8, 18);
        rr(ctx, -19, top + 5, 38, 4.4, 2); fillStroke(ctx, '#9fb8d0', 1.4);
        for (const [x, y, h] of [[-7, top - 10, 9], [0, top - 16, 12], [7, top - 10, 9]]) {
          ctx.beginPath(); ctx.moveTo(x, y - h * 0.6); ctx.lineTo(x + 3.4, y + h * 0.4); ctx.lineTo(x, y + h * 0.7); ctx.lineTo(x - 3.4, y + h * 0.4); ctx.closePath();
          fillStroke(ctx, '#bfe9ff', 1.2);
          glint(ctx, x - 1, y - 1, 1);
        }
      }
      break;
    case 'dream': // 꿈의 요정: 옆으로 처진 잠옷 모자 + 달과 별
      if (phase === 'front') {
        ctx.beginPath(); ctx.moveTo(-15, top + 7); ctx.quadraticCurveTo(-4, top - 22, 14, top - 14); ctx.quadraticCurveTo(22, top - 8, 24, top + 6); ctx.lineTo(15, top + 7); ctx.closePath();
        fillStroke(ctx, '#f2a8d8', 1.8);
        rr(ctx, -17, top + 3, 34, 6, 3); fillStroke(ctx, '#fff0f8', 1.4);
        circle(ctx, 24, top + 8, 4, '#fff0f8', 1.2);
        ctx.fillStyle = '#ffe08a';
        ctx.beginPath(); ctx.arc(-24, top - 6, 6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#10151a'; ctx.globalAlpha = 0.0; ctx.globalAlpha = 1;
        ctx.save(); ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath(); ctx.arc(-21, top - 8, 5, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        star(ctx, 26, top - 12, 3.4, '#ffe08a');
      }
      break;
    case 'gambler': // 운명의 도박사: 에이스 카드 꽂은 중절모
      if (phase === 'front') {
        ctx.beginPath(); ctx.ellipse(0, top + 7, 25, 5.5, -0.05, 0, Math.PI * 2); fillStroke(ctx, '#1a221c', 1.8);
        ctx.beginPath(); ctx.moveTo(-13, top + 6); ctx.lineTo(-11, top - 10); ctx.quadraticCurveTo(0, top - 15, 11, top - 10); ctx.lineTo(13, top + 6); ctx.closePath();
        fillStroke(ctx, '#1a221c', 1.8);
        ctx.fillStyle = '#c9a24a'; ctx.fillRect(-13, top + 1, 26, 3.4);
        ctx.save(); ctx.translate(9, top - 4); ctx.rotate(0.3);
        rr(ctx, -3.5, -6, 7, 10, 1.2); fillStroke(ctx, '#ffffff', 1);
        ctx.fillStyle = '#d1202e'; ctx.font = 'bold 6px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('A', 0, 1);
        ctx.restore();
      }
      break;
    case 'executioner': // 처형인: 끝이 뾰족한 검은 두건(눈 부분은 열려 있다)
      if (phase === 'mid') {
        ctx.beginPath();
        ctx.moveTo(-(R + 2.5), BY + 3);
        ctx.quadraticCurveTo(-(R + 5), top - 1, 0, top - 17);
        ctx.quadraticCurveTo(R + 5, top - 1, R + 2.5, BY + 3);
        ctx.quadraticCurveTo(0, BY - 24, -(R + 2.5), BY + 3);
        ctx.closePath();
        const g = ctx.createLinearGradient(0, top - 17, 0, BY + 3);
        g.addColorStop(0, '#3a3a44'); g.addColorStop(1, '#141418');
        softShape(ctx, g, '#08080a', 1.8);
        ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(-8, top - 6); ctx.quadraticCurveTo(-3, top - 13, 0, top - 15); ctx.stroke();
      }
      break;
    case 'shadowlord': // 그림자 군주: 검은 가시 왕관 + 떠다니는 그림자 조각
      if (phase === 'front') {
        for (const [x, h] of [[-12, 9], [-6, 14], [0, 18], [6, 14], [12, 9]]) {
          poly(ctx, [[x - 3.4, top + 6], [x, top + 6 - h], [x + 3.4, top + 6]], '#2a1a3a', 1.4);
          ctx.fillStyle = '#b48cff'; ctx.beginPath(); ctx.arc(x, top + 6 - h + 2.4, 1.2, 0, Math.PI * 2); ctx.fill();
        }
        rr(ctx, -15, top + 3, 30, 6, 2); fillStroke(ctx, '#3a2450', 1.6);
        circle(ctx, 0, top + 6, 2.4, '#8a5cff', 1);
        for (const [x, y, r] of [[-27, top + 10, 4], [26, top, 3.4]]) {
          poly(ctx, [[x, y - r * 1.6], [x + r, y], [x, y + r * 1.6], [x - r, y]], '#1a1024', 1.2);
          ctx.strokeStyle = 'rgba(138,92,255,0.7)'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(x, y - r * 1.6); ctx.lineTo(x, y + r * 1.6); ctx.stroke();
        }
      }
      break;
    case 'phoenix': // 불사조 기사: 불꽃 볏 금빛 투구 + 불의 날개
      if (phase === 'back') {
        for (const sx of [-1, 1]) {
          ctx.save(); ctx.scale(sx, 1);
          ctx.beginPath();
          ctx.moveTo(12, BY - 2);
          ctx.quadraticCurveTo(30, BY - 30, 44, BY - 24);
          ctx.quadraticCurveTo(36, BY - 16, 42, BY - 10);
          ctx.quadraticCurveTo(32, BY - 6, 38, BY + 2);
          ctx.quadraticCurveTo(26, BY + 2, 16, BY + 8);
          ctx.closePath();
          const g = ctx.createLinearGradient(12, BY, 44, BY - 24);
          g.addColorStop(0, '#ff5a1a'); g.addColorStop(1, '#ffd84a');
          softShape(ctx, g, '#8a2a08', 1.6);
          ctx.restore();
        }
      }
      if (phase === 'front') {
        for (const [x, h, c] of [[-6, 16, '#ff5a1a'], [6, 16, '#ff5a1a'], [0, 22, '#ffb02a']]) {
          ctx.beginPath(); ctx.moveTo(x - 4, top + 2); ctx.quadraticCurveTo(x - 4, top - h * 0.6, x, top - h); ctx.quadraticCurveTo(x + 4, top - h * 0.6, x + 4, top + 2); ctx.closePath();
          fillStroke(ctx, c, 1.3);
        }
        ctx.fillStyle = '#fff0b0'; ctx.beginPath(); ctx.ellipse(0, top - 8, 1.8, 5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(0, top + 9, 18, Math.PI, 0); ctx.closePath(); fillStroke(ctx, '#e8b923', 1.8);
        sheen(ctx, 0, top + 9, 18);
        rr(ctx, -19, top + 6, 38, 4.4, 2); fillStroke(ctx, '#c8901a', 1.4);
        circle(ctx, 0, top + 2, 2.6, '#ff3a2a', 1);
      }
      break;
    case 'souls': // 영혼 수집가: 깊은 후드 + 떠도는 혼불
      if (phase === 'mid') {
        ctx.beginPath();
        ctx.arc(0, BY, R + 2.5, Math.PI * 0.95, Math.PI * 2.05);
        ctx.quadraticCurveTo(0, BY - 16, -(R + 2.5) * Math.cos(Math.PI * 0.05), BY + (R + 2.5) * Math.sin(Math.PI * 0.05));
        ctx.closePath();
        fillStroke(ctx, '#1e2a2a');
        ctx.strokeStyle = '#9fffd0'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(0, BY, R + 1, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
      }
      if (phase === 'front') {
        for (const [x, y, r] of [[-26, top + 2, 3.4], [25, top + 8, 2.8], [18, top - 10, 2.2]]) {
          ctx.fillStyle = 'rgba(159,255,208,0.3)'; ctx.beginPath(); ctx.arc(x, y, r * 2, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#d8fff0'; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
        }
      }
      break;
    case 'dragon': // 용 조련사: 뿔 달린 용 머리 두건
      if (phase === 'front') {
        ctx.beginPath(); ctx.arc(0, top + 9, 18, Math.PI, 0); ctx.closePath(); fillStroke(ctx, '#8a1a20', 1.8);
        sheen(ctx, 0, top + 9, 18);
        for (const sx of [-1, 1]) {
          ctx.beginPath(); ctx.moveTo(sx * 9, top - 4); ctx.quadraticCurveTo(sx * 18, top - 12, sx * 22, top - 20); ctx.quadraticCurveTo(sx * 17, top - 8, sx * 15, top + 1); ctx.closePath();
          fillStroke(ctx, '#ffe08a', 1.4);
        }
        for (const x of [-5, 0, 5]) poly(ctx, [[x - 2.4, top - 7], [x, top - 13], [x + 2.4, top - 7]], '#ffc860', 1);
        ctx.fillStyle = '#ffc860'; ctx.fillRect(-17, top + 6, 34, 3);
      }
      break;
    case 'stone': // 석화의 눈: 꿈틀거리는 뱀 머리카락
      if (phase === 'front') {
        for (const [x0, ang, len] of [[-14, -2.3, 14], [-7, -1.9, 16], [0, -1.57, 17], [7, -1.25, 16], [14, -0.85, 14]]) {
          const y0 = top + 4 + Math.abs(x0) * 0.25;
          ctx.strokeStyle = '#2f5a24'; ctx.lineWidth = 4.6; ctx.lineCap = 'round';
          const pts = [];
          for (let t = 0; t <= 1.001; t += 0.25) {
            const w = Math.sin(t * Math.PI * 2) * 3;
            pts.push([x0 + Math.cos(ang) * len * t + Math.cos(ang + Math.PI / 2) * w, y0 + Math.sin(ang) * len * t + Math.sin(ang + Math.PI / 2) * w]);
          }
          ctx.beginPath(); pts.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
          ctx.strokeStyle = '#6cc24a'; ctx.lineWidth = 2.6;
          ctx.beginPath(); pts.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
          ctx.lineCap = 'butt';
          const [hx, hy] = pts[pts.length - 1];
          circle(ctx, hx, hy, 3, '#6cc24a', 1.2);
          ctx.fillStyle = '#ffd84a'; ctx.beginPath(); ctx.arc(hx + 0.8, hy - 0.6, 0.8, 0, Math.PI * 2); ctx.fill();
        }
      }
      break;
    case 'emperor': // 죽음의 황제: 뾰족한 검은 황관 + 보랏빛 보석
      if (phase === 'front') {
        poly(ctx, [[-15, top + 7], [-17, top - 8], [-9, top - 1], [-4, top - 13], [0, top - 4], [4, top - 13], [9, top - 1], [17, top - 8], [15, top + 7]], '#1a1020', 1.8);
        ctx.strokeStyle = '#d8b84a'; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(-15, top + 4); ctx.lineTo(15, top + 4); ctx.stroke();
        circle(ctx, 0, top, 2.6, '#9a3aff', 1);
        circle(ctx, -9, top + 1, 1.6, '#c9a0ff', 0.8);
        circle(ctx, 9, top + 1, 1.6, '#c9a0ff', 0.8);
      }
      break;
    case 'goldlord': // 영원한 황금의 군주: 금빛 월계관 + 머리 위 금 고리
      if (phase === 'front') {
        for (const sx of [-1, 1]) {
          for (let k = 0; k < 4; k++) {
            const x = sx * (6 + k * 3.6);
            const y = top + 6 - k * 1.2;
            ctx.save(); ctx.translate(x, y); ctx.rotate(sx * (0.5 + k * 0.25));
            ctx.beginPath(); ctx.ellipse(0, -3, 2.2, 4.6, 0, 0, Math.PI * 2); fillStroke(ctx, '#ffd84a', 1.2, '#8a6410');
            ctx.restore();
          }
        }
        ctx.strokeStyle = '#ffe680'; ctx.lineWidth = 2.4;
        ctx.beginPath(); ctx.ellipse(0, top - 9, 11, 3.4, 0, 0, Math.PI * 2); ctx.stroke();
      }
      break;
    case 'guardian': // 영원한 황금의 수호신: 날개 달린 금 투구 + 등 뒤 금빛 후광(가만히 있음)
      if (phase === 'back') {
        ctx.strokeStyle = 'rgba(255,224,102,0.55)'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(0, BY - 6, R + 12, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,246,200,0.5)'; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.arc(0, BY - 6, R + 16, 0, Math.PI * 2); ctx.stroke();
      }
      if (phase === 'front') {
        ctx.beginPath(); ctx.arc(0, BY, R + 1.5, Math.PI * 1.1, Math.PI * 1.9); ctx.lineTo(R * 0.95, BY - 10); ctx.lineTo(-R * 0.95, BY - 10); ctx.closePath();
        fillStroke(ctx, '#e8c040', 2, '#8a6410');
        for (const sx of [-1, 1]) { // 투구 양옆 날개
          ctx.beginPath(); ctx.moveTo(sx * 15, top + 8); ctx.quadraticCurveTo(sx * 30, top - 2, sx * 28, top - 14);
          ctx.quadraticCurveTo(sx * 24, top - 4, sx * 18, top - 2); ctx.quadraticCurveTo(sx * 22, top + 2, sx * 14, top + 4); ctx.closePath();
          fillStroke(ctx, '#fff6c8', 1.6, '#c8961a');
        }
        circle(ctx, 0, top + 4, 2.6, '#ffffff', 1);
      }
      break;
    case 'tornado': // 회오리 술사: 비행 모자 + 이마 위 고글 + 휘날리는 목도리
      if (phase === 'back') {
        poly(ctx, [[-6, BY + 6], [-34, BY - 2], [-30, BY + 6], [-40, BY + 10], [-10, BY + 13]], '#d7eef8', 1.6);
      }
      if (phase === 'front') {
        ctx.beginPath(); ctx.arc(0, top + 9, 18, Math.PI, 0); ctx.closePath(); fillStroke(ctx, '#6a4a30', 1.8);
        sheen(ctx, 0, top + 9, 18);
        for (const sx of [-1, 1]) { rr(ctx, sx * 18 - 3, top + 5, 6, 12, 3); fillStroke(ctx, '#6a4a30', 1.4); }
        rr(ctx, -16, top + 1, 32, 4, 2); fillStroke(ctx, '#2a2a2a', 1.2);
        for (const x of [-7, 7]) {
          circle(ctx, x, top + 2, 5, '#9fd4ff', 1.6);
          glint(ctx, x - 1.6, top + 0.4, 1.3);
        }
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
  // o.legs === false: 그림자와 발은 빼고 몸만(좀비는 발을 따로 그려 걷게 한다, drawLegs)
  if (o.legs !== false) shadowAt(ctx);
  // 걷기(목업용): 발은 땅을 딛고, 몸은 몸 중심을 축으로 출렁이고 기운다(게임의 좀비와 같은 움직임)
  // o.walk = { feet: [[dx, dy], [dx, dy]], dy, rot, sx, sy }
  const w = o.walk;
  const lift = () => {
    if (!w) return;
    ctx.save();
    ctx.translate(0, BY + (w.dy || 0)); ctx.rotate(w.rot || 0); ctx.scale(w.sx || 1, w.sy || 1); ctx.translate(0, -BY);
  };
  const drop = () => { if (w) ctx.restore(); };
  lift();
  // 화염방사기 연료통(등 뒤)
  if (o.gun === 'flame') { rr(ctx, -27, -36, 11, 22, 4); fillStroke(ctx, '#e2701f'); }
  if (o.hero && o.outfit) heroOutfit(ctx, o.hero, 'back');
  if (o.hero) heroDeco(ctx, o.hero, 'back', o.outfit);
  if (o.zombie && o.deco) zombieDeco(ctx, o.deco, 'back');
  const body = o.zombie ? o.skin : o.shirt;
  const edge = shade(body, -0.6);
  // 작은 발 두 개
  drop();
  if (o.legs !== false) feetAt(ctx, body, w ? w.feet : null);
  lift();
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
    if (o.deco) zombieDeco(ctx, o.deco, 'mid');
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
    ctx.beginPath(); ctx.arc(ex_, ey, er + 0.3, 0, Math.PI * 2);
    if (o.hero === 'plague') fillStroke(ctx, '#ffffff', 2.8, '#8a6a2a'); // 고글 테
    else fillStroke(ctx, '#ffffff', 1.5, edge);
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
  drop();
  ctx.restore();
}

// 발밑 그림자
function shadowAt(ctx) {
  const sh = ctx.createRadialGradient(0, 0, 2, 0, 0, 20);
  sh.addColorStop(0, 'rgba(0,0,0,0.38)');
  sh.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save(); ctx.scale(1, 0.3); ctx.fillStyle = sh;
  ctx.beginPath(); ctx.arc(0, 0, 20, 0, Math.PI * 2); ctx.fill(); ctx.restore();
}

// 작은 발 두 개. offs = [[앞뒤, 높이], [앞뒤, 높이]] (걷는 중의 발 위치)
function feetAt(ctx, body, offs) {
  const edge = shade(body, -0.6);
  [-8, 8].forEach((fx, k) => {
    const [ox, oy] = offs ? offs[k] : [0, 0];
    ctx.beginPath(); ctx.ellipse(fx + ox, -2.5 + oy, 6, 4, 0, 0, Math.PI * 2); fillStroke(ctx, shade(body, -0.35), 2, edge);
  });
}

// 좀비의 그림자 + 발만(걷는 그림 한 장면). (x, y) = 발밑, 바라보는 쪽은 오른쪽
export function drawLegs(ctx, x, y, s, o, offs) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  shadowAt(ctx);
  feetAt(ctx, o.zombie ? o.skin : o.shirt, offs);
  ctx.restore();
}

function hand(ctx, color) {
  ctx.beginPath(); ctx.arc(4, 1, 4.8, 0, Math.PI * 2); fillStroke(ctx, color, 2);
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.beginPath(); ctx.arc(2.6, -0.6, 1.5, 0, Math.PI * 2); ctx.fill();
}

// withHero: 전설·신화 고유 장식(날개, 후광, 왕관 등)을 붙일지
// withOutfit: 전설·신화 옷
export function allyLook(a, withHero = true, withOutfit = true) {
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
  // 20웨이브부터
  armored: { shirt: '#4a525c', skin: '#8aa478', pants: '#3a3a44', s: 1.1, deco: 'helmet' },
  splitter: { shirt: '#3e3358', skin: '#a68bc4', pants: '#3a3a44', s: 1.05, deco: 'seam' },
  splitling: { shirt: '#3e3358', skin: '#b9a2d4', pants: '#3a3a44', s: 0.8 },
  healer: { shirt: '#d8dccf', skin: '#8fd2b8', pants: '#3a3a44', s: 1, deco: 'halo' },
  charger: { shirt: '#2a5aa8', skin: '#8f9e6a', pants: '#2a2a34', s: 2.3, deco: 'rider' },
  gravedigger: { shirt: '#e0752a', skin: '#7f9a7a', pants: '#2a2a34', s: 2.3, deco: 'megaphone' },
  ironclad: { shirt: '#5a6440', skin: '#5f6a48', pants: '#2a2a34', s: 2.4, deco: 'bombsuit' },
  rainlord: { shirt: '#9ab4c4', skin: '#5f7466', pants: '#2a2a34', s: 2.8, deco: 'patient' },
  spewer: { shirt: '#d8b830', skin: '#d8c040', pants: '#2a2a34', s: 2.3, deco: 'hazmat' },
  shade: { shirt: '#1f2a44', skin: '#7f9a7a', pants: '#1a1f2a', s: 2.3, deco: 'riot' },
  frostgiant: { shirt: '#b89a5a', skin: '#8fa06a', pants: '#2a2a34', s: 2.4, deco: 'firefighter' },
  drummer: { shirt: '#4f5a3a', skin: '#8fa06a', pants: '#2a2a34', s: 2.4, deco: 'drill' },
  foreman: { shirt: '#e0752a', skin: '#8a9a6a', pants: '#2a2a34', s: 2.5, deco: 'hardhat' },
};

// 새 좀비·거대 좀비의 꾸밈(몸 중심 (0, BY), 반지름 R 기준). layer: 'back'(몸 뒤) | 'mid'(몸 위, 눈 아래)
function zombieDeco(ctx, d, layer) {
  const top = BY - R;
  if (layer === 'back') {
    if (d === 'hazmat') { // 방역복 거인: 등에 멘 약품 통
      rr(ctx, -R - 6, BY - 22, 14, 30, 6); fillStroke(ctx, '#8a9098', 2.2, '#3a3e44');
      ctx.fillStyle = '#c8e04a'; ctx.fillRect(-R - 3, BY - 12, 8, 4);
    }
    if (d === 'rider') { // 배달 기사: 등에 멘 배달통
      rr(ctx, -R - 10, BY - 26, 22, 24, 4); fillStroke(ctx, '#e04a2a', 2.2, '#6a1a10');
      ctx.fillStyle = '#ffffff'; ctx.fillRect(-R - 6, BY - 17, 14, 4);
    }
    if (d === 'patient') { // 최초의 감염자: 굽은 등에 부풀어 오른 몸(매끈한 혹)
      for (const [x, y, r] of [[-R - 1, BY - 1, 10], [R, BY + 3, 8], [-R + 4, BY + 10, 7]]) {
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); fillStroke(ctx, '#4f6256', 2.2, '#26302a');
      }
    }
    return;
  }
  if (d === 'hazmat') { // 방역복: 얼굴 창(눈은 창 안에 보인다) + 호스
    rr(ctx, -15, BY - 13, 30, 17, 8); fillStroke(ctx, 'rgba(30,40,46,0.55)', 2, '#8a7a20');
    ctx.strokeStyle = '#2a2e34'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-R + 2, BY - 2); ctx.quadraticCurveTo(-4, BY + 16, 14, BY + 8); ctx.stroke();
    ctx.fillStyle = '#5a5e64'; ctx.beginPath(); ctx.arc(0, BY + 12, 3, 0, Math.PI * 2); ctx.fill();
  }
  if (d === 'riot') { // 진압 경찰: 남색 헬멧 + 투명 얼굴 가리개
    ctx.beginPath(); ctx.arc(0, BY, R + 2, Math.PI * 1.08, Math.PI * 1.92); ctx.lineTo(R * 0.92, BY - 9); ctx.lineTo(-R * 0.92, BY - 9); ctx.closePath();
    fillStroke(ctx, '#1f2a44', 2.2, '#0c1220');
    rr(ctx, -R + 3, BY - 11, R * 2 - 6, 18, 7); fillStroke(ctx, 'rgba(170,200,230,0.28)', 1.6, 'rgba(200,220,240,0.7)');
    ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.beginPath(); ctx.ellipse(-8, top + 6, 5, 2, -0.4, 0, Math.PI * 2); ctx.fill();
  }
  if (d === 'rider') { // 배달 기사: 오토바이 헬멧(열린 가리개) + 바람막이
    ctx.beginPath(); ctx.arc(0, BY, R + 2.5, Math.PI * 0.98, Math.PI * 2.02); ctx.lineTo(R + 2.5, BY - 7); ctx.lineTo(-R - 2.5, BY - 7); ctx.closePath();
    fillStroke(ctx, '#f2f2f2', 2.2, '#5a5e64');
    ctx.fillStyle = '#d83a3a'; ctx.fillRect(-R + 2, top + 9, R * 2 - 4, 3);
    rr(ctx, -R + 1, BY - 12, R * 2 - 2, 7, 3); fillStroke(ctx, '#2a2e36', 1.6, '#14161a'); // 위로 올린 가리개
    ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.beginPath(); ctx.ellipse(-8, top + 5, 5, 2, -0.4, 0, Math.PI * 2); ctx.fill();
  }

  if (d === 'megaphone') { // 확성기 거인: 형광 조끼 + 모자 + 손에 든 확성기
    ctx.save(); ctx.beginPath(); ctx.arc(0, BY, R - 1.2, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = '#c8ff3a'; ctx.fillRect(-R, BY + 7, R * 2, 3);
    ctx.restore();
    ctx.beginPath(); ctx.ellipse(0, BY - 12, R - 2, 4, 0, 0, Math.PI * 2); fillStroke(ctx, '#2a3a5a', 2);
    ctx.beginPath(); ctx.arc(0, BY - 12, R - 6, Math.PI, Math.PI * 2); ctx.closePath(); fillStroke(ctx, '#2a3a5a', 2);
    ctx.beginPath(); ctx.moveTo(24, BY + 1); ctx.lineTo(36, BY - 6); ctx.lineTo(36, BY + 14); ctx.lineTo(24, BY + 8); ctx.closePath();
    fillStroke(ctx, '#f2f2f2', 2, '#5a5a60');
    ctx.fillStyle = '#d83a3a'; ctx.fillRect(24, BY + 1, 4, 7);
  }
  if (d === 'bombsuit') { // 방폭복: 두꺼운 헬멧 + 넓은 얼굴 창 + 가슴 보호판
    ctx.beginPath(); ctx.arc(0, BY, R + 3, Math.PI * 1.0, Math.PI * 2.0); ctx.lineTo(R + 3, BY - 6); ctx.lineTo(-R - 3, BY - 6); ctx.closePath();
    fillStroke(ctx, '#6a7448', 2.4, '#2c3020');
    rr(ctx, -16, BY - 12, 32, 14, 6); fillStroke(ctx, 'rgba(20,26,20,0.5)', 1.8, '#2c3020');
    rr(ctx, -13, BY + 4, 26, 13, 4); fillStroke(ctx, '#7a8452', 2, '#2c3020');
  }
  if (d === 'firefighter') { // 소방관: 빨간 방화 헬멧 + 반사 띠 방화복
    ctx.save(); ctx.beginPath(); ctx.arc(0, BY, R - 1.2, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = '#e8ec5a'; ctx.fillRect(-R, BY + 8, R * 2, 3);
    ctx.fillStyle = '#d8dde2'; ctx.fillRect(-R, BY + 11, R * 2, 2);
    ctx.restore();
    ctx.beginPath(); ctx.ellipse(0, BY - 9, R + 6, 4.5, 0, 0, Math.PI * 2); fillStroke(ctx, '#c8262a', 2, '#5a0e10');
    ctx.beginPath(); ctx.arc(0, BY - 9, R - 3, Math.PI, Math.PI * 2); ctx.closePath(); fillStroke(ctx, '#c8262a', 2, '#5a0e10');
    rr(ctx, -5, top + 3, 10, 9, 2); fillStroke(ctx, '#f2c230', 1.6, '#8a6a10');
  }
  if (d === 'drill') { // 조교: 각 잡힌 군모 + 목에 건 호루라기
    ctx.beginPath(); ctx.moveTo(-R + 2, BY - 10); ctx.lineTo(-R + 4, top - 3); ctx.lineTo(R - 4, top - 3); ctx.lineTo(R - 2, BY - 10); ctx.closePath();
    fillStroke(ctx, '#4a5634', 2.2, '#22281a');
    ctx.beginPath(); ctx.ellipse(6, BY - 10, R - 2, 4, 0, 0, Math.PI * 2); fillStroke(ctx, '#3e482c', 2, '#22281a'); // 앞 챙
    rr(ctx, -5, top + 2, 10, 7, 1.5); fillStroke(ctx, '#d83a3a', 1.4, '#6a1a1a'); // 모자 앞 붉은 표지
    ctx.strokeStyle = '#d8dde2'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(-6, BY + 1); ctx.lineTo(2, BY + 9); ctx.lineTo(8, BY + 1); ctx.stroke();
    rr(ctx, -1, BY + 8, 8, 5, 2); fillStroke(ctx, '#c8ccd2', 1.4, '#5a5e64');
  }

  if (d === 'patient') { // 최초의 감염자: 환자복 끈 + 머리 붕대 + 손목 이름표
    ctx.strokeStyle = '#7a94a4'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-4, BY + 4); ctx.lineTo(0, BY + 9); ctx.lineTo(4, BY + 4); ctx.stroke();
    ctx.strokeStyle = '#e8e4da'; ctx.lineWidth = 4.5; ctx.beginPath(); ctx.arc(0, BY, R - 3, Math.PI * 1.18, Math.PI * 1.82); ctx.stroke();
    rr(ctx, 20, BY + 2, 6, 7, 1.5); fillStroke(ctx, '#ffffff', 1.4, '#6a6a70');
  }
  if (d === 'helmet') { // 철갑 좀비: 쇠 투구 + 가슴판
    ctx.beginPath(); ctx.arc(0, BY, R + 1.5, Math.PI * 1.1, Math.PI * 1.9); ctx.lineTo(R * 0.95, BY - 10); ctx.lineTo(-R * 0.95, BY - 10); ctx.closePath();
    fillStroke(ctx, '#8d99a6', 2.2, '#3e464f');
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.ellipse(-7, top + 5, 5, 2, -0.4, 0, Math.PI * 2); ctx.fill();
    rr(ctx, -11, BY + 5, 22, 12, 4); fillStroke(ctx, '#7f8b98', 2, '#3e464f');
    ctx.fillStyle = '#c9d2dc'; for (const x of [-6, 6]) { ctx.beginPath(); ctx.arc(x, BY + 11, 1.5, 0, Math.PI * 2); ctx.fill(); }
  }
  if (d === 'seam') { // 분열 좀비: 몸 가운데 갈라진 금
    ctx.save(); ctx.beginPath(); ctx.arc(0, BY, R - 1, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = 'rgba(70,40,110,0.28)'; ctx.fillRect(1, top, R, R * 2);
    ctx.strokeStyle = '#3a2556'; ctx.lineWidth = 2.4; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(1, top); for (let k = 1; k <= 7; k++) ctx.lineTo(k % 2 ? -2.5 : 3, top + k * 6); ctx.stroke();
    ctx.restore();
  }
  if (d === 'halo') { // 치유 좀비: 머리 위 옅은 초록 고리
    ctx.lineWidth = 3.2; ctx.strokeStyle = '#9cffc0';
    ctx.beginPath(); ctx.ellipse(0, top - 7, 12, 4, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 1.2; ctx.strokeStyle = '#3c7a5a';
    ctx.beginPath(); ctx.ellipse(0, top - 7, 14, 5.5, 0, 0, Math.PI * 2); ctx.stroke();
  }
  if (d === 'hardhat') { // 공사장 거인: 노란 안전모 + 형광 띠 작업복
    ctx.save(); ctx.beginPath(); ctx.arc(0, BY, R - 1.2, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = '#d8dde2'; ctx.fillRect(-R, BY + 9, R * 2, 3.2);
    ctx.fillStyle = '#c8ff3a'; ctx.fillRect(-R, BY + 12.2, R * 2, 2);
    ctx.restore();
    ctx.beginPath(); ctx.ellipse(0, BY - 10, R + 4, 3.6, 0, 0, Math.PI * 2); fillStroke(ctx, '#f2c230', 2, '#8a6a10');
    ctx.beginPath(); ctx.arc(0, BY - 10, R - 3, Math.PI, Math.PI * 2); ctx.closePath(); fillStroke(ctx, '#f2c230', 2, '#8a6a10');
    ctx.strokeStyle = '#d8a820'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(0, top + 3); ctx.lineTo(0, BY - 11); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.beginPath(); ctx.ellipse(-8, top + 7, 4, 2, -0.5, 0, Math.PI * 2); ctx.fill();
  }
}

// 무기 + 손만. (x, y) = 손(회전 중심), 오른쪽을 향함.
export function drawWeapon(ctx, x, y, s, o) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  weapon(ctx, o.gun, o.medic);
  hand(ctx, o.shirt);
  ctx.restore();
}
