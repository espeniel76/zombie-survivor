// 첫 화면, 아군 도감, 설정
import Phaser from 'phaser';
import { ALLIES, TIERS } from '../data/allies.js';
import * as R from '../core/rules.js';
import { loadSave, writeSave } from '../core/save.js';
import { unlockAudio } from '../core/sfx.js';
import { W, H, COLOR, text, panel, button, settingsRows } from '../core/ui.js';
import { statsLine } from './UIScene.js';
import { allyView, BODY_OY } from '../render/sprites.js';

const KIND_LABEL = {
  bullet: '사격', splash: '폭발', strike: '폭격', flame: '화염', beam: '광선',
  chain: '번개', aura: '범위 공격', repair: '수리', money: '코인 생산', buff: '지휘',
};

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create() {
    this.save = loadSave();
    this.input.once('pointerdown', unlockAudio);
    this.input.keyboard.once('keydown', unlockAudio);

    this.bg = this.add.tileSprite(0, 0, W, H, 'ground').setOrigin(0);
    this.walkers = [];
    for (let k = 0; k < 10; k++) this.addWalker(true);
    this.add.rectangle(W / 2, H / 2, W, H, 0x0b0e12, 0.45);

    this.main = this.add.container(0, 0);
    this.showMain();
  }

  addWalker(anywhere) {
    const tex = Phaser.Utils.Array.GetRandom(['z_walker', 'z_walker', 'z_runner', 'z_brute', 'z_spitter']);
    const a = Math.random() * Math.PI * 2;
    const r = anywhere ? Math.random() * 600 : 760;
    const z = this.add.image(W / 2 + Math.cos(a) * r, H / 2 + Math.sin(a) * r, tex).setAlpha(0.9).setOrigin(0.5, BODY_OY);
    z.speed = 20 + Math.random() * 25;
    this.walkers.push(z);
  }

  update(_t, dt) {
    for (const z of this.walkers) {
      const a = Math.atan2(H / 2 - z.y, W / 2 - z.x);
      z.setFlipX(Math.cos(a) < 0);
      z.x += Math.cos(a) * z.speed * (dt / 1000);
      z.y += Math.sin(a) * z.speed * (dt / 1000);
      if (Math.hypot(z.x - W / 2, z.y - H / 2) < 40) {
        const b = Math.random() * Math.PI * 2;
        z.setPosition(W / 2 + Math.cos(b) * 760, H / 2 + Math.sin(b) * 760);
      }
    }
  }

  clear() {
    this.main.removeAll(true);
  }

  showMain() {
    this.clear();
    const c = this.main;
    c.add(text(this, W / 2, 300, '좀비 생존자', 96, COLOR.text, { strokeThickness: 12 }));
    c.add(text(this, W / 2, 400, '가운데 9칸을 지켜라', 34, COLOR.greenText));
    const best = this.save.best;
    c.add(text(this, W / 2, 470, best.wave ? `최고 기록  웨이브 ${best.wave} · 처치 ${R.formatNum(best.kills)}` : '아군을 세워 사방에서 오는 좀비를 막으세요', 24, COLOR.dim));
    c.add(button(this, W / 2, 700, 440, 110, '게임 시작', () => this.scene.start('Game'), { size: 44 }));
    c.add(button(this, W / 2, 840, 440, 92, '아군 도감', () => this.showBook(), { fill: COLOR.orange, textColor: '#2a1600', size: 34 }));
    c.add(button(this, W / 2, 960, 440, 92, '설정', () => this.showSettings(), { fill: 0x3a4652, textColor: '#eef3ea', size: 34 }));
    c.add(text(this, W / 2, 1180, '빈 칸을 누르면 상점 · 아군을 누르면 강화/옮기기/판매', 21, COLOR.dim, { strokeThickness: 0 }));
  }

  showSettings() {
    this.clear();
    const c = this.main;
    c.add(panel(this, W / 2, H / 2, 620, 600));
    c.add(text(this, W / 2, H / 2 - 230, '설정', 44, COLOR.text));
    settingsRows(this, c, W / 2, H / 2 - 110, this.save, () => writeSave());
    c.add(text(this, W / 2, H / 2 + 165, '번쩍임 효과를 끄면 화면 흔들림과 번쩍이는 효과가 없어요', 19, COLOR.dim, { strokeThickness: 0, wrap: 540 }));
    c.add(button(this, W / 2, H / 2 + 240, 300, 80, '뒤로', () => this.showMain(), { fill: 0x3a4652, textColor: '#eef3ea' }));
  }

  showBook() {
    this.clear();
    const c = this.main;
    c.add(panel(this, W / 2, H / 2, 692, 1200));
    c.add(text(this, W / 2, 110, `아군 도감 · ${ALLIES.length}명`, 40, COLOR.text));
    const detail = this.add.container(0, 0);
    // 한 줄에 5명. 신화는 여러 줄이 된다.
    let row = 0;
    TIERS.forEach((t, ti) => {
      const list = ALLIES.filter(a => a.tier === ti);
      for (let start = 0; start < list.length; start += 5, row++) {
        const y = 196 + row * 96;
        if (start === 0) c.add(text(this, 40, y, t.name, 22, t.text, { ox: 0, strokeThickness: 0 }));
        list.slice(start, start + 5).forEach((a, col) => {
          const x = 160 + col * 108;
          const g = this.add.graphics();
          g.fillStyle(0x10151a, 1);
          g.fillRoundedRect(x - 42, y - 42, 84, 84, 10);
          g.lineStyle(3, t.color, 1);
          g.strokeRoundedRect(x - 42, y - 42, 84, 84, 10);
          const img = allyView(this, x, y + 10, a.id, 0.92);
          const zone = this.add.zone(x, y, 84, 84).setInteractive({ useHandCursor: true });
          zone.on('pointerup', () => {
            detail.removeAll(true);
            detail.add(text(this, W / 2, 996, `${a.name}  ·  ${t.name} ${a.role || KIND_LABEL[a.kind]}  ·  ${R.formatNum(a.price)}코인`, 26, t.text));
            if (a.quote) detail.add(text(this, W / 2, 1032, `“${a.quote}”`, 21, '#ffd84a', { strokeThickness: 0, bold: false }));
            detail.add(text(this, W / 2, a.quote ? 1064 : 1040, a.desc, 22, COLOR.text, { strokeThickness: 0, bold: false }));
            detail.add(text(this, W / 2, a.quote ? 1096 : 1076, statsLine(a.kind, R.allyStats(a.id, 1)), 19, COLOR.dim, { strokeThickness: 0, bold: false }));
          });
          c.add([g, img, zone]);
        });
      }
    });
    c.add(detail);
    detail.add(text(this, W / 2, 1040, '아군을 눌러 보세요', 24, COLOR.dim, { strokeThickness: 0 }));
    c.add(button(this, W / 2, 1170, 300, 80, '뒤로', () => this.showMain(), { fill: 0x3a4652, textColor: '#eef3ea' }));
  }
}
