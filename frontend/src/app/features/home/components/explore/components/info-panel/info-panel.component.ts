import { Component, computed, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import type { SubAreaAssessment } from '../../../../../../api/Assessment';
import { RISK_LABELS, summarizeAssessments } from './assessment-summary';
import { TranslatePipe } from '@ngx-translate/core';
import { SkeletonComponent } from '../../../../../../shared/components/skeleton/skeleton.component';

@Component({
  imports: [TranslatePipe, SkeletonComponent, DecimalPipe],
  selector: 'app-info-panel',
  styleUrl: './info-panel.component.css',
  templateUrl: './info-panel.component.html',
})
export class InfoPanelComponent {
  readonly loading = input(false);
  readonly hasSelectedArea = input(false);
  readonly assessmentError = input(false);
  readonly assessments = input<readonly SubAreaAssessment[]>([]);
  readonly summary = computed(() => summarizeAssessments(this.assessments()));
  readonly riskLabels = RISK_LABELS;
}
