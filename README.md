# GridBricks wind intelligence

Working React dashboard and FastAPI backend for the REint challenge. Docker and Vercel deployment are implemented and verified. Live application: https://gridbricks-project.vercel.app

## Start (Python 3.12)

Run commands from the project root:

```powershell
python -m venv .venv
.\.venv\Scripts\python -m pip install -r backend/requirements-dev.txt
.\.venv\Scripts\python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```

Interactive API documentation: http://127.0.0.1:8000/docs

Existing verified snapshots are included. To fetch a new snapshot:

```powershell
.\.venv\Scripts\python -m scripts.ingest
.\.venv\Scripts\python -m pytest -q
```

Restart the API after ingestion. It loads and verifies data once at startup, never fetches Elexon on a visitor request, and returns 503 if no valid snapshot can be loaded. Refreshes use versioned snapshots and an atomic pointer so a failed ingestion cannot replace good data. Retained snapshots are intentionally not deleted automatically. Configure environment variables listed in `.env.example` in your shell; this file is a template, not automatically loaded.

## Endpoints

| GET route | Parameters |
| --- | --- |
| `/health` | None; readiness 200 or 503 |
| `/api/metadata` | Dates, default-cutoff coverage, sources, assumptions |
| `/api/decision` | `decision_date=2026-01-10&cutoff=09:00` |
| `/api/comparison` | `delivery_date=2026-01-11&cutoff=09:00` |
| `/api/accuracy` | `start_date=2026-01-02&end_date=2026-02-01&cutoff=09:00` |

Cutoffs are Europe/London; response timestamps are aware UTC. The 09:00 default is a demonstration choice, not an official deadline. Date ranges for accuracy are **delivery dates**. January decisions therefore cover 2 January–1 February. Invalid dates/times return 422. Successful responses can be partial or empty: inspect coverage and nullable values rather than replacing them with zero.

## Data methodology

Sources: Elexon FUELHH (WIND only) and WINDFOR. Scope is Great Britain system-operator-visible wind, not a guarantee of complete UK embedded generation. For each next-day forecast target independently, choose the latest publication at or before the same selected decision cutoff. Preserve publication times and expose mixed publications. Never substitute a later publication or an older non-null forecast when the selected publication is null.

**Accepted averaging assumption:** hourly actual = mean of the two FUELHH half-hours beginning at the forecast target and 30 minutes later. Both must exist and be non-null. WINDFOR has hourly timestamps, but its averaging period is not conclusively documented; this comparison is approximate. No half-hour forecast points are invented. Mean forecast is a mean of available forecast samples, not energy.

Error = forecast minus hourly-average actual. MAE, RMSE and bias are in MW and use valid matched hours only; positive bias is overprediction. Period metrics weight each matched hour equally, not each day's metric equally. Missing-forecast and missing-actual counts may overlap, so they must not be added to infer total missing comparisons. All accuracy is retrospective using the latest actual publication in the stored snapshot, not claimed available at the historical decision time.

To expose cancellation, each comparison also includes both raw half-hour actuals, their publication times, `within_hour_half_range_mw = abs(A1-A2)/2`, and `constant_forecast_half_hour_rmse_mw = sqrt(((F-A1)^2+(F-A2)^2)/2)`. The latter assumes a constant forecast across both halves and is a diagnostic, not verified half-hour forecast accuracy. The aggregate mean half-range uses all complete actual hours, even if forecasts are missing, with `variation_hours` as its denominator.

Missing values remain null. Exact duplicate rows are removed; conflicting records with identical target and publication keys fail validation. Actual revisions select the latest publication. Unexpected timestamp spacing, invalid settlement fields, non-finite/negative wind values and checksum failures fail validation. The validator's settlement mapping intentionally supports this winter-only scope; general DST-season ingestion requires extending it.

## Directory guide

- `backend/app/data.py`: snapshot loading, integrity checks and validation.
- `backend/app/logic.py`: cutoff selection, hourly alignment and metrics.
- `backend/app/schemas.py`: typed API responses.
- `backend/app/main.py`: FastAPI routes, readiness and CORS.
- `backend/tests/`: synthetic edge-case tests and real-snapshot integration check.
- `scripts/ingest.py`: bounded-timeout Elexon download with retry and atomic publication.
- `data/raw/`: initial snapshots, metadata and subsequent versioned refreshes.
- `docs/`: discovery evidence and forecast-semantics investigation.

The accepted hourly-averaging method supersedes the initial timestamp-matched half-hour proposal in the discovery notes. See `docs/alignment-decision.md`.

## Status and disclosure

AI assistance: OpenAI Codex assisted with research, UI concept, implementation, documentation and tests. A public comparison repository was inspected to understand its timestamp matching; it is not an official solution and its implementation was not copied into this project.

No purchasing quantity is calculated without customer demand and supply commitments. Live deployment: https://gridbricks-project.vercel.app. Demo video and final submission remain outstanding.

## React dashboard

Start the backend above, then in a second terminal:

```powershell
cd frontend
npm ci
npm run dev
```

Open http://127.0.0.1:5173. Vite proxies API calls to port 8000. For separate hosted services, set VITE_API_BASE_URL at build time and configure the backend CORS origins. Vercel serves the frontend and Python API from the same origin. Production build: `npm run build`.

- Decision view: explicit scenario submission, next-day forecast, publication times/age, coverage, interval table and CSV.
- Accuracy: period MAE/RMSE/bias, selected delivery-day comparison, daily errors, actual half-hour detail and variation explanation.
- Real snapshot data only. Requests clear old results, abort obsolete responses and time out; empty/partial/error states remain explicit.
- `frontend/src/api.ts`: typed API integration and formatting; `App.tsx`: views and controls; `Charts.tsx`: Recharts plots; `style.css`: responsive visual system.
- `PRODUCT.md`, `DESIGN.md`, `.impeccable/design.json`: product and design context.
- Font is locally bundled Manrope; icons are Lucide. No remote font dependency.

Verification: `node verify.mjs`, `node verify-states.mjs`, and `node verify-skeleton.mjs` from frontend with both servers running (requires installed Microsoft Edge; uses Playwright headless). Checks cover desktop/mobile, January boundary, day selection, interval tables, CSV, error/retry, empty/partial data, overflow and runtime errors. Test fixtures are intercepted only in the isolated test browser and never used by the application.

The production build passes with a non-blocking bundle-size warning for the chart library (approximately 185 KB compressed for the combined app script). Chart splitting is a later optimization. Impeccable's automated detector was unavailable; a separate design review checked the screenshots/source and requested small-text contrast fixes, which were applied.

## Docker (recommended)

Prerequisite: Docker Desktop running in Linux-container mode with Docker Compose. No local Python or Node installation is needed to run the application. The first build needs network access to download images and dependencies; application startup uses the bundled Elexon snapshot.

From the project root:

```powershell
docker compose up --build -d --wait
```

Open http://localhost:8080. The production React app is served by Nginx, which proxies `/api/` and `/health` to FastAPI on the private Compose network. Only the frontend port is bound, on localhost. Both application processes run as non-root users. Backend readiness checks validate that the stored snapshot loaded successfully; frontend health checks also test its backend connection.

```powershell
docker compose ps
docker compose logs --tail 100
docker compose down
```

`GRIDBRICKS_PORT` changes the host port (default 8080). `GRIDBRICKS_DEFAULT_CUTOFF` changes the demonstration cutoff (default 09:00). Compose reads a root `.env` file if provided. These containers use the same-origin proxy, so a frontend API-base URL is not needed. Host ports 5173/8000 used by development servers do not conflict with this setup.

### Refresh data using Docker

The image includes the current snapshot and requires no host data mount to run. To refresh the host snapshot without local Python, use a temporary ingestion container, then rebuild the backend:

```powershell
docker compose run --rm --no-deps --user 0 -v "${PWD}/data/raw:/app/data/raw" backend python -m scripts.ingest
docker compose up --build -d --wait
```

The one-off ingestion runs as root only to allow writes to the bind-mounted data folder; normal services run as unprivileged users. Refreshes retain previous snapshots. Do not remove snapshots referenced by `data/raw/current.json`. No data is fetched per dashboard visit.

### Container verification

Verified both services healthy, the proxied accuracy endpoint returning 744 matched hours at 09:00 across all 31 delivery days, and production frontend browser checks for date boundaries, day selection, tables, CSV, mobile overflow, runtime errors, error/retry and empty/partial data.

To repeat browser checks (developer-only; requires the installed frontend test packages and Microsoft Edge):

```powershell
cd frontend
$env:APP_BASE_URL='http://127.0.0.1:8080'
node verify.mjs
node verify-states.mjs
```

Docker files: `backend/Dockerfile`, `frontend/Dockerfile`, `frontend/nginx.conf`, `compose.yaml`, `.dockerignore`. Docker excludes local environments, node_modules, development outputs, secrets and scratch files. The frontend image contains compiled static assets, not the development server. Production build still reports the previously documented non-blocking chart bundle-size warning.

## Vercel deployment

Deploy from the repository root (not frontend/). The root vercel.json builds the React app and routes /api/*, /health, /docs and /openapi.json to the Python ASGI entry point in api/index.py. The frontend uses the same origin, so leave VITE_API_BASE_URL unset. Python 3.12 and runtime requirements are configured at the root. The validated data/raw snapshot is bundled with the function.

Run `npx vercel login`, then `npx vercel --prod` from the project root. The production build and anonymous public dashboard checks passed on 26 October 2026 at https://gridbricks-project.vercel.app. Verify /health, decision filters, monthly accuracy, CSV export, and a mobile viewport on the resulting URL.

The hosted filesystem is not used for ingestion or persistent writes. To refresh this fixed historical dataset, run ingestion locally, verify it, then redeploy the bundled snapshot. Docker remains available for local reproduction of the full application.


GitHub is connected to Vercel for automatic deployments. Pushes to main trigger production builds; check the deployment result before sharing the live URL.

Submission preparation: see `docs/requirement-check.md` and `docs/demo-script.md`.
