/*!
 * BD-Map — https://github.com/Tashrif-ui/BD_Map
 * © 2026 Tashrif Alam. Licensed under CC BY-NC-SA 4.0 (non-commercial). Keep this notice.
 */
// Builds the 300 parliamentary constituencies from the Election Commission gazette transcription
// (data/constituencies/gazette.json) and the already-built upazila / union boundaries in public/data/.
//
// A seat's shape = whole upazilas (2023 boundaries) + listed unions / paurashavas / wards (2015 boundaries).
// Parts that cannot be matched to a boundary (cantonments, airport, wards renumbered since 2015 …) are
// listed in `unmatched` and the seat is marked boundary_quality "partial" (or "none") — never guessed.
import { readFileSync, writeFileSync } from 'node:fs';
import mapshaper from 'mapshaper';

const OUT = 'public/data';
const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));
const gazette = readJson('data/constituencies/gazette.json');
const aliases = readJson('data/constituencies/aliases.json');
const districts = readJson(`${OUT}/districts.json`).data;
const upazilas = readJson(`${OUT}/upazilas.json`).data;
const unions = readJson(`${OUT}/unions.json`).data;
const upzShapes = readJson(`${OUT}/boundaries/upazilas.geojson`);
const unionShapes = Object.fromEntries(
  districts.flatMap((d) => readJson(`${OUT}/boundaries/unions/${d.id}.geojson`).features.map((f) => [f.properties.id, f])),
);
const upzShapeById = Object.fromEntries(upzShapes.features.map((f) => [f.properties.id, f]));

// City corporations whose 2015 ward numbers are still the current ward numbers.
// (Dhaka North/South were renumbered after the 2011 split and the 2016 expansion; Sylhet added
// wards 28–42 in 2021 — only the numbers present in the 2015 data can match there.)
const WARD_NUMBERS_RELIABLE = new Set([
  'barishal-barishal-city-corporation',
  'chattogram-chattogram-city-corporation',
  'khulna-khulna-city-corporation',
  'rajshahi-rajshahi-city-corporation',
  'sylhet-sylhet-city-corporation',
]);

/* ---------- Bangla name matching ---------- */
// Loose key: ignores spelling variants common in official documents
// (nukta, chandrabindu, hasanta, ী/ি, ূ/ু, ণ/ন, শ/ষ/স, ঙ/ং, spaces and punctuation).
const bnKey = (s) =>
  (s ?? '')
    .normalize('NFD')
    .replace(/[়ঁ্‌‍\s\-–.,()[\]:;'"]/g, '')
    .replace(/ী/g, 'ি')
    .replace(/ূ/g, 'ু')
    .replace(/ণ/g, 'ন')
    .replace(/[শষ]/g, 'স')
    .replace(/ঙ/g, 'ং')
    .replace(/ৎ/g, 'ত')
    .replace(/ৈ/g, 'ই');
const stripWords = (s) => (s ?? '').replace(/উপজেলা|ইউনিয়ন|পৌরসভা|সিটি\s*কর্পোরেশন(ের|ভুক্ত)?|এলাকা/g, '').trim();

const DISTRICT_ALIASES = {}; // gazette district_bn key → our id, filled in if a spelling differs
const districtByKey = new Map(districts.map((d) => [bnKey(d.name_bn), d]));
function findDistrict(nameBn) {
  return districtByKey.get(bnKey(nameBn)) ?? districts.find((d) => d.id === DISTRICT_ALIASES[bnKey(nameBn)]) ?? null;
}

// Gazette spellings that differ from ours beyond the loose key (data/constituencies/aliases.json).
const UPAZILA_ALIASES = Object.fromEntries(aliases.upazilas.map((a) => [`${a.district}/${bnKey(a.bn)}`, a.upazila]));
const UNION_ALIASES = Object.fromEntries(aliases.unions.map((a) => [`${a.upazila}/${bnKey(a.bn)}`, a.en]));
function findUpazila(district, nameBn) {
  const key = bnKey(stripWords(nameBn));
  const alias = UPAZILA_ALIASES[`${district.id}/${key}`];
  if (alias) return upazilas.find((u) => u.id === alias) ?? null;
  const list = upazilas.filter((u) => u.district_id === district.id);
  return (
    list.find((u) => bnKey(u.name_bn) === key) ??
    // "সদর" upazilas are written with or without the district name.
    list.find((u) => bnKey(u.name_bn).replace(bnKey(district.name_bn), '') === key.replace(bnKey(district.name_bn), '')) ??
    null
  );
}
const looseEn = (s) => s.toLowerCase().replace(/[^a-z]/g, '');
const unitsOf = (upz, types) => unions.filter((u) => u.upazila_id === upz.id && (!types || types.includes(u.type)));
function findUnit(upz, nameBn) {
  const key = bnKey(stripWords(nameBn));
  const aliasEn = UNION_ALIASES[`${upz.id}/${key}`];
  if (aliasEn) return unitsOf(upz).filter((u) => u.name_en === aliasEn);
  return unitsOf(upz).filter((u) => u.name_bn && bnKey(u.name_bn) === key);
}

/* ---------- resolve each seat ---------- */
const seats = [];
const pieces = []; // { seat, feature }
const coverage = {}; // upazila id → seats that include all or part of it
for (const g of gazette.seats) {
  const district = findDistrict(g.district_bn);
  if (!district) throw new Error(`seat ${g.seat}: unknown district ${g.district_bn}`);
  const numberInDistrict = Number(String(g.name_bn).split('-').pop().replace(/[০-৯]/g, (d) => '০১২৩৪৫৬৭৮৯'.indexOf(d)));
  const upazilaIds = new Set();
  const unmatched = [];
  const add = (f) => f && pieces.push({ seat: g.seat, feature: f });

  for (const part of g.parts) {
    const label = part.text_bn ?? [part.upazila_bn, part.name_bn, part.city_bn].filter(Boolean).join(' ');
    if (part.kind === 'upazila' || part.kind === 'unions') {
      const upz = findUpazila(district, part.upazila_bn);
      if (!upz) {
        unmatched.push(`${part.upazila_bn} উপজেলা`);
        continue;
      }
      upazilaIds.add(upz.id);
      const exceptNames = part.except_unions_bn ?? (part.mode === 'except' ? part.unions_bn : null);
      if (part.kind === 'upazila' && !exceptNames) {
        add(upzShapeById[upz.id]); // whole upazila (an "except part of a paurashava" note is ignored)
        if (part.mode === 'whole_except') unmatched.push(`${part.upazila_bn}: ${part.except_text_bn} (not subtracted)`);
        continue;
      }
      let units;
      if (exceptNames) {
        const excluded = new Set();
        for (const n of exceptNames) {
          const m = findUnit(upz, n);
          if (m.length) m.forEach((u) => excluded.add(u.id));
          else unmatched.push(`${part.upazila_bn}: ${n} (not subtracted)`);
        }
        units = unitsOf(upz).filter((u) => !excluded.has(u.id));
      } else if (part.mode === 'all_unions') {
        units = unitsOf(upz, ['union']);
      } else {
        units = [];
        for (const n of part.unions_bn ?? []) {
          const m = findUnit(upz, n);
          if (m.length) units.push(...m);
          else unmatched.push(`${part.upazila_bn}: ${n}`);
        }
      }
      units.forEach((u) => add(unionShapes[u.id]));
    } else if (part.kind === 'paurashava') {
      // A paurashava is named after its town; find the upazila of that name in the district.
      const upz = findUpazila(district, part.name_bn) ?? findUpazila(district, `${part.name_bn} সদর`);
      // One paurashava in the upazila → that one; several → the one named after the town.
      const all = upz ? unitsOf(upz, ['paurashava']) : [];
      const town = upz ? looseEn(upz.name_en.replace(/ Sadar$/, '')) : '';
      const p = all.length === 1 ? all : all.filter((u) => looseEn(u.name_en).startsWith(town));
      if (p.length === 1) {
        upazilaIds.add(upz.id);
        add(unionShapes[p[0].id]);
      } else unmatched.push(`${part.name_bn} পৌরসভা`);
    } else if (part.kind === 'city_wards') {
      const city = upazilas.find(
        (u) => u.type === 'city_corporation' && bnKey(u.name_bn).startsWith(bnKey(stripWords(part.city_bn))),
      );
      if (!city) {
        unmatched.push(`${part.city_bn} সিটি কর্পোরেশন`);
        continue;
      }
      upazilaIds.add(city.id);
      if (!WARD_NUMBERS_RELIABLE.has(city.id)) {
        unmatched.push(`${part.city_bn} সিটি কর্পোরেশনের ওয়ার্ড ${part.wards.join(', ')}`);
        continue;
      }
      const wardNo = (u) => Number((u.name_en.match(/\d+/) || [])[0]);
      const wards = unitsOf(city, ['ward']);
      const missing = [];
      for (const n of part.wards) {
        const m = wards.filter((u) => wardNo(u) === n);
        if (m.length) m.forEach((u) => add(unionShapes[u.id]));
        else missing.push(n);
      }
      if (missing.length) unmatched.push(`${part.city_bn} সিটি কর্পোরেশনের ওয়ার্ড ${missing.join(', ')}`);
    } else if (/পার্বত্য জেলা/.test(part.text_bn ?? '')) {
      // The three hill districts are one seat each.
      for (const upz of upazilas.filter((u) => u.district_id === district.id)) {
        upazilaIds.add(upz.id);
        add(upzShapeById[upz.id]);
      }
    } else {
      // "X সিটি কর্পোরেশনভুক্ত এলাকা" / "X সিটি কর্পোরেশন" without wards = the whole city corporation
      const text = part.text_bn ?? '';
      const whole = /সিটি\s*কর্পোরেশন(ভুক্ত এলাকা)?\s*$/.test(text.trim()) && !/ওয়ার্ড/.test(text);
      const city = whole
        ? upazilas.find((u) => u.type === 'city_corporation' && bnKey(text).startsWith(bnKey(u.name_bn).replace(bnKey('সিটিকর্পোরেশন'), '')))
        : null;
      if (city) {
        upazilaIds.add(city.id);
        add(upzShapeById[city.id]);
      } else unmatched.push(text || label);
    }
  }

  for (const id of upazilaIds) (coverage[id] ||= []).push(g.seat);
  const hasShape = pieces.some((p) => p.seat === g.seat);
  seats.push({
    id: `seat-${String(g.seat).padStart(3, '0')}`,
    seat: g.seat,
    name_bn: g.name_bn,
    name_en: Number.isNaN(numberInDistrict) ? district.name_en : `${district.name_en}-${numberInDistrict}`,
    district_id: district.id,
    division_id: district.division_id,
    upazila_ids: [...upazilaIds],
    text_bn: g.text_bn,
    boundary_quality: !hasShape ? 'none' : unmatched.length ? 'partial' : 'complete',
    unmatched,
    gazette: g.gazette ?? 'No. 875, 11 Dec 2025',
  });
}

/* ---------- checks ---------- */
const errors = [];
if (seats.length !== 300) errors.push(`expected 300 seats, found ${seats.length}`);
seats.forEach((s, i) => s.seat !== i + 1 && errors.push(`seat order broken at ${s.seat}`));
for (const u of upazilas) if (!coverage[u.id]) errors.push(`upazila ${u.id} is in no constituency`);
if (errors.length) {
  for (const s of seats.filter((x) => x.unmatched.length)) console.error(`  ${s.seat} ${s.name_bn}: ${s.unmatched.join(' | ')}`);
  console.error(`✗ constituencies:\n  - ${errors.join('\n  - ')}`);
  process.exit(1);
}

/* ---------- shapes: dissolve the pieces of each seat ---------- */
const fc = {
  type: 'FeatureCollection',
  features: pieces.map(({ seat, feature }) => ({ type: 'Feature', properties: { seat }, geometry: feature.geometry })),
};
const out = await mapshaper.applyCommands('-i in.json -dissolve2 seat gap-fill-area=3km2 -o out.json format=geojson precision=0.0001', { 'in.json': fc });
const dissolved = JSON.parse(out['out.json']);
const seatById = Object.fromEntries(seats.map((s) => [s.seat, s]));
dissolved.features = dissolved.features.map((f) => {
  const s = seatById[f.properties.seat];
  return {
    type: 'Feature',
    properties: { id: s.id, seat: s.seat, name_bn: s.name_bn, name_en: s.name_en, district_id: s.district_id, quality: s.boundary_quality },
    geometry: f.geometry,
  };
});

const TODAY = '2026-10-15';
const meta = (description) => ({
  project: 'BD-Map',
  author: 'Tashrif Alam',
  copyright: '© 2026 Tashrif Alam',
  license: 'CC BY-NC-SA 4.0 (project transcription and processing); gazette text is a public record',
  description,
  sources: [
    { name: 'Bangladesh Election Commission gazette No. 875 (11 Dec 2025), amended by No. 921 (24 Dec 2025) and No. 66 (15 Jan 2026)', url: 'https://ecs.gov.bd/page/gazette-related-to-electoral-areas' },
    { name: 'Boundaries: OCHA COD-AB v03 (upazilas) and BBS 2015 via geoBoundaries (unions, wards)', url: 'https://data.humdata.org/dataset/cod-ab-bgd' },
  ],
  last_verified: TODAY,
});
writeFileSync(`${OUT}/constituencies.json`, JSON.stringify({ meta: meta('The 300 general seats of the Jatiya Sangsad (13th parliament delimitation).'), data: seats }));
writeFileSync(
  `${OUT}/boundaries/constituencies.geojson`,
  JSON.stringify({ type: 'FeatureCollection', meta: meta('Constituency boundaries built from upazila and union boundaries.'), features: dissolved.features }),
);

const q = (k) => seats.filter((s) => s.boundary_quality === k).length;
console.log(`constituencies: ${seats.length} (complete ${q('complete')}, partial ${q('partial')}, none ${q('none')})`);
for (const s of seats.filter((x) => x.unmatched.length)) console.log(`  ${s.seat} ${s.name_bn}: ${s.unmatched.join(' | ')}`);
