import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { vi } from 'vitest';
import * as Cesium from 'cesium';
import { CesiumMapComponent } from './cesium-map.component';
import { createExampleCells, EXAMPLE_AREA_COORDINATES, type Coordinate } from './example-area';
import es from '../../../../../../../../public/i18n/es.json';
import en from '../../../../../../../../public/i18n/en.json';
import eu from '../../../../../../../../public/i18n/eu.json';

describe('CesiumMapComponent', () => {
  const initializeMap = CesiumMapComponent.prototype['initMap'];
  let component: CesiumMapComponent;
  let fixture: ComponentFixture<CesiumMapComponent>;

  beforeEach(async () => {
    vi.stubGlobal('innerWidth', 799);
    CesiumMapComponent.prototype['initMap'] = async () => undefined;
    await TestBed.configureTestingModule({
      imports: [CesiumMapComponent],
      providers: [provideTranslateService({ lang: 'es' })],
    }).compileComponents();

    TestBed.inject(TranslateService).setTranslation('es', es);
    fixture = TestBed.createComponent(CesiumMapComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
    component.mapLoading.set(false);
    await fixture.whenStable();
  });

  afterEach(() => {
    CesiumMapComponent.prototype['initMap'] = initializeMap;
    vi.unstubAllGlobals();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('initial map loading', () => {
    it('only exposes the loading status until the map is ready on phone and wide layouts', async () => {
      const element: HTMLElement = fixture.nativeElement;
      for (const width of [390, 800, 1280]) {
        vi.stubGlobal('innerWidth', width);
        component.updateLayout();
        component.mapLoading.set(true);
        await fixture.whenStable();

        expect(element.querySelector('.map-loading [aria-hidden="true"]')).not.toBeNull();
        expect(element.querySelector('.map-loading[role="status"]')?.textContent)
          .toContain(es.mapLoading.message);
        expect(element.querySelector('.map-viewport')?.hasAttribute('inert')).toBe(true);
        expect(element.querySelector('.map-viewport')?.getAttribute('aria-hidden')).toBe('true');
        expect(element.querySelector('.conditions-sheet')?.hasAttribute('hidden')).toBe(true);
        component.toggleInteraction();
        expect(component.interactive()).toBe(false);
      }

      component.mapLoading.set(false);
      await fixture.whenStable();
      expect(element.querySelector('.map-loading')).toBeNull();
      expect(element.querySelector('.map-viewport')?.hasAttribute('inert')).toBe(false);
      expect(element.querySelector('.conditions-sheet')?.hasAttribute('hidden')).toBe(false);
    });

    it('translates loading and failure messages without exposing map controls after failure', async () => {
      const element: HTMLElement = fixture.nativeElement;
      for (const [language, translations] of Object.entries({ es, en, eu })) {
        const translate = TestBed.inject(TranslateService);
        translate.setTranslation(language, translations);
        translate.use(language);
        component.mapLoading.set(true);
        component.mapError.set(false);
        await fixture.whenStable();
        expect(element.querySelector('.map-loading')?.textContent).toContain(translations.mapLoading.message);
        expect(element.querySelector('.loading-hint')?.textContent).toBe(translations.mapLoading.hint);

        component.mapLoading.set(false);
        component.mapError.set(true);
        await fixture.whenStable();
        expect(element.querySelector('[role="alert"]')?.textContent).toBe(translations.mapLoading.error);
        expect(element.querySelector('.reload-map')?.textContent?.trim()).toBe(translations.mapLoading.reload);
        expect(element.querySelector('.globe')).toBeNull();
        expect(element.querySelector('.map-viewport')?.hasAttribute('inert')).toBe(true);
        expect(element.querySelector('.conditions-sheet')?.hasAttribute('hidden')).toBe(true);
        component.toggleInteraction();
        expect(component.interactive()).toBe(false);
      }
    });

    const makeLoadingViewer = () => {
      const scene = {
        postRender: new Cesium.Event(),
        renderError: new Cesium.Event(),
        requestRender: vi.fn(),
        globe: { tilesLoaded: false },
      };
      const terrainProvider = { errorEvent: new Cesium.Event() };
      const imageryProvider = { errorEvent: new Cesium.Event() };
      const layer = {
        ready: true,
        imageryProvider,
        readyEvent: new Cesium.Event(),
        errorEvent: new Cesium.Event(),
      };
      Object.defineProperty(component, 'viewer', {
        value: {
          scene,
          terrainProvider,
          imageryLayers: { length: 1, get: () => layer },
          destroy: vi.fn(),
        },
        writable: true,
      });
      return { scene, terrainProvider, imageryProvider, layer };
    };

    it('waits for framing and a rendered frame with loaded tiles, then removes its listeners', async () => {
      const { scene, terrainProvider, imageryProvider } = makeLoadingViewer();
      let finishFraming!: (success: boolean) => void;
      const framing = new Promise<boolean>(resolve => { finishFraming = resolve; });
      const ready = vi.fn();
      const pending = component['waitForGlobeTiles'](component['viewer']!, framing).then(ready);
      scene.globe.tilesLoaded = true;
      scene.postRender.raiseEvent();
      await Promise.resolve();
      expect(ready).not.toHaveBeenCalled();
      finishFraming(true);
      await Promise.resolve();
      expect(scene.requestRender).toHaveBeenCalled();
      scene.globe.tilesLoaded = false;
      scene.postRender.raiseEvent();
      await Promise.resolve();
      expect(ready).not.toHaveBeenCalled();
      scene.globe.tilesLoaded = true;
      scene.postRender.raiseEvent();
      await pending;
      expect(ready).toHaveBeenCalledOnce();
      expect(scene.postRender.numberOfListeners).toBe(0);
      expect(scene.renderError.numberOfListeners).toBe(0);
      expect(terrainProvider.errorEvent.numberOfListeners).toBe(0);
      expect(imageryProvider.errorEvent.numberOfListeners).toBe(0);
    });

    it('rejects a failed framing operation rather than presenting it as a ready map', async () => {
      makeLoadingViewer();
      await expect(component['waitForGlobeTiles'](
        component['viewer']!, Promise.resolve(false),
      )).rejects.toThrow('Could not frame');
    });

    it('does not reveal the map before its imagery provider is ready', async () => {
      const { scene, layer, imageryProvider } = makeLoadingViewer();
      layer.ready = false;
      scene.globe.tilesLoaded = true;
      const ready = vi.fn();
      const pending = component['waitForGlobeTiles'](
        component['viewer']!, Promise.resolve(true),
      ).then(ready);
      await Promise.resolve();
      scene.postRender.raiseEvent();
      await Promise.resolve();
      expect(ready).not.toHaveBeenCalled();
      layer.ready = true;
      layer.readyEvent.raiseEvent(imageryProvider);
      scene.postRender.raiseEvent();
      await pending;
      expect(ready).toHaveBeenCalledOnce();
      expect(layer.readyEvent.numberOfListeners).toBe(0);
    });

    for (const source of ['terrain', 'imagery', 'render', 'imagery layer'] as const) {
      it(`rejects ${source} failures and cleans up loading listeners`, async () => {
        const { scene, terrainProvider, imageryProvider, layer } = makeLoadingViewer();
        const pending = component['waitForGlobeTiles'](component['viewer']!, Promise.resolve(true));
        const error = new Error(`${source} failed`);
        if (source === 'terrain') terrainProvider.errorEvent.raiseEvent(error);
        else if (source === 'imagery') imageryProvider.errorEvent.raiseEvent(error);
        else if (source === 'imagery layer') layer.errorEvent.raiseEvent(error);
        else scene.renderError.raiseEvent(scene, error);
        await expect(pending).rejects.toBe(error);
        expect(scene.postRender.numberOfListeners).toBe(0);
        expect(layer.errorEvent.numberOfListeners).toBe(0);
      });
    }

    it('logs and exposes failure, including a timeout, without keeping the spinner or listeners', async () => {
      const { scene } = makeLoadingViewer();
      component.mapLoading.set(true);
      const pending = component['waitForGlobeTiles'](component['viewer']!, Promise.resolve(true));
      const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      try {
        const error = new Error('Initial map loading exceeded 45 seconds');
        component['failMapLoad'](error);
        await expect(pending).rejects.toThrow('cancelled');
        expect(log).toHaveBeenCalledWith('Could not load the map', error);
        expect(component.mapLoading()).toBe(false);
        expect(component.mapError()).toBe(true);
        expect(scene.postRender.numberOfListeners).toBe(0);
      } finally {
        log.mockRestore();
      }
    });

    it('cancels the pending load and removes listeners when the component is destroyed', async () => {
      const { scene, layer } = makeLoadingViewer();
      const pending = component['waitForGlobeTiles'](component['viewer']!, Promise.resolve(true));
      fixture.destroy();
      await expect(pending).rejects.toThrow('cancelled');
      expect(scene.postRender.numberOfListeners).toBe(0);
      expect(layer.readyEvent.numberOfListeners).toBe(0);
      expect(layer.errorEvent.numberOfListeners).toBe(0);
    });
  });

  describe('example conditions', () => {
    const panel = () => fixture.nativeElement.querySelector('#map-conditions') as HTMLDivElement;
    const toggle = () => fixture.nativeElement.querySelector('.conditions-button') as HTMLButtonElement;

    it('keeps the panel in the page and does not show the toggle before exploration', () => {
      expect(panel().classList.contains('conditions-hidden')).toBe(false);
      expect(toggle()).toBeNull();
      component.toggleConditions();
      expect(component.conditionsOpen()).toBe(false);
    });

    it('opens and closes the panel with the fullscreen conditions button', async () => {
      component.toggleInteraction();
      await fixture.whenStable();

      expect(panel().classList.contains('conditions-hidden')).toBe(true);
      expect(panel().hasAttribute('inert')).toBe(true);
      expect(panel().getAttribute('aria-hidden')).toBe('true');
      expect(toggle().getAttribute('aria-expanded')).toBe('false');
      expect(toggle().getAttribute('aria-controls')).toBe(panel().id);
      expect(toggle().textContent?.trim()).toBe(es.mapConditions.show);
      expect(toggle().parentElement).toBe(panel().parentElement);
      expect(toggle().nextElementSibling).toBe(panel());
      const panelFocus = vi.spyOn(panel(), 'focus');

      toggle().click();
      await fixture.whenStable();

      expect(component.conditionsOpen()).toBe(true);
      expect(panel().classList.contains('conditions-hidden')).toBe(false);
      expect(panel().hasAttribute('inert')).toBe(false);
      expect(panel().hasAttribute('aria-hidden')).toBe(false);
      expect(panelFocus).toHaveBeenCalledWith({ preventScroll: true });
      expect(panel().classList.contains('conditions-expanded')).toBe(true);
      expect(toggle().getAttribute('aria-expanded')).toBe('true');
      expect(toggle().textContent?.trim()).toBe(es.mapConditions.hide);
      expect(panel().parentElement?.classList.contains('sheet-open')).toBe(true);
      expect(fixture.nativeElement.querySelector('.mapExampleControls').classList.contains('hidden'))
        .toBe(false);

      const buttonFocus = vi.spyOn(toggle(), 'focus');
      toggle().click();
      await fixture.whenStable();

      expect(component.conditionsOpen()).toBe(false);
      expect(panel().classList.contains('conditions-hidden')).toBe(true);
      expect(panel().parentElement?.classList.contains('sheet-open')).toBe(false);
      expect(buttonFocus).toHaveBeenCalledWith({ preventScroll: true });
      expect(fixture.nativeElement.querySelector('.mapExampleControls').classList.contains('hidden'))
        .toBe(false);
    });

    it('closes the panel with Escape', async () => {
      component.toggleInteraction();
      component.toggleConditions();
      await fixture.whenStable();

      panel().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await fixture.whenStable();

      expect(component.conditionsOpen()).toBe(false);
      expect(panel().classList.contains('conditions-hidden')).toBe(true);
    });

    it('restores the page panel on exit and starts collapsed on the next exploration', async () => {
      component.toggleInteraction();
      component.toggleConditions();
      await fixture.whenStable();
      component.toggleInteraction();
      await fixture.whenStable();

      expect(component.conditionsOpen()).toBe(false);
      expect(panel().classList.contains('conditions-hidden')).toBe(false);
      expect(panel().classList.contains('conditions-expanded')).toBe(false);
      expect(toggle()).toBeNull();

      component.toggleInteraction();
      await fixture.whenStable();
      expect(panel().classList.contains('conditions-hidden')).toBe(true);
    });

    it('closes the sheet and disables its toggle while drawing', async () => {
      component.toggleInteraction();
      component.toggleConditions();
      component.drawArea();
      await fixture.whenStable();

      expect(component.conditionsOpen()).toBe(false);
      expect(toggle().disabled).toBe(true);
      expect(panel().classList.contains('conditions-hidden')).toBe(true);
      component.toggleConditions();
      expect(component.conditionsOpen()).toBe(false);

      component.cancelDrawing();
      await fixture.whenStable();
      expect(toggle().disabled).toBe(false);
      expect(panel().classList.contains('conditions-hidden')).toBe(true);
    });

    it('keeps conditions visible as an aside at 800px, including while drawing', async () => {
      vi.stubGlobal('innerWidth', 800);
      window.dispatchEvent(new Event('resize'));
      component.toggleInteraction();
      await fixture.whenStable();

      expect(toggle()).toBeNull();
      expect(panel().parentElement?.classList.contains('sheet-fullscreen')).toBe(false);
      expect(panel().classList.contains('conditions-hidden')).toBe(false);
      expect(panel().hasAttribute('inert')).toBe(false);
      expect(panel().hasAttribute('aria-hidden')).toBe(false);
      component.toggleConditions();
      expect(component.conditionsOpen()).toBe(false);

      component.drawArea();
      await fixture.whenStable();
      expect(panel().hasAttribute('inert')).toBe(false);
      expect(panel().classList.contains('conditions-hidden')).toBe(false);
    });

    it('switches between the aside and a collapsed sheet without recreating the panel', async () => {
      component.toggleInteraction();
      component.toggleConditions();
      await fixture.whenStable();
      const originalPanel = panel();
      toggle().focus();

      vi.stubGlobal('innerWidth', 800);
      window.dispatchEvent(new Event('resize'));
      await fixture.whenStable();

      expect(panel()).toBe(originalPanel);
      expect(component.conditionsOpen()).toBe(false);
      expect(toggle()).toBeNull();
      expect(document.activeElement).toBe(panel());

      vi.stubGlobal('innerWidth', 799);
      window.dispatchEvent(new Event('resize'));
      await fixture.whenStable();

      expect(panel()).toBe(originalPanel);
      expect(panel().hasAttribute('inert')).toBe(true);
      expect(toggle().getAttribute('aria-expanded')).toBe('false');
      expect(document.activeElement).toBe(toggle());
    });

    it('moves focus to drawing controls when the aside becomes hidden during drawing', async () => {
      vi.stubGlobal('innerWidth', 800);
      window.dispatchEvent(new Event('resize'));
      component.toggleInteraction();
      component.drawArea();
      await fixture.whenStable();
      panel().focus();

      vi.stubGlobal('innerWidth', 799);
      window.dispatchEvent(new Event('resize'));
      await fixture.whenStable();

      expect(panel().hasAttribute('inert')).toBe(true);
      expect(toggle().disabled).toBe(true);
      expect(document.activeElement).toBe(
        fixture.nativeElement.querySelector('.drawingPanel .closeMap'),
      );
    });
  });

  it('only includes functional example controls', () => {
    const element: HTMLElement = fixture.nativeElement;
    const buttons = element.querySelectorAll('.mapExampleControls button');

    expect(buttons).toHaveLength(2);
    expect(buttons[0].textContent?.trim()).toBe('Ver area de ejemplo');
    expect(buttons[1].textContent?.trim()).toBe('Ocultar heatmap');
    expect(element.textContent).not.toContain('Centrar terreno');
  });

  it('shows six ordered legend swatches matching the example map colors in every language', async () => {
    const translate = TestBed.inject(TranslateService);
    const element: HTMLElement = fixture.nativeElement;
    for (const [language, translations] of Object.entries({ es, en, eu })) {
      translate.setTranslation(language, translations);
      translate.use(language);
      await fixture.whenStable();
      expect(element.querySelector('#fwi-legend-title')?.textContent)
        .toBe(translations.mapLegend.title);
      const swatches = element.querySelectorAll<HTMLLIElement>('.legend-scale li');
      expect(swatches).toHaveLength(6);
      component.dangerLevels.forEach((level, index) => {
        expect(swatches[index].getAttribute('aria-label')).toBe(translations.mapLegend.levels[level]);
        expect(swatches[index].title).toBe(translations.mapLegend.levels[level]);
        const expected = document.createElement('span');
        expected.style.backgroundColor = component.colors[level];
        expect(swatches[index].style.backgroundColor).toBe(expected.style.backgroundColor);
      });
      expect(element.querySelector('.legend-range')?.textContent).toContain(translations.mapLegend.lower);
      expect(element.querySelector('.legend-range')?.textContent).toContain(translations.mapLegend.higher);
      expect(element.querySelector('.fwi-legend > p')?.textContent).toBe(translations.mapLegend.notice);
    }
  });

  it('hides the legend when the heatmap is hidden or an area is being drawn', async () => {
    const element: HTMLElement = fixture.nativeElement;
    const legend = element.querySelector('.fwi-legend');
    expect(legend?.classList.contains('hidden')).toBe(false);
    component.toggleHeatMap();
    await fixture.whenStable();
    expect(legend?.classList.contains('hidden')).toBe(true);
    component.toggleHeatMap();
    component.toggleInteraction();
    component.drawArea();
    await fixture.whenStable();
    expect(legend?.classList.contains('hidden')).toBe(true);
    component.cancelDrawing();
    await fixture.whenStable();
    expect(legend?.classList.contains('hidden')).toBe(false);
  });

  it('keeps the decorative headline and fixed location label off the map', () => {
    const element: HTMLElement = fixture.nativeElement;

    expect(element.querySelector('.mapHeadline')).toBeNull();
    expect(element.textContent).not.toContain('Gipuzkoa / Arrasate');
    expect(element.textContent).not.toContain('El tiempo es el protagonista');
  });

  it('should hide the panels and show the controls when map interaction is enabled', async () => {
    const element: HTMLElement = fixture.nativeElement;
    const button = element.querySelector<HTMLButtonElement>('.toggleMapInteraction');

    button?.click();
    await fixture.whenStable();

    expect(component.interactive()).toBe(true);
    expect(element.querySelector('.exploreMapContainer')?.classList.contains('hidden')).toBe(true);
    expect(element.querySelector('.mapControls')?.classList.contains('hidden')).toBe(false);
  });

  it('should define a terrain-clamped example area with a closed outline', () => {
    const area = component['createExampleArea'](Cesium);
    const time = Cesium.JulianDate.now();
    const hierarchy: Cesium.PolygonHierarchy = area.polygon!.hierarchy!.getValue(time);
    const outline: Cesium.Cartesian3[] = area.polyline!.positions!.getValue(time);

    expect(area.id).toBe('example-area');
    expect(hierarchy.positions).toHaveLength(4);
    expect(outline).toEqual([...hierarchy.positions, hierarchy.positions[0]]);
    expect(area.polygon!.heightReference!.getValue(time)).toBe(
      Cesium.HeightReference.CLAMP_TO_GROUND,
    );
    expect(area.polygon!.classificationType!.getValue(time)).toBe(
      Cesium.ClassificationType.TERRAIN,
    );
    expect(area.polyline!.clampToGround!.getValue(time)).toBe(true);
    expect(area.polyline!.width!.getValue(time)).toBe(3);
    expect(area.polygon!.fill!.getValue(time)).toBe(false);
    expect(area.polyline!.material!.getValue(time).color).toEqual(
      Cesium.Color.fromCssColorString('#b9d3a2'),
    );

    const expectedCoordinates = [
      [-2.483456, 43.085270],
      [-2.485437, 43.080325],
      [-2.487209, 43.071158],
      [-2.492587, 43.088082],
    ];

    hierarchy.positions.forEach((position, index) => {
      const point = Cesium.Cartographic.fromCartesian(position);
      expect(Cesium.Math.toDegrees(point.longitude)).toBeCloseTo(expectedCoordinates[index][0], 6);
      expect(Cesium.Math.toDegrees(point.latitude)).toBeCloseTo(expectedCoordinates[index][1], 6);
    });

    const geometry = Cesium.PolygonGeometry.createGeometry(new Cesium.PolygonGeometry({
      polygonHierarchy: hierarchy,
      vertexFormat: Cesium.VertexFormat.POSITION_ONLY,
    }));
    expect(geometry).toBeDefined();
    expect(geometry?.indices?.length).toBeGreaterThan(0);
  });

  it('should generate reproducible cells covering the area without overlaps or spillover', () => {
    const cells = createExampleCells();
    const area = (coordinates: readonly Coordinate[]) => {
      const [originX, originY] = coordinates[0];
      return Math.abs(coordinates.reduce((sum, [x, y], index) => {
        const [nextX, nextY] = coordinates[(index + 1) % coordinates.length];
        return sum + (x - originX) * (nextY - originY)
          - (nextX - originX) * (y - originY);
      }, 0)) / 2;
    };
    const isInside = ([x, y]: Coordinate) => {
      let inside = false;
      for (let i = 0; i < EXAMPLE_AREA_COORDINATES.length; i++) {
        const [ax, ay] = EXAMPLE_AREA_COORDINATES[i];
        const [bx, by] = EXAMPLE_AREA_COORDINATES[(i + 1) % EXAMPLE_AREA_COORDINATES.length];
        const cross = (x - ax) * (by - ay) - (y - ay) * (bx - ax);
        if (Math.abs(cross) < 1e-12
          && x >= Math.min(ax, bx) - 1e-12 && x <= Math.max(ax, bx) + 1e-12
          && y >= Math.min(ay, by) - 1e-12 && y <= Math.max(ay, by) + 1e-12) {
          return true;
        }
        if ((ay > y) !== (by > y) && x < ax + (y - ay) * (bx - ax) / (by - ay)) {
          inside = !inside;
        }
      }
      return inside;
    };

    expect(cells.length).toBeGreaterThan(6);
    expect(cells).toEqual(createExampleCells());
    expect(new Set(cells.map(cell => cell.id)).size).toBe(cells.length);
    expect(new Set(cells.map(cell => cell.danger)).size).toBe(6);
    expect(cells.reduce((sum, cell) => sum + area(cell.coordinates), 0)).toBeCloseTo(
      area(EXAMPLE_AREA_COORDINATES), 12,
    );

    for (const cell of cells) {
      expect(cell.coordinates.length).toBeGreaterThanOrEqual(3);
      expect(area(cell.coordinates)).toBeGreaterThan(0);
      expect(cell.coordinates.every(isInside)).toBe(true);
    }

    const bounds = cells.map(cell => ({
      west: Math.min(...cell.coordinates.map(([x]) => x)),
      east: Math.max(...cell.coordinates.map(([x]) => x)),
      south: Math.min(...cell.coordinates.map(([, y]) => y)),
      north: Math.max(...cell.coordinates.map(([, y]) => y)),
    }));
    const south = Math.min(...EXAMPLE_AREA_COORDINATES.map(([, latitude]) => latitude));
    const north = Math.max(...EXAMPLE_AREA_COORDINATES.map(([, latitude]) => latitude));
    const longitudeScale = 111_320 * Math.cos(((south + north) / 2) * Math.PI / 180);
    const sizes = bounds.map(bound => ({
      width: (bound.east - bound.west) * longitudeScale,
      height: (bound.north - bound.south) * 111_320,
    }));
    expect(sizes.every(size => size.width <= 250 + 1e-6 && size.height <= 250 + 1e-6)).toBe(true);
    expect(sizes.some(size =>
      Math.abs(size.width - 250) < 1e-6 && Math.abs(size.height - 250) < 1e-6,
    )).toBe(true);

    bounds.forEach((a, index) => {
      for (const b of bounds.slice(index + 1)) {
        const width = Math.min(a.east, b.east) - Math.max(a.west, b.west);
        const height = Math.min(a.north, b.north) - Math.max(a.south, b.south);
        expect(width <= 1e-12 || height <= 1e-12).toBe(true);
      }
    });
  });

  it('should render each cell with its danger color, terrain clamping, and demo metadata', () => {
    const time = Cesium.JulianDate.now();

    for (const cell of component.cells) {
      const entity = component['createCell'](Cesium, cell);
      const hierarchy: Cesium.PolygonHierarchy = entity.polygon!.hierarchy!.getValue(time);
      expect(entity.id).toBe(cell.id);
      expect(entity.properties!.getValue(time)).toEqual({ danger: cell.danger, demo: true });
      expect(entity.polygon!.material!.getValue(time).color).toEqual(
        Cesium.Color.fromCssColorString(component.colors[cell.danger]).withAlpha(0.55),
      );
      expect(entity.polygon!.heightReference!.getValue(time)).toBe(
        Cesium.HeightReference.CLAMP_TO_GROUND,
      );
      expect(entity.polyline!.positions!.getValue(time)).toEqual([
        ...hierarchy.positions, hierarchy.positions[0],
      ]);
      expect(entity.polyline!.clampToGround!.getValue(time)).toBe(true);
      const geometry = Cesium.PolygonGeometry.createGeometry(new Cesium.PolygonGeometry({
        polygonHierarchy: hierarchy,
        vertexFormat: Cesium.VertexFormat.POSITION_ONLY,
      }));
      expect(geometry?.indices?.length).toBeGreaterThan(0);
    }
  });

  it('should hide and restore the area and its cells without removing or recreating them', async () => {
    const entities = new Cesium.EntityCollection();
    const area = entities.add(component['createExampleArea'](Cesium));
    component['exampleArea'] = area;
    const cells = component.cells.map(cell => entities.add(component['createCell'](Cesium, cell)));
    const unrelated = entities.add(new Cesium.Entity({ id: 'unrelated-area' }));
    const materials = cells.map(cell => cell.polygon!.material);
    const element: HTMLElement = fixture.nativeElement;
    const button = Array.from(element.querySelectorAll<HTMLButtonElement>('button'))
      .find(button => button.textContent?.includes('heatmap'));

    expect(button).toBeDefined();
    expect(cells.every(cell => cell.parent === area && cell.isShowing)).toBe(true);
    component.toggleInteraction();
    await fixture.whenStable();

    for (let index = 0; index < 4; index++) {
      button!.click();
      await fixture.whenStable();
      const hidden = index % 2 === 0;

      expect(component.hiddeHeatMap()).toBe(hidden);
      expect(area.show).toBe(!hidden);
      expect(cells.every(cell => cell.isShowing === !hidden)).toBe(true);
      expect(button!.textContent?.trim()).toBe(hidden ? 'Mostrar heatmap' : 'Ocultar heatmap');
      expect(entities.values).toHaveLength(cells.length + 2);
      expect(entities.getById(area.id)).toBe(area);
      cells.forEach((cell, cellIndex) => {
        expect(entities.getById(cell.id)).toBe(cell);
        expect(cell.show).toBe(true);
        expect(cell.polygon!.material).toBe(materials[cellIndex]);
      });
      expect(unrelated.isShowing).toBe(true);
    }
  });

  it('should apply visibility toggled before the map finishes initializing', () => {
    expect(() => component.toggleHeatMap()).not.toThrow();
    const area = component['createExampleArea'](Cesium);
    component['exampleArea'] = area;
    const cell = component['createCell'](Cesium, component.cells[0]);

    expect(area.show).toBe(false);
    expect(cell.isShowing).toBe(false);

    component.toggleHeatMap();

    expect(area.show).toBe(true);
    expect(cell.isShowing).toBe(true);
  });

  describe('on-demand rendering', () => {
    const positions = [
      Cesium.Cartesian3.fromDegrees(-2.49, 43.08),
      Cesium.Cartesian3.fromDegrees(-2.48, 43.08),
      Cesium.Cartesian3.fromDegrees(-2.48, 43.09),
    ];
    let requestRender: ReturnType<typeof vi.fn>;
    let isDestroyed: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      requestRender = vi.fn();
      isDestroyed = vi.fn().mockReturnValue(false);
      Object.defineProperty(component, 'viewer', {
        value: {
          scene: {
            requestRender,
            screenSpaceCameraController: { enableInputs: false },
            canvas: document.createElement('canvas'),
          },
          isDestroyed,
          destroy: vi.fn(),
        },
        writable: true,
      });
      component['Cesium'] = Cesium;
      component['drawingSource'] = new Cesium.CustomDataSource('test-on-demand');
      component['exampleArea'] = component['createExampleArea'](Cesium);
    });

    it('requests a frame when changing heatmap visibility and entering or leaving exploration', () => {
      for (const action of [
        () => component.toggleHeatMap(),
        () => component.toggleInteraction(),
        () => component.toggleInteraction(),
      ]) {
        requestRender.mockClear();
        action();
        expect(requestRender).toHaveBeenCalledOnce();
      }
    });

    it('requests frames for draft creation, each point, undo, finishing and cancellation', () => {
      component.toggleInteraction();
      requestRender.mockClear();
      component.drawArea();
      expect(requestRender).toHaveBeenCalledOnce();

      for (const point of positions) {
        requestRender.mockClear();
        component['addDrawingPoint'](point);
        expect(requestRender).toHaveBeenCalledOnce();
      }

      requestRender.mockClear();
      component.undoDrawingPoint();
      expect(requestRender).toHaveBeenCalledOnce();
      component['addDrawingPoint'](positions[2]);
      requestRender.mockClear();
      component.finishDrawing();
      expect(requestRender).toHaveBeenCalledOnce();
      expect(component['drawingSource']?.entities.getById('drawn-area')).toBeDefined();

      component.drawArea();
      requestRender.mockClear();
      component.cancelDrawing();
      expect(requestRender).toHaveBeenCalledOnce();
    });

    it('does not render in response to invalid drawing actions or after viewer destruction', () => {
      component.undoDrawingPoint();
      component['addDrawingPoint'](positions[0]);
      expect(requestRender).not.toHaveBeenCalled();
      isDestroyed.mockReturnValue(true);
      component.toggleHeatMap();
      expect(requestRender).not.toHaveBeenCalled();
    });
  });

  describe('drawing an area', () => {
    let source: Cesium.CustomDataSource;
    let exampleArea: Cesium.Entity;
    const positions = [
      Cesium.Cartesian3.fromDegrees(-2.49, 43.08),
      Cesium.Cartesian3.fromDegrees(-2.48, 43.08),
      Cesium.Cartesian3.fromDegrees(-2.48, 43.09),
      Cesium.Cartesian3.fromDegrees(-2.49, 43.09),
    ];
    const button = (text: string) => {
      const element: HTMLElement = fixture.nativeElement;
      const result = Array.from(element.querySelectorAll<HTMLButtonElement>('button'))
        .find(button => button.textContent?.trim() === text);
      if (!result) throw new Error(`Missing button: ${text}`);
      return result;
    };
    const addPoints = (count: number) => {
      positions.slice(0, count).forEach(point => component['addDrawingPoint'](point));
    };

    beforeEach(() => {
      source = new Cesium.CustomDataSource('test-drawing');
      component['Cesium'] = Cesium;
      component['drawingSource'] = source;
      exampleArea = component['createExampleArea'](Cesium);
      component['exampleArea'] = exampleArea;
      component.toggleInteraction();
    });

    it('should replace the normal controls with the drawing panel and disabled actions', async () => {
      button('Dibujar area').click();
      await fixture.whenStable();
      const element: HTMLElement = fixture.nativeElement;

      expect(component.drawing()).toBe(true);
      expect(element.querySelector('.mapControls:not(.drawingPanel)')?.classList.contains('hidden')).toBe(true);
      expect(element.querySelector('.mapExampleControls')?.classList.contains('hidden')).toBe(true);
      expect(element.querySelector('.drawingPanel')?.classList.contains('hidden')).toBe(false);
      expect(element.querySelector('[role="status"]')?.textContent).toContain('0 esquinas');
      expect(button('Deshacer').disabled).toBe(true);
      expect(button('Finalizar').disabled).toBe(true);
      expect(exampleArea.show).toBe(false);
      expect(source.entities.getById('drawing-draft')).toBeDefined();
    });

    it('should count points, preview the shape, and enable finishing at exactly three', async () => {
      component.drawArea();
      const time = Cesium.JulianDate.now();
      const draft = source.entities.getById('drawing-draft')!;

      for (let index = 0; index < positions.length; index++) {
        component['addDrawingPoint'](positions[index]);
        await fixture.whenStable();
        expect(component.pointCount()).toBe(index + 1);
        expect(button('Finalizar').disabled).toBe(index < 2);
        expect(button('Deshacer').disabled).toBe(false);
        expect(draft.polygon!.show!.getValue(time)).toBe(index >= 2);
        expect(draft.polyline!.show!.getValue(time)).toBe(index >= 1);
        const element: HTMLElement = fixture.nativeElement;
        expect(element.querySelector('[role="status"]')?.textContent).toContain(`${index + 1} esquinas`);
      }
      expect(draft.polyline!.positions!.getValue(time)).toEqual([...positions, positions[0]]);
      expect(draft.polygon!.hierarchy!.getValue(time).positions).toEqual(positions);
      expect(source.entities.values.filter(entity => entity.point)).toHaveLength(4);
    });

    it('should undo vertices, update the preview, and prevent finishing below three', async () => {
      component.drawArea();
      addPoints(3);
      await fixture.whenStable();
      button('Deshacer').click();
      await fixture.whenStable();

      expect(component.pointCount()).toBe(2);
      expect(button('Finalizar').disabled).toBe(true);
      component.finishDrawing();
      expect(component.drawing()).toBe(true);
      expect(source.entities.getById('drawn-area')).toBeUndefined();
      expect(source.entities.values.filter(entity => entity.point)).toHaveLength(2);
      expect(source.entities.getById('drawing-draft')!.polyline!.positions!.getValue(
        Cesium.JulianDate.now(),
      )).toEqual(positions.slice(0, 2));

      component.undoDrawingPoint();
      component.undoDrawingPoint();
      component.undoDrawingPoint();
      await fixture.whenStable();
      expect(component.pointCount()).toBe(0);
      expect(button('Deshacer').disabled).toBe(true);
    });

    it('should finalize a terrain-clamped polygon and remove only the draft and vertices', async () => {
      component.drawArea();
      addPoints(3);
      await fixture.whenStable();
      button('Finalizar').click();
      await fixture.whenStable();
      const time = Cesium.JulianDate.now();
      const area = source.entities.getById('drawn-area')!;

      expect(component.drawing()).toBe(false);
      expect(component.interactive()).toBe(true);
      expect(area.polygon!.hierarchy!.getValue(time).positions).toEqual(positions.slice(0, 3));
      expect(area.polyline!.positions!.getValue(time)).toEqual([
        ...positions.slice(0, 3), positions[0],
      ]);
      expect(area.polygon!.heightReference!.getValue(time)).toBe(
        Cesium.HeightReference.CLAMP_TO_GROUND,
      );
      expect(source.entities.values).toEqual([area]);
      expect(exampleArea.show).toBe(true);

      component.drawArea();
      addPoints(4);
      component.cancelDrawing();
      expect(source.entities.getById('drawn-area')).toBe(area);
      expect(source.entities.values).toHaveLength(1);

      component.drawArea();
      addPoints(4);
      component.finishDrawing();
      expect(source.entities.values).toHaveLength(1);
      expect(source.entities.getById('drawn-area')!.polygon!.hierarchy!.getValue(time).positions)
        .toEqual(positions);
    });

    it('should cancel and restore controls while preserving the heatmap visibility preference', async () => {
      component.toggleHeatMap();
      component.drawArea();
      addPoints(2);
      await fixture.whenStable();
      button('Cancelar').click();
      await fixture.whenStable();
      const element: HTMLElement = fixture.nativeElement;

      expect(component.drawing()).toBe(false);
      expect(component.pointCount()).toBe(0);
      expect(source.entities.values).toHaveLength(0);
      expect(exampleArea.show).toBe(false);
      expect(component.hiddeHeatMap()).toBe(true);
      expect(element.querySelector('.mapExampleControls')?.classList.contains('hidden')).toBe(false);
      expect(element.querySelector('.mapControls:not(.drawingPanel)')?.classList.contains('hidden')).toBe(false);
    });

    it('should discard a draft when closing the map and reopen in normal interaction mode', () => {
      component.drawArea();
      addPoints(3);
      component.toggleInteraction();

      expect(component.interactive()).toBe(false);
      expect(component.drawing()).toBe(false);
      expect(component.pointCount()).toBe(0);
      expect(source.entities.values).toHaveLength(0);
      component.toggleInteraction();
      expect(component.drawing()).toBe(false);
    });

    it('should pick terrain clicks, ignore sky clicks and clicks outside drawing mode', () => {
      const ray = new Cesium.Ray();
      const pick = vi.fn().mockReturnValue(positions[0]);
      const viewer = {
        camera: { getPickRay: vi.fn().mockReturnValue(ray) },
        scene: { globe: { pick }, requestRender: vi.fn() },
        isDestroyed: () => false,
        destroy: vi.fn(),
      };
      Object.defineProperty(component, 'viewer', { value: viewer, writable: true });
      const screenPosition = new Cesium.Cartesian2(10, 20);
      component['pickDrawingPoint'](screenPosition);
      expect(pick).not.toHaveBeenCalled();

      component.drawArea();
      component['pickDrawingPoint'](screenPosition);
      expect(viewer.camera.getPickRay).toHaveBeenCalledWith(screenPosition);
      expect(pick).toHaveBeenCalledWith(ray, viewer.scene);
      expect(component.pointCount()).toBe(1);

      component['pickDrawingPoint'](screenPosition);
      expect(component.pointCount()).toBe(1);
      expect(component.drawingMessage()).toContain('punto distinto');

      pick.mockReturnValue(undefined);
      component['pickDrawingPoint'](screenPosition);
      expect(component.pointCount()).toBe(1);
      expect(component.drawingMessage()).toContain('sobre el terreno');
    });

    it('should release its click handler when destroyed', () => {
      const handler = new Cesium.ScreenSpaceEventHandler(document.createElement('canvas'));
      component['drawingHandler'] = handler;
      fixture.destroy();
      expect(handler.isDestroyed()).toBe(true);
    });
  });
});
