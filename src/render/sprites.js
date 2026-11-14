// 동그라미 캐릭터 텍스처 만들기 + 아군(몸 + 무기) 묶음 + 좀비 걷기.
import { ALLIES } from '../data/allies.js';
import { drawPerson, drawWeapon, drawLegs, allyLook, ZOMBIE_LOOK, BY, HAND } from './blob.js';
import { gaitOf, feetAt, bodyAt, phaseFor, landed, TAU } from './gait.js';

export const ALLY_SCALE = 1.45;
// 좀비 그림 크기. 맞는 범위(zombies.js radius)는 그림 반지름의 약 75%.
export const ZOMBIE_SCALE = {
  walker: 1.3, runner: 1.15, brute: 1.9, spitter: 1.3, boss: 3.0,
  armored: 1.4, splitter: 1.35, splitling: 1.0, healer: 1.3,
  charger: 2.9, gravedigger: 2.9, ironclad: 3.05, rainlord: 3.7,
  spewer: 2.9, shade: 2.9, frostgiant: 3.0, drummer: 3.0, foreman: 3.1,
};

// 몸 텍스처의 그림 상자(그림 단위). 빛, 모자, 연료통까지 들어가게.
const BOX = { l: 46, r: 46, t: 84, b: 16 };
export const BODY_OY = (BOX.t + BY) / (BOX.t + BOX.b); // 이미지 원점 = 몸 중심
// 무기 텍스처 상자. 손(회전 중심)이 (0,0)
const WBOX = { l: 14, r: 42, t: 20, b: 20 };
const W_OX = WBOX.l / (WBOX.l + WBOX.r);

function canvasTexture(scene, key, wUnits, hUnits, s, draw) {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const tex = scene.textures.createCanvas(key, Math.ceil(wUnits * s), Math.ceil(hUnits * s));
  draw(tex.context);
  tex.refresh();
}

export function buildCharacterTextures(scene) {
  const s = ALLY_SCALE;
  for (const a of ALLIES) {
    const look = allyLook(a);
    canvasTexture(scene, `ally_${a.id}`, BOX.l + BOX.r, BOX.t + BOX.b, s, ctx => drawPerson(ctx, BOX.l * s, BOX.t * s, s, { ...look, aim: 0 }, 'body'));
    canvasTexture(scene, `allyw_${a.id}`, WBOX.l + WBOX.r, WBOX.t + WBOX.b, s, ctx => drawWeapon(ctx, WBOX.l * s, WBOX.t * s, s, look));
  }
  for (const [kind, zs] of Object.entries(ZOMBIE_SCALE)) {
    const look = { ...ZOMBIE_LOOK[kind], zombie: true, aim: 0 };
    // 몸(발 없이) + 발 그림 여러 장(걷는 한 바퀴 WALK_FRAMES장 + 서 있는 1장)
    canvasTexture(scene, `z_${kind}`, BOX.l + BOX.r, BOX.t + BOX.b, zs, ctx => drawPerson(ctx, BOX.l * zs, BOX.t * zs, zs, { ...look, legs: false }));
    // 금빛 좀비(황금 열쇠를 떨어뜨림): 몸만 금색, 눈은 그대로 하얗게
    if (!['boss', 'charger', 'gravedigger', 'ironclad', 'rainlord', 'spewer', 'shade', 'frostgiant', 'drummer', 'foreman'].includes(kind)) {
      canvasTexture(scene, `z_${kind}_gold`, BOX.l + BOX.r, BOX.t + BOX.b, zs, ctx => drawPerson(ctx, BOX.l * zs, BOX.t * zs, zs, { ...look, skin: '#f2c230', shirt: '#b8860b', legs: false }));
    }
    const key = `zl_${kind}`;
    const fw = Math.ceil((LBOX.l + LBOX.r) * zs);
    const fh = Math.ceil((LBOX.t + LBOX.b) * zs);
    if (scene.textures.exists(key)) scene.textures.remove(key);
    const tex = scene.textures.createCanvas(key, fw * (WALK_FRAMES + 1), fh);
    const g = gaitOf(kind);
    for (let f = 0; f <= WALK_FRAMES; f++) {
      const offs = f < WALK_FRAMES ? feetAt(g, (f / WALK_FRAMES) * TAU) : null;
      drawLegs(tex.context, f * fw + LBOX.l * zs, LBOX.t * zs, zs, look, offs);
      tex.add(f, 0, f * fw, 0, fw, fh);
    }
    tex.refresh();
  }
}

// ── 좀비 걷기 ──
// 몸 이미지(z) 밑에 발 이미지(z.legs)를 깔고, 실제로 걸은 거리만큼 발을 내딛는다(발이 미끄러지지 않게).
// 몸은 걸음에 맞춰 출렁이고 좌우로 기운다. 덩치·거인은 디딜 때 onStomp(x, y, 크기)를 부른다(먼지).
export const WALK_FRAMES = 16;
const STAND = WALK_FRAMES;
const LBOX = { l: 32, r: 32, t: 18, b: 9 }; // 발 그림 상자(발밑이 (0,0))
const LEGS_OY = LBOX.t / (LBOX.t + LBOX.b);
const BODY_H = BOX.t + BOX.b;

// 새로 나온(또는 다시 쓰는) 좀비 몸 이미지에 발을 붙인다. size = 크기 배율(이미지 setScale 값)
export function attachLegs(scene, z, kind, size = 1) {
  const key = `zl_${kind}`;
  if (!z.legs) z.legs = scene.add.image(0, 0, key, STAND);
  z.legs.setTexture(key, STAND).setOrigin(0.5, LEGS_OY).setScale(size).setVisible(true).setAlpha(z.alpha).clearTint();
  z.gait = gaitOf(kind);
  z.zs = ZOMBIE_SCALE[kind];
  z.size = size;
  z.ph = Math.random() * TAU;
  z.wk = 0; // 걷는 정도(0 서 있음 ~ 1 걷는 중)
  z.lx = z.x;
  z.ly = z.y;
  z.setOrigin(0.5, BODY_OY).setRotation(0).setScale(size);
  placeLegs(z, STAND);
}

function placeLegs(z, frame) {
  const L = z.legs;
  L.setPosition(z.x, z.y - BY * z.zs * z.size).setFlipX(z.flipX).setDepth(z.depth - 1e-6).setAlpha(z.alpha).setVisible(z.visible);
  if (frame !== undefined) L.setFrame(frame);
  if (z.isTinted) L.setTint(z.tintTopLeft);
  else if (L.isTinted) L.clearTint();
}

// 매 프레임. walking: 이번 프레임에 스스로 걸었는지(밀려나거나 끌려간 건 걸음이 아니다)
// hold: 얼거나 돌이 된 좀비는 그 자세 그대로 멈춘다
export function stepLegs(z, dt, walking, hold = false, onStomp = null) {
  if (!z.legs) return;
  if (hold) {
    z.lx = z.x;
    z.ly = z.y;
    placeLegs(z);
    return;
  }
  const moved = walking ? Math.hypot(z.x - z.lx, z.y - z.ly) : 0;
  z.lx = z.x;
  z.ly = z.y;
  const g = z.gait;
  const prev = z.ph;
  z.ph += phaseFor(moved, g.stride * z.zs * z.size);
  const steps = onStomp && g.stomp && z.wk > 0.5 ? landed(prev, z.ph) : [];
  if (z.ph > TAU * 64) z.ph -= TAU * 64; // 숫자가 너무 커지지 않게(위상은 2π 주기)
  const on = dt > 0 && moved / dt > 4 ? 1 : 0; // 1초에 4px 넘게 움직이면 걷는 중
  z.wk += (on - z.wk) * Math.min(1, dt * 10);
  const b = bodyAt(g, z.ph);
  const k = z.wk;
  const face = z.flipX ? -1 : 1;
  z.setRotation(b.rot * k * face);
  z.setScale(z.size * (1 + (b.sx - 1) * k), z.size * (1 + (b.sy - 1) * k));
  z.setOrigin(0.5, BODY_OY - (b.dy * k) / BODY_H);
  const frame = k < 0.3 ? STAND : Math.floor((((z.ph % TAU) + TAU) % TAU) / TAU * WALK_FRAMES) % WALK_FRAMES;
  placeLegs(z, frame);
  for (const i of steps) {
    const fx = z.x + ([-8, 8][i] + g.stride) * z.zs * z.size * face;
    onStomp(fx, z.legs.y, g.stomp * z.zs * z.size);
  }
}

// 아군 한 명(몸 + 무기). 컨테이너 원점 = 몸 중심. aimAt(라디안)으로 좌우를 돌리고 무기를 기울인다.
export function allyView(scene, x, y, id, scale = 1) {
  const c = scene.add.container(x, y);
  const body = scene.add.image(0, 0, `ally_${id}`).setOrigin(0.5, BODY_OY);
  const gun = scene.add.image(0, 0, `allyw_${id}`).setOrigin(W_OX, 0.5);
  const fixed = ALLIES.find(a => a.id === id).look.gun === 'bag';
  c.add([body, gun]);
  c.setScale(scale);
  c.aimAt = (ang) => {
    const left = Math.cos(ang) < 0;
    body.setFlipX(left);
    gun.setPosition(HAND.x * ALLY_SCALE * (left ? -1 : 1), HAND.y * ALLY_SCALE);
    // 가방은 기울이지 않고 좌우만 바꾼다
    const a = fixed ? (left ? Math.PI : 0) : ang;
    gun.setRotation(a).setFlipY(left);
  };
  c.aimAt(-0.25);
  return c;
}
