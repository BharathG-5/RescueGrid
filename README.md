# RescueGrid

RescueGrid is an offline-first disaster-response coordination dashboard. The
React frontend stores reports and drafts in browser IndexedDB, supports offline
reporting, and includes GPS/location and OpenStreetMap features. A separate
FastAPI backend exposes incident, resource, sync, and dashboard endpoints.

Deploying the frontend to Vercel does **not** deploy or connect the FastAPI
backend. The current frontend uses local browser storage and demo data; configure
and deploy the backend separately if a hosted API is needed.

## Requirements

- Node.js 20.19+ or 22.12+
- Python 3.10+

## Frontend setup and local running

```powershell
cd frontend
npm ci
npm run dev
```

Open the local URL printed by Vite. The frontend works with its local IndexedDB
store and does not require the backend to run. Browser location access requires
a secure context (HTTPS or localhost). OpenStreetMap tiles require an internet
connection; report data remains available offline.

Optional map tile configuration can be copied from `frontend/.env.example` to a
local `frontend/.env.local` and changed as needed. Never put real credentials or
private values in an environment file that will be committed. Vite variables
prefixed with `VITE_` are embedded in the public frontend bundle and must not
contain secrets.

## Backend setup and local running

Run these commands in a separate PowerShell terminal:

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
uvicorn app.main:app --reload
```

The API is available at `http://127.0.0.1:8000`; interactive API documentation
is at `http://127.0.0.1:8000/docs`. The current backend uses a local SQLite
database at `backend/rescuegrid.db`; it is local data and must not be published.
The backend currently allows requests from any CORS origin. Before exposing it
in production, restrict CORS to the deployed frontend origin and choose a
production database with persistent storage.

## Tests and build

From `frontend`:

```powershell
npm test
npm run build
npm run lint
```

From `backend` (with its virtual environment activated):

```powershell
python -m pytest
```

The Vite production build writes static files to `frontend/dist`.

## Deploy the frontend to Vercel

1. Publish this repository to GitHub only after reviewing the staged files and
   confirming that no environment files, credentials, virtual environments,
   dependency folders, local databases, or other private data are included.
2. In Vercel, import the GitHub repository and set the **Root Directory** to
   `frontend`.
3. Use the Vite build command `npm run build` and output directory `dist`.
   Vercel normally detects these settings automatically.
4. No API secret or backend URL is currently required by the frontend. If the
   frontend is later connected to a hosted backend, configure only public
   non-secret URLs as Vite environment variables, and deploy/secure the backend
   independently.

`frontend/vercel.json` rewrites application routes to the SPA entry point so
direct navigation and refreshes on React Router routes continue to work. The
existing PWA service worker, offline reporting, IndexedDB storage, GPS, and map
features remain part of the frontend deployment.

## Safe GitHub publishing checklist

From the project root, inspect before staging:

```powershell
git status --short --ignored
git check-ignore -v backend/.venv backend/rescuegrid.db frontend/node_modules frontend/.env.local
```

After confirming the ignore results and reviewing the candidate files, stage
and inspect them before creating any commit:

```powershell
git add .
git status --short
git diff --cached --stat
git diff --cached
```

Do not push until the staged diff has been reviewed for secrets and local data.
For an existing repository, check `git status` and the tracked-file list first:
ignore rules do not remove files that are already tracked. If a secret has ever
been committed, rotate it; removing it from the latest commit alone does not
erase it from Git history.
