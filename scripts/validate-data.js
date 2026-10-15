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

// Upazilas, thanas, unions
const upazilas = parsed["upazilas.json"]?.data ?? [];
const thanas = parsed["thanas.json"]?.data ?? [];
const unions = parsed["unions.json"]?.data ?? [];
const upzIds = new Set(upazilas.map((u) => u.id));
if (upzIds.size !== upazilas.length) fail("duplicate upazila ids");
const cities = upazilas.filter((u) => u.type === "city_corporation").length;
if (cities !== 12) fail(`expected 12 city corporations, found ${cities}`);
if (upazilas.length - cities < 490) fail(`only ${upazilas.length - cities} upazilas — expected about 495`);
for (const u of upazilas) {
  if (!u.name_en || !u.name_bn || !/[ঀ-৿]/.test(u.name_bn)) fail(`upazila ${u.id}: missing/invalid Bangla or English name`);
  if (!distIds.has(u.district_id)) fail(`upazila ${u.id}: unknown district ${u.district_id}`);
  const d = districts.find((x) => x.id === u.district_id);
  if (d && d.division_id !== u.division_id) fail(`upazila ${u.id}: division does not match its district`);
  if (!u.source || !u.last_verified) fail(`upazila ${u.id}: missing source or last_verified`);
}
for (const d of districts) {
  const children = upazilas.filter((u) => u.district_id === d.id).map((u) => u.id).sort();
  if (!children.length) fail(`district ${d.id}: has no upazilas`);
  if (JSON.stringify(children) !== JSON.stringify([...(d.upazila_ids || [])].sort())) fail(`district ${d.id}: upazila_ids do not match upazilas.json`);
}
const checkChildren = (label, list) => {
  const ids = new Set(list.map((x) => x.id));
  if (ids.size !== list.length) fail(`duplicate ${label} ids`);
  for (const x of list) {
    if (!x.name_en) fail(`${label} ${x.id}: missing English name`);
    if (x.name_bn != null && !/[ঀ-৿]/.test(x.name_bn)) fail(`${label} ${x.id}: name_bn is not Bangla script`);
    if (!upzIds.has(x.upazila_id)) fail(`${label} ${x.id}: unknown upazila ${x.upazila_id}`);
  }
};
checkChildren("thana", thanas);
checkChildren("union", unions);
if (thanas.length < 500) fail(`only ${thanas.length} thanas`);
if (unions.length < 4500) fail(`only ${unions.length} unions`);

// Parliamentary constituencies
const seats = parsed["constituencies.json"]?.data ?? [];
if (seats.length !== 300) fail(`expected 300 constituencies, found ${seats.length}`);
seats.forEach((s, i) => {
  if (s.seat !== i + 1) fail(`constituency order broken at ${s.seat}`);
  if (!s.name_bn || !s.name_en || !s.text_bn) fail(`seat ${s.seat}: missing name or gazette text`);
  if (!distIds.has(s.district_id)) fail(`seat ${s.seat}: unknown district ${s.district_id}`);
  for (const u of s.upazila_ids) if (!upzIds.has(u)) fail(`seat ${s.seat}: unknown upazila ${u}`);
  if (!["complete", "partial", "none"].includes(s.boundary_quality)) fail(`seat ${s.seat}: bad boundary_quality`);
  if (s.boundary_quality !== "complete" && !s.unmatched.length) fail(`seat ${s.seat}: partial without unmatched parts`);
});
for (const u of upazilas) if (!seats.some((s) => s.upazila_ids.includes(u.id))) fail(`upazila ${u.id} is in no constituency`);
{
  const fc = parsed["boundaries/constituencies.geojson"];
  const withShape = seats.filter((s) => s.boundary_quality !== "none").map((s) => s.id).sort();
  if (!fc) fail("boundaries/constituencies.geojson: missing");
  else if (JSON.stringify(fc.features.map((f) => f.properties.id).sort()) !== JSON.stringify(withShape))
    fail("constituency shapes do not match the seats that have a boundary");
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
checkBoundaries("boundaries/upazilas.geojson", upazilas);
checkBoundaries("boundaries/thanas.geojson", thanas);
checkBoundaries("boundaries/constituencies.geojson", seats.filter((x) => x.boundary_quality !== "none"));
// Unions are split per district; together they must cover every union exactly once.
{
  const all = [];
  for (const d of districts) {
    const path = `boundaries/unions/${d.id}.geojson`;
    if (!parsed[path]) { fail(`${path}: missing`); continue; }
    for (const f of parsed[path].features) {
      all.push(f);
      const u = unions.find((x) => x.id === f.properties.id);
      if (u && upazilas.find((x) => x.id === u.upazila_id)?.district_id !== d.id) fail(`${path}: union ${u.id} belongs to another district`);
    }
  }
  parsed["__unions"] = { features: all };
  checkBoundaries("__unions", unions);
}

if (errors.length) {
  console.error(`✗ data validation failed (${errors.length}):\n  - ${errors.join('\n  - ')}`);
  process.exit(1);
}
console.log(`✓ data valid: ${divisions.length} divisions, ${districts.length} districts, ${upazilas.length} upazilas (${cities} city corporations), ${thanas.length} thanas, ${unions.length} unions, ${seats.length} constituencies, ${Object.keys(parsed).length - 1} files`);
