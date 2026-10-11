import type { TemplateDef } from './types';
import {
  FONT,
  buildStats,
  drawRoute,
  drawWatermark,
  paintBackground,
  palette,
  roundRect,
  statLabel,
  statValue,
} from './helpers';

// 1080x1350 (4:5) — hero route map on top, title + stats below.
// Stats end above a reserved 90px footer strip where the watermark sits.
const FOOTER_H = 90;

export const RouteHero: TemplateDef = {
  id: 'route-hero',
  name: 'Route Hero',
  desc: 'Big route map + stats (4:5 feed post)',
  width: 1080,
  height: 1350,
  render(ctx, w, o) {
    const W = 1080;
    const H = 1350;
    const p = palette(o);
    paintBackground(ctx, W, H, o.background, o.overlay, '#0f172a', '#1e1b4b', o.transparent);

    // map card
    const mx = 48;
    const my = 48;
    const mw = W - 96;
    const mh = 740;
    ctx.save();
    roundRect(ctx, mx, my, mw, mh, 36);
    ctx.fillStyle = p.dark ? 'rgba(255,255,255,.08)' : 'rgba(15,23,42,.05)';
    ctx.fill();
    ctx.clip();
    ctx.fillStyle = p.dark ? 'rgba(10,14,24,.35)' : 'rgba(255,255,255,0)';
    if (p.dark) ctx.fillRect(mx, my, mw, mh);
    drawRoute(ctx, w, mx, my, mw, mh, o.accent, p.halo, 9);
    ctx.restore();

    // title
    ctx.fillStyle = p.title;
    ctx.font = `800 62px ${FONT}`;
    const title = o.title || `${w.meta.sport.toUpperCase()} • ${w.summary.distanceM >= 1000 ? (w.summary.distanceM / 1000).toFixed(2) + 'K' : Math.round(w.summary.distanceM) + 'M'}`;
    ctx.fillText(title.slice(0, 28), 56, 884);
    ctx.fillStyle = o.accent;
    ctx.fillRect(58, 902, 72, 6);

    ctx.fillStyle = p.sub;
    ctx.font = `500 30px ${FONT}`;
    const sub = `${new Date(w.meta.startTime).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}${w.meta.device ? ' · ' + w.meta.device : ''}`;
    ctx.fillText(sub.slice(0, 48), 56, 948);

    // stats
    const cells = buildStats(w, o.units).filter((c) => o.visible[c.key]).slice(0, 6);
    if (o.statStyle === 'cards') {
      const cols = 3;
      const gap = 16;
      const cw = (W - 112 - (cols - 1) * gap) / cols;
      const avail = H - FOOTER_H - 986;
      const rows = Math.ceil(cells.length / cols);
      const ch = Math.min(124, (avail - (rows - 1) * gap) / Math.max(rows, 1));
      cells.forEach((c, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = 56 + col * (cw + gap);
        const y = 986 + row * (ch + gap);
        ctx.fillStyle = p.card;
        roundRect(ctx, x, y, cw, ch, 22);
        ctx.fill();
        statLabel(ctx, c.label, x + 24, y + 42, p.faint);
        statValue(ctx, c.value, x + 24, y + 102, p.title, 42);
      });
    } else {
      // minimal: airy columns, hairline dividers, no boxes
      const cols = 3;
      const cw = (W - 112) / cols;
      cells.forEach((c, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = 56 + col * cw;
        const y = 1000 + row * 132;
        if (col > 0) {
          ctx.fillStyle = p.hairline;
          ctx.fillRect(x - 20, y - 8, 2, 96);
        }
        statLabel(ctx, c.label, x, y + 22, p.faint);
        statValue(ctx, c.value, x, y + 88, p.title, 50);
      });
    }

    if (o.watermark) drawWatermark(ctx, W, H, o.accent, p.wm);
  },
};
