/*!
 * BD-Map — https://github.com/Tashrif-ui/BD_Map
 * © 2026 Tashrif Alam. Licensed under CC BY-NC-SA 4.0 (non-commercial). Keep this notice.
 */
// Validates everything in public/data/. Runs before every production build.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'public/data';
const MAX_BYTES = 25 * 1024 * 1024; // Cloudflare Pages per-file limit
const BD_BBOX = { minLon: 87.9, maxLon: 92.8, minLat: 20.3, maxLat: 26.8 };
const EXPECTED_DISTRICTS = {
  dhaka: 13, chattogram: 11, rajshahi: 8, khulna: 10, barishal: 6, sylhet: 4, rangpur: 8, mymensingh: 4,
};

const errors = [];
const fail = (msg) => errors.push(msg);

function files(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : [p];
  });
}

// 1. Every file: size limit, valid JSON, owner credit (Rule 1 + Rule 2)
const parsed = {};
for (const file of files(ROOT).filter((f) => /\.(geo)?json$/.test(f))) {
  const size = statSync(file).size;
  if (size > MAX_BYTES) fail(`${file}: ${(size / 1048576).toFixed(1)} MiB exceeds the 25 MiB Cloudflare limit`);
  let json;
  try {
    json = JSON.parse(readFileSync(file, 'utf8'));
  } catch (e) {
    fail(`${file}: invalid JSON (${e.message})`);
    continue;
  }
  if (json.meta?.author !== 'Tashrif Alam') fail(`${file}: meta.author must be "Tashrif Alam"`);
  if (!json.meta?.last_verified) fail(`${file}: meta.last_verified missing`);
  if (!json.meta?.sources?.length) fail(`${file}: meta.sources missing`);
  parsed[file.replace(/\\/g, '/').slice(ROOT.length + 1)] = json;
}

// 2. Counts and parent-child links
const divisions = parsed['divisions.json']?.data ?? [];
const districts = parsed['districts.json']?.data ?? [];
if (divisions.length !== 8) fail(`expected 8 divisions, found ${divisions.length}`);
if (districts.length !== 64) fail(`expected 64 districts, found ${districts.length}`);

const divIds = new Set(divisions.map((d) => d.id));
const distIds = new Set(districts.map((d) => d.id));
if (divIds.size !== divisions.length) fail('duplicate division ids');
if (distIds.size !== districts.length) fail('duplicate district ids');

for (const d of [...divisions, ...districts]) {
  if (!d.name_en || !d.name_bn) fail(`${d.id}: missing English or Bangla name`);
  if (d.name_bn && !/[ঀ-৿]/.test(d.name_bn)) fail(`${d.id}: name_bn is not Bangla script`);
  if (!d.source || !d.last_verified) fail(`${d.id}: missing source or last_verified`);
}
for (const d of districts) if (!divIds.has(d.division_id)) fail(`district ${d.id}: unknown division ${d.division_id}`);
for (const dv of divisions) {
  const children = districts.filter((d) => d.division_id === dv.id).map((d) => d.id).sort();
  if (JSON.stringify(children) !== JSON.stringify([...dv.district_ids].sort()))
    fail(`division ${dv.id}: district_ids do not match districts.json`);
  if (EXPECTED_DISTRICTS[dv.id] !== children.length)
    fail(`division ${dv.id}: expected ${EXPECTED_DISTRICTS[dv.id]} districts, found ${children.length}`);
}

// 3. Boundaries: one feature per record, closed rings, coordinates inside Bangladesh
function checkBoundaries(path, records) {
  const fc = parsed[path];
  if (!fc) return fail(`${path}: missing`);
  const ids = fc.features.map((f) => f.properties.id).sort();
  if (JSON.stringify(ids) !== JSON.stringify(records.map((r) => r.id).sort()))
    fail(`${path}: feature ids do not match the records`);
  for (const f of fc.features) {
    const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
    for (const poly of polys)
      for (const ring of poly) {
        const [a, b] = [ring[0], ring[ring.length - 1]];
        if (ring.length < 4 || a[0] !== b[0] || a[1] !== b[1]) fail(`${path} ${f.properties.id}: ring not closed`);
        for (const [lon, lat] of ring)
          if (lon < BD_BBOX.minLon || lon > BD_BBOX.maxLon || lat < BD_BBOX.minLat || lat > BD_BBOX.maxLat) {
            fail(`${path} ${f.properties.id}: coordinate ${lon},${lat} outside Bangladesh`);
            break;
          }
      }
  }
}
checkBoundaries('boundaries/divisions.geojson', divisions);
checkBoundaries('boundaries/districts.geojson', districts);

if (errors.length) {
  console.error(`✗ data validation failed (${errors.length}):\n  - ${errors.join('\n  - ')}`);
  process.exit(1);
}
console.log(`✓ data valid: ${divisions.length} divisions, ${districts.length} districts, ${Object.keys(parsed).length} files`);
