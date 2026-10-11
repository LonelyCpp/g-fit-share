import { normalizeSport, type StandardWorkout, type WorkoutAdapter } from '../core/model';

function num(el: Element | null | undefined): number | undefined {
  if (!el?.textContent) return undefined;
  const v = parseFloat(el.textContent.trim());
  return Number.isFinite(v) ? v : undefined;
}

function tag(parent: Element, name: string): Element | null {
  // TCX uses a default namespace; getElementsByTagName works regardless.
  const list = parent.getElementsByTagName(name);
  return list.length ? (list[0] as Element) : null;
}

function allTags(parent: Element | Document, name: string): Element[] {
  return Array.from(parent.getElementsByTagName(name)) as Element[];
}

export const TcxAdapter: WorkoutAdapter = {
  id: 'tcx',
  label: 'Garmin TCX / Google Fit export (.tcx)',
  accept: ['.tcx', '.xml'],
  detect(fileName, head) {
    const n = fileName.toLowerCase();
    if (n.endsWith('.tcx')) return true;
    return head.includes('TrainingCenterDatabase');
  },
  async parse(text, fileName) {
    const doc = new DOMParser().parseFromString(text, 'application/xml');
    if (doc.getElementsByTagName('parsererror').length) {
      throw new Error('Not a valid TCX/XML file.');
    }
    const activities = allTags(doc, 'Activity');
    if (!activities.length) throw new Error('No <Activity> found in TCX.');
    // v1: first activity only (multi-activity files later)
    const act = activities[0];
    const sport = normalizeSport(act.getAttribute('Sport') ?? 'run');
    const id = tag(act, 'Id')?.textContent?.trim() || fileName;

    const laps = allTags(act, 'Lap').map((lap) => ({
      startTime: lap.getAttribute('StartTime') ?? id,
      durationS: num(tag(lap, 'TotalTimeSeconds')) ?? 0,
      distanceM: num(tag(lap, 'DistanceMeters')) ?? 0,
      calories: num(tag(lap, 'Calories')),
    }));

    const tps = allTags(act, 'Trackpoint').map((tp) => {
      const pos = tag(tp, 'Position');
      const hrEl = tag(tp, 'HeartRateBpm');
      return {
        t: tag(tp, 'Time')?.textContent?.trim() ?? '',
        lat: pos ? num(tag(pos, 'LatitudeDegrees')) : undefined,
        lon: pos ? num(tag(pos, 'LongitudeDegrees')) : undefined,
        ele: num(tag(tp, 'AltitudeMeters')),
        distM: num(tag(tp, 'DistanceMeters')),
        hr: hrEl ? num(tag(hrEl, 'Value')) : undefined,
      };
    }).filter((p) => p.t);

    const durationS =
      laps.reduce((a, l) => a + l.durationS, 0) ||
      (tps.length > 1
        ? (Date.parse(tps[tps.length - 1].t) - Date.parse(tps[0].t)) / 1000
        : 0);
    const distanceM =
      laps.reduce((a, l) => a + l.distanceM, 0) ||
      tps[tps.length - 1]?.distM ||
      0;
    const calories = laps.reduce((a, l) => a + (l.calories ?? 0), 0) || undefined;
    const hrs = tps.map((p) => p.hr).filter((v): v is number => v != null);
    const eles = tps.map((p) => p.ele).filter((v): v is number => v != null);
    let elevGainM: number | undefined;
    if (eles.length > 1) {
      let g = 0;
      for (let i = 1; i < eles.length; i++) {
        const d = eles[i] - eles[i - 1];
        if (d > 0 && d < 50) g += d; // ignore GPS spikes
      }
      elevGainM = Math.round(g);
    }

    const workout: StandardWorkout = {
      meta: {
        id,
        sport,
        startTime: tps[0]?.t || id,
        source: 'tcx',
        device: tag(act, 'Creator') ? tag(tag(act, 'Creator')!, 'Name')?.textContent?.trim() : undefined,
      },
      summary: {
        distanceM,
        durationS,
        calories,
        avgHR: hrs.length ? Math.round(hrs.reduce((a, b) => a + b, 0) / hrs.length) : undefined,
        maxHR: hrs.length ? Math.max(...hrs) : undefined,
        elevGainM,
      },
      track: tps,
      laps,
    };
    return workout;
  },
};
