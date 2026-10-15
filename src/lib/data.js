/*!
 * BD-Map — https://github.com/Tashrif-ui/BD_Map
 * © 2026 Tashrif Alam. Licensed under CC BY-NC-SA 4.0 (non-commercial). Keep this notice.
 */
import { districtShade } from './colors.js';

// Published data files (built by scripts/build-data.mjs into public/data/).
const FILES = {
  divisions: '/data/divisions.json',
  districts: '/data/districts.json',
  divisionShapes: '/data/boundaries/divisions.geojson',
  districtShapes: '/data/boundaries/districts.geojson',
};

export async function loadData() {
  const entries = await Promise.all(
    Object.entries(FILES).map(async ([key, url]) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
      return [key, await res.json()];
    }),
  );
  const raw = Object.fromEntries(entries);
  const divisions = raw.divisions.data;
  const districts = raw.districts.data;

  // Give each district its colour shade once, in a stable order.
  const seen = {};
  for (const f of raw.districtShapes.features) {
    const d = f.properties.division_id;
    seen[d] = (seen[d] ?? -1) + 1;
    f.properties.fill = districtShade(d, seen[d]);
  }

  return {
    divisions,
    districts,
    divisionShapes: raw.divisionShapes,
    districtShapes: raw.districtShapes,
    divisionById: Object.fromEntries(divisions.map((d) => [d.id, d])),
    districtById: Object.fromEntries(districts.map((d) => [d.id, d])),
    lastVerified: raw.districts.meta.last_verified,
  };
}
