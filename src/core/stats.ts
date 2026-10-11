import type { StandardWorkout } from './model';

export interface DerivedStats {
  paceSecPerKm?: number;
  speedKmh?: number;
  splits: { km: number; sec: number }[];
  bbox?: { minLat: number; maxLat: number; minLon: number; maxLon: number };
}

export function deriveStats(w: StandardWorkout): DerivedStats {
  const { distanceM, durationS } = w.summary;
  const paceSecPerKm =
    distanceM > 10 && durationS > 0 ? durationS / (distanceM / 1000) : undefined;
  const speedKmh =
    durationS > 0 ? distanceM / 1000 / (durationS / 3600) : undefined;

  // ~1km splits from cumulative distM series
  const splits: { km: number; sec: number }[] = [];
  const pts = w.track;
  if (pts.length > 1 && distanceM >= 500) {
    let mark = 1000;
    let kmIdx = 1;
    let startT = Date.parse(pts[0].t);
    for (const p of pts) {
      if (p.distM != null && p.distM >= mark) {
        splits.push({ km: kmIdx, sec: (Date.parse(p.t) - startT) / 1000 });
        startT = Date.parse(p.t);
        kmIdx++;
        mark += 1000;
      }
    }
  }

  const lats = w.track.map((p) => p.lat).filter((v): v is number => v != null);
  const lons = w.track.map((p) => p.lon).filter((v): v is number => v != null);
  const bbox =
    lats.length > 1
      ? {
          minLat: Math.min(...lats),
          maxLat: Math.max(...lats),
          minLon: Math.min(...lons),
          maxLon: Math.max(...lons),
        }
      : undefined;

  return { paceSecPerKm, speedKmh, splits, bbox };
}

// Reduce dense GPS (4200+ pts) for fast canvas rendering.
export function simplifyPath(
  pts: { lat: number; lon: number }[],
  maxPoints = 400,
): { lat: number; lon: number }[] {
  if (pts.length <= maxPoints) return pts;
  const step = Math.ceil(pts.length / maxPoints);
  const out: { lat: number; lon: number }[] = [];
  for (let i = 0; i < pts.length; i += step) out.push(pts[i]);
  out.push(pts[pts.length - 1]);
  return out;
}
