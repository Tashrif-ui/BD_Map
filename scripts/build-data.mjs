/*!
 * BD-Map — https://github.com/Tashrif-ui/BD_Map
 * © 2026 Tashrif Alam. Licensed under CC BY-NC-SA 4.0 (non-commercial). Keep this notice.
 */
// Builds the published data in public/data/ from data/raw/ (third-party files, see DATA_SOURCES.md)
// and data/names/ (curated names — project content).
//
//   upazilas  ← OCHA COD-AB v03 admin3 (BBS, valid 2023-05-21), simplified
//   districts ← dissolved from the simplified upazilas (so all levels line up exactly)
//   divisions ← dissolved from the simplified upazilas
//   thanas    ← geoBoundaries ADM3 (BBS 2015 upazila/thana units)
//   unions    ← geoBoundaries ADM4 (BBS 2015 unions, paurashavas, wards), split per district
//   Bangla names ← data/names/*.json + nuhil/bangladesh-geocode (MIT)
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import mapshaper from 'mapshaper';

const TODAY = '2026-10-15';
const OUT = 'public/data';

const SOURCES = {
  codab: {
    name: 'OCHA COD-AB Bangladesh v03 (Bangladesh Bureau of Statistics), valid 2023-05-21',
    url: 'https://data.humdata.org/dataset/cod-ab-bgd',
    license: 'CC BY-IGO',
  },
  gbAdm3: {
    name: 'geoBoundaries gbOpen BGD ADM3 (BGD-ADM3-5055444), Bangladesh Bureau of Statistics 2015 via OCHA HDX',
    url: 'https://www.geoboundaries.org/',
    license: 'CC BY 3.0 IGO',
  },
  gbAdm4: {
    name: 'geoBoundaries gbOpen BGD ADM4, Bangladesh Bureau of Statistics 2015 via OCHA HDX',
    url: 'https://www.geoboundaries.org/',
    license: 'CC BY 3.0 IGO',
  },
  nuhil: {
    name: 'nuhil/bangladesh-geocode (Bangla names)',
    url: 'https://github.com/nuhil/bangladesh-geocode',
    license: 'MIT, © 2014 Nuhil Mehdy',
  },
};

const meta = (description, sources) => ({
  project: 'BD-Map',
  author: 'Tashrif Alam',
  copyright: '© 2026 Tashrif Alam',
  license: 'CC BY-NC-SA 4.0 (project curation); third-party geometry and names keep their source license',
  description,
  sources,
  last_verified: TODAY,
});

/* ---------- helpers ---------- */
const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));
// nuhil files are phpMyAdmin exports: [header, database, { type: 'table', data: [...] }]
const readNuhil = (p) => readJson(p).find((x) => x && x.data).data;
const slug = (s) =>
  s
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
// Loose key for matching English spellings across sources (Ishwardi ≈ Ishurdi, Phulpur ≈ Fulpur …).
const looseKey = (s) =>
  s
    .toLowerCase()
    .replace(/\(.*?\)|sadar|upazila|city corporation|paurashava|pourashava|union/g, '')
    .replace(/[^a-z]/g, '')
    .replace(/ph/g, 'f')
    .replace(/[wv]/g, 'b')
    .replace(/z/g, 'j')
    .replace(/h/g, '')
    .replace(/(.)\1+/g, '$1')
    .replace(/[aeiouy]/g, '');

async function ms(commands, inputs) {
  const out = await mapshaper.applyCommands(commands, inputs);
  const key = Object.keys(out).find((k) => k.endsWith('.json') || k.endsWith('.geojson'));
  return JSON.parse(out[key]);
}

// Point-in-polygon lookup with a bounding-box prefilter.
function polygonIndex(features) {
  const items = features.map((f) => {
    const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
    let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
    for (const poly of polys)
      for (const [x, y] of poly[0]) {
        if (x < x0) x0 = x;
        if (y < y0) y0 = y;
        if (x > x1) x1 = x;
        if (y > y1) y1 = y;
      }
    return { f, polys, bbox: [x0, y0, x1, y1] };
  });
  const inRing = ([x, y], ring) => {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i];
      const [xj, yj] = ring[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  };
  const inPoly = (p, poly) => inRing(p, poly[0]) && !poly.slice(1).some((hole) => inRing(p, hole));
  return (p) => {
    for (const it of items) {
      const [x0, y0, x1, y1] = it.bbox;
      if (p[0] < x0 || p[0] > x1 || p[1] < y0 || p[1] > y1) continue;
      if (it.polys.some((poly) => inPoly(p, poly))) return it.f;
    }
    return null;
  };
}

// One interior point per feature (mapshaper "inner" point is guaranteed inside the shape).
async function innerPoints(fc) {
  const pts = await ms('-i in.json -each "__i=this.id" -points inner -o out.json format=geojson', { 'in.json': fc });
  return pts.features.map((f) => f.geometry.coordinates);
}

const round4 = (fc) => ms('-i in.json -o out.json format=geojson precision=0.0001', { 'in.json': fc });

/* ---------- load ---------- */
const codAdm3 = readJson('data/raw/cod-ab-admin3.geojson');
const gbAdm3 = readJson('data/raw/geoboundaries-adm3.geojson');
const gbAdm4 = readJson('data/raw/geoboundaries-adm4.geojson');
const divNames = readJson('data/names/divisions.json').data;
const distNames = readJson('data/names/districts.json').data;
const upzOverrides = readJson('data/names/upazila-overrides.json').data;
const nuhilDistricts = readNuhil('data/raw/nuhil-districts.json');
const nuhilUpazilas = readNuhil('data/raw/nuhil-upazilas.json');
const nuhilUnions = readNuhil('data/raw/nuhil-unions.json');

const divByCod = new Map(divNames.map((d) => [d.cod_name, d]));
const distByCod = new Map(distNames.map((d) => [d.cod_name, d]));

/* ---------- upazilas (COD-AB) ---------- */
console.log('simplifying upazilas…');
const upzFc = await ms(
  '-i in.json -filter-fields adm3_name,adm3_pcode,adm2_name,adm2_pcode,adm1_name,adm1_pcode ' +
    '-simplify 2.5% keep-shapes -clean -o out.json format=geojson precision=0.0001',
  { 'in.json': codAdm3 },
);

// nuhil district id → our district id (via loose English key)
const distByLoose = new Map(distNames.map((d) => [looseKey(d.name_en), d]));
const NUHIL_DISTRICT_ALIASES = { Chattogram: 'chattogram', Chapainawabganj: 'chapai-nawabganj', Jhalakathi: 'jhalokati' };
const nuhilDistToOurs = {};
for (const d of nuhilDistricts) {
  const ours = NUHIL_DISTRICT_ALIASES[d.name] || distByLoose.get(looseKey(d.name))?.id;
  if (!ours) throw new Error(`nuhil district "${d.name}" has no match`);
  nuhilDistToOurs[d.id] = ours;
}
const nuhilUpzByDistrict = {};
for (const u of nuhilUpazilas) (nuhilUpzByDistrict[nuhilDistToOurs[u.district_id]] ||= []).push(u);

const upazilas = [];
const usedNuhilUpz = new Map(); // nuhil upazila id → our upazila id
for (const f of upzFc.features) {
  const p = f.properties;
  const dist = distByCod.get(p.adm2_name);
  const div = divByCod.get(p.adm1_name);
  if (!dist || !div) throw new Error(`unknown district/division for ${p.adm3_name}`);
  const isCity = / City Corporation$/.test(p.adm3_name);
  const key = `${p.adm2_name} / ${p.adm3_name}`;
  let nameBn = upzOverrides[key] ?? null;
  let nuhilId = null;
  if (!nameBn && !isCity) {
    const m = (nuhilUpzByDistrict[dist.id] || []).find((u) => looseKey(u.name) === looseKey(p.adm3_name));
    if (m) {
      if (usedNuhilUpz.has(m.id)) throw new Error(`nuhil upazila ${m.name} matched twice (${key})`);
      nameBn = m.bn_name.trim();
      nuhilId = m.id;
    }
  }
  if (!nameBn) throw new Error(`no Bangla name for upazila ${key} — add it to data/names/upazila-overrides.json`);
  const id = `${dist.id}-${slug(p.adm3_name)}`;
  if (nuhilId) usedNuhilUpz.set(nuhilId, id);
  upazilas.push({
    id,
    pcode: p.adm3_pcode,
    name_en: p.adm3_name,
    name_bn: nameBn,
    type: isCity ? 'city_corporation' : 'upazila',
    district_id: dist.id,
    division_id: div.id,
    source: SOURCES.codab.name,
    last_verified: TODAY,
  });
  f.properties = { id, district_id: dist.id, division_id: div.id, name_en: p.adm3_name, name_bn: nameBn };
}
const upzById = new Map(upazilas.map((u) => [u.id, u]));
if (upzById.size !== upazilas.length) throw new Error('duplicate upazila ids');

/* ---------- districts + divisions (dissolved from upazilas) ---------- */
console.log('dissolving districts and divisions…');
const distFc = await ms('-i in.json -dissolve district_id copy-fields=division_id -o out.json format=geojson precision=0.0001', {
  'in.json': upzFc,
});
const divFc = await ms('-i in.json -dissolve division_id -o out.json format=geojson precision=0.0001', { 'in.json': upzFc });
for (const f of distFc.features) {
  const d = distNames.find((x) => x.id === f.properties.district_id);
  f.properties = { id: d.id, name_en: d.name_en, name_bn: d.name_bn, division_id: f.properties.division_id };
}
for (const f of divFc.features) {
  const d = divNames.find((x) => x.id === f.properties.division_id);
  f.properties = { id: d.id, name_en: d.name_en, name_bn: d.name_bn };
}

const findUpazilaAt = polygonIndex(upzFc.features);
// Host upazila of a feature: its interior point, or (if simplification moved edges) the majority of its vertices.
function hostUpazila(feature, point) {
  const direct = findUpazilaAt(point);
  if (direct) return direct;
  const polys = feature.geometry.type === "Polygon" ? [feature.geometry.coordinates] : feature.geometry.coordinates;
  const votes = new Map();
  for (const poly of polys)
    for (const v of poly[0]) {
      const h = findUpazilaAt(v);
      if (h) votes.set(h, (votes.get(h) || 0) + 1);
    }
  return [...votes.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

/* ---------- thanas (geoBoundaries ADM3, BBS 2015) ---------- */
console.log('building thanas…');
const thanaFc = await ms('-i in.json -filter-fields shapeName -simplify 35% keep-shapes -clean -o out.json format=geojson precision=0.0001', {
  'in.json': gbAdm3,
});
const thanaPts = await innerPoints(thanaFc);
const thanas = [];
const thanaIds = new Set();
thanaFc.features.forEach((f, i) => {
  const host = hostUpazila(f, thanaPts[i]);
  if (!host) throw new Error(`thana ${f.properties.shapeName} is outside every upazila`);
  const upz = upzById.get(host.properties.id);
  const name = f.properties.shapeName;
  let id = `${upz.district_id}-${slug(name)}`;
  if (thanaIds.has(id)) id = `${upz.id}-${slug(name)}`;
  thanaIds.add(id);
  // Bangla name only when the thana is the upazila of the same name; otherwise left empty (never guessed).
  const nameBn = looseKey(name) === looseKey(upz.name_en) ? upz.name_bn : null;
  thanas.push({
    id,
    name_en: name,
    name_bn: nameBn,
    upazila_id: upz.id,
  });
  f.properties = { id, district_id: upz.district_id, name_en: name, name_bn: nameBn };
});

/* ---------- unions (geoBoundaries ADM4, BBS 2015) ---------- */
console.log('building unions…');
const unionFc = await ms('-i in.json -filter-fields shapeName -simplify 30% keep-shapes -clean -o out.json format=geojson precision=0.0001', {
  'in.json': gbAdm4,
});
const unionPts = await innerPoints(unionFc);
const nuhilUnionsByUpz = {};
for (const u of nuhilUnions) {
  const ours = usedNuhilUpz.get(u.upazilla_id);
  if (ours) (nuhilUnionsByUpz[ours] ||= []).push(u);
}
const unionType = (n) =>
  /paurashava|pourashava/i.test(n) ? 'paurashava' : /ward/i.test(n) ? 'ward' : /cantonment/i.test(n) ? 'cantonment' : 'union';
const unions = [];
const unionIds = new Set();
let unionBn = 0;
unionFc.features.forEach((f, i) => {
  const host = hostUpazila(f, unionPts[i]);
  if (!host) {
    console.warn(`  skipped union ${f.properties.shapeName}: outside every upazila`);
    f.properties = null;
    return;
  }
  const upz = upzById.get(host.properties.id);
  const name = f.properties.shapeName;
  let id = `${upz.id}-${slug(name)}`;
  for (let n = 2; unionIds.has(id); n++) id = `${upz.id}-${slug(name)}-${n}`;
  unionIds.add(id);
  const type = unionType(name);
  const m =
    type === 'union' ? (nuhilUnionsByUpz[upz.id] || []).find((u) => looseKey(u.name) === looseKey(name)) : null;
  const nameBn = m ? m.bn_name.trim() : null;
  if (nameBn) unionBn++;
  unions.push({
    id,
    name_en: name,
    name_bn: nameBn,
    type,
    upazila_id: upz.id,
  });
  f.properties = { id, upazila_id: upz.id, district_id: upz.district_id, name_en: name, name_bn: nameBn, type };
});
unionFc.features = unionFc.features.filter((f) => f.properties);
console.log(`  unions: ${unions.length}, with Bangla name: ${unionBn}`);

/* ---------- records ---------- */
const byName = (a, b) => a.name_en.localeCompare(b.name_en);
const divisions = divNames
  .map((d) => ({
    id: d.id,
    name_en: d.name_en,
    name_bn: d.name_bn,
    district_ids: distNames.filter((x) => distFc.features.find((f) => f.properties.id === x.id).properties.division_id === d.id).map((x) => x.id),
    source: SOURCES.codab.name,
    last_verified: TODAY,
  }))
  .sort(byName);
const districts = distNames
  .map((d) => ({
    id: d.id,
    name_en: d.name_en,
    name_bn: d.name_bn,
    division_id: distFc.features.find((f) => f.properties.id === d.id).properties.division_id,
    upazila_ids: upazilas.filter((u) => u.district_id === d.id).map((u) => u.id),
    source: SOURCES.codab.name,
    last_verified: TODAY,
  }))
  .sort(byName);
upazilas.sort(byName);
thanas.sort(byName);
unions.sort(byName);

/* ---------- write ---------- */
rmSync(`${OUT}/boundaries`, { recursive: true, force: true });
mkdirSync(`${OUT}/boundaries/unions`, { recursive: true });
const write = (path, obj) => {
  const body = JSON.stringify(obj);
  writeFileSync(`${OUT}/${path}`, body);
  return body.length;
};
const fc = (features, description, sources) => ({ type: 'FeatureCollection', meta: meta(description, sources), features });

const sizes = {};
sizes['divisions.json'] = write('divisions.json', { meta: meta('The 8 divisions of Bangladesh.', [SOURCES.codab]), data: divisions });
sizes['districts.json'] = write('districts.json', { meta: meta('The 64 districts of Bangladesh.', [SOURCES.codab]), data: districts });
sizes['upazilas.json'] = write('upazilas.json', {
  meta: meta('Upazilas and city corporations (OCHA COD-AB v03).', [SOURCES.codab, SOURCES.nuhil]),
  data: upazilas,
});
sizes['thanas.json'] = write('thanas.json', {
  meta: meta('Upazila/thana units of the BBS 2015 boundary set. name_bn is empty when not verified.', [SOURCES.gbAdm3]),
  data: thanas,
});
sizes['unions.json'] = write('unions.json', {
  meta: meta('Unions, paurashavas and city wards (BBS 2015). name_bn is empty when not verified.', [SOURCES.gbAdm4, SOURCES.nuhil]),
  data: unions,
});
sizes['boundaries/divisions.geojson'] = write('boundaries/divisions.geojson', fc((await round4(divFc)).features, 'Division boundaries (dissolved from upazilas).', [SOURCES.codab]));
sizes['boundaries/districts.geojson'] = write('boundaries/districts.geojson', fc((await round4(distFc)).features, 'District boundaries (dissolved from upazilas).', [SOURCES.codab]));
sizes['boundaries/upazilas.geojson'] = write('boundaries/upazilas.geojson', fc(upzFc.features, 'Upazila and city corporation boundaries.', [SOURCES.codab]));
sizes['boundaries/thanas.geojson'] = write('boundaries/thanas.geojson', fc(thanaFc.features, 'Upazila/thana unit boundaries (BBS 2015).', [SOURCES.gbAdm3]));
for (const d of distNames) {
  const feats = unionFc.features.filter((f) => f.properties.district_id === d.id);
  sizes[`boundaries/unions/${d.id}.geojson`] = write(
    `boundaries/unions/${d.id}.geojson`,
    fc(feats, `Union boundaries for ${d.name_en} district (BBS 2015).`, [SOURCES.gbAdm4]),
  );
}

const kib = (n) => `${(n / 1024).toFixed(0)} KiB`;
for (const [k, v] of Object.entries(sizes)) if (!k.startsWith('boundaries/unions/')) console.log(`wrote ${OUT}/${k} (${kib(v)})`);
const unionSizes = Object.entries(sizes).filter(([k]) => k.startsWith('boundaries/unions/')).map(([, v]) => v);
console.log(`wrote ${unionSizes.length} union files (largest ${kib(Math.max(...unionSizes))}, total ${kib(unionSizes.reduce((a, b) => a + b, 0))})`);
console.log(`upazilas ${upazilas.length} (city corporations ${upazilas.filter((u) => u.type === 'city_corporation').length}), thanas ${thanas.length}, unions ${unions.length}`);
