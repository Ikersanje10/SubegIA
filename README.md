# SubegIA

Experimental daily Canadian Fire Weather Index (FWI) for user-selected areas
inside Gipuzkoa. Angular 22/Cesium displays the results from Spring Boot/Java 25.
This is a learning demo, not an official warning system or locally validated
fire-risk forecast.

## Local development

Requirements: Java 25, Maven, Node.js 24 and npm. Run commands from the repository
root unless specified otherwise.

1. Set `CESIUM_ION_TOKEN` in the root `.env` file or your environment. This is a
   browser-visible Cesium token; restrict it to the necessary assets and origins
   in Cesium ion. Never use a privileged/server token.
2. Run `mvn -f backend\SubegIA\pom.xml spring-boot:run`.
3. In another terminal, run `npm ci` and `npm start` from `frontend`.
4. Open `http://localhost:4200`. The default backend is `http://localhost:8080`.

The config script generates ignored Angular environment files. `API_BASE_URL`
overrides the backend origin; do not edit generated files manually.

## Assessment behavior

Draw the polygon on the map or open the keyboard coordinate editor. Enter one
`longitude, latitude` pair per line using decimal dots, with at least three
corners. Do not repeat the first corner at the end. Applying coordinates replaces
the draft only if the complete polygon is valid; **Finish** requests assessment.

Successful per-cell FWI results are cached locally for up to 48 hours, but are
reused only for the requested actual date. Simultaneous requests for the same
source cell/date share one calculation. Missing weather or yesterday's fallback
is reused for at most one minute before another upstream attempt; network errors
are not cached. These caches and the rate limit belong to one backend instance.

Only `POST /api/v1/assessment` consumes the five-token-per-IP bucket. Five tokens
refill together once per minute, rather than one every twelve seconds. HTTP 429
returns a structured API error and `Retry-After`; the UI respects that wait.

## API configuration

Hosting has not been selected. Concurrency, upstream quota budgets and
trusted-proxy settings must be finalized for the actual server before public exposure.

- `API_BASE_URL`: frontend backend origin, not the assessment endpoint.
- `CORS_ALLOWED_ORIGINS`: explicitly allowed frontend origins, comma-separated.
  Defaults to `http://localhost:4200`.
- `PORT`: backend port; defaults to 8080.
- `CESIUM_ION_TOKEN`: restricted browser-visible token, never a server secret.

Before exposing the deployment publicly, verify client-IP handling through the
hosting proxy. `getRemoteAddr()` is used by default: do not blindly trust a
client-supplied `X-Forwarded-For`. Confirm which proxies sanitize/append forwarding
headers and configure trusted proxies accordingly.

Production builds fail explicitly if the API origin/token is missing or the
API points to HTTP/localhost. The generated frontend configuration is public:
never place secrets in it. No deployment or hosting-test tooling is included.

## Checks

- Backend: `mvn -f backend\SubegIA\pom.xml verify`.
- Frontend, from `frontend`: `npm run config`, then `npm test -- --watch=false`.
- Configuration validation, from `frontend`: `npm run test:config`.
- Production build, with deployment variables configured: `npm run build`.

CI runs backend checks, frontend tests and a production compilation on pushes
and pull requests. It does not deploy or require a real Cesium token.

AXE semantic regression checks cover the header and coordinate editor. The
test DOM cannot measure contrast, so contrast is checked separately in the real
browser. Browser checks of the initial page in ES/EU/EN and expanded/drawing
states detected no AXE violations; incomplete checks and manual screen-reader
coverage mean this is not a claim of full WCAG conformance. Expanded-map focus
is contained, background sections become inert and Escape cancels drawing before
closing the map.

Production compilation still reports CSS warning-budget overruns for the map
and information panel, and Cesium dependency optimization warnings. Error budgets
remain unchanged; these warnings are not hidden or a guarantee of deployed performance.