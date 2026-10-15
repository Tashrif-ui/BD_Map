/*!
 * BD-Map — https://github.com/Tashrif-ui/BD_Map
 * © 2026 Tashrif Alam. Licensed under CC BY-NC-SA 4.0 (non-commercial). Keep this notice.
 */
import { districtShade } from './colors.js';

// Published data files (built by scripts/build-data.mjs into public/data/).
const BASE = '/data';

const cache = new Map();
function getJson(path) {
  if (!cache.has(path)) {
    const p = fetch(`${BASE}/${path}`).then((res) => {
      if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
      return res.json();
    });
    p.catch(() => cache.delete(path)); // allow a retry after a network error
    cache.set(path, p);
  }
  return cache.get(path);
}

const byId = (list) => Object.fromEntries(list.map((x) => [x.id, x]));

// Loaded at start: small files needed for the first screen.
export async function loadData() {
  const [divisions, districts, upazilas, divisionShapes, districtShapes] = await Promise.all([
    getJson('divisions.json'),
    getJson('districts.json'),
    getJson('upazilas.json'),
    getJson('boundaries/divisions.geojson'),
    getJson('boundaries/districts.geojson'),
  ]);

  // Give each district its colour shade once, in a stable order.
  const seen = {};
  for (const f of districtShapes.features) {
    const d = f.properties.division_id;
    seen[d] = (seen[d] ?? -1) + 1;
    f.properties.fill = districtShade(d, seen[d]);
  }

  return {
    divisions: divisions.data,
    districts: districts.data,
    upazilas: upazilas.data,
    divisionShapes,
    districtShapes,
    divisionById: byId(divisions.data),
    districtById: byId(districts.data),
    upazilaById: byId(upazilas.data),
    lastVerified: districts.meta.last_verified,
  };
}

// Loaded on demand (layer switched on, an area selected, or search used).
export const loadUpazilaShapes = () => getJson('boundaries/upazilas.geojson');

export async function loadThanas() {
  const [records, shapes] = await Promise.all([getJson('thanas.json'), getJson('boundaries/thanas.geojson')]);
  return { thanas: records.data, thanaById: byId(records.data), thanaShapes: shapes };
}

export async function loadUnions() {
  const records = await getJson('unions.json');
  const byUpazila = {};
  for (const u of records.data) (byUpazila[u.upazila_id] ||= []).push(u);
  return { unions: records.data, unionById: byId(records.data), unionsByUpazila: byUpazila };
}

export const loadUnionShapes = (districtId) => getJson(`boundaries/unions/${districtId}.geojson`);
