import { afterNextRender, Component, computed, DestroyRef, ElementRef, inject, Injector, model, NgZone, OnDestroy, signal, viewChild, WritableSignal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, from, map, of, switchMap } from 'rxjs';
import type { Cartesian2, Cartesian3, CustomDataSource, Entity, GeoJsonDataSource, ScreenSpaceEventHandler, Viewer } from 'cesium';
import { TranslatePipe } from '@ngx-translate/core';
import { booleanPointInPolygon } from '@turf/boolean-point-in-polygon';
import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson';
import { environment } from '../../../../../../../environments/environment';
import { createExampleCells, EXAMPLE_AREA_COORDINATES, type Coordinate, type Danger, type ExampleCell } from './example-area';
import { isSimplePolygon } from './drawing-geometry';
import { AssessmentService } from '../../../../../../api/assessment.service';
import { AssessmentRequest, FWIRiskLevel, Position, SubAreaAssessment } from '../../../../../../api/Assessment';
import { assessmentFailure, type AssessmentErrorKey } from '../../../../../../api/assessment-error';
import { CoordinateEntryComponent } from '../coordinate-entry/coordinate-entry.component';

@Component({
  imports: [TranslatePipe, CoordinateEntryComponent],
  selector: 'app-cesium-map',
  styleUrl: './cesium-map.component.css',
  templateUrl: './cesium-map.component.html',
  host: {
    '(keydown.escape)': 'handleMapEscape($event)',
    '(keydown)': 'trapMapFocus($event)',
    '(window:resize)': 'updateLayout()',
  },
})
export class CesiumMapComponent implements OnDestroy {
  private readonly mapEl = viewChild.required<ElementRef<HTMLDivElement>>('cesium');
  private readonly mapCredits = viewChild.required<ElementRef<HTMLDivElement>>('mapCredits');
  private readonly zone = inject(NgZone);
  private readonly injector = inject(Injector);
  private readonly assessmentService = inject(AssessmentService);
  private readonly destroyRef = inject(DestroyRef);
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
  private assessmentSource?: GeoJsonDataSource;
  readonly assessments = signal<SubAreaAssessment[]>([]);
  readonly selectedAssessment = signal<SubAreaAssessment | null>(null);
  private lastAssessmentRequest?: AssessmentRequest;
  private assessmentSlowTimer?: ReturnType<typeof setTimeout>;
  private retryTimer?: ReturnType<typeof setInterval>;
  readonly assessmentSlow = signal(false);
  readonly assessmentErrorKey = signal<AssessmentErrorKey>('infoPanel.assessmentError');
  readonly retrySeconds = signal(0);
  readonly assessmentEmpty = signal(false);
  private readonly assessmentByEntity = new Map<string, SubAreaAssessment>();
  private drawingHandler?: ScreenSpaceEventHandler;
  private readonly vertexEntities: Entity[] = [];
  private mapLoadTimeout?: ReturnType<typeof setTimeout>;
  private cancelMapLoad?: () => void;
  private gipuzkoaBoundary?: MultiPolygon;
  private assessmentAnimationFrame?: number;
  private assessmentMotionPreference?: MediaQueryList;
  private readonly onAssessmentMotionChange = () => {
    this.stopAssessmentRenderLoop();
    this.requestMapRender();
    if (!this.assessmentMotionPreference?.matches) this.startAssessmentRenderLoop();
  };

  readonly drawing = signal(false);
  readonly assessmentLoading = signal(false);
  readonly hasSelectedArea = signal(false);
  readonly assessmentError = signal(false);
  readonly drawingPoints = signal<Cartesian3[]>([]);
  readonly pointCount = computed(() => this.drawingPoints().length);
  readonly drawingCoordinates = computed<Coordinate[]>(() => {
    const Cesium = this.Cesium;
    if (!Cesium) return [];
    return this.drawingPoints().map(position => {
      const location = Cesium.Cartographic.fromCartesian(position);
      return [Cesium.Math.toDegrees(location.longitude), Cesium.Math.toDegrees(location.latitude)];
    });
  });
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
  readonly interactive = model(false);

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
    if (this.hasSelectedArea()) return;
    this.hiddeHeatMap.update(v => !v);
    if (this.exampleArea) {
      this.exampleArea.show = !this.hasSelectedArea() && !this.hiddeHeatMap() && !this.drawing();
    }
    this.requestMapRender();
  }

  toggleInteraction() {
    if (this.mapUnavailable()) return;
    if (this.interactive() && this.drawing()) this.cancelDrawing();
    this.conditionsOpen.set(false);
    this.interactive.update(v => !v);
    this.applyInteraction();
    if (this.interactive()) {
      this.focusAfterRender(this.drawButton());
    } else {
      this.focusAfterRender(this.exploreButton());
      afterNextRender(() => {
        if (!this.destroyed && !this.interactive()) this.frameSelectedArea();
      }, { injector: this.injector });
    }
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

  handleMapEscape(event: Event) {
    const dialog = event.target instanceof Element ? event.target.closest('[role="dialog"]') : null;
    if (dialog && !dialog.classList.contains('cesium-map')) return;
    if (this.conditionsOpen()) {
      this.closeConditions(event);
    } else if (this.drawing()) {
      event.stopPropagation();
      this.cancelDrawing();
    } else if (this.interactive()) {
      event.stopPropagation();
      this.toggleInteraction();
    }
  }

  trapMapFocus(event: Event) {
    if (!this.interactive() || !(event instanceof KeyboardEvent) || event.key !== 'Tab'
      || !(event.currentTarget instanceof HTMLElement)) return;
    const dialog = event.target instanceof Element ? event.target.closest('[role="dialog"]') : null;
    const elements = Array.from((dialog ?? event.currentTarget).querySelectorAll<HTMLElement>(
      'button:not(:disabled), a[href], input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex="0"], summary',
    )).filter(element => element.getClientRects().length > 0
      && !element.closest('[inert], [aria-hidden="true"]'));
    const first = elements[0], last = elements.at(-1);
    if (!first || !last) return;
    const active = document.activeElement;
    if (!elements.some(element => element === active) || (event.shiftKey && active === first)
      || (!event.shiftKey && active === last)) {
      event.preventDefault();
      (event.shiftKey ? last : first).focus();
    }
  }

  drawArea() {
    if (!this.interactive() || this.drawing() || this.assessmentLoading() || this.retrySeconds() > 0) return;
    this.conditionsOpen.set(false);
    this.drawingPoints.set([]);
    this.drawingMessage.set('');
    this.drawing.set(true);
    this.selectAssessment(null);
    if (this.assessmentSource) this.assessmentSource.show = false;
    const selectedArea = this.drawingSource?.entities.getById('drawn-area');
    if (selectedArea) selectedArea.show = false;
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

  applyDrawingCoordinates(coordinates: Coordinate[]) {
    const Cesium = this.Cesium;
    const source = this.drawingSource;
    const boundary = this.gipuzkoaBoundary;
    if (!this.drawing() || this.assessmentLoading() || !Cesium || !source) return;
    if (!boundary) {
      this.drawingMessage.set('mapControls.drawing.coverageUnavailable');
      return;
    }
    if (coordinates.some(point => !booleanPointInPolygon([point[0], point[1]], boundary))) {
      this.drawingMessage.set('mapControls.drawing.outsideCoverage');
      return;
    }
    if (!isSimplePolygon(coordinates)) {
      this.drawingMessage.set('mapControls.drawing.invalidOutline');
      return;
    }
    for (const vertex of this.vertexEntities) source.entities.remove(vertex);
    this.vertexEntities.length = 0;
    const points = coordinates.map(point => Cesium.Cartesian3.fromDegrees(point[0], point[1]));
    this.drawingPoints.set(points);
    for (const point of points) this.addVertexEntity(point);
    this.drawingMessage.set('');
    this.requestMapRender();
  }

  finishDrawing() {
    const Cesium = this.Cesium;
    const source = this.drawingSource;
    if (this.assessmentLoading() || this.retrySeconds() > 0 || !this.drawing() || this.pointCount() < 3 || !Cesium || !source) return;
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

    this.lastAssessmentRequest = request;
    this.cancelDrawing();
    this.requestAssessment(request);
  }

  retryAssessment() {
    if (this.lastAssessmentRequest && !this.assessmentLoading() && !this.drawing() && this.retrySeconds() === 0) {
      this.requestAssessment(this.lastAssessmentRequest);
    }
  }

  private requestAssessment(request: AssessmentRequest) {
    this.clearRetryTimer();
    this.assessmentError.set(false);
    this.assessmentErrorKey.set('infoPanel.assessmentError');
    this.assessmentSlow.set(false);
    this.assessmentEmpty.set(false);
    this.clearAssessmentResults();
    this.hasSelectedArea.set(true);
    if (this.exampleArea) this.exampleArea.show = false;
    this.assessmentLoading.set(true);
    this.assessmentSlowTimer = setTimeout(() => this.assessmentSlow.set(true), 10_000);
    const polygon = this.drawingSource?.entities.getById('drawn-area')?.polygon;
    if (polygon && this.Cesium) polygon.show = new this.Cesium.ConstantProperty(true);
    this.startAssessmentAnimation();
    if (this.useBottomSheet()) {
      this.conditionsOpen.set(true);
      this.focusAfterRender(this.conditionsPanel());
    }

    this.assessmentService.calculateFWI(request).pipe(
      switchMap(results => results.length === 0
        ? of(results)
        : from(this.loadAssessmentResults(results)).pipe(
          map(() => results),
        )),
      takeUntilDestroyed(this.destroyRef),
      finalize(() => {
        clearTimeout(this.assessmentSlowTimer);
        this.assessmentSlow.set(false);
        this.assessmentLoading.set(false);
        this.stopAssessmentAnimation();
      }),
    ).subscribe(
      {
        next: res => {
          this.assessments.set(res);
          this.assessmentEmpty.set(res.length === 0);
          const polygon = this.drawingSource?.entities.getById('drawn-area')?.polygon;
          if (polygon && this.Cesium && res.length > 0) {
            polygon.show = new this.Cesium.ConstantProperty(false);
          }
        },
        error: (error: unknown) => {
          this.assessmentError.set(true);
          const failure = assessmentFailure(error);
          this.assessmentErrorKey.set(failure.key);
          this.startRetryTimer(failure.retrySeconds);
          console.error('Could not calculate FWI', error);
        },
      }
    );
  }

  private startRetryTimer(seconds: number) {
    this.clearRetryTimer();
    if (seconds <= 0) return;
    const deadline = Date.now() + seconds * 1000;
    this.retrySeconds.set(seconds);
    this.retryTimer = setInterval(() => {
      this.retrySeconds.set(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
      if (this.retrySeconds() === 0) this.clearRetryTimer();
    }, 1000);
  }

  private clearRetryTimer() {
    clearInterval(this.retryTimer);
    this.retryTimer = undefined;
    this.retrySeconds.set(0);
  }

  private clearAssessmentResults() {
    this.selectAssessment(null);
    if (this.assessmentSource && this.viewer && !this.viewer.isDestroyed()) {
      this.viewer.dataSources.remove(this.assessmentSource, true);
    }
    this.assessmentSource = undefined;
    this.assessments.set([]);
    this.assessmentByEntity.clear();
  }

  private handleMapClick(position: Cartesian2) {
    if (this.drawing()) {
      this.pickDrawingPoint(position);
      return;
    }
    const viewer = this.viewer;
    const Cesium = this.Cesium;
    if (!this.interactive() || this.assessmentLoading() || !viewer || viewer.isDestroyed() || !Cesium) return;
    const picked: unknown = viewer.scene.pick(position);
    const entity = picked && typeof picked === 'object' && 'id' in picked
      && picked.id instanceof Cesium.Entity ? picked.id : undefined;
    this.selectAssessment(entity ? this.assessmentByEntity.get(entity.id) ?? null : null);
    if (this.selectedAssessment() && this.useBottomSheet()) this.conditionsOpen.set(true);
  }

  selectAssessment(result: SubAreaAssessment | null) {
    if (this.drawing() || this.assessmentLoading()) result = null;
    if (this.selectedAssessment() === result) return;
    this.selectedAssessment.set(result);
    const Cesium = this.Cesium;
    if (Cesium && this.assessmentSource) {
      for (const entity of this.assessmentSource.entities.values) {
        if (!entity.polyline) continue;
        const selected = result !== null && this.assessmentByEntity.get(entity.id) === result;
        entity.polyline.width = new Cesium.ConstantProperty(selected ? 3 : 1.5);
        entity.polyline.material = new Cesium.ColorMaterialProperty(
          Cesium.Color.fromCssColorString(selected ? '#f0f2eb' : '#25362a').withAlpha(0.9),
        );
      }
    }
    this.requestMapRender();
  }

  private async loadAssessmentResults(results: SubAreaAssessment[]) {
    const Cesium = this.Cesium;
    const viewer = this.viewer;
    if (!Cesium || !viewer || viewer.isDestroyed()) throw new Error('Assessment map is not ready');
    const collection: FeatureCollection<Polygon | MultiPolygon> = {
      type: 'FeatureCollection',
      features: results.map(result => ({
        type: 'Feature',
        geometry: result.geometry,
        properties: { assessmentId: `${result.column}:${result.row}` },
      })),
    };
    const byCell = new Map(results.map(result => [`${result.column}:${result.row}`, result]));
    const source = await Cesium.GeoJsonDataSource.load(collection, { clampToGround: true });
    if (this.destroyed || viewer.isDestroyed()) return;
    const entities = new Map<string, SubAreaAssessment>();
    for (const entity of source.entities.values) {
      const id: unknown = entity.properties?.['assessmentId']?.getValue();
      const result = typeof id === 'string' ? byCell.get(id) : undefined;
      if (!result || !entity.polygon) throw new Error('Missing assessment polygon or metadata');
      const color = result.status === 'AVAILABLE' && result.riskLevel !== null
        ? this.colors[this.riskColors[result.riskLevel]]
        : '#89918d';
      entity.polygon.material = new Cesium.ColorMaterialProperty(
        Cesium.Color.fromCssColorString(color).withAlpha(0.65),
      );
      entity.polygon.outline = new Cesium.ConstantProperty(false);
      entity.polygon.height = undefined;
      entity.polygon.perPositionHeight = new Cesium.ConstantProperty(false);
      entity.polygon.classificationType = new Cesium.ConstantProperty(Cesium.ClassificationType.TERRAIN);
      entities.set(entity.id, result);
    }
    // Ground-clamped polygon outlines are not supported; use terrain-following lines.
    for (const result of results) {
      const polygons = result.geometry.type === 'Polygon'
        ? [result.geometry.coordinates]
        : result.geometry.coordinates;
      for (const rings of polygons) {
        for (const ring of rings) {
          const border = source.entities.add({
            polyline: {
              positions: Cesium.Cartesian3.fromDegreesArray(
                ring.flatMap(position => [position[0], position[1]]),
              ),
              width: 1.5,
              material: Cesium.Color.fromCssColorString('#25362a').withAlpha(0.9),
              clampToGround: true,
              classificationType: Cesium.ClassificationType.TERRAIN,
            },
          });
          entities.set(border.id, result);
        }
      }
    }
    await viewer.dataSources.add(source);
    if (this.destroyed || viewer.isDestroyed()) {
      if (!viewer.isDestroyed()) viewer.dataSources.remove(source, true);
      return;
    }
    this.assessmentSource = source;
    for (const [id, result] of entities) this.assessmentByEntity.set(id, result);
    this.requestMapRender();
  }

  private startAssessmentAnimation() {
    const Cesium = this.Cesium;
    const polygon = this.drawingSource?.entities.getById('drawn-area')?.polygon;
    if (!Cesium || !polygon) return;

    if (typeof window.matchMedia === 'function') {
      this.assessmentMotionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.assessmentMotionPreference.addEventListener('change', this.onAssessmentMotionChange);
    }
    const startedAt = performance.now();
    const color = Cesium.Color.fromCssColorString('#b9c5be');
    polygon.material = new Cesium.ColorMaterialProperty(new Cesium.CallbackProperty(() => {
      const alpha = this.assessmentMotionPreference?.matches
        ? 0.35
        : 0.35 + 0.15 * Math.sin((performance.now() - startedAt) * Math.PI / 1000);
      return color.withAlpha(alpha);
    }, false));
    this.requestMapRender();
    if (!this.assessmentMotionPreference?.matches) this.startAssessmentRenderLoop();
  }

  private startAssessmentRenderLoop() {
    if (this.destroyed || !this.assessmentLoading() || this.assessmentAnimationFrame !== undefined) return;
    const render = () => {
      this.assessmentAnimationFrame = undefined;
      if (this.destroyed || !this.assessmentLoading()) return;
      this.requestMapRender();
      this.assessmentAnimationFrame = requestAnimationFrame(render);
    };
    this.zone.runOutsideAngular(() => {
      this.assessmentAnimationFrame = requestAnimationFrame(render);
    });
  }

  private stopAssessmentRenderLoop() {
    if (this.assessmentAnimationFrame !== undefined) {
      cancelAnimationFrame(this.assessmentAnimationFrame);
      this.assessmentAnimationFrame = undefined;
    }
  }

  private stopAssessmentAnimation() {
    this.stopAssessmentRenderLoop();
    this.assessmentMotionPreference?.removeEventListener('change', this.onAssessmentMotionChange);
    this.assessmentMotionPreference = undefined;
    const Cesium = this.Cesium;
    const polygon = this.drawingSource?.entities.getById('drawn-area')?.polygon;
    if (Cesium && polygon) {
      polygon.material = new Cesium.ColorMaterialProperty(
        Cesium.Color.fromCssColorString('#b9c5be').withAlpha(0.25),
      );
    }
    if (!this.destroyed) this.requestMapRender();
  }

  cancelDrawing() {
    this.drawingSource?.entities.removeById('drawing-draft');
    for (const vertex of this.vertexEntities) this.drawingSource?.entities.remove(vertex);
    this.vertexEntities.length = 0;
    this.drawingPoints.set([]);
    this.drawingMessage.set('');
    this.drawing.set(false);
    if (this.assessmentSource) this.assessmentSource.show = true;
    const selectedArea = this.drawingSource?.entities.getById('drawn-area');
    if (selectedArea) selectedArea.show = true;
    if (this.exampleArea) this.exampleArea.show = !this.hasSelectedArea() && !this.hiddeHeatMap();
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
    this.addVertexEntity(point);
    this.requestMapRender();
  }

  private addVertexEntity(point: Cartesian3) {
    const Cesium = this.Cesium;
    const source = this.drawingSource;
    if (!Cesium || !source) return;
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
    if (this.hasSelectedArea()) return;
    const viewer = this.viewer;
    const Cesium = this.Cesium;
    const exampleArea = this.exampleArea;
    if (!viewer || viewer.isDestroyed() || !Cesium || !exampleArea) return;

    viewer.zoomTo(
      exampleArea,
      new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(-40), 2500),
    ).catch((err) => console.error('Could not frame the example area', err));
  }

  private frameSelectedArea() {
    const viewer = this.viewer;
    const Cesium = this.Cesium;
    const target = this.drawingSource?.entities.getById('drawn-area') ?? this.exampleArea;
    if (!viewer || viewer.isDestroyed() || !Cesium || !target) return;
    viewer.resize();
    viewer.zoomTo(target, new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(-40), 0))
      .catch(error => console.error('Could not frame the selected area', error));
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
  readonly riskRanges: Record<Danger, string> = {
    low: '< 11.2', moderate: '11.2 – < 21.3', high: '21.3 – < 38',
    veryHigh: '38 – < 50', extreme: '50 – 70', veryExtreme: '> 70',
  };
  private readonly riskColors: Record<FWIRiskLevel, Danger> = {
    LOW: 'low',
    MODERATE: 'moderate',
    HIGH: 'high',
    VERY_HIGH: 'veryHigh',
    EXTREME: 'extreme',
    VERY_EXTREME: 'veryExtreme',
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
            this.zone.run(() => this.handleMapClick(event.position));
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
    clearTimeout(this.assessmentSlowTimer);
    this.clearRetryTimer();
    this.stopAssessmentAnimation();
    clearTimeout(this.mapLoadTimeout);
    this.cancelMapLoad?.();
    this.drawingHandler?.destroy();
    this.viewer?.destroy();
  }
}
