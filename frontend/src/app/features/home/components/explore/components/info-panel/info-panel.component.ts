import { Component } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  imports: [TranslatePipe],
  selector: 'app-info-panel',
  styleUrl: './info-panel.component.css',
  templateUrl: './info-panel.component.html',
})
export class InfoPanelComponent { }
