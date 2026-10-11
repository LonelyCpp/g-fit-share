import type { TemplateDef } from './types';
import {
  FONT,
  buildStats,
  drawRoute,
  drawWatermark,
  paintBackground,
  palette,
  statLabel,
  statValue,
} from './helpers';

// 1080x1920 story — full-bleed photo bg, route strip, vertical stats.
// Stat rows are spaced to fit above the reserved footer strip.
const FOOTER_H = 110;

export const Story: TemplateDef = {
  id: 'story',
  name: 'Story',
  desc: 'Full-screen vertical (9:16 story)',
  width: 1080,
  height: 1920,
  render(ctx, w, o) {
    const W = 1080;
    const H = 1920;
    const p = palette(o);
    paintBackground(ctx, W, H, o.background, Math.max(o.overlay, o.background ? 0.45 : 0), '#0c4a6e', '#4c1d95', o.transparent);

    if (p.dark && !o.transparent) {
      const g = ctx.createLinearGradient(0, H * 0.35, 0, H);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(0,0,0,.65)');
      ctx.fillStyle = g;
      ctx.fillRect(0, H * 0.35, W, H * 0.65);
    }

    ctx.fillStyle = p.title;
    ctx.font = `800 84px ${FONT}`;
    ctx.fillText((o.title || w.meta.sport.toUpperCase()).slice(0, 18), 72, 420);
    ctx.fillStyle = p.sub;
    ctx.font = `500 36px ${FONT}`;
    ctx.fillText(new Date(w.meta.startTime).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }), 72, 478);

    drawRoute(ctx, w, 72, 550, W - 144, 500, o.accent, p.halo, 10);

    const cells = buildStats(w, o.units).filter((c) => o.visible[c.key]).slice(0, 6);
    const startY = 1130;
    const avail = H - FOOTER_H - startY;
    const step = Math.min(132, avail / Math.max(cells.length, 1));
    cells.forEach((c, i) => {
      const y = startY + i * step;
      statLabel(ctx, c.label, 76, y, p.faint);
      statValue(ctx, c.value, 72, y + 78, p.title, 66);
    });

    if (o.watermark) drawWatermark(ctx, W, H, o.accent, p.wm);
  },
};
