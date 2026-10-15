/*!
 * BD-Map — https://github.com/Tashrif-ui/BD_Map
 * © 2026 Tashrif Alam. Licensed under CC BY-NC-SA 4.0 (non-commercial). Keep this notice.
 */
// Downloads the raw third-party boundary files into data/raw/ (git-ignored).
// Sources and licenses are documented in DATA_SOURCES.md.
import { mkdir, writeFile } from 'node:fs/promises';

const RELEASE = 'https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/BGD';
const FILES = {
  'geoboundaries-adm1.geojson': `${RELEASE}/ADM1/geoBoundaries-BGD-ADM1_simplified.geojson`,
  'geoboundaries-adm2.geojson': `${RELEASE}/ADM2/geoBoundaries-BGD-ADM2_simplified.geojson`,
};

await mkdir('data/raw', { recursive: true });
for (const [name, url] of Object.entries(FILES)) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  const body = await res.text();
  JSON.parse(body); // fail early on a broken download
  await writeFile(`data/raw/${name}`, body);
  console.log(`saved data/raw/${name} (${(body.length / 1024).toFixed(0)} KiB)`);
}
