# Frontend

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 22.1.4.

## Map rendering

Cesium uses on-demand rendering (`requestRenderMode`) with a fixed simulation
clock. Camera movement, tile loading and viewport resizing trigger Cesium's
normal render requests; heatmap visibility, drawing edits and asynchronously
added buildings explicitly request a frame. A settled scene does not redraw
continuously while the user reads or scrolls the page. Terrain, imagery,
resolution and visual quality are unchanged.

## Example information panel

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
