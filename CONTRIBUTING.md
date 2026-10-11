# Contributing to g-fit-share

Thanks for helping out. The project is intentionally small — please keep it that way.

## Setup

```sh
npm install
npm run dev
```

Click **Load sample run** in the app to work with real data (`public/sample.tcx`).

## Ground rules

- **Vanilla TypeScript, zero runtime dependencies.** Do not add a framework, UI kit, or map-tile SDK. Dev-only tooling is fine if justified.
- **Privacy first.** Workout files must never leave the device. No analytics, no network calls except the optional Google Fonts stylesheet (with system fallback).
- **Keep the bundle tiny.** The production JS should stay well under 50 KB gizipped. Check with `npm run build`.

## Adding a workout format

1. Implement `WorkoutAdapter` (`src/core/model.ts`) in `src/adapters/<format>.ts`.
2. Register it in `adapters[]` in `src/core/registry.ts`.
3. If possible, add a sample file under `public/` and wire it into the sample loader.

## Adding a template

1. Create `src/templates/<name>.ts` exporting a `TemplateDef` — `(ctx, workout, opts) => void` on a fixed-size canvas.
2. Register it in `src/templates/registry.ts`.
3. Rules: stats must end above the reserved footer strip (see `drawWatermark` in `src/templates/helpers.ts`), support `transparent` (no opaque fills when set and no photo), and use the shared `FONT` / `palette()` helpers.

## Pull requests

- One focused change per PR, with a before/after screenshot for visual changes.
- `npx tsc --noEmit` and `npm run build` must pass.
