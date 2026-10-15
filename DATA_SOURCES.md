# Data Sources

BD-Map © 2026 Tashrif Alam. This file lists every third-party dataset used in the project, its license, and when it was retrieved (PROJECT.md Rule 3).

Third-party data is **not** owned by BD-Map and keeps its original license. The project's own work — name tables, processing, validation and presentation — is © 2026 Tashrif Alam under CC BY-NC-SA 4.0.

All files are downloaded by `npm run data:fetch` and processed by `npm run data:build`.

## In use

### 1. Divisions, districts, upazilas and city corporations

| | |
|---|---|
| Dataset | **OCHA Common Operational Dataset – Administrative Boundaries (COD-AB), Bangladesh, v03** — `bgd_admin3` |
| Original source | **Bangladesh Bureau of Statistics (BBS)** |
| Publisher | UN OCHA on HDX — https://data.humdata.org/dataset/cod-ab-bgd |
| Valid on | 2023-05-21 (dataset updated on HDX 2026-01-26) |
| License | **CC BY-IGO** (Creative Commons Attribution for Intergovernmental Organisations) — attribution required |
| Retrieved | 2026-10-15 |
| Contents used | 495 upazilas + 12 city corporations with P-codes |
| Used in | `upazilas.json`, `boundaries/upazilas.geojson`; districts and divisions are **dissolved from these upazilas** (`districts.json`, `divisions.json`, `boundaries/districts.geojson`, `boundaries/divisions.geojson`) so every level lines up exactly |

### 2. Thanas (upazila/thana units) and unions

| | |
|---|---|
| Dataset | geoBoundaries gbOpen Bangladesh **ADM3** (`BGD-ADM3-5055444`, 544 units) and **ADM4** (5,160 unions, paurashavas and city wards), simplified releases |
| Original source | **Bangladesh Bureau of Statistics (BBS)**, 2015 administrative boundaries, published by OCHA on HDX: https://data.humdata.org/dataset/administrative-boundaries-of-bangladesh-as-of-2015 |
| Redistributed by | geoBoundaries — https://www.geoboundaries.org (release `9469f09`) |
| License | **CC BY 3.0 IGO** — attribution required |
| Retrieved | 2026-10-15 |
| Used in | `thanas.json`, `boundaries/thanas.geojson`, `unions.json`, `boundaries/unions/<district>.geojson` |

geoBoundaries asks users to cite: Runfola, D. et al. (2020) *geoBoundaries: A global database of political administrative boundaries.* PLoS ONE 15(4): e0231866. https://doi.org/10.1371/journal.pone.0231866

### 3. Bangla names of upazilas and unions

| | |
|---|---|
| Dataset | **nuhil/bangladesh-geocode** — divisions, districts, upazilas (494) and unions (4,540) with Bangla names |
| URL | https://github.com/nuhil/bangladesh-geocode (commit `5622f68`) |
| License | **MIT**, Copyright (c) 2014 Nuhil Mehdy — the MIT notice is reproduced below |
| Retrieved | 2026-10-15 |
| Used for | Bangla names, matched to the boundary datasets by district and English spelling |

> The MIT License (MIT) — Copyright (c) 2014 Nuhil Mehdy
>
> Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
>
> The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
>
> THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

## Processing done by BD-Map

- **Official names** for divisions and districts come from `data/names/` (curated by BD-Map).
- **Bangla upazila names**: matched automatically from nuhil/bangladesh-geocode; 41 upazilas and city corporations whose spelling differs or which are newer (e.g. Shayestaganj, Shantiganj, Indurkani) use `data/names/upazila-overrides.json`. Every upazila has a Bangla name.
- **Bangla union names**: matched automatically where the English spelling agrees (about 3,800 of 5,160). Paurashavas, city wards and unmatched unions show their English name — names are never guessed.
- **Bangla thana names**: only where the thana has the same name as its upazila; others show English.
- Thanas and unions are assigned to the upazila (2023) that contains them.
- Geometry simplified with mapshaper (shared borders kept topologically consistent); coordinates rounded to 4 decimals (~11 m).

## Known limitations

- Upazila boundaries reflect BBS data valid on 2023-05-21. Thana and union boundaries are from 2015; units created later (new thanas, unions, wards) are missing, and their edges may differ slightly from the 2023 upazila edges.
- Geometry is simplified for fast loading; it is not suitable for legal or survey use.

## Phase 5 — parliamentary constituencies

| | |
|---|---|
| Source | **Bangladesh Election Commission** gazettes on electoral areas — https://ecs.gov.bd/page/gazette-related-to-electoral-areas |
| Main gazette | No. 875, *জাতীয় সংসদের ৩০০ আসনের পুনঃনির্ধারিত সীমানার গেজেট*, 11 December 2025 |
| Amendments | No. 921 (24 December 2025: Pabna-1, Pabna-2, Faridpur-2, Faridpur-4); No. 66 (15 January 2026: Pabna-1, Pabna-2) |
| License | Government gazette (public record) |
| Transcription | `data/constituencies/gazette.json` — every seat transcribed from the gazette page images (the PDF text layer uses a legacy font and cannot be extracted); `text_bn` is verbatim |
| Spelling aliases | `data/constituencies/aliases.json` — only unambiguous matches |
| Boundaries | built by `scripts/build-constituencies.mjs` from the upazila (2023) and union/ward (2015) boundaries above: **267 complete, 18 partial, 15 not drawable**. Missing parts (current city-corporation wards of Dhaka North/South, Gazipur, Narayanganj and Rangpur; Sylhet wards 28–42; cantonments; airport; unions created after 2015) are listed per seat in `unmatched` |
