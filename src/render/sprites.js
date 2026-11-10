// 동그라미 캐릭터 텍스처 만들기 + 아군(몸 + 무기) 묶음.
import { ALLIES } from '../data/allies.js';
import { drawPerson, drawWeapon, allyLook, ZOMBIE_LOOK, BY, HAND } from './blob.js';

export const ALLY_SCALE = 1.45;
// 좀비 그림 크기. 맞는 범위(zombies.js radius)는 그림 반지름의 약 75%.
export const ZOMBIE_SCALE = {
  walker: 1.3, runner: 1.15, brute: 1.9, spitter: 1.3, boss: 3.0,
  armored: 1.4, splitter: 1.35, splitling: 1.0, healer: 1.3,
  charger: 2.9, gravedigger: 2.9, ironclad: 3.05, rainlord: 3.7,
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
    const look = ZOMBIE_LOOK[kind];
    canvasTexture(scene, `z_${kind}`, BOX.l + BOX.r, BOX.t + BOX.b, zs, ctx => drawPerson(ctx, BOX.l * zs, BOX.t * zs, zs, { ...look, zombie: true, aim: 0 }));
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
