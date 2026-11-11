// 전장: 가운데 3×3 기지, 사방에서 오는 좀비, 칸에 세운 아군.
// 물리 엔진 없이 직접 움직인다(배속을 dt 하나로 처리하려고).
import Phaser from 'phaser';
import { ALLY } from '../data/allies.js';
import { ZOMBIES } from '../data/zombies.js';
import * as R from '../core/rules.js';
import { loadSave, writeSave, TEST } from '../core/save.js';
import { sfx } from '../core/sfx.js';
import { W, H, FONT, josa } from '../core/ui.js';
import { TIERS } from '../data/allies.js';
import { allyView, BODY_OY } from '../render/sprites.js';
import { HeroSystem, PASSIVE_HEROES } from '../systems/heroes.js';
import { chapterAt } from '../data/story.js';
import { FoeSystem } from '../systems/foes.js';
import { perkMods, PERK } from '../data/perks.js';

export const CX = 360;
export const CY = 650;
export const CELL = 92;
export const GAP = 8;
export const HALF = (CELL * 3 + GAP * 2) / 2; // 기지 반 폭 146
const SPAWN_R = 680;
const NEAR_ONLY = new Set(['flame', 'push', 'timestop', 'stone']);
const ALLY_DY = 6; // 아군 몸 중심을 칸 가운데보다 살짝 아래로(모자 자리)

export function cellPos(i) {
  return { x: CX + ((i % 3) - 1) * (CELL + GAP), y: CY + (Math.floor(i / 3) - 1) * (CELL + GAP) };
}

// 아군이 쏠 때 나는 소리(무기마다 다르게)
function shotSound(a) {
  const st = a.stats;
  switch (a.kind) {
    case 'bullet':
      if (st.tex === 'pellet') return (st.count || 1) >= 5 ? 'shotgun' : 'sling';
      if (st.tex === 'arrow') return 'bow';
      if (st.tex === 'pan') return 'swish';
      if (st.tex === 'spit') return 'dart';
      if (st.tex === 'ice') return 'icegun';
      if (a.look.gun === 'long') return 'sniper';
      if (a.look.gun === 'heavy') return st.rate >= 5 ? 'mg' : 'rifle';
      if (a.look.gun === 'rifle') return 'rifle';
      return 'pistol';
    case 'splash':
      return { brick: 'swish', firework: 'firework', rocket: 'rocket' }[st.tex] || 'launch';
    case 'strike':
      return st.radius >= 120 ? 'radio' : 'mortar';
    case 'flame':
      return 'flame';
    case 'beam':
      return st.width >= 24 ? 'plasma' : 'laser';
    case 'chain':
      return 'zap';
    case 'aura':
      return st.slow ? 'frost' : 'tesla';
    default:
      return null;
  }
}

// 던진 것·폭격이 떨어질 때 나는 소리
function landSound(a) {
  const st = a.stats;
  if (st.tex === 'brick') return 'impact';
  if (st.tex === 'firework') return 'sparkle';
  return st.radius >= 120 ? 'bigboom' : 'boom';
}

function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  // data.preview = 아군 id → 도감 미리보기: 그 아군 하나가 끝없이 오는 좀비와 싸우는 모습만 보여 준다(기록·이야기 없음)
  create(data) {
    this.preview = data?.preview || null;
    this.mapId = !this.preview && data?.map && R.MAPS[data.map] ? data.map : 'field';
    this.map = R.MAPS[this.mapId];
    this.previewFrom = data?.from || 'book';
    this.save = loadSave();
    this.speed = 1;
    this.t = 0;
    this.wave = 0;
    this.phase = 'break';
    this.phaseLeft = R.FIRST_BREAK;
    this.coins = this.preview ? 0 : this.map.startCoins;
    // 테스트판: 고른 웨이브부터, 전장 코인 100만
    this.test = TEST && !this.preview;
    if (this.test) {
      this.coins = 1000000;
      this.wave = Math.max(0, (data?.startWave || 1) - 1);
      this.phaseLeft = 5;
    }
    this.baseMax = this.map.baseHp || R.BASE_HP; // 2번째 맵은 기지가 더 튼튼하다
    this.baseHp = this.baseMax;
    this.kills = 0;
    this.runCoins = 0; // 이번 판에 주운 코인(보유 코인에 더해진다)
    this.perks = {}; // 고른 보상 카드(id → 개수)
    this.event = null; // 이번 웨이브 이변
    this.lastEvent = null;
    this.mods = this.computeMods();
    this.cells = Array(9).fill(null);
    this.zombies = [];
    this.zPool = [];
    this.shots = [];
    this.spits = [];
    this.lobs = [];
    this.strikes = [];
    this.lines = [];
    this.flames = [];
    this.queue = [];
    this.spawnT = 0;
    this.spec = null;
    this.boss = null;
    this.selected = -1;
    this.moveFrom = -1;
    this.textCount = 0;
    this.textPool = [];

    this.add.image(W / 2, H / 2, this.map.bg).setDepth(0);
    this.scatterProps();
    this.drawBase();

    this.cellG = [];
    this.cellLv = [];
    for (let i = 0; i < 9; i++) {
      const p = cellPos(i);
      this.cellG.push(this.add.graphics().setDepth(3));
      this.cellLv.push(
        this.add
          .text(p.x + CELL / 2 - 6, p.y + CELL / 2 - 4, '', { fontFamily: FONT, fontSize: '18px', fontStyle: 'bold', color: '#ffffff', stroke: '#0b0e12', strokeThickness: 4 })
          .setOrigin(1, 1)
          .setDepth(7),
      );
      const zone = this.add.zone(p.x, p.y, CELL, CELL).setInteractive({ useHandCursor: true });
      zone.on('pointerup', () => this.onCellTap(i));
      this.drawCell(i);
    }
    this.rangeG = this.add.graphics().setDepth(4);
    this.lineG = this.add.graphics().setDepth(9);
    this.heroes = new HeroSystem(this, { CX, CY, HALF, cellPos });
    this.foes = new FoeSystem(this, { CX, CY, rain: this.map.rain || 0, tint: this.map.tint || 0 });

    this.applySpeed();
    this.scene.launch('UI');
    this.ui = this.scene.get('UI');
    if (this.preview) this.setupPreview(this.preview);
  }

  // ── 도감 미리보기 ──
  // 가운데 칸에 그 아군을 세우고, 등급에 맞는 좀비를 끝없이 보낸다. 기지는 무너지지 않는다.
  setupPreview(id) {
    const a = ALLY[id];
    // 옆 칸이 있어야 보이는 능력(지휘관·메아리술사)은 신입 경비 넷을 옆에 세운다
    if (a.kind === 'buff' || a.kind === 'echo') for (const k of [1, 3, 5, 7]) this.putAlly(k, 'guard');
    this.putAlly(4, id);
    // 기지 체력이 줄어야 보이는 능력은 기지가 깎인 채로 시작
    if (['repair', 'pact', 'phoenix', 'mirror'].includes(a.kind)) this.baseHp = Math.round(this.baseMax * 0.4);
    this.wave = 1 + a.tier * 2;
    this.phase = 'wave';
    this.spec = R.waveSpec(this.wave);
    this.queue = [];
    this.spawnT = 0.6;
    if (a.hero) {
      this.time.delayedCall(350, () => {
        this.heroes.arrival(4);
        this.ui.heroCutIn(id, '합류');
      });
    }
  }

  putAlly(i, id) {
    const u = { id, level: 1, cd: 0, t: 0, sprite: null, aura: null };
    this.cells[i] = u;
    this.placeSprite(i, u);
    this.refreshStats();
    this.drawCell(i);
    return u;
  }

  // ── 배경 ──
  scatterProps() {
    const r = seeded(Math.floor(Math.random() * 1e9));
    const kinds = this.map.props;
    const mall = this.mapId === 'mall'; // 상점가는 양옆 가게 지붕 위에는 놓지 않는다
    let placed = 0;
    for (let tries = 0; placed < 16 && tries < 300; tries++) {
      const x = mall ? 160 + r() * (W - 320) : 30 + r() * (W - 60);
      const y = 170 + r() * (H - 340);
      if (Math.abs(x - CX) < HALF + 90 && Math.abs(y - CY) < HALF + 90) continue;
      this.add.image(x, y, kinds[Math.floor(r() * kinds.length)]).setRotation(r() * Math.PI * 2).setDepth(1).setAlpha(0.95);
      placed++;
    }
  }

  drawBase() {
    const g = this.add.graphics().setDepth(2);
    const pad = HALF + 22;
    g.fillStyle(0x000000, 0.3);
    g.fillRoundedRect(CX - pad + 6, CY - pad + 8, pad * 2, pad * 2, 20);
    g.fillStyle(0x4a5056, 1);
    g.fillRoundedRect(CX - pad, CY - pad, pad * 2, pad * 2, 20);
    g.fillStyle(0x5a6168, 1);
    g.fillRoundedRect(CX - pad + 8, CY - pad + 8, pad * 2 - 16, pad * 2 - 16, 14);
    // 모래주머니 테두리
    const step = 26;
    for (let s = -pad + 10; s <= pad - 10; s += step) {
      for (const [x, y] of [[CX + s, CY - pad], [CX + s, CY + pad], [CX - pad, CY + s], [CX + pad, CY + s]]) {
        g.fillStyle(0x2a2620, 1);
        g.fillEllipse(x + 1, y + 2, 26, 18);
        g.fillStyle(0xb39a6a, 1);
        g.fillEllipse(x, y, 24, 16);
        g.fillStyle(0xc9b183, 1);
        g.fillEllipse(x - 3, y - 3, 10, 6);
      }
    }
  }

  drawCell(i) {
    const g = this.cellG[i];
    const p = cellPos(i);
    const u = this.cells[i];
    g.clear();
    g.fillStyle(0x1e252c, 0.92);
    g.fillRoundedRect(p.x - CELL / 2, p.y - CELL / 2, CELL, CELL, 12);
    let edge = 0x36424e;
    let width = 3;
    if (u) edge = TIERS[ALLY[u.id].tier].color;
    if (i === this.selected || i === this.moveFrom) {
      edge = 0xffffff;
      width = 5;
    } else if (this.moveFrom >= 0) {
      edge = 0x9be15d;
      width = 4;
    }
    g.lineStyle(width, edge, 1);
    g.strokeRoundedRect(p.x - CELL / 2, p.y - CELL / 2, CELL, CELL, 12);
    if (!u) {
      g.lineStyle(3, 0x36424e, 1);
      g.lineBetween(p.x - 10, p.y, p.x + 10, p.y);
      g.lineBetween(p.x, p.y - 10, p.x, p.y + 10);
    }
    this.cellLv[i].setText(u ? `Lv${u.level}` : '');
  }

  // ── 칸 조작 ──
  onCellTap(i) {
    if (this.phase === 'over') return;
    if (this.moveFrom >= 0) {
      const from = this.moveFrom;
      this.moveFrom = -1;
      if (i !== from) {
        [this.cells[from], this.cells[i]] = [this.cells[i], this.cells[from]];
        for (const k of [from, i]) {
          const u = this.cells[k];
          if (u) this.placeSprite(k, u);
        }
        this.refreshStats();
        this.snd('click');
        this.ui.toast('자리를 옮겼어요');
      }
      for (let k = 0; k < 9; k++) this.drawCell(k);
      return;
    }
    const u = this.cells[i];
    // 각성 게이지가 가득 찬 영웅을 누르면 바로 각성
    if (u && ALLY[u.id].hero && u.gauge >= 100 && this.phase === 'wave') {
      this.awaken(i);
      return;
    }
    if (this.preview) {
      if (u && ALLY[u.id].hero && !u.awakeUntil) this.ui.toast(`각성 게이지 ${Math.floor(u.gauge || 0)}% · 가득 차면 눌러서 각성`);
      return;
    }
    if (u) this.ui.openAllyPanel(i);
    else this.ui.openShop(i);
  }

  firstEmpty() {
    return this.cells.findIndex(c => !c);
  }

  buy(id, prefer = -1) {
    const a = ALLY[id];
    if (!R.isUnlocked(this.save, id)) return { ok: false, msg: '메인 화면 상점에서 먼저 해금해야 해요' };
    if (this.coins < a.price) return { ok: false, msg: '코인이 부족해요' };
    let i = prefer >= 0 && !this.cells[prefer] ? prefer : this.firstEmpty();
    if (i < 0) return { ok: false, msg: '빈 칸이 없어요. 아군을 팔거나 옮겨 보세요.' };
    this.coins -= a.price;
    const u = { id, level: 1, cd: 0, t: 0, sprite: null, aura: null };
    this.cells[i] = u;
    this.placeSprite(i, u);
    this.refreshStats();
    this.drawCell(i);
    this.snd('coin');
    return { ok: true, cell: i, hero: !!a.hero, msg: `${a.name} 배치 완료!` };
  }

  placeSprite(i, u) {
    const p = cellPos(i);
    // 처음엔 기지 바깥쪽을 본다(가운데 칸은 위)
    const outward = i === 4 ? -Math.PI / 2 : Math.atan2(p.y - CY, p.x - CX);
    if (!u.sprite) {
      u.sprite = allyView(this, p.x, p.y + ALLY_DY, u.id).setScale(0.6);
      u.aim = outward;
      u.sprite.aimAt(outward);
      this.tweens.add({ targets: u.sprite, scale: 1, duration: 220, ease: 'Back.Out' });
    } else {
      u.sprite.setPosition(p.x, p.y + ALLY_DY);
    }
    u.sprite.setDepth(6 + p.y * 1e-4);
    if (ALLY[u.id].kind === 'aura') {
      if (!u.aura) u.aura = this.add.image(p.x, p.y, 'aura').setDepth(4).setAlpha(0.55);
      u.aura.setPosition(p.x, p.y);
    }
  }

  removeAlly(i) {
    const u = this.cells[i];
    if (!u) return;
    u.sprite?.destroy();
    u.aura?.destroy();
    this.cells[i] = null;
    this.refreshStats();
    this.drawCell(i);
  }

  upgrade(i) {
    const u = this.cells[i];
    if (!u) return { ok: false };
    const cost = R.upgradeCost(u.id, u.level);
    if (cost == null) return { ok: false, msg: '이미 최대 레벨이에요' };
    if (this.coins < cost) return { ok: false, msg: '코인이 부족해요' };
    this.coins -= cost;
    u.level++;
    this.refreshStats();
    this.drawCell(i);
    this.tweens.add({ targets: u.sprite, scale: 1.15, duration: 120, yoyo: true });
    this.snd('level');
    return { ok: true, msg: `${ALLY[u.id].name} Lv${u.level}!` };
  }

  sell(i) {
    const u = this.cells[i];
    if (!u) return { ok: false };
    const price = R.sellPrice(u.id, u.level);
    this.coins += price;
    this.removeAlly(i);
    this.snd('coin');
    return { ok: true, msg: `${price}코인에 팔았어요` };
  }

  startMove(i) {
    this.moveFrom = i;
    for (let k = 0; k < 9; k++) this.drawCell(k);
  }

  select(i) {
    this.selected = i;
    for (let k = 0; k < 9; k++) this.drawCell(k);
    this.rangeG.clear();
    const u = this.cells[i];
    if (!u) return;
    const p = cellPos(i);
    const st = u.st;
    const kind = ALLY[u.id].kind;
    if (st.range && st.range < 1500) {
      this.rangeG.fillStyle(0xffffff, 0.06);
      this.rangeG.fillCircle(p.x, p.y, st.range);
      this.rangeG.lineStyle(3, 0xffffff, 0.45);
      this.rangeG.strokeCircle(p.x, p.y, st.range);
    }
    if (kind === 'buff' || kind === 'echo') {
      for (const n of R.neighbors(i)) {
        const q = cellPos(n);
        this.rangeG.lineStyle(4, 0xffd84a, 0.9);
        this.rangeG.strokeRoundedRect(q.x - CELL / 2 + 4, q.y - CELL / 2 + 4, CELL - 8, CELL - 8, 10);
      }
    }
  }

  deselect() {
    this.selected = -1;
    this.rangeG.clear();
    for (let k = 0; k < 9; k++) this.drawCell(k);
  }

  cellPos(i) {
    return cellPos(i);
  }

  allyName(i) {
    return this.cells[i] ? ALLY[this.cells[i].id].name : '';
  }

  // 테스트판: 지금 좀비를 모두 치우고 다음 거대 좀비 웨이브로
  jumpToBoss() {
    for (const z of this.zombies) {
      if (z.dead) continue;
      z.dead = true;
      z.setVisible(false).setActive(false);
      this.foes.removed(z);
      this.zPool.push(z);
    }
    this.zombies = [];
    this.queue = [];
    this.boss = null;
    for (const sp of this.spits) sp.img.destroy();
    this.spits = [];
    this.wave = Math.ceil((this.wave + 1) / R.BOSS_EVERY) * R.BOSS_EVERY - 1;
    this.event = null;
    this.updateMods();
    this.foes.applyEvent(null);
    this.phase = 'break';
    this.phaseLeft = 0.5;
  }

  // 보상 카드 + 이번 웨이브 이변을 합친 배율
  computeMods() {
    const p = perkMods(this.perks);
    const e = this.event ? R.EVENTS[this.event] : {};
    return {
      ...p,
      range: p.range * (e.range || 1),
      coin: p.coin * (e.coin || 1),
      zSpeed: e.zSpeed || 1,
      zDmg: e.zDmg || 1,
      zHp: e.hp || 1,
      zSize: e.size || 1,
      count: e.count || 1,
    };
  }

  updateMods() {
    this.mods = this.computeMods();
    this.refreshStats();
  }

  // 보상 카드를 하나 받는다(같은 카드는 겹쳐진다)
  addPerk(id) {
    this.perks[id] = (this.perks[id] || 0) + 1;
    if (id === 'wall') {
      this.baseMax += 100;
      this.baseHp = Math.min(this.baseMax, this.baseHp + 100);
    }
    if (id === 'loot') this.coins += this.wave * 80;
    this.updateMods();
    this.snd('level');
    this.ui.toast(`${PERK[id].name} · ${PERK[id].desc}`);
  }

  refreshStats() {
    const m = this.mods;
    for (let i = 0; i < 9; i++) {
      const u = this.cells[i];
      if (!u) continue;
      u.buff = R.rateBuffAt(this.cells, i);
      u.st = R.allyStats(u.id, u.level, u.buff);
      if (ALLY[u.id].hero && u.awakeUntil > this.t) u.st = R.awakenStats(u.st); // 각성 중
      if (m) {
        if (u.st.rate) u.st.rate *= m.rate;
        // 그림자 군주의 range는 칼날이 도는 둘레라서 그대로 둔다
        if (u.st.range && ALLY[u.id].kind !== 'sweep') u.st.range = Math.round(u.st.range * m.range);
      }
      if (u.aura) u.aura.setScale(u.st.range / 128);
    }
    this.heroes?.refresh();
  }

  // ── 각성 ──
  // 웨이브 중에 영웅의 게이지가 차오르고, 가득 차면 눌러서 각성한다(8초 동안 능력 폭주)
  updateAwaken(dt) {
    let changed = false;
    for (let i = 0; i < 9; i++) {
      const u = this.cells[i];
      if (!u || !ALLY[u.id].hero) continue;
      if (u.awakeUntil && this.t >= u.awakeUntil) {
        u.awakeUntil = 0;
        changed = true;
        this.tweens.add({ targets: u.sprite, scale: 1, duration: 300 });
      }
      if (this.phase !== 'wave' || u.awakeUntil) continue;
      const before = u.gauge || 0;
      u.gauge = Math.min(100, before + ((dt * 100) / R.AWAKEN_CHARGE) * (this.preview ? 5 : 1) * this.mods.gauge);
      if (before < 100 && u.gauge >= 100) {
        this.snd('sparkle', cellPos(i).x);
        this.ui.toast(`${ALLY[u.id].name} 각성 준비! 눌러서 각성`);
      }
    }
    if (changed) this.refreshStats();
  }

  awaken(i) {
    const u = this.cells[i];
    u.gauge = 0;
    u.awakeUntil = this.t + R.AWAKEN_TIME;
    this.refreshStats();
    this.tweens.add({ targets: u.sprite, scale: 1.18, duration: 250, ease: 'Back.Out' });
    this.ui.heroCutIn(u.id, '각성');
    this.heroes.awakenBurst(u, i);
    this.snd('bigboom', cellPos(i).x);
  }

  setSpeed(s) {
    this.speed = s;
    this.applySpeed();
  }

  applySpeed() {
    this.tweens.timeScale = this.speed;
  }

  skipBreak() {
    if (this.phase === 'break') this.phaseLeft = 0;
  }

  // ── 웨이브 ──
  startWave() {
    this.wave++;
    this.phase = 'wave';
    this.spec = R.waveSpec(this.wave);
    // 31웨이브부터는 웨이브마다 이변이 하나
    this.event = R.waveEvent(this.wave + this.map.shift, this.lastEvent);
    if (this.event) this.lastEvent = this.event;
    this.updateMods();
    this.foes.applyEvent(this.event);
    this.queue = [];
    const count = Math.max(1, Math.round(this.spec.count * this.mods.count));
    for (let k = 0; k < count; k++) this.queue.push(R.pickZombie(this.wave + this.map.shift));
    const bossKind = this.spec.boss ? R.bossKind(this.wave) : null;
    if (bossKind) this.queue.splice(Math.floor(this.queue.length * 0.3), 0, bossKind);
    this.spawnT = 0;
    const ev = this.event ? R.EVENTS[this.event] : null;
    if (this.wave === R.FINAL_WAVE) this.ui.banner(`웨이브 ${this.wave} · 마지막 밤\n${josa(ZOMBIES[bossKind].name, '이', '가')} 다가와요`);
    else if (bossKind) this.ui.banner(`웨이브 ${this.wave} · ${ZOMBIES[bossKind].name} 등장!`);
    else if (ev) this.ui.banner(`웨이브 ${this.wave} · ${ev.name}\n${ev.desc}`);
    else this.ui.banner(`웨이브 ${this.wave}`);
    // 이야기: 이 웨이브에 장이 있고 아직 못 봤으면 배너 뒤에 보여 준다
    const ch = chapterAt(this.wave);
    if (ch && !this.save.story.seen.includes(ch.wave)) {
      this.save.story.seen.push(ch.wave);
      writeSave();
      this.time.delayedCall(2300 / this.speed, () => this.ui.chapter(ch));
    }
    this.snd(this.spec.boss ? 'boss' : 'wave');
    if (this.wave >= R.MAP2_WAVE && !this.preview && !this.save.meta.map2) {
      this.save.meta.map2 = true;
      writeSave();
      this.time.delayedCall(2600 / this.speed, () => this.ui.toast(`두 번째 맵 「${R.MAPS.mall.name}」${josa(R.MAPS.mall.name, '이', '가').slice(-1)} 열렸어요!`));
    }
  }

  endWave() {
    const bonus = R.waveBonus(this.wave);
    this.coins += bonus;
    this.phase = 'break';
    this.phaseLeft = R.BREAK_TIME;
    const fix = Math.max(0, Math.round(Math.min(this.baseMax - this.baseHp, this.baseMax * (R.WAVE_REPAIR + this.mods.repair))));
    this.baseHp = Math.min(this.baseMax, this.baseHp + fix);
    this.ui.banner(`웨이브 ${this.wave} 막아냄!  +${bonus}코인${fix > 0 ? `
기지 수리 +${fix}` : ''}`);
    this.snd('win');
    writeSave(); // 주운 코인 저장
    // 화면에 남은 침은 치운다
    for (const s of this.spits) s.img.destroy();
    this.spits = [];
    this.heroes.clearWave();
    // 이변은 웨이브가 끝나면 걷힌다
    const wasBoss = this.spec?.boss;
    this.event = null;
    this.updateMods();
    this.foes.applyEvent(null);
    // 거대 좀비 웨이브를 막으면 보상 카드 3장 중 하나를 고른다
    if (wasBoss && !this.preview) this.ui.offerPerks();
  }

  gameOver() {
    if (this.phase === 'over') return;
    this.phase = 'over';
    const cleared = Math.max(0, this.wave - 1);
    if (this.mapId === 'mall') this.save.best2 ??= { wave: 0, kills: 0 };
    const best = this.mapId === 'mall' ? this.save.best2 : this.save.best;
    const newBest = cleared > (best.wave || 0);
    const runCoins = this.runCoins;
    best.wave = Math.max(best.wave || 0, cleared);
    best.kills = Math.max(best.kills || 0, this.kills);
    writeSave();
    this.snd('lose');
    this.ui.showResult({ wave: this.wave, cleared, kills: this.kills, newBest, runCoins, bestWave: best.wave });
  }

  // at = {x, y}: 그 자리에서 나온다(소환·분열). 없으면 화면 밖 둘레에서.
  spawnZombie(kind, at = null) {
    const def = ZOMBIES[kind];
    const a = at ? Math.atan2(at.y - CY, at.x - CX) : Math.random() * Math.PI * 2;
    const x = at ? at.x : CX + Math.cos(a) * SPAWN_R;
    const y = at ? at.y : CY + Math.sin(a) * SPAWN_R;
    let z = this.zPool.pop();
    if (!z) z = this.add.image(0, 0, def.tex);
    z.setTexture(def.tex).setPosition(x, y).setVisible(true).setActive(true).setDepth(def.boss ? 5.5 : 5).clearTint().setAlpha(1);
    z.kind = kind;
    z.def = def;
    const m = this.mods;
    z.hp = z.maxHp = Math.max(1, Math.round(R.zombieHp(kind, this.wave) * (def.boss ? 1 : m.zHp * this.map.hp)));
    z.dmg = def.damage * R.damageMul(this.wave) * m.zDmg * this.map.dmg;
    z.r = def.radius;
    z.dead = false;
    z.slow = 0;
    z.slowUntil = 0;
    z.poison = 0;
    z.poisonUntil = 0;
    z.atkT = 0.5;
    z.tinted = false;
    z.incoming = 0;
    z.attacking = false;
    z.spitT = 1 + Math.random() * 2;
    // 영웅 능력 상태(조종·정지·밀려남·역병)
    z.puppet = null;
    z.frozenUntil = 0;
    z.vuln = 0;
    z.knockT = 0;
    z.plague = null;
    z.sleepUntil = 0;
    z.wake = 0;
    z.frogUntil = 0;
    z.stone = 0;
    z.petrified = 0;
    z.caughtBy = null;
    z.tornadoHit = 0;
    const size = def.boss ? 1 : m.zSize;
    z.r = def.radius * size;
    z.setOrigin(0.5, BODY_OY).setRotation(0).setScale(size).setFlipX(Math.cos(a + Math.PI) < 0);
    this.foes.spawned(z);
    this.zombies.push(z);
    if (def.boss) {
      this.boss = z;
      this.ui.banner(`${josa(def.name, '이', '가')} 나타났어요!`);
    }
  }

  // ── 매 프레임 ──
  update(_time, deltaMs) {
    // 배속이 높거나 프레임이 느려도 총알이 좀비를 건너뛰지 않게 잘게 나눠 돌린다
    // timeWarp: 영웅 등장·각성 장면에서 잠깐 느려지는 시간
    let left = (Math.min(deltaMs, 50) / 1000) * this.speed * (this.timeWarp ?? 1);
    while (left > 0 && this.phase !== 'over') {
      const dt = Math.min(left, 0.02);
      left -= dt;
      this.step(dt);
    }
  }

  step(dt) {
    this.t += dt;

    if (this.phase === 'break') {
      this.phaseLeft -= dt;
      if (this.phaseLeft <= 0) this.startWave();
    } else if (this.phase === 'wave') {
      if (this.preview && this.queue.length < 3) for (let k = 0; k < 10; k++) this.queue.push(R.pickZombie(this.wave));
      this.spawnT -= dt;
      if (this.spawnT <= 0 && this.queue.length && this.zombies.length < R.MAX_ALIVE) {
        this.spawnZombie(this.queue.shift());
        this.spawnT = this.spec.interval * (0.6 + Math.random() * 0.8);
      }
    }

    this.updateZombies(dt);
    this.updateAllies(dt);
    this.updateAwaken(dt);
    this.heroes.update(dt);
    this.updateShots(dt);
    this.updateLobs(dt);
    this.updateStrikes(dt);
    this.updateSpits(dt);
    this.updateFlames(dt);
    this.drawLines(dt);
    this.foes.draw(dt);

    if (this.zombies.some(z => z.dead)) this.zombies = this.zombies.filter(z => !z.dead);
    if (this.phase === 'wave') {
      this.heroes.releaseIfOnlyPuppets();
      if (this.zombies.some(z => z.dead)) this.zombies = this.zombies.filter(z => !z.dead);
    }

    if (this.phase === 'wave' && this.queue.length === 0 && this.zombies.length === 0) this.endWave();
    if (this.baseHp <= 0) {
      if (this.preview) this.baseHp = this.baseMax;
      else this.gameOver();
    }
  }

  updateZombies(dt) {
    const zs = this.zombies;
    for (const z of zs) {
      if (z.dead) continue;
      if (z.poisonUntil > this.t) this.hurt(z, z.poison * dt, { quiet: true });
      if (z.dead) continue;
      const slow = z.slowUntil > this.t ? z.slow : 0;
      if (z.tinted && z.slowUntil <= this.t && z.poisonUntil <= this.t && !this.heroes.holdsTint(z)) {
        z.tinted = false;
        z.clearTint();
      }
      const dx = CX - z.x;
      const dy = CY - z.y;
      const edge = Math.max(Math.abs(dx), Math.abs(dy)) - HALF;
      z.setDepth((z.def.boss ? 5.5 : 5) + z.y * 1e-5);
      // 영웅 능력에 붙잡힌 좀비(정지·중력장·밀려남·꼭두각시)는 스스로 못 움직인다
      if (this.heroes.controls(z, dt)) continue;
      z.setFlipX(dx < 0);
      const spit = z.def.spit;
      z.attacking = edge <= (spit ? spit.keep : z.r + 12);
      if (this.foes.update(z, dt, edge)) continue; // 배달 기사 거인이 힘을 모으거나 달려드는 중
      if (spit && edge <= spit.keep) {
        z.spitT -= dt * (1 - slow);
        if (z.spitT <= 0) {
          z.spitT = spit.cooldown;
          this.enemySpit(z);
        }
        continue;
      }
      if (edge <= z.r * 0.7) {
        z.atkT -= dt * (1 - slow);
        if (z.atkT <= 0) {
          z.atkT = 1;
          this.damageBase(z.dmg, z);
          const la = Math.atan2(dy, dx);
          this.tweens.add({ targets: z, x: z.x + Math.cos(la) * 6, y: z.y + Math.sin(la) * 6, duration: 80, yoyo: true });
        }
        continue;
      }
      const d = Math.hypot(dx, dy) || 1;
      const v = z.def.speed * this.mods.zSpeed * this.foes.speedMul(z) * (1 - slow) * (1 - this.heroes.globalSlow) * dt;
      z.x += (dx / d) * v;
      z.y += (dy / d) * v;
    }
    // 서로 겹치지 않게 밀어내기
    for (let i = 0; i < zs.length; i++) {
      const a = zs[i];
      if (a.dead) continue;
      for (let j = i + 1; j < zs.length; j++) {
        const b = zs[j];
        if (b.dead) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const min = (a.r + b.r) * 0.85;
        const d2 = dx * dx + dy * dy;
        if (d2 >= min * min || d2 === 0) continue;
        const d = Math.sqrt(d2);
        const push = (min - d) / d;
        const wa = this.heroes.weight(a);
        const wb = this.heroes.weight(b);
        a.x -= dx * push * wa;
        a.y -= dy * push * wa;
        b.x += dx * push * wb;
        b.y += dy * push * wb;
      }
    }
    // 기지 안으로는 못 들어온다
    for (const z of zs) {
      const lim = HALF + z.r * 0.5;
      const dx = z.x - CX;
      const dy = z.y - CY;
      if (Math.abs(dx) < lim && Math.abs(dy) < lim) {
        if (Math.abs(dx) > Math.abs(dy)) z.x = CX + Math.sign(dx || 1) * lim;
        else z.y = CY + Math.sign(dy || 1) * lim;
      }
    }
  }

  enemySpit(z) {
    const sp = z.def.spit;
    const n = sp.count || 1;
    const base = Math.atan2(CY - z.y, CX - z.x);
    for (let k = 0; k < n; k++) {
      const a = base + (k - (n - 1) / 2) * (sp.spread || 0);
      const img = this.add.image(z.x, z.y, 'spit').setDepth(7).setScale(sp.scale || 1);
      this.spits.push({ img, vx: Math.cos(a) * sp.speed, vy: Math.sin(a) * sp.speed, dmg: z.dmg / n, from: z });
    }
  }

  updateSpits(dt) {
    for (const s of this.spits) {
      s.img.x += s.vx * dt;
      s.img.y += s.vy * dt;
      if (Math.max(Math.abs(s.img.x - CX), Math.abs(s.img.y - CY)) <= HALF + 10) {
        this.damageBase(s.dmg, s.from);
        this.puff(s.img.x, s.img.y, 0.5, 0x9fd13a);
        s.img.destroy();
        s.done = true;
      }
    }
    if (this.spits.some(s => s.done)) this.spits = this.spits.filter(s => !s.done);
  }

  // 기지 체력은 항상 정수(가장 작은 단위 1)
  // from = 때린 좀비(거울 기사가 되갚는다)
  damageBase(n, from = null) {
    n = this.heroes.onBaseHit(n, from);
    this.baseHp = Math.max(0, this.baseHp - Math.max(1, Math.round(n)));
    this.heroes.checkPhoenix();
    this.snd('hurt');
    if (this.save.settings.flash) this.cameras.main.shake(90, 0.004);
  }

  // ── 아군 ──
  findTarget(p, st) {
    let best = null;
    let bestScore = Infinity;
    const r2 = st.range * st.range;
    let fallback = null;
    for (const z of this.zombies) {
      if (z.dead || z.puppet || z.petrified) continue; // 꼭두각시는 우리 편, 돌은 곧 부서진다
      const dx = z.x - p.x;
      const dy = z.y - p.y;
      const d2 = dx * dx + dy * dy;
      // 기지를 공격 중인 좀비(달라붙었거나 침을 뱉는 중)는 사거리와 상관없이 누구나 노릴 수 있다(화염만 예외)
      if (d2 > r2 && (st.noReach || !z.attacking)) continue;
      let score;
      if (st.target === 'strong') score = -z.hp;
      else if (st.target === 'far') score = -Math.hypot(z.x - CX, z.y - CY);
      else score = Math.hypot(z.x - CX, z.y - CY); // 기지에 가장 가까운 좀비
      // 이미 날아가는 총알로 쓰러질 좀비는 다른 아군에게 양보(헛방 줄이기)
      if (z.incoming >= z.hp) {
        fallback = fallback || z;
        continue;
      }
      if (score < bestScore) {
        bestScore = score;
        best = z;
      }
    }
    return best || fallback;
  }

  updateAllies(dt) {
    for (let i = 0; i < 9; i++) {
      const u = this.cells[i];
      if (!u) continue;
      const a = ALLY[u.id];
      const st = u.st;
      const p = cellPos(i);
      if (u.frozenUntil > this.t) continue; // 소방관 거인의 소화기 거품에 덮였다
      if (a.kind === 'repair') {
        // 시간을 모았다가 1씩 고친다(기지 체력에 소수점이 생기지 않게)
        u.fix = (u.fix || 0) + st.hps * dt;
        const whole = Math.floor(u.fix);
        if (whole > 0) {
          u.fix -= whole;
          if (this.baseHp > 0) this.baseHp = Math.min(this.baseMax, this.baseHp + whole);
        }
        continue;
      }
      if (a.kind === 'money') {
        u.t += dt;
        if (u.t >= st.every) {
          u.t -= st.every;
          this.coins += st.coins;
          this.floatText(p.x, p.y - 40, `+${st.coins}`, '#ffd84a', 24, true);
        }
        continue;
      }
      if (a.kind === 'buff' || PASSIVE_HEROES.has(a.kind)) continue; // 메아리·거울·영혼·용·유령은 스스로 노리지 않는다
      u.cd -= dt * this.foes.allyRateMul(); // 검은 비가 오면 느려진다
      if (a.kind === 'aura') {
        if (u.cd <= 0) {
          const hit = this.zombies.filter(z => !z.dead && Math.hypot(z.x - p.x, z.y - p.y) <= st.range + z.r * 0.5);
          if (hit.length) {
            u.cd = 1 / st.rate;
            for (const z of hit.slice(0, 12)) this.lines.push({ pts: this.zigzag(p.x, p.y, z.x, z.y), color: a.look.glow, width: 2, life: 0.25, max: 0.25 });
            for (const z of hit) this.hurt(z, st.dmg, { slow: st.slow, slowTime: st.slowTime });
            this.snd(shotSound(a), p.x);
          }
        }
        continue;
      }
      // 화염·밀쳐 내기·시간 정지는 정말 사거리 안에 좀비가 있을 때만 쓴다
      const target = this.findTarget(p, NEAR_ONLY.has(a.kind) ? { ...st, noReach: true } : st);
      if (!target) {
        if (u.cd < 0) u.cd = 0;
        continue;
      }
      const ang = Math.atan2(target.y - p.y, target.x - p.x);
      u.aim = Phaser.Math.Angle.RotateTo(u.aim, ang, 12 * dt);
      u.sprite.aimAt(u.aim);
      if (u.cd <= 0) {
        u.cd += 1 / st.rate;
        if (u.cd < 0) u.cd = 0;
        this.fire(u, a, st, p, target, ang, i);
      }
    }
  }

  // 총알 한 발. aim이 있으면 그 좀비에게 '날아가는 피해'로 잡아 둔다(헛방 줄이기).
  shootBullet(mx, my, an, aim, st) {
    const speed = st.speed || 620;
    const img = this.add.image(mx, my, st.tex || 'bullet').setDepth(7).setRotation(an);
    if (aim) aim.incoming += st.dmg;
    this.shots.push({
      img, aim, vx: Math.cos(an) * speed, vy: Math.sin(an) * speed, dmg: st.dmg, pierce: st.pierce || 1, hit: new Set(),
      life: st.life || (Math.max(st.range, 560) / speed) * 1.25, slow: st.slow, slowTime: st.slowTime, poison: st.poison, poisonTime: st.poisonTime,
      plague: st.plague ? { dps: st.poison, time: st.poisonTime, spread: st.spread } : null,
      spin: st.spin || st.tex === 'pan' || st.tex === 'brick',
    });
  }

  // i = 쏘는 칸. echo = 메아리술사가 따라 쏘는 것(메아리가 또 메아리치지 않게)
  fire(u, a, st, p, target, ang, i, echo = false) {
    const mx = p.x + Math.cos(ang) * 30;
    const my = p.y + Math.sin(ang) * 30;
    if (!echo) this.heroes.onAllyFire(i, a);
    switch (a.kind) {
      case 'bullet': {
        const n = st.count || 1;
        for (let k = 0; k < n; k++) {
          let an = ang;
          if (n > 1) an += (k - (n - 1) / 2) * ((st.spread || 0.15) / Math.max(1, n - 1)) * (n > 2 ? 1 : 1.5);
          else if (st.spread) an += (Math.random() - 0.5) * st.spread;
          this.shootBullet(mx, my, an, k === Math.floor(n / 2) || n === 1 ? target : null, st);
        }
        this.snd(shotSound(a), p.x);
        break;
      }
      case 'splash': {
        const speed = st.speed || 380;
        const tx = target.x;
        const ty = target.y;
        const time = Math.max(0.15, Math.hypot(tx - mx, ty - my) / speed);
        const img = this.add.image(mx, my, st.tex || 'grenade').setDepth(7).setRotation(ang);
        target.incoming += st.dmg;
        this.lobs.push({ img, aim: target, sx: mx, sy: my, tx, ty, time, el: 0, dmg: st.dmg, radius: st.radius, spin: st.tex !== 'rocket' && st.tex !== 'firework', color: st.tex === 'firework' ? 0xff7ad1 : 0xffa040, snd: landSound(a) });
        this.snd(shotSound(a), p.x);
        break;
      }
      case 'strike': {
        const ring = this.add.image(target.x, target.y, 'ring').setDepth(4.5).setTint(0xff6a5a).setAlpha(0.7).setScale(0.2);
        this.strikes.push({ target, x: target.x, y: target.y, el: 0, delay: st.delay, dmg: st.dmg, radius: st.radius, ring, snd: landSound(a) });
        this.snd(shotSound(a), p.x);
        break;
      }
      case 'flame': {
        const arc = Phaser.Math.DegToRad(st.arc) / 2;
        for (const z of this.zombies) {
          if (z.dead) continue;
          const d = Math.hypot(z.x - p.x, z.y - p.y);
          if (d > st.range + z.r) continue;
          const diff = Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(z.y - p.y, z.x - p.x) - ang));
          if (diff <= arc) this.hurt(z, st.dmg, { quiet: true });
        }
        if (this.flames.length < 90) {
          const an = ang + (Math.random() - 0.5) * arc * 1.6;
          const img = this.add.image(mx, my, 'fire').setDepth(6.5).setScale(0.12).setAlpha(0.85);
          this.flames.push({ img, vx: Math.cos(an) * st.range * 2.6, vy: Math.sin(an) * st.range * 2.6, life: 0.36, max: 0.36 });
        }
        this.snd('flame', p.x);
        break;
      }
      case 'beam': {
        const reach = Math.max(st.range, Math.hypot(target.x - p.x, target.y - p.y) + 30);
        const ex = p.x + Math.cos(ang) * reach;
        const ey = p.y + Math.sin(ang) * reach;
        for (const z of this.zombies) {
          if (z.dead) continue;
          if (distToSeg(z.x, z.y, mx, my, ex, ey) <= st.width / 2 + z.r) this.hurt(z, st.dmg);
        }
        this.lines.push({ pts: [mx, my, ex, ey], color: a.look.glow || 0xffffff, width: st.width * 0.6, life: 0.3, max: 0.3 });
        this.lines.push({ pts: [mx, my, ex, ey], color: 0xffffff, width: st.width * 0.2, life: 0.2, max: 0.2 });
        this.snd(shotSound(a), p.x);
        break;
      }
      case 'chain': {
        const hit = new Set();
        let cur = target;
        let px = mx;
        let py = my;
        let dmg = st.dmg;
        for (let j = 0; j <= st.jumps && cur; j++) {
          hit.add(cur);
          this.lines.push({ pts: this.zigzag(px, py, cur.x, cur.y), color: 0xfff27a, width: 3, life: 0.25, max: 0.25 });
          px = cur.x;
          py = cur.y;
          this.hurt(cur, dmg);
          dmg *= 0.85;
          let next = null;
          let nd = st.jumpRange;
          for (const z of this.zombies) {
            if (z.dead || hit.has(z)) continue;
            const d = Math.hypot(z.x - px, z.y - py);
            if (d < nd) {
              nd = d;
              next = z;
            }
          }
          cur = next;
        }
        this.snd('zap', p.x);
        break;
      }
      default:
        // 전설·신화 영웅의 고유 능력
        this.heroes.fire(u, a, st, p, target, ang, i);
        break;
    }
  }

  updateShots(dt) {
    for (const s of this.shots) {
      s.img.x += s.vx * dt;
      s.img.y += s.vy * dt;
      if (s.spin) s.img.rotation += 14 * dt;
      s.life -= dt;
      if (s.life <= 0) {
        s.done = true;
        continue;
      }
      for (const z of this.zombies) {
        if (z.dead || s.hit.has(z)) continue;
        const dx = z.x - s.img.x;
        const dy = z.y - s.img.y;
        const rr = z.r + 6;
        if (dx * dx + dy * dy > rr * rr) continue;
        s.hit.add(z);
        if (s.aim) {
          s.aim.incoming -= s.dmg;
          s.aim = null;
        }
        this.hurt(z, s.dmg, { slow: s.slow, slowTime: s.slowTime, poison: s.poison, poisonTime: s.poisonTime, plague: s.plague });
        s.pierce--;
        if (s.pierce <= 0) {
          s.done = true;
          break;
        }
      }
    }
    if (this.shots.some(s => s.done)) {
      this.shots = this.shots.filter(s => {
        if (s.done) {
          s.img.destroy();
          if (s.aim) s.aim.incoming -= s.dmg;
        }
        return !s.done;
      });
    }
  }

  updateLobs(dt) {
    for (const l of this.lobs) {
      l.el += dt;
      const k = Math.min(1, l.el / l.time);
      l.img.x = l.sx + (l.tx - l.sx) * k;
      l.img.y = l.sy + (l.ty - l.sy) * k - Math.sin(k * Math.PI) * (l.spin ? 40 : 0);
      if (l.spin) l.img.rotation += 10 * dt;
      if (k >= 1) {
        l.aim.incoming -= l.dmg;
        this.explode(l.tx, l.ty, l.radius, l.dmg, l.color, l.snd);
        l.img.destroy();
        l.done = true;
        // 폭탄 광대: 가까운 다른 좀비에게 튕겨 간다
        if (l.bounces > 0) {
          l.hit.add(l.aim);
          let next = null;
          let nd = l.bounceRange;
          for (const z of this.zombies) {
            if (z.dead || z.puppet || l.hit.has(z)) continue;
            const d = Math.hypot(z.x - l.tx, z.y - l.ty);
            if (d < nd) {
              nd = d;
              next = z;
            }
          }
          if (next) {
            next.incoming += l.dmg;
            const img = this.add.image(l.tx, l.ty, 'bomb').setDepth(7);
            this.lobs.push({ ...l, img, aim: next, sx: l.tx, sy: l.ty, tx: next.x, ty: next.y, time: Math.max(0.22, nd / 420), el: 0, bounces: l.bounces - 1, done: false });
          }
        }
      }
    }
    if (this.lobs.some(l => l.done)) this.lobs = this.lobs.filter(l => !l.done);
  }

  updateStrikes(dt) {
    for (const s of this.strikes) {
      s.el += dt;
      const k = Math.min(1, s.el / s.delay);
      if (k < 0.7 && s.target && !s.target.dead) {
        s.x = s.target.x;
        s.y = s.target.y;
      }
      s.ring.setPosition(s.x, s.y).setScale(((s.radius / 30) * (0.3 + 0.7 * k)));
      if (k >= 1) {
        this.explode(s.x, s.y, s.radius, s.dmg, 0xff6a3a, s.snd);
        s.ring.destroy();
        s.done = true;
      }
    }
    if (this.strikes.some(s => s.done)) this.strikes = this.strikes.filter(s => !s.done);
  }

  updateFlames(dt) {
    for (const f of this.flames) {
      f.life -= dt;
      f.img.x += f.vx * dt * 0.4;
      f.img.y += f.vy * dt * 0.4;
      const k = 1 - f.life / f.max;
      f.img.setScale(0.12 + k * 0.35).setAlpha(0.8 * (1 - k));
      if (f.life <= 0) {
        f.img.destroy();
        f.done = true;
      }
    }
    if (this.flames.some(f => f.done)) this.flames = this.flames.filter(f => !f.done);
  }

  explode(x, y, radius, dmg, color, snd = 'boom') {
    for (const z of this.zombies) {
      if (z.dead) continue;
      if (Math.hypot(z.x - x, z.y - y) <= radius + z.r * 0.5) this.hurt(z, dmg);
    }
    // 부드럽게 퍼졌다 사라지는 원(번쩍이지 않음)
    const fill = this.add.image(x, y, 'smoke').setDepth(8).setTint(color).setAlpha(0.6).setScale(radius / 40);
    const ring = this.add.image(x, y, 'ring').setDepth(8).setTint(color).setAlpha(0.8).setScale(radius / 64);
    this.tweens.add({ targets: fill, scale: (radius / 20) * 1.1, alpha: 0, duration: 420, ease: 'Quad.Out', onComplete: () => fill.destroy() });
    this.tweens.add({ targets: ring, scale: radius / 30, alpha: 0, duration: 360, ease: 'Quad.Out', onComplete: () => ring.destroy() });
    if (this.save.settings.flash && radius >= 80) this.cameras.main.shake(120, 0.006);
    this.snd(snd, x);
  }

  // 효과음. x를 주면 화면 좌우 위치에 따라 소리도 좌우로 살짝 치우친다.
  snd(name, x) {
    if (name) sfx(name, x == null ? 0 : (x - CX) / CX);
  }

  zigzag(x1, y1, x2, y2) {
    const pts = [x1, y1];
    const n = 4;
    const nx = -(y2 - y1);
    const ny = x2 - x1;
    const len = Math.hypot(nx, ny) || 1;
    for (let k = 1; k < n; k++) {
      const off = (Math.random() - 0.5) * 18;
      pts.push(x1 + ((x2 - x1) * k) / n + (nx / len) * off, y1 + ((y2 - y1) * k) / n + (ny / len) * off);
    }
    pts.push(x2, y2);
    return pts;
  }

  drawLines(dt) {
    const g = this.lineG;
    g.clear();
    const safe = !this.save.settings.flash;
    for (const l of this.lines) {
      l.life -= dt;
      if (l.life <= 0) continue;
      const alpha = (l.life / l.max) * (safe ? 0.6 : 0.95);
      g.lineStyle(l.width, l.color, alpha);
      g.beginPath();
      g.moveTo(l.pts[0], l.pts[1]);
      for (let k = 2; k < l.pts.length; k += 2) g.lineTo(l.pts[k], l.pts[k + 1]);
      g.strokePath();
    }
    if (this.lines.some(l => l.life <= 0)) this.lines = this.lines.filter(l => l.life > 0);
  }

  // ── 피해와 처치 ──
  hurt(z, amount, opts = {}) {
    if (z.dead || z.puppet) return; // 꼭두각시는 실이 끊길 때까지 다치지 않는다
    if (this.foes.immune(z)) return; // 진압 경찰 거인이 방패를 든 동안
    amount *= this.heroes.damageMul(z); // 시간 정지 중이면 더 아프다
    amount *= this.mods.dmg * this.foes.armorMul(z); // 보상 카드 '화력', 철갑
    let crit = false;
    if (!opts.quiet && this.mods.crit && Math.random() < this.mods.crit) {
      amount *= 2;
      crit = true;
    }
    z.hp -= amount;
    if (z.def.blackRain) this.foes.checkBlackRain(z);
    if (opts.slow) {
      z.slow = Math.max(z.slowUntil > this.t ? z.slow : 0, opts.slow);
      z.slowUntil = this.t + opts.slowTime;
      z.setTint(opts.slowTint ?? 0xa8dcff);
      z.tinted = true;
    }
    if (opts.poison) {
      z.poison = opts.poison;
      z.poisonUntil = this.t + opts.poisonTime;
      z.setTint(opts.plague ? 0x7fdc4a : 0xb9f07a);
      z.tinted = true;
      if (opts.plague) z.plague = opts.plague; // 역병: 쓰러지면 주변으로 옮는다
    }
    if (!opts.quiet && this.save.settings.numbers && amount >= 1) {
      this.floatText(z.x + (Math.random() - 0.5) * 16, z.y - z.r - 6, String(Math.round(amount)), crit ? '#ffd84a' : '#ffffff', crit ? 26 : 20);
    }
    if (this.save.settings.flash && !opts.quiet && !opts.slow && !opts.poison) {
      z.setTintFill(0xffffff);
      this.time.delayedCall(50, () => {
        if (!z.dead) z.clearTint();
      });
    }
    if (z.hp <= 0) this.killZombie(z);
  }

  killZombie(z) {
    z.dead = true;
    const reward = Math.round(R.zombieReward(z.kind, this.wave) * this.mods.coin * this.map.coin);
    this.coins += reward;
    this.kills++;
    // 떨어뜨린 코인은 보유 코인으로(미리보기에서는 없음)
    if (!this.preview) {
      const drop = R.dropCoins(z.kind) * this.map.drop;
      if (drop > 0) {
        this.runCoins += drop;
        this.save.coins = (this.save.coins || 0) + drop;
        this.ui.dropCoin(z.x, z.y, drop);
      }
    }
    this.puff(z.x, z.y, z.r / 14, 0xb8bfc4);
    if (this.save.settings.numbers || z.def.boss) this.floatText(z.x, z.y - 8, `+${reward}`, '#ffd84a', z.def.boss ? 34 : 18, true);
    this.snd(z.def.boss ? 'bosspoof' : 'poof', z.x);
    if (z === this.boss) {
      this.boss = null;
      if (z.def.final) this.finalBossDown();
      else this.ui.banner(`${josa(z.def.name, '을', '를')} 쓰러뜨렸어요!`);
    }
    // 분열 좀비: 작은 좀비 둘로 갈라진다
    const sp = z.def.split;
    if (sp) {
      for (let k = 0; k < sp.count; k++) {
        const a = Math.random() * Math.PI * 2;
        this.spawnZombie(sp.kind, { x: z.x + Math.cos(a) * 18, y: z.y + Math.sin(a) * 18 });
      }
    }
    this.heroes.onKill(z);
    this.foes.removed(z);
    z.plague = null;
    z.puppet = null;
    z.setVisible(false).setActive(false);
    this.zPool.push(z);
  }

  // 최초의 감염자를 쓰러뜨림 → 엔딩(처음 한 번은 보유 코인 보상). 그 뒤로는 끝없는 밤이 이어진다.
  finalBossDown() {
    const first = !this.save.story.ending;
    if (first) {
      this.save.story.ending = true;
      this.save.coins = (this.save.coins || 0) + 1000;
      writeSave();
    }
    this.ui.ending(first);
  }

  puff(x, y, size, color) {
    for (let k = 0; k < 3; k++) {
      const p = this.add.image(x + (Math.random() - 0.5) * 14 * size, y + (Math.random() - 0.5) * 14 * size, 'smoke').setDepth(8).setTint(color).setAlpha(0.8).setScale(0.4 * size);
      this.tweens.add({ targets: p, scale: 1.1 * size, alpha: 0, y: p.y - 10, duration: 420, ease: 'Quad.Out', onComplete: () => p.destroy() });
    }
  }

  floatText(x, y, str, color, size, important = false) {
    if (this.textCount > (important ? 50 : 30)) return;
    let t = this.textPool.pop();
    if (!t) t = this.add.text(0, 0, '', { fontFamily: FONT, fontStyle: 'bold', stroke: '#0b0e12' }).setOrigin(0.5).setDepth(10);
    t.setText(str).setPosition(x, y).setColor(color).setFontSize(size).setStroke('#0b0e12', Math.round(size / 5)).setAlpha(1).setVisible(true);
    this.textCount++;
    this.tweens.add({
      targets: t, y: y - 30, alpha: 0, duration: 650, ease: 'Quad.Out',
      onComplete: () => {
        t.setVisible(false);
        this.textPool.push(t);
        this.textCount--;
      },
    });
  }
}

function distToSeg(px, py, x1, y1, x2, y2) {
  const vx = x2 - x1;
  const vy = y2 - y1;
  const len2 = vx * vx + vy * vy || 1;
  let k = ((px - x1) * vx + (py - y1) * vy) / len2;
  k = Math.max(0, Math.min(1, k));
  return Math.hypot(px - (x1 + vx * k), py - (y1 + vy * k));
}
