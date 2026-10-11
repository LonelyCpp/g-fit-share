export type Units = 'metric' | 'imperial';

export function fmtDistance(m: number, u: Units): string {
  if (u === 'imperial') return `${(m / 1609.344).toFixed(2)} mi`;
  return `${(m / 1000).toFixed(2)} km`;
}

export function fmtDuration(s: number): string {
  s = Math.round(s);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const p = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${p(m)}:${p(sec)}` : `${m}:${p(sec)}`;
}

export function fmtPace(secPerKm: number | undefined, u: Units): string {
  if (secPerKm == null || !Number.isFinite(secPerKm)) return '—';
  const s = u === 'imperial' ? secPerKm * 1.60934 : secPerKm;
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return `${m}:${String(sec).padStart(2, '0')} /${u === 'imperial' ? 'mi' : 'km'}`;
}

export function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
