# Elsa Instance Viewer (React Flow)

Dynamic-first visualization for a single workflow instance. This is a demo client
that calls the Elsa API directly using an admin API key.

## Setup
1. Copy `.env.example` to `.env` and set `VITE_ELSA_API_KEY`.
2. Install dependencies: `npm install`
3. Run dev server: `npm run dev`

## Environment
- `VITE_ELSA_BASE_URL` default: `http://localhost:14000/elsa/api`
- `VITE_ELSA_API_KEY_HEADER` default: `X-Api-Key`
- `VITE_ELSA_API_KEY` admin key value

If requests return `401`, check the `WWW-Authenticate` header and adjust
`VITE_ELSA_API_KEY_HEADER` to match the `KeyName`.

Default admin API key for this repo is configured in `src/LegacyHost/appsettings.json`
as `dev-admin-api-key`. Update that value if you need a different key.

## Usage
- Enter a workflow instance ID and click "Load Instance".
- Click nodes or timeline entries to inspect details.

## Notes
- Edges are heuristic and may be inaccurate for parallel/loop flows.
- Phase 2 will add static workflow graph overlay.
