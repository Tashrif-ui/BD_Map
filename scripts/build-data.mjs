/*!
 * BD-Map — https://github.com/Tashrif-ui/BD_Map
 * © 2026 Tashrif Alam. Licensed under CC BY-NC-SA 4.0 (non-commercial). Keep this notice.
 */
// Builds the published data in public/data/ from data/raw/ (third-party boundaries)
// and data/names/ (curated official English + Bangla names).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const TODAY = '2026-10-15';
const read = (p) => JSON.parse(readFileSync(p, 'utf8'));

const SOURCES = {
  divisions: {
    name: 'geoBoundaries gbOpen BGD ADM1 (BGD-ADM1-32408957)',
    url: 'https://www.geoboundaries.org/',
    license: 'CC0 1.0',
  },
  districts: {
    name: 'geoBoundaries gbOpen BGD ADM2 (BGD-ADM2-16705992), from Bangladesh Bureau of Statistics (BBS) via OCHA HDX',
    url: 'https://data.humdata.org/dataset/administrative-boundaries-of-bangladesh-as-of-2015',
    license: 'CC BY 3.0 IGO',
  },
};

const meta = (description, sources) => ({
  project: 'BD-Map',
  author: 'Tashrif Alam',
  copyright: '© 2026 Tashrif Alam',
  license: 'CC BY-NC-SA 4.0 (project curation); boundary geometry keeps its source license',
  description,
  sources,
  last_verified: TODAY,
});

// Coordinates rounded to 4 decimals (~11 m) to keep files small.
const round = (c) => (typeof c[0] === 'number' ? [+c[0].toFixed(4), +c[1].toFixed(4)] : c.map(round));
const polys = (g) => (g.type === 'Polygon' ? [g.coordinates] : g.coordinates);
const inRing = ([x, y], ring) => {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};
const inGeom = (p, g) => polys(g).some((poly) => inRing(p, poly[0]));

const adm1 = read('data/raw/geoboundaries-adm1.geojson');
const adm2 = read('data/raw/geoboundaries-adm2.geojson');
const divNames = new Map(read('data/names/divisions.json').data.map((d) => [d.source_name, d]));
const distNames = new Map(read('data/names/districts.json').data.map((d) => [d.source_name, d]));

const divFeatures = adm1.features.map((f) => {
  const n = divNames.get(f.properties.shapeName);
  if (!n) throw new Error(`No name entry for division "${f.properties.shapeName}"`);
  return { type: 'Feature', properties: { id: n.id, name_en: n.name_en, name_bn: n.name_bn }, geometry: f.geometry };
});

// Each district goes to the division that contains most of its boundary vertices.
const distFeatures = adm2.features.map((f) => {
  const n = distNames.get(f.properties.shapeName);
  if (!n) throw new Error(`No name entry for district "${f.properties.shapeName}"`);
  const votes = {};
  for (const poly of polys(f.geometry))
    for (const p of poly[0])
      for (const d of divFeatures) if (inGeom(p, d.geometry)) votes[d.properties.id] = (votes[d.properties.id] || 0) + 1;
  const best = Object.entries(votes).sort((a, b) => b[1] - a[1])[0];
  if (!best) throw new Error(`District "${n.name_en}" is not inside any division`);
  return {
    type: 'Feature',
    properties: { id: n.id, name_en: n.name_en, name_bn: n.name_bn, division_id: best[0] },
    geometry: { type: f.geometry.type, coordinates: round(f.geometry.coordinates) },
  };
});
for (const d of divFeatures) d.geometry = { type: d.geometry.type, coordinates: round(d.geometry.coordinates) };

const byName = (a, b) => a.properties.name_en.localeCompare(b.properties.name_en);
divFeatures.sort(byName);
distFeatures.sort(byName);

const divisions = divFeatures.map(({ properties: p }) => ({
  id: p.id,
  name_en: p.name_en,
  name_bn: p.name_bn,
  district_ids: distFeatures.filter((d) => d.properties.division_id === p.id).map((d) => d.properties.id),
  source: SOURCES.divisions.name,
  last_verified: TODAY,
}));
const districts = distFeatures.map(({ properties: p }) => ({
  id: p.id,
  name_en: p.name_en,
  name_bn: p.name_bn,
  division_id: p.division_id,
  upazila_ids: [],
  source: SOURCES.districts.name,
  last_verified: TODAY,
}));

const out = 'public/data';
mkdirSync(`${out}/boundaries`, { recursive: true });
const write = (path, obj) => {
  const body = JSON.stringify(obj);
  writeFileSync(`${out}/${path}`, body);
  console.log(`wrote ${out}/${path} (${(body.length / 1024).toFixed(0)} KiB)`);
};

write('divisions.json', { meta: meta('The 8 divisions of Bangladesh.', [SOURCES.divisions]), data: divisions });
write('districts.json', { meta: meta('The 64 districts of Bangladesh.', [SOURCES.districts]), data: districts });
write('boundaries/divisions.geojson', {
  type: 'FeatureCollection',
  meta: meta('Division boundaries.', [SOURCES.divisions]),
  features: divFeatures,
});
write('boundaries/districts.geojson', {
  type: 'FeatureCollection',
  meta: meta('District boundaries.', [SOURCES.districts]),
  features: distFeatures,
});
