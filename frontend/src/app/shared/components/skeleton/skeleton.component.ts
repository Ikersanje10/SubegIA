import { Component, input } from '@angular/core';

@Component({
  selector: 'app-skeleton',
  template: '',
  styleUrl: './skeleton.component.css',
  host: {
    'aria-hidden': 'true',
    '[style.width]': 'width()',
    '[style.height]': 'height()',
  },
})
export class SkeletonComponent {
  readonly width = input('100%');
  readonly height = input('1rem');
}
