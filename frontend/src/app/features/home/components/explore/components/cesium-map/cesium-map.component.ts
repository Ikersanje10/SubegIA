import { afterNextRender, Component, computed, ElementRef, inject, Injector, NgZone, OnDestroy, signal, viewChild, WritableSignal } from '@angular/core';
import type { Cartesian2, Cartesian3, CustomDataSource, Entity, ScreenSpaceEventHandler, Viewer } from 'cesium';
import { TranslatePipe } from '@ngx-translate/core';
import { environment } from '../../../../../../../environments/environment';
import { createExampleCells, EXAMPLE_AREA_COORDINATES, type Danger, type ExampleCell } from './example-area';

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

  readonly drawing = signal(false);
  readonly drawingPoints = signal<Cartesian3[]>([]);
  readonly pointCount = computed(() => this.drawingPoints().length);
  readonly canFinishDrawing = computed(() => this.pointCount() >= 3);
  readonly drawingMessage = signal('');
  readonly conditionsOpen = signal(false);
  readonly wideLayout = signal(false);
  readonly useBottomSheet = computed(() => this.interactive() && !this.wideLayout());

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
    if (!this.drawing() || !this.canFinishDrawing() || !Cesium || !source) return;

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
      this.drawingMessage.set('Selecciona un punto sobre el terreno.');
      return;
    }
    this.addDrawingPoint(point);
  }

  private addDrawingPoint(position: Cartesian3) {
    const Cesium = this.Cesium;
    const source = this.drawingSource;
    if (!this.drawing() || !Cesium || !source) return;
    if (this.drawingPoints().some(point => Cesium.Cartesian3.equals(point, position))) {
      this.drawingMessage.set('Selecciona un punto distinto de los anteriores.');
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

  private async initMap() {
    const container = this.mapEl().nativeElement; // read it before any await
    const creditContainer = this.mapCredits().nativeElement;

    const Cesium = await import('cesium'); // loaded only in the browser, in its own chunk
    this.Cesium = Cesium;
    if (this.destroyed) return;

    this.zone.runOutsideAngular(() => {
      Cesium.Ion.defaultAccessToken = environment.cesiumIonToken;

      const viewer = new Cesium.Viewer(container, {
        creditContainer,
        terrain: Cesium.Terrain.fromWorldTerrain(), // 3D mountains
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
      viewer.zoomTo(
        this.exampleArea,
        new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(-35), 3000),
      ).catch((error) => console.error('Could not frame the example area', error));
    });
    this.applyInteraction();
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.drawingHandler?.destroy();
    this.viewer?.destroy();
  }
}
