# BD-Map — বাংলাদেশের ইন্টারেক্টিভ মানচিত্র

**An interactive, bilingual (বাংলা / English) map of Bangladesh — by Tashrif Alam.**

© 2026 Tashrif Alam · Licensed under [CC BY-NC-SA 4.0](LICENSE) (non-commercial)

BD-Map lets you explore Bangladesh from its 8 divisions and 64 districts down to upazilas, thanas, unions and the 300 parliamentary constituencies. It is built for learning and knowledge: for students, researchers, journalists and anyone curious about the country.

## Features (current)

- All 8 divisions and 64 districts with real boundaries
- Bangla and English names, Bangla digits, language switcher with flags
- Light and dark mode (follows your system on first visit)
- Search in Bangla or English
- Click any division or district for details; breadcrumb navigation
- Layer panel, mobile-friendly drawer and bottom sheet
- 100% static, hosted free on Cloudflare Pages

Coming next: upazilas, thanas, unions (Phase 4) and parliamentary constituencies (Phase 5). See [TODO.md](TODO.md).

## Run locally

Requires Node.js 20.19+ (22 recommended).

```bash
npm install
npm run dev        # http://localhost:5173
```

Other scripts:

| Command | What it does |
|---|---|
| `npm run build` | Validates the data, then builds the site into `dist/` |
| `npm run preview` | Serves the production build locally |
| `npm run validate` | Checks counts, parent links, owner credit and file sizes in `public/data/` |
| `npm run data:fetch` | Downloads raw boundary files into `data/raw/` |
| `npm run data:build` | Rebuilds `public/data/` from `data/raw/` and `data/names/` |

## Deploy (Cloudflare Pages, free)

Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git** → choose this repo.

- Framework preset: **Vite**
- Build command: `npm run build`
- Build output directory: `dist`
- Environment variable: `NODE_VERSION=22`

## Project layout

```
data/names/        curated official English + Bangla names (project content)
data/raw/          downloaded third-party boundaries (git-ignored)
public/data/       published data used by the site (+ boundaries/)
scripts/           fetch, build and validate the data
src/components/    React components (map, panels, search, switchers)
src/context/       language and theme state
src/i18n/          UI text in Bangla and English
```

The full specification and project rules are in [PROJECT.md](PROJECT.md).

## Data sources

Boundary data comes from third parties and keeps its own license — see [DATA_SOURCES.md](DATA_SOURCES.md). It is credited on the map and in every data file.

## How to credit

If you use anything from this project (non-commercially), please credit:

> Data/visualization from **BD-Map** by **Tashrif Alam** — https://github.com/Tashrif-ui/BD_Map

## License

Code, curated data and design: **CC BY-NC-SA 4.0**, © 2026 Tashrif Alam — attribution required, **no commercial use**, share-alike. See [LICENSE](LICENSE).
Third-party data keeps its original license ([DATA_SOURCES.md](DATA_SOURCES.md)).
