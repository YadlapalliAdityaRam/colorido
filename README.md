# COLORIDO 2K26

Website for the COLORIDO 2K26 sports and cultural festival at R.V.R. & J.C. College of Engineering. The project contains a Vite/React frontend and an Express/MongoDB API.

## Local development

1. Install Node.js and MongoDB, then copy `.env.example` to `.env`.
2. Set `MONGODB_URI` and replace `ADMIN_PASSWORD` with a unique secret. Never commit `.env`.
3. Install dependencies with `npm ci`.
4. Start the API with `npm run server` and the frontend with `npm run dev` in separate terminals.
5. Open the Vite URL printed by the dev server. Vite proxies `/api` requests to `VITE_API_PROXY_TARGET` (default `http://localhost:5000`).

The frontend defaults to the same-origin `/api` path. For a separately hosted API, set `VITE_API_BASE_URL` to its full `/api` URL and allow the frontend origin in the API server's comma-separated `CORS_ORIGINS` setting.

## Production build

- Run `npm ci` and `npm run build`; TypeScript checks run before the Vite production bundle is emitted to `dist/`.
- Provide `MONGODB_URI`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `PORT`, and (for cross-origin frontends) `CORS_ORIGINS` through the hosting provider's secret/environment settings.
- Set `VITE_API_BASE_URL` at build time. Use `/api` when the deployed frontend and API share an origin; otherwise use the deployed API base URL.
- Deploy the Express API and frontend hosting/reverse-proxy configuration separately as required by your hosting platform. Do not expose `.env`, database credentials, or personal documents in the public asset directory.

## Checks

- `npm run build` — production TypeScript and frontend build.
- `npm run lint` — Oxlint static checks.
