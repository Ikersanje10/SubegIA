# SubegIA - Project goals and roadmap

Last updated: 2026-10-31

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

| Increment | Status on 2026-10-31 | Remaining work |
|---|---|---|
| 1 - Map foundation | Angular/Cesium map and drawing code exist; backend validates Gipuzkoa coverage and generates clipped source-grid cells | Finish the map journey, selection-to-backend connection and remaining interaction/accessibility requirements |
| 2 - Environmental inputs | AROME HD historical integration and hourly-to-daily preparation implemented; backend-owned experimental 365-day reconstruction approved | Reusable weather/state storage, seasonal/local initialization research, quotas and broader coverage checks |
| 3 - Explainable assessment | Reference-checked domain FWI and per-cell GeoJSON/FWI response implemented; frontend sends only the area | Exercise the live HTTP flow; connect real heatmap/panel, experimental metadata, dates and unavailable states; complete explanations and official guidance |
| 4 - First public demo | Pending | Verify EUR 0 hosting/service eligibility, HTTPS, privacy and outage/quota behavior |
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
flows have been checked; a successful live Postman assessment request has not
yet been demonstrated. Local fire-danger accuracy is not established.

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
| 1 - Real request verification | Pending | A Postman request containing only a valid area returns dated experimental FWI/GeoJSON results; missing-data and input errors remain explicit |
| 2 - Angular assessment integration | Pending | Send only the selected area; handle loading/errors and render actual GeoJSON/FWI results; align the endpoint contract |
| 3 - Heatmap and details | Pending | Category colors/legend, cell selection, FWI/date/source details, experimental notice and distinct unavailable states |
| 4 - Reusable weather and daily states | Pending | Cache by model/source cell/date and persist versioned states/provenance; avoid annual downloads per polygon and duplicate concurrent requests |
| 5 - API resource protection | Pending, required before public exposure | Configure rate limiting with 429 responses, concurrency and upstream quota protection, request/geometry complexity validation and production CORS; preserve timeouts and explicit errors |
| 6 - Completion and evaluation of the MVP | In progress / pending | Finish ES/EU/EN, accessibility, official guidance, performance/privacy and broader weather tests; retain experimental initialization until better justified |
| 7 - Public deployment | Pending | Feasible EUR 0 HTTPS hosting, verified service eligibility/quotas, production settings and outage behavior |

Rate limiting and concurrency protection are required before public exposure,
not something to postpone until after release. No numeric limits or selection
size cap have been approved; derive resource budgets from measurements and
provider quotas, and request a decision before introducing user-facing caps.
Caching does not replace these protections. Core exploration remains anonymous;
login/JWT is not a confirmed MVP requirement.

Keep one main implementation task in progress, with clear outcome, dependencies,
and completion evidence. Full translations, deployment and a completed Figma
design have not been established by this checkpoint.

## 11. Continuing in another session

Read this file first, then [TECHNICAL_REQUIREMENTS.md](TECHNICAL_REQUIREMENTS.md).

- Preserve the learning-demo priority; do not require operational-grade research before every working slice.
- Use the latest confirmed choices and distinguish plans from implemented features.
- Update this file for goals, product scope, UX direction, or roadmap changes.
- Update the technical document for libraries, architecture, data/calculation methods, constraints, and technical findings.
- Keep credentials out of documentation and chat.
