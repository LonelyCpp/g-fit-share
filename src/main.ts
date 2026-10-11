// Vanilla TS shell: ingest -> customize -> export. No framework.
import { detectAdapter } from './core/registry';
import type { StandardWorkout } from './core/model';
import { getTemplate, templates } from './templates/registry';
import { DEFAULT_VISIBLE, type RenderOpts, type StatKey, type StatStyle } from './templates/types';
import type { Units } from './core/units';
import { fmtDistance, fmtDuration } from './core/units';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const state: {
  workout: StandardWorkout | null;
  templateId: string;
  units: Units;
  accent: string;
  overlay: number;
  title: string;
  visible: Record<StatKey, boolean>;
  statStyle: StatStyle;
  transparent: boolean;
  watermark: boolean;
  bg: HTMLImageElement | null;
} = {
  workout: null,
  templateId: 'route-hero',
  units: 'metric',
  accent: '#f97316',
  overlay: 0.45,
  title: '',
  visible: { ...DEFAULT_VISIBLE },
  statStyle: 'minimal',
  transparent: false,
  watermark: true,
  bg: null,
};

const STAT_LABELS: Record<StatKey, string> = {
  distance: 'Distance',
  pace: 'Pace',
  time: 'Time',
  hr: 'HR',
  calories: 'Calories',
  elevation: 'Elev',
  date: 'Date',
};

// ---------- tiny idb for background persistence ----------
const idb = {
  db(): Promise<IDBDatabase> {
    return new Promise((res, rej) => {
      const r = indexedDB.open('gfitshare', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('kv');
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
  },
  async set(k: string, v: string) {
    const d = await this.db();
    return new Promise<void>((res, rej) => {
      const tx = d.transaction('kv', 'readwrite');
      tx.objectStore('kv').put(v, k);
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    });
  },
  async get(k: string): Promise<string | null> {
    try {
      const d = await this.db();
      return new Promise((res, rej) => {
        const rq = d.transaction('kv').objectStore('kv').get(k);
        rq.onsuccess = () => res((rq.result as string) ?? null);
        rq.onerror = () => rej(rq.error);
      });
    } catch {
      return null;
    }
  },
  async del(k: string) {
    try {
      const d = await this.db();
      d.transaction('kv', 'readwrite').objectStore('kv').delete(k);
    } catch { /* noop */ }
  },
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => rej(new Error('Could not load image'));
    img.src = src;
  });
}

// ---------- ingest ----------
async function handleFile(f: File) {
  const status = $('fileStatus');
  try {
    status.textContent = `Reading ${f.name} (${(f.size / 1024).toFixed(0)} KB)…`;
    const text = (await f.text()).slice(0, 8_000_000); // 8MB guard
    const head = text.slice(0, 2000);
    const adapter = detectAdapter(f.name, head);
    if (!adapter) throw new Error('Unknown format. v1 supports .tcx only.');
    const w = await adapter.parse(text, f.name);
    setWorkout(w, f.name);
  } catch (e) {
    status.textContent = `Error: ${(e as Error).message}`;
  }
}

function setWorkout(w: StandardWorkout, label: string) {
  state.workout = w;
  if (!state.title) {
    const h = new Date(w.meta.startTime).getHours();
    const part = Number.isFinite(h) ? (h < 12 ? 'Morning' : h < 17 ? 'Afternoon' : 'Evening') : '';
    state.title = part ? `${part} ${cap(w.meta.sport)}` : cap(w.meta.sport);
    ($('titleInput') as HTMLInputElement).value = state.title;
  }
  $('fileStatus').textContent =
    `${label}: ${w.meta.sport} · ${(w.summary.distanceM / 1000).toFixed(2)} km · ${fmtDuration(w.summary.durationS)} · ${w.track.length} pts`;
  $('workoutMeta').textContent =
    `${w.meta.startTime} · ${fmtDistance(w.summary.distanceM, state.units)} · avg HR ${w.summary.avgHR ?? '—'} · ${w.meta.device ?? w.meta.source}`;
  enableExport(true);
  render();
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ---------- render ----------
function currentOpts(): RenderOpts {
  return {
    units: state.units,
    accent: state.accent,
    visible: state.visible,
    title: ($('titleInput') as HTMLInputElement).value || state.title,
    background: state.bg,
    overlay: state.overlay,
    statStyle: state.statStyle,
    transparent: state.transparent,
    watermark: state.watermark,
  };
}

function render() {
  const canvas = $('preview') as HTMLCanvasElement;
  const tpl = getTemplate(state.templateId);
  canvas.width = tpl.width;
  canvas.height = tpl.height;
  const ctx = canvas.getContext('2d')!;
  canvas.classList.toggle('alpha', state.transparent && !state.bg);
  if (!state.workout) {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#9aa5c4';
    ctx.font = '500 36px system-ui';
    ctx.fillText('Upload a .tcx file to preview', 80, 200);
    return;
  }
  tpl.render(ctx, state.workout, currentOpts());
}

function enableExport(on: boolean) {
  (['dlBtn', 'shareBtn', 'copyBtn'] as const).forEach((id) => {
    ($(id) as HTMLButtonElement).disabled = !on;
  });
}

function exportCanvas(): HTMLCanvasElement {
  // re-render at full res to a fresh canvas so preview scaling never affects output
  const tpl = getTemplate(state.templateId);
  const c = document.createElement('canvas');
  c.width = tpl.width;
  c.height = tpl.height;
  tpl.render(c.getContext('2d')!, state.workout!, currentOpts());
  return c;
}

// ---------- ui wiring ----------
function buildTemplatePicker() {
  const box = $('tplPicker');
  box.innerHTML = '';
  for (const t of templates) {
    const div = document.createElement('div');
    div.className = 'tpl' + (t.id === state.templateId ? ' active' : '');
    div.innerHTML = `<div><b>${t.name}</b><span>${t.desc} · ${t.width}×${t.height}</span></div>`;
    div.onclick = () => {
      state.templateId = t.id;
      buildTemplatePicker();
      render();
    };
    box.appendChild(div);
  }
}

function buildStatToggles() {
  const box = $('statToggles');
  box.innerHTML = '';
  (Object.keys(STAT_LABELS) as StatKey[]).forEach((k) => {
    const lab = document.createElement('label');
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = state.visible[k];
    cb.onchange = () => {
      state.visible[k] = cb.checked;
      render();
    };
    lab.append(cb, ' ', STAT_LABELS[k]);
    box.appendChild(lab);
  });
}

function wire() {
  const drop = $('drop');
  const fi = $('fileInput') as HTMLInputElement;
  drop.onclick = (e) => {
    if ((e.target as HTMLElement).id === 'sampleBtn') return;
    fi.click();
  };
  drop.onkeydown = (e) => {
    if (e.key === 'Enter') fi.click();
  };
  ['dragover', 'dragenter'].forEach((ev) =>
    drop.addEventListener(ev, (e) => {
      e.preventDefault();
      drop.classList.add('over');
    }),
  );
  ['dragleave', 'drop'].forEach((ev) =>
    drop.addEventListener(ev, (e) => {
      e.preventDefault();
      drop.classList.remove('over');
    }),
  );
  drop.addEventListener('drop', (e) => {
    const f = (e as DragEvent).dataTransfer?.files?.[0];
    if (f) void handleFile(f);
  });
  fi.onchange = () => {
    if (fi.files?.[0]) void handleFile(fi.files[0]);
  };

  $('sampleBtn').onclick = async (e) => {
    e.stopPropagation();
    try {
      $('fileStatus').textContent = 'Loading sample…';
      const r = await fetch('/sample.tcx');
      if (!r.ok) throw new Error('sample.tcx missing — run `npm run build` after copying the file to public/.');
      const t = await r.text();
      const adapter = detectAdapter('sample.tcx', t.slice(0, 2000));
      if (!adapter) throw new Error('No adapter for sample.');
      setWorkout(await adapter.parse(t, 'sample.tcx'), 'sample.tcx');
    } catch (err) {
      $('fileStatus').textContent = `Error: ${(err as Error).message}`;
    }
  };

  ($('titleInput') as HTMLInputElement).oninput = () => render();
  ($('styleSel') as HTMLSelectElement).onchange = (e) => {
    state.statStyle = (e.target as HTMLSelectElement).value as StatStyle;
    render();
  };
  ($('unitsSel') as HTMLSelectElement).onchange = (e) => {
    state.units = (e.target as HTMLSelectElement).value as Units;
    render();
  };
  ($('accentInput') as HTMLInputElement).oninput = (e) => {
    state.accent = (e.target as HTMLInputElement).value;
    render();
  };
  ($('overlayRange') as HTMLInputElement).oninput = (e) => {
    state.overlay = Number((e.target as HTMLInputElement).value) / 100;
    render();
  };
  ($('transparentChk') as HTMLInputElement).onchange = (e) => {
    state.transparent = (e.target as HTMLInputElement).checked;
    render();
  };
  ($('watermarkChk') as HTMLInputElement).onchange = (e) => {
    state.watermark = (e.target as HTMLInputElement).checked;
    render();
  };

  ($('bgInput') as HTMLInputElement).onchange = async (e) => {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    state.bg = await loadImage(url);
    // persist downscaled dataURL so bg survives reloads
    try {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') void idb.set('bg', reader.result);
      };
      reader.readAsDataURL(f);
    } catch { /* private-mode */ }
    render();
  };
  $('bgClear').onclick = async () => {
    state.bg = null;
    ($('bgInput') as HTMLInputElement).value = '';
    await idb.del('bg');
    render();
  };

  $('dlBtn').onclick = () => {
    const c = exportCanvas();
    const a = document.createElement('a');
    a.download = `workout-${state.templateId}.png`;
    a.href = c.toDataURL('image/png');
    a.click();
  };
  $('shareBtn').onclick = async () => {
    try {
      const c = exportCanvas();
      const blob = await new Promise<Blob | null>((r) => c.toBlob(r, 'image/png'));
      if (!blob) return;
      const file = new File([blob], 'workout.png', { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'My workout' });
      } else {
        // fallback: download
        const a = document.createElement('a');
        a.download = 'workout.png';
        a.href = URL.createObjectURL(blob);
        a.click();
      }
    } catch { /* user cancelled */ }
  };
  $('copyBtn').onclick = async () => {
    try {
      const c = exportCanvas();
      const blob = await new Promise<Blob | null>((r) => c.toBlob(r, 'image/png'));
      if (!blob) return;
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      $('workoutMeta').textContent = 'Copied to clipboard ✓';
    } catch {
      $('workoutMeta').textContent = 'Copy failed — use Download instead.';
    }
  };

  // PWA install prompt
  let deferred: Event | null = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e;
    ($('installBtn') as HTMLButtonElement).hidden = false;
  });
  $('installBtn').onclick = async () => {
    if (!deferred) return;
    (deferred as unknown as { prompt: () => void }).prompt();
    deferred = null;
    ($('installBtn') as HTMLButtonElement).hidden = true;
  };

  if ('serviceWorker' in navigator) {
    if (import.meta.env.PROD) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(() => {});
      });
    } else {
      // dev: never cache — drop any SW installed by an earlier run
      // so UI changes show up immediately.
      navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => void r.unregister()));
    }
  }
}

async function init() {
  buildTemplatePicker();
  buildStatToggles();
  wire();
  render();
  // re-render once the display font arrives so canvas uses Inter, not fallback
  if (document.fonts?.ready) document.fonts.ready.then(() => render());
  const saved = await idb.get('bg');
  if (saved) {
    try {
      state.bg = await loadImage(saved);
      render();
    } catch { /* corrupt */ }
  }
}

void init();
