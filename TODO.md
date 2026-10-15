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
- [ ] Find and verify upazila boundary source + license
- [ ] Upazila list per district (Bangla + English), split GeoJSON per district
- [ ] Thana / police station data (separate dataset from upazilas)
- [ ] Union data (split per district, lazy-loaded)
- [ ] Enable layers + details

## Phase 5 — Parliamentary constituencies
- [ ] Latest Election Commission gazette for the 300 seats
- [ ] Seat numbers + names (Bangla + English), district & upazila links
- [ ] Verified constituency boundaries (kept separate from admin boundaries)
- [ ] Seat-number labels on the map + details panel

## Phase 6 — Search, filters, polish
- [ ] Search across all levels (division → union, constituencies)
- [ ] Filters, URL sharing of the selected area
- [ ] Image export with `BD-Map · Tashrif Alam` watermark
- [ ] About page (author, how to credit, sources)

## Phase 7 — Validation, docs, launch
- [ ] Full geographic accuracy check
- [ ] Final source documentation
- [ ] Production deploy to Cloudflare Pages
