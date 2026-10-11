import type { Units } from '../core/units';
import { fmtDistance, fmtDuration, fmtPace, fmtDate } from '../core/units';

export const fmtHr = (v?: number) => (v == null ? '—' : `${v} bpm`);
export const fmtCalories = (v?: number) => (v == null ? '—' : `${Math.round(v)} kcal`);
export const fmtElev = (v: number | undefined, u: Units) => {
  if (v == null) return '—';
  return u === 'imperial' ? `${Math.round(v * 3.28084)} ft` : `${Math.round(v)} m`;
};
export { fmtDistance, fmtDuration, fmtPace, fmtDate };
