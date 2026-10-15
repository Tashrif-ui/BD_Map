/*!
 * BD-Map — https://github.com/Tashrif-ui/BD_Map
 * © 2026 Tashrif Alam. Licensed under CC BY-NC-SA 4.0 (non-commercial). Keep this notice.
 */
// Map layers shown in the layer panel. Layers with a `phase` are not built yet.
export const LAYERS = [
  { id: 'div', labelKey: 'l_div' },
  { id: 'dist', labelKey: 'l_dist' },
  { id: 'upz', labelKey: 'l_upz' },
  { id: 'thana', labelKey: 'l_thana' },
  { id: 'union', labelKey: 'l_union' },
  { id: 'seat', labelKey: 'l_seat', phase: 5 },
];

export const DEFAULT_LAYERS = { div: true, dist: true, upz: false, thana: false, union: false };

// Which layer shows each kind of selectable place.
export const LAYER_FOR_TYPE = { division: 'div', district: 'dist', upazila: 'upz', thana: 'thana', union: 'union' };

// Unions are drawn only from this zoom level (they are loaded per district).
export const UNION_MIN_ZOOM = 9;
