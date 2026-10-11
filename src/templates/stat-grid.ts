import type { TemplateDef } from './types';
import {
  FONT,
  buildStats,
  drawWatermark,
  paintBackground,
  palette,
  roundRect,
  statLabel,
  statValue,
} from './helpers';

// 1080x1080 square — stat focus. Stats end well above the footer strip
// where the watermark sits, so the two never collide.

export const StatGrid: TemplateDef = {
  id: 'stat-grid',
  name: 'Stat Grid',
  desc: 'Bold numbers (1:1 square post)',
  width: 1080,
  height: 1080,
  render(ctx, w, o) {
    const W = 1080;
    const H = 1080;
    const p = palette(o);
    paintBackground(ctx, W, H, o.background, o.overlay, '#111827', '#3b0764', o.transparent);

    ctx.fillStyle = p.title;
    ctx.font = `800 72px ${FONT}`;
    ctx.fillText((o.title || w.meta.sport.toUpperCase()).slice(0, 22), 64, 148);
    ctx.fillStyle = o.accent;
    ctx.fillRect(66, 176, 96, 7);
    ctx.fillStyle = p.sub;
    ctx.font = `500 30px ${FONT}`;
    ctx.fillText(
      new Date(w.meta.startTime).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }),
      64,
      224,
    );

    const cells = buildStats(w, o.units).filter((c) => o.visible[c.key]).slice(0, 6);
    if (o.statStyle === 'cards') {
      const cols = 2;
      const gap = 24;
      const cw = (W - 128 - gap) / 2;
      const ch = 196;
      cells.forEach((c, i) => {
        const x = 64 + (i % cols) * (cw + gap);
        const y = 264 + Math.floor(i / cols) * (ch + gap);
        ctx.fillStyle = p.card;
        roundRect(ctx, x, y, cw, ch, 26);
        ctx.fill();
        statLabel(ctx, c.label, x + 28, y + 52, p.faint);
        statValue(ctx, c.value, x + 28, y + 128, p.title, 54);
      });
    } else {
      const cols = 2;
      const cw = (W - 128) / 2;
      cells.forEach((c, i) => {
        const x = 64 + (i % cols) * cw;
        const y = 280 + Math.floor(i / cols) * 210;
        ctx.fillStyle = p.hairline;
        ctx.fillRect(x, y + 168, cw - 32, 2);
        statLabel(ctx, c.label, x + 4, y + 44, p.faint);
        statValue(ctx, c.value, x + 4, y + 128, p.title, 62);
      });
    }

    if (o.watermark) drawWatermark(ctx, W, H, o.accent, p.wm);
  },
};
