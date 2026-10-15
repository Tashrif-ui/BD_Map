/*!
 * BD-Map — https://github.com/Tashrif-ui/BD_Map
 * © 2026 Tashrif Alam. Licensed under CC BY-NC-SA 4.0 (non-commercial). Keep this notice.
 */
// Map layers shown in the layer panel. Layers with a `phase` are not built yet.
export const LAYERS = [
  { id: 'div', labelKey: 'l_div' },
  { id: 'dist', labelKey: 'l_dist' },
  { id: 'upz', labelKey: 'l_upz', phase: 4 },
  { id: 'thana', labelKey: 'l_thana', phase: 4 },
  { id: 'union', labelKey: 'l_union', phase: 4 },
  { id: 'seat', labelKey: 'l_seat', phase: 5 },
];

export const DEFAULT_LAYERS = { div: true, dist: true };
