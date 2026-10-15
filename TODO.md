# BD-Map — To-Do (Phase by Phase)

© 2026 Tashrif Alam. Follows the rules in [PROJECT.md](PROJECT.md).

Legend: `[x]` done · `[ ]` pending · `[~]` in progress / partial

---

## Phase 1 — Repository & project setup
- [x] `README.md` (owner credit, how to run, how to credit)
- [x] `LICENSE` — CC BY-NC-SA 4.0, © 2026 Tashrif Alam
- [x] `DATA_SOURCES.md` — every third-party source, license, retrieval date
- [x] `.gitignore` (Node)
- [x] Vite + React + Leaflet project (`package.json`, `vite.config.js`, `index.html`)
- [x] Owner meta tags + no-flash theme script in `index.html`
- [x] `favicon.svg`, `public/_headers` (Cloudflare caching)

## Phase 2 — Divisions & districts data
- [x] Download division (ADM1) and district (ADM2) boundaries from geoBoundaries
- [x] Fix names to official spellings (e.g. `Rajshani` → Rajshahi, `Comilla` → Cumilla) + Bangla names
- [x] Assign each district to its division and check counts (Dhaka 13, Chattogram 11, Rajshahi 8, Khulna 10, Barishal 6, Sylhet 4, Rangpur 8, Mymensingh 4)
- [x] `divisions.json`, `districts.json` + `boundaries/*.geojson` with `meta` block (Rule 2)
- [x] `scripts/validate-data.js` — counts, parent links, `meta.author`, 25 MiB limit, coordinates inside Bangladesh

## Phase 3 — Interactive map (divisions & districts)
- [x] Theme (light/dark) with CSS variables, saved choice, follows system on first visit
- [x] Language switcher বাংলা 🇧🇩 / English 🇺🇸 (SVG flags), Bangla digits, saved choice
- [x] Map: vivid division colours, district shades, hover, click to select, labels by zoom
- [x] Layer panel (Divisions, Districts on; others marked with their phase)
- [x] Details panel with breadcrumb, district list, source + date
- [x] Search (Bangla + English)
- [x] Footer + map attribution with owner name
- [x] Mobile: drawer, bottom sheet, landscape side sheet, safe areas
- [x] Production build passes (`npm run build`) + browser test of desktop, mobile, landscape
- [ ] Push to GitHub + first deploy to Cloudflare Pages — needs the owner's GitHub and Cloudflare accounts

## Phase 4 — Upazilas, thanas, unions
- [x] Upazila boundaries: OCHA COD-AB v03 (BBS 2023) — 495 upazilas + 12 city corporations; divisions/districts now dissolved from them so all levels line up
- [x] Bangla upazila names for all 507 (nuhil/bangladesh-geocode MIT + `data/names/upazila-overrides.json`)
- [x] Thanas: BBS 2015 upazila/thana units (544) as a separate dataset/layer
- [x] Unions, paurashavas, wards: BBS 2015 (5,160), split per district, loaded only when zoomed in; ~3,800 with verified Bangla names
- [x] Layers, details panels, breadcrumbs and search for upazilas, thanas and unions
- [x] `validate-data.js` extended (counts, parent links, per-district union files)
- [ ] Bangla names for the remaining unions, paurashavas, wards and city thanas (needs a verified source)
- [ ] Newer thanas/unions created after 2015 (needs newer boundary data)

## Phase 5 — Parliamentary constituencies
- [x] Election Commission gazette No. 875 (11 Dec 2025) transcribed seat by seat (`data/constituencies/gazette.json`), amendments No. 921 (Faridpur-2, Faridpur-4) and No. 66 (Pabna-1, Pabna-2 restored) applied
- [x] All 300 seats with Bangla + English names, district, upazilas, verbatim gazette text
- [x] Boundaries built from upazilas (2023) + unions/paurashavas/wards (2015): 267 complete, 18 partial, 15 not drawable — every gap listed per seat, nothing guessed
- [x] Constituency layer with seat-number labels (partial seats dashed), details panel, seat lists on district/upazila/union panels, search by name or number
- [x] Validation: 300 seats, every upazila in at least one seat, shapes match records
- [ ] Boundaries for seats made of current city-corporation wards (Dhaka North/South, Gazipur, Narayanganj, Rangpur, new Sylhet wards) — needs current ward boundary data
- [ ] Cantonment / airport areas, and unions created after 2015
- [ ] Historical boundaries (earlier delimitations)

## Phase 6 — Search, filters, polish
- [x] Search across divisions, districts, upazilas, thanas, unions and constituencies (Bangla/English, seat number, Unicode-safe)
- [x] Filtering by layer toggles and division legend; focus dimming around the selected area
- [x] Shareable links (`#district/bogura`, `#seat/seat-186` …) + copy-link button
- [x] Map image export with title and `BD-Map · © Tashrif Alam` watermark
- [x] About dialog (author, how to credit, license, sources) from the footer

## Phase 7 — Validation, docs, launch
- [ ] Full geographic accuracy check
- [ ] Final source documentation
- [ ] Production deploy to Cloudflare Pages
