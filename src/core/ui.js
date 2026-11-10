// 화면 공용 요소: 색, 글꼴, 버튼, 부드러운 나타나기/사라지기
import Phaser from 'phaser';
import { sfx } from './sfx.js';

export const W = 720;
export const H = 1280;

export const FONT = "'Pretendard', 'Noto Sans KR', 'Malgun Gothic', 'Apple SD Gothic Neo', system-ui, sans-serif";

export const COLOR = {
  bg: 0x11151a,
  panel: 0x1b222b,
  panelEdge: 0x2e3a47,
  green: 0x9be15d,
  orange: 0xffb347,
  red: 0xe5534b,
  blue: 0x5fb4ff,
  text: '#eef3ea',
  dim: '#93a39a',
  greenText: '#9be15d',
  orangeText: '#ffb347',
};

// 받침이 있으면 a(이/을), 없으면 b(가/를)
export function josa(word, a, b) {
  const c = word.charCodeAt(word.length - 1);
  const has = c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0;
  return word + (has ? a : b);
}

export function text(scene, x, y, str, size = 28, color = COLOR.text, opts = {}) {
  return scene.add
    .text(x, y, str, {
      fontFamily: FONT,
      fontSize: `${size}px`,
      color,
      fontStyle: opts.bold === false ? 'normal' : 'bold',
      align: opts.align || 'center',
      wordWrap: opts.wrap ? { width: opts.wrap, useAdvancedWrap: true } : undefined,
      stroke: opts.stroke || '#0b0e12',
      strokeThickness: opts.strokeThickness ?? Math.round(size / 7),
      lineSpacing: opts.lineSpacing ?? 4,
    })
    .setOrigin(opts.ox ?? 0.5, opts.oy ?? 0.5);
}

// 창 바탕: 둥근 모서리 + 부드러운 그림자
export function panel(scene, x, y, w, h, fill = COLOR.panel, edge = COLOR.panelEdge, radius = 26) {
  const g = scene.add.graphics();
  const l = x - w / 2;
  const t = y - h / 2;
  for (let k = 3; k >= 1; k--) {
    g.fillStyle(0x000000, 0.1);
    g.fillRoundedRect(l - k * 2, t + k * 3, w + k * 4, h, radius + k * 2);
  }
  g.fillStyle(fill, 0.97);
  g.fillRoundedRect(l, t, w, h, radius);
  g.lineStyle(2, edge, 1);
  g.strokeRoundedRect(l, t, w, h, radius);
  return g;
}

// ── 부드럽게 나타나고 사라지기(모두 천천히 밝기만 바뀐다. 번쩍임 없음) ──
const CURTAIN = 0x0b0e12;

// 안에 든 버튼까지 모두 못 누르게(사라지는 동안 두 번 눌리지 않게)
export function disableAll(obj) {
  obj.disableInteractive?.();
  obj.list?.forEach(disableAll);
}

// 나타나기: 투명 → 보임, 살짝 아래에서 제자리로
export function appear(scene, target, { duration = 240, delay = 0, dy = 14 } = {}) {
  scene.tweens.killTweensOf(target);
  target._baseY ??= target.y; // 빨리 연달아 불려도 제자리가 어긋나지 않게
  const y = target._baseY;
  target.setAlpha(0).setY(y + dy);
  scene.tweens.add({ targets: target, alpha: 1, y, duration, delay, ease: 'Cubic.Out' });
  return target;
}

// 사라지기: 투명해진 뒤 지운다
export function vanish(scene, target, { duration = 150, destroy = true, then } = {}) {
  disableAll(target);
  scene.tweens.killTweensOf(target);
  scene.tweens.add({
    targets: target, alpha: 0, duration, ease: 'Quad.In',
    onComplete: () => {
      if (destroy) target.destroy();
      then?.();
    },
  });
}

// 화면 전체가 어둠에서 밝아진다(장면이 시작될 때)
export function curtainIn(scene, duration = 280) {
  scene._leaving = false;
  const r = scene.add.rectangle(W / 2, H / 2, W, H, CURTAIN, 1).setDepth(10000);
  scene.tweens.add({ targets: r, alpha: 0, duration, ease: 'Quad.Out', onComplete: () => r.destroy() });
}

// 화면 전체가 어두워진 뒤 다음 장면으로(그동안은 아무것도 안 눌린다)
export function curtainOut(scene, then, duration = 200) {
  if (scene._leaving) return;
  scene._leaving = true;
  const r = scene.add.rectangle(W / 2, H / 2, W, H, CURTAIN, 1).setDepth(10000).setAlpha(0).setInteractive();
  scene.tweens.add({ targets: r, alpha: 1, duration, ease: 'Quad.In', onComplete: then });
}

// 설정 줄 3개(번쩍임/소리/피해 숫자). 컨테이너에 넣고 맨 아래 y를 돌려준다.
export function settingsRows(scene, container, x, y, save, onChange) {
  const rows = [
    { key: 'flash', label: '번쩍임 효과', on: '켜짐', off: '꺼짐 (안전)' },
    { key: 'sound', label: '소리', on: '켜짐', off: '꺼짐' },
    { key: 'numbers', label: '피해 숫자', on: '보임', off: '숨김' },
  ];
  rows.forEach((r, k) => {
    const ry = y + k * 92;
    container.add(text(scene, x - 250, ry, r.label, 30, COLOR.text, { ox: 0 }));
    const b = button(scene, x + 150, ry, 230, 70, '', () => {
      save.settings[r.key] = !save.settings[r.key];
      paint();
      onChange?.();
    }, { size: 26 });
    const paint = () => {
      const v = save.settings[r.key];
      b.label.setText(v ? r.on : r.off);
      b.setFill(v ? COLOR.green : 0x55606b);
      b.label.setColor(v ? '#13200b' : '#eef3ea');
    };
    paint();
    container.add(b);
  });
  return y + rows.length * 92;
}

// 둥근 버튼. 위는 살짝 밝고 아래는 살짝 어두운 면, 부드러운 그림자.
// 손가락을 올리면 살짝 밝아지고, 누르면 살짝 어두워지며 작아진다 — 모두 천천히 바뀌는 fade(번쩍임 없음).
export function button(scene, x, y, w, h, label, onClick, opts = {}) {
  const fill = opts.fill ?? COLOR.green;
  const textColor = opts.textColor ?? '#13200b';
  const r = opts.radius ?? Math.min(h / 2, 26);
  const c = scene.add.container(x, y);
  const shadow = scene.add.graphics();
  const g = scene.add.graphics();
  const shape = (gr, color, alpha) => {
    gr.clear();
    gr.fillStyle(color, alpha);
    gr.fillRoundedRect(-w / 2, -h / 2, w, h, r);
  };
  for (let k = 3; k >= 1; k--) {
    shadow.fillStyle(0x000000, 0.13);
    shadow.fillRoundedRect(-w / 2 - k, -h / 2 + 2 + k * 1.6, w + k * 2, h, r + k);
  }
  // 아래쪽에 살짝 어두운 두께(말랑한 젤리 버튼 느낌) + 위쪽에 작은 윤기
  const lip = Math.max(3, Math.round(h * 0.07));
  const draw = (f) => {
    g.clear();
    g.fillStyle(Phaser.Display.Color.IntegerToColor(f).darken(22).color, 1);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, r);
    g.fillStyle(f, 1);
    g.fillRoundedRect(-w / 2, -h / 2, w, h - lip, r);
    // 어두운 버튼은 윤기를 더 옅게(줄무늬처럼 보이지 않게)
    const c0 = Phaser.Display.Color.IntegerToColor(f);
    const lum = (0.3 * c0.red + 0.59 * c0.green + 0.11 * c0.blue) / 255;
    g.fillStyle(0xffffff, 0.04 + 0.12 * lum);
    const gw = w - r * 1.2;
    const gh = Math.max(4, h * 0.16);
    g.fillRoundedRect(-gw / 2, -h / 2 + Math.max(3, h * 0.08), gw, gh, gh / 2);
  };
  draw(fill);
  // 밝아지는 막과 어두워지는 막(투명도만 천천히 바뀐다)
  const lit = scene.add.graphics().setAlpha(0);
  const dark = scene.add.graphics().setAlpha(0);
  shape(lit, 0xffffff, 0.12);
  shape(dark, 0x000000, 0.2);
  const t = text(scene, 0, -lip / 2, label, opts.size ?? 32, textColor, { strokeThickness: 0 });
  c.add([shadow, g, lit, dark, t]);
  c.setSize(w, h);
  c.setInteractive({ useHandCursor: true });
  const to = (target, alpha, duration) => {
    scene.tweens.killTweensOf(target);
    scene.tweens.add({ targets: target, alpha, duration, ease: 'Quad.Out' });
  };
  const release = () => {
    to(dark, 0, 180);
    scene.tweens.add({ targets: c, scale: 1, duration: 160, ease: 'Back.Out' });
  };
  c.on('pointerover', () => to(lit, 1, 140));
  c.on('pointerout', () => {
    to(lit, 0, 200);
    release();
  });
  c.on('pointerdown', () => {
    to(dark, 1, 90);
    scene.tweens.add({ targets: c, scale: 0.96, duration: 90, ease: 'Quad.Out' });
  });
  c.on('pointerup', () => {
    release();
    if (c.disabled) return;
    sfx('click');
    onClick();
  });
  c.label = t;
  c.setFill = (f) => draw(f);
  return c;
}
