// 화면 위 정보, 아래 버튼, 상점, 아군 정보, 일시정지, 결과 화면.
import Phaser from 'phaser';
import { ALLIES, ALLY, TIERS, MAX_ALLY_LEVEL } from '../data/allies.js';
import * as R from '../core/rules.js';
import { loadSave, writeSave } from '../core/save.js';
import { sfx } from '../core/sfx.js';
import { W, H, COLOR, text, panel, button, settingsRows } from '../core/ui.js';
import { allyView } from '../render/sprites.js';

const KIND_LABEL = {
  bullet: '사격', splash: '폭발', strike: '폭격', flame: '화염', beam: '광선',
  chain: '번개', aura: '범위 공격', repair: '수리', money: '코인 생산', buff: '지휘',
};

function num(n) {
  return n >= 10 ? String(Math.round(n)) : String(Math.round(n * 10) / 10);
}

export function statsLine(kind, st) {
  if (kind === 'repair') return `초당 기지 수리 ${num(st.hps)}`;
  if (kind === 'money') return `${st.every}초마다 코인 ${st.coins}개`;
  if (kind === 'buff') return `바로 옆 칸 공격 속도 +${Math.round(st.rateBuff * 100)}%`;
  const parts = [`피해 ${num(st.dmg)}${st.count > 1 ? ` ×${st.count}` : ''}`, `초당 ${num(st.rate)}회`];
  parts.push(st.range >= 1500 ? '사거리 맵 전체' : `사거리 ${st.range}`);
  if (st.radius) parts.push(`폭발 ${st.radius}`);
  return parts.join(' · ');
}

export class UIScene extends Phaser.Scene {
  constructor() {
    super('UI');
  }

  create() {
    this.game_ = this.scene.get('Game');
    this.save = loadSave();
    this.modal = null;
    this.shopTier = 0;

    this.buildHud();
    this.buildBottom();

    this.bannerText = text(this, W / 2, 330, '', 44, COLOR.text, { strokeThickness: 8 }).setDepth(50).setAlpha(0);
    this.toastBox = this.add.container(W / 2, 1090).setDepth(60).setAlpha(0);
    this.toastBg = this.add.graphics();
    this.toastText = text(this, 0, 0, '', 26, COLOR.text, { strokeThickness: 0 });
    this.toastBox.add([this.toastBg, this.toastText]);

    const kb = this.input.keyboard;
    kb.on('keydown-ESC', () => (this.modal ? this.closeModal() : this.openPause()));
    kb.on('keydown-P', () => !this.modal && this.openPause());
    kb.on('keydown-S', () => !this.modal && this.openShop(-1));
    kb.on('keydown-SPACE', () => !this.modal && this.game_.skipBreak());
    kb.on('keydown-F', () => this.cycleSpeed());
  }

  // ── 위쪽 정보 ──
  buildHud() {
    const g = this.add.graphics();
    g.fillStyle(0x0d1116, 0.82);
    g.fillRect(0, 0, W, 152);
    g.lineStyle(2, 0x2e3a47, 1);
    g.lineBetween(0, 152, W, 152);
    this.waveText = text(this, 28, 42, '', 40, COLOR.text, { ox: 0 });
    this.statusText = text(this, 28, 88, '', 24, COLOR.dim, { ox: 0 });
    this.add.image(560, 44, 'item_coin').setScale(1.6);
    this.coinText = text(this, 584, 44, '', 36, COLOR.orangeText, { ox: 0 });
    this.hpBar = this.add.graphics();
    this.hpText = text(this, W / 2, 125, '', 20, COLOR.text);
    this.bossBar = this.add.graphics();
    this.bossText = text(this, W / 2, 182, '', 20, COLOR.text);
  }

  buildBottom() {
    const g = this.add.graphics();
    g.fillStyle(0x0d1116, 0.82);
    g.fillRect(0, 1146, W, H - 1146);
    g.lineStyle(2, 0x2e3a47, 1);
    g.lineBetween(0, 1146, W, 1146);
    const y = 1212;
    button(this, 140, y, 230, 92, '상점', () => this.openShop(-1), { size: 36 });
    this.skipBtn = button(this, 370, y, 210, 92, '바로 시작', () => this.game_.skipBreak(), { fill: COLOR.orange, size: 30, textColor: '#2a1600' });
    this.speedBtn = button(this, 540, y, 110, 92, '1배속', () => this.cycleSpeed(), { fill: 0x3a4652, textColor: '#eef3ea', size: 24 });
    button(this, 650, y, 90, 92, 'II', () => this.openPause(), { fill: 0x3a4652, textColor: '#eef3ea', size: 30 });
  }

  cycleSpeed() {
    const next = { 1: 2, 2: 3, 3: 1 }[this.game_.speed];
    this.game_.setSpeed(next);
    this.speedBtn.label.setText(`${next}배속`);
  }

  update() {
    const g = this.game_;
    if (!g || !g.sys.isActive() && !g.sys.isPaused()) return;
    this.waveText.setText(g.wave === 0 ? '준비' : `웨이브 ${g.wave}`);
    if (g.phase === 'break') this.statusText.setText(`웨이브 ${g.wave + 1} 시작까지 ${Math.ceil(Math.max(0, g.phaseLeft))}초`);
    else if (g.phase === 'wave') this.statusText.setText(`남은 좀비 ${g.queue.length + g.zombies.length}`);
    else this.statusText.setText('');
    this.coinText.setText(R.formatNum(g.coins));
    this.skipBtn.setVisible(g.phase === 'break');

    const k = g.baseHp / g.baseMax;
    const bx = 24;
    const bw = W - 48;
    this.hpBar.clear();
    this.hpBar.fillStyle(0x000000, 0.6);
    this.hpBar.fillRoundedRect(bx, 112, bw, 26, 8);
    this.hpBar.fillStyle(k > 0.5 ? 0x6cc24a : k > 0.25 ? 0xffb347 : 0xe5534b, 1);
    if (k > 0) this.hpBar.fillRoundedRect(bx, 112, Math.max(16, bw * k), 26, 8);
    this.hpText.setText(`기지 ${Math.ceil(g.baseHp)} / ${g.baseMax}`);

    this.bossBar.clear();
    if (g.boss && !g.boss.dead) {
      const bk = Math.max(0, g.boss.hp / g.boss.maxHp);
      this.bossBar.fillStyle(0x000000, 0.6);
      this.bossBar.fillRoundedRect(60, 170, W - 120, 24, 8);
      this.bossBar.fillStyle(0xb267ff, 1);
      if (bk > 0) this.bossBar.fillRoundedRect(60, 170, Math.max(16, (W - 120) * bk), 24, 8);
      this.bossText.setText(`거대 좀비  ${Math.ceil(g.boss.hp)}`);
    } else {
      this.bossText.setText('');
    }
  }

  banner(str) {
    this.tweens.killTweensOf(this.bannerText);
    this.bannerText.setText(str).setAlpha(0).setY(350);
    this.tweens.add({ targets: this.bannerText, alpha: 1, y: 330, duration: 250, ease: 'Quad.Out' });
    this.tweens.add({ targets: this.bannerText, alpha: 0, delay: 1800, duration: 400 });
  }

  toast(str) {
    this.toastText.setText(str);
    const w = this.toastText.width + 48;
    this.toastBg.clear();
    this.toastBg.fillStyle(0x0d1116, 0.92);
    this.toastBg.fillRoundedRect(-w / 2, -28, w, 56, 16);
    this.toastBg.lineStyle(2, 0x2e3a47, 1);
    this.toastBg.strokeRoundedRect(-w / 2, -28, w, 56, 16);
    this.tweens.killTweensOf(this.toastBox);
    this.toastBox.setAlpha(1);
    this.tweens.add({ targets: this.toastBox, alpha: 0, delay: 1500, duration: 350 });
  }

  // ── 팝업 공통 ──
  openModal(pause = true) {
    this.closeModal(false);
    const c = this.add.container(0, 0).setDepth(100);
    const dim = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.55).setInteractive();
    dim.setAlpha(0);
    this.tweens.add({ targets: dim, alpha: 1, duration: 150 });
    c.add(dim);
    c.dim = dim;
    this.modal = c;
    if (pause && this.game_.phase !== 'over') this.scene.pause('Game');
    return c;
  }

  closeModal(resume = true) {
    if (!this.modal) return;
    this.modal.destroy();
    this.modal = null;
    if (resume) {
      this.game_.deselect();
      if (this.game_.phase !== 'over') this.scene.resume('Game');
    }
  }

  allyFrame(c, x, y, size, id) {
    const a = ALLY[id];
    const g = this.add.graphics();
    g.fillStyle(0x10151a, 1);
    g.fillRoundedRect(x - size / 2, y - size / 2, size, size, 14);
    g.lineStyle(4, TIERS[a.tier].color, 1);
    g.strokeRoundedRect(x - size / 2, y - size / 2, size, size, 14);
    c.add([g, allyView(this, x, y + size * 0.1, id, size / 88)]);
  }

  // ── 상점 ──
  openShop(preferCell) {
    if (this.game_.phase === 'over') return;
    const c = this.openModal();
    this.shopPrefer = preferCell;
    if (preferCell >= 0) this.game_.select(preferCell);
    c.add(panel(this, W / 2, 668, 692, 1140));
    c.add(text(this, W / 2, 150, '상점', 44, COLOR.text));
    this.shopCoins = text(this, W / 2, 196, '', 26, COLOR.orangeText);
    c.add(this.shopCoins);
    this.shopTabs = this.add.container(0, 0);
    this.shopList = this.add.container(0, 0);
    c.add([this.shopTabs, this.shopList]);
    c.add(button(this, W / 2, 1180, 300, 80, '닫기', () => this.closeModal(), { fill: 0x3a4652, textColor: '#eef3ea' }));
    this.refreshShop();
  }

  refreshShop() {
    const g = this.game_;
    const empty = g.cells.filter(x => !x).length;
    this.shopCoins.setText(`코인 ${R.formatNum(g.coins)} · 빈 칸 ${empty}/9`);
    this.shopTabs.removeAll(true);
    TIERS.forEach((t, k) => {
      const x = W / 2 + (k - 2.5) * 108;
      const sel = k === this.shopTier;
      const b = button(this, x, 260, 100, 58, t.name, () => {
        this.shopTier = k;
        this.refreshShop();
      }, { fill: sel ? t.color : 0x232b33, textColor: sel ? '#10151a' : t.text, size: 24 });
      this.shopTabs.add(b);
    });
    this.shopList.removeAll(true);
    const list = ALLIES.filter(a => a.tier === this.shopTier);
    list.forEach((a, k) => {
      const y = 386 + k * 150;
      const c = this.add.container(0, 0);
      const bg = this.add.graphics();
      bg.fillStyle(0x232b33, 1);
      bg.fillRoundedRect(36, y - 66, W - 72, 136, 14);
      c.add(bg);
      this.allyFrame(c, 106, y + 2, 104, a.id);
      c.add(text(this, 176, y - 38, a.name, 30, COLOR.text, { ox: 0 }));
      c.add(text(this, 176, y - 2, `${TIERS[a.tier].name} · ${a.role || KIND_LABEL[a.kind]}`, 20, TIERS[a.tier].text, { ox: 0, strokeThickness: 0 }));
      c.add(text(this, 176, y + 26, a.desc, 19, COLOR.text, { ox: 0, strokeThickness: 0, bold: false, align: 'left' }));
      c.add(text(this, 176, y + 52, statsLine(a.kind, R.allyStats(a.id, 1)), 16, COLOR.dim, { ox: 0, strokeThickness: 0, bold: false, align: 'left' }));
      const can = g.coins >= a.price && empty > 0;
      const label = empty === 0 ? '빈 칸 없음' : `${R.formatNum(a.price)}코인`;
      const b = button(this, 614, y, 132, 76, label, () => {
        if (!can) {
          this.toast(empty === 0 ? '빈 칸이 없어요. 아군을 팔거나 옮겨 보세요.' : '코인이 부족해요');
          return;
        }
        const res = g.buy(a.id, this.shopPrefer);
        this.toast(res.msg);
        if (res.ok) {
          this.shopPrefer = -1;
          g.deselect();
          if (g.cells.every(x => x)) this.closeModal();
          else this.refreshShop();
        }
      }, { fill: can ? COLOR.green : 0x4a535c, textColor: can ? '#13200b' : '#aab3ba', size: a.price >= 1000 || empty === 0 ? 22 : 26 });
      c.add(b);
      this.shopList.add(c);
    });
  }

  // ── 아군 정보 ──
  openAllyPanel(i) {
    const g = this.game_;
    const u = g.cells[i];
    if (!u) return;
    const a = ALLY[u.id];
    const c = this.openModal();
    c.dim.setFillStyle(0x000000, 0.25);
    g.select(i);
    const top = 830;
    c.add(panel(this, W / 2, top + 210, 692, 420));
    c.add(this.add.zone(W / 2, top + 210, 692, 420).setInteractive());
    this.allyFrame(c, 110, top + 80, 120, u.id);
    c.add(text(this, 190, top + 46, a.name, 34, COLOR.text, { ox: 0 }));
    c.add(text(this, 190, top + 84, `${TIERS[a.tier].name} · ${a.role || KIND_LABEL[a.kind]} · Lv${u.level}/${MAX_ALLY_LEVEL}`, 22, TIERS[a.tier].text, { ox: 0, strokeThickness: 0 }));
    if (a.quote) c.add(text(this, 190, top + 114, `“${a.quote}”`, 20, '#ffd84a', { ox: 0, strokeThickness: 0, bold: false }));
    c.add(text(this, 190, top + (a.quote ? 142 : 122), a.desc, 21, COLOR.text, { ox: 0, strokeThickness: 0, bold: false, wrap: 480 }));
    c.add(text(this, 40, top + 182, `지금  ${statsLine(a.kind, u.st)}`, 21, COLOR.text, { ox: 0, strokeThickness: 0, bold: false }));
    const cost = R.upgradeCost(u.id, u.level);
    if (cost != null) {
      const next = R.allyStats(u.id, u.level + 1, u.buff);
      c.add(text(this, 40, top + 214, `강화  ${statsLine(a.kind, next)}`, 21, COLOR.greenText, { ox: 0, strokeThickness: 0, bold: false }));
    }
    if (u.buff > 0) c.add(text(this, 40, top + 246, `지휘관 덕분에 공격 속도 +${Math.round(u.buff * 100)}%`, 20, '#ffd84a', { ox: 0, strokeThickness: 0, bold: false }));
    const by = top + 320;
    const canUp = cost != null && g.coins >= cost;
    c.add(button(this, 150, by, 220, 84, cost == null ? '최대 레벨' : `강화 ${R.formatNum(cost)}`, () => {
      const res = g.upgrade(i);
      this.toast(res.msg || '');
      if (res.ok) this.openAllyPanel(i);
    }, { fill: canUp ? COLOR.green : 0x4a535c, textColor: canUp ? '#13200b' : '#aab3ba', size: 26 }));
    c.add(button(this, 370, by, 200, 84, '옮기기', () => {
      this.closeModal();
      g.startMove(i);
      this.toast('옮길 칸을 누르세요');
    }, { fill: COLOR.blue, textColor: '#0b1a2a', size: 28 }));
    c.add(button(this, 575, by, 190, 84, `판매 +${R.formatNum(R.sellPrice(u.id, u.level))}`, () => {
      const res = g.sell(i);
      this.toast(res.msg);
      this.closeModal();
    }, { fill: 0x8a4a3a, textColor: '#fff0ea', size: 24 }));
    c.dim.on('pointerup', () => this.closeModal());
  }

  // ── 일시정지 ──
  openPause() {
    if (this.game_.phase === 'over') return;
    const c = this.openModal();
    c.add(panel(this, W / 2, H / 2, 620, 720));
    c.add(text(this, W / 2, H / 2 - 300, '일시정지', 44, COLOR.text));
    settingsRows(this, c, W / 2, H / 2 - 170, this.save, () => writeSave());
    c.add(button(this, W / 2, H / 2 + 150, 400, 88, '계속하기', () => this.closeModal(), { size: 32 }));
    c.add(button(this, W / 2, H / 2 + 260, 400, 88, '처음 화면으로', () => this.toTitle(), { fill: 0x3a4652, textColor: '#eef3ea', size: 30 }));
  }

  toTitle() {
    this.modal = null;
    this.scene.stop('Game');
    this.scene.start('Title');
  }

  // ── 결과 ──
  showResult({ wave, cleared, kills, newBest }) {
    const c = this.openModal(false);
    c.add(panel(this, W / 2, H / 2, 620, 700));
    c.add(text(this, W / 2, H / 2 - 270, '기지가 무너졌어요', 44, '#ff8a80'));
    c.add(text(this, W / 2, H / 2 - 190, `웨이브 ${wave}에서 쓰러짐`, 30, COLOR.text));
    c.add(text(this, W / 2, H / 2 - 110, `막아낸 웨이브  ${cleared}`, 30, COLOR.greenText));
    c.add(text(this, W / 2, H / 2 - 60, `처치한 좀비  ${R.formatNum(kills)}`, 30, COLOR.text));
    c.add(text(this, W / 2, H / 2 + 0, newBest ? '최고 기록!' : `최고 기록  웨이브 ${this.save.best.wave}`, 30, newBest ? COLOR.orangeText : COLOR.dim));
    c.add(button(this, W / 2, H / 2 + 140, 400, 88, '다시 하기', () => {
      this.modal = null;
      this.game_.scene.restart();
    }, { size: 32 }));
    c.add(button(this, W / 2, H / 2 + 250, 400, 88, '처음 화면으로', () => this.toTitle(), { fill: 0x3a4652, textColor: '#eef3ea', size: 30 }));
  }
}
