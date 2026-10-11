import { RouteHero } from './route-hero';
import { StatGrid } from './stat-grid';
import { Story } from './story';
import type { TemplateDef } from './types';

export const templates: TemplateDef[] = [RouteHero, StatGrid, Story];

export function getTemplate(id: string): TemplateDef {
  return templates.find((t) => t.id === id) ?? templates[0];
}
