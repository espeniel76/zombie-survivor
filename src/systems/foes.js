// 20웨이브 이후의 좀비 능력과 웨이브 이변 화면.
//   철갑(받는 피해 감소) · 분열(쓰러지면 둘로) · 치유(주변 좀비 회복)
//   돌진 거인(힘을 모았다가 달려듦) · 무덤지기/비를 부르는 자(좀비 소환) · 검은 비(아군 공격 느려짐)
//   이변: 안개 · 폭우 · 붉은 달 등은 화면을 천천히 덮었다 걷는다(번쩍임 없음)
import * as R from '../core/rules.js';

const DEPTH_FX = 8.4;

export class FoeSystem {
  // rain/tint: 맵이 늘 깔고 있는 비와 어둑함(검은 탑 아래)
  constructor(scene, { CX, CY, rain = 0, tint = 0 }) {
    this.baseRain = rain;
    this.baseTint = tint;
    this.s = scene;
    this.CX = CX;
    this.CY = CY;
    this.rainUntil = 0; // 검은 비가 그칠 때
    this.rainSlow = 0;
    this.teleG = scene.add.graphics().setDepth(4.6); // 돌진 예고선
    this.rainG = scene.add.graphics().setDepth(DEPTH_FX + 0.1);
    this.rainOn = 0; // 빗줄기 투명도(천천히 바뀜)
    this.rainWant = 0;
    this.makeFogTexture();
    this.fog = scene.add.image(360, 640, 'fogTex').setDisplaySize(720, 1280).setDepth(DEPTH_FX).setAlpha(0);
    this.tint = scene.add.rectangle(360, 640, 720, 1280, 0x05060a, 1).setDepth(DEPTH_FX - 0.1).setAlpha(tint);
    this.rainOn = rain;
    this.rainWant = rain;
  }

  makeFogTexture() {
    const tx = this.s.textures;
    if (tx.exists('fogTex')) return;
    const c = tx.createCanvas('fogTex', 180, 320);
    const ctx = c.context;
    const g = ctx.createRadialGradient(90, 162, 40, 90, 162, 190);
    g.addColorStop(0, 'rgba(170,180,186,0)');
    g.addColorStop(0.55, 'rgba(170,180,186,0.35)');
    g.addColorStop(1, 'rgba(170,180,186,0.85)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 180, 320);
    c.refresh();
  }

  // ── 좀비가 나올 때 상태 초기화 ──
  spawned(z) {
    const d = z.def;
    z.dashCd = d.dash ? d.dash.every * (0.5 + Math.random() * 0.5) : 0;
    z.dashState = null;
    z.dashT = 0;
    z.summonCd = d.summon ? d.summon.every * 0.6 : 0;
    z.healCd = d.heal ? Math.random() * d.heal.every : 0;
    z.rainIdx = 0;
    z.phaseCd = d.phase ? d.phase.every * 0.7 : 0;
    z.ghostUntil = 0;
    z.frostCd = d.frost ? d.frost.every * 0.6 : 0;
    if (d.drum) {
      const ring = this.s.add.image(z.x, z.y, 'ring').setTint(0xff7a5a).setAlpha(0).setDepth(4.4).setScale((d.drum.radius * 2) / 64);
      this.s.tweens.add({ targets: ring, alpha: 0.22, duration: 600 });
      z.drumRing = ring;
    }
  }

  // 그림자 거인이 그림자일 때는 아무 공격도 받지 않는다
  immune(z) {
    return z.ghostUntil > this.s.t;
  }

  // 북소리가 닿는 좀비의 속도 배율
  speedMul(z) {
    let m = z.ghostUntil > this.s.t ? z.def.phase.speed : 1;
    for (const d of this.drummers || []) {
      if (d !== z && Math.hypot(d.x - z.x, d.y - z.y) <= d.def.drum.radius) { m *= d.def.drum.speed; break; }
    }
    return m;
  }

  // 좀비가 쓰러지거나 사라질 때 따라다니던 그림 치우기
  removed(z) {
    if (z.drumRing) {
      const r = z.drumRing;
      z.drumRing = null;
      this.s.tweens.add({ targets: r, alpha: 0, duration: 400, onComplete: () => r.destroy() });
    }
  }

  // 받는 피해 배율(철갑일수록 덜 아프다)
  armorMul(z) {
    return z.def.armor ? 1 - z.def.armor : 1;
  }

  // 아군 공격 속도 배율(검은 비가 오는 동안 느려진다)
  allyRateMul() {
    return this.s.t < this.rainUntil ? 1 - this.rainSlow : 1;
  }

  // 매 단계. 움직임을 여기서 처리했으면 true
  update(z, dt, edge) {
    const d = z.def;
    const s = this.s;
    if (d.regen && z.hp < z.maxHp) z.hp = Math.min(z.maxHp, z.hp + z.maxHp * d.regen * dt);
    if (z.drumRing) z.drumRing.setPosition(z.x, z.y);
    if (d.phase) {
      if (z.ghostUntil > s.t) {
        if (z.ghostUntil - s.t < dt * 1.5) s.tweens.add({ targets: z, alpha: 1, duration: 300 }); // 천천히 돌아온다
      } else {
        z.phaseCd -= dt;
        if (z.phaseCd <= 0) {
          z.phaseCd = d.phase.every;
          z.ghostUntil = s.t + d.phase.time;
          s.tweens.add({ targets: z, alpha: 0.35, duration: 300 }); // 천천히 흐려진다(깜빡임 없음)
        }
      }
    }
    if (d.frost) {
      z.frostCd -= dt;
      if (z.frostCd <= 0) {
        z.frostCd = d.frost.every;
        this.freezeCell(z);
      }
    }
    if (d.heal) {
      z.healCd -= dt;
      if (z.healCd <= 0) {
        z.healCd = d.heal.every;
        this.heal(z);
      }
    }
    if (d.summon) {
      z.summonCd -= dt;
      if (z.summonCd <= 0) {
        z.summonCd = d.summon.every;
        this.summon(z);
      }
    }
    if (d.dash) return this.dash(z, dt, edge);
    return false;
  }

  // ── 서리 거인: 아군이 있는 칸 하나를 얼린다(얼음이 천천히 덮였다 녹는다) ──
  freezeCell(z) {
    const s = this.s;
    const cand = [];
    for (let i = 0; i < 9; i++) if (s.cells[i] && !(s.cells[i].frozenUntil > s.t)) cand.push(i);
    if (!cand.length) return;
    const i = cand[Math.floor(Math.random() * cand.length)];
    const u = s.cells[i];
    const time = z.def.frost.time;
    u.frozenUntil = s.t + time;
    const p = s.cellPos(i);
    const ice = s.add.rectangle(p.x, p.y, 88, 88, 0xbfe9ff, 1).setDepth(6.9).setAlpha(0);
    ice.setStrokeStyle(3, 0xffffff, 0.8);
    s.tweens.add({ targets: ice, alpha: 0.5, duration: 300 });
    s.tweens.add({ targets: ice, alpha: 0, delay: (time * 1000) / Math.max(1, s.speed) - 300, duration: 300, onComplete: () => ice.destroy() });
    s.snd('impact', p.x);
    s.ui.toast(`${s.allyName(i)} 칸이 얼었어요!`);
  }

  // ── 치유 좀비: 주변 좀비를 고치고, 옅은 초록 고리가 천천히 퍼진다 ──
  heal(z) {
    const s = this.s;
    const h = z.def.heal;
    let any = false;
    for (const o of s.zombies) {
      if (o === z || o.dead || o.hp >= o.maxHp) continue;
      if (Math.hypot(o.x - z.x, o.y - z.y) > h.radius) continue;
      o.hp = Math.min(o.maxHp, o.hp + o.maxHp * h.pct * (o.def.boss ? 0.3 : 1));
      any = true;
    }
    if (!any) return;
    const ring = s.add.image(z.x, z.y, 'ring').setTint(0x9cffc0).setAlpha(0.45).setScale(0.6).setDepth(4.5);
    s.tweens.add({ targets: ring, scale: (h.radius * 2) / 64, alpha: 0, duration: 700, ease: 'Quad.Out', onComplete: () => ring.destroy() });
  }

  // ── 소환: 보스 주변에 좀비를 불러낸다 ──
  summon(z) {
    const s = this.s;
    const sm = z.def.summon;
    for (let k = 0; k < sm.count; k++) {
      if (s.zombies.length >= R.MAX_ALIVE) break;
      const a = Math.random() * Math.PI * 2;
      const x = z.x + Math.cos(a) * (z.r + 30);
      const y = z.y + Math.sin(a) * (z.r + 30);
      s.spawnZombie(sm.kinds[k % sm.kinds.length], { x, y });
      s.puff(x, y, 1.2, 0x8a8f96);
    }
    s.snd('poof', z.x);
  }

  // ── 돌진 거인: 멈춰서 힘을 모으는 동안 예고선이 보이고, 그다음 기지 쪽으로 빠르게 달려든다 ──
  dash(z, dt, edge) {
    const s = this.s;
    const ds = z.def.dash;
    if (z.dashState === 'wind') {
      z.dashT -= dt;
      if (z.dashT <= 0) {
        z.dashState = 'run';
        z.dashT = ds.time;
        s.snd('impact', z.x);
      }
      return true;
    }
    if (z.dashState === 'run') {
      z.dashT -= dt;
      if (z.dashT <= 0 || edge <= z.r * 0.7) {
        z.dashState = null;
        z.dashCd = ds.every;
        return false;
      }
      const dx = this.CX - z.x;
      const dy = this.CY - z.y;
      const d = Math.hypot(dx, dy) || 1;
      const v = z.def.speed * ds.mul * dt;
      z.x += (dx / d) * v;
      z.y += (dy / d) * v;
      if (Math.random() < 0.3) s.puff(z.x, z.y + z.r * 0.6, 0.8, 0xb8a888);
      return true;
    }
    if (edge > 140) {
      z.dashCd -= dt;
      if (z.dashCd <= 0) {
        z.dashState = 'wind';
        z.dashT = ds.windup;
        return true;
      }
    }
    return false;
  }

  // ── 비를 부르는 자: 체력이 2/3, 1/3이 되면 검은 비 ──
  checkBlackRain(z) {
    const br = z.def.blackRain;
    if (!br || z.rainIdx >= br.at.length) return;
    if (z.hp / z.maxHp > br.at[z.rainIdx]) return;
    z.rainIdx++;
    const s = this.s;
    this.rainUntil = s.t + br.time;
    this.rainSlow = br.slow;
    s.ui.banner('검은 비가 내려요!\n아군 공격이 잠시 느려져요');
    this.fadeTint(0x05060a, 0.28);
    this.rainTint = true; // 비가 그치면 draw()에서 걷는다
  }

  // ── 이변 화면: 시작할 때 천천히 덮고, 끝나면 천천히 걷는다 ──
  applyEvent(kind) {
    const fogOn = kind === 'fog';
    this.s.tweens.add({ targets: this.fog, alpha: fogOn ? 0.75 : 0, duration: 700 });
    this.rainWant = kind === 'storm' ? 1 : this.baseRain;
    if (kind === 'redmoon') this.fadeTint(0x5a0e14, 0.16);
    else this.fadeTint(0x05060a, this.baseTint);
  }

  fadeTint(color, alpha) {
    if (alpha > 0) this.tint.setFillStyle(color, 1);
    this.s.tweens.killTweensOf(this.tint);
    this.s.tweens.add({ targets: this.tint, alpha, duration: 700 });
  }

  // 매 프레임: 돌진 예고선, 빗줄기
  draw(dt) {
    const s = this.s;
    this.drummers = s.zombies.filter(z => !z.dead && z.def.drum);
    this.teleG.clear();
    for (const z of s.zombies) {
      if (z.dead || z.dashState !== 'wind') continue;
      const a = Math.atan2(this.CY - z.y, this.CX - z.x);
      const len = Math.min(Math.hypot(this.CX - z.x, this.CY - z.y) - 140, 360);
      const k = 1 - z.dashT / z.def.dash.windup; // 힘을 모을수록 조금 진해진다(천천히)
      this.teleG.lineStyle(z.r * 0.9, 0xd9b38c, 0.12 + 0.18 * k);
      this.teleG.lineBetween(z.x, z.y, z.x + Math.cos(a) * len, z.y + Math.sin(a) * len);
    }
    if (this.rainTint && s.t >= this.rainUntil) {
      this.rainTint = false;
      this.applyEvent(s.event);
    }
    const want = Math.max(this.rainWant, s.t < this.rainUntil ? 1 : 0);
    this.rainOn += Math.sign(want - this.rainOn) * Math.min(Math.abs(want - this.rainOn), dt * 1.5);
    this.rainG.clear();
    if (this.rainOn <= 0.01) return;
    this.rainG.lineStyle(2, 0x9fb0c8, 0.16 * this.rainOn);
    const off = (s.t * 240) % 1280;
    for (let k = 0; k < 70; k++) {
      const x = (k * 97) % 760 - 20;
      const y = ((k * 173 + off) % 1320) - 40;
      this.rainG.lineBetween(x, y, x - 8, y + 30);
    }
  }
}
