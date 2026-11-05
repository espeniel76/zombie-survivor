// 화면 공용 요소: 색, 글꼴, 버튼
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

export function panel(scene, x, y, w, h, fill = COLOR.panel, edge = COLOR.panelEdge, radius = 18) {
  const g = scene.add.graphics();
  g.fillStyle(fill, 0.96);
  g.fillRoundedRect(x - w / 2, y - h / 2, w, h, radius);
  g.lineStyle(3, edge, 1);
  g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, radius);
  return g;
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

// 둥근 버튼. 누르면 살짝 작아졌다 돌아온다(번쩍임 없음).
export function button(scene, x, y, w, h, label, onClick, opts = {}) {
  const fill = opts.fill ?? COLOR.green;
  const textColor = opts.textColor ?? '#13200b';
  const c = scene.add.container(x, y);
  const g = scene.add.graphics();
  const draw = (f) => {
    g.clear();
    g.fillStyle(0x000000, 0.35);
    g.fillRoundedRect(-w / 2, -h / 2 + 6, w, h, 16);
    g.fillStyle(f, 1);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, 16);
  };
  draw(fill);
  const t = text(scene, 0, 0, label, opts.size ?? 32, textColor, { strokeThickness: 0 });
  c.add([g, t]);
  c.setSize(w, h);
  c.setInteractive({ useHandCursor: true });
  c.on('pointerdown', () => {
    scene.tweens.add({ targets: c, scale: 0.95, duration: 60, yoyo: true });
  });
  c.on('pointerup', () => {
    if (c.disabled) return;
    sfx('click');
    onClick();
  });
  c.label = t;
  c.setFill = (f) => draw(f);
  return c;
}
