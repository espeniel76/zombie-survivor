// 화면 위 정보, 아래 버튼, 상점, 아군 정보, 일시정지, 결과 화면.
import Phaser from 'phaser';
import { ALLIES, ALLY, TIERS, MAX_ALLY_LEVEL } from '../data/allies.js';
import * as R from '../core/rules.js';
import { loadSave, writeSave, TEST } from '../core/save.js';
import { sfx } from '../core/sfx.js';
import { W, H, COLOR, text, panel, button, settingsRows, appear, vanish, curtainIn, curtainOut } from '../core/ui.js';
import { allyView } from '../render/sprites.js';
import { storyPages, chapterCard } from '../core/story-ui.js';
import { PROLOGUE, ENDING } from '../data/story.js';
import { PERKS, PERK, rollPerks } from '../data/perks.js';

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
  // 전설·신화 영웅
  const pct = v => `${Math.round(v * 100)}%`;
  const sec = st.rate ? num(1 / st.rate) : 0;
  switch (kind) {
    case 'echo': return `옆 칸 공격을 ${pct(st.power)} 위력으로 한 번 더`;
    case 'wisps': return `도깨비불 ${st.count}개씩(최대 ${st.max}) · 한 번 ${st.dmg}`;
    case 'push': return `${sec}초마다 밀쳐 내기 · 피해 ${st.dmg} · 범위 ${st.range}`;
    case 'bounce': return `폭탄 ${st.dmg} · ${st.bounces}번 튕김 · 사거리 ${st.range}`;
    case 'swamp': return `늪 0.5초마다 ${st.dmg} · ${pct(st.slow)} 느리게 · 최대 ${st.max}개`;
    case 'mirror': return `되갚기 ${st.dmg} + 맞은 피해×${st.mul} · 기지 피해 -${pct(st.guard)}`;
    case 'sleep': return `${sec}초마다 재우기 ${st.time}초 · 깨울 때 피해 ×${st.wake}`;
    case 'dice': return `피해 ${st.dmg}×(주사위÷2) · 6이면 모든 좀비 ${st.dmg * 3}`;
    case 'souls': return `영혼 ${st.need}개마다 강한 좀비 ${st.count}마리에 ${st.dmg}`;
    case 'dragon': return `아기 용 불 초당 ${Math.round(st.dmg * st.rate)} · 기지 둘레 비행`;
    case 'stone': return `시선 안 좀비가 돌로 · ${st.time}초 뒤 부서짐`;
    case 'execute': return `체력 ${pct(st.threshold)} 이하 좀비 처형 · 아니면 ${st.dmg} · 거대 좀비 +${pct(st.bossPct)}`;
    case 'sweep': return `칼날 두 개가 기지를 돌며 초당 ${Math.round(st.dmg * st.rate)} · 느리게`;
    case 'phoenix': return `깃털 ${st.dmg} · 기지 ${pct(st.trigger)} 아래면 웨이브마다 한 번 +${pct(st.heal)} 부활`;
    case 'tornado': return `${sec}초마다 회오리 · 휩쓸린 좀비 0.5초마다 ${st.dmg}`;
    case 'gravity': return `${sec}초마다 중력장 · 초당 ${st.dmg * 4} · 마무리 ${st.burst}`;
    case 'pact': return `피해 ${st.dmg}~${st.dmg * st.maxMul} · 기지가 다칠수록 셈`;
    case 'puppet': return `${sec}초마다 1마리 조종 · ${st.time}초 · 한 대 ${st.dmg}`;
    case 'timestop': return `${sec}초마다 ${st.time}초 정지 · 정지 중 피해 +${pct(st.vuln)} · 모두 ${pct(st.slowAll)} 느림`;
    case 'plague': return `초당 ${st.dmg} 역병 · 쓰러지면 주변으로 전염`;
    default: break;
  }
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

    this.preview = this.game_.preview ? ALLY[this.game_.preview] : null;
    this.buildHud();
    if (this.preview) this.buildPreviewBottom();
    else this.buildBottom();
    curtainIn(this, 320);

    this.bannerText = text(this, W / 2, 330, '', 44, COLOR.text, { strokeThickness: 8 }).setDepth(50).setAlpha(0);
    // 다음 웨이브 직전 3초 카운트(숫자만 바뀌고 밝기는 그대로)
    this.countText = text(this, W / 2, 560, '', 96, '#ffd84a', { strokeThickness: 10 }).setDepth(45).setAlpha(0.85).setVisible(false);
    this.toastBox = this.add.container(W / 2, 1090).setDepth(150).setAlpha(0); // 상점 같은 창(100) 위에도 보이게
    this.toastBg = this.add.graphics();
    this.toastText = text(this, 0, 0, '', 26, COLOR.text, { strokeThickness: 0 });
    this.toastBox.add([this.toastBg, this.toastText]);

    const kb = this.input.keyboard;
    if (this.preview) {
      kb.on('keydown-ESC', () => this.backToBook());
      kb.on('keydown-F', () => this.cycleSpeed());
      return;
    }
    kb.on('keydown-ESC', () => !this.storyOpen && (this.modal ? this.closeModal() : this.openPause()));
    kb.on('keydown-P', () => !this.modal && this.openPause());
    kb.on('keydown-S', () => !this.modal && this.openShop(-1));
    kb.on('keydown-SPACE', () => !this.modal && this.game_.skipBreak());
    kb.on('keydown-F', () => this.cycleSpeed());

    // 처음 게임을 시작하면 프롤로그를 한 번 보여 준다(그동안 게임은 멈춘다)
    if (!this.save.story.prologue) this.time.delayedCall(60, () => this.showPrologue());
  }

  // 안드로이드 앱의 뒤로 가기 버튼(src/core/app.js). 키보드 ESC처럼 움직인다
  back() {
    if (this.preview) return this.backToBook();
    if (this.storyOpen) return this.story?.finish(); // 이야기는 건너뛰기
    if (this.perkChoices) return; // 보상 카드는 하나 골라야 한다
    if (this.game_.phase === 'over') return this.toTitle();
    if (this.modal) this.closeModal();
    else this.openPause();
  }

  // 앱이 뒤로 갈 때(홈 버튼, 전화 등): 싸우는 중이면 일시정지 창을 열어 둔다
  pauseForApp() {
    if (this.preview || this.storyOpen || this.modal || this.game_.phase === 'over') return;
    this.openPause();
  }

  showPrologue() {
    this.scene.pause('Game');
    this.storyOpen = true;
    this.story = storyPages(this, PROLOGUE, () => {
      this.storyOpen = false;
      this.save.story.prologue = true;
      writeSave();
      if (!this.modal && this.game_.phase !== 'over') this.scene.resume('Game');
    });
  }

  // ── 보상 카드: 거대 좀비 웨이브를 막으면 3장 중 하나를 고른다(그동안 게임은 멈춘다) ──
  offerPerks() {
    this.time.delayedCall(700, () => {
      if (this.game_.phase === 'over') return;
      const ids = rollPerks();
      this.perkChoices = ids;
      const c = this.openModal();
      c.add(text(this, W / 2, 250, '보상을 하나 고르세요', 40, COLOR.text));
      c.add(text(this, W / 2, 300, '같은 카드를 또 고르면 효과가 겹쳐져요', 22, COLOR.dim, { strokeThickness: 0, bold: false }));
      ids.forEach((id, k) => {
        const p = PERK[id];
        const y = 450 + k * 230;
        const card = this.add.container(0, 0);
        card.add(panel(this, W / 2, y, 600, 200, 0x1b222b, p.color, 22));
        const have = this.game_.perks[id] || 0;
        card.add(text(this, 110, y - 50, p.name, 36, '#ffffff', { ox: 0 }));
        if (have) card.add(text(this, 610, y - 50, `보유 ×${have}`, 20, COLOR.dim, { ox: 1, strokeThickness: 0 }));
        card.add(text(this, 110, y + 2, p.desc, 24, COLOR.text, { ox: 0, strokeThickness: 0, bold: false }));
        card.add(button(this, W / 2, y + 58, 260, 58, '고르기', () => this.choosePerk(id), { fill: p.color, textColor: '#10151a', size: 26 }));
        c.add(card);
        appear(this, card, { duration: 260, delay: 80 + k * 90, dy: 20 });
      });
    });
  }

  choosePerk(id) {
    if (!this.perkChoices) return;
    this.perkChoices = null;
    this.closeModal();
    this.game_.addPerk(id);
  }

  // ── 엔딩: 최초의 감염자를 쓰러뜨림 ──
  ending(first) {
    this.time.delayedCall(900, () => {
      this.scene.pause('Game');
      this.storyOpen = true;
      this.story = storyPages(this, ENDING, () => {
        this.storyOpen = false;
        if (!this.modal && this.game_.phase !== 'over') this.scene.resume('Game');
        this.banner(first ? '엔딩 보상 · 보유 코인 +1,000\n끝없는 밤이 이어져요' : '끝없는 밤이 이어져요');
      });
    });
  }

  chapter(ch) {
    chapterCard(this, ch);
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
    this.coinIcon = this.add.image(560, 44, 'item_coin').setScale(1.6);
    this.coinText = text(this, 700, 44, '', 36, COLOR.orangeText, { ox: 1 }); // 오른쪽 끝에 맞춰 큰 숫자도 잘리지 않게
    this.hpBar = this.add.graphics();
    this.hpText = text(this, W / 2, 125, '', 20, COLOR.text);
    this.bossBar = this.add.graphics();
    this.bossText = text(this, W / 2, 182, '', 20, COLOR.text);
    // 보유 코인(좀비가 떨어뜨린 코인이 날아와 쌓인다)
    this.walletText = text(this, 700, 88, '', 20, '#ffe08a', { ox: 1, strokeThickness: 4 });
    this.walletIcon = this.add.image(0, 88, 'item_coin').setScale(0.9);
    this.coinFly = [];
    if (this.preview) {
      this.walletText.setVisible(false);
      this.walletIcon.setVisible(false);
      const a = this.preview;
      const t = TIERS[a.tier];
      this.waveText.setText(a.name).setColor(t.text);
      this.statusText.setText(`${t.name} ${a.role || KIND_LABEL[a.kind]} · 미리보기`);
      this.coinIcon.setVisible(false);
      this.coinText.setVisible(false);
    }
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
    // 테스트판: 웨이브 중에는 '바로 시작' 자리에 '다음 보스로'
    if (TEST) {
      this.bossBtn = button(this, 370, y, 210, 92, '다음 보스로', () => this.game_.jumpToBoss(), { fill: 0x8a5cff, size: 26, textColor: '#ffffff' });
      text(this, W / 2, 210, '테스트판 · 기록은 따로 저장돼요', 20, '#c9b8ff', { strokeThickness: 4 }).setDepth(40);
    }
    button(this, 650, y, 90, 92, 'II', () => this.openPause(), { fill: 0x3a4652, textColor: '#eef3ea', size: 30 });
  }

  // 좀비가 떨어뜨린 코인: 살짝 튀어 올랐다가 위쪽 '보유' 숫자로 날아간다(깜빡임 없음)
  dropCoin(x, y, n) {
    const flying = this.coinFly.filter(c => c.active).length;
    if (flying > 24) return; // 한꺼번에 너무 많으면 그림만 생략(코인은 이미 더해짐)
    const img = this.coinFly.find(c => !c.active) || this.add.image(0, 0, 'item_coin').setDepth(30);
    if (!this.coinFly.includes(img)) this.coinFly.push(img);
    img.setActive(true).setVisible(true).setPosition(x, y).setScale(n >= 4 ? 1.3 : 0.95).setAlpha(1);
    const tx = this.walletIcon.x;
    const ty = this.walletIcon.y;
    this.tweens.add({
      targets: img, y: y - 26, duration: 180, ease: 'Quad.Out',
      onComplete: () => this.tweens.add({
        targets: img, x: tx, y: ty, scale: 0.7, duration: 520, delay: 120, ease: 'Cubic.In',
        onComplete: () => img.setActive(false).setVisible(false),
      }),
    });
  }

  // 도감 미리보기: 아래쪽에 설명과 '도감으로' 버튼
  buildPreviewBottom() {
    const a = this.preview;
    const t = TIERS[a.tier];
    const top = a.hero ? 990 : 1030;
    const g = this.add.graphics();
    g.fillStyle(0x0d1116, 0.88);
    g.fillRect(0, top, W, H - top);
    g.lineStyle(2, t.color, 1);
    g.lineBetween(0, top, W, top);
    let y = top + 32;
    if (a.quote) {
      text(this, W / 2, y, `“${a.quote}”`, 21, '#ffd84a', { strokeThickness: 0, bold: false, wrap: W - 60 });
      y += 36;
    }
    text(this, W / 2, y, a.desc, 22, COLOR.text, { strokeThickness: 0, bold: false, wrap: W - 60 });
    y += 34;
    text(this, W / 2, y, statsLine(a.kind, R.allyStats(a.id, 1)), 19, COLOR.dim, { strokeThickness: 0, bold: false });
    if (a.hero) text(this, W / 2, y + 32, '게이지가 차면 영웅을 눌러 각성해 보세요', 19, '#c9b8ff', { strokeThickness: 0, bold: false });
    const by = 1212;
    button(this, 250, by, 420, 92, '돌아가기', () => this.backToBook(), { fill: COLOR.orange, textColor: '#2a1600', size: 32 });
    this.speedBtn = button(this, 580, by, 180, 92, '1배속', () => this.cycleSpeed(), { fill: 0x3a4652, textColor: '#eef3ea', size: 26 });
  }

  backToBook() {
    curtainOut(this, () => {
      this.scene.stop('Game');
      this.scene.start('Title', { open: this.game_.previewFrom || 'book' });
    });
  }

  cycleSpeed() {
    const next = { 1: 2, 2: 3, 3: 1 }[this.game_.speed];
    this.game_.setSpeed(next);
    this.speedBtn.label.setText(`${next}배속`);
  }

  update() {
    const g = this.game_;
    if (!g || !g.sys.isActive() && !g.sys.isPaused()) return;
    if (this.preview) {
      this.updateHpBar(g);
      return;
    }
    this.waveText.setText(g.wave === 0 ? '준비' : `웨이브 ${g.wave}`);
    if (g.phase === 'break') this.statusText.setText(`웨이브 ${g.wave + 1} 시작까지 ${Math.ceil(Math.max(0, g.phaseLeft))}초`);
    const counting = g.phase === 'break' && g.phaseLeft <= 3 && g.phaseLeft > 0 && !this.modal && !this.storyOpen;
    this.countText.setVisible(counting);
    if (counting) this.countText.setText(String(Math.ceil(g.phaseLeft)));
    else if (g.phase === 'wave') this.statusText.setText(`남은 좀비 ${g.queue.length + g.zombies.length}${g.event ? ` · ${R.EVENTS[g.event].name}` : ''}`);
    else this.statusText.setText('');
    this.coinText.setText(R.formatNum(g.coins));
    this.updateOpenPanels(g);
    this.coinIcon.x = 700 - this.coinText.width - 22;
    this.walletText.setText(`보유 ${R.formatNum(this.save.coins || 0)}`);
    this.walletIcon.x = 700 - this.walletText.width - 16;
    this.skipBtn.setVisible(g.phase === 'break');
    this.bossBtn?.setVisible(g.phase === 'wave');
    this.updateHpBar(g);

    this.bossBar.clear();
    if (g.boss && !g.boss.dead) {
      const bk = Math.max(0, g.boss.hp / g.boss.maxHp);
      this.bossBar.fillStyle(0x000000, 0.6);
      this.bossBar.fillRoundedRect(60, 170, W - 120, 24, 8);
      this.bossBar.fillStyle(0xb267ff, 1);
      if (bk > 0) this.bossBar.fillRoundedRect(60, 170, Math.max(16, (W - 120) * bk), 24, 8);
      this.bossText.setText(`${g.boss.def.name}  ${R.formatNum(Math.ceil(g.boss.hp))}`);
    } else {
      this.bossText.setText('');
    }
  }

  updateHpBar(g) {
    const k = g.baseHp / g.baseMax;
    const bx = 24;
    const bw = W - 48;
    this.hpBar.clear();
    this.hpBar.fillStyle(0x000000, 0.6);
    this.hpBar.fillRoundedRect(bx, 112, bw, 26, 8);
    this.hpBar.fillStyle(k > 0.5 ? 0x6cc24a : k > 0.25 ? 0xffb347 : 0xe5534b, 1);
    if (k > 0) this.hpBar.fillRoundedRect(bx, 112, Math.max(16, bw * k), 26, 8);
    this.hpText.setText(`기지 ${Math.ceil(g.baseHp)} / ${g.baseMax}`);
  }

  // 영웅 컷인: 화면을 가로지르는 띠 + 큰 초상 + 이름·대사. 그동안 전장은 잠깐 느려진다.
  heroCutIn(id, word) {
    const a = ALLY[id];
    const t = TIERS[a.tier];
    const dim = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.4).setDepth(88).setAlpha(0);
    this.tweens.add({ targets: dim, alpha: 1, duration: 320, yoyo: true, hold: 780, onComplete: () => dim.destroy() }); // 천천히 어두워졌다 돌아온다
    const c = this.add.container(-W, 0).setDepth(89);
    const band = this.add.graphics();
    band.fillStyle(0x07090c, 0.94);
    band.fillRect(0, 560, W, 240);
    band.fillStyle(a.look.glow, 0.18);
    band.fillRect(0, 560, 300, 240);
    band.lineStyle(4, t.color, 1);
    band.lineBetween(0, 560, W, 560);
    band.lineBetween(0, 800, W, 800);
    const portrait = allyView(this, 150, 705, id, 2.5);
    portrait.aimAt(-0.2);
    const name = text(this, 290, 628, a.name, 50, t.text, { ox: 0 });
    const tag = text(this, 290, 690, `${t.name} · ${word}!`, 32, '#ffffff', { ox: 0 });
    const quote = text(this, 290, 744, `“${a.quote}”`, 20, '#ffd84a', { ox: 0, strokeThickness: 0, bold: false, wrap: 410, align: 'left' });
    c.add([band, portrait, name, tag, quote]);
    this.tweens.add({ targets: c, x: 0, duration: 260, ease: 'Cubic.Out' });
    this.tweens.add({ targets: c, x: W, delay: 1260, duration: 260, ease: 'Cubic.In', onComplete: () => c.destroy() });
    // 전장은 잠깐 느리게(번쩍임 없이 무게감만)
    this.game_.timeWarp = 0.2;
    this.time.delayedCall(1100, () => {
      if (this.game_) this.game_.timeWarp = 1;
    });
    sfx('boss');
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
    this.toastBox.setY(1090);
    this.tweens.add({ targets: this.toastBox, alpha: 1, duration: 140, ease: 'Quad.Out' });
    this.tweens.add({ targets: this.toastBox, alpha: 0, delay: 1600, duration: 350 });
  }

  // ── 팝업 공통 ──
  // 창은 어두운 막이 천천히 깔리고, 내용은 살짝 아래에서 떠오르며 나타난다
  openModal(pause = true) {
    this.closeModal(false);
    const dim = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.55).setInteractive().setDepth(99);
    dim.setAlpha(0);
    this.tweens.add({ targets: dim, alpha: 1, duration: 180 });
    const c = this.add.container(0, 0).setDepth(100);
    appear(this, c, { duration: 220, dy: 18 });
    c.dim = dim;
    this.modal = c;
    if (pause && this.game_.phase !== 'over') this.scene.pause('Game');
    return c;
  }

  closeModal(resume = true) {
    if (!this.modal) return;
    vanish(this, this.modal, { duration: 140 });
    vanish(this, this.modal.dim, { duration: 170 });
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

  // 상점·아군 정보 창은 게임을 멈추지 않으므로, 코인이 바뀌면 버튼 색과 글자를 맞춘다
  updateOpenPanels(g) {
    if (!this.modal) return;
    if (this.modal === this.shopModal) {
      this.shopCoins.setText(this.shopHeader());
      if (this.shopSignature() !== this.shopSig) this.refreshShop();
      return;
    }
    const live = this.allyLive;
    if (!live || this.modal !== live.c) return;
    if (!g.cells[live.i]) return this.closeModal();
    if (live.gaugeText) live.gaugeText.setText(live.gaugeLine());
    if (live.upBtn && live.cost != null) {
      const canUp = g.coins >= live.cost;
      if (canUp !== live.canUp) {
        live.canUp = canUp;
        live.upBtn.setFill(canUp ? COLOR.green : 0x4a535c);
        live.upBtn.label.setColor(canUp ? '#13200b' : '#aab3ba');
      }
    }
  }

  shopHeader() {
    const g = this.game_;
    const empty = g.cells.filter(x => !x).length;
    return `코인 ${R.formatNum(g.coins)} · 빈 칸 ${empty}/9 · 기지 ${Math.ceil(g.baseHp)}/${g.baseMax}`;
  }

  // 지금 보이는 상점 목록에서 살 수 있는지가 바뀌었는지 알아보는 표시
  shopSignature() {
    const g = this.game_;
    const empty = g.cells.filter(x => !x).length;
    const all = ALLIES.filter(a => a.tier === this.shopTier);
    const list = all.slice((this.shopPage || 0) * 5, (this.shopPage || 0) * 5 + 5);
    return `${empty}|${list.map(a => (g.coins >= a.price ? 1 : 0)).join('')}`;
  }

  // ── 상점 ──
  openShop(preferCell) {
    if (this.game_.phase === 'over') return;
    // 상점을 보는 동안에도 전투는 계속된다(코인·버튼은 update에서 계속 새로 고침)
    const c = this.openModal(false);
    this.shopModal = c;
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
    this.shopCoins.setText(this.shopHeader());
    this.shopSig = this.shopSignature();
    this.shopTabs.removeAll(true);
    TIERS.forEach((t, k) => {
      const x = W / 2 + (k - 2.5) * 108;
      const sel = k === this.shopTier;
      const b = button(this, x, 260, 100, 58, t.name, () => {
        this.shopTier = k;
        this.shopPage = 0;
        this.refreshShop();
        appear(this, this.shopList, { duration: 200, dy: 10 });
      }, { fill: sel ? t.color : 0x232b33, textColor: sel ? '#10151a' : t.text, size: 24 });
      this.shopTabs.add(b);
    });
    this.shopList.removeAll(true);
    // 한 쪽에 5명씩. 신화처럼 많으면 ◀ ▶ 로 넘긴다
    const all = ALLIES.filter(a => a.tier === this.shopTier);
    const pages = Math.ceil(all.length / 5);
    this.shopPage = Math.min(this.shopPage || 0, pages - 1);
    const list = all.slice(this.shopPage * 5, this.shopPage * 5 + 5);
    if (pages > 1) {
      const turn = d => {
        this.shopPage = (this.shopPage + d + pages) % pages;
        this.refreshShop();
        appear(this, this.shopList, { duration: 200, dy: 10 });
      };
      this.shopList.add(button(this, W / 2 - 150, 1104, 96, 56, '◀', () => turn(-1), { fill: 0x3a4652, textColor: '#eef3ea', size: 26 }));
      this.shopList.add(text(this, W / 2, 1104, `${this.shopPage + 1} / ${pages}`, 26, COLOR.text));
      this.shopList.add(button(this, W / 2 + 150, 1104, 96, 56, '▶', () => turn(1), { fill: 0x3a4652, textColor: '#eef3ea', size: 26 }));
    }
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
      const locked = !R.isUnlocked(this.save, a.id);
      const can = !locked && g.coins >= a.price && empty > 0;
      const label = locked ? '잠김' : empty === 0 ? '빈 칸 없음' : `${R.formatNum(a.price)}코인`;
      const b = button(this, 614, y, 132, 76, label, () => {
        if (locked) {
          this.toast(`메인 화면 상점에서 ${R.formatNum(R.MYTHIC_UNLOCK)}코인으로 해금해요`);
          return;
        }
        if (!can) {
          this.toast(empty === 0 ? '빈 칸이 없어요. 아군을 팔거나 옮겨 보세요.' : '코인이 부족해요');
          return;
        }
        const res = g.buy(a.id, this.shopPrefer);
        this.toast(res.msg);
        if (res.ok) {
          this.shopPrefer = -1;
          g.deselect();
          if (res.hero) {
            // 각성자 합류: 상점을 닫고 빛기둥과 함께 등장
            this.closeModal();
            g.heroes.arrival(res.cell);
            this.heroCutIn(a.id, '합류');
          } else if (g.cells.every(x => x)) this.closeModal();
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
    // 강화하는 동안에도 전투는 계속된다
    const c = this.openModal(false);
    c.dim.setFillStyle(0x000000, 0.25);
    this.allyLive = { c, i };
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
    // 영웅은 각성 게이지, 지휘관 강화는 같은 줄 뒤에 붙인다
    const buffStr = u.buff > 0 ? `공격 속도 +${Math.round(u.buff * 100)}%(지휘관)` : '';
    if (a.hero) {
      const gaugeLine = () => {
        const ready = (u.gauge || 0) >= 100;
        const msg = u.awakeUntil > g.t ? '각성 중!' : ready ? '각성 준비 완료 · 닫고 영웅을 누르면 각성' : `각성 게이지 ${Math.floor(u.gauge || 0)}% · 웨이브 중에 차올라요`;
        return buffStr ? `${msg} · ${buffStr}` : msg;
      };
      const gt = text(this, 40, top + 246, gaugeLine(), 19, '#ffd84a', { ox: 0, strokeThickness: 0, bold: false });
      c.add(gt);
      Object.assign(this.allyLive, { gaugeText: gt, gaugeLine });
    } else if (buffStr) {
      c.add(text(this, 40, top + 246, `지휘관 덕분에 ${buffStr.replace('(지휘관)', '')}`, 20, '#ffd84a', { ox: 0, strokeThickness: 0, bold: false }));
    }
    const by = top + 320;
    const canUp = cost != null && g.coins >= cost;
    const upBtn = button(this, 150, by, 220, 84, cost == null ? '최대 레벨' : `강화 ${R.formatNum(cost)}`, () => {
      const res = g.upgrade(i);
      this.toast(res.msg || '');
      if (res.ok) this.openAllyPanel(i);
    }, { fill: canUp ? COLOR.green : 0x4a535c, textColor: canUp ? '#13200b' : '#aab3ba', size: 26 });
    c.add(upBtn);
    Object.assign(this.allyLive, { upBtn, cost, canUp });
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
    // 이번 판에 고른 보상 카드
    const got = PERKS.filter(p => this.game_.perks[p.id]).map(p => `${p.name}${this.game_.perks[p.id] > 1 ? ` ×${this.game_.perks[p.id]}` : ''}`);
    if (got.length) c.add(text(this, W / 2, H / 2 + 74, `받은 보상  ${got.join(' · ')}`, 20, '#ffd84a', { strokeThickness: 0, bold: false, wrap: 560 }));
    c.add(button(this, W / 2, H / 2 + 150, 400, 88, '계속하기', () => this.closeModal(), { size: 32 }));
    c.add(button(this, W / 2, H / 2 + 260, 400, 88, '처음 화면으로', () => this.toTitle(), { fill: 0x3a4652, textColor: '#eef3ea', size: 30 }));
  }

  toTitle() {
    writeSave();
    curtainOut(this, () => {
      this.modal = null;
      this.scene.stop('Game');
      this.scene.start('Title', { open: null });
    });
  }

  // ── 결과 ──
  showResult({ wave, cleared, kills, newBest, runCoins = 0, bestWave = 0 }) {
    const c = this.openModal(false);
    c.add(panel(this, W / 2, H / 2, 620, 700));
    c.add(text(this, W / 2, H / 2 - 270, '기지가 무너졌어요', 44, '#ff8a80'));
    c.add(text(this, W / 2, H / 2 - 190, `웨이브 ${wave}에서 쓰러짐`, 30, COLOR.text));
    c.add(text(this, W / 2, H / 2 - 110, `막아낸 웨이브  ${cleared}`, 30, COLOR.greenText));
    c.add(text(this, W / 2, H / 2 - 60, `처치한 좀비  ${R.formatNum(kills)}`, 30, COLOR.text));
    c.add(text(this, W / 2, H / 2 + 0, newBest ? '최고 기록!' : `최고 기록  웨이브 ${bestWave}`, 30, newBest ? COLOR.orangeText : COLOR.dim));
    c.add(text(this, W / 2, H / 2 + 56, `주운 코인 +${R.formatNum(runCoins)}  ·  보유 ${R.formatNum(this.save.coins || 0)}`, 26, '#ffe08a'));
    c.add(button(this, W / 2, H / 2 + 140, 400, 88, '다시 하기', () => curtainOut(this, () => {
      this.modal = null;
      this.game_.scene.restart();
    }), { size: 32 }));
    c.add(button(this, W / 2, H / 2 + 250, 400, 88, '처음 화면으로', () => this.toTitle(), { fill: 0x3a4652, textColor: '#eef3ea', size: 30 }));
  }
}
