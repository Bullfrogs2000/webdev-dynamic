## Quick orientation (what this project is)

- Small ES-module Express app that serves static assets from `public/` and a set of HTML templates in `templates/`.
- The server entry point is `dynamic_server.mjs`. It listens on port 8080 and serves `templates/index.html` at `/`.
- Data artifacts in the repo: `alcohol.sqlite3` (SQLite DB) and `drinks.csv`. `dynamic_server.mjs` opens the DB read-only but does not run queries in the file — search elsewhere before adding DB logic.

## How to run (developer workflow)

1. Install dependencies:

```powershell
npm install
```

2. Start the server (ES module file):

```powershell
node dynamic_server.mjs
```

3. Open http://localhost:8080 in a browser. The server uses port 8080 by default (see `dynamic_server.mjs`).

Notes: `package.json` currently has dependencies but no `scripts` section. Use `node dynamic_server.mjs` directly.

## Architecture & important files

- `dynamic_server.mjs` — main server. Key behavior:
  - Uses native Node ES module imports (fs, path, url).
  - Sets `public/` as the static root: `app.use(express.static(root))`.
  - Serves `templates/index.html` for GET `/`.
  - Opens `alcohol.sqlite3` as a read-only DB at startup.

- `public/` — static assets (CSS under `public/css`, JS under `public/js/vendor`).
- `templates/` — raw HTML templates that contain literal placeholder tokens like `$$$DRINKS_LIST$$$`, `$$$BEER_TABLE$$$`, `$$$DRINK_TYPE$$$`.
  - Example: `templates/drinks.html` contains `$$$DRINKS_LIST$$$`.

## Project-specific conventions and patterns

- Templates use plain token markers `$$$NAME$$$` (three-dollar signs). These are not processed by `dynamic_server.mjs` — treat them as requiring an external preprocessing step or static generation. Before implementing server-side template replacement, search the repo for an existing generator or build step.
- Files in `public/js/vendor` are used for client-side interactivity. `package.json` includes `chart.js` as a dependency (client-side charts may be expected). Verify whether charts are loaded via package, CDN, or local builds.
- Code style: ES modules (import ... from). Keep new server code consistent with that style.

## Integration points / external dependencies

- SQLite database: `./alcohol.sqlite3`. Opened in `dynamic_server.mjs`. If you add DB queries, use the existing sqlite3 dependency and maintain the read-only flag unless writes are intended.
- CSV source: `drinks.csv` is present — it may be used to generate HTML or populate the DB. If implementing import scripts, document the flow and side effects.
- Client libraries: jQuery and Foundation are present in `public/js/vendor`. Chart.js is in `package.json` — check for client-side usage before removing/adding.

## Small gotchas / discoverable issues to watch for

- `templates/*.html` link tags currently include two `href` attributes in `index.html` and `beer.html`/`wine.html`/`spirits.html` (e.g. `<link rel="stylesheet" href="/css/style.css" href="/css/foundation.css">`). Fix to use two separate `<link>` tags or combine correctly.
- There are no npm `scripts` defined; CI or developer commands may expect `npm start` — if you add scripts, keep them simple and document them here.
- `dynamic_server.mjs` opens the DB but doesn't run queries — double-check whether template/token replacement happens as a separate step in course materials.

## How an AI assistant should contribute (concrete guidance)

- When modifying server behavior, preserve ES module syntax and the `public` static root.
- If you implement template token replacement, add a small README note and/or a new script (e.g., `scripts/generate.js`) and a corresponding `npm` script so maintainers can reproduce builds.
- For data work: prefer creating a separate script that reads `drinks.csv` and populates `alcohol.sqlite3` (do not modify the existing DB file in-place without a migration backup).
- Tests and linting: this repository currently has no test framework configured. If you add tests, include an `npm test` script and minimal instructions here.

## Quick references (files to inspect for context)

- `dynamic_server.mjs` — server entry
- `package.json` — dependencies
- `public/` — static assets (css/js/images)
- `templates/*.html` — HTML templates with tokens (examples: `templates/drinks.html`, `templates/beer.html`)
- `alcohol.sqlite3`, `drinks.csv` — data sources

If any of the above assumptions are incorrect or if there's a build step you use locally, tell me and I will merge that detail into this file.

---
Please tell me if you want these instructions expanded (examples of token replacement, suggested npm scripts, or a small template generator script to add). 
