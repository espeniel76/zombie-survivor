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
    buildCharacterTextures(this);
    this.drawItems();
    this.drawEffects();
    this.drawShots();
    this.drawGround();
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

  // 신화 영웅이 부르는 것들: 카드, 허수아비, 아기 용, 개구리, 유령, 회오리
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
    this.make_('scarecrow', 60, 76, (g) => {
      g.fillStyle(0x000000, 0.25);
      g.fillEllipse(30, 72, 34, 8);
      g.lineStyle(3, DARK, 1);
      g.fillStyle(0x8a6436, 1);
      g.fillRect(27, 30, 6, 42);
      g.strokeRect(27, 30, 6, 42);
      g.fillRect(6, 34, 48, 6);
      g.strokeRect(6, 34, 48, 6);
      g.fillStyle(0xd9b25a, 1);
      for (const x of [4, 52]) g.fillTriangle(x, 32, x + 4, 37, x, 42);
      g.fillStyle(0x6a8ad0, 1);
      g.fillRoundedRect(17, 38, 26, 20, 5);
      g.strokeRoundedRect(17, 38, 26, 20, 5);
      g.fillStyle(0xd9b25a, 1);
      g.fillTriangle(18, 58, 24, 58, 21, 64);
      g.fillTriangle(36, 58, 42, 58, 39, 64);
      g.fillStyle(0xe8d8a8, 1);
      g.fillCircle(30, 22, 12);
      g.strokeCircle(30, 22, 12);
      g.fillStyle(DARK, 1);
      g.fillRect(24, 19, 4, 4);
      g.fillRect(33, 19, 4, 4);
      g.fillStyle(0xc9a24a, 1);
      g.fillEllipse(30, 11, 34, 7);
      g.fillRect(22, 1, 16, 10);
      g.lineStyle(2, DARK, 1);
      g.strokeEllipse(30, 11, 34, 7);
      g.strokeRect(22, 1, 16, 10);
      g.fillStyle(0xc8202e, 1);
      g.fillRect(22, 7, 16, 3);
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
    this.make_('frog', 40, 34, (g) => {
      g.fillStyle(0x000000, 0.25);
      g.fillEllipse(20, 31, 28, 6);
      g.fillStyle(0x4fae5a, 1);
      g.lineStyle(2, 0x1f4a24, 1);
      g.fillEllipse(20, 21, 32, 22);
      g.strokeEllipse(20, 21, 32, 22);
      for (const x of [11, 29]) {
        g.fillCircle(x, 10, 7);
        g.strokeCircle(x, 10, 7);
        g.fillStyle(0xffffff, 1);
        g.fillCircle(x, 10, 4.5);
        g.fillStyle(0x4fae5a, 1);
      }
      g.fillStyle(0x9be15d, 1);
      g.fillEllipse(20, 26, 18, 8);
      g.lineStyle(1.5, 0x1f4a24, 1);
      g.beginPath();
      g.arc(20, 20, 6, 0.3, Math.PI - 0.3, false);
      g.strokePath();
    });
    this.make_('ghost', 34, 38, (g) => {
      g.fillStyle(0xe8f0ff, 0.95);
      g.lineStyle(2, 0x8a9ab8, 1);
      g.beginPath();
      g.arc(17, 15, 13, Math.PI, 0, false);
      g.lineTo(30, 32);
      g.lineTo(25, 28);
      g.lineTo(21, 34);
      g.lineTo(17, 29);
      g.lineTo(13, 34);
      g.lineTo(9, 28);
      g.lineTo(4, 32);
      g.closePath();
      g.fillPath();
      g.strokePath();
      g.fillStyle(0x2a3048, 1);
      g.fillEllipse(12, 15, 5, 7);
      g.fillEllipse(22, 15, 5, 7);
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
