import { afterNextRender, Component, computed, ElementRef, inject, Injector, NgZone, OnDestroy, signal, viewChild, WritableSignal } from '@angular/core';
import type { Cartesian2, Cartesian3, CustomDataSource, Entity, ScreenSpaceEventHandler, Viewer } from 'cesium';
import { TranslatePipe } from '@ngx-translate/core';
import { booleanPointInPolygon } from '@turf/boolean-point-in-polygon';
import type { MultiPolygon } from 'geojson';
import { environment } from '../../../../../../../environments/environment';
import { createExampleCells, EXAMPLE_AREA_COORDINATES, type Coordinate, type Danger, type ExampleCell } from './example-area';
import { isSimplePolygon } from './drawing-geometry';
import { AssessmentService } from '../../../../../../api/assessment.service';
import { AssessmentRequest, Position } from '../../../../../../api/Assessment';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  imports: [TranslatePipe],
  selector: 'app-cesium-map',
  styleUrl: './cesium-map.component.css',
  templateUrl: './cesium-map.component.html',
  host: {
    '(keydown.escape)': 'closeConditions($event)',
    '(window:resize)': 'updateLayout()',
  },
})
export class CesiumMapComponent implements OnDestroy {
  private readonly mapEl = viewChild.required<ElementRef<HTMLDivElement>>('cesium');
  private readonly mapCredits = viewChild.required<ElementRef<HTMLDivElement>>('mapCredits');
  private readonly zone = inject(NgZone);
  private readonly injector = inject(Injector);
  private readonly assessmentService = inject(AssessmentService);
  private readonly drawButton = viewChild<ElementRef<HTMLButtonElement>>('drawButton');
  private readonly drawingCloseButton = viewChild<ElementRef<HTMLButtonElement>>('drawingCloseButton');
  private readonly exploreButton = viewChild<ElementRef<HTMLButtonElement>>('exploreButton');
  private readonly conditionsButton = viewChild<ElementRef<HTMLButtonElement>>('conditionsButton');
  private readonly conditionsPanel = viewChild<ElementRef<HTMLDivElement>>('conditionsPanel');
  private viewer?: Viewer;
  private destroyed = false;
  private exampleArea?: Entity;
  private Cesium?: typeof import('cesium');
  private drawingSource?: CustomDataSource;
  private drawingHandler?: ScreenSpaceEventHandler;
  private readonly vertexEntities: Entity[] = [];
  private mapLoadTimeout?: ReturnType<typeof setTimeout>;
  private cancelMapLoad?: () => void;
  private gipuzkoaBoundary?: MultiPolygon;

  readonly drawing = signal(false);
  readonly drawingPoints = signal<Cartesian3[]>([]);
  readonly pointCount = computed(() => this.drawingPoints().length);
  readonly canFinishDrawing = computed(() =>
    this.pointCount() >= 3 && this.isValidDrawingOutline(this.drawingPoints()),
  );
  readonly drawingMessage = signal('');
  readonly conditionsOpen = signal(false);
  readonly wideLayout = signal(false);
  readonly useBottomSheet = computed(() => this.interactive() && !this.wideLayout());


  mapLoading: WritableSignal<boolean> = signal(true);
  readonly mapError = signal(false);
  readonly mapUnavailable = computed(() => this.mapLoading() || this.mapError());
  hiddeHeatMap: WritableSignal<boolean> = signal(false);
  interactive: WritableSignal<boolean> = signal(false);

  constructor() {
    afterNextRender(() => {
      this.updateLayout();
      this.initMap();
    });
  }

  updateLayout() {
    const wide = window.innerWidth >= 800;
    if (wide === this.wideLayout()) return;

    const panel = this.conditionsPanel();
    const button = this.conditionsButton();
    const activeElement = document.activeElement;
    const focusInPanel = activeElement !== null && panel?.nativeElement.contains(activeElement);
    const focusOnButton = activeElement === button?.nativeElement;
    this.wideLayout.set(wide);
    this.conditionsOpen.set(false);

    if (this.interactive() && (focusInPanel || focusOnButton)) {
      afterNextRender(() => {
        const target = wide
          ? this.conditionsPanel()
          : this.drawing() ? this.drawingCloseButton() : this.conditionsButton();
        target?.nativeElement.focus({ preventScroll: true });
      }, { injector: this.injector });
    }
  }

  toggleHeatMap() {
    this.hiddeHeatMap.update(v => !v);
    if (this.exampleArea) {
      this.exampleArea.show = !this.hiddeHeatMap() && !this.drawing();
    }
    this.requestMapRender();
  }

  toggleInteraction() {
    if (this.mapUnavailable()) return;
    if (this.interactive() && this.drawing()) this.cancelDrawing();
    this.conditionsOpen.set(false);
    this.interactive.update(v => !v);
    this.applyInteraction();
    if (!this.interactive()) this.focusAfterRender(this.exploreButton());
  }

  toggleConditions() {
    if (!this.useBottomSheet() || this.drawing()) return;
    if (this.conditionsOpen()) {
      this.closeConditions();
      return;
    }
    this.conditionsOpen.set(true);
    this.focusAfterRender(this.conditionsPanel());
  }

  closeConditions(event?: Event) {
    if (!this.conditionsOpen()) return;
    event?.stopPropagation();
    this.conditionsOpen.set(false);
    this.focusAfterRender(this.conditionsButton());
  }

  drawArea() {
    if (!this.interactive() || this.drawing()) return;
    this.conditionsOpen.set(false);
    this.drawingPoints.set([]);
    this.drawingMessage.set('');
    this.drawing.set(true);
    if (this.exampleArea) this.exampleArea.show = false;
    this.createDraft();
    this.requestMapRender();
    this.focusAfterRender(this.drawingCloseButton());
  }

  undoDrawingPoint() {
    if (!this.drawing() || this.pointCount() === 0) return;
    this.drawingPoints.update(points => points.slice(0, -1));
    const vertex = this.vertexEntities.pop();
    if (vertex) this.drawingSource?.entities.remove(vertex);
    this.drawingMessage.set('');
    this.requestMapRender();
  }

  finishDrawing() {
    const Cesium = this.Cesium;
    const source = this.drawingSource;
    if (!this.drawing() || this.pointCount() < 3 || !Cesium || !source) return;
    if (!this.isValidDrawingOutline(this.drawingPoints())) {
      this.drawingMessage.set('mapControls.drawing.invalidOutline');
      return;
    }

    const positions = [...this.drawingPoints()];
    source.entities.removeById('drawn-area');
    source.entities.add({
      id: 'drawn-area',
      name: 'Area dibujada (boceto sin validacion geografica)',
      polygon: {
        hierarchy: new Cesium.PolygonHierarchy(positions),
        material: Cesium.Color.fromCssColorString('#b9d3a2').withAlpha(0.25),
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        classificationType: Cesium.ClassificationType.TERRAIN,
      },
      polyline: {
        positions: [...positions, positions[0]],
        width: 3,
        material: Cesium.Color.fromCssColorString('#b9d3a2'),
        clampToGround: true,
        classificationType: Cesium.ClassificationType.TERRAIN,
      },
    });

    const coordinates: Position[] = this.drawingPoints().map(position => {
      const location = Cesium.Cartographic.fromCartesian(position);

      return [
        Cesium.Math.toDegrees(location.longitude),
        Cesium.Math.toDegrees(location.latitude),
      ];
    });

    const first = coordinates[0];
    if (!first) return;

    const request: AssessmentRequest = {
      area: {
        type: 'Polygon',
        coordinates: [[...coordinates, [first[0], first[1]]]],
      },
    };

    this.assessmentService.calculateFWI(request).subscribe(
      {
        next: res => {
          console.log(res);
        },
        error: (error: HttpErrorResponse) => {
          console.log(error.status); // Por ejemplo, 422.
          console.log(error.error);  // Body JSON enviado por Java.
        },
      }
    );

    this.cancelDrawing();
  }

  cancelDrawing() {
    this.drawingSource?.entities.removeById('drawing-draft');
    for (const vertex of this.vertexEntities) this.drawingSource?.entities.remove(vertex);
    this.vertexEntities.length = 0;
    this.drawingPoints.set([]);
    this.drawingMessage.set('');
    this.drawing.set(false);
    if (this.exampleArea) this.exampleArea.show = !this.hiddeHeatMap();
    this.requestMapRender();
    this.focusAfterRender(this.drawButton());
  }

  private focusAfterRender(element: ElementRef<HTMLElement> | undefined) {
    afterNextRender(() => element?.nativeElement.focus({ preventScroll: true }), { injector: this.injector });
  }

  private createDraft() {
    const Cesium = this.Cesium;
    const source = this.drawingSource;
    if (!Cesium || !source) return;

    const color = Cesium.Color.fromCssColorString('#b9d3a2');
    source.entities.add({
      id: 'drawing-draft',
      polygon: {
        hierarchy: new Cesium.CallbackProperty(
          () => new Cesium.PolygonHierarchy(this.drawingPoints()), false,
        ),
        show: new Cesium.CallbackProperty(() => this.canFinishDrawing(), false),
        material: color.withAlpha(0.25),
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        classificationType: Cesium.ClassificationType.TERRAIN,
      },
      polyline: {
        positions: new Cesium.CallbackProperty(() => {
          const points = this.drawingPoints();
          return points.length >= 3 ? [...points, points[0]] : points;
        }, false),
        show: new Cesium.CallbackProperty(() => this.pointCount() >= 2, false),
        width: 3,
        material: color,
        clampToGround: true,
        classificationType: Cesium.ClassificationType.TERRAIN,
      },
    });
  }

  private pickDrawingPoint(position: Cartesian2) {
    const viewer = this.viewer;
    if (!this.drawing() || !viewer || viewer.isDestroyed()) return;

    // Pick terrain rather than overlays or buildings so the polygon stays on the ground.
    const ray = viewer.camera.getPickRay(position);
    const point = ray && viewer.scene.globe.pick(ray, viewer.scene);
    if (!point) {
      this.drawingMessage.set('mapControls.drawing.selectTerrain');
      return;
    }
    this.addDrawingPoint(point);
  }

  private addDrawingPoint(position: Cartesian3) {
    const Cesium = this.Cesium;
    const source = this.drawingSource;
    if (!this.drawing() || !Cesium || !source) return;
    if (!this.gipuzkoaBoundary) {
      this.drawingMessage.set('mapControls.drawing.coverageUnavailable');
      return;
    }
    const location = Cesium.Cartographic.fromCartesian(position);
    const coordinates = [
      Cesium.Math.toDegrees(location.longitude),
      Cesium.Math.toDegrees(location.latitude),
    ];
    if (!booleanPointInPolygon(coordinates, this.gipuzkoaBoundary)) {
      this.drawingMessage.set('mapControls.drawing.outsideCoverage');
      return;
    }
    if (this.drawingPoints().some(point => Cesium.Cartesian3.equals(point, position))) {
      this.drawingMessage.set('mapControls.drawing.distinctPoint');
      return;
    }

    const candidate = [...this.drawingPoints(), position];
    if (candidate.length >= 3 && !this.isValidDrawingOutline(candidate)) {
      this.drawingMessage.set('mapControls.drawing.invalidOutline');
      return;
    }

    const point = Cesium.Cartesian3.clone(position);
    this.drawingPoints.update(points => [...points, point]);
    this.drawingMessage.set('');
    this.vertexEntities.push(source.entities.add({
      position: point,
      point: {
        pixelSize: 10,
        color: Cesium.Color.fromCssColorString('#b9d3a2'),
        outlineColor: Cesium.Color.fromCssColorString('#1b2620'),
        outlineWidth: 2,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
    }));
    this.requestMapRender();
  }

  private isValidDrawingOutline(positions: readonly Cartesian3[]): boolean {
    const Cesium = this.Cesium;
    if (!Cesium) return false;
    const coordinates: Coordinate[] = positions.map(position => {
      const location = Cesium.Cartographic.fromCartesian(position);
      return [
        Cesium.Math.toDegrees(location.longitude),
        Cesium.Math.toDegrees(location.latitude),
      ];
    });
    return isSimplePolygon(coordinates);
  }

  showExampleArea() {
    const viewer = this.viewer;
    const Cesium = this.Cesium;
    const exampleArea = this.exampleArea;
    if (!viewer || viewer.isDestroyed() || !Cesium || !exampleArea) return;

    viewer.zoomTo(
      exampleArea,
      new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(-40), 2500),
    ).catch((err) => console.error('Could not frame the example area', err));
  }

  private applyInteraction() {
    const viewer = this.viewer;
    if (!viewer || viewer.isDestroyed()) return;

    const enabled = this.interactive();
    viewer.scene.screenSpaceCameraController.enableInputs = enabled;
    viewer.scene.canvas.style.touchAction = enabled ? 'none' : 'pan-y';
    this.requestMapRender();
  }

  private requestMapRender() {
    if (this.viewer && !this.viewer.isDestroyed()) {
      this.viewer.scene.requestRender();
    }
  }

  readonly cells = createExampleCells();
  readonly dangerLevels = ['low', 'moderate', 'high', 'veryHigh', 'extreme', 'veryExtreme'] as const;

  readonly colors: Record<Danger, string> = {
    low: '#7bb998',
    moderate: '#d6ca68',
    high: '#e9a650',
    veryHigh: '#db7a50',
    extreme: '#c95c68',
    veryExtreme: '#915c83',
  };

  private createCell(Cesium: typeof import('cesium'), cell: ExampleCell): Entity {
    const positions = Cesium.Cartesian3.fromDegreesArray(cell.coordinates.flat());
    const color = Cesium.Color.fromCssColorString(this.colors[cell.danger]);

    return new Cesium.Entity({
      id: cell.id,
      parent: this.exampleArea,
      name: 'Peligro de ejemplo (datos de demostracion)',
      description: `Nivel de peligro (demo): ${cell.danger}. No representa una evaluacion real del riesgo.`,
      properties: { danger: cell.danger, demo: true },
      polygon: {
        hierarchy: new Cesium.PolygonHierarchy(positions),
        material: color.withAlpha(0.55),
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        classificationType: Cesium.ClassificationType.TERRAIN,
      },
      polyline: {
        positions: [...positions, positions[0]],
        width: 1,
        material: color,
        clampToGround: true,
        classificationType: Cesium.ClassificationType.TERRAIN,
      },
    });
  }

  private createExampleArea(Cesium: typeof import('cesium')): Entity {
    const positions = Cesium.Cartesian3.fromDegreesArray(EXAMPLE_AREA_COORDINATES.flat());
    const color = Cesium.Color.fromCssColorString('#b9d3a2');

    return new Cesium.Entity({
      id: 'example-area',
      show: !this.hiddeHeatMap() && !this.drawing(),
      name: 'Area de ejemplo',
      polygon: {
        hierarchy: new Cesium.PolygonHierarchy(positions),
        fill: false,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        classificationType: Cesium.ClassificationType.TERRAIN,
      },
      // Repeat the first corner to close the terrain-following border.
      polyline: {
        positions: [...positions, positions[0]],
        width: 3,
        material: color,
        clampToGround: true,
        classificationType: Cesium.ClassificationType.TERRAIN,
      },
    });
  }

  private async loadGipuzkoaShape(Cesium: typeof import('cesium')) {
    const color = Cesium.Color.fromCssColorString('#c93535');
    const source = await Cesium.GeoJsonDataSource.load('/geo/gipuzkoa.geojson', {
      clampToGround: true,
      credit: new Cesium.Credit(
        '<a href="https://www.geo.euskadi.eus/limites-administrativos-del-pais-vasco/webgeo00-content/es/">'
        + 'Eusko Jaurlaritza / Gobierno Vasco. geoEuskadi.</a>'
        + ' &middot; <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>',
        true,
      ),
    });

    if (source.entities.values.length === 0) throw new Error('Missing Gipuzkoa boundary');

    const boundary: MultiPolygon = { type: 'MultiPolygon', coordinates: [] };
    for (const entity of source.entities.values) {
      const hierarchy: import('cesium').PolygonHierarchy | undefined =
        entity.polygon?.hierarchy?.getValue();
      if (!hierarchy) throw new Error('Missing Gipuzkoa boundary polygon');

      boundary.coordinates.push([hierarchy, ...hierarchy.holes].map(ring =>
        ring.positions.map(position => {
          const location = Cesium.Cartographic.fromCartesian(position);
          return [
            Cesium.Math.toDegrees(location.longitude),
            Cesium.Math.toDegrees(location.latitude),
          ];
        }),
      ));

      // Ground-clamped polygon outlines are not supported; use a terrain-following line.
      entity.polyline = new Cesium.PolylineGraphics({
        positions: hierarchy.positions,
        width: 3,
        material: color,
        clampToGround: true,
        classificationType: Cesium.ClassificationType.TERRAIN,
      });
      entity.polygon = undefined;
    }

    this.gipuzkoaBoundary = boundary;
    return source;
  }

  private async initMap() {
    const container = this.mapEl().nativeElement; // read it before any await
    const creditContainer = this.mapCredits().nativeElement;

    this.mapLoadTimeout = setTimeout(
      () => this.failMapLoad(new Error('Initial map loading exceeded 45 seconds')),
      45_000,
    );
    try {
      const Cesium = await import('cesium'); // loaded only in the browser, in its own chunk
      this.Cesium = Cesium;
      if (this.destroyed || this.mapError()) return;

      await this.zone.runOutsideAngular(async () => {
        Cesium.Ion.defaultAccessToken = environment.cesiumIonToken;
        const terrainProvider = await Cesium.createWorldTerrainAsync();
        if (this.destroyed || this.mapError()) return;

        const viewer = new Cesium.Viewer(container, {
          creditContainer,
          terrainProvider,
          requestRenderMode: true,
          maximumRenderTimeChange: Number.POSITIVE_INFINITY,
          shouldAnimate: false,
          animation: false,
          infoBox: false,
          selectionIndicator: false,
          timeline: false,
          baseLayerPicker: false,
          geocoder: false,
          homeButton: false,
          sceneModePicker: false,
          navigationHelpButton: false,
          fullscreenButton: false,
        });
        this.viewer = viewer;
        this.drawingSource = new Cesium.CustomDataSource('drawn-areas');
        viewer.dataSources.add(this.drawingSource)
          .catch((error) => console.error('Could not add the drawing layer', error));
        this.drawingHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
        this.drawingHandler.setInputAction(
          (event: ScreenSpaceEventHandler.PositionedEvent) => {
            this.zone.run(() => this.pickDrawingPoint(event.position));
          },
          Cesium.ScreenSpaceEventType.LEFT_CLICK,
        );
        if (this.drawing()) this.createDraft();

        const scene = viewer.scene;
        scene.globe.enableLighting = true;
        scene.verticalExaggeration = 1.5;
        scene.globe.depthTestAgainstTerrain = true;

        this.exampleArea = viewer.entities.add(this.createExampleArea(Cesium));
        for (const cell of this.cells.map(cell => this.createCell(Cesium, cell))) {
          viewer.entities.add(cell);
        }

        const gipuzkoa = await this.loadGipuzkoaShape(Cesium);
        if (this.destroyed || this.mapError()) return;
        await viewer.dataSources.add(gipuzkoa);
        this.requestMapRender();

        // Morning sun: low light from the east makes the relief stand out
        viewer.clock.currentTime = Cesium.JulianDate.fromIso8601('2026-06-21T10:00:00Z');

        // 3D buildings (OpenStreetMap). Loaded in the background so the map appears first.
        Cesium.createOsmBuildingsAsync()
          .then((buildings) => {
            if (this.destroyed || !this.viewer || this.viewer.isDestroyed()) return;
            this.viewer.scene.primitives.add(buildings);
            this.requestMapRender();
          })
          .catch((error) => console.error('Could not load 3D buildings', error));

        // A zero range lets Cesium fit the whole area, even when its coordinates change.
        const framing = viewer.zoomTo(
          this.exampleArea,
          new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(-35), 3000),
        );
        await this.waitForGlobeTiles(viewer, framing);
        if (!this.destroyed && !this.mapError()) {
          this.zone.run(() => this.mapLoading.set(false));
        }
      });
      this.applyInteraction();
    } catch (error) {
      this.failMapLoad(error);
    } finally {
      clearTimeout(this.mapLoadTimeout);
    }
  }

  private waitForGlobeTiles(viewer: Viewer, framing: Promise<boolean>): Promise<void> {
    return new Promise((resolve, reject) => {
      const removers: Array<() => void> = [];
      let settled = false;
      let framed = false;
      const finish = (error?: unknown) => {
        if (settled) return;
        settled = true;
        removers.forEach(remove => remove());
        this.cancelMapLoad = undefined;
        if (error !== undefined) reject(error);
        else resolve();
      };

      this.cancelMapLoad = () => finish(new Error('Map loading cancelled'));
      removers.push(
        viewer.scene.postRender.addEventListener(() => {
          const imageryReady = Array.from(
            { length: viewer.imageryLayers.length },
            (_, index) => viewer.imageryLayers.get(index).ready,
          ).every(Boolean);
          if (framed && imageryReady && viewer.scene.globe.tilesLoaded) finish();
        }),
        viewer.scene.renderError.addEventListener((_scene, error) => finish(error)),
        viewer.terrainProvider.errorEvent.addEventListener(error => finish(error)),
      );

      const watchProvider = (provider: import('cesium').ImageryProvider) => {
        if (settled) return;
        removers.push(provider.errorEvent.addEventListener(error => finish(error)));
        viewer.scene.requestRender();
      };
      for (let index = 0; index < viewer.imageryLayers.length; index++) {
        const layer = viewer.imageryLayers.get(index);
        removers.push(layer.errorEvent.addEventListener(error => finish(error)));
        if (layer.ready) watchProvider(layer.imageryProvider);
        else removers.push(layer.readyEvent.addEventListener(watchProvider));
      }

      framing.then(success => {
        if (settled) return;
        if (!success) {
          finish(new Error('Could not frame the initial map area'));
          return;
        }
        framed = true;
        viewer.scene.requestRender();
      }).catch(finish);
    });
  }

  private failMapLoad(error: unknown) {
    if (this.destroyed || this.mapError()) return;
    console.error('Could not load the map', error);
    clearTimeout(this.mapLoadTimeout);
    this.zone.run(() => {
      this.mapError.set(true);
      this.mapLoading.set(false);
    });
    this.cancelMapLoad?.();
  }

  reloadPage() {
    window.location.reload();
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    clearTimeout(this.mapLoadTimeout);
    this.cancelMapLoad?.();
    this.drawingHandler?.destroy();
    this.viewer?.destroy();
  }
}
