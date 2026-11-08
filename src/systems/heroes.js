// 전설·신화 영웅의 고유 능력. GameScene이 몇 군데에서 불러 쓴다.
//   fire()       영웅이 공격할 때(쿨타임이 찼고 사거리 안에 좀비가 있을 때)
//   onAllyFire() 아군이 쏠 때마다 → 옆 칸 메아리술사가 따라 쏜다
//   onBaseHit()  좀비가 기지를 때릴 때 → 거울 기사가 되갚는다
//   onKill()     좀비가 쓰러질 때 → 역병 전염, 영혼 모으기, 유령 소환
//   controls()   좀비가 이번 프레임에 스스로 못 움직이는지(정지·잠·개구리·돌·회오리·미끼 등)
//   update()     도깨비불, 중력장, 늪, 허수아비, 용, 회오리, 유령 …
// 번쩍이는 효과는 쓰지 않는다. 모든 표시는 천천히 커지거나 옅어진다.
import { ALLY } from '../data/allies.js';
import * as R from '../core/rules.js';
import { BODY_OY } from '../render/sprites.js';

// 메아리술사가 따라 할 수 있는 공격
const ECHO_KINDS = new Set(['bullet', 'splash', 'strike', 'flame', 'beam', 'chain', 'wisps', 'bounce', 'pact', 'plague', 'dice', 'tornado']);
// 스스로 노려 쏘지 않는 영웅(옆 칸·기지·쓰러짐에 반응하거나 혼자 움직인다)
export const PASSIVE_HEROES = new Set(['echo', 'mirror', 'souls', 'dragon', 'ghost']);

export class HeroSystem {
  constructor(scene, layout) {
    this.s = scene;
    this.L = layout; // { CX, CY, HALF, cellPos }
    this.echoes = [];
    this.wisps = [];
    this.wells = [];
    this.pools = [];
    this.decoys = [];
    this.tornados = [];
    this.ghosts = [];
    this.dragons = new Map(); // 아군 → 용 그림
    this.globalSlow = 0;
    this.g = scene.add.graphics().setDepth(8.5); // 실, 시계, 영혼, 시선 표시
  }

  // 아군 배치가 바뀔 때
  refresh() {
    let slow = 0;
    for (const u of this.s.cells) if (u && ALLY[u.id].kind === 'timestop') slow = Math.max(slow, u.st.slowAll);
    this.globalSlow = slow;
  }

  alliesOf(kind) {
    const out = [];
    this.s.cells.forEach((u, i) => {
      if (u && ALLY[u.id].kind === kind) out.push({ u, i });
    });
    return out;
  }

  // ── 메아리술사 ──
  onAllyFire(i, a) {
    if (!ECHO_KINDS.has(a.kind)) return;
    for (const n of R.neighbors(i)) {
      const e = this.s.cells[n];
      if (!e || ALLY[e.id].kind !== 'echo') continue;
      e.echoAt = e.echoAt || {};
      if ((e.echoAt[i] || 0) > this.s.t) continue; // 이웃 하나당 0.25초에 한 번까지
      e.echoAt[i] = this.s.t + 0.25;
      this.echoes.push({ t: 0.12, from: i, cell: n });
    }
  }

  runEcho(ec) {
    const src = this.s.cells[ec.from];
    const e = this.s.cells[ec.cell];
    if (!src || !e || ALLY[e.id].kind !== 'echo') return;
    const a = ALLY[src.id];
    const st = { ...src.st };
    for (const k of ['dmg', 'poison', 'burst']) if (st[k]) st[k] = Math.max(1, Math.round(st[k] * e.st.power));
    if (st.count > 1) st.count = Math.max(1, Math.round(st.count * e.st.power));
    const p = this.L.cellPos(ec.cell);
    const target = this.s.findTarget(p, a.kind === 'flame' ? { ...st, noReach: true } : st);
    if (!target) return;
    const ang = Math.atan2(target.y - p.y, target.x - p.x);
    e.aim = ang;
    e.sprite.aimAt(ang);
    this.ripple(p.x, p.y, 0x7fffd4, 46, 320);
    this.s.fire(e, a, st, p, target, ang, ec.cell, true);
  }

  // ── 거울 기사: 기지를 때린 좀비에게 되갚기 ──
  onBaseHit(n, from) {
    const mirrors = this.alliesOf('mirror');
    if (!mirrors.length) return n;
    let guard = 0;
    for (const { u } of mirrors) guard = Math.max(guard, u.st.guard);
    if (from && !from.dead && !from.puppet) {
      let back = 0;
      for (const { u } of mirrors) back += u.st.dmg + n * u.st.mul;
      const ex = Math.max(this.L.CX - this.L.HALF, Math.min(this.L.CX + this.L.HALF, from.x));
      const ey = Math.max(this.L.CY - this.L.HALF, Math.min(this.L.CY + this.L.HALF, from.y));
      this.s.lines.push({ pts: [ex, ey, from.x, from.y], color: 0xbfe9ff, width: 3, life: 0.3, max: 0.3 });
      this.s.hurt(from, back);
    }
    return n * (1 - guard);
  }

  // ── 영웅 공격 ──
  fire(u, a, st, p, target, ang, i) {
    const s = this.s;
    const mx = p.x + Math.cos(ang) * 30;
    const my = p.y + Math.sin(ang) * 30;
    switch (a.kind) {
      case 'wisps': { // 도깨비불: 끝까지 쫓아가 태운다
        u.wisps = u.wisps || 0;
        const n = Math.min(st.count, st.max - u.wisps);
        for (let k = 0; k < n; k++) {
          const an = ang + (Math.random() - 0.5) * 2;
          const img = s.add.image(mx, my, 'wisp').setDepth(7.5).setAlpha(0.95);
          this.wisps.push({ img, owner: u, vx: Math.cos(an) * st.speed, vy: Math.sin(an) * st.speed, target, life: st.life, sting: 0, st, home: p, wob: Math.random() * 6 });
          u.wisps++;
        }
        if (n > 0) s.snd('swish', p.x);
        break;
      }
      case 'push': {
        const hit = s.zombies.filter(z => !z.dead && !z.puppet && Math.hypot(z.x - p.x, z.y - p.y) <= st.range + z.r * 0.5);
        for (const z of hit) {
          const dx = z.x - this.L.CX;
          const dy = z.y - this.L.CY;
          const d = Math.hypot(dx, dy) || 1;
          const force = st.force * (z.def.boss ? 0.2 : z.def.heavy ? 0.4 : 1);
          z.knockT = 0.25;
          z.kvx = (dx / d) * (force / 0.25);
          z.kvy = (dy / d) * (force / 0.25);
          s.hurt(z, st.dmg);
        }
        this.ripple(p.x, p.y, 0xff5a5a, st.range, 380);
        this.ripple(p.x, p.y, 0x5a9dff, st.range * 0.8, 420);
        s.snd('impact', p.x);
        break;
      }
      case 'bounce': {
        const time = Math.max(0.2, Math.hypot(target.x - mx, target.y - my) / 380);
        const img = s.add.image(mx, my, 'bomb').setDepth(7);
        target.incoming += st.dmg;
        s.lobs.push({ img, aim: target, sx: mx, sy: my, tx: target.x, ty: target.y, time, el: 0, dmg: st.dmg, radius: st.radius, spin: true, color: 0xff7ad1, snd: 'boom', bounces: st.bounces, bounceRange: st.bounceRange, hit: new Set() });
        s.snd('swish', p.x);
        break;
      }
      case 'swamp': { // 늪: 좀비가 지나갈 자리에 끈적한 늪
        u.pools = (u.pools || []).filter(t => !t.done);
        if (u.pools.length >= st.max) {
          const old = u.pools.shift();
          old.life = Math.min(old.life, 0.4);
        }
        const tx = target.x + (this.L.CX - target.x) * 0.15;
        const ty = target.y + (this.L.CY - target.y) * 0.15;
        const img = s.add.image(tx, ty, 'swamp').setDepth(2.6).setScale(0.2).setAlpha(0);
        s.tweens.add({ targets: img, scale: (st.radius * 2) / 64, alpha: 0.95, duration: 300, ease: 'Quad.Out' });
        const pool = { img, x: tx, y: ty, r: st.radius, life: st.life, tick: 0, st };
        u.pools.push(pool);
        this.pools.push(pool);
        s.snd('swish', tx);
        break;
      }
      case 'gravity': {
        let best = target;
        let bestN = -1;
        const cand = s.zombies.filter(z => !z.dead && !z.puppet && Math.hypot(z.x - p.x, z.y - p.y) <= st.range);
        for (const z of cand) {
          let n = 0;
          for (const o of cand) if (Math.hypot(o.x - z.x, o.y - z.y) <= st.radius) n++;
          if (n > bestN) {
            bestN = n;
            best = z;
          }
        }
        const img = s.add.image(best.x, best.y, 'well').setDepth(2.7).setScale(0.1).setAlpha(0);
        s.tweens.add({ targets: img, scale: (st.radius * 2) / 128, alpha: 0.9, duration: 350, ease: 'Quad.Out' });
        this.wells.push({ img, x: best.x, y: best.y, r: st.radius, life: st.time, tick: 0, st });
        s.snd('plasma', best.x);
        break;
      }
      case 'pact': {
        const lost = 1 - s.baseHp / s.baseMax;
        const mul = 1 + (st.maxMul - 1) * Math.max(0, Math.min(1, lost));
        s.shootBullet(mx, my, ang, target, { ...st, dmg: Math.round(st.dmg * mul), tex: 'hellfire' });
        if (mul >= 1.5) s.floatText(p.x, p.y - 44, `×${mul.toFixed(1)}`, '#ff4d4d', 18, true);
        s.snd('flame', p.x);
        break;
      }
      case 'plague': {
        s.shootBullet(mx, my, ang, target, { ...st, poison: st.dmg, poisonTime: st.time, plague: true, dmg: 1, tex: 'flask', spin: true });
        s.snd('dart', p.x);
        break;
      }
      case 'puppet': {
        let pick = null;
        for (const z of s.zombies) {
          if (z.dead || z.puppet || z.def.boss || z.petrified) continue;
          if (Math.hypot(z.x - p.x, z.y - p.y) > st.range) continue;
          if (!pick || z.hp > pick.hp) pick = z;
        }
        if (!pick) {
          u.cd = 0.5;
          return;
        }
        this.clearStatus(pick);
        pick.puppet = { until: s.t + st.time, cell: i, dmg: st.dmg, hitT: 0 };
        pick.attacking = false;
        pick.setTint(0xd8a8ff);
        pick.tinted = true;
        this.ripple(pick.x, pick.y, 0xd28aff, 40, 300);
        s.snd('sparkle', pick.x);
        break;
      }
      case 'timestop': {
        const hit = s.zombies.filter(z => !z.dead && !z.puppet && Math.hypot(z.x - p.x, z.y - p.y) <= st.range + z.r * 0.5);
        for (const z of hit) {
          z.frozenUntil = s.t + st.time;
          z.vuln = st.vuln;
          z.setTint(0x9fc4d4);
          z.tinted = true;
        }
        for (const z of hit) s.hurt(z, st.dmg, { quiet: true });
        this.ripple(p.x, p.y, 0x5fe0ff, st.range, 600);
        s.snd('frost', p.x);
        break;
      }
      case 'sleep': { // 꿈의 요정: 주변 좀비를 재운다(맞으면 깨면서 세 배)
        const hit = s.zombies.filter(z => !z.dead && !z.puppet && !z.petrified && Math.hypot(z.x - target.x, z.y - target.y) <= st.radius);
        for (const z of hit) {
          s.hurt(z, st.dmg, { quiet: true });
          if (z.dead) continue;
          z.sleepUntil = s.t + st.time * (z.def.boss ? 0.4 : 1);
          z.wake = st.wake;
          z.setTint(0xe8c8f0);
          z.tinted = true;
        }
        this.ripple(target.x, target.y, 0xffb8f0, st.radius, 700);
        s.snd('sparkle', target.x);
        break;
      }
      case 'dice': { // 운명의 도박사: 1 헛방, 2~5 배율, 6 대박(화면의 모든 좀비에 번개)
        const roll = 1 + Math.floor(Math.random() * 6);
        s.floatText(p.x, p.y - 46, `주사위 ${roll}`, roll === 6 ? '#ffd84a' : '#ffffff', roll === 6 ? 28 : 20, true);
        if (roll === 1) {
          s.puff(mx, my, 0.6, 0xb8bfc4);
          s.snd('swish', p.x);
        } else if (roll < 6) {
          s.shootBullet(mx, my, ang, target, { ...st, dmg: Math.round((st.dmg * roll) / 2), tex: 'card', spin: true });
          s.snd('swish', p.x);
        } else {
          for (const z of s.zombies) {
            if (z.dead || z.puppet) continue;
            s.lines.push({ pts: s.zigzag(z.x + (Math.random() - 0.5) * 30, z.y - 160, z.x, z.y), color: 0xffd84a, width: 3, life: 0.35, max: 0.35 });
            s.hurt(z, st.dmg * 3);
          }
          s.ui.banner('대박! 주사위 6!');
          s.snd('zap', p.x);
        }
        break;
      }
      case 'decoy': { // 허수아비 술사: 좀비를 꾀는 허수아비
        if (this.decoys.filter(d => d.owner === u && !d.done).length >= 2) {
          u.cd = 1;
          return;
        }
        const tx = target.x + (this.L.CX - target.x) * 0.2;
        const ty = target.y + (this.L.CY - target.y) * 0.2;
        const img = s.add.image(tx, ty, 'scarecrow').setOrigin(0.5, 0.85).setDepth(5 + ty * 1e-5).setScale(0.3);
        s.tweens.add({ targets: img, scale: 1, duration: 260, ease: 'Back.Out' });
        this.decoys.push({ img, owner: u, x: tx, y: ty, hp: st.hp, maxHp: st.hp, life: st.time, st });
        s.snd('impact', tx);
        break;
      }
      case 'stone': { // 석화의 눈: 시선 안의 좀비가 점점 돌이 된다
        u.gaze = { ang, until: s.t + 0.6 };
        const half = (st.arc * Math.PI) / 360;
        for (const z of s.zombies) {
          if (z.dead || z.puppet || z.petrified) continue;
          const d = Math.hypot(z.x - p.x, z.y - p.y);
          if (d > st.range + z.r) continue;
          let diff = Math.atan2(z.y - p.y, z.x - p.x) - ang;
          diff = Math.atan2(Math.sin(diff), Math.cos(diff));
          if (Math.abs(diff) > half) continue;
          if (z.def.boss) { // 거대 좀비는 돌이 되지 않고 느려지기만 한다
            s.hurt(z, st.dmg, { quiet: true, slow: 0.3, slowTime: 0.6, slowTint: 0xb8b4a8 });
            continue;
          }
          s.hurt(z, st.dmg, { quiet: true });
          if (z.dead) continue;
          z.stone = (z.stone || 0) + st.build;
          if (z.stone >= 1) {
            z.petrified = s.t + st.time;
            z.setTint(0x8f9498);
            z.tinted = true;
          }
        }
        break;
      }
      case 'frog': { // 개구리 마법사: 무리를 개구리로
        const pool = s.zombies
          .filter(z => !z.dead && !z.puppet && !z.def.boss && !z.frogUntil && !z.petrified && Math.hypot(z.x - target.x, z.y - target.y) <= st.radius)
          .sort((a2, b2) => Math.hypot(a2.x - target.x, a2.y - target.y) - Math.hypot(b2.x - target.x, b2.y - target.y))
          .slice(0, st.count);
        for (const z of pool) {
          this.clearStatus(z);
          z.frogUntil = s.t + st.time;
          z.vuln = st.vuln;
          z.hopT = Math.random() * 0.5;
          z.setTexture('frog').setOrigin(0.5, 0.6);
          z.clearTint();
          s.hurt(z, st.dmg, { quiet: true });
        }
        this.ripple(target.x, target.y, 0x9be15d, st.radius, 500);
        s.snd('sparkle', target.x);
        break;
      }
      case 'tornado': { // 회오리 술사: 휩쓸어 밖으로 날려 보낸다
        const img = s.add.image(mx, my, 'tornado').setOrigin(0.5, 0.8).setDepth(7.2).setScale(0.4).setAlpha(0.9);
        s.tweens.add({ targets: img, scale: 1, duration: 300 });
        this.tornados.push({ img, x: mx, y: my, vx: Math.cos(ang) * st.speed, vy: Math.sin(ang) * st.speed, life: st.life, tick: 0, st, caught: new Set() });
        s.snd('swish', p.x);
        break;
      }
      default:
        break;
    }
  }

  // 다른 상태(개구리·돌·잠 등)를 지운다. 새 상태를 걸기 전에 부른다.
  clearStatus(z) {
    if (z.frogUntil) {
      z.setTexture(z.def.tex).setOrigin(0.5, BODY_OY);
      z.frogUntil = 0;
    }
    z.sleepUntil = 0;
    z.petrified = 0;
    z.stone = 0;
  }

  // 영웅 상태 때문에 좀비 색을 아직 되돌리면 안 되는지
  holdsTint(z) {
    const t = this.s.t;
    return z.frozenUntil > t || z.puppet || z.sleepUntil > t || z.petrified;
  }

  // ── 좀비 움직임 가로채기: true면 이번 프레임은 스스로 못 움직인다 ──
  controls(z, dt) {
    const s = this.s;
    if (z.puppet) {
      this.updatePuppet(z, dt);
      return true;
    }
    if (z.caughtBy) return true; // 회오리가 데려가는 중
    if (z.petrified) {
      if (s.t >= z.petrified) {
        // 돌이 부서지며 쓰러진다(보상은 그대로)
        z.petrified = 0;
        s.puff(z.x, z.y, z.r / 12, 0x9a9690);
        s.killZombie(z);
      }
      return true;
    }
    if (z.frogUntil) {
      if (s.t >= z.frogUntil) {
        this.clearStatus(z);
        return false;
      }
      z.hopT -= dt;
      if (z.hopT <= 0) {
        z.hopT = 0.6;
        const a = Math.random() * Math.PI * 2;
        const hx = z.x + Math.cos(a) * 28;
        const hy = z.y + Math.sin(a) * 28;
        s.tweens.add({ targets: z, x: hx, y: hy, duration: 260, ease: 'Sine.Out' });
        z.setFlipX(Math.cos(a) < 0);
      }
      return true;
    }
    if (z.sleepUntil > s.t) return true;
    if (z.frozenUntil > s.t) return true;
    if (z.knockT > 0) {
      z.knockT -= dt;
      z.x += z.kvx * dt;
      z.y += z.kvy * dt;
      return true;
    }
    for (const w of this.wells) {
      const dx = w.x - z.x;
      const dy = w.y - z.y;
      const d = Math.hypot(dx, dy);
      if (d > w.r * 1.4) continue;
      const pull = w.st.pull * (z.def.boss ? 0.3 : z.def.heavy ? 0.6 : 1) * dt;
      if (d > 6) {
        z.x += (dx / d) * Math.min(pull, d - 4);
        z.y += (dy / d) * Math.min(pull, d - 4);
      }
      return true;
    }
    // 허수아비에게 꾀이기(거대 좀비는 안 넘어간다)
    if (!z.def.boss) {
      for (const dc of this.decoys) {
        if (dc.done) continue;
        const dx = dc.x - z.x;
        const dy = dc.y - z.y;
        const d = Math.hypot(dx, dy);
        if (d > dc.st.radius) continue;
        z.attacking = false;
        z.setFlipX(dx < 0);
        if (d > z.r + 12) {
          const v = z.def.speed * dt;
          z.x += (dx / d) * v;
          z.y += (dy / d) * v;
        } else {
          z.atkT -= dt;
          if (z.atkT <= 0) {
            z.atkT = 1;
            dc.hp -= z.dmg;
            s.tweens.add({ targets: dc.img, angle: 6, duration: 70, yoyo: true });
          }
        }
        return true;
      }
    }
    return false;
  }

  updatePuppet(z, dt) {
    const s = this.s;
    const pp = z.puppet;
    z.attacking = false;
    if (s.t >= pp.until || !s.cells[pp.cell] || ALLY[s.cells[pp.cell].id].kind !== 'puppet') {
      z.puppet = null;
      s.killZombie(z);
      return;
    }
    let foe = null;
    let fd = 700;
    for (const o of s.zombies) {
      if (o === z || o.dead || o.puppet) continue;
      const d = Math.hypot(o.x - z.x, o.y - z.y);
      if (d < fd) {
        fd = d;
        foe = o;
      }
    }
    if (!foe) return;
    z.setFlipX(foe.x < z.x);
    const reach = z.r + foe.r + 4;
    if (fd > reach) {
      const v = z.def.speed * 1.5 * dt;
      z.x += ((foe.x - z.x) / fd) * v;
      z.y += ((foe.y - z.y) / fd) * v;
    } else {
      pp.hitT -= dt;
      if (pp.hitT <= 0) {
        pp.hitT = 0.5;
        s.hurt(foe, pp.dmg);
        s.tweens.add({ targets: z, x: z.x + ((foe.x - z.x) / fd) * 6, y: z.y + ((foe.y - z.y) / fd) * 6, duration: 80, yoyo: true });
      }
    }
  }

  // 받는 피해 배율(정지·개구리), 잠든 좀비는 깨면서 세 배
  damageMul(z) {
    const t = this.s.t;
    let m = 1;
    if (z.frozenUntil > t || z.frogUntil) m *= 1 + (z.vuln || 0);
    if (z.sleepUntil > t) {
      m *= z.wake || 1;
      z.sleepUntil = 0;
    }
    return m;
  }

  // 서로 밀어낼 때 무게(돌이 된 좀비는 꿈쩍도 안 한다)
  weight(z) {
    if (z.petrified || z.caughtBy) return 0;
    return z.def.heavy ? 0.15 : 0.5;
  }

  // 좀비가 쓰러질 때
  onKill(z) {
    const s = this.s;
    if (z.frogUntil) this.clearStatus(z);
    if (z.caughtBy) {
      z.caughtBy.caught.delete(z);
      z.caughtBy = null;
    }
    // 역병
    if (z.plague) {
      const n = s.zombies.filter(o => !o.dead && !o.puppet && o !== z && Math.hypot(o.x - z.x, o.y - z.y) <= z.plague.spread);
      for (const o of n) s.hurt(o, 0, { poison: z.plague.dps, poisonTime: z.plague.time, plague: z.plague, quiet: true });
      s.puff(z.x, z.y, 1.2, 0x7fdc4a);
      if (n.length) this.ripple(z.x, z.y, 0x7fdc4a, z.plague.spread, 380);
    }
    // 영혼 수집가
    for (const { u, i } of this.alliesOf('souls')) {
      u.souls = (u.souls || 0) + 1;
      if (u.souls >= u.st.need) {
        u.souls = 0;
        this.releaseSouls(u, i);
      }
    }
    // 유령 소환사
    for (const { u } of this.alliesOf('ghost')) {
      if (this.ghosts.length >= 12 || Math.random() > u.st.chance) continue;
      const img = s.add.image(z.x, z.y, 'ghost').setDepth(7.6).setAlpha(0).setScale(0.6);
      s.tweens.add({ targets: img, alpha: 0.9, scale: 1, duration: 250 });
      this.ghosts.push({ img, st: u.st, target: null, delay: 0.3, life: 5 });
    }
  }

  releaseSouls(u, i) {
    const s = this.s;
    const p = this.L.cellPos(i);
    const targets = s.zombies.filter(z => !z.dead && !z.puppet).sort((a, b) => b.hp - a.hp).slice(0, u.st.count);
    for (const z of targets) {
      s.lines.push({ pts: s.zigzag(p.x, p.y - 30, z.x, z.y), color: 0x9fffd0, width: 3, life: 0.45, max: 0.45 });
      s.hurt(z, u.st.dmg);
    }
    this.ripple(p.x, p.y, 0x9fffd0, 60, 400);
    s.snd('plasma', p.x);
  }

  // 남은 좀비가 모두 꼭두각시면 웨이브를 끝낼 수 있게 실을 끊는다
  releaseIfOnlyPuppets() {
    const s = this.s;
    if (s.queue.length || !s.zombies.length || !s.zombies.every(z => z.dead || z.puppet)) return;
    for (const z of s.zombies) {
      if (z.dead) continue;
      z.puppet = null;
      s.killZombie(z);
    }
  }

  ripple(x, y, color, radius, ms) {
    const ring = this.s.add.image(x, y, 'ring').setDepth(8).setTint(color).setAlpha(0.7).setScale(0.2);
    this.s.tweens.add({ targets: ring, scale: radius / 30, alpha: 0, duration: ms, ease: 'Quad.Out', onComplete: () => ring.destroy() });
  }

  nearestZombie(x, y, maxD = 600) {
    let best = null;
    let bd = maxD;
    for (const z of this.s.zombies) {
      if (z.dead || z.puppet || z.petrified) continue;
      const d = Math.hypot(z.x - x, z.y - y);
      if (d < bd) {
        bd = d;
        best = z;
      }
    }
    return best;
  }

  // ── 매 프레임 ──
  update(dt) {
    const s = this.s;
    for (const ec of this.echoes) {
      ec.t -= dt;
      if (ec.t <= 0) {
        ec.done = true;
        this.runEcho(ec);
      }
    }
    if (this.echoes.some(e => e.done)) this.echoes = this.echoes.filter(e => !e.done);

    this.updateWisps(dt);
    this.updateWells(dt);
    this.updatePools(dt);
    this.updateDecoys(dt);
    this.updateDragons(dt);
    this.updateTornados(dt);
    this.updateGhosts(dt);
    this.draw();
  }

  updateWisps(dt) {
    const s = this.s;
    for (const b of this.wisps) {
      b.life -= dt;
      if (b.life <= 0) {
        b.done = true;
        continue;
      }
      if (!b.target || b.target.dead || b.target.puppet) b.target = this.nearestZombie(b.img.x, b.img.y, 520);
      const tx = b.target ? b.target.x : b.home.x + Math.cos(b.wob + s.t * 3) * 40;
      const ty = b.target ? b.target.y : b.home.y + Math.sin(b.wob + s.t * 3) * 40;
      const dx = tx - b.img.x;
      const dy = ty - b.img.y;
      const d = Math.hypot(dx, dy) || 1;
      const k = Math.min(1, 7 * dt);
      b.vx += ((dx / d) * b.st.speed - b.vx) * k;
      b.vy += ((dy / d) * b.st.speed - b.vy) * k;
      b.img.x += b.vx * dt;
      b.img.y += b.vy * dt + Math.sin(s.t * 6 + b.wob) * 0.4;
      b.img.rotation = Math.atan2(b.vy, b.vx) + Math.PI / 2;
      b.sting -= dt;
      if (b.target && d < b.target.r + 6 && b.sting <= 0) {
        b.sting = b.st.sting;
        s.hurt(b.target, b.st.dmg);
      }
      if (b.life < 0.4) b.img.setAlpha(b.life / 0.4);
    }
    if (this.wisps.some(b => b.done)) {
      this.wisps = this.wisps.filter(b => {
        if (b.done) {
          b.img.destroy();
          b.owner.wisps = Math.max(0, (b.owner.wisps || 1) - 1);
        }
        return !b.done;
      });
    }
  }

  updateWells(dt) {
    const s = this.s;
    for (const w of this.wells) {
      w.life -= dt;
      w.img.rotation -= 1.6 * dt;
      w.tick -= dt;
      if (w.tick <= 0) {
        w.tick = 0.25;
        for (const z of s.zombies) if (!z.dead && !z.puppet && Math.hypot(z.x - w.x, z.y - w.y) <= w.r * 1.2) s.hurt(z, w.st.dmg, { quiet: true });
      }
      if (w.life <= 0) {
        w.done = true;
        s.explode(w.x, w.y, w.r, w.st.burst, 0x8a6cff, 'bigboom');
        const img = w.img;
        s.tweens.add({ targets: img, scale: img.scale * 0.2, alpha: 0, duration: 250, onComplete: () => img.destroy() });
      }
    }
    if (this.wells.some(w => w.done)) this.wells = this.wells.filter(w => !w.done);
  }

  updatePools(dt) {
    const s = this.s;
    for (const t of this.pools) {
      t.life -= dt;
      t.tick -= dt;
      if (t.tick <= 0) {
        t.tick = 0.5;
        for (const z of s.zombies) {
          if (z.dead || z.puppet) continue;
          if (Math.hypot(z.x - t.x, z.y - t.y) <= t.r + z.r * 0.4) s.hurt(z, t.st.dmg, { slow: t.st.slow, slowTime: 0.7, slowTint: 0xb8d890 });
        }
      }
      if (t.life <= 0) {
        t.done = true;
        const img = t.img;
        s.tweens.add({ targets: img, alpha: 0, scale: img.scale * 0.8, duration: 300, onComplete: () => img.destroy() });
      }
    }
    if (this.pools.some(t => t.done)) this.pools = this.pools.filter(t => !t.done);
  }

  updateDecoys(dt) {
    const s = this.s;
    for (const dc of this.decoys) {
      if (dc.done) continue;
      dc.life -= dt;
      if (dc.hp <= 0 || dc.life <= 0) {
        dc.done = true;
        s.explode(dc.x, dc.y, dc.st.radius * 0.55, dc.st.dmg, 0xffc860, 'boom');
        const img = dc.img;
        s.tweens.add({ targets: img, alpha: 0, scale: 0.6, duration: 250, onComplete: () => img.destroy() });
      }
    }
    if (this.decoys.some(d => d.done)) this.decoys = this.decoys.filter(d => !d.done);
  }

  // 용: 용 조련사마다 한 마리, 기지 둘레를 돌며 가까운 좀비에게 불을 뿜는다
  updateDragons(dt) {
    const s = this.s;
    const alive = new Set();
    for (const { u } of this.alliesOf('dragon')) {
      alive.add(u);
      let d = this.dragons.get(u);
      if (!d) {
        const img = s.add.image(this.L.CX, this.L.CY, 'dragon').setDepth(8.2).setAlpha(0);
        s.tweens.add({ targets: img, alpha: 1, duration: 300 });
        d = { img, ang: Math.random() * Math.PI * 2, cd: 0 };
        this.dragons.set(u, d);
      }
      d.ang += u.st.spin * dt;
      const x = this.L.CX + Math.cos(d.ang) * u.st.orbit;
      const y = this.L.CY + Math.sin(d.ang) * u.st.orbit * 0.92 + Math.sin(s.t * 3) * 4;
      d.img.setPosition(x, y);
      d.cd -= dt;
      const z = this.nearestZombie(x, y, u.st.range);
      if (z) {
        d.img.setFlipX(z.x < x);
        if (d.cd <= 0) {
          d.cd = 1 / u.st.rate;
          s.hurt(z, u.st.dmg, { quiet: true });
          if (s.flames.length < 90) {
            const an = Math.atan2(z.y - y, z.x - x);
            const img = s.add.image(x, y, 'fire').setDepth(8.1).setScale(0.1).setAlpha(0.85);
            s.flames.push({ img, vx: Math.cos(an) * 260, vy: Math.sin(an) * 260, life: 0.3, max: 0.3 });
          }
        }
      } else {
        d.img.setFlipX(-Math.sin(d.ang) < 0);
      }
    }
    for (const [u, d] of this.dragons) {
      if (alive.has(u)) continue;
      d.img.destroy();
      this.dragons.delete(u);
    }
  }

  updateTornados(dt) {
    const s = this.s;
    for (const tn of this.tornados) {
      tn.life -= dt;
      tn.x += tn.vx * dt;
      tn.y += tn.vy * dt;
      tn.img.setPosition(tn.x, tn.y);
      tn.img.rotation = Math.sin(s.t * 5) * 0.12;
      // 닿은 좀비를 붙잡는다(거대 좀비는 피해만)
      for (const z of s.zombies) {
        if (z.dead || z.puppet || z.caughtBy || tn.caught.has(z)) continue;
        if (Math.hypot(z.x - tn.x, z.y - tn.y) > tn.st.radius + z.r * 0.5) continue;
        if (z.def.boss) {
          if (!z.tornadoHit || z.tornadoHit < s.t) {
            z.tornadoHit = s.t + 0.5;
            s.hurt(z, tn.st.dmg);
          }
          continue;
        }
        this.clearStatus(z);
        z.caughtBy = tn;
        z.spinA = Math.random() * Math.PI * 2;
        tn.caught.add(z);
      }
      tn.tick -= dt;
      const hitNow = tn.tick <= 0;
      if (hitNow) tn.tick = 0.5;
      for (const z of tn.caught) {
        if (z.dead) continue;
        z.spinA += 7 * dt;
        z.x = tn.x + Math.cos(z.spinA) * 18;
        z.y = tn.y - 20 + Math.sin(z.spinA) * 8;
        if (hitNow) s.hurt(z, tn.st.dmg, { quiet: true });
      }
      if (tn.life <= 0) {
        tn.done = true;
        for (const z of tn.caught) {
          if (z.dead) continue;
          z.caughtBy = null;
          const a = Math.random() * Math.PI * 2;
          z.knockT = 0.3;
          z.kvx = Math.cos(a) * 200;
          z.kvy = Math.sin(a) * 200;
        }
        const img = tn.img;
        s.tweens.add({ targets: img, alpha: 0, scale: 0.5, duration: 300, onComplete: () => img.destroy() });
      }
    }
    if (this.tornados.some(t => t.done)) this.tornados = this.tornados.filter(t => !t.done);
  }

  updateGhosts(dt) {
    const s = this.s;
    for (const gh of this.ghosts) {
      gh.life -= dt;
      gh.delay -= dt;
      if (gh.life <= 0) {
        gh.done = true;
        continue;
      }
      if (gh.delay > 0) {
        gh.img.y -= 20 * dt;
        continue;
      }
      if (!gh.target || gh.target.dead || gh.target.puppet) gh.target = this.nearestZombie(gh.img.x, gh.img.y, 700);
      if (!gh.target) continue;
      const dx = gh.target.x - gh.img.x;
      const dy = gh.target.y - gh.img.y;
      const d = Math.hypot(dx, dy) || 1;
      gh.img.setFlipX(dx < 0);
      const v = 260 * dt;
      gh.img.x += (dx / d) * Math.min(v, d);
      gh.img.y += (dy / d) * Math.min(v, d);
      if (d < gh.target.r + 8) {
        gh.done = true;
        s.explode(gh.img.x, gh.img.y, gh.st.radius, gh.st.dmg, 0xe8f0ff, 'boom');
      }
    }
    if (this.ghosts.some(g => g.done)) {
      this.ghosts = this.ghosts.filter(g => {
        if (g.done) {
          const img = g.img;
          s.tweens.add({ targets: img, alpha: 0, duration: 200, onComplete: () => img.destroy() });
        }
        return !g.done;
      });
    }
  }

  // 실(인형사 → 꼭두각시), 정지 시계, 잠 표시, 돌 금, 영혼 구슬, 석화 시선
  draw() {
    const s = this.s;
    const g = this.g;
    g.clear();
    for (const z of s.zombies) {
      if (z.dead) continue;
      if (z.puppet) {
        const p = this.L.cellPos(z.puppet.cell);
        g.lineStyle(1.5, 0xe8c8ff, 0.7);
        g.lineBetween(p.x - 8, p.y - 44, z.x - 6, z.y - z.r);
        g.lineBetween(p.x + 8, p.y - 44, z.x + 6, z.y - z.r);
      } else if (z.frozenUntil > s.t) {
        const left = (z.frozenUntil - s.t) / 2.2;
        g.lineStyle(2, 0x5fe0ff, 0.8);
        g.beginPath();
        g.arc(z.x, z.y, z.r + 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0, Math.min(1, left)), false);
        g.strokePath();
      } else if (z.sleepUntil > s.t) {
        // 'Z' 두 개
        g.lineStyle(2, 0xffd8f4, 0.9);
        for (const [ox, oy, k] of [[z.r * 0.5, -z.r - 6, 6], [z.r * 0.9, -z.r - 16, 4]]) {
          const x = z.x + ox;
          const y = z.y + oy + Math.sin(s.t * 2 + ox) * 2;
          g.beginPath(); g.moveTo(x - k, y - k); g.lineTo(x + k, y - k); g.lineTo(x - k, y + k); g.lineTo(x + k, y + k); g.strokePath();
        }
      } else if (z.petrified) {
        g.lineStyle(1.5, 0x4a4a48, 0.8);
        g.lineBetween(z.x - z.r * 0.4, z.y - z.r * 0.6, z.x, z.y);
        g.lineBetween(z.x, z.y, z.x + z.r * 0.3, z.y + z.r * 0.5);
      } else if (z.stone > 0) {
        g.lineStyle(3, 0x9a9690, 0.7);
        g.beginPath(); g.arc(z.x, z.y, z.r + 5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, z.stone), false); g.strokePath();
      }
    }
    // 허수아비 체력
    for (const dc of this.decoys) {
      if (dc.done) continue;
      const k = Math.max(0, dc.hp / dc.maxHp);
      g.fillStyle(0x000000, 0.5); g.fillRect(dc.x - 20, dc.y + 8, 40, 5);
      g.fillStyle(0xffc860, 1); g.fillRect(dc.x - 20, dc.y + 8, 40 * k, 5);
    }
    // 영혼 구슬(모은 만큼 영혼 수집가 주위를 돈다)
    for (const { u, i } of this.alliesOf('souls')) {
      const p = this.L.cellPos(i);
      const n = u.souls || 0;
      for (let k = 0; k < n; k++) {
        const a = s.t * 1.5 + (k / Math.max(1, u.st.need)) * Math.PI * 2;
        g.fillStyle(0x9fffd0, 0.85);
        g.fillCircle(p.x + Math.cos(a) * 38, p.y - 4 + Math.sin(a) * 30, 3);
      }
    }
    // 석화의 시선(옅고 고르게)
    for (const { u, i } of this.alliesOf('stone')) {
      if (!u.gaze || u.gaze.until < s.t) continue;
      const p = this.L.cellPos(i);
      const half = (u.st.arc * Math.PI) / 360;
      g.fillStyle(0xd8d0a0, 0.1);
      g.slice(p.x, p.y, u.st.range, u.gaze.ang - half, u.gaze.ang + half, false);
      g.fillPath();
    }
  }

  clearWave() {
    for (const b of this.wisps) b.life = Math.min(b.life, 1);
  }
}
