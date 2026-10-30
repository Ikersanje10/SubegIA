# SubegIA - Technical requirements and decisions

Last updated: 2026-10-22

## 1. Document responsibility

Read [SubegIA.md](SubegIA.md) first for the project goals, audience, MVP experience, and learning roadmap.

This document owns technical choices, libraries, functional acceptance criteria, data/calculation research, architecture, and engineering preparation. It preserves the previous reference's detailed findings and unresolved questions; it does not imply that a backend or Angular application already exists.

Keep goals and product-scope changes in the main document; add implementation choices and their evidence here. Distinguish confirmed choices, proposals, historical research, and completed experiments. Later confirmed decisions supersede earlier exploratory options.

### Technology and library registry

| Concern | Technology / package | Decision and stage |
|---|---|---|
| Frontend | Angular | Confirmed for MVP; application not scaffolded |
| Interactive 3D terrain | CesiumJS, npm package `cesium` | Confirmed for MVP; demonstrated in the standalone artifact, not integrated with Angular yet |
| Runtime text translations | `@ngx-translate/core` | Confirmed for MVP; key-based ES/EU/EN JSON dictionaries |
| Translation-file loading | `@ngx-translate/http-loader` | Confirmed companion loader; not installed |
| Backend | Spring Boot | Confirmed; one modular application initially, not scaffolded |
| Weather input API | Open-Meteo | Confirmed prototype source; no npm library or Java SDK selected; model and service eligibility still to verify |
| Later assistant | Spring AI | Preferred future runtime; model/provider dependencies not selected |
| Database, UI kit, Cesium Angular wrapper | Undecided | Do not infer a dependency requirement before the relevant working slice |

Record future library choices here with purpose, stage, and compatibility considerations. Exact Angular, Java, Spring Boot, and library versions remain to be chosen together; no dependency manifest currently exists.

## 2. Confirmed decisions

| Area | Decision |
|---|---|
| First public release / MVP | Draw an area in Gipuzkoa on the interactive 3D terrain map and calculate Canadian Fire Weather Index (FWI) results for that selection from real weather data |
| Initial geographic coverage | Gipuzkoa |
| Frontend | Angular |
| Map visualization | CesiumJS |
| Initial backend | One Spring Boot application with clearly separated modules |
| Future architecture | Extract independently deployable microservices incrementally |
| Existing work | User reports an existing Python agent; its location, data integrations, and calculation code have not been inspected |
| Future assistant runtime | User prefers a new Spring AI assistant within the Spring Boot application over reusing the Python agent; assistant remains outside the MVP |
| Access | Core exploration should work without login |
| MVP prevention guidance | General guidance from official sources, contextualized by FWI category; no personalized planting, vegetation-clearing, or burning advice |
| Future features | Agent chat and hypothetical fire-spread simulation |
| Hosting budget | Strictly EUR 0, accepting free-tier limitations and scope reductions |
| Schedule | Milestones and completion criteria, with no fixed deadline |
| Design approach | Define user flows and prepare a Figma prototype before production UI implementation |
| MVP target devices | Desktop first; mobile support deferred |
| MVP interface languages | Spanish (`es`), Basque (`eu`), and English (`en`); English added on 2026-10-21 |
| Internationalization approach | Confirmed: ngx-translate (`@ngx-translate/core` with `@ngx-translate/http-loader`) and separate key-value JSON files, rather than Angular's built-in compile-time text translation workflow |
| MVP assessment dates | Latest available daily assessment only; no user-selectable historical dates or forecasts |
| MVP browsers | Current stable desktop Chrome, Edge, and Firefox |
| MVP location privacy | Optional user-initiated device location; temporary selections, with no saved areas between visits |
| MVP accessible alternatives | Keyboard-operable polygon entry/editing and text subarea results alongside the heatmap |
| MVP weather-source direction | Use Open-Meteo for the prototype, as confirmed on 2026-10-21; retain AEMET as an optional comparison/reference source, not a required integration |

### Learning-demo priority and current next step (2026-10-21)

The user clarified that the goal is a learning/portfolio project rather than a trusted operational tool. This clarification supersedes earlier assumptions that full historical incident evaluation and locally validated scientific accuracy must precede a prototype.

Use a documented standard FWI implementation as carefully as practical, verify equation behavior against reference examples, and expose input dates, model-based provenance, initialization assumptions, and missing data. Do not intentionally alter the equations to fill data gaps, invent fine spatial variation, or label the output as an ignition probability. Independent incident validation, local fuel calibration, and operational reliability are deferred research rather than prototype gates.

Open-Meteo is now approved for the prototype. Model selection, initialization, source-resolution mapping, free-service eligibility, and local accuracy remain unverified; resolve the details needed for the next working slice rather than completing every research task first. No commercial-free-use guarantee is implied by sharing the project on LinkedIn.

Next: a lightweight desktop UX/wireframe flow, followed by incremental implementation. Existing accessibility and performance targets remain design goals, not claims of completed evaluation. This does not change the agreed modular Spring Boot start or defer the later microservices/Spring AI learning goals indefinitely.

### Confirmed page structure (2026-10-21)

The user approved the actual Cesium terrain preview as the design direction for the MVP. The Bosque mineral palette was subsequently selected on 2026-10-22; final styling remains subject to the user's Figma design. Open directly on the 3D map and its results/conditions side panel, rather than placing a large marketing hero before the map.

### Confirmed interface palette: Bosque mineral (2026-10-22)

| Token | Color | Purpose |
|---|---|---|
| Canvas | `#101713` | Page background and header |
| Panel | `#1B2620` | Results panel and content cards |
| Accent | `#B9D3A2` | Primary actions, selection outline, links, and focus |
| Primary text | `#F0F2EB` | Headings and main text |
| Secondary text | `#B9C4B7` | Supporting information |
| Divider | `#3B4D40` | Surface separators |
| Raised surface | `#25362A` | Secondary controls and active language background |
| Text on accent | `#172013` | Text on sage primary buttons |

The Cesium artifact now applies these tokens to its interface and selection outline. FWI category colors and error/warning colors keep separate semantic roles and were not recolored as interface decoration. The terrain imagery itself is unchanged. Contrast over variable terrain and full accessibility still require evaluation; palette selection is not a compliance claim.

The header contains the SubegIA logo on the left, with informational-section links and the Spanish/Basque/English language selector on the right. Include sections explaining the project, how the FWI assessment works, and why the experimental output is not a definitive or operationally validated assessment. The preview implements these as sections below the map, reachable from header links; this keeps the first screen map-first without adding separate application routes.

Limitations content should explain model uncertainty, weather-data versus terrain resolution, initialization/history, data freshness, and what FWI does not predict. Do not invent a percentage accuracy claim or imply that adding a disclaimer validates the calculation. Keep a short notice and a link to the fuller explanation beside results. All MVP sections require ES/EU/EN translations; the current artifact remains a Spanish-language design preview.

### Future mobile interaction reference

The user requested this design adaptation for the artifact and future development. Desktop remains the first-release target; a mobile prototype does not add mobile support to the MVP commitment.

Mobile header: keep the logo and language controls visible, with a sage hamburger button toggling a dropdown of the existing section links. The dropdown starts closed, overlays rather than shifts the map, and closes on a second tap, section selection, an outside click, Escape, or focus leaving the header. Use a real button with `aria-expanded`, `aria-controls`, translated open/close labels, a 44 CSS-pixel target, and visible focus. Escape restores focus to the button; section selection moves focus to its destination. Desktop links remain visible; breakpoint changes reset the dropdown. Navigation works independently of Cesium loading. Include collapsed and expanded header variants in Figma.

| State | Interaction and UI |
|---|---|
| Page browsing | The embedded map does not receive pointer/touch or keyboard interaction. Swipes over it scroll the page normally. Show an explicit **Explore map** action. |
| Map exploration | Open the same viewer in a full-viewport workspace. Enable camera gestures, lock background-page scrolling, and keep **Close map** visible. Do not recreate the viewer or discard geometry/results. |
| Drawing | Enter separately with **Draw area**. Use a near-overhead camera and distinguish corner placement from camera navigation. Show **Undo**, **Finish**, and **Cancel**, plus corner-count/instruction feedback. Cancel discards only the draft. |
| Conditions | Reuse the results panel as an explicitly expandable/collapsible bottom sheet with internally scrollable details. A collapsed sheet leaves space to navigate; selecting an example cell opens its details. |
| Return to page | Close the workspace, restore page scrolling and focus, and preserve the completed selection, camera, and result state. Resizing to desktop must also release the scroll lock. |

Provide safe-area spacing and touch targets of at least 44 CSS pixels. Keep provider credits visible. Treat the full-viewport workspace as a modal interaction: background content is inert, keyboard focus stays inside it, Escape cancels drawing first and otherwise closes the workspace. Translate instructions, actions, statuses, and accessible labels through the same ES/EU/EN JSON files. Final implementation must provide the documented keyboard geometry-entry/editing alternative; touch drawing alone is not sufficient.

The current artifact demonstrates this flow below 701 CSS pixels, including touch/click corner placement, undo/cancel, and saving a closed outline for the current page visit. Closing during drawing cancels the unfinished draft and retains an earlier completed outline. Drawing blocks camera input until finish/cancel; no corner editing, polygon-topology/Gipuzkoa validation, persistence across reloads, or assessment is implemented. A completed sketch hides the fictitious FWI result and explicitly says it has not been calculated; returning to the example restores the separate mock heatmap.

For Figma, use four mobile frames: browsing with the activation button, full-viewport exploration with collapsed conditions, drawing with its actions, and expanded conditions/no-calculation state. `subegia-mobile.html`, beside the Cesium artifact, embeds that same responsive page at a 390 CSS-pixel reference width (or narrower when necessary); it is not a second implementation. Real-device touch, orientation, screen-reader, safe-area, and browser coverage remain future validation work.

### Runtime translations with JSON files (2026-10-21)

Confirmed library choice: ngx-translate. The user wants to learn a third-party Angular translation library that reads separate key-value JSON files and resolves keys in templates. ngx-translate supports JSON loading, nested keys, interpolation, and runtime language changes without building a separate application for each language.

Planned packages: `@ngx-translate/core` and `@ngx-translate/http-loader`. No Angular application or dependencies have been created/installed yet. Select compatible versions when scaffolding Angular; the currently inspected ngx-translate v18 documentation requires Angular 18 or newer. Do not copy version-specific provider configuration without checking the installed major version.

Suggested modern Angular source layout:

```text
public\
  i18n\
    es.json
    eu.json
    en.json
```

Illustrative `en.json`:

```json
{
  "NAV": {
    "EXPLORE": "Explore",
    "ABOUT": "The project",
    "LIMITATIONS": "Limitations"
  },
  "ASSESSMENT": {
    "CALCULATE": "Calculate FWI"
  }
}
```

Angular template usage, after configuring the loader and importing `TranslatePipe` into the component:

```html
<button>{{ 'ASSESSMENT.CALCULATE' | translate }}</button>
```

The same key exists in each file, with values such as `"Calcular FWI"` in Spanish and `"FWI kalkulatu"` in Basque. Key names are application-defined identifiers; `TRANSLATION.someKey` can be a key convention, but accessing an arbitrary `TRANSLATION` object is not automatically provided by the library.

Use the ES / EU / EN header control to load and switch language at runtime. Cover section copy, panel text, category labels, loading/errors, accessible labels, and safety explanations with the same approach. Switching language must preserve the selected geometry, camera, scientific values, and result status rather than recreate the Cesium scene or rerun the assessment.

Initial-language selection, any saved language preference, and fallback-language choice remain to be decided. Define explicit behavior for failed translation downloads and missing keys, particularly safety text; do not silently present raw keys as a successful translated interface. Keep matching key sets across all three files.

ngx-translate handles text lookup, not every aspect of localization. Update the document language (`es`, `eu`, `en`) when switching, and configure locale-aware number/date formatting separately. Formatting must not change the underlying numeric FWI or hide the assessment's time zone.

Documentation inspected:

- Installation, JSON loader, and Angular compatibility: https://ngx-translate.org/getting-started/installation/
- Template pipe, directives, and interpolation: https://ngx-translate.org/getting-started/translating-your-components/

### CesiumJS integration requirements

#### Map loading screen (implemented 2026-10-25)

- [x] Add a visible loading indicator while the initial map loads, hiding map controls, the legend and the information panel until ready.
- [ ] Review the loading experience on a real phone and with a throttled connection.

The loading overlay spans the map workspace, including the tablet/desktop aside,
while leaving page navigation and supporting sections usable. It uses the user's
local Earth SVG, a reduced-motion-aware animation, and ES/EU/EN status messages.
Readiness requires successful camera framing, ready imagery providers, and a
rendered frame with the initial globe tiles loaded. Provider/rendering errors or
a 45-second loading timeout show a translated error and an explicitly labelled
page-reload button, not a successful-map fallback. Loading listeners and the timer
are released on completion, failure or component destruction. Later camera
navigation and optional 3D-building loading do not restart or block this initial
screen.

Confirmed library: CesiumJS for actual interactive 3D terrain, not a flat map or an abstract mountain illustration. The Angular application must own the Cesium viewer lifecycle: create it once the map container is available, manage handlers and entities, and destroy the viewer and handlers on teardown.

Configure the library's worker, widget stylesheet, and static-asset paths using the selected Angular build setup. Verify compatibility when choosing versions; the preview's CDN-pinned CesiumJS 1.132 is not a production-version decision.

Keep map-camera state, selected geometry, and displayed assessment data separate from translated UI copy. Language switching must not recreate the viewer. Backend results supply structured geographic cells and assessment metadata; Cesium visualizes them and does not replace the backend calculation.

Terrain elevation and imagery are separate provider concerns. The artifact demonstrated Esri terrain/imagery without a private key, but production providers, credentials where required, attribution, quotas, and terms remain undecided. Preserve visible credits and explicit rendering/provider error states.

No Angular-specific Cesium wrapper or additional UI-component library has been selected. Do not install one or invent a requirement for it merely because the preview exists.

### Confirmed MVP scope (2026-10-19)

The first MVP is a simple map-based FWI calculator: open the 3D terrain map showing mountains and valleys, draw an area within Gipuzkoa, and request FWI results for that selection. Point-only selection does not satisfy the confirmed interaction.

Confirmed presentation, refined by the user: keep the selected area's outline visible on the terrain, divide the selection into spatial subareas, and color each subarea by its FWI danger category as a heatmap over the 3D terrain. The colored FWI overlay is required for the MVP, alongside the results side panel; it supersedes its earlier optional status. No animation is required. Selection uses one editable polygon, as specified below. Desktop is the MVP target; mobile implementation remains deferred, with its future interaction design captured above. The interface, explanations, legends, errors, and prevention guidance must be available in Spanish, Basque, and English. Support current stable desktop Chrome, Edge, and Firefox. Translation review and reference operating systems/hardware for browser verification remain to be defined.

Subareas must respect the effective resolution and coverage of the weather inputs. Prefer source grid cells clipped to the selection where suitable; do not create apparently independent fine-scale assessments by arbitrarily subdividing coarse data. Terrain detail does not establish FWI precision, and slope is not a direct FWI input. Show a labeled category legend and distinguish unavailable cells from low-danger cells. Exact grid geometry and resolution remain dependent on data feasibility.

Show the native FWI value, a documented danger category, a short explanation of its meaning, the assessment's valid date/time, and input sources and freshness. Missing, stale, or insufficient inputs must be explicit; do not fabricate a result. Identify the weather station or grid cell represented by the result so map selection does not imply unsupported local precision.

Include plain-language general prevention guidance from official sources in the results panel, contextualized by the displayed FWI category. Identify the guidance source and link to current official restrictions; FWI does not grant permission for an activity. Baseline precautions apply at every category, and low FWI must not be described as safe. Guidance concerns reducing avoidable ignition risks, not lowering the calculated FWI or guaranteeing reduced losses. Selecting and reviewing the applicable official sources and category-to-guidance rules remains preparation work; personalized land-management recommendations and LLM-generated safety advice are outside the MVP.

FWI is the selected index, but implementation and data feasibility remain unverified. Inspect the existing formula before deciding what to reuse or replace. Initialization and historical moisture states are required implementation concerns even when the interface is simple.

The MVP does not require mobile support, ignition probabilities, fire-direction predictions, propagation animations, agent chat, accounts, microservices, extra indices, or environmental overlays beyond the FWI heatmap. FWI components are needed internally; a detailed component dashboard is optional, not an MVP requirement. Represent spatial differences through subarea FWI results rather than one number for the entire selection. Do not assume averaging FWI is scientifically justified or that one point's result represents the entire area.

### Main MVP journey

1. Open the desktop website in Spanish, Basque, or English and explore Gipuzkoa's 3D terrain.
2. Draw the area to assess; keep its outline visible.
3. Request the assessment and see an explicit loading state.
4. Inspect subareas colored by FWI category using the labeled legend.
5. Select a subarea to inspect its FWI value, category, explanation, valid time, data provenance, and coverage in the side panel.
6. Read attributed general prevention guidance and access current official restrictions.

Unavailable, stale, or insufficient data must remain distinguishable from low fire-weather danger. Remaining interaction details and measurable performance criteria are still open.

### Area-selection requirements and acceptance criteria

Confirmed interaction:

- Focus the 3D terrain experience on Gipuzkoa and restrict navigation and assessment to the supported region. Exact camera constraints require technical verification; terrain outside Gipuzkoa may remain visible at view edges. No hard visual mask or exclusively Gipuzkoa-only terrain download is promised.
- Maintain one active assessment area. Users click to place polygon corners and explicitly finish the outline.
- While drawing, users can undo the last corner or cancel.
- After drawing, users can move corners or clear the selection and redraw.
- Restrict the complete polygon to Gipuzkoa. Explain rejected corners, edges, or edits that would leave coverage; do not silently clip the area.
- The outline is a user-defined assessment area, not a cadastral or legal property boundary.

User story: As a non-specialist rural landowner, I want to draw and correct an area on Gipuzkoa's 3D terrain so I can request an assessment for the area I mean.

Observable acceptance criteria:

- A finished polygon requires at least three distinct, non-collinear corners and must not self-intersect. Invalid geometry shows a clear message and cannot be submitted.
- Validate the entire polygon against the supported boundary, not just its corners; edges may cross outside even when their endpoints are inside. Rejected edits preserve the last valid geometry.
- Undo removes the last placed corner; cancel exits drawing without creating a new assessment area.
- A valid finished selection remains outlined on the terrain and enables the assessment action, subject to data availability and documented resource limits.
- Moving corners revalidates coverage and geometry. If a completed assessment no longer matches the edited selection, remove or explicitly invalidate its heatmap and details; results must never appear to apply to a changed area.
- Clear removes the selection and its results. Late responses for an old selection must not repopulate the cleared or edited area.

Boundary dataset, version, coordinate handling, boundary tolerance, and navigation constraints remain to be specified. No artificial selection-size limit has been agreed; resource feasibility remains to be tested as described below. Accessible polygon entry is required below; its detailed controls remain to be designed. Geographic coverage is confirmed, but its implementation specification is not complete.

### Assessment time and browser requirements

User story: As a landowner, I want the latest available daily assessment and its actual date so I do not mistake old data for current conditions.

- The MVP offers the latest available daily FWI assessment, not a live minute-by-minute index. Historical-date selection and future forecasts are deferred; historical inputs are still required internally for moisture states.
- Display the assessment's valid date/time separately from retrieval time and identify the time zone. Expose stale and unavailable data explicitly.
- Do not silently mix assessment dates across subareas or present a previous day's result as today's. The date-alignment policy, publication schedule, and staleness threshold must be defined from source availability in Milestone B.
- Verify the complete core journey on current stable desktop Chrome, Edge, and Firefox; record tested versions at release.
- If required 3D rendering capabilities are unavailable, show an understandable compatibility message rather than an empty or broken map.

### Partial results, service failures, and capacity

User story: As a visitor, I want to see the available assessment for my selection and understand any gaps without mistaking missing information for low danger.

- Confirmed behavior: show valid subarea results even when other subareas are unavailable. Mark unavailable subareas separately and show a prominent partial-coverage notice in both the map results and text alternative.
- The results panel identifies assessed and unavailable subareas. No-data cells must never receive a low-danger value, inferred category, or category-specific guidance based on an invented result.
- If no subarea can be assessed, show an unavailable assessment state, not an empty success or a danger score of zero.
- When a request fails or times out, show a clear error, keep the user's valid selection, and provide a manual retry action. Do not leave an indefinite loading state or silently substitute unrelated or stale results.
- Source-date alignment and stale-data behavior still require the policy defined in Milestone B; partial coverage must not silently combine mismatched dates.

Selection capacity direction:

- User preference: do not impose an artificial selection-size limit within Gipuzkoa simply because the product has a EUR 0 budget. No numeric area or polygon-complexity cap has been approved.
- Polygon drawing and deterministic FWI calculation do not require an LLM call. Agent usage costs are separate and the agent is outside the MVP.
- Terrain, weather/search providers, hosting, storage, bandwidth, and computation can still have capacity constraints or free-tier quotas. No unlimited-capacity or universally free-provider guarantee has been established.
- Test representative selections, including large areas, against actual input resolution and deployment capacity before selecting technical limits. Do not silently reduce scientific resolution or truncate results to make a request appear successful.
- Network timeouts, bounded retries, and backend resource protection remain required. Any proposed user-facing selection cap or queued-job behavior must be brought back for a scope decision based on evidence; neither has been selected.
- When a provider quota or service-capacity constraint prevents assessment, surface it explicitly without triggering paid fallback usage.

### Location privacy requirements

User story: As a visitor, I can optionally locate myself without being required to share my location or save my land selection.

- Request browser location only after an explicit user action, explaining its purpose before the permission prompt. Never request it automatically on page load.
- Denied permission, unavailable location, or a location outside Gipuzkoa must produce an understandable message and leave manual map navigation, search, and area entry usable. Do not move the assessment outside supported coverage.
- Location is a navigation aid, not an automatically selected assessment area or evidence of property ownership. The user still defines the polygon.
- Drawn polygons and device locations are temporary; do not save them between visits or include their coordinates in application logs. Avoid logging coordinate-bearing request bodies or URLs.
- Explain that terrain, search, weather, and hosting providers may receive geographic requests or connection metadata needed to serve the application. Do not promise that location data never leaves the browser.
- Provider-specific disclosures, infrastructure log handling/retention, and any anonymous-session identifiers remain to be specified after provider selection.

### Performance targets and measurement baseline

Agreed on 2026-10-21 as provisional engineering targets, not demonstrated capabilities:

| Operation | Target | Measurement boundary |
|---|---|---|
| Initial interactive 3D view | Within 10 seconds | Navigation start until Gipuzkoa terrain is visible and navigation and area-entry controls are usable; not completion of every terrain tile |
| Local interaction feedback | Within 200 milliseconds | Input event until visible feedback for a drawing action or control activation; remote search or assessment completion is measured separately |
| Warm-backend assessment | Within 10 seconds | Assessment submission until the heatmap and corresponding text results are usable, including transfer and rendering |

Provisional baseline: Windows 11 desktop/laptop, 8 GB RAM, hardware-accelerated 3D rendering, 1366 x 768 viewport, and a 20 Mbps connection with approximately 50 ms round-trip latency. Record exact CPU/GPU, OS, browser versions, network-shaping method, and backend configuration when testing.

Measure current stable Chrome, Edge, and Firefox using fixed small, medium, and near-region-wide valid selections. Define their actual geometry and input-cell counts after source-grid feasibility work. These are test fixtures, not selection-size caps.

Report initial-load cache conditions and cold-backend starts separately from warm-backend assessments. Cold starts must remain visibly identified as loading or service startup, not disappear from the report. Record repeated-run durations and failures rather than citing only the fastest run. Repetition counts and a release pass-rate rule remain to be agreed before acceptance testing.

Targets must be verified in the prototype and on the selected free hosting. Any proposed revision requires an explicit decision; do not silently reduce scientific resolution or narrow allowed selections to satisfy them.

### Accessibility requirements

User story: As a visitor who cannot use mouse drawing or distinguish heatmap colors, I can define an area and understand its results through keyboard controls and text.

- Provide keyboard-operable polygon entry and editing, such as a coordinate-field workflow, with the same geometry and coverage validation as mouse drawing. The exact controls and coordinate format remain a design task.
- Provide a keyboard-accessible text list or table of assessed subareas, identifying each subarea and its FWI value, category, valid date, and unavailable/stale status. Selecting an entry exposes the same details as selecting its map cell.
- Use written category labels and numeric values alongside colors; no-data must not rely on color alone.
- Core controls require accessible names, visible keyboard focus, and no keyboard traps. Loading, validation errors, and assessment completion must be available to assistive technology.
- These requirements apply in Spanish, Basque, and English.

Agreed accessibility target (2026-10-21): WCAG 2.2 Level AA for the complete core assessment journey, including its keyboard/text alternative. This is a design and evaluation target, not a conformance claim. The checks below are a starting set, not a replacement for evaluating all applicable criteria.

- Normal text requires at least 4.5:1 contrast and qualifying large text at least 3:1. Essential control boundaries and meaningful graphical indicators require at least 3:1 against adjacent colors where the criterion applies; do not depend on variable terrain backgrounds for text readability.
- Users can enter/edit an area, request an assessment, inspect all subarea results, and reach prevention guidance through keyboard controls without requiring pointer interaction with the 3D scene.
- Keyboard focus remains visible and is not entirely obscured by application panels. Dialogs and error messages use predictable focus handling without trapping users.
- At 200% text enlargement, controls and results remain usable without lost content or functionality. Text panels and forms must reflow as required by WCAG; the map's two-dimensional presentation does not excuse inaccessible surrounding content.
- Controls and coordinate fields have programmatic labels; validation errors identify the relevant field or geometry problem. Loading, partial coverage, unavailable data, errors, and completion are exposed to screen readers without requiring a visual map inspection.
- Language metadata reflects Spanish, Basque, or English content, including language changes where needed.

The coordinate-entry design, screen-reader/browser combinations, full applicable-criteria checklist, and evaluation evidence remain to be prepared before claiming the target is met.

### Heatmap and prevention-guidance acceptance criteria

User story: As a rural landowner, I want to compare FWI categories within my drawn area and understand the data behind each subarea.

- For a successful assessment, every returned valid subarea has an FWI value and a category from the documented classification scheme. The clipped heatmap, labeled legend, text results, and selected-subarea panel must agree.
- Selecting a subarea in the map or text alternative exposes the same value, category, explanation, assessment date, source, and effective coverage.
- Neighboring cells with identical source inputs may legitimately show identical results. Do not invent variation to make the heatmap look more detailed.
- Partial and wholly unavailable assessments follow the explicit failure/coverage requirements above. Unknown values are never rendered as zero or low danger.

User story: As a non-specialist land manager, I want understandable prevention guidance so I can learn general precautions without mistaking the application for official authorization.

- Guidance identifies its official source and provides access to current official restrictions. Category-specific wording follows reviewed rules rather than LLM generation.
- Baseline precautions and the agreed experimental-use notice remain visible regardless of category. Low FWI never implies safety or permission.
- Results, guidance, legends, and failure messages are available in Spanish, Basque, and English; scientific values and status must not change with interface language.
- The application does not offer personalized planting, clearing, or burning instructions, or claim that following guidance lowers the calculated FWI.

### Architecture decision that supersedes earlier discussion

Do NOT start by creating several Spring Boot microservices.

Start with one modular Spring Boot application. Microservices are a later learning and evolution milestone, not a prerequisite for the first release. Earlier suggestions to deploy separate environmental and assessment services from the beginning are superseded.

### What has not been verified

- The existing formula, its scientific basis, and its interpretation.
- The existing agent's full list of data sources and dependencies.
- Data availability, historical coverage, resolution, licenses, and update frequency.
- Whether the calculated result is a calibrated probability or only an index.
- Hosting eligibility, available capacity, and resource requirements.
- Whether the existing implementation requires a Python runtime.

### Milestone B kickoff (2026-10-21)

The project folder currently contains this reference document only; no existing agent or calculation implementation was available to inspect. The user reports an existing Python agent but prefers creating the future assistant with Spring AI. Its source location and reusable data/calculation logic remain unknown.

This preference does not introduce an AI dependency into the MVP. Weather ingestion uses deterministic provider integrations, and FWI uses documented calculation code with reference checks. Do not route ordinary assessment requests through an LLM or require the assistant for data retrieval.

The Python agent may be inspected later as a reference for source integrations or scientific logic; do not assume that it must be migrated or deployed. Spring AI provider/model, costs, privacy, and tool design remain future-assistant decisions.

The next feasibility objective is to identify weather datasets covering Gipuzkoa with sufficient historical inputs and suitable spatial resolution, verify their access/usage terms, and obtain a traceable sample for FWI calculation. This must establish whether a useful subarea heatmap is supported before promising plot-scale variation.

### AEMET ingestion direction and initial API review (2026-10-21)

User-selected direction: obtain weather data through AEMET OpenData, then calculate FWI in backend code. Translate the selected polygon into relevant source datasets or stations; do not assume AEMET accepts an arbitrary polygon and returns a complete weather grid for it.

Confirmed request flow: the frontend submits the selected area to Spring Boot; Spring Boot obtains the relevant AEMET data or previously ingested inputs, validates their completeness and conventions, and calculates the assessment before returning structured results. The frontend does not fetch AEMET credentials or perform the scientific calculation.

Historical initialization clarification: the user suggested approximately one month of weather history. Treat this as a candidate warm-up window to investigate, not an established requirement or an accuracy guarantee. FFMC, DMC, and DC depend on previous states and respond on different timescales; a month may be insufficient, particularly for the slow drought component. Choose a documented initialization, warm-up, and seasonal/restart method and verify it against reference calculations.

When reconstructing states from history, process the daily weather sequence chronologically from a documented starting state. Retain the latest valid moisture states and their provenance so subsequent daily updates do not need to rebuild the same history for each user request. Missing required days or inputs must trigger the documented gap-handling policy, not invented values or a silent reset.

Initial review of the official OpenAPI specification confirms:

- Conventional observation endpoints provide hourly observations for the latest 12 hours, either for one station or all stations. This alone does not establish access to the full preceding 24-hour rainfall window or historical noon inputs.
- Daily climatological endpoints accept date ranges and station identifiers. A date-range endpoint does not establish that its variables and measurement times meet FWI requirements; inspect actual data and metadata before using it.
- A station inventory is available to investigate location and coverage.
- Hourly municipal forecasts are forecasts for municipalities, not evidence of plot-scale observations. They must not silently replace observations in the agreed daily assessment.
- API-key authentication is documented. Keep the key in backend configuration, not frontend code or this document. Responses include a documented service-limit error (429); exact quotas and practical availability still require verification.
- Fire-danger map products are also listed. Their existence does not prove access to numerical georeferenced FWI cells suitable for this application's own calculation or heatmap.

Feasibility remains open: verify temperature, relative humidity, wind speed and measurement conventions, preceding 24-hour precipitation, continuous historical inputs, moisture-state initialization, station coverage, and any suitable gridded products. Daily means/extremes are not automatic substitutes for the standard FWI weather inputs.

Proposed implementation approach, not a completed design: ingest/cache reusable weather datasets and maintain daily moisture states independently of individual user drawings, then calculate or retrieve assessment cells intersecting the selection. Avoid making an upstream request per tiny visual subarea or repeatedly reconstructing the same history for every user.

If station observations cannot support scientifically defensible spatial variation, do not fabricate a fine heatmap by assigning different values to arbitrary subareas. Bring evidence back before selecting additional sources, an interpolation method, or a scope change.

References inspected:

- Official API explorer: https://opendata.aemet.es/dist/index.html
- Official API specification: https://opendata.aemet.es/AEMET_OpenData_specification.json
- Usage terms to review: https://www.aemet.es/es/nota_legal

Live-data test status (2026-10-21): the user has obtained an AEMET OpenData API key and configured it in the project-local `.env`; authenticated requests succeeded. `.gitignore` excludes local `.env` files. Station inventory, recent observations, historical daily responses, and product metadata have been inspected as documented below. Do not paste the key into chat, commit it, print it in diagnostic output, or embed it in browser code. Registration entry point: https://opendata.aemet.es/centrodedescargas/altaUsuario

Local configuration: set `AEMET_API_KEY` in `.env` without sharing the value. Local test tooling must explicitly load this file without executing its contents or logging secrets. Spring Boot does not automatically read `.env`; when the backend is implemented, expose the value as a process environment variable through the run configuration or an explicitly configured loader. Never expose it to Angular. A persistent Windows user environment variable is an alternative, not a requirement; a project-local secret avoids making the key available to all processes launched under that user.

The first authenticated test should inspect the station inventory for Gipuzkoa and relevant nearby coverage, then representative observation and historical-data responses and their metadata. Record variables, units, measurement/accumulation times, missing values, historical availability, and spatial representativeness before concluding that the data satisfies FWI.

### Authenticated AEMET findings (2026-10-21)

Successful requests were made with the local key passed in the `api_key` header. The key was not printed, included in request URLs, or sent to the frontend.

| Product tested | Observed result |
|---|---|
| Station inventory | 16 entries labeled GIPUZKOA; this is an inventory count, not a guarantee that all stations are currently active or complete |
| Recent observations, all stations | 182 records matched the Gipuzkoa inventory identifiers; these are time-stamped observations, not 182 stations |
| Irun (`1012P`) daily history, requested 2026-10-12 through 2026-10-19 | 7 daily records returned |
| Igeldo (`1024E`) daily history, requested 2026-09-20 through 2026-10-19 | 29 records returned, covering 2026-09-20 through 2026-10-18; requested end date was not present |

Inventory entries include Irun, Hondarribia, Donostia airport, Errenteria/Anarbe, Igeldo, Segura, Beasain/Arriaran, Ordizia, Legazpi, Zumarraga, Azpeitia, Zumaia, Aretxabaleta, Elgeta, Elgoibar, and Mutriku. Spatial representativeness and active-variable coverage still need evaluation.

Recent-observation fields verified against returned metadata:

| Field | Meaning and convention |
|---|---|
| `fint` | UTC observation-period end; metadata describes observations for the preceding hour, with variable-specific timing below |
| `ta` | Instantaneous air temperature at `fint`, degrees Celsius |
| `hr` | Instantaneous air relative humidity at `fint`, percent; not land or fuel moisture |
| `vv` | Mean wind speed over the preceding 10 minutes, m/s; convert to km/h for FWI and verify measurement height/exposure |
| `prec` | Rainfall accumulated over the preceding 60 minutes, mm; a single value is not 24-hour rainfall |

Example: Beasain/Arriaran (`1025X`) at 2026-10-21 18:00 UTC returned `ta=10.1`, `hr=84`, `vv=0.4`, and `prec=0.0`. This is an API sample, not a noon FWI input set or a calculated assessment.

Daily historical responses contain `tmed`, `tmin`, `tmax`, `velmedia`, `racha`, `prec`, and humidity summaries `hrMedia`, `hrMin`, `hrMax` in the inspected samples. Metadata describes daily rainfall from 07 to 07, daily mean temperature/humidity, and wind in m/s. These summaries do not supply the required noon temperature, humidity, and wind merely by having similar names. Decimal-comma strings and documented nonnumeric values such as `Ip`, `Acum`, and time marker `Varias` require explicit field-specific parsing; do not silently convert them to zero. Metadata field-name capitalization differs from some actual humidity keys.

Conclusion: AEMET authentication, station lookup, recent weather access, and approximately month-long daily-history retrieval are demonstrated. A complete standard-FWI reconstruction is NOT demonstrated. Remaining blockers are suitable historical noon weather, aligned 24-hour rainfall, initialization/state history, explicit handling of missing or unpublished dates, and defensible spatial representation. Investigate appropriate archive/products or continuous observation ingestion; recent-observation accumulation alone cannot reconstruct the missing historical noon series. No FWI result has been calculated and no additional provider or approximation has been selected.

### Vegetation and moisture indicators raised for investigation

The user proposed "NVDI", interpreted provisionally as NDVI, to describe land humidity. The desired environmental property needs clarification before selecting a dataset or adding an MVP requirement.

- NDVI (Normalized Difference Vegetation Index) describes spectral vegetation greenness; it is not a measurement of land-humidity percentage, fuel moisture, or soil moisture.
- NDMI (Normalized Difference Moisture Index) is related to vegetation/canopy water content, but is not itself a calibrated moisture percentage or a substitute for direct soil-moisture data.
- Soil-moisture products describe water in a specified soil layer, with product-specific units, depth, spatial resolution, and uncertainty. They are not interchangeable with vegetation water content.
- These indicators are not additional inputs to the standard FWI equations. Any future layer must remain separate unless a separately specified and evaluated model justifies combining them.

No vegetation/moisture layer has been confirmed for the MVP. Source selection, cloud-related gaps for optical products, acquisition dates, resolution, licensing, and scientific interpretation require separate feasibility work. Subsequent authenticated testing confirmed an AEMET vegetation image, not a numeric moisture dataset; see the research findings below.

### Deeper research: FWI inputs and alternative weather APIs (2026-10-21)

At the time of this research, provider switching had not been authorized. The user subsequently approved Open-Meteo for the learning prototype; see the current decision in section 2. Findings below remain research evidence, not proof of scientific accuracy.

#### Standard-method findings

The Canadian `cffdrs` reference documentation specifies daily noon local-standard-time temperature and relative humidity, 10 m open-exposure wind speed in km/h, the preceding 24-hour precipitation in mm, and previous FFMC/DMC/DC states.

Under a CET-based standard-time interpretation for Gipuzkoa, noon standard time is 11:00 UTC year-round, corresponding to 12:00 CET in winter and 13:00 CEST in summer. This is not evidence that every European operational product uses that convention. Verify and document the selected calculation's timing rather than using arbitrary civil-clock noon or assuming all providers align identically.

The reference implementation documents default starting states FFMC=85, DMC=6, DC=15 but cautions that they represent typical spring conditions in Canada and nearby regions, not universal local conditions. Its overwintering documentation describes a 53-day characteristic DC response under standard conditions. That is not a mandatory 53-day warm-up; it supports the conclusion that 30 days cannot universally guarantee independence from initial-state error. Choose initialization and seasonal handling explicitly and test sensitivity to initial states.

The package includes a standard `test_fwi` example referencing Van Wagner and Pickett (1985), useful for comparing all components with identical inputs. Its GPL-2 license must be respected if reusing code or distributing package-derived fixtures. No reference code or dataset has been copied into this project.

#### AEMET-specific conclusions and new product tests

- The reviewed OpenData specification documents rolling 12-hour conventional observations, rolling 24-hour SYNOP/TEMP messages, and 40 days of CLIMAT messages. CLIMAT retention does not establish an hourly archive.
- No arbitrary-date subdaily backfill endpoint suitable for FWI was identified in that specification. This does not prove that AEMET has no such records through other services; access, terms, and completeness of archival channels remain unverified.
- Prospective ingestion could preserve future observations and aligned hourly rainfall, using overlapping request windows and station/time deduplication. It cannot reconstruct observations before collection began, guarantee complete data, or determine initialization by itself.
- No appropriate numeric weather-model grid endpoint was identified in this OpenData review. Do not generalize this into a claim that all AEMET grids are paid or unavailable.
- An authenticated request to the estimated Peninsula/Baleares fire-risk map endpoint returned product status 404. File format and numeric content could not be checked; neither permanent unavailability nor a seasonal cause was established.
- An authenticated request to `/api/satelites/producto/nvdi` returned a GIF image, verified by content type and file signature. Its documentation describes NOAA-19 visible/near-infrared vegetation imagery updated weekly on Thursdays. This confirms access to an image, not a calibrated land-moisture percentage, verified georeferenced numerical grid, or FWI input.

#### Open-Meteo: successful live tests

Tests used the public coordinate 43.30 N, 1.98 W near Donostia, UTC timestamps, and explicitly requested wind in km/h. No API key was required for these requests.

All tests requested `temperature_2m`, `relative_humidity_2m`, `wind_speed_10m`, and `precipitation`.

| Product/model | Requested dates | Returned hours | Missing values |
|---|---|---|---|
| Historical API, explicit `era5` | 2026-09-01 through 2026-10-14 | 1,056 (44 days) | None in the four requested fields |
| Historical API, explicit `era5_land` | Same dates | 1,056 | Wind and precipitation were null for every hour; temperature and humidity were present |
| Historical Forecast API, default model selection | 2026-09-01 through 2026-10-20 | 1,200 (50 days) | None in the four requested fields |
| Forecast API with two past days and current day | 2026-10-19 through 2026-10-21 | 72 | None in the four requested fields; includes model weather, not confirmed observations |

The ERA5-Land-only test is an important negative result: do not assume a dataset name or its nominal spatial resolution guarantees that all variables are exposed by a particular API configuration. Do not use its null wind/rainfall values as zero, or claim that this test proves ERA5-Land itself lacks those physical variables.

Open-Meteo documents instantaneous temperature, humidity, and 10 m wind, plus preceding-hour precipitation totals. Its historical forecast service compiles successive model runs' initial hours into a time series; this is archived model weather, not a station-observation archive, and not necessarily a single issued forecast trajectory. Exact selected models, blending, spatial support, update history, and precipitation semantics must be recorded for reproducibility.

These products provide a practical route to obtaining noon-time variables and reconstructing a matching 24-hour accumulation, subject to validated interval indexing and continuous data. A complete response is not proof of local accuracy, suitable initialization, or correct FWI.

#### Resolution, dates, and model continuity

ERA5 is distributed at 0.25 degrees and its official source describes approximately five-day early-release latency and possible revisions. It supports historical calculation but not detailed parcel-scale weather. ERA5-Land's native approximately 9 km resolution does not rescue the incomplete API configuration tested above.

Open-Meteo's archived-model service offers regional/global models with different resolutions and availability dates; its automatic selection must not be treated as a universal fixed resolution. The 2026-10-26 spatial experiment below verifies candidate models, their exposed grids and sampled historical availability rather than defaulting to arbitrarily small map cells. On 2026-10-29, AROME HD was selected for the MVP as recorded below; operational and scientific validation remain pending.

The Historical Forecast API demonstrated 50 days through yesterday at the test location. Its current-day availability, publication schedule, corrections, and operational reliability have not been established. Display real valid dates and label model-based assessments; do not call past model estimates observed weather.

Do not silently initialize from ERA5 and switch to another model or AEMET station series. A hybrid can introduce discontinuities and moisture-state biases and requires explicit specification and evaluation.

#### Agreed subarea construction and assessment flow (2026-10-28)

The user approved source-grid-based subareas and clarified that only the actual
selected polygon determines inclusion, not its bounding rectangle. This is an
agreed implementation direction, not an already implemented backend feature.

1. Receive the selected GeoJSON polygon and validate its structure, topology
   and complete coverage by Gipuzkoa before any weather requests.
2. Use a versioned definition of the chosen model's exposed regular grid:
   origin, spacing and dimensions. Reconstruct only nearby candidate cell
   assignment rectangles locally; do not download or instantiate the entire
   grid, or all cells in Gipuzkoa. For the verified `nearest` rule, assignment
   rectangles extend halfway from each grid point toward its neighbors.
3. Use the selection's bounding rectangle only to determine a conservative
   candidate row/column range. Intersect each candidate cell with the actual
   selected polygon. Discard empty intersections and intersections that only
   touch at a point or line. A positive-area intersection becomes the subarea
   geometry, possibly a MultiPolygon. Cells wholly inside gaps of a concave
   selection's bounding rectangle must not generate subareas or weather requests.
4. The retained clipped geometries must jointly cover the original selection,
   with no positive-area overlaps or surface outside it, subject to explicitly
   specified numerical tolerances. Do not silently crop an invalid selection
   to Gipuzkoa as a substitute for rejecting it.
5. Request the required weather series only for the distinct retained source
   cells, reusing suitable cached data and batching coordinates where supported.
   The source point need not itself lie inside the selected polygon or Gipuzkoa;
   the positive-area intersection is the inclusion criterion. Keep the explicit
   model, nearest-cell selection and downscaling configuration consistent with
   the grid mapping; verify returned source centers.
6. Calculate FWI server-side for each retained source cell using its weather
   series, required historical moisture states and agreed reference-time,
   rainfall and initialization rules. Associate the result with its clipped
   subarea. Missing inputs or states must be reported explicitly, not replaced
   with zero or fabricated values.
7. Return each subarea's geometry, FWI, danger category, valid date, status and
   source provenance so Angular/Cesium can render it. Detailed response field
   names and classification thresholds remain to be finalized.

The number of subareas follows positive-area intersections with the source
grid, not an arbitrary target count or a selected-area-size threshold. A single
intersecting cell yields a single subarea; do not subdivide it to imply extra
meteorological detail. Different source cells may have identical weather, FWI
or categories and must not be assigned artificial visual differences.

ICON-EU and AROME are weather prediction models whose results are accessed via
Open-Meteo, not separate services returning our subarea polygons. The backend
constructs the clipped geometries from the grid definition, Open-Meteo supplies
weather data, and the backend calculates FWI. On 2026-10-29 the user approved
AROME HD for the MVP as specified below. Scientific FWI
validation and initialization remain required before displaying real assessments.

#### MVP weather model decision (2026-10-29)

Use Open-Meteo with the explicit model `meteofrance_arome_france_hd` (AROME HD)
for the MVP. The user accepted this recommendation based on the verified input
availability, tested historical coverage and finer exposed grid, not a proven
ranking of local forecast accuracy. This records a decision, not an implemented
weather client or grid generator.

Use the tested `cell_selection=nearest` and `elevation=nan` configuration
consistently with the reconstructed assignment grid. The inspected grid origin
is longitude -12.0, latitude 37.5, with 0.01-degree spacing on both axes and
dimensions 2801 by 1791 points. Retain the source/version provenance documented
in the experiment; grid changes must be detected and handled explicitly rather
than silently mixing mappings.

Do not silently use automatic model selection, mix models for initialization
or switch providers when data is missing. Finer grid spacing does not establish
better meteorological accuracy. FWI reference validation, initialization,
time/rainfall alignment, hosted-service eligibility and quota handling remain
required.

#### Implementation checkpoint and next step (2026-10-29)

The backend currently receives the selected GeoJSON at
`POST /api/v1/assessment` (singular). The agreed public contract remains
`/api/v1/assessments`; align the implementation and clients before integration.
Request records enforce the initial structure, including non-null coordinate
values. Geometry conversion checks finite longitude/latitude values and their
ranges, and rejects an unclosed ring rather than silently closing it.
`AssessmentService` uses a local selected geometry for each request; selection
state must not be stored in shared service fields.

The current separation is:

- `assessment.api`: controller, request records and assessment error advice.
  Shared API error records and generic input-error handling live in `shared.api`.
- `assessment.application.AssessmentService`: orchestrates geometry preparation
  and validation.
- `assessment.infraestructure.AreaGeometryService`: loads the trusted Gipuzkoa
  GeoJSON and converts input coordinates to JTS geometries. `infraestructure`
  is the current package spelling in code.
- `assessment.domain.AreaGeometryValidator`: checks JTS validity, nonempty
  positive surface area and complete coverage with `covers()`. Domain exceptions
  are translated by the API advice, not caught in the controller.

The trusted boundary is read with
`new ClassPathResource("geo/gipuzkoa.geojson").getInputStream()`, from
`src/main/resources/geo/gipuzkoa.geojson`, and reused after startup. Do not use
a working-directory-relative filesystem path or `getFile()` for packaged
resources. The packaged application successfully started from outside the
project directory after this change. Preserve the underlying exception as the
cause if loading fails.

Live endpoint checks returned the expected outcomes: valid interior polygon
200; crossed polygon, collinear vertices and unclosed ring
422 / `INVALID_AREA_GEOMETRY`; valid exterior polygon
422 / `AREA_OUTSIDE_COVERAGE`. Earlier malformed JSON, incompatible field types,
missing body and Bean Validation checks returned the structured 400 response.
These are targeted checks, not an exhaustive regression suite. Coordinate range
errors currently use `InvalidAreaGeometryException`; aligning them with the
agreed 400 / `INVALID_REQUEST` contract remains pending.

**Resume with local grid generation, not an Open-Meteo polygon request.**

The AROME HD grid definition above is shared configuration, independent of the
user selection and the day's weather. Store its origin, angular spacings,
dimensions and source/version reference once; calculate only the candidate
indices needed for each assessment. Do not materialize or download the full
grid or all of Gipuzkoa's cells.

For column and row indices, centers are computed as
`longitude = -12.0 + column * 0.01` and
`latitude = 37.5 + row * 0.01`. Under the verified nearest-grid rule, each
assignment rectangle extends 0.005 degrees from its center on either axis.
These midpoints are between neighboring meteorological grid points, NOT between
the vertices drawn by the user. Grid spacing is angular, not a constant number
of meters; near Arrasate it is approximately 0.81 km east-west and 1.11 km
north-south, without implying equivalent meteorological accuracy.

Use the selection envelope only to find a conservative, grid-bounded candidate
index range. Construct candidate cell polygons with JTS, intersect each with
the actual selected polygon and retain only positive-area polygonal results.
Intersections can be disconnected; preserve all polygon parts and discard
point/line-only contacts. Attach the source cell's integer indices and center
to every retained subarea. The clipped zones must cover the selection without
positive-area overlaps or additions outside it, using specified precision rules.
In longitude/latitude, JTS `getArea()` is not in square meters; a positive-area
check is not a metric surface measurement.

Only after identifying the retained cells should the backend request their
weather series from Open-Meteo (or reuse valid cached data), explicitly selecting
AROME HD and the agreed mapping parameters. Open-Meteo does not return our
clipped subarea polygons. Verify returned centers and report unavailable data
explicitly. Implement and validate FWI separately before rendering real results;
neighboring cells may legitimately have the same FWI or danger category.

The user is implementing the backend manually to learn, with incremental
explanations and reviews. Continue with the next small grid-generation step
rather than implementing the entire pipeline without an explicit request.

#### Illustrated guide: from a weather-grid center to a cell (2026-10-30)

Esta explicacion documenta el calculo utilizado en `createCellGeometry()`.
Partimos del centro meteorologico de una celda, no de una esquina ni de un
vertice dibujado por el usuario. La rejilla expuesta de AROME HD que verificamos
tiene una separacion de 0.01 grados en ambos ejes. Con
`cell_selection=nearest`, los limites de asignacion estan a mitad de camino
entre centros vecinos.

**1. Localizar un centro a partir de su columna y fila**

No necesitamos descargar todos los puntos. La configuracion permite calcular
directamente el centro correspondiente a cada pareja de indices:

```java
double centerLongitude =
        gridProperties.longitudeOrigin() + column * gridProperties.longitudeStep();
double centerLatitude =
        gridProperties.latitudeOrigin() + row * gridProperties.latitudeStep();
```

Por ejemplo, la columna 951 y la fila 558 dan aproximadamente el centro
`[-2.49, 43.08]`, usando el origen `[-12.0, 37.5]`. Puede haber pequenas
diferencias numericas de coma flotante; estos valores no expresan precision
meteorologica a escala de una parcela.

**2. Calcular los limites oeste y este**

En horizontal, los centros vecinos y los limites de nuestra celda son:

```text
Centro anterior       Nuestro centro       Centro siguiente
     -2.50                 -2.49                 -2.48
       o---------------------o---------------------o
                  |                     |
               -2.495                -2.485
                Oeste                  Este
```

El paso completo entre centros es 0.01 grados. Para llegar desde el centro
al borde recorremos medio paso: 0.005 grados.

```java
double halfLongitudeStep = gridProperties.longitudeStep() / 2;
double west = centerLongitude - halfLongitudeStep;
double east = centerLongitude + halfLongitudeStep;
```

Restar longitud desplaza hacia el oeste; sumar desplaza hacia el este. Esto
tambien se cumple con longitudes negativas: -2.495 esta al oeste de -2.49.
No estamos haciendo la media entre los vertices de la seleccion.

**3. Calcular los limites sur y norte**

La misma regla se aplica a la latitud, que aumenta hacia el norte:

```java
double halfLatitudeStep = gridProperties.latitudeStep() / 2;
double south = centerLatitude - halfLatitudeStep;
double north = centerLatitude + halfLatitudeStep;
```

Para el centro del ejemplo, los cuatro limites son:

```text
                    Norte: 43.085
              +---------------------+
              |                     |
Oeste         |          o          |         Este
-2.495        |    (-2.49, 43.08)    |        -2.485
              |                     |
              +---------------------+
                     Sur: 43.075
```

`west`, `east`, `south` y `north` son cuatro limites escalares, no cuatro
coordenadas completas. Sus combinaciones determinan las esquinas:

| Esquina | Longitud | Latitud |
|---|---|---|
| Suroeste | `west` | `south` |
| Sureste | `east` | `south` |
| Noreste | `east` | `north` |
| Noroeste | `west` | `north` |

**4. Construir el rectangulo con JTS**

JTS puede construir el poligono rectangular directamente desde esos limites:

```java
Geometry cell = geometryFactory.toGeometry(
        new Envelope(west, east, south, north));
```

El borde este de esta celda coincide con el borde oeste de la siguiente.
La regla de medio paso tesela idealmente la rejilla sin huecos ni solapamientos
de superficie; la implementacion debe comprobar las tolerancias numericas.
Los grados no equivalen a una distancia fija en metros: estas celdas no son
cuadrados metricos, ni delimitan cambios fisicos bruscos en el tiempo.

**5. Distinguir la celda candidata de la subarea definitiva**

El rectangulo de la celda lo determina la rejilla; la seleccion solo determina
que parte conservaremos:

```text
         Celda A                    Celda B
  +---------------------+---------------------+
  |                     |                     |
  |    +----------------+--------+            |
  |    | Parte A        | Parte B|            |
  |    +----------------+--------+            |
  |                     |                     |
  +---------------------+---------------------+

       Rectangulo interior = seleccion del usuario
```

Se recorta cada celda candidata mediante `cell.intersection(selectedArea)`.
Solo las partes poligonales con superficie se convierten en subareas finales;
el resultado tambien puede tener varias partes desconectadas. Una celda
que solo toque el borde, o quede completamente fuera, no necesita una consulta
meteorologica.

Cada subarea conserva la geometria recortada y los indices y centro de su
celda original. No se debe sustituir ese centro por el centroide del recorte:
podria corresponder a otro punto de consulta.

`generateSubAreas()` coordina tres pasos privados: `calculateGridRange()` obtiene
el rango de filas y columnas mediante la envolvente, `generateCandidateCells()`
construye los rectangulos con su centro original y `clipCellsToSelectedArea()`
los recorta con la seleccion. `GridRange` es un record privado que agrupa los
cuatro indices extremos; no almacena estado de una peticion en el servicio.

El resultado contiene las geometrias recortadas, no los rectangulos completos.
`collectPolygons()` conserva todas las partes poligonales, incluidas las de un
MultiPolygon o una coleccion mixta, y descarta contactos de punto o linea.
Solo las celdas con recortes de superficie positiva generan un `SubArea`, con
su fila, columna y centro meteorologico original. La busqueda usa solo las
filas y columnas cercanas a la envolvente de la seleccion, no toda la rejilla.
Las consultas meteorologicas siguen pendientes.

#### Spatial subarea feasibility experiment (2026-10-26)

At the user's request, real Open-Meteo requests were made for synthetic
selections of increasing size in Gipuzkoa. No backend or frontend assessment
integration was implemented, and no FWI values were calculated in this test.

**Method and reproducibility**

- Build squares centered near Arrasate at longitude -2.49, latitude 43.08, with
  side lengths of 0.5, 5, 20 and 60 km in ETRS89 / UTM 30N. Intersect them with
  the existing geoEuskadi Gipuzkoa boundary before generating sample points.
  Larger selections therefore are not complete squares.
- Request each of `icon_eu`, `meteofrance_arome_france` and
  `meteofrance_arome_france_hd` separately. Use `cell_selection=nearest`,
  `elevation=nan`, UTC Unix timestamps, Celsius, km/h and mm, requesting
  temperature, relative humidity, 10 m wind speed and precipitation.
  Multi-location requests require one `nan` elevation entry per coordinate;
  a single entry produces HTTP 400. The initial failed requests were retained
  alongside corrected successful responses.
- Recent-data requests cover 2026-10-25 through 2026-10-26, 48 hourly values per
  location. They include forecast/model weather, not verified observations.
- The initial 5-by-5 interior sampling retained 25, 24, 17 and 10 points after
  clipping to Gipuzkoa. Sample counts are not exhaustive cell counts.
- Compare requested points with returned grid-center coordinates. Across all
  228 initial location/model combinations, centers matched the published
  regular-grid assignment within 0.00002 degrees. Repeated centers had identical
  four-variable time series with elevation downscaling disabled.
- Inspect Open-Meteo's public model-grid and nearest-point implementation at
  commit `03d62919c419f1eccad8dcbbcf7f92a2dd7069b4`. This is source evidence,
  not a claim that the hosted service runs that exact commit. Live probes
  independently corroborated the sampled grid behavior.
- Request 12 points per model near east-west and north-south half-spacing
  transitions. All 36 probes matched the expected nearest-center assignment.
  These tests constrain transitions to small brackets (approximately 10-14 m
  for ICON-EU, 4-6 m for AROME and 1.6-2.3 m for AROME HD); they do not prove
  equivalent meteorological or geodetic accuracy.

The published API grids inspected are:

| Explicit API model | Grid origin: longitude, latitude | Angular spacing in both axes | Approximate east-west / north-south center spacing near Arrasate |
|---|---|---|---|
| `icon_eu` | -23.5, 29.5 | 0.0625 degrees | 5.09 / 6.94 km |
| `meteofrance_arome_france` | -12.0, 37.5 | 0.025 degrees | 2.04 / 2.78 km |
| `meteofrance_arome_france_hd` | -12.0, 37.5 | 0.01 degrees | 0.81 / 1.11 km |

Open-Meteo documents nominal model resolutions of approximately 7, 2.5 and
1.5 km respectively. The angular output-grid spacing is not a new claim of
native model accuracy, independent observations or field-scale precision.

**Geometry-based zone enumeration**

Using the published regular grids, construct nearest-grid assignment rectangles
at half the spacing around each center and intersect them with the selected
polygon. Enumerate every intersecting rectangle, not just centers found by
sparse sampling or centers lying inside the selection. A contributing weather
center may be outside the user's polygon or outside Gipuzkoa.

| Original square side | Selected area after clipping to Gipuzkoa | ICON-EU zones | AROME zones | AROME HD zones |
|---|---|---|---|---|
| 0.5 km | 0.25 square km | 1 | 2 | 1 |
| 5 km | 23.42 square km | 4 | 12 | 33 |
| 20 km | 267.47 square km | 16 | 61 | 337 |
| 60 km | 1266.88 square km | 55 | 267 | 1513 |

These are computed API grid-assignment zones, not field observations or a count
of completed FWI assessments. The union of clipped zones matched each selection,
with overlap and uncovered fractions below 1e-9 in the geometry checks.
An initial small selection returned only one sampled AROME center despite
intersecting two zones: a fixed point sample can miss edge fragments even for
a small area. Size alone is not a valid one-zone/many-zone rule.

For the 5 km selection, all 4, 12 and 33 zone centers were subsequently queried,
including centers outside the selection. All 49 centers matched their expected
grid positions and returned complete 48-hour series for the four required
variables. Other selections were sampled, not exhaustively queried for weather.
GeoJSON examples of the three complete 5 km partitions were saved as experiment
artifacts with `fwi: null` and `status: NOT_CALCULATED`; they are not real danger
maps.

**Historical input availability**

The Historical Forecast API was also queried for Arrasate (-2.49, 43.08),
Donostia (-1.9812, 43.3183) and a third interior point (-2.4, 43.28).
For each of the three explicit models, all three points returned 1104
consecutive hourly timestamps from 2026-09-10 through 2026-10-25, with no null
values in temperature, relative humidity, wind or precipitation. Historical
grid centers matched the same model-grid definition.

Successful recent multi-point requests took approximately 0.24-0.49 seconds;
the three-location 46-day historical requests took approximately 0.63-0.79
seconds, measured client-side. These are single-run observations, not latency
guarantees, rate-limit evidence or full-assessment benchmarks.

**Implications and remaining work**

- AROME France HD is a promising higher-spatial-detail candidate for the
  prototype because required inputs and a matching historical series were
  returned in these checks. It had not been selected at the time of the
  experiment; the subsequent 2026-10-29 MVP decision is recorded above.
  It has not been proven more accurate locally than the other models.
- Prefer the versioned full exposed grid and nearest-cell rule over arbitrary
  subdivisions or Voronoi regions built from an incomplete sample of centers.
  This recommendation is specific to the verified regular grids and explicit
  `nearest` selection. Default `land` selection and elevation adjustments need
  separate behavior checks if adopted.
- Identify/cache cells by model, grid version and integer indices rather than
  raw floating-point center strings. Clip geometry to the selection and retain
  source-cell provenance; never infer extra independent detail from terrain.
- A broad selection can intersect over a thousand higher-detail zones. Test
  batched retrieval, upstream usage accounting, reusable daily states and
  result-transfer size before committing to full-region operational behavior.
  No selection-size cap or asynchronous-job workflow was introduced.
- Forty-six complete days do not establish sufficient FWI spin-up or drought
  initialization. Reference-time/rainfall alignment, initialization sensitivity,
  historical/model revisions, scientific calculation validation and comparison
  with local observations remain pending.
- Free-hosted-service eligibility, quotas and attribution still apply.

The reproducible Python probe, request URLs, raw responses, timestamps, summaries,
selection geometries and example clipped zones are retained in this session's
`weather-grid-results` artifacts; no dependency or runtime application changes
were needed for this experiment.

Sources inspected for this experiment:

- Model documentation: https://open-meteo.com/en/docs/historical-forecast-api
- Meteo-France variables/resolutions: https://open-meteo.com/en/docs/meteofrance-api
- API selection/downscaling parameters: https://open-meteo.com/en/docs
- Grid definitions: https://github.com/open-meteo/open-meteo/blob/03d62919c419f1eccad8dcbbcf7f92a2dd7069b4/Sources/App/MeteoFrance/MeteoFranceDomain.swift
- ICON-EU grid: https://github.com/open-meteo/open-meteo/blob/03d62919c419f1eccad8dcbbcf7f92a2dd7069b4/Sources/App/Icon/Icon.swift
- Nearest-center implementation: https://github.com/open-meteo/open-meteo/blob/03d62919c419f1eccad8dcbbcf7f92a2dd7069b4/Sources/App/Domains/RegularGrid.swift
- Available AROME HD fields: https://github.com/open-meteo/open-meteo/blob/03d62919c419f1eccad8dcbbcf7f92a2dd7069b4/Sources/App/MeteoFrance/MeteoFranceVariableDownloadable.swift

#### EUR 0 conditions and privacy

Open-Meteo's free hosted API is for non-commercial use and requires attribution. Its terms specify fewer than 10,000 calls/day, 5,000/hour, and 600/minute; the pricing page also lists a 300,000/month free allowance. Long date ranges, multiple variables/models, and multiple locations can count as more than one billable-equivalent API call.

The terms list private/nonprofit sites without ads or subscriptions and educational uses as examples of non-commercial use, and commercial products/promotional activities as commercial. A portfolio's eligibility should therefore be checked against actual use, not assumed. Data licensing (CC BY 4.0) and permission to use the free hosted service are separate.

There is no free-service availability guarantee. Do not enable paid fallback. Cache reusable model/grid data and daily calculation states; polygon size is not equivalent to one upstream call per tiny visible cell.

Open-Meteo's privacy notice states that API troubleshooting logs may include geographic coordinates and are deleted after 90 days. If adopted, reflect this in provider disclosures; temporary local selections do not mean no provider retention.

#### Other official candidates

| Candidate | Verified evidence | Unresolved or limiting factors |
|---|---|---|
| Euskalmet / Open Data Euskadi | Official station-network dataset, geographic downloads, CC BY 4.0 inventory license, link to station readings | Readings archive/API access, actual local coverage, timestamps, completeness, and readings-specific terms still need verification |
| Direct Copernicus ERA5 / ERA5-Land | Official hourly reanalysis with long histories; ERA5-Land native approximately 9 km and distributed at 0.1 degrees | More ingestion/processing work; latency, uncertainty, accumulation handling, product-specific terms, and neither is plot-scale observed weather |
| CEMS historical fire-danger dataset | Official daily ERA5-based FWI/components; native approximately 31 km and reanalysis also distributed at 0.25 degrees; NetCDF/GRIB2 | Precomputed indices rather than our own AEMET-driven calculation; coarse spatial support; actual latest date and access terms require checking |
| EFFIS operational fire-danger products | Documented Canadian FWI methodology and European danger classification | Forecast-based products must not silently replace an observation-based assessment; different inputs prevent equation-level pass/fail comparisons |

No claim has been established that one provider is more accurate locally. Open-Meteo is currently better demonstrated for convenient access to complete historical hourly input fields.

#### Recommended next step, not yet a scope decision

The research recommended evaluating an Open-Meteo historical model series for the first calculation prototype, retaining AEMET station data as a possible independent comparison source. Open-Meteo has since been approved for the prototype; the following checks remain incremental engineering work, not a requirement to finish operational validation before drawing wireframes:

1. Confirm that model-based assessments are acceptable and that free-hosted-service eligibility fits actual project use.
2. Pin a supported regional/global model and verify both historical and recent coverage at multiple Gipuzkoa locations, including all required fields and supported spatial resolution.
3. Define time/rainfall alignment, initialization, longer-history sensitivity checks, null handling, revisions, and provenance.
4. Validate a standalone Java FWI calculation against an independently versioned reference using identical weather inputs and initial states.
5. Only then connect the validated calculation to source-resolution subareas and the 3D visualization.

Do not promise an accurate fine-scale heatmap, a universally sufficient one-month warm-up, or a provider switch based solely on these successful sample requests.

#### Source register

Sources inspected on 2026-10-21:

- AEMET API specification: https://opendata.aemet.es/AEMET_OpenData_specification.json
- Canadian FWI inputs and reference examples: https://github.com/cffdrs/cffdrs_r/blob/main/R/fwi.r
- Canadian DC memory/overwintering: https://github.com/cffdrs/cffdrs_r/blob/main/R/overwinter_drought_code.r
- Reference package/license: https://cran.r-project.org/web/packages/cffdrs/index.html
- Open-Meteo historical API: https://open-meteo.com/en/docs/historical-weather-api
- Open-Meteo historical forecast methodology/model coverage: https://open-meteo.com/en/docs/historical-forecast-api
- Open-Meteo variable conventions: https://open-meteo.com/en/docs
- Open-Meteo hosted-service terms/privacy: https://open-meteo.com/en/terms
- Open-Meteo limits and call accounting: https://open-meteo.com/en/pricing
- ERA5 source description/latency: https://cds.climate.copernicus.eu/datasets/reanalysis-era5-single-levels
- ERA5-Land source description: https://cds.climate.copernicus.eu/datasets/reanalysis-era5-land
- CEMS historical indices: https://ewds.climate.copernicus.eu/datasets/cems-fire-historical-v1
- Euskalmet station inventory: https://opendata.euskadi.eus/katalogoa/-/euskadiko-estazio-meteorologikoen-sarea/

Do not turn suggestions in this document into confirmed decisions without recording the decision.

## 3. Scientific scope and safety

Keep these capabilities distinct:

| Capability | Meaning |
|---|---|
| Environmental conditions | Measurements or estimates such as wind, rainfall, humidity, vegetation condition, and terrain |
| Danger assessment | An index describing conditions favorable to wildfire, according to a documented method |
| Spread potential | Conditions favorable to spreading if an ignition occurs |
| Propagation simulation | Estimated boundaries or arrival times for a defined hypothetical ignition scenario |

A score of 80/100 is not automatically an 80% probability of ignition or spread. Use probability terminology only if the target event, time window, geographic unit, and calibration justify it.

The initial application is not an official warning system. It must not claim that an area is safe, provide evacuation instructions from an experimental model, or hide uncertainty.

Wind arrows represent wind, not a validated prediction of fire direction.

### Agreed results safety notice

Display this notice beside assessment results, including partial results, with a link to a fuller explanation:

> Experimental fire-weather assessment, not an official warning or a prediction that a fire will occur. Low danger does not mean safe. Follow current official restrictions and guidance.

This is the agreed content in the working document's language. Spanish, Basque, and English versions must be prepared and reviewed before release. The fuller explanation must cover FWI meaning, spatial resolution, data freshness, uncertainty, and the limits of general prevention guidance. The notice does not replace those explanations or the source attribution requirements.

### Calculation scope discussed on 2026-10-19

User-requested direction: investigate the public Canadian fire-weather calculation for the danger assessment, and include an animated map of possible fire progression in the final propagation increment.

FWI was subsequently confirmed as the MVP index (see section 2). The following broader presentation and propagation ideas remain proposals beyond the minimum MVP scope, and feasibility has not been completed:

| Stage | Proposed calculation/output | Interpretation |
|---|---|---|
| Initial assessment | Canadian Forest Fire Weather Index (FWI), its components, and a documented danger class | Weather-based fire danger, not the probability that a fire will occur |
| Explanation | FFMC, DMC, DC, ISI, and BUI alongside the weather inputs | Fuel-moisture codes, relative initial spread potential, and fuel availability; not direct measurements of local vegetation moisture or spread speed |
| Environmental map | Wind speed and direction, with source and valid time | Weather information, not a predicted fire trajectory |
| Final propagation increment | Time-indexed hypothetical fire perimeters or arrival times, animated in CesiumJS | Conditional scenario following a specified ignition; not an operational forecast or evacuation tool |

FWI is a system of linked calculations, not a single formula applied to one current weather snapshot. A daily implementation needs temperature, relative humidity, wind speed, preceding 24-hour precipitation, and previous moisture-code states. Specify units, the standard noon local-standard-time convention, seasonal/date and latitude handling, initialization, historical warm-up, and restart rules before implementing it. Forecast calculations also need a documented weather-input convention and issue/valid times.

Preserve the native index value; do not turn it into a percentage or assume a 0-100 upper bound. A danger category must identify its classification scheme. European thresholds support comparison but do not establish local calibration for Gipuzkoa. Missing weather or state must produce an explicit unavailable result rather than an invented assessment.

EFFIS uses the Canadian FWI system for harmonized European fire-danger assessment. This supports its selection, but does not verify the existing formula, local data availability, or implementation correctness. Compare a future implementation against trusted reference outputs with aligned inputs and conventions before evaluating its usefulness locally.

Propagation requires a separate model and suitable spatial inputs: ignition location/time, weather over the scenario, terrain slope/aspect, mapped fuel types and fuel moisture. The Canadian Fire Behaviour Prediction (FBP) system is a possible research reference, not an automatic choice: its Canadian fuel types cannot be assumed to represent Gipuzkoa. Model selection and local fuel compatibility remain open.

For the final increment, the proposed interaction is: select an ignition point and scenario start time, run a bounded scenario, then play/pause or scrub through estimated fire perimeters. Display assumptions, input resolution, and limitations; do not label an arbitrary buffer or a wind-driven animation as a scientifically validated spread simulation. Spotting, changing winds, and suppression can substantially alter real outcomes.

Scientific reference:

- EFFIS fire-danger methodology, components, classification, and original equation reference: https://forest-fire.emergency.copernicus.eu/about-effis/technical-background/fire-danger-forecast

### FWI calculation specification kickoff (2026-10-21)

The initial literature search identified the equation reference cited by EFFIS: Van Wagner, C.E. and Pickett, T.L. (1985), *Equations and FORTRAN program for the Canadian Forest Fire Weather Index System*, Forestry Technical Report 33, 18 pages, Canadian Forestry Service, catalog ID 19973. Its catalog describes official equations for the 1984 system and a FORTRAN reference program. The catalog was inspected; the full equation report and program have not yet been reviewed or implemented.

Reference entry point: https://purl.org/INRMM-MiD/c-14026112 (currently redirects to an archived Canadian Forestry Service catalog page).

Calculation dependency outline:

| Stage | Role and dependencies |
|---|---|
| FFMC | Fine Fuel Moisture Code; update the previous FFMC using daily weather |
| DMC | Duff Moisture Code; update the previous DMC using relevant daily weather and seasonal factors |
| DC | Drought Code; update the previous DC using relevant daily weather and seasonal factors |
| ISI | Initial Spread Index; combine FFMC with wind speed |
| BUI | Buildup Index; combine DMC and DC |
| FWI | Combine ISI and BUI into the final relative fire-weather intensity index |

Input specification to verify against the full method: temperature in degrees Celsius, relative humidity in percent, wind speed in km/h under the required measurement/exposure convention, preceding 24-hour precipitation in mm, assessment date/location for applicable seasonal factors, and previous FFMC/DMC/DC states. Align weather with the standard noon local-standard-time convention rather than using arbitrary daily averages or daylight-saving clock noon without conversion.

Before implementation, review all piecewise equations and thresholds, valid input handling, seasonal/latitude adjustments, initialization and restart rules. Then select trusted reference test vectors or a reference implementation, record its version and matching conventions, and establish expected component outputs and numeric tolerances. Visual similarity to an EFFIS map alone is not a calculation correctness test.

The equation specification, AEMET field mapping, and classification scheme are separate concerns. Do not treat the publication citation as proof that the equations have been fully reviewed, or that AEMET supplies every required input.

## 4. Proposed product increments

The product/learning roadmap is maintained in [SubegIA.md](SubegIA.md). The preparation checklists below supply technical work for those increments; do not treat all later research as a prerequisite for the first prototype.

## 5. Pre-coding preparation

### Milestone A - Product requirements

- [x] Identify the primary audience and the problem being solved.
- [x] Write a short product brief.
- [x] Define first-release scope and explicit exclusions.
- [x] Describe the main journey: open 3D map, draw an area, inspect the FWI heatmap and subarea details, and read prevention guidance.
- [ ] Write user stories with observable acceptance criteria.
- [ ] Define supported geographic boundaries and behavior outside coverage.
- [x] Choose target devices, browsers, and interface language.
- [x] Define provisional measurable interaction and loading targets, including a test baseline.
- [ ] Define accessibility requirements and alternatives to color-only information.
- [ ] Define privacy requirements for location access, logs, and anonymous sessions.
- [ ] Write experimental-use wording and boundaries on safety claims.
- [ ] Select applicable official prevention sources and define reviewed guidance by FWI category, including baseline precautions and links to current restrictions.

Exit criterion: the initial audience, use cases, supported behavior, and exclusions are clear.

Device, browser, and language decisions are complete: desktop first, current stable Chrome/Edge/Firefox, Spanish, Basque, and English. Section 2 records user stories and acceptance criteria for drawing, dates, heatmap results, failures, guidance, privacy, and accessible alternatives, plus provisional performance targets and a WCAG 2.2 AA core-journey target. Milestone A is not complete: search/language-switch interaction details, boundary specifications, performance test fixtures and pass-rate rules, detailed accessibility evaluation, provider-specific privacy requirements, reviewed safety translations, and official guidance sources still need preparation. Data- and provider-dependent details must be resolved with the relevant feasibility milestones rather than guessed.

### Milestone B - Existing implementation, data, and calculation feasibility

- [ ] Locate and inspect the existing agent and calculation code.
- [ ] Identify the formula/index, its origin, variables, units, thresholds, and assumptions.
- [ ] Determine exactly what the output represents.
- [ ] Identify code that can be reused without making the LLM responsible for scientific calculation.
- [ ] Inventory all data sources and external API credentials required.
- [ ] Record geographic and historical coverage, resolution, update frequency, limits, licenses, and attribution.
- [ ] Obtain representative sample data for Gipuzkoa.
- [ ] Choose coordinate reference systems for storage, analysis, and display.
- [ ] Define time-zone handling, timestamps, and dataset alignment.
- [ ] Choose grid resolution and update frequency based on the weakest relevant input, not visual preference.
- [ ] Define missing, stale, invalid, and conflicting data behavior.
- [ ] Document dataset versions and calculation versions.
- [ ] Define an evaluation protocol and comparison baseline.
- [ ] Select historical cases and comparison periods/locations.

Exit criterion: one sample assessment is traceable to its inputs and calculation, and its meaning and limitations are documented.

#### Candidate sources to investigate

| Need | Candidate |
|---|---|
| Terrain elevation | IGN/CNIG digital terrain models; investigate MDT25 as a starting point |
| Slope and aspect | Derive from the terrain model using QGIS/GDAL |
| Meteorology | AEMET and suitable regional sources, subject to actual availability |
| Historical reconstruction | AEMET observations and/or Copernicus ERA5-Land, with resolution limitations |
| Fire records | MITECO EGIF |
| Burned areas and perimeters | Copernicus EFFIS and suitable regional datasets |
| Vegetation and fuels | Forest and land-cover datasets appropriate to the selected calculation method |

Use a terrain model for ground elevation, not a surface model including trees and buildings. Vegetation dryness and soil moisture are related but not interchangeable.

Reference entry points:

- IGN/CNIG: https://centrodedescargas.cnig.es/CentroDescargas/modelos-digitales-elevaciones
- AEMET OpenData: https://opendata.aemet.es/centrodedescargas/inicio
- EGIF: https://www.miteco.gob.es/es/biodiversidad/temas/incendios-forestales/estadisticas-datos.html
- EFFIS: https://forest-fire.emergency.copernicus.eu/applications/data-and-services
- ERA5-Land: https://cds.climate.copernicus.eu/datasets/reanalysis-era5-land?tab=overview

#### Evaluation requirements

For danger assessment, include both incident cases and comparison periods/locations without recorded incidents. A high-danger area may not burn because no ignition occurs.

For future propagation simulation, compare spatial extent and, when observations support it, progression over time. A final perimeter alone cannot validate hourly direction and speed. Suppression activity can change observed outcomes.

Keep whole incidents or appropriate geographic/temporal groups separate between tuning and evaluation to reduce leakage. Historical reconstruction using known weather is not equivalent to operational forecasting using the forecasts available at the time.

### Milestone C - UX and Figma

Current active milestone: lightweight desktop UX preparation. A real Figma file or clickable prototype has not been created.

A static desktop visual concept was created on 2026-10-21 at the user's request, with an offline HTML preview and SVG artwork for manual Figma import. Files: `C:\Users\Iker\.copilot\session-state\9be1ac8b-36e5-46ad-ad43-46c5d9bad66b\files\subegia-design.html` and `subegia-design.svg` in the same directory. The preview includes layout dimensions, color tokens, import instructions, and descriptions of the start/drawing/loading/results variants. Only the illustrative results frame is drawn; controls are not functional, terrain and values are fictional, and the layout is a proposal pending user review. These are not native Figma components or proof of accessibility conformance.

The user clarified that the abstract SVG terrain did not adequately represent the intended CesiumJS experience. A second artifact, `subegia-cesium.html` in the same directory, now uses CesiumJS 1.132 with actual Esri WorldElevation3D terrain and World Imagery around Aizkorri. Terrain loading was verified, including a nonzero sampled elevation. The preview supports 3D camera navigation, framing the example area, toggling illustrative ground-classified cells, and clicking cells to update sample values. Its mobile layout now demonstrates explicit map activation, a full-viewport workspace, basic draft drawing, and a collapsible conditions sheet; `subegia-mobile.html` provides a narrow-frame reference for Figma. It requires internet/WebGL, makes external tile requests, and is a visual experiment, not the Angular implementation or a production provider decision. FWI values and cell resolution are fictional; desktop free drawing, polygon editing/topology and geographic coverage validation, keyboard geometry entry, and calculation are not implemented. Provider licensing/quotas and full attribution requirements need review before production use.

English was added to the documented MVP internationalization scope on 2026-10-21. The visual artifacts currently contain draft Spanish UI or English handoff notes, not complete ES/EU/EN translations or a functioning language switch.

Proposed single-screen wireframe, pending visual review:

| Region | Content |
|---|---|
| Header | SubegIA name, visible experimental-demo label, Spanish/Basque/English switch (ES / EU / EN) |
| Main workspace | Gipuzkoa 3D terrain, search, optional locate-me control, polygon outline and FWI heatmap |
| Drawing toolbar | Start area, undo, finish, cancel; edit or clear a completed area; keyboard area-entry alternative |
| Results side panel | Selection instructions before drawing; assessment action once valid; loading, results, or explicit failure/partial-data state |
| Subarea details | Selected subarea's FWI/category, valid date, model/source and spatial-support explanation, general prevention guidance and official links |
| Legend/text alternative | Written danger categories, distinct no-data style, and access to keyboard-operable subarea results |

Interaction sketch: open -> find land -> draw/edit polygon -> request assessment -> view heatmap and text results -> inspect a subarea -> edit or clear and repeat. This is a draft layout, not a new multi-screen scope or a completed design.

- [ ] Sketch the main user flow.
- [ ] Create low-fidelity desktop wireframes; mobile remains deferred.
- [ ] Design map navigation, search, selection, and coverage boundaries.
- [ ] Design layer controls, legend, transparency, and location details.
- [ ] Display units, sources, observation/forecast times, and data freshness.
- [ ] Design the assessment explanation and uncertainty presentation.
- [ ] Include loading, no-data, stale-data, failed-request, and unavailable-service states.
- [ ] Establish reusable typography, spacing, colors, and components.
- [ ] Produce and walk through a clickable prototype.
- [ ] Review keyboard interaction and a non-color-only presentation of important results.

Exit criterion: a person can understand and follow the main journey without verbal guidance.

Figma validates interaction design, not 3D performance. Do not implement mock visuals that imply unsupported data precision.

### Milestone D - Initial architecture

Initial logical structure:

```text
Angular + CesiumJS
        |
        v
One Spring Boot application
  - Environmental data module
  - Assessment module
  - Later: assistant module
  - Later: simulation orchestration module
        |
        v
Persistent storage as justified by requirements
```

#### Agreed assessment request and validation contract (2026-10-26)

The user approved the following backend direction. This records the contract
and responsibilities; it does not mean that the Spring Boot application or
endpoint has been implemented.

**Endpoint:** `POST /api/v1/assessments`, with `Content-Type: application/json`.
The core MVP remains usable without login and requests the latest available
daily assessment, not a user-selected historical date.

Request example:

```json
{
  "area": {
    "type": "Polygon",
    "coordinates": [
      [
        [-2.49, 43.08],
        [-2.48, 43.08],
        [-2.48, 43.09],
        [-2.49, 43.09],
        [-2.49, 43.08]
      ]
    ]
  }
}
```

- `area` is a GeoJSON Polygon in WGS 84 longitude/latitude degrees, with positions
  ordered `[longitude, latitude]`. This version accepts one exterior ring and
  no holes. The first position is repeated at the end.
- Angular sends the selected geometry, not Cesium Cartesian3 objects,
  presentation colors, terrain heights or client-calculated FWI values.
- Preserve the finalized selection separately from the drawing draft so that
  clearing or cancelling a draft does not prevent request retries.
- Use Java `record` request DTOs, including `AssessmentRequest` and
  `AreaGeometryRequest`, with `@RequestBody`, `@Valid` and Bean Validation.
  DTOs are API contracts, not JPA persistence entities.
- Validate required fields, the Polygon type, exactly one ring, at least four
  positions including closure, exactly two finite numbers per position, and
  longitude/latitude ranges. Malformed JSON or a structurally invalid request
  must not reach weather-provider calls.
- A dedicated geographic validation service uses JTS to check ring closure,
  at least three distinct non-collinear vertices, nonzero surface area, valid
  topology and complete coverage by Gipuzkoa. Frontend checks do not replace
  server-side validation.
- Check the complete polygon using the equivalent of
  `gipuzkoa.covers(selectedArea)`, admitting the boundary itself. Checking
  vertices alone is insufficient; do not silently clip or repair invalid input.
  Numerical precision/tolerance rules still need to be specified and tested.
- Load a trusted, versioned Gipuzkoa boundary once at application startup,
  matching the frontend dataset prepared from geoEuskadi's
  `TERRITORIOS_5000_ETRS89.zip` (source SHA-256:
  `f42c1819495282a44518a8985fb5fd4928596a6d48118c2ed00559bd9547ab16`).
  Both geometries must use compatible coordinates. Do not accept the permitted
  boundary from the request or download it for each assessment. Missing or
  invalid boundary data must fail explicitly, never bypass coverage checks.
- Keep the controller thin: delegate geometry checks and assessment
  orchestration to services. A `@RestControllerAdvice` centralizes expected
  failure responses instead of scattering HTTP error construction through
  controller methods.

Agreed input-error distinction:

| HTTP status | Meaning | Example application code |
|---|---|---|
| `400 Bad Request` | Malformed JSON, missing fields or invalid request structure/coordinate format | `INVALID_REQUEST` |
| `422 Unprocessable Content` | Structurally accepted input with invalid polygon geometry | `INVALID_AREA_GEOMETRY` |
| `422 Unprocessable Content` | Any part of the selected polygon is outside Gipuzkoa | `AREA_OUTSIDE_COVERAGE` |

Application error codes must be stable. The example code names above are the
initial vocabulary; complete field-level errors and operational errors remain
to be defined. Angular translates user-facing messages from the application
code, not by parsing server text.

Example error response:

```json
{
  "status": 422,
  "code": "AREA_OUTSIDE_COVERAGE",
  "detail": "El area seleccionada debe estar completamente dentro de Gipuzkoa."
}
```

Do not include stack traces, credentials or complete submitted coordinates in
public errors or application logs. If input validation fails, do not call
Open-Meteo or begin the FWI calculation.

**Next contract decisions:** define the typed successful response, subarea
geometries, FWI/category fields, dates and timezone, source/model/resolution and
calculation version; specify complete, partial, unavailable and stale-data
behavior. Define operational error codes, rate/concurrency protection, payload
limits, timeouts and bounded retries without inventing an area-size cap or
committing to a queued-job workflow. Provider/model selection and FWI
initialization/time alignment remain required before calculating real results.

Keep request DTOs, scientific domain models and persistence mappings separate.
Future login and saved user areas must not become prerequisites for this
endpoint. Weather caches and daily FWI states have a different lifecycle from
private user selections; storage and retention decisions remain to be made.

- [ ] Define module responsibilities and internal interfaces.
- [ ] Keep source ingestion, normalization, calculation, and presentation responsibilities explicit.
- [ ] Define frontend API schemas, units, timestamps, provenance, and errors.
- [ ] Decide what is queried live, cached, or precomputed.
- [ ] Define dependency timeouts, bounded retries, and usage limits.
- [ ] Define configuration and secret handling.
- [ ] Plan logs, health checks, and basic resource monitoring.
- [ ] Decide how overlays are generated, stored, and delivered.
- [ ] Document important choices and alternatives in short decision records.

Exit criterion: every initial operation has an owner, a defined interface, and explicit failure behavior.

Modules should own their logic and persistence access. Other modules should use their exposed interfaces, rather than directly modifying their tables. Avoid adding network boundaries until the service-extraction increment.

Cesium rendering runs in the browser. Terrain and imagery may be loaded from an external provider; a custom backend map-rendering service is not automatically required.

### Milestone E - Database and storage

- [ ] Determine which information must persist.
- [ ] Create a conceptual entity/relationship diagram for the initial workflows.
- [ ] Consider dataset/source versions, observations or cached products, calculation versions, and assessment runs.
- [ ] Decide whether PostgreSQL/PostGIS is required for initial geographic queries.
- [ ] Separate relational/geographic metadata from large raster, tile, and result files.
- [ ] Define geographic and temporal indexes where justified.
- [ ] Define module ownership, retention, migrations, and backup/restore.
- [ ] Specify how an assessment can be reproduced.
- [ ] Model users and conversation retention only when those features are scheduled.

Exit criterion: storage decisions support the initial workflows without prebuilding every future feature.

### Milestone F - Free deployment feasibility

- [ ] Verify actual free-tier eligibility and resource availability.
- [ ] Estimate RAM, CPU, storage, traffic, and build requirements.
- [ ] Choose Docker packaging and local startup instructions.
- [ ] Identify public URL, HTTPS, routing, and persistent-storage arrangements.
- [ ] Record sleep behavior, ephemeral filesystems, quotas, and expiry policies.
- [ ] Define behavior when hosting, data, terrain, or AI limits are reached.
- [ ] Prevent unintended paid usage; do not treat budget notifications as spending caps.
- [ ] Define an alternative deployment route if the preferred free host is unavailable.
- [ ] Document server maintenance and backups if self-hosting.

Exit criterion: the complete initial stack has a feasible EUR 0 deployment route, with limitations accepted explicitly.

Hosting candidates are proposals, not decisions. A free VM may support Docker Compose if capacity and account eligibility allow it. Static frontend hosting plus backend free tiers is another option, but compute, storage, AI, terrain, and bandwidth limits must be evaluated separately.

Reference entry points; recheck current terms before choosing:

- Oracle: https://www.oracle.com/cloud/free/
- Render: https://render.com/docs/free
- Cloud Run: https://cloud.google.com/run/pricing
- Cesium ion: https://cesium.com/platform/cesium-ion/pricing/

## 6. Future agent design

The agent is deferred until reliable map/data actions exist.

- Use Spring AI as the user's preferred orchestration runtime for the future assistant within Spring Boot, rather than making the existing Python agent a deployment dependency. Provider/model selection remains open, and the assistant is not needed for MVP weather ingestion or FWI calculation.
- Evaluate tool-capable models using representative Spanish, Basque, and English queries as required by the eventual assistant language scope; MVP interface language support does not establish assistant capability.
- Keep model credentials in the backend.
- Expose a small allowlist of typed tools for querying conditions and preparing supported actions.
- Validate coordinates, dates, permissions, and budgets in application code.
- Return structured map commands; never execute arbitrary model-generated JavaScript.
- Distinguish model requests from tool executions and cap both.
- Limit input/output size, conversation history, concurrency, retries, and execution time.
- Keep danger and propagation calculations outside the LLM.
- Enforce confirmation for expensive scenarios through backend state.
- Define retention and provider privacy requirements before sending user data.

## 7. Future service extraction

Extract one module at a time for a documented reason: learning, independent deployment, runtime needs, or resource isolation.

- [ ] Select the first boundary using evidence from the working application.
- [ ] Define its network contract and backward-compatibility approach.
- [ ] Establish independent data ownership and migrations.
- [ ] Add service authentication where needed, timeouts, and controlled failure handling.
- [ ] Add request correlation and service-level observability.
- [ ] Prove independent build and deployment.
- [ ] Recheck the EUR 0 resource budget.

Several services may share a host or repository. They should not directly modify each other's tables. A gateway application, Kubernetes, Kafka, and service discovery are not automatic requirements.

## 8. Working organization

Use one repository initially, with:

| Location/tool | Responsibility |
|---|---|
| GitHub Project | Backlog and milestone visibility |
| GitHub Issues | Bounded work with acceptance criteria and dependencies |
| Figma | User flows, wireframes, visual components, and prototype |
| Repository documentation | Requirements, data dictionary, calculation specification, diagrams, decisions, and operating instructions |

Suggested board: Backlog -> Ready -> In progress -> Review -> Done.

Keep one main task in progress at a time. Every task should state:

- Intended outcome and scope.
- Acceptance criteria.
- Actual dependencies.
- Evidence needed to consider it complete.

For each increment: clarify -> design what is needed -> implement -> evaluate -> deploy when feasible -> review.

Do not design the entire future system in detail before starting increment 1. Complete the initial preparation, then refine each later increment just before implementation.

Small, disposable technical experiments are allowed during preparation when needed to verify data access, Cesium behavior, or hosting feasibility. They are not a commitment to production architecture.

## 9. Immediate next actions

1. Review the proposed single-screen desktop layout and create a lightweight wireframe/Figma flow.
2. Define the smallest frontend/backend contract and model-input choices needed for a working slice.
3. Set up Angular/CesiumJS and one modular Spring Boot application, then implement terrain navigation and polygon selection.
4. Implement a small FWI calculation verified against reference examples and integrate the approved Open-Meteo source with explicit assumptions.
5. Connect source-supported subarea results, the heatmap, and the side panel, including loading and missing-data states.
6. Check deployment feasibility against the EUR 0 budget and complete the remaining requirements incrementally.

Do not reopen the completed audience/product-brief decisions or require operational scientific validation before UX work. Existing agent inspection is optional reference work, not a dependency for the new implementation.

## 10. Instructions for continuing in another session

Read [SubegIA.md](SubegIA.md) first, then this document, and use the latest confirmed decisions.

- Start with one modular Spring Boot backend, not microservices from day one.
- Do not assume any checklist task or implementation has been completed.
- Review the actual existing calculation before choosing a replacement or describing it as validated.
- Do not invent missing data sources, formula semantics, probabilities, or hosting guarantees.
- Ask one focused question at a time when a significant unresolved decision blocks progress.
- Update the main document for goals/scope changes and this document for library, architecture, calculation, and engineering decisions.
- Keep implementation changes incremental and tied to acceptance criteria.
- Prioritize the confirmed learning-demo scope and Open-Meteo prototype decision; do not turn deferred operational research into a prerequisite for every working slice.
