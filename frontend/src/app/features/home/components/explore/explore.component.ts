import { afterNextRender, Component, ElementRef, inject, NgZone, OnDestroy, viewChild } from '@angular/core';
import type { Viewer } from 'cesium';
import { environment } from '../../../../../environments/environment';

// Arrasate / Mondragón (longitude first, then latitude)
const LON = -2.49;
const LAT = 43.066;

@Component({
  imports: [],
  selector: 'app-explore',
  styleUrl: './explore.component.css',
  templateUrl: './explore.component.html',
})
export class ExploreComponent implements OnDestroy {
  private readonly mapEl = viewChild.required<ElementRef<HTMLDivElement>>('map');
  private readonly zone = inject(NgZone);
  private viewer?: Viewer;
  private destroyed = false;

  constructor() {
    afterNextRender(() => this.initMap());
  }

  private async initMap() {
    const container = this.mapEl().nativeElement; // read it before any await

    const Cesium = await import('cesium'); // loaded only in the browser, in its own chunk
    if (this.destroyed) return;

    this.zone.runOutsideAngular(() => {
      Cesium.Ion.defaultAccessToken = environment.cesiumIonToken;

      this.viewer = new Cesium.Viewer(container, {
        terrain: Cesium.Terrain.fromWorldTerrain(), // 3D mountains
        animation: false,
        timeline: false,
        baseLayerPicker: false,
        geocoder: false,
        homeButton: false,
        sceneModePicker: false,
        navigationHelpButton: false,
        fullscreenButton: false,
      });

      const scene = this.viewer.scene;
      scene.globe.enableLighting = true;
      scene.verticalExaggeration = 1.5;
      scene.globe.depthTestAgainstTerrain = true;

      // Morning sun: low light from the east makes the relief stand out
      this.viewer.clock.currentTime = Cesium.JulianDate.fromIso8601('2026-06-21T10:00:00Z');

      // 3D buildings (OpenStreetMap). Loaded in the background so the map appears first.
      Cesium.createOsmBuildingsAsync()
        .then((buildings) => {
          if (this.destroyed || !this.viewer || this.viewer.isDestroyed()) return;
          this.viewer.scene.primitives.add(buildings);
        })
        .catch((error) => console.error('Could not load 3D buildings', error));

      // Look at the town from a tilted angle
      const target = Cesium.Cartesian3.fromDegrees(LON, LAT, 300); // the town sits roughly 200 m above sea level
      this.viewer.camera.lookAt(
        target,
        new Cesium.HeadingPitchRange(
          Cesium.Math.toRadians(0),   // 0 = camera south of the town, looking north
          Cesium.Math.toRadians(-35), // tilt: shows the relief and the buildings
          1000,                       // distance in metres (2000 to 6000 works well)
        ),
      );
      this.viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY); // frees the camera for the user
    });
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.viewer?.destroy();
  }
}