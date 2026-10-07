# Fissol

A real-time earthquake visualizer.

- **Live demo:** <https://fissol.abraham.lat>
- **Source:** <https://github.com/AbrahamX3/fissol>

Fissol plots recent seismic activity from the
[USGS Earthquake API](https://earthquake.usgs.gov/earthquakes/feed/v1.0/) on an
interactive [MapLibre GL](https://maplibre.org/) map, with filtering, searching,
sorting, and a "near me" view.

## Features

- **Live feeds** — hour, day, week, and month summaries, plus USGS "significant"
  feeds.
- **Interactive map** — clustered markers sized and colored by magnitude, with
  age-based fading and optional reach rings showing an event's estimated impact
  radius.
- **Filter, search, and sort** — sort by newest, oldest, largest, smallest,
  nearest, or furthest; search the list; switch between all, significant, and
  near-me views.
- **Near me** — uses the browser Geolocation API to query events within a radius
  of the visitor.
- **Responsive layout** — a resizable list panel on desktop and a bottom drawer
  on mobile.
- **Installable PWA** — web app manifest and icons, with dark and light themes.
- **Dark mode** — powered by `next-themes`.

## Tech stack

- [Next.js](https://nextjs.org/) 16 (App Router, typed routes, React Compiler)
- [React](https://react.dev/) 19
- [TypeScript](https://www.typescriptlang.org/) (strict)
- [Tailwind CSS](https://tailwindcss.com/) v4
- [shadcn/ui](https://ui.shadcn.com/) primitives (radix-lyra style)
- [MapLibre GL](https://maplibre.org/) v6, via the [mapcn](https://mapcn.dev)
  map components
- [TanStack Query](https://tanstack.com/query) for data fetching and caching
- [Zod](https://zod.dev/) for validating the USGS GeoJSON responses
- [Oxlint](https://oxc.rs/) and Oxfmt for linting and formatting

## Getting started

Requires Node.js 24.x and pnpm 12.x.

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

No environment variables are required; the app talks to the public USGS API.

## Scripts

- `pnpm dev` — start the development server (copies MapLibre's worker first)
- `pnpm build` — create a production build
- `pnpm start` — serve the production build
- `pnpm lint` — run Oxlint
- `pnpm format` — format with Oxfmt
- `pnpm typecheck` — type-check with `tsc --noEmit`
- `pnpm check` — run lint, typecheck, and format together

`predev` and `prebuild` run `scripts/copy-maplibre-worker.mjs`, which copies
MapLibre GL's worker and shared chunk into `public/maplibre/` so the worker is
served same-origin.

`scripts/generate-pwa-icons.mjs` regenerates the PWA and Apple touch icons from
`public/fissol-white.png` (run manually: `node scripts/generate-pwa-icons.mjs`).

## Project structure

```
fissol/
├── public/            # logos, PWA icons, and the copied MapLibre worker
├── scripts/           # copy-maplibre-worker.mjs
├── src/
│   ├── app/           # App Router: layout, page, and web manifest
│   ├── components/    # feature components + shadcn/ui primitives (ui/)
│   ├── hooks/         # use-mobile
│   ├── lib/           # USGS client + query options, geo helpers, utils
│   └── styles/        # Tailwind v4 globals
├── components.json    # shadcn/ui configuration
├── next.config.ts
└── tsconfig.json
```

## Data

Earthquake data comes from the USGS:

- Summary feeds — `earthquake.usgs.gov/earthquakes/feed/v1.0/summary/`
- Event query (near me, custom radius) —
  `earthquake.usgs.gov/fdsnws/event/1/query`

Responses are validated with Zod before use, and data is cached and deduplicated
by TanStack Query. All data is courtesy of the U.S. Geological Survey.
