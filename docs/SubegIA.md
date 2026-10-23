# SubegIA - Project goals and roadmap

Last updated: 2026-10-22

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

| Increment | Goal | Completion evidence |
|---|---|---|
| 1 - Map foundation | Explore Gipuzkoa's 3D terrain, search locations, and draw/edit an area | Usable navigation and geographically correct selection |
| 2 - Environmental inputs | Obtain the weather inputs needed for FWI across the selected area | Units, sources, dates, spatial coverage, and missing/stale states are explicit |
| 3 - Explainable assessment | Show subarea FWI heatmap, details, and prevention guidance | Reproducible calculations, labeled categories, honest spatial support, and attributed guidance |
| 4 - First public demo | Publish the MVP through HTTPS | Feasible EUR 0 deployment with clear outage/quota behavior |
| 5 - Agent chat | Query data and supported map actions conversationally | Validated tool inputs, bounded usage, and source-backed responses |
| 6 - First service extraction | Run a justified backend module independently | Independent contract, ownership, deployment, and failure behavior |
| 7 - Propagation scenarios | Explore hypothetical spread over time | A separately specified model, sufficient inputs, and evaluation appropriate to any claims |

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

Completed preparation includes the product brief, initial audience and scope decisions, interaction requirements, authenticated AEMET/Open-Meteo sample requests, and a Cesium-based visual reference. This does not mean the full preparation milestones or application are complete.

The user plans to personalize the design in Figma next. No native Figma file has been created by the agent. The Angular application, Spring Boot application, real FWI calculation, full translations, and deployment are not implemented.

Next work:

1. Personalize the Figma layout and core screen states using the Cesium preview as reference.
2. Define only the technical choices needed for the first working frontend/backend slice.
3. Set up the applications and implement terrain navigation and polygon selection.
4. Add a reference-checked calculation and weather integration, then the heatmap and panel.
5. Complete remaining accessibility, privacy, performance, and deployment details incrementally.

Keep one main implementation task in progress, with clear outcome, dependencies, and completion evidence. Use a repository, issues/project board, and Figma as appropriate; no repository or pull-request workflow exists in the current folder yet.

## 11. Continuing in another session

Read this file first, then [TECHNICAL_REQUIREMENTS.md](TECHNICAL_REQUIREMENTS.md).

- Preserve the learning-demo priority; do not require operational-grade research before every working slice.
- Use the latest confirmed choices and distinguish plans from implemented features.
- Update this file for goals, product scope, UX direction, or roadmap changes.
- Update the technical document for libraries, architecture, data/calculation methods, constraints, and technical findings.
- Keep credentials out of documentation and chat.
