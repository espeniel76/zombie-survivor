// 첫 화면, 아군 도감, 설정
import Phaser from 'phaser';
import { ALLIES, ALLY, TIERS } from '../data/allies.js';
import * as R from '../core/rules.js';
import { loadSave, writeSave, TEST } from '../core/save.js';
import { unlockAudio } from '../core/sfx.js';
import { W, H, COLOR, text, panel, button, settingsRows, appear, vanish, curtainIn, curtainOut } from '../core/ui.js';
import { statsLine } from './UIScene.js';
import { allyView, attachLegs, stepLegs } from '../render/sprites.js';
import { storyPages } from '../core/story-ui.js';
import { PROLOGUE, CHAPTERS } from '../data/story.js';

const KIND_LABEL = {
  bullet: '사격', splash: '폭발', strike: '폭격', flame: '화염', beam: '광선',
  chain: '번개', aura: '범위 공격', repair: '수리', money: '코인 생산', buff: '지휘',
};

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  // data.open = 'book' | 'shop' → 미리보기에서 돌아올 때 그 화면을 바로 연다
  create(data) {
    performance.mark('title');
    this.save = loadSave();
    this.input.once('pointerdown', unlockAudio);
    this.input.keyboard.once('keydown', unlockAudio);

    this.bg = this.add.image(W / 2, H / 2, 'map_road').setDepth(-1); // 좀비 발(살짝 낮은 깊이)이 바닥 위에 오게
    this.walkers = [];
    for (let k = 0; k < 10; k++) this.addWalker(true);
    this.add.rectangle(W / 2, H / 2, W, H, 0x0b0e12, 0.45);

    this.main = this.add.container(0, 0);
    curtainIn(this);
    if (data?.open === 'book') this.showBook();
    else if (data?.open === 'shop') this.showShop();
    else if (data?.open === 'event') this.showEvent();
    else this.showMain();
    window.__load?.done();
  }

  addWalker(anywhere) {
    const tex = Phaser.Utils.Array.GetRandom(['z_walker', 'z_walker', 'z_runner', 'z_brute', 'z_spitter']);
    const a = Math.random() * Math.PI * 2;
    const r = anywhere ? Math.random() * 600 : 760;
    const z = this.add.image(W / 2 + Math.cos(a) * r, H / 2 + Math.sin(a) * r, tex).setAlpha(0.9);
    z.speed = 20 + Math.random() * 25;
    z.setFlipX(Math.cos(a) > 0);
    attachLegs(this, z, tex.slice(2));
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
        z.lx = z.x;
        z.ly = z.y;
      }
      stepLegs(z, dt / 1000, true);
    }
  }

  // 화면 바꾸기: 지금 화면은 천천히 사라지고, 새 화면은 살짝 아래에서 떠오르며 나타난다
  clear() {
    if (this.main.list.length) vanish(this, this.main, { duration: 140 });
    else this.main.destroy();
    this.main = this.add.container(0, 0);
    appear(this, this.main, { duration: 260, delay: 90 });
  }

  // 장면 넘어가기(화면이 어두워진 뒤)
  go(key, data) {
    curtainOut(this, () => this.scene.start(key, data));
  }

  // 안드로이드 앱의 뒤로 가기 버튼(src/core/app.js). 처음 화면이라 더 돌아갈 곳이 없으면 false
  back() {
    if (this.overlay?.active) {
      this.overlay.finish();
      return true;
    }
    if (this.page !== 'main') {
      this.showMain();
      return true;
    }
    return false;
  }

  showMain() {
    this.clear();
    this.page = 'main';
    const c = this.main;
    c.add(text(this, W / 2, 300, '좀비 생존자', 96, COLOR.text, { strokeThickness: 12 }));
    c.add(text(this, W / 2, 400, '가운데 9칸을 지켜라', 34, COLOR.greenText));
    const best = this.save.best;
    if (best.wave) c.add(text(this, W / 2, 470, `최고 기록  웨이브 ${best.wave} · 처치 ${R.formatNum(best.kills)}`, 24, COLOR.dim));
    // 큰 버튼은 '게임 시작' 하나만. 나머지는 아래 작은 버튼 한 줄
    // 두 번째 맵이 열렸으면 '게임 시작'에서 맵을 고른다
    const map2 = R.mapUnlocked(this.save, 'mall');
    if (TEST) c.add(text(this, W / 2, 560, '테스트판', 40, '#c9b8ff', { strokeThickness: 8 }));
    c.add(button(this, W / 2, 720, 460, 116, '게임 시작', () => (TEST ? this.showTest() : map2 ? this.showMaps() : this.go('Game', { preview: null, map: 'field' })), { size: 46 }));
    if (!map2) c.add(text(this, W / 2, 810, `${R.MAP2_WAVE}웨이브에 도달하면 두 번째 맵이 열려요`, 20, COLOR.dim, { strokeThickness: 4, bold: false }));
    // 보유 코인(오른쪽 위)
    const wallet = text(this, 696, 54, R.formatNum(this.save.coins || 0), 32, '#ffe08a', { ox: 1 });
    c.add([wallet, this.add.image(696 - wallet.width - 24, 54, 'item_coin').setScale(1.4)]);
    const small = [
      ['이벤트', () => this.showEvent(), '#ffe680'],
      ['상점', () => this.showShop(), '#ffe08a'],
      ['아군 도감', () => this.showBook(), COLOR.orangeText],
      ['이야기', () => this.showStory(), '#f4eeff'],
      ['설정', () => this.showSettings(), COLOR.text],
    ];
    const bw = 128;
    const gap = 8;
    const x0 = W / 2 - ((bw + gap) * (small.length - 1)) / 2;
    small.forEach(([label, fn, color], k) =>
      c.add(button(this, x0 + k * (bw + gap), 1150, bw, 72, label, fn, { fill: k === 0 ? 0x5a4410 : 0x26303a, textColor: color, size: 22 })));
  }

  // 테스트판: 맵과 시작 웨이브를 고른다(전장 코인 100만, 신화·맵 모두 열림)
  showTest(map = 'field') {
    this.clear();
    const c = this.main;
    c.add(panel(this, W / 2, H / 2, 692, 1100));
    c.add(text(this, W / 2, 150, '테스트판', 44, '#c9b8ff'));
    c.add(text(this, W / 2, 200, '전장 코인 100만 · 신화와 두 번째 맵 모두 열림 · 원래 기록과 따로 저장', 19, COLOR.dim, { strokeThickness: 0, bold: false }));
    c.add(text(this, W / 2, 270, '맵', 30, COLOR.text));
    ['field', 'mall'].forEach((id, k) => {
      const on = id === map;
      c.add(button(this, W / 2 + (k - 0.5) * 300, 340, 280, 76, R.MAPS[id].name, () => this.showTest(id),
        { fill: on ? COLOR.green : 0x2b3540, textColor: on ? '#13200b' : '#eef3ea', size: 26 }));
    });
    c.add(text(this, W / 2, 450, '시작 웨이브 (5의 배수는 거대 좀비)', 30, COLOR.text));
    const waves = [1, 5, 10, 15, 20, 25, 30, 35, 40, 45, 49, 50];
    waves.forEach((w, k) => {
      const x = W / 2 + ((k % 4) - 1.5) * 150;
      const y = 540 + Math.floor(k / 4) * 110;
      const boss = w % 5 === 0;
      c.add(button(this, x, y, 136, 90, `${w}`, () => this.go('Game', { preview: null, map, startWave: w }),
        { fill: boss ? 0x8a5cff : 0x3a4652, textColor: '#ffffff', size: 34 }));
    });
    c.add(text(this, W / 2, 880, '게임 중에는 아래 \'다음 보스로\' 버튼으로 다음 거대 좀비까지 건너뛸 수 있어요', 19, COLOR.dim, { strokeThickness: 0, bold: false, wrap: 600 }));
    c.add(button(this, W / 2, 1120, 300, 80, '뒤로', () => this.showMain(), { fill: 0x3a4652, textColor: '#eef3ea' }));
  }

  // ── 이벤트: 황금 열쇠 · 전설 상자 · 주말 보스 러시 · 오늘의 도전 ──
  showEvent() {
    this.clear();
    const c = this.main;
    c.add(panel(this, W / 2, H / 2, 692, 1200));
    c.add(text(this, W / 2, 96, '이벤트', 44, '#ffe680'));
    const keys = this.save.keys || 0;
    c.add(this.add.image(W / 2 - 110, 150, 'item_key').setScale(1.4));
    c.add(text(this, W / 2 + 10, 150, `황금 열쇠 ${R.formatNum(keys)}개`, 30, '#ffe680'));
    c.add(text(this, W / 2, 192, '좀비 5마리 중 1마리꼴로 금빛 좀비! 쓰러뜨리면 황금 열쇠를 떨어뜨려요', 18, COLOR.dim, { strokeThickness: 0, bold: false }));
    const card = (y, h, edge) => c.add(panel(this, W / 2, y, 620, h, 0x1b222b, edge, 22));
    // 전설 상자
    card(390, 320, 0xffd84a);
    // 상자: 뒤에 금빛 후광(크기만 천천히 숨 쉬듯), 둘레에 가만히 있는 작은 별
    const glow = this.add.image(190, 395, 'chest_glow').setScale(0.75);
    this.tweens.add({ targets: glow, scale: 0.85, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    c.add(glow);
    c.add(this.chestView(190, 400, 0.72));
    for (const [x, y, k] of [[96, 300, 0.9], [290, 318, 0.7], [110, 470, 0.6], [282, 455, 0.8]]) c.add(this.add.image(x, y, 'chest_star').setScale(k).setAlpha(0.9));
    c.add(text(this, 300, 270, '전설 상자', 34, '#ffe680', { ox: 0 }));
    c.add(text(this, 300, 312, '황금 열쇠 50개로 열어요', 20, COLOR.text, { ox: 0, strokeThickness: 0, bold: false }));
    c.add(text(this, 300, 352, '죽음의 황제 · 영원한 황금의 군주 12%씩\n잠긴 신화 해금 25% · 보유 코인\n1%: 이터널 「영원한 황금의 수호신」', 17, COLOR.dim, { ox: 0, oy: 0, strokeThickness: 0, bold: false, align: 'left', lineSpacing: 6 }));
    const can = keys >= R.BOX_PRICE;
    c.add(button(this, 470, 500, 300, 70, can ? '열기 (열쇠 50)' : `열쇠 ${R.BOX_PRICE - keys}개 더 필요`, () => can && this.openChest(),
      { fill: can ? 0xffd84a : 0x4a535c, textColor: can ? '#2a1a00' : '#aab3ba', size: 24 }));
    // 주말 보스 러시
    const weekend = R.isWeekend() || TEST;
    card(690, 220, 0xff7a5a);
    c.add(text(this, 70, 610, '주말 보스 러시', 30, '#ffb39a', { ox: 0 }));
    c.add(text(this, 70, 652, '거대 좀비만 연달아! 보스마다 황금 열쇠 +2', 20, COLOR.text, { ox: 0, strokeThickness: 0, bold: false }));
    c.add(text(this, 70, 686, weekend ? `토·일에만 열려요 · 최고 기록 보스 ${this.save.bestRush || 0}` : '토요일·일요일에 열려요', 18, COLOR.dim, { ox: 0, strokeThickness: 0, bold: false }));
    c.add(button(this, 540, 750, 220, 64, weekend ? '도전' : '잠김', () => weekend && this.go('Game', { preview: null, map: 'field', mode: 'rush' }),
      { fill: weekend ? 0xff7a5a : 0x4a535c, textColor: weekend ? '#2a0e00' : '#aab3ba', size: 26 }));
    // 오늘의 도전
    const d = R.dailyFor();
    const done = this.save.daily?.date === R.dayKey() && this.save.daily.done;
    card(950, 240, 0x7fdc9a);
    c.add(text(this, 70, 862, `오늘의 도전 · ${d.name}`, 30, '#9cffc0', { ox: 0 }));
    c.add(text(this, 70, 904, `${d.desc} · ${d.goal}웨이브까지 막기`, 20, COLOR.text, { ox: 0, strokeThickness: 0, bold: false }));
    c.add(text(this, 70, 938, done ? '오늘은 성공했어요! 내일 새 도전이 열려요' : `성공하면 황금 열쇠 +${R.DAILY_KEYS} (하루 한 번)`, 18, COLOR.dim, { ox: 0, strokeThickness: 0, bold: false }));
    c.add(button(this, 540, 1012, 220, 64, done ? '다시 하기' : '도전', () => this.go('Game', { preview: null, map: 'field', mode: 'daily' }),
      { fill: 0x7fdc9a, textColor: '#0e2a18', size: 26 }));
    c.add(button(this, W / 2, 1180, 300, 72, '뒤로', () => this.showMain(), { fill: 0x3a4652, textColor: '#eef3ea' }));
  }

  // 상자 그림(몸통 + 뚜껑). 컨테이너 원점 = 몸통 가운데
  chestView(x, y, k) {
    const v = this.add.container(x, y).setScale(k);
    const base = this.add.image(0, 0, 'chest_base').setScale(0.5);
    const lid = this.add.image(0, -44, 'chest_lid').setScale(0.5).setOrigin(0.5, 0.9);
    v.add([base, lid]);
    v.lid = lid;
    return v;
  }

  // 전설 상자 열기: 상자가 천천히 흔들리다 금빛 고리와 함께 열리고 결과가 떠오른다(번쩍임 없음)
  openChest() {
    const res = R.openBox(this.save);
    if (!res) return;
    writeSave();
    const box = this.add.container(0, 0).setDepth(30);
    const dim = this.add.rectangle(W / 2, H / 2, W, H, 0x07090c, 0.92).setInteractive();
    box.add(dim);
    const eternal = res.type === 'hero' && ALLY[res.id].tier === 6;
    const glow = this.add.image(W / 2, 640, 'chest_glow').setScale(1.2).setAlpha(0.8);
    const rays = this.add.image(W / 2, 600, 'chest_rays').setScale(1.4).setAlpha(0);
    const chest = this.chestView(W / 2, 660, 1.6);
    box.add([glow, rays, chest]);
    appear(this, box, { duration: 220, dy: 0 });
    // 1) 천천히 좌우로 흔들림 → 2) 뚜껑이 열리며 빛줄기가 서서히 퍼짐 → 3) 결과
    this.tweens.add({ targets: chest, angle: { from: -3, to: 3 }, duration: 240, yoyo: true, repeat: 3, ease: 'Sine.InOut',
      onComplete: () => {
        chest.angle = 0;
        this.tweens.add({ targets: chest.lid, angle: -38, y: -70, duration: 450, ease: 'Back.Out' });
        this.tweens.add({ targets: rays, alpha: eternal ? 1 : 0.8, scale: eternal ? 2.2 : 1.7, duration: 700, ease: 'Quad.Out' });
        this.tweens.add({ targets: rays, angle: 360, duration: 12000, repeat: -1 }); // 아주 천천히 돈다
        if (eternal) rays.setTint(0xfff3b0);
        this.tweens.add({ targets: chest, alpha: 0, y: 700, delay: 600, duration: 400 });
        this.time.delayedCall(750, () => this.showChestResult(box, res, eternal));
      } });
  }

  showChestResult(box, res, eternal) {
    const c = this.add.container(0, 0);
    box.add(c);
    if (res.type === 'coins') {
      c.add(this.add.image(W / 2, 560, 'item_coin').setScale(4));
      c.add(text(this, W / 2, 680, `보유 코인 +${R.formatNum(res.coins)}`, 40, '#ffe08a'));
    } else {
      const a = ALLY[res.id];
      const t = TIERS[a.tier];
      if (eternal) c.add(text(this, W / 2, 360, '이터널!', 64, t.text, { strokeThickness: 10 }));
      c.add(allyView(this, W / 2, 570, a.id, 2.6));
      c.add(text(this, W / 2, 700, a.name, 40, t.text));
      c.add(text(this, W / 2, 748, `${t.name} · ${a.role}`, 24, COLOR.text, { strokeThickness: 0 }));
      c.add(text(this, W / 2, 790, res.type === 'dup' ? `이미 있어서 보유 코인 +${R.formatNum(res.coins)}` : '해금! 전장 상점에 나와요', 22, res.type === 'dup' ? '#ffe08a' : '#9cffc0', { strokeThickness: 0 }));
    }
    c.add(button(this, W / 2, 940, 300, 80, '확인', () => {
      vanish(this, box, { duration: 200 });
      this.showEvent();
    }, { fill: 0xffd84a, textColor: '#2a1a00' }));
    appear(this, c, { duration: 400, dy: 24 });
  }

  // 맵 고르기(두 번째 맵이 열린 뒤)
  showMaps() {
    this.clear();
    const c = this.main;
    c.add(text(this, W / 2, 170, '맵 고르기', 48, COLOR.text));
    ['field', 'mall'].forEach((id, k) => {
      const m = R.MAPS[id];
      const y = 420 + k * 380;
      const g = this.add.graphics();
      c.add(panel(this, W / 2, y, 620, 330, 0x1b222b, id === 'mall' ? 0x8a6cff : 0x6cc24a, 24));
      const thumb = this.add.tileSprite(W / 2, y - 60, 560, 150, m.bg).setOrigin(0.5);
      thumb.setTilePosition(80, 650 - 75 - 200); // 기지 위쪽 길이 보이게
      c.add([g, thumb]);
      const best = id === 'mall' ? this.save.best2 : this.save.best;
      c.add(text(this, W / 2, y + 44, m.name, 36, COLOR.text));
      c.add(text(this, W / 2, y + 84, id === 'mall' ? m.desc : `${m.desc}${best?.wave ? ` · 최고 웨이브 ${best.wave}` : ''}`, 18, COLOR.dim, { strokeThickness: 0, bold: false, wrap: 560 }));
      if (id === 'mall' && best?.wave) c.add(text(this, W / 2, y + 124, `최고 웨이브 ${best.wave}`, 20, '#c9b8ff', { strokeThickness: 0 }));
      const zone = this.add.zone(W / 2, y, 620, 330).setInteractive({ useHandCursor: true });
      zone.on('pointerup', () => this.go('Game', { preview: null, map: id }));
      c.add(zone);
    });
    c.add(button(this, W / 2, 1180, 300, 80, '뒤로', () => this.showMain(), { fill: 0x3a4652, textColor: '#eef3ea' }));
  }

  // 메인 상점: 보유 코인으로 신화를 해금한다(한 번 사면 계속 전장 상점에 나온다)
  showShop() {
    this.clear();
    this.page = 'shop';
    const c = this.main;
    c.add(panel(this, W / 2, H / 2, 692, 1200));
    c.add(text(this, W / 2, 104, '상점', 44, COLOR.text));
    c.add(text(this, W / 2, 150, '신화를 해금하면 전장 상점에 나와요 · 그림을 누르면 미리보기', 20, COLOR.dim, { strokeThickness: 0, bold: false }));
    const wallet = text(this, W / 2 + 14, 192, `보유 코인 ${R.formatNum(this.save.coins || 0)}`, 28, '#ffe08a');
    c.add([wallet, this.add.image(W / 2 - wallet.width / 2 - 12, 192, 'item_coin').setScale(1.2)]);
    const mythics = R.shopMythics();
    const red = TIERS[5];
    mythics.forEach((a, k) => {
      const x = W / 2 + ((k % 3) - 1) * 216;
      const y = 316 + Math.floor(k / 3) * 178;
      const owned = R.isUnlocked(this.save, a.id);
      const g = this.add.graphics();
      g.fillStyle(owned ? 0x1f262e : 0x161b20, 1);
      g.fillRoundedRect(x - 102, y - 82, 204, 168, 14);
      g.lineStyle(3, owned ? red.color : 0x3a4652, 1);
      g.strokeRoundedRect(x - 102, y - 82, 204, 168, 14);
      const img = allyView(this, x, y - 22, a.id, 0.82);
      if (!owned) img.setAlpha(0.75);
      const zone = this.add.zone(x, y - 34, 204, 96).setInteractive({ useHandCursor: true });
      zone.on('pointerup', () => this.go('Game', { preview: a.id, from: 'shop' }));
      const name = text(this, x, y + 22, a.name, 20, owned ? red.text : COLOR.text, { strokeThickness: 0 });
      const enough = (this.save.coins || 0) >= R.MYTHIC_UNLOCK;
      const b = owned
        ? button(this, x, y + 58, 180, 44, '해금됨', () => {}, { fill: 0x2a3138, textColor: '#93a39a', size: 20 })
        : button(this, x, y + 58, 180, 44, `${R.formatNum(R.MYTHIC_UNLOCK)}코인`, () => this.confirmUnlock(a),
          { fill: enough ? COLOR.green : 0x4a535c, textColor: enough ? '#13200b' : '#aab3ba', size: 20 });
      c.add([g, img, zone, name, b]);
    });
    c.add(button(this, W / 2, 1196, 300, 72, '뒤로', () => this.showMain(), { fill: 0x3a4652, textColor: '#eef3ea' }));
  }

  // 실수로 누르지 않게 한 번 더 묻는다
  confirmUnlock(a) {
    if ((this.save.coins || 0) < R.MYTHIC_UNLOCK) {
      this.flashMsg(`코인이 부족해요 · 좀비를 잡으면 코인을 떨어뜨려요`);
      return;
    }
    const box = this.add.container(0, 0).setDepth(20);
    const dim = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.6).setInteractive().setDepth(19);
    dim.setAlpha(0);
    this.tweens.add({ targets: dim, alpha: 1, duration: 180 });
    const close = () => {
      vanish(this, box, { duration: 140 });
      vanish(this, dim, { duration: 160 });
    };
    box.finish = close;
    this.overlay = box;
    box.add(panel(this, W / 2, H / 2, 560, 420));
    box.add(allyView(this, W / 2, H / 2 - 100, a.id, 1.3));
    box.add(text(this, W / 2, H / 2 + 6, `${a.name} 해금`, 34, TIERS[5].text));
    box.add(text(this, W / 2, H / 2 + 52, `보유 코인 ${R.formatNum(this.save.coins)} → ${R.formatNum(this.save.coins - R.MYTHIC_UNLOCK)}`, 22, '#ffe08a', { strokeThickness: 0 }));
    box.add(button(this, W / 2 - 120, H / 2 + 136, 210, 76, '해금', () => {
      close();
      if (R.unlockMythic(this.save, a.id)) {
        writeSave();
        this.showShop();
        this.flashMsg(`${a.name} 해금! 전장 상점 신화 칸에 나와요`);
      }
    }, { size: 30 }));
    box.add(button(this, W / 2 + 120, H / 2 + 136, 210, 76, '취소', () => close(), { fill: 0x3a4652, textColor: '#eef3ea', size: 30 }));
    appear(this, box, { duration: 220, dy: 18 });
  }

  // 잠깐 떴다 사라지는 안내(밝기 변화 없이 천천히 사라짐)
  flashMsg(str) {
    this.msg?.destroy();
    this.msg = text(this, W / 2, 1110, str, 24, COLOR.text, { strokeThickness: 6 }).setDepth(30);
    appear(this, this.msg, { duration: 200, dy: 8 });
    this.tweens.add({ targets: this.msg, alpha: 0, delay: 1800, duration: 400 });
  }

  // 이야기: 프롤로그 다시 보기 + 지금까지 연 장
  // 한 쪽에 6장씩, ◀ ▶ 로 넘긴다
  showStory(page = 0) {
    this.clear();
    this.page = 'story';
    const c = this.main;
    c.add(panel(this, W / 2, H / 2, 692, 1200));
    c.add(text(this, W / 2, 110, '이야기', 40, COLOR.text));
    c.add(text(this, W / 2, 158, '검은 비가 내린 뒤, 아홉 칸의 기록', 22, COLOR.dim, { strokeThickness: 0 }));
    const seen = this.save.story.seen;
    const PER = 6;
    const pages = Math.ceil(CHAPTERS.length / PER);
    if (pages > 1) {
      c.add(button(this, W / 2 - 150, 1062, 96, 56, '◀', () => this.showStory((page + pages - 1) % pages), { fill: 0x3a4652, textColor: '#eef3ea', size: 26 }));
      c.add(text(this, W / 2, 1062, `${page + 1} / ${pages}`, 26, COLOR.text));
      c.add(button(this, W / 2 + 150, 1062, 96, 56, '▶', () => this.showStory((page + 1) % pages), { fill: 0x3a4652, textColor: '#eef3ea', size: 26 }));
    }
    CHAPTERS.slice(page * PER, page * PER + PER).forEach((ch, k) => {
      const y = 250 + k * 128;
      const open = seen.includes(ch.wave) || (this.save.best.wave || 0) >= ch.wave;
      const g = this.add.graphics();
      g.fillStyle(open ? 0x232b33 : 0x161b20, 1);
      g.fillRoundedRect(40, y - 50, W - 80, 104, 12);
      c.add(g);
      c.add(text(this, 64, y - 26, ch.title, 24, open ? COLOR.orangeText : '#5a6470', { ox: 0, strokeThickness: 0 }));
      c.add(text(this, 64, y + 4, open ? ch.text : `웨이브 ${ch.wave}에 도달하면 열려요`, 18, open ? COLOR.text : '#5a6470',
        { ox: 0, oy: 0, strokeThickness: 0, bold: false, wrap: W - 130, align: 'left', lineSpacing: 2 }));
    });
    c.add(button(this, W / 2 - 150, 1170, 260, 80, '처음부터 보기', () => (this.overlay = storyPages(this, PROLOGUE, null)), { fill: 0x5a4a7a, textColor: '#f4eeff', size: 26 }));
    c.add(button(this, W / 2 + 150, 1170, 260, 80, '뒤로', () => this.showMain(), { fill: 0x3a4652, textColor: '#eef3ea' }));
  }

  showSettings() {
    this.clear();
    this.page = 'settings';
    const c = this.main;
    c.add(panel(this, W / 2, H / 2, 620, 600));
    c.add(text(this, W / 2, H / 2 - 230, '설정', 44, COLOR.text));
    settingsRows(this, c, W / 2, H / 2 - 110, this.save, () => writeSave());
    c.add(text(this, W / 2, H / 2 + 165, '번쩍임 효과를 끄면 화면 흔들림과 번쩍이는 효과가 없어요', 19, COLOR.dim, { strokeThickness: 0, wrap: 540 }));
    c.add(button(this, W / 2, H / 2 + 240, 300, 80, '뒤로', () => this.showMain(), { fill: 0x3a4652, textColor: '#eef3ea' }));
  }

  showBook() {
    this.clear();
    this.page = 'book';
    const c = this.main;
    c.add(panel(this, W / 2, H / 2, 692, 1200));
    c.add(text(this, W / 2, 110, `아군 도감 · ${ALLIES.length}명`, 40, COLOR.text));
    const detail = this.add.container(0, 0);
    // 한 줄에 5명. 신화는 여러 줄이 된다.
    let row = 0;
    TIERS.forEach((t, ti) => {
      const list = ALLIES.filter(a => a.tier === ti);
      for (let start = 0; start < list.length; start += 5, row++) {
        const y = 190 + row * 84;
        if (start === 0) c.add(text(this, 40, y, t.name, 22, t.text, { ox: 0, strokeThickness: 0 }));
        list.slice(start, start + 5).forEach((a, col) => {
          const x = 160 + col * 108;
          const g = this.add.graphics();
          g.fillStyle(0x10151a, 1);
          g.fillRoundedRect(x - 38, y - 38, 76, 76, 10);
          g.lineStyle(3, t.color, 1);
          g.strokeRoundedRect(x - 38, y - 38, 76, 76, 10);
          const img = allyView(this, x, y + 9, a.id, 0.82);
          const zone = this.add.zone(x, y, 76, 76).setInteractive({ useHandCursor: true });
          zone.on('pointerup', () => this.go('Game', { preview: a.id, from: 'book' }));
          c.add([g, img, zone]);
        });
      }
    });
    c.add(detail);
    detail.add(text(this, W / 2, 1100, '아군을 누르면 싸우는 모습을 미리 볼 수 있어요', 22, COLOR.dim, { strokeThickness: 0 }));
    c.add(button(this, W / 2, 1170, 300, 80, '뒤로', () => this.showMain(), { fill: 0x3a4652, textColor: '#eef3ea' }));
  }
}
