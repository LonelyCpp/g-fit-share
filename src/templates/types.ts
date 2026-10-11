import type { StandardWorkout } from '../core/model';
import type { Units } from '../core/units';

export type StatKey = 'distance' | 'pace' | 'time' | 'hr' | 'calories' | 'elevation' | 'date';
export type StatStyle = 'cards' | 'minimal';

export interface RenderOpts {
  units: Units;
  accent: string;
  visible: Record<StatKey, boolean>;
  title: string;
  background: HTMLImageElement | null;
  overlay: number; // 0..0.9 darkness over bg
  statStyle: StatStyle;
  transparent: boolean; // no gradient fallback — export keeps alpha
  watermark: boolean;
}

export interface TemplateDef {
  id: string;
  name: string;
  desc: string;
  width: number;
  height: number;
  render: (ctx: CanvasRenderingContext2D, w: StandardWorkout, o: RenderOpts) => void;
}

export const DEFAULT_VISIBLE: Record<StatKey, boolean> = {
  distance: true,
  pace: true,
  time: true,
  hr: true,
  calories: true,
  elevation: false,
  date: true,
};
