import { Component } from '@angular/core';
import { CesiumMapComponent } from './components/cesium-map/cesium-map.component';
import { InfoPanelComponent } from './components/info-panel/info-panel.component';

// Arrasate / Mondragón (longitude first, then latitude)

@Component({
  imports: [CesiumMapComponent, InfoPanelComponent],
  selector: 'app-explore',
  styleUrl: './explore.component.css',
  templateUrl: './explore.component.html',
})
export class ExploreComponent {
}