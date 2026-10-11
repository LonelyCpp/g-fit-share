// Canonical workout model. Adapters convert vendor formats into this.
// Extend Sport + optional fields to support new activity types later.

export type Sport = 'run' | 'walk' | 'ride' | 'hike' | 'other';
export type SourceKind = 'tcx' | 'gpx' | 'fit' | 'unknown';

export interface TrackPoint {
  t: string; // ISO time
  lat?: number;
  lon?: number;
  ele?: number;
  hr?: number;
  distM?: number;
}

export interface LapSummary {
  startTime: string;
  durationS: number;
  distanceM: number;
  calories?: number;
}

export interface StandardWorkout {
  meta: {
    id: string;
    sport: Sport;
    startTime: string;
    source: SourceKind;
    device?: string;
  };
  summary: {
    distanceM: number;
    durationS: number;
    calories?: number;
    avgHR?: number;
    maxHR?: number;
    elevGainM?: number;
  };
  track: TrackPoint[];
  laps: LapSummary[];
}

export interface WorkoutAdapter {
  id: SourceKind;
  label: string;
  accept: string[];
  detect(fileName: string, head: string): boolean;
  parse(text: string, fileName: string): Promise<StandardWorkout>;
}

export function normalizeSport(raw: string): Sport {
  const s = raw.toLowerCase();
  if (s.includes('run')) return 'run';
  if (s.includes('walk')) return 'walk';
  if (s.includes('bik') || s.includes('cycl') || s.includes('ride')) return 'ride';
  if (s.includes('hik')) return 'hike';
  return 'other';
}
