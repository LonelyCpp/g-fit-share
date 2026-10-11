import type { StandardWorkout } from './model';

// Adding a format = implement WorkoutAdapter and register it here.
// Future: gpx.ts, fit.ts (wasm), googlefit-json.ts, applehealth-xml.ts
import { TcxAdapter } from '../adapters/tcx';
import type { WorkoutAdapter } from './model';

export const adapters: WorkoutAdapter[] = [TcxAdapter];

export function detectAdapter(fileName: string, head: string): WorkoutAdapter | null {
  for (const a of adapters) if (a.detect(fileName, head)) return a;
  // fallback by extension
  const lower = fileName.toLowerCase();
  for (const a of adapters) {
    if (a.accept.some((ext) => lower.endsWith(ext))) return a;
  }
  return null;
}
