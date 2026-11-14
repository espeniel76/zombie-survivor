// 그림 파일 없이 모든 그림을 코드로 그려 텍스처로 만든다.
import Phaser from 'phaser';
import { buildCharacterTextures } from '../render/sprites.js';

const DARK = 0x161b20;

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  make_(key, w, h, draw) {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    draw(g, w, h);
    g.generateTexture(key, w, h);
    g.destroy();
  }

  create() {
    performance.mark('boot');
    buildCharacterTextures(this);
    this.drawItems();
    this.drawEffects();
    this.drawShots();
    this.drawGround();
    performance.mark('drawn');
    window.__load?.set(0.95, '거의 다 됐어요');
    this.scene.start('Title');
  }

  drawItems() {
    const coin = (g) => {
      g.fillStyle(0xffc83d, 1);
      g.lineStyle(2, 0x8a6510, 1);
      g.fillCircle(11, 11, 9);
      g.strokeCircle(11, 11, 9);
      g.fillStyle(0xfff0b0, 1);
      g.fillRect(9, 6, 4, 10);
    };
    this.make_('item_coin', 22, 22, coin);
    this.make_('spit', 18, 18, (g) => {
      g.fillStyle(0x9fd13a, 1);
      g.lineStyle(2, 0x4a6a14, 1);
      g.fillCircle(9, 9, 7);
      g.strokeCircle(9, 9, 7);
      g.fillStyle(0xd9f59a, 1);
      g.fillCircle(7, 7, 2);
    });
  }

  drawEffects() {
    const soft = (key, size, color, maxAlpha, steps = 14) =>
      this.make_(key, size, size, (g) => {
        const r = size / 2;
        for (let i = steps; i >= 1; i--) {
          g.fillStyle(color, (maxAlpha / steps) * 1.2);
          g.fillCircle(r, r, (r * i) / steps);
        }
      });
    soft('smoke', 40, 0xb8bfc4, 0.9);
    this.make_('fire', 128, 128, (g) => {
      const colors = [0x8a2a10, 0xc0461a, 0xe2701f, 0xf59a2a, 0xffc54d, 0xffe08a];
      colors.forEach((c, i) => {
        g.fillStyle(c, 0.55);
        g.fillCircle(64, 64, 63 - i * 10);
      });
    });
    this.make_('aura', 256, 256, (g) => {
      g.fillStyle(0x5fb4ff, 0.13);
      g.fillCircle(128, 128, 127);
      g.lineStyle(4, 0x9fd4ff, 0.55);
      g.strokeCircle(128, 128, 124);
      g.lineStyle(2, 0x9fd4ff, 0.35);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        g.beginPath();
        g.arc(128, 128, 104, a, a + 0.35, false);
        g.strokePath();
      }
    });
    this.make_('ring', 64, 64, (g) => {
      g.lineStyle(4, 0xffffff, 1);
      g.strokeCircle(32, 32, 29);
    });
    this.make_('dot', 8, 8, (g) => {
      g.fillStyle(0xffffff, 1);
      g.fillCircle(4, 4, 4);
    });
  }

  // 아군이 쏘는 것들(모두 오른쪽을 향함)
  drawShots() {
    this.make_('bullet', 16, 6, (g) => {
      g.fillStyle(0xffe17a, 1);
      g.fillRoundedRect(0, 0, 16, 6, 3);
      g.fillStyle(0xfff7d6, 1);
      g.fillRoundedRect(8, 1, 7, 3, 1.5);
    });
    this.make_('pellet', 8, 8, (g) => {
      g.fillStyle(0xffd27a, 1);
      g.fillCircle(4, 4, 4);
    });
    this.make_('arrow', 22, 8, (g) => {
      g.lineStyle(2, 0x8a6436, 1);
      g.lineBetween(2, 4, 16, 4);
      g.fillStyle(0xd7dde2, 1);
      g.fillTriangle(15, 0, 22, 4, 15, 8);
      g.fillStyle(0xe5534b, 1);
      g.fillTriangle(0, 1, 5, 4, 0, 7);
    });
    this.make_('pan', 22, 16, (g) => {
      g.fillStyle(0x2a2a2a, 1);
      g.fillCircle(14, 8, 7.5);
      g.fillStyle(0x4a4a4a, 1);
      g.fillCircle(14, 8, 5);
      g.fillStyle(0x6b4a26, 1);
      g.fillRect(0, 6, 8, 4);
    });
    this.make_('brick', 16, 11, (g) => {
      g.fillStyle(0xb5562e, 1);
      g.lineStyle(2, DARK, 1);
      g.fillRect(1, 1, 14, 9);
      g.strokeRect(1, 1, 14, 9);
    });
    this.make_('firework', 18, 10, (g) => {
      g.fillStyle(0xffd27a, 0.6);
      g.fillTriangle(0, 5, 8, 2, 8, 8);
      g.fillStyle(0xff7ad1, 1);
      g.fillRoundedRect(6, 2, 12, 6, 3);
    });
    this.make_('ice', 16, 16, (g) => {
      g.fillStyle(0xbfe9ff, 1);
      g.lineStyle(2, 0x5fa8d0, 1);
      const pts = [[8, 0], [16, 8], [8, 16], [0, 8]].map(([x, y]) => new Phaser.Geom.Point(x, y));
      g.fillPoints(pts, true);
      g.strokePoints(pts, true);
    });
    this.make_('grenade', 14, 14, (g) => {
      g.fillStyle(0x4a5a2a, 1);
      g.lineStyle(2, DARK, 1);
      g.fillCircle(7, 7, 6);
      g.strokeCircle(7, 7, 6);
    });
    this.make_('rocket', 26, 10, (g) => {
      g.fillStyle(0xffb347, 0.7);
      g.fillTriangle(0, 5, 7, 1, 7, 9);
      g.fillStyle(0x9aa6b2, 1);
      g.lineStyle(2, DARK, 1);
      g.fillRoundedRect(6, 1, 16, 8, 3);
      g.strokeRoundedRect(6, 1, 16, 8, 3);
      g.fillStyle(0xe5534b, 1);
      g.fillTriangle(21, 1, 26, 5, 21, 9);
    });
    this.drawHeroShots();
    this.drawMythicSummons();
  }

  // 전설·신화 영웅 전용: 벌, 광대 폭탄, 지옥불, 역병 약병, 가시밭, 중력장
  drawHeroShots() {
    this.make_('wisp', 18, 26, (g) => {
      // 도깨비불: 아래가 둥글고 위로 갈라지는 푸른 불꽃
      g.fillStyle(0x2f7fd0, 0.35);
      g.fillCircle(9, 17, 9);
      g.fillStyle(0x6fd8ff, 1);
      g.fillCircle(9, 17, 6);
      g.fillTriangle(3, 16, 15, 16, 9, 1);
      g.fillTriangle(4, 15, 9, 15, 3, 5);
      g.fillStyle(0xe8fbff, 1);
      g.fillCircle(9, 18, 3);
      g.fillTriangle(7, 17, 11, 17, 9, 8);
    });
    this.make_('bomb', 22, 22, (g) => {
      g.lineStyle(2, 0x8a6436, 1);
      g.beginPath();
      g.moveTo(14, 6);
      g.lineTo(17, 2);
      g.strokePath();
      g.fillStyle(0xffb347, 1);
      g.fillCircle(18, 2, 2);
      g.fillStyle(0x2a2f45, 1);
      g.lineStyle(2, DARK, 1);
      g.fillCircle(10, 12, 8);
      g.strokeCircle(10, 12, 8);
      g.fillStyle(0xff7ad1, 1);
      g.fillRect(3, 10.5, 14, 3);
      g.fillStyle(0xffffff, 0.6);
      g.fillCircle(7, 9, 2);
    });
    this.make_('hellfire', 26, 14, (g) => {
      g.fillStyle(0x7a1020, 0.8);
      g.fillTriangle(0, 7, 14, 1, 14, 13);
      g.fillStyle(0xff3a2a, 1);
      g.fillCircle(17, 7, 6);
      g.fillTriangle(4, 7, 16, 2, 16, 12);
      g.fillStyle(0xffc04a, 1);
      g.fillCircle(18, 7, 3.4);
    });
    this.make_('flask', 14, 18, (g) => {
      g.fillStyle(0xd7dde2, 1);
      g.lineStyle(1.5, DARK, 1);
      g.fillRect(5, 1, 4, 5);
      g.strokeRect(5, 1, 4, 5);
      g.fillStyle(0x7fdc4a, 1);
      g.fillCircle(7, 11, 6);
      g.strokeCircle(7, 11, 6);
      g.fillStyle(0xffffff, 0.6);
      g.fillCircle(5, 9, 1.6);
    });
    this.make_('swamp', 64, 64, (g) => {
      // 늪: 탁한 초록 물웅덩이 + 거품
      g.fillStyle(0x2a3a1a, 0.55);
      g.fillCircle(32, 32, 31);
      g.fillStyle(0x4a6a2a, 0.85);
      g.fillCircle(32, 32, 25);
      g.fillStyle(0x6a8a3a, 0.8);
      g.fillEllipse(26, 28, 26, 16);
      for (const [x, y, r] of [[22, 30, 3], [38, 24, 2.4], [40, 38, 3.4], [28, 40, 2], [34, 32, 1.6]]) {
        g.lineStyle(1.5, 0xb8d890, 0.9);
        g.strokeCircle(x, y, r);
      }
      g.lineStyle(2, 0x2a3a1a, 0.9);
      g.strokeCircle(32, 32, 25);
    });
    this.make_('well', 128, 128, (g) => {
      for (let i = 10; i >= 1; i--) {
        g.fillStyle(i > 6 ? 0x3a2a7a : 0x1a1030, 0.12);
        g.fillCircle(64, 64, i * 6.2);
      }
      // 소용돌이 팔(가만히 그려 두고 이미지가 천천히 돈다)
      for (let arm = 0; arm < 3; arm++) {
        g.lineStyle(3, 0x8a6cff, 0.7);
        g.beginPath();
        for (let t = 0; t <= 1; t += 0.05) {
          const a = arm * ((Math.PI * 2) / 3) + t * 4;
          const r = 8 + t * 52;
          const x = 64 + Math.cos(a) * r;
          const y = 64 + Math.sin(a) * r;
          if (t === 0) g.moveTo(x, y);
          else g.lineTo(x, y);
        }
        g.strokePath();
      }
      g.fillStyle(0x0a0614, 1);
      g.fillCircle(64, 64, 9);
      g.lineStyle(2, 0xc9b8ff, 0.8);
      g.strokeCircle(64, 64, 11);
    });
  }

  // 신화 영웅이 쓰는 것들: 카드, 아기 용, 불사조 깃털, 회오리
  drawMythicSummons() {
    this.make_('card', 14, 18, (g) => {
      g.fillStyle(0xffffff, 1);
      g.lineStyle(1.5, DARK, 1);
      g.fillRoundedRect(1, 1, 12, 16, 2);
      g.strokeRoundedRect(1, 1, 12, 16, 2);
      g.fillStyle(0xd1202e, 1);
      g.fillCircle(5.5, 7.5, 2.2);
      g.fillCircle(8.5, 7.5, 2.2);
      g.fillTriangle(3.4, 8.4, 10.6, 8.4, 7, 12.6);
    });
    this.make_('dragon', 56, 44, (g) => {
      // 오른쪽을 보는 동그란 아기 용
      g.fillStyle(0x9a1a20, 1);
      g.lineStyle(2, DARK, 1);
      g.fillTriangle(16, 18, 4, 4, 26, 12);
      g.strokeTriangle(16, 18, 4, 4, 26, 12);
      g.fillTriangle(22, 16, 18, 0, 34, 12);
      g.strokeTriangle(22, 16, 18, 0, 34, 12);
      g.fillStyle(0xd8323c, 1);
      g.fillTriangle(10, 30, 0, 38, 14, 36);
      g.fillCircle(24, 28, 13);
      g.strokeCircle(24, 28, 13);
      g.fillStyle(0xffc860, 1);
      g.fillEllipse(24, 33, 14, 8);
      g.fillStyle(0xd8323c, 1);
      g.fillCircle(38, 22, 10);
      g.strokeCircle(38, 22, 10);
      g.fillStyle(0xffe08a, 1);
      g.fillTriangle(34, 13, 37, 4, 40, 13);
      g.fillTriangle(40, 14, 45, 6, 45, 16);
      g.fillStyle(0xffffff, 1);
      g.fillCircle(41, 20, 4);
      g.lineStyle(1.5, 0x5a0e12, 1);
      g.strokeCircle(41, 20, 4);
      g.fillStyle(0x5a0e12, 1);
      g.fillCircle(48, 25, 1.2);
    });
    this.make_('feather', 26, 12, (g) => {
      // 불사조 깃털: 불꽃색 깃 + 금빛 깃대
      g.fillStyle(0xff6a2a, 0.5);
      g.fillTriangle(0, 6, 8, 2, 8, 10);
      g.fillStyle(0xff8a3a, 1);
      g.fillEllipse(14, 6, 20, 9);
      g.fillStyle(0xffd84a, 1);
      g.fillEllipse(16, 6, 12, 5);
      g.lineStyle(1.5, 0xfff0b0, 1);
      g.lineBetween(4, 6, 25, 6);
    });
    this.make_('tornado', 70, 96, (g) => {
      const rings = [[35, 88, 8], [34, 76, 13], [36, 62, 18], [33, 46, 23], [36, 30, 28], [35, 14, 32]];
      rings.forEach(([x, y, r], k) => {
        g.fillStyle(0xc8d8e4, 0.28);
        g.fillEllipse(x, y, r * 2, r * 0.7);
        g.lineStyle(2.5, k % 2 ? 0xffffff : 0xa8bccc, 0.85);
        g.strokeEllipse(x, y, r * 2, r * 0.7);
      });
      g.lineStyle(1.5, 0xffffff, 0.6);
      g.beginPath();
      g.moveTo(20, 20);
      g.lineTo(44, 40);
      g.lineTo(26, 58);
      g.lineTo(40, 78);
      g.strokePath();
    });
  }

  // 맵 바닥(화면 한 장 크기). 기지는 가운데(360, 650)에 놓인다.
  // 전설 상자: 몸통·뚜껑을 따로 그려 뚜껑이 열리게. 짙은 붉은 나무 + 금 장식 + 보석 자물쇠, 뒤에 금빛 후광과 빛줄기
  drawChest() {
    const canvas = (key, w, h, draw) => {
      if (this.textures.exists(key)) this.textures.remove(key);
      const t = this.textures.createCanvas(key, w, h);
      draw(t.context, w, h);
      t.refresh();
    };
    const S = 2; // 크게 그려서 줄여 쓰면 선이 부드럽다
    const gold = (ctx, x0, y0, x1, y1) => {
      const g = ctx.createLinearGradient(x0, y0, x1, y1);
      g.addColorStop(0, '#fff3b0'); g.addColorStop(0.35, '#ffd24a'); g.addColorStop(0.7, '#d99a16'); g.addColorStop(1, '#a8700c');
      return g;
    };
    const wood = (ctx, y0, y1) => {
      const g = ctx.createLinearGradient(0, y0, 0, y1);
      g.addColorStop(0, '#a83228'); g.addColorStop(0.5, '#7e1f1c'); g.addColorStop(1, '#4e1012');
      return g;
    };
    const rrect = (ctx, x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); };
    const rivet = (ctx, x, y) => {
      ctx.fillStyle = '#fff3b0'; ctx.beginPath(); ctx.arc(x, y, 2.6 * S, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#a8700c'; ctx.beginPath(); ctx.arc(x + 0.8 * S, y + 0.8 * S, 1.4 * S, 0, Math.PI * 2); ctx.fill();
    };
    const W0 = 180 * S;
    // 몸통
    canvas('chest_base', W0, 110 * S, (ctx) => {
      ctx.scale(S, S);
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(90, 100, 84, 9, 0, 0, Math.PI * 2); ctx.fill();
      rrect(ctx, 14, 8, 152, 88, 10); ctx.fillStyle = wood(ctx, 8, 96); ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = '#2a0a0a'; ctx.stroke();
      ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1.5; // 나뭇결
      for (const y of [30, 52, 74]) { ctx.beginPath(); ctx.moveTo(18, y); ctx.lineTo(162, y); ctx.stroke(); }
      ctx.fillStyle = gold(ctx, 0, 8, 0, 96); // 금 띠(위·아래·양옆)
      rrect(ctx, 12, 6, 156, 12, 5); ctx.fill(); ctx.strokeStyle = '#7a4e08'; ctx.lineWidth = 2; ctx.stroke();
      rrect(ctx, 12, 84, 156, 13, 5); ctx.fill(); ctx.stroke();
      for (const x of [30, 150]) { rrect(ctx, x - 9, 6, 18, 91, 4); ctx.fill(); ctx.stroke(); }
      for (const x of [30, 150]) for (const y of [26, 48, 70]) rivet(ctx, x, y);
      for (const [x, y] of [[22, 12], [158, 12], [22, 90], [158, 90]]) { // 모서리 장식
        ctx.fillStyle = gold(ctx, x - 8, y - 8, x + 8, y + 8);
        ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
      // 자물쇠: 금 방패 + 붉은 보석 + 열쇠 구멍
      ctx.fillStyle = gold(ctx, 72, 0, 108, 50);
      ctx.beginPath(); ctx.moveTo(72, 2); ctx.lineTo(108, 2); ctx.lineTo(108, 30); ctx.quadraticCurveTo(90, 48, 72, 30); ctx.closePath();
      ctx.fill(); ctx.strokeStyle = '#7a4e08'; ctx.lineWidth = 2.4; ctx.stroke();
      const gem = ctx.createRadialGradient(87, 11, 1, 90, 14, 8);
      gem.addColorStop(0, '#ffd0e0'); gem.addColorStop(0.4, '#ff3a6a'); gem.addColorStop(1, '#8a0a2a');
      ctx.fillStyle = gem; ctx.beginPath(); ctx.arc(90, 14, 7, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#7a4e08'; ctx.lineWidth = 1.6; ctx.stroke();
      ctx.fillStyle = '#2a1408'; ctx.beginPath(); ctx.arc(90, 28, 3.2, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(88.6, 28, 2.8, 8);
      ctx.fillStyle = 'rgba(255,255,255,0.18)'; rrect(ctx, 20, 20, 60, 6, 3); ctx.fill(); // 윤기
    });
    // 뚜껑(둥근 지붕)
    canvas('chest_lid', W0, 70 * S, (ctx) => {
      ctx.scale(S, S);
      ctx.beginPath(); ctx.moveTo(10, 66); ctx.lineTo(10, 40); ctx.quadraticCurveTo(10, 4, 90, 4); ctx.quadraticCurveTo(170, 4, 170, 40); ctx.lineTo(170, 66); ctx.closePath();
      ctx.fillStyle = wood(ctx, 4, 66); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#2a0a0a'; ctx.stroke();
      ctx.fillStyle = gold(ctx, 0, 0, 0, 66);
      rrect(ctx, 8, 54, 164, 13, 5); ctx.fill(); ctx.strokeStyle = '#7a4e08'; ctx.lineWidth = 2; ctx.stroke();
      for (const x of [30, 150]) {
        ctx.beginPath(); ctx.moveTo(x - 9, 66); ctx.lineTo(x - 9, x < 90 ? 22 : 22); ctx.quadraticCurveTo(x, 10, x + 9, 22); ctx.lineTo(x + 9, 66); ctx.closePath();
        ctx.fill(); ctx.stroke();
      }
      // 가운데 금 왕관 문양
      ctx.beginPath(); ctx.moveTo(74, 44); ctx.lineTo(76, 26); ctx.lineTo(83, 34); ctx.lineTo(90, 20); ctx.lineTo(97, 34); ctx.lineTo(104, 26); ctx.lineTo(106, 44); ctx.closePath();
      ctx.fill(); ctx.stroke();
      for (const x of [76, 90, 104]) { ctx.fillStyle = '#ff3a6a'; ctx.beginPath(); ctx.arc(x, x === 90 ? 20 : 26, 2.6, 0, Math.PI * 2); ctx.fill(); }
      for (const x of [30, 150]) for (const y of [34, 48]) rivet(ctx, x, y);
      ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.beginPath(); ctx.ellipse(56, 18, 26, 5, -0.15, 0, Math.PI * 2); ctx.fill(); // 윤기
    });
    // 뒤쪽 금빛 후광
    canvas('chest_glow', 320, 320, (ctx) => {
      const g = ctx.createRadialGradient(160, 160, 10, 160, 160, 160);
      g.addColorStop(0, 'rgba(255,224,120,0.75)'); g.addColorStop(0.45, 'rgba(255,196,60,0.25)'); g.addColorStop(1, 'rgba(255,196,60,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 320, 320);
    });
    // 빛줄기(상자가 열릴 때 천천히 돈다)
    canvas('chest_rays', 400, 400, (ctx) => {
      ctx.translate(200, 200);
      for (let k = 0; k < 12; k++) {
        ctx.rotate(Math.PI / 6);
        const g = ctx.createLinearGradient(0, 0, 0, -200);
        g.addColorStop(0, 'rgba(255,236,150,0.55)'); g.addColorStop(1, 'rgba(255,236,150,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(-26, -200); ctx.lineTo(26, -200); ctx.lineTo(6, 0); ctx.closePath(); ctx.fill();
      }
    });
    // 작은 반짝이(가만히 있는 별)
    canvas('chest_star', 24, 24, (ctx) => {
      ctx.fillStyle = '#fff3b0';
      ctx.beginPath(); ctx.moveTo(12, 0); ctx.quadraticCurveTo(12, 12, 24, 12); ctx.quadraticCurveTo(12, 12, 12, 24); ctx.quadraticCurveTo(12, 12, 0, 12); ctx.quadraticCurveTo(12, 12, 12, 0); ctx.fill();
    });
  }

  drawMaps() {
    const CX = 360;
    const CY = 650;
    // 1번째 맵: 텅 빈 사거리 — 기지가 네 길이 만나는 곳 한가운데
    const r = rng(21);
    this.make_('map_road', 720, 1280, (g) => {
      const RW = 170;
      g.fillStyle(0x4d5258, 1); // 보도
      g.fillRect(0, 0, 720, 1280);
      g.lineStyle(2, 0x43484e, 1);
      for (let y = 0; y < 1280; y += 44) g.lineBetween(0, y, 720, y);
      for (let x = 0; x < 720; x += 44) g.lineBetween(x, 0, x, 1280);
      g.fillStyle(0x2c3036, 1); // 차도
      g.fillRect(CX - RW, 0, RW * 2, 1280);
      g.fillRect(0, CY - RW, 720, RW * 2);
      for (let i = 0; i < 40; i++) { // 아스팔트 얼룩
        g.fillStyle(r() < 0.5 ? 0x272b30 : 0x31353b, 0.8);
        const onV = r() < 0.5;
        const x = onV ? CX - RW + r() * RW * 2 : r() * 720;
        const y = onV ? r() * 1280 : CY - RW + r() * RW * 2;
        g.fillEllipse(x, y, 20 + r() * 50, 10 + r() * 24);
      }
      g.lineStyle(6, 0x737980, 1); // 연석
      for (const x of [CX - RW, CX + RW]) { g.lineBetween(x, 0, x, CY - RW); g.lineBetween(x, CY + RW, x, 1280); }
      for (const y of [CY - RW, CY + RW]) { g.lineBetween(0, y, CX - RW, y); g.lineBetween(CX + RW, y, 720, y); }
      const STOP = RW + 80;
      g.lineStyle(3, 0xd8b23a, 0.85); // 노란 중앙선(겹선)
      for (const d of [-4, 4]) {
        g.lineBetween(CX + d, 0, CX + d, CY - STOP); g.lineBetween(CX + d, CY + STOP, CX + d, 1280);
        g.lineBetween(0, CY + d, CX - STOP, CY + d); g.lineBetween(CX + STOP, CY + d, 720, CY + d);
      }
      g.fillStyle(0xdfe3e6, 0.7); // 흰 차선 점선
      for (const x of [CX - RW / 2, CX + RW / 2]) {
        for (let y = 0; y < 1280; y += 70) if (Math.abs(y + 15 - CY) > STOP) g.fillRect(x - 2, y, 4, 34);
      }
      for (const y of [CY - RW / 2, CY + RW / 2]) {
        for (let x = 0; x < 720; x += 70) if (Math.abs(x + 15 - CX) > STOP) g.fillRect(x, y - 2, 34, 4);
      }
      g.fillStyle(0xe6e9ec, 0.75); // 횡단보도
      for (let k = -RW + 14; k < RW - 14; k += 26) {
        g.fillRect(CX + k, CY - RW - 70, 13, 52); g.fillRect(CX + k, CY + RW + 18, 13, 52);
        g.fillRect(CX - RW - 70, CY + k, 52, 13); g.fillRect(CX + RW + 18, CY + k, 52, 13);
      }
      g.lineStyle(2, 0x1f2226, 0.9); // 갈라진 금
      for (let i = 0; i < 14; i++) {
        let x = r() * 720;
        let y = r() * 1280;
        for (let k = 0; k < 4; k++) { const nx = x + (r() - 0.5) * 40; const ny = y + (r() - 0.5) * 40; g.lineBetween(x, y, nx, ny); x = nx; y = ny; }
      }
      for (const [x, y] of [[CX - 110, CY - 330], [CX + 120, CY + 360]]) { // 맨홀
        g.fillStyle(0x3b3f45, 1); g.fillCircle(x, y, 18);
        g.lineStyle(2, 0x23262a, 1); g.strokeCircle(x, y, 18); g.strokeCircle(x, y, 11);
      }
    });
    // 2번째 맵: 폐허 상점가 — 양옆으로 무너진 가게가 늘어선 보행자 거리
    const m = rng(33);
    this.make_('map_mall', 720, 1280, (g) => {
      g.fillStyle(0x5c564f, 1); // 보도블록(벽돌 무늬)
      g.fillRect(0, 0, 720, 1280);
      for (let row = 0; row * 22 < 1280; row++) {
        for (let x = (row % 2) * -22; x < 720; x += 44) {
          g.fillStyle([0x645d55, 0x5a544d, 0x6a625a][Math.floor(m() * 3)], 1);
          g.fillRect(x + 1, row * 22 + 1, 42, 20);
        }
      }
      const SHOP = 112;
      const AWN = 30;
      const awnings = [[0xa8473a, 0xe8ddd0], [0x3a7a5a, 0xe8ddd0], [0x3a5a8a, 0xe8ddd0], [0xb8862a, 0xf0e6d0], [0x6a3a6a, 0xe8ddd0]];
      for (const side of [0, 1]) {
        const x0 = side ? 720 - SHOP : 0;
        g.fillStyle(0x2a2c32, 1); // 가게 지붕
        g.fillRect(x0, 0, SHOP, 1280);
        for (let y = 0, k = 0; y < 1280; y += 170, k++) {
          g.lineStyle(3, 0x1c1d22, 1);
          g.lineBetween(x0, y, x0 + SHOP, y);
          g.fillStyle(0x34363d, 1); // 옥상 환기구
          g.fillRect(x0 + 24 + m() * 40, y + 30 + m() * 80, 26, 26);
          const [c1, c2] = awnings[(k + side * 2) % awnings.length]; // 빛바랜 줄무늬 차양(군데군데 찢김)
          const ax = side ? x0 - AWN : x0 + SHOP;
          for (let s = 0; s < 150; s += 15) {
            if (m() < 0.15) continue;
            g.fillStyle((s / 15) % 2 ? c2 : c1, 0.78);
            g.fillRect(ax, y + 10 + s, AWN, 15);
          }
        }
      }
      for (let i = 0; i < 60; i++) { // 깨진 유리·종이 쓰레기
        const x = 150 + m() * 420;
        const y = m() * 1280;
        if (m() < 0.5) { g.fillStyle(0xbfd8e0, 0.5); g.fillTriangle(x, y, x + 6 + m() * 6, y + 2, x + 2, y + 7); }
        else { g.fillStyle(0xd8d2c4, 0.55); g.fillRect(x, y, 8 + m() * 6, 6 + m() * 4); }
      }
      g.lineStyle(2, 0x3a3631, 0.9); // 갈라진 금
      for (let i = 0; i < 16; i++) {
        let x = 150 + m() * 420;
        let y = m() * 1280;
        for (let k = 0; k < 4; k++) { const nx = x + (m() - 0.5) * 44; const ny = y + (m() - 0.5) * 44; g.lineBetween(x, y, nx, ny); x = nx; y = ny; }
      }
    });
    // 황금 열쇠
    this.make_('item_key', 30, 16, (g) => {
      g.fillStyle(0xffd84a, 1);
      g.lineStyle(2, 0x8a6410, 1);
      g.fillCircle(8, 8, 6.5);
      g.strokeCircle(8, 8, 6.5);
      g.fillStyle(0x8a6410, 1);
      g.fillCircle(8, 8, 2.4);
      g.fillStyle(0xffd84a, 1);
      g.fillRect(13, 6, 15, 4);
      g.strokeRect(13, 6, 15, 4);
      g.fillRect(22, 9, 3, 5);
      g.fillRect(26, 9, 2, 4);
    });
    this.drawChest();
    // 진압 경찰 거인의 방패(투명한 진압 방패)
    this.make_('riotshield', 30, 64, (g) => {
      g.fillStyle(0x9ec8f0, 0.45);
      g.lineStyle(3, 0x2a3a5a, 1);
      g.fillRoundedRect(3, 3, 24, 58, 6);
      g.strokeRoundedRect(3, 3, 24, 58, 6);
      g.fillStyle(0xffffff, 0.4);
      g.fillRect(8, 8, 4, 30);
    });
    // 소방관 거인의 소화기 거품(칸을 덮는다)
    this.make_('foam', 92, 92, (g) => {
      const fr = rng(9);
      g.fillStyle(0xf2f4f6, 0.75);
      g.fillRoundedRect(4, 4, 84, 84, 14);
      for (let i = 0; i < 22; i++) {
        g.fillStyle(0xffffff, 0.9);
        g.fillCircle(10 + fr() * 72, 10 + fr() * 72, 4 + fr() * 9);
      }
    });
    // 장식: 라바콘, 쇼핑 카트, 쓰러진 간판, 자판기, 쓰레기 봉투
    this.make_('prop_cone', 34, 34, (g) => {
      g.fillStyle(0x000000, 0.25); g.fillCircle(19, 19, 14);
      g.fillStyle(0xf07a2a, 1); g.lineStyle(2, DARK, 1); g.fillCircle(17, 17, 13); g.strokeCircle(17, 17, 13);
      g.lineStyle(3, 0xf2f2f2, 1); g.strokeCircle(17, 17, 7);
      g.fillStyle(0xf07a2a, 1); g.fillCircle(17, 17, 3);
    });
    this.make_('prop_cart', 64, 48, (g) => {
      g.fillStyle(0x000000, 0.22); g.fillRect(6, 8, 56, 38);
      g.lineStyle(3, 0x9aa4ae, 1); g.strokeRect(4, 4, 46, 34);
      g.lineStyle(1.5, 0x9aa4ae, 0.8);
      for (let x = 12; x < 50; x += 8) g.lineBetween(x, 4, x, 38);
      for (let y = 12; y < 38; y += 8) g.lineBetween(4, y, 50, y);
      g.lineStyle(4, 0x3a7ac0, 1); g.lineBetween(56, 6, 56, 36); // 손잡이
      g.lineStyle(2, 0x9aa4ae, 1); g.lineBetween(50, 8, 56, 8); g.lineBetween(50, 34, 56, 34);
    });
    this.make_('prop_sign', 110, 44, (g) => {
      g.fillStyle(0x000000, 0.25); g.fillRect(6, 8, 102, 34);
      g.fillStyle(0xc8b43a, 1); g.lineStyle(3, DARK, 1); g.fillRect(2, 2, 100, 32); g.strokeRect(2, 2, 100, 32);
      g.fillStyle(0x3a3a3a, 0.75); // 지워진 글자 자리
      for (const [x, w] of [[14, 14], [34, 18], [58, 12], [76, 16]]) g.fillRect(x, 11, w, 14);
      g.fillStyle(0x8a7a2a, 0.6); g.fillTriangle(70, 2, 102, 2, 102, 22); // 깨진 모서리
    });
    this.make_('prop_vending', 50, 66, (g) => {
      g.fillStyle(0x000000, 0.25); g.fillRect(6, 8, 44, 58);
      g.fillStyle(0xb8323a, 1); g.lineStyle(3, DARK, 1); g.fillRect(2, 2, 42, 58); g.strokeRect(2, 2, 42, 58);
      g.fillStyle(0x9ab8c8, 0.8); g.fillRect(8, 8, 30, 26);
      g.fillStyle(0x2a2a30, 1); g.fillRect(8, 42, 30, 10);
    });
    this.make_('prop_bags', 60, 46, (g) => {
      for (const [x, y, rad] of [[18, 26, 14], [36, 20, 13], [40, 32, 11]]) {
        g.fillStyle(0x000000, 0.2); g.fillCircle(x + 3, y + 3, rad);
        g.fillStyle(0x23252b, 1); g.lineStyle(2, 0x111216, 1); g.fillCircle(x, y, rad); g.strokeCircle(x, y, rad);
        g.fillStyle(0xffffff, 0.12); g.fillCircle(x - rad * 0.35, y - rad * 0.35, rad * 0.3);
      }
    });
  }

  drawGround() {
    const r = rng(7);
    this.make_('ground', 256, 256, (g) => {
      g.fillStyle(0x2a3326, 1);
      g.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 9; i++) {
        g.fillStyle(r() < 0.5 ? 0x263021 : 0x2f392a, 1);
        g.fillCircle(r() * 256, r() * 256, 18 + r() * 30);
      }
      for (let i = 0; i < 220; i++) {
        g.fillStyle([0x33402d, 0x232b1f, 0x3a4632][Math.floor(r() * 3)], 1);
        g.fillRect(Math.floor(r() * 256), Math.floor(r() * 256), 2, 2);
      }
      for (let i = 0; i < 26; i++) {
        const x = r() * 250;
        const y = r() * 250;
        g.lineStyle(2, 0x41553a, 1);
        g.lineBetween(x, y, x - 2, y - 6);
        g.lineBetween(x + 3, y, x + 4, y - 7);
      }
      for (let i = 0; i < 6; i++) {
        g.fillStyle(0x4a4f4c, 1);
        g.fillCircle(r() * 250, r() * 250, 2 + r() * 3);
      }
    });
    this.drawMaps();
    // 맵에 흩어지는 장식(충돌 없음)
    this.make_('prop_car', 120, 64, (g) => {
      g.fillStyle(0x000000, 0.25);
      g.fillRoundedRect(6, 8, 114, 56, 10);
      g.fillStyle(0x6a7a86, 1);
      g.lineStyle(3, DARK, 1);
      g.fillRoundedRect(2, 2, 112, 56, 10);
      g.strokeRoundedRect(2, 2, 112, 56, 10);
      g.fillStyle(0x3b4752, 1);
      g.fillRoundedRect(30, 8, 50, 44, 6);
      g.fillStyle(0x8fb8d0, 0.6);
      g.fillRect(74, 10, 8, 40);
      g.fillRect(28, 10, 6, 40);
    });
    this.make_('prop_barrel', 34, 34, (g) => {
      g.fillStyle(0x000000, 0.25);
      g.fillCircle(19, 19, 15);
      g.fillStyle(0x3f7a4a, 1);
      g.lineStyle(3, DARK, 1);
      g.fillCircle(16, 16, 14);
      g.strokeCircle(16, 16, 14);
      g.lineStyle(2, 0x2c5434, 1);
      g.strokeCircle(16, 16, 9);
    });
    this.make_('prop_crate', 40, 40, (g) => {
      g.fillStyle(0x000000, 0.25);
      g.fillRect(5, 5, 35, 35);
      g.fillStyle(0x9a7444, 1);
      g.lineStyle(3, DARK, 1);
      g.fillRect(2, 2, 34, 34);
      g.strokeRect(2, 2, 34, 34);
      g.lineStyle(3, 0x6b4f2c, 1);
      g.lineBetween(4, 4, 34, 34);
      g.lineBetween(34, 4, 4, 34);
    });
    this.make_('prop_bush', 56, 50, (g) => {
      const rr = rng(3);
      for (let i = 0; i < 6; i++) {
        g.fillStyle(i % 2 ? 0x2f4a2a : 0x375a31, 1);
        g.fillCircle(14 + rr() * 28, 14 + rr() * 22, 11 + rr() * 6);
      }
    });
  }
}
