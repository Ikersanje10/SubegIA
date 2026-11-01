# SubegIA - Project goals and roadmap

Last updated: 2026-11-01

## 1. Purpose

SubegIA is a learning and portfolio project that explores fire-weather danger on an interactive 3D terrain map of Gipuzkoa. The user intends to share it publicly, potentially on LinkedIn, as a demonstration of software engineering skills, not as a dependable land-management or emergency tool.

The goal is to build working features incrementally while learning frontend development, geospatial visualization, internationalization, backend integration, and later microservices and AI-assisted interaction.

This document describes the product's purpose, audience, scope, experience, and roadmap. [TECHNICAL_REQUIREMENTS.md](TECHNICAL_REQUIREMENTS.md) owns the technology choices, libraries, detailed acceptance criteria, architecture, data research, and implementation notes.

## 2. Audience and problem

The intended audience is non-specialist owners or managers of agricultural and rural plots in Gipuzkoa, including people with land for planting who have little experience interpreting wildfire-danger information.

The product explores how to help them understand fire-weather conditions affecting their area and find general prevention guidance from official sources. This audience/problem definition is a product assumption supplied by the user, not a claim of completed user research.

SubegIA does not assess crop suitability, certify land as safe, or provide personalized planting, vegetation-clearing, or burning instructions.

## 3. Product brief

Users draw an area on a 3D terrain map, inspect subareas colored by the Canadian Fire Weather Index (FWI), and read understandable explanations and attributed prevention guidance.

The experience should make its sources, assessment dates, missing data, and limitations visible. FWI is an index, not an ignition probability, and the application is not an official warning system or permission to carry out an activity.

## 4. Confirmed MVP

| Area | Product decision |
|---|---|
| Coverage | Gipuzkoa |
| Devices | Desktop first; mobile support deferred |
| Access | Core exploration without login |
| Languages | Spanish, Basque, and English |
| Main view | Actual 3D terrain showing mountains and valleys |
| Selection | One polygon drawn by placing corners; undo/cancel, move corners, or clear/redraw |
| Geographic boundary | The complete selection stays inside Gipuzkoa, with clear rejection messages rather than silent clipping |
| Assessment | Latest available daily FWI, with its actual date and data status |
| Spatial results | A heatmap of subareas supported by the input data, not one score for the whole polygon |
| Details | Side panel with selected-subarea FWI/category, explanation, date, source, spatial support, and general prevention guidance |
| Partial data | Show available results and distinctly mark unavailable subareas |
| Location | Optional user-initiated device location; land selections are temporary |
| Accessibility | Keyboard area-entry/editing and text results alongside mouse/map controls |
| Budget | Strictly EUR 0, with free-service eligibility and practical capacity still to verify |

No artificial selection-size cap has been approved. This is not an unlimited-service guarantee; any proposed restriction needs evidence and an explicit scope decision.

Accounts, saved locations/scenarios, comparisons, sharing, and notifications are candidate future additions, not first-release requirements.

## 5. Agreed design direction

The Cesium terrain preview is the starting reference for the user to personalize in Figma. Its layout is approved as a direction. On 2026-10-22 the user selected the **Bosque mineral** palette: deep green surfaces and sage accents instead of navy/cyan. Typography, spacing, and final visual details remain provisional. Exact color tokens are maintained in [TECHNICAL_REQUIREMENTS.md](TECHNICAL_REQUIREMENTS.md).

- Header: SubegIA logo on the left; informational links and ES / EU / EN selection on the right. On mobile, a hamburger button opens/closes the section links; languages remain directly accessible.
- First screen: the real 3D terrain workspace, with selection tools, heatmap/legend, and a results/conditions panel alongside it. No large marketing hero before the map.
- Supporting sections: the project, how the assessment works, and limitations. The current concept places them below the map with header links.
- Results: a short experimental-use notice and a link to the fuller explanation.

Future mobile adaptation: browsing the page must not activate map gestures or prevent vertical scrolling. An explicit **Explore map** button opens a full-viewport map with a visible close action. A separate drawing mode provides undo, finish, and cancel; conditions appear in a collapsible bottom sheet. Closing returns to the page without discarding the completed selection or results. This flow is now demonstrated in the design artifact for Figma reference, not a change to the desktop-first MVP scope.

The current preview uses real terrain/imagery but fictitious assessment values. It is an experiment and design reference, not the Angular application. Artifact locations and implementation details are recorded in [TECHNICAL_REQUIREMENTS.md](TECHNICAL_REQUIREMENTS.md).

## 6. Main journey

1. Open the desktop website in Spanish, Basque, or English.
2. Find the land on the 3D terrain and draw an area inside Gipuzkoa.
3. Request the assessment and see an explicit loading state.
4. Explore the FWI heatmap and its labeled categories, including unavailable-data states.
5. Select a subarea through the map or text alternative to inspect its details.
6. Read general prevention guidance, source links, and current official restrictions.
7. Edit or clear the area and repeat.

Assessment loading (implemented 2026-11-01): the Angular map owns an assessment
signal, separate from initial map loading. The projected information panel
replaces its result/context fields with reusable CSS shimmer skeletons during
the request, keeping safety notices visible. Loading is cleared on completion,
error or component teardown; overlapping assessments are blocked. The mobile
conditions sheet opens during the request. ES/EU/EN status/error messages,
`aria-busy`, decorative skeletons and reduced-motion support are included.
The panel switches from example copy to selected-area experimental copy once
an area is submitted, and never restores the fictitious score for that area,
including after errors. The Figma block has been removed.
After submission, the example map layer and its example/heatmap controls stay
hidden, including during redraw/cancel. The FWI category legend remains visible
independently of the previous example heatmap visibility preference.
The user's previous selection is temporarily hidden while placing a new
outline; cancelling restores the same entity without deleting its geometry.
Backend subareas are now rendered with GeoJsonDataSource, preserving polygon
holes and multipolygon parts. Category colors reuse the legend; unavailable
cells use grey.
Each subarea ring also has a thin dark terrain-following polyline, including
holes and multipolygon parts, so equal-category neighbours remain distinguishable.
Loading includes asynchronous layer creation, errors remain
visible, and the original selection keeps only its outline on success.
Redrawing hides/restores both layers; a new submission clears previous results.
Full response metadata is retained for future subarea selection/panel details.
The information panel now derives the maximum available FWI/category, surface
percentages by category and with/without data, and distinct dates/models from
the response. Turf area accounts for clipped geometries, holes and multipolygons.
Category percentages use the whole returned surface as denominator; missing
data never counts as zero FWI. Empty/all-unavailable responses show no score.
Mixed available dates are explicitly flagged. Subareas can now be selected by
map click (including their borders/multipolygon parts) or a keyboard-accessible
panel selector. Selected borders are highlighted and the panel shows that
subarea's FWI/category, date, model, source coordinates, calculation days and
moisture codes when available. Clearing selection restores the summary;
drawing or submitting a new area clears detail selection.
The selected Cesium polygon now pulses in
grey-sage transparency during the request and returns to a neutral fill on
completion/error. Its outline is preserved. The render loop runs only during
loading and is cleaned up on teardown; reduced-motion uses a static fill.

## 7. Learning goals

| Learning area | Intended experience |
|---|---|
| Angular | Components, application state, backend requests, and a usable desktop interface |
| CesiumJS | Viewer lifecycle, terrain navigation, geographic selection, and data overlays |
| Internationalization | Runtime text translation using ngx-translate and separate JSON files |
| Spring Boot | A modular backend, weather-source integrations, deterministic calculations, and explicit errors |
| Microservices | Later extract one justified module and learn independent contracts, deployment, and failure handling |
| Spring AI | Later add an assistant that uses tested backend/map actions rather than generating scientific calculations |
| Delivery | Reproducible setup, reference-based checks, documentation, and a feasible free deployment |

Package names, examples, source choices, and technical constraints live in [TECHNICAL_REQUIREMENTS.md](TECHNICAL_REQUIREMENTS.md), rather than expanding this product overview.

## 8. Incremental roadmap

| Increment | Status on 2026-11-01 | Remaining work |
|---|---|---|
| 1 - Map foundation | Connected map, pointer/keyboard polygon entry and clipped source-grid cells implemented | Complete manual accessibility and deployed interaction checks |
| 2 - Environmental inputs | AROME HD historical integration and hourly-to-daily preparation implemented; backend-owned experimental 365-day reconstruction approved | Reusable weather/state storage, seasonal/local initialization research, quotas and broader coverage checks |
| 3 - Explainable assessment | Real heatmap, details, actual dates, availability, loading/retry and ES/EU/EN explanations implemented; user confirmed a live assessment | Preserve numerical regressions and verify the deployed flow; local accuracy remains unestablished |
| 4 - First public demo | Pending; hosting undecided | Select hosting, verify HTTPS/privacy, provider quotas, proxy behavior and resource budgets |
| 5 - Agent chat | Deferred | Validated backend/map actions, bounded usage and source-backed responses |
| 6 - First service extraction | Deferred | Justified service boundary, independent ownership, contract and deployment |
| 7 - Propagation scenarios | Deferred | Separately specified model, sufficient inputs and evaluation appropriate to its claims |

These increments are provisional; later ordering can change for a documented reason. Public deployment may begin earlier. There is no fixed deadline.

Start with one modular backend, not several services at once. Keep the microservices and Spring AI learning goals, but do not make them prerequisites for the first map.

## 9. Scientific and product boundaries

Use a documented FWI method and verify calculation behavior against reference examples as carefully as practical. Do not invent missing inputs or claim local accuracy that has not been established.

Operational reliability, independent historical-incident validation, and local fuel calibration are deferred research, not gates that prevent a learning prototype. Detailed map terrain does not establish parcel-scale weather precision.

The MVP excludes ignition probabilities, fire-direction predictions, propagation animation, future-date forecasts, historical-date selection, agent chat, mobile support, and personalized safety/land-management advice.

NDVI, NDMI, and soil-moisture layers remain optional research ideas, not extra standard-FWI inputs or confirmed MVP features.

Agreed notice:

> Experimental fire-weather assessment, not an official warning or a prediction that a fire will occur. Low danger does not mean safe. Follow current official restrictions and guidance.

Prepare and review this content in all three interface languages.

## 10. Current state and next work

The repository now contains Angular/Cesium and a modular Spring Boot backend.
The backend validates the selected polygon, generates clipped AROME HD cells,
requests historical model weather, prepares standard-time daily inputs and
calculates FWI separately per cell. It returns GeoJSON geometry, FWI/category,
actual date, availability and moisture states. Equations and mocked HTTP/service
flows have been checked; the user has confirmed a successful live Angular
assessment. Local fire-danger accuracy is not established.

`POST /api/v1/assessment` now requires only `area`. The user approved replacing
caller-supplied states with a backend-owned experimental reconstruction:
365 calculation days starting with FFMC/DMC/DC 85/6/15, plus the preceding
day's weather for rainfall alignment. This supersedes the earlier explicit
`initialStates` request. Responses expose `experimental`, `initialState`
and actual `calculationDays`; initial values are assumptions, not measured
local states. A longer history reduces initialization dependence but does
not establish local fire-danger accuracy. Persisted updates and seasonal
handling remain pending.

| Next step | Status | Completion outcome |
|---|---|---|
| 1 - Angular integration, heatmap and details | Implemented | Typed response, loading/error states, real subarea colors/borders, area summary and map/keyboard subarea selection |
| 2 - Frontend improvements | Implemented with bounded browser checks | Typed errors/Retry-After, translated explanations, keyboard polygon entry and modal focus/background handling; full manual accessibility remains unproven |
| 3 - Backend cache | Implemented, local to one instance | Bounded successful-result cache, same-cell/date deduplication and one-minute deferred-result cache; persisted daily states remain later work |
| 4 - API resource protection | Rate limiting and configurable CORS implemented; global budgets deferred | Derive concurrency/upstream/geometry budgets from the selected server and provider quotas; user-facing numeric caps need approval |
| 5 - Public deployment | API/CORS configurable; hosting undecided | Choose hosting, configure real origins and trusted proxies, verify HTTPS/quotas and the complete deployed flow |

The dated notes below record the progression of the review; the current table
and final stabilization note supersede earlier pending items.

Mini frontend review (2026-11-01, source review, not a visual or AXE audit):
obsolete prototype statements remain in public translations; the service API URL
is hardcoded to localhost; legend categories are tooltip-only visually; risk
badges always use warning styling; long safety copy and 11px text need a readability
pass. Improve retry without redrawing and distinguish empty/malformed responses.
Validate runtime response shape before calculating/rendering, because HttpClient
generics do not validate JSON. Test layout, keyboard focus and reduced-motion on
actual browsers before claiming accessibility compliance. Closing the expanded
map now resizes and zooms to the whole selection, or the example if none exists.

High-priority follow-up implemented: initial example and project status copy
now distinguish fictitious examples from connected experimental assessments.
The how-it-works section explains FWI inputs, daily codes, 365-day assumptions,
model spatial support and limitations in ES/EU/EN. Runtime JSON validation rejects
malformed cells, geometries, dates and duplicates before rendering; failures use
the explicit assessment error path. Errors/empty responses can be retried with
the original polygon. The legend now has visible category names, EFFIS thresholds
and a separate no-data swatch for real results. Browser/AXE review, production URL,
further readability refinements, cache and endpoint protection remain pending.

Remaining source-level frontend refinements implemented: larger panel body,
notice and badge typography with increased line-height; wrapped readings/buttons
for narrow layouts; category badges use the FWI palette with dark tinted surfaces
and light text. The shorter experimental notice links to the full explanation.
Map action buttons and language buttons have 44px minimum height, visible focus
styles and explicit disabled styling where appropriate. Selected language text
uses dark-on-accent contrast; the rejected language hover has not been restored.
Actual-browser visual/AXE checks and keyboard polygon entry remain unresolved;
these source changes do not establish full WCAG compliance. Deployment settings,
cache and endpoint protection were not changed.

Manual per-cell cache integration (2026-11-01): FireRiskService retrieves typed
WeatherCacheableData by source center and calculation-version key. Only values
whose actual weather date matches the target date are reused; missing/stale
cells form the weather request, and results retain original order/current
clipped geometries. Successful calculations replace the existing key; unavailable
results are not cached. Caffeine is now configured with the user-approved
maximum of 2,000 entries and expiration 48 hours after writing. Reads do not
extend expiration, and date validity is still checked before reuse. Refresh
remains demand-driven, not a scheduled daily download. A short retry delay for
incomplete current-day data remains a separate possible improvement.

Concurrent deduplication now uses shared futures per source cell/calculation
version/target date. A short registry monitor atomically assigns ownership;
network calls, calculations and waits occur outside it. Each request calculates
its owned batch before waiting for other owners, avoiding cyclic batch waits.
Successful, unavailable and exceptional outcomes reach all waiters; owned
registrations are removed in finally, and interrupted waits restore interrupt
status. Geometry remains request-specific and a late older-date calculation
cannot replace a newer cached date. This coordinates one backend instance only;
it does not limit concurrency for different cells or replace rate limiting.

Local rate limiting now protects only POST /api/v1/assessment: Bucket4j keeps
five tokens per IP and refills all five together every minute using interval refill.
Caffeine stores up to 100,000 buckets, expiring after ten minutes without access.
Capacity eviction and application restarts can reset a client's quota; replicas
do not share buckets. CORS runs before rate limiting, defaults to localhost:4200,
accepts explicitly configured origins through CORS_ALLOWED_ORIGINS,
and exposes Retry-After and X-Rate-Limit-Remaining. Rejections return HTTP 429
using ApiErrorResponse with code RATE_LIMIT_EXCEEDED; preflight requests do not
consume tokens. Deployment still needs a production origin and trusted-proxy
configuration for client IP identification.

Concurrency and upstream quota protection are still required before public
exposure. No selection size cap has been approved; derive remaining resource
budgets from measurements and provider quotas, and request a decision before
introducing further user-facing caps.
Caching does not replace these protections. Core exploration remains anonymous;
login/JWT is not a confirmed MVP requirement.

Non-hosting stabilization completed (2026-11-01): missing-data and yesterday
fallback outcomes are reused for at most one minute, without extending the
deadline on reads; network failures remain immediately retryable. Successful
target-date results still take precedence. Deterministic clock-based tests
cover retry expiry, fallback freshness and current-request geometry.

The keyboard editor atomically validates/replaces the draft. Header/language
names, document language, heading order and attribution contrast were corrected.
Expanded-map focus wraps in both directions; other page sections become inert.
Escape closes conditions first, then cancels drawing, then closes the workspace.
Live-browser checks of the initial ES/EU/EN page and expanded/drawing states
detected no AXE violations. This is not full WCAG certification: incomplete
contrast checks, manual screen-reader coverage and broader layouts remain.
CI also checks header/editor semantics; contrast needs a real browser.

Backend verification, frontend tests/config validation and production compilation
pass. CSS warning budgets for map/panel and Cesium optimization warnings remain.
Hosting, global resource/proxy configuration, deployed acceptance checks and a
completed Figma design are not established. No concurrency or polygon-size
policy was introduced while the hosting decision is deferred. Docker files,
hosting-measurement scripts/results and the hosting-only health endpoint were
removed at the user's request; functional tests and CI remain.

## 11. Continuing in another session

Read this file first, then [TECHNICAL_REQUIREMENTS.md](TECHNICAL_REQUIREMENTS.md).

- Preserve the learning-demo priority; do not require operational-grade research before every working slice.
- Use the latest confirmed choices and distinguish plans from implemented features.
- Update this file for goals, product scope, UX direction, or roadmap changes.
- Update the technical document for libraries, architecture, data/calculation methods, constraints, and technical findings.
- Keep credentials out of documentation and chat.
