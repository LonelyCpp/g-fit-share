import type { StandardWorkout } from '../core/model';
import { deriveStats, simplifyPath } from '../core/stats';
import type { RenderOpts } from './types';

// Sleek type stack. Inter is loaded via Google Fonts in index.html;
// canvas falls back to system-ui offline.
export const FONT = 'Inter, system-ui, -apple-system, "Segoe UI", sans-serif';

export interface Palette {
  dark: boolean;
  title: string;
  sub: string;
  faint: string;
  card: string;
  hairline: string;
  halo: string;
  wm: string;
}

// Light-on-dark normally; switch to dark ink for transparent exports
// (no background) so the PNG stays legible when overlaid elsewhere.
export function palette(o: RenderOpts): Palette {
  if (o.transparent && !o.background) {
    return {
      dark: false,
      title: '#0f172a',
      sub: 'rgba(15,23,42,.72)',
      faint: 'rgba(15,23,42,.52)',
      card: 'rgba(15,23,42,.06)',
      hairline: 'rgba(15,23,42,.14)',
      halo: 'rgba(255,255,255,.85)',
      wm: 'rgba(15,23,42,.5)',
    };
  }
  return {
    dark: true,
    title: '#ffffff',
    sub: 'rgba(255,255,255,.78)',
    faint: 'rgba(255,255,255,.6)',
    card: 'rgba(255,255,255,.10)',
    hairline: 'rgba(255,255,255,.18)',
    halo: 'rgba(0,0,0,.45)',
    wm: 'rgba(255,255,255,.55)',
  };
}

export function paintBackground(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  bg: HTMLImageElement | null,
  overlay: number,
  fallback1: string,
  fallback2: string,
  transparent = false,
) {
  if (bg) {
    // cover-fit
    const s = Math.max(W / bg.width, H / bg.height);
    const dw = bg.width * s;
    const dh = bg.height * s;
    ctx.drawImage(bg, (W - dw) / 2, (H - dh) / 2, dw, dh);
    if (overlay > 0) {
      ctx.fillStyle = `rgba(8,10,16,${overlay})`;
      ctx.fillRect(0, 0, W, H);
    }
    return;
  }
  if (transparent) {
    ctx.clearRect(0, 0, W, H);
    return;
  }
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, fallback1);
  g.addColorStop(1, fallback2);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

function tracked(ctx: CanvasRenderingContext2D, px: string) {
  // canvas letter-spacing is supported in Chromium; harmless elsewhere
  try {
    (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = px;
  } catch { /* noop */ }
}

export function statLabel(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string) {
  ctx.save();
  tracked(ctx, '2px');
  ctx.fillStyle = color;
  ctx.font = `600 22px ${FONT}`;
  ctx.fillText(text.toUpperCase().slice(0, 18), x, y);
  ctx.restore();
}

export function statValue(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string, size = 54) {
  ctx.save();
  tracked(ctx, '0px');
  ctx.fillStyle = color;
  ctx.font = `750 ${size}px ${FONT}`;
  ctx.fillText(text.slice(0, 16), x, y);
  ctx.restore();
}

// Watermark lives in a reserved footer strip (bottom-right) so it
// never collides with stats. Call after laying stats above footerH.
export function drawWatermark(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  accent: string,
  color: string,
) {
  ctx.save();
  ctx.textAlign = 'right';
  tracked(ctx, '1px');
  ctx.fillStyle = color;
  ctx.font = `700 24px ${FONT}`;
  ctx.fillText('g-fit-share', W - 88, H - 42);
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(W - 58, H - 50, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function routePoints(w: StandardWorkout) {
  const pts = w.track
    .filter((p) => p.lat != null && p.lon != null)
    .map((p) => ({ lat: p.lat as number, lon: p.lon as number }));
  return simplifyPath(pts, 500);
}

export function drawRoute(
  ctx: CanvasRenderingContext2D,
  w: StandardWorkout,
  x: number,
  y: number,
  rw: number,
  rh: number,
  accent: string,
  halo: string,
  lineWidth = 10,
) {
  const pts = routePoints(w);
  if (pts.length < 2) {
    ctx.fillStyle = 'rgba(128,128,128,.8)';
    ctx.font = `500 28px ${FONT}`;
    ctx.fillText('No GPS route', x + 16, y + 40);
    return;
  }
  const stats = deriveStats(w);
  const bb = stats.bbox!;
  const pad = 30;
  const spanLon = Math.max(bb.maxLon - bb.minLon, 1e-6);
  const spanLat = Math.max(bb.maxLat - bb.minLat, 1e-6);
  // correct lon for latitude so map isn't stretched
  const midLat = (bb.minLat + bb.maxLat) / 2;
  const kx = Math.cos((midLat * Math.PI) / 180);
  const s = Math.min((rw - pad * 2) / (spanLon * kx), (rh - pad * 2) / spanLat);
  const project = (lat: number, lon: number) => {
    const px = ((lon - bb.minLon) * kx - (spanLon * kx) / 2) * s + x + rw / 2;
    const py = -((lat - bb.minLat - spanLat / 2) * s) + y + rh / 2;
    return [px, py] as const;
  };
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  // halo
  ctx.strokeStyle = halo;
  ctx.lineWidth = lineWidth + 8;
  ctx.beginPath();
  pts.forEach((p, i) => {
    const [px, py] = project(p.lat, p.lon);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.stroke();
  ctx.strokeStyle = accent;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  pts.forEach((p, i) => {
    const [px, py] = project(p.lat, p.lon);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.stroke();
  // start / end dots
  const [sx, sy] = project(pts[0].lat, pts[0].lon);
  const [ex, ey] = project(pts[pts.length - 1].lat, pts[pts.length - 1].lon);
  ctx.fillStyle = '#22c55e';
  ctx.beginPath();
  ctx.arc(sx, sy, lineWidth, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.arc(ex, ey, lineWidth, 0, Math.PI * 2);
  ctx.fill();
}

export function buildStats(
  w: StandardWorkout,
  units: import('../core/units').Units,
): { key: import('./types').StatKey; label: string; value: string }[] {
  return buildStatsInner(w, units);
}

import { fmtCalories, fmtDate, fmtDistance, fmtDuration, fmtElev, fmtHr, fmtPace } from './format';
import { deriveStats as _derive } from '../core/stats';

function buildStatsInner(w: StandardWorkout, units: import('../core/units').Units) {
  const d = _derive(w);
  return [
    { key: 'distance' as const, label: units === 'imperial' ? 'Miles' : 'Distance', value: fmtDistance(w.summary.distanceM, units) },
    { key: 'pace' as const, label: 'Avg pace', value: fmtPace(d.paceSecPerKm, units) },
    { key: 'time' as const, label: 'Time', value: fmtDuration(w.summary.durationS) },
    { key: 'hr' as const, label: 'Avg HR', value: fmtHr(w.summary.avgHR) },
    { key: 'calories' as const, label: 'Calories', value: fmtCalories(w.summary.calories) },
    { key: 'elevation' as const, label: 'Elev gain', value: fmtElev(w.summary.elevGainM, units) },
    { key: 'date' as const, label: 'Date', value: fmtDate(w.meta.startTime) },
  ];
}

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
