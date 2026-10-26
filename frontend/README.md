# Frontend

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 22.1.4.

## Map rendering

### Gipuzkoa boundary dataset

`public/geo/gipuzkoa.geojson` contains only Gipuzkoa (province code `20`) from
geoEuskadi's [Basque Country administrative boundaries dataset](https://www.geo.euskadi.eus/limites-administrativos-del-pais-vasco/webgeo00-content/es/).
The [source archive](https://www.geo.euskadi.eus/cartografia/DatosDescarga/Limites/TERRITORIOS_5000_ETRS89.zip)
was downloaded on 2026-10-26 (SHA-256:
`f42c1819495282a44518a8985fb5fd4928596a6d48118c2ed00559bd9547ab16`).

The source Shapefile was filtered by `PRO_PROV = '20'` and reprojected from
ETRS89 / UTM zone 30N (EPSG:25830) to WGS 84 longitude/latitude (EPSG:4326).
The GeoJSON preserves all four polygon parts and 84,413 coordinate positions
without simplification, in one MultiPolygon feature.
The map loads `/geo/gipuzkoa.geojson` during initialization, outside Angular,
through `loadGipuzkoaShape()` and Cesium's GeoJSON loader. Each polygon part is
displayed as a red terrain-clamped polyline, with no fill. The boundary remains
visible independently of the example heatmap and drawing controls; the initial
camera still frames the example area. A boundary loading failure uses the
existing map error screen. The same loaded polygon parts and holes are retained
in longitude/latitude for point-in-polygon checks with Turf. Before adding a
drawing vertex, the terrain position is converted to longitude/latitude; points
outside Gipuzkoa are rejected with an ES/EU/EN alert without changing the draft.
Boundary points are included. A missing boundary also blocks vertex entry with
an explicit message. A subsequent accepted point clears the error.
Drawing preserves click order. Each candidate outline, including its closing
edge, is checked for crossings, nonadjacent touches, overlapping sides and
zero-area geometry using robust orientation predicates. Invalid points leave
the existing draft unchanged and show a translated error. Finalization repeats
the outline check before replacing the previous selection.
Checking that every edge and the full selected surface stay within Gipuzkoa
is still pending.

There is one active selected area. To replace it, draw and finish another;
cancelling a new draft preserves the previous selection. No separate delete
control or multiple-area workflow is included in this increment.

License: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
Attribution: **Eusko Jaurlaritza / Gobierno Vasco. geoEuskadi.**
The boundary data source displays attribution and the license link in Cesium's
on-screen credits.
The publisher states that this dataset does not have the legal status of
official cartography and that some boundary lines are provisional; it is not
a property-boundary authority.

Cesium uses on-demand rendering (`requestRenderMode`) with a fixed simulation
clock. Camera movement, tile loading and viewport resizing trigger Cesium's
normal render requests; heatmap visibility, drawing edits and asynchronously
added buildings explicitly request a frame. A settled scene does not redraw
continuously while the user reads or scrolls the page. Terrain, imagery,
resolution and visual quality are unchanged.

## Initial map loading

An Earth loading overlay covers the complete map workspace while the initial
view loads. Map controls, the FWI legend and the projected information panel
remain hidden and unavailable to keyboard interaction until the camera is
framed, imagery providers are ready and a frame renders with globe tiles loaded.
The local `public/icons/earth.svg` uses a sage CSS mask and a slow rotation;
reduced-motion preferences disable the animation.

Loading/error messages use ES/EU/EN translations. Import, terrain, imagery,
framing and rendering failures are logged and exposed to the user. After 45
seconds an unfinished load shows an error rather than spinning indefinitely;
the recovery button explicitly reloads the page. Readiness listeners and the
timeout are cleaned up on completion, failure and teardown. Normal map navigation
does not restart this loader, and optional 3D buildings do not block readiness.

## Example information panel

Exploration controls, drawing actions, point-count instructions and drawing
errors use ES/EU/EN translations. Drawing errors store translation keys so an
already visible message also updates when the language changes.

The explore view displays the information panel below the map on phones and
alongside it from 800 CSS pixels upward. It uses the
shared Bosque mineral palette and ES/EN/EU translations from `public/i18n`.
The C2 cell, FWI value of 27.4 and High category are static design examples, not
map-selection results or calculated assessments. The panel includes map context,
Figma design notes, safety warnings and an in-page limitations link. Terrain and
imagery still come from the existing Cesium viewer's external services.

During fullscreen exploration below 800 CSS pixels, the map takes the space above a bottom conditions
button (normally a 90/10 viewport split, with a minimum touch-friendly bar height).
The collapsed sheet is a rounded, full-width text toggle. Opening it grows the
sheet to at most 80% of the viewport, with "Hide conditions" at the top and the
same panel scrolling underneath. The sheet slides over a fixed-size map using
`transform`, rather than animating height and resizing Cesium on every frame.
The toggle also keeps a fixed height. Attribution uses Cesium's `creditContainer`
option and stays at the top of the fullscreen map, clear of the sheet.
Opening and closing ease over 360 ms with a content fade. Reduced-motion settings
disable these transitions; closed content is inert and hidden from assistive technology.
`conditionsOpen` controls visibility and `ng-content` projects the panel from the
explore component without duplicating it or recreating the viewer. Escape closes
the sheet and returns focus to the button without scrolling. Drawing closes and disables the sheet,
and leaving exploration resets it.

Global styles lock page scrolling while the map has its `fullScreen` class,
without disabling the information panel's internal scrolling. Closing the map or
removing its component automatically releases the lock.

At 800 CSS pixels and above, exploration keeps the same panel visible in the
right-hand column, without a conditions toggle or bottom-sheet animation.
The map fills the left column's height. Crossing the breakpoint resets the sheet
to its collapsed state and moves focus out of controls/content that become hidden.

The example FWI legend is hidden on phones and displayed from the 800 CSS-pixel
media query. Its six labelled swatches use the map's category colors and include
an explicit fictitious-cell notice. It hides during drawing or when the heatmap
is hidden, and sits clear of the example controls during fullscreen exploration.

## Project section and navigation

The project section follows the explore view at `#project`. It presents the
project's purpose and its Explore, Understand and Build pillars, followed by a
notice that the MVP and calculations are not implemented. Copy is available in Spanish, English and
Basque. Cards stack on mobile and form three columns on desktop.

The following section at `#howWorks` explains the planned MVP in three ordered
steps: area selection, FWI calculation and exploring results. It matches the
same responsive layout and languages, and links to the EFFIS explanation of FWI.
This is explanatory content, not an implementation of the planned calculations.

The final section at `#limitations` covers data, scale, history, update delays,
scope and official guidance, with a return link to `#explore`. The map panel's
provider notice keeps its own `#map-limitations` anchor so it remains reachable
within fullscreen exploration without duplicating the page navigation target.
The existing layout footer shows the educational/non-emergency disclaimer and
provisional-design notice in all three supported languages.

The header remains fixed while scrolling. Its reserved layout height and the
page's anchor offset share `--header-height` to keep content clear of navigation.
Fullscreen map exploration remains above the header.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
