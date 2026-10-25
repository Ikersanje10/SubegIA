import { Component } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-limitations',
  imports: [TranslatePipe],
  templateUrl: './limitations.component.html',
  styleUrl: './limitations.component.css',
})
export class LimitationsComponent {
  readonly topics = ['data', 'scale', 'history', 'updates', 'scope', 'decisions'] as const;
}
