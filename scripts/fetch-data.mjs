/*!
 * BD-Map — https://github.com/Tashrif-ui/BD_Map
 * © 2026 Tashrif Alam. Licensed under CC BY-NC-SA 4.0 (non-commercial). Keep this notice.
 */
// Downloads the raw third-party files into data/raw/ (git-ignored).
// Sources and licenses are documented in DATA_SOURCES.md.
import { mkdir, writeFile } from 'node:fs/promises';
import { unzipSync } from 'fflate';

const GEOBOUNDARIES = 'https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/BGD';
const NUHIL = 'https://raw.githubusercontent.com/nuhil/bangladesh-geocode/5622f68bd07a98e076edcf8100bf0db6a75b9854';
const COD_AB_ZIP =
  'https://data.humdata.org/dataset/401d3fae-4262-48c9-891f-461fd776d49b/resource/cec2abe3-d8b7-4025-9362-9f7e780f2a07/download/bgd_admin_boundaries.geojson.zip';

const FILES = {
  // OCHA COD-AB v03 (BBS) — upazilas + city corporations; divisions/districts are dissolved from these.
  'cod-ab-bgd.geojson.zip': COD_AB_ZIP,
  // geoBoundaries (BBS 2015) — upazila/thana units and unions.
  'geoboundaries-adm3.geojson': `${GEOBOUNDARIES}/ADM3/geoBoundaries-BGD-ADM3_simplified.geojson`,
  'geoboundaries-adm4.geojson': `${GEOBOUNDARIES}/ADM4/geoBoundaries-BGD-ADM4_simplified.geojson`,
  // nuhil/bangladesh-geocode (MIT) — Bangla names.
  'nuhil-districts.json': `${NUHIL}/districts/districts.json`,
  'nuhil-upazilas.json': `${NUHIL}/upazilas/upazilas.json`,
  'nuhil-unions.json': `${NUHIL}/unions/unions.json`,
};
// Only these members of the COD-AB zip are used.
const COD_AB_MEMBERS = ['bgd_admin3.geojson'];

await mkdir('data/raw', { recursive: true });
for (const [name, url] of Object.entries(FILES)) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (name.endsWith('.zip')) {
    const files = unzipSync(bytes, { filter: (f) => COD_AB_MEMBERS.includes(f.name) });
    for (const member of COD_AB_MEMBERS) {
      if (!files[member]) throw new Error(`${member} missing from ${name}`);
      const text = new TextDecoder().decode(files[member]);
      JSON.parse(text);
      await writeFile(`data/raw/cod-ab-${member.replace('bgd_', '')}`, text);
      console.log(`saved data/raw/cod-ab-${member.replace('bgd_', '')} (${(text.length / 1048576).toFixed(1)} MiB)`);
    }
  } else {
    const text = new TextDecoder().decode(bytes);
    JSON.parse(text); // fail early on a broken download
    await writeFile(`data/raw/${name}`, text);
    console.log(`saved data/raw/${name} (${(text.length / 1024).toFixed(0)} KiB)`);
  }
}
