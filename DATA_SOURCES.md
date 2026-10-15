# Data Sources

BD-Map © 2026 Tashrif Alam. This file lists every third-party dataset used in the project, its license, and when it was retrieved (PROJECT.md Rule 3).

Third-party data is **not** owned by BD-Map and keeps its original license. The project's own work — name tables, processing, validation and presentation — is © 2026 Tashrif Alam under CC BY-NC-SA 4.0.

## In use

### 1. Division boundaries (8)

| | |
|---|---|
| Dataset | geoBoundaries gbOpen, Bangladesh ADM1 — `BGD-ADM1-32408957` (simplified) |
| Publisher | geoBoundaries, William & Mary geoLab — https://www.geoboundaries.org |
| Original source | Wikimedia Commons (per geoBoundaries metadata) |
| License | **CC0 1.0** (public domain dedication) |
| File | https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/BGD/ADM1/geoBoundaries-BGD-ADM1_simplified.geojson |
| Retrieved | 2026-10-15 |
| Used in | `public/data/boundaries/divisions.geojson`, `public/data/divisions.json` |

### 2. District boundaries (64)

| | |
|---|---|
| Dataset | geoBoundaries gbOpen, Bangladesh ADM2 — `BGD-ADM2-16705992` (simplified) |
| Original source | **Bangladesh Bureau of Statistics (BBS)**, published by OCHA on HDX: https://data.humdata.org/dataset/administrative-boundaries-of-bangladesh-as-of-2015 |
| Redistributed by | geoBoundaries — https://www.geoboundaries.org |
| License | **CC BY 3.0 IGO** — attribution required |
| File | https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/BGD/ADM2/geoBoundaries-BGD-ADM2_simplified.geojson |
| Retrieved | 2026-10-15 |
| Used in | `public/data/boundaries/districts.geojson`, `public/data/districts.json` |

geoBoundaries asks users to cite: Runfola, D. et al. (2020) *geoBoundaries: A global database of political administrative boundaries.* PLoS ONE 15(4): e0231866. https://doi.org/10.1371/journal.pone.0231866

## Processing done by BD-Map

- Names replaced with current official spellings and Bangla names from `data/names/` (e.g. `Rajshani` → Rajshahi, `Chittagong` → Chattogram, `Comilla` → Cumilla, `Bogra` → Bogura, `Jessore` → Jashore, `Barisal` → Barishal, `Nawabganj` → Chapai Nawabganj, `Netrakona` → Netrokona, `Maulvibazar` → Moulvibazar, `Brahamanbaria` → Brahmanbaria).
- Each district is assigned to the division that contains most of its boundary vertices; the result is checked against the official counts (Dhaka 13, Chattogram 11, Rajshahi 8, Khulna 10, Barishal 6, Sylhet 4, Rangpur 8, Mymensingh 4).
- Coordinates rounded to 4 decimal places (~11 m).

## Known limitations

- The district boundaries represent the 2015 BBS dataset (geoBoundaries "year represented": 2020). Boundary changes after that date may not be reflected.
- Geometry is simplified for fast loading; it is not suitable for legal or survey use.

## Candidates for later phases (not yet verified)

| Phase | Data | Candidate source | Status |
|---|---|---|---|
| 4 | Upazilas | geoBoundaries ADM3 `BGD-ADM3-5055444` (BBS via HDX, CC BY 3.0 IGO, 544 units) | to verify |
| 4 | Thanas, unions | BBS / HDX admin boundaries | to verify |
| 5 | Parliamentary constituencies | Bangladesh Election Commission gazette — https://ecs.gov.bd/page/gazette-related-to-electoral-areas?lang=en | to verify |
