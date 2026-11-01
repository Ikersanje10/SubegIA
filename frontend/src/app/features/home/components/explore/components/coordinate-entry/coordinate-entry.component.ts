import { Component, input, linkedSignal, output, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import type { Coordinate } from '../cesium-map/example-area';

@Component({
  selector: 'app-coordinate-entry',
  imports: [TranslatePipe],
  templateUrl: './coordinate-entry.component.html',
  styleUrl: './coordinate-entry.component.css',
})
export class CoordinateEntryComponent {
  readonly coordinates = input<readonly Coordinate[]>([]);
  readonly coordinatesSubmitted = output<Coordinate[]>();
  readonly text = linkedSignal(() => this.coordinates().map(point => point.join(', ')).join('\n'));
  readonly invalid = signal(false);

  updateText(event: Event) {
    if (!(event.target instanceof HTMLTextAreaElement)) return;
    this.text.set(event.target.value);
    this.invalid.set(false);
  }

  submit(event: Event) {
    event.preventDefault();
    const lines = this.text().trim().split(/\r?\n/);
    const coordinates: Coordinate[] = [];
    for (const line of lines) {
      const parts = line.trim().split(/\s*,\s*/);
      if (parts.length !== 2 || parts.some(part => !/^[+-]?\d+(?:\.\d+)?$/.test(part))) {
        this.invalid.set(true);
        return;
      }
      const longitude = Number(parts[0]), latitude = Number(parts[1]);
      if (!Number.isFinite(longitude) || !Number.isFinite(latitude)
        || Math.abs(longitude) > 180 || Math.abs(latitude) > 90) {
        this.invalid.set(true);
        return;
      }
      coordinates.push([longitude, latitude]);
    }
    if (coordinates.length < 3) {
      this.invalid.set(true);
      return;
    }
    this.invalid.set(false);
    this.coordinatesSubmitted.emit(coordinates);
  }
}
