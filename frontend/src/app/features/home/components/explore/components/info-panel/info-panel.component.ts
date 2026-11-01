import { Component, computed, input, output } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import type { SubAreaAssessment } from '../../../../../../api/Assessment';
import { RISK_LABELS, summarizeAssessments } from './assessment-summary';
import { TranslatePipe } from '@ngx-translate/core';
import { SkeletonComponent } from '../../../../../../shared/components/skeleton/skeleton.component';
import type { AssessmentErrorKey } from '../../../../../../api/assessment-error';

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
  readonly assessmentErrorKey = input<AssessmentErrorKey>('infoPanel.assessmentError');
  readonly retrySeconds = input(0);
  readonly assessmentSlow = input(false);
  readonly assessmentEmpty = input(false);
  readonly retryRequested = output<void>();
  readonly assessments = input<readonly SubAreaAssessment[]>([]);
  readonly summary = computed(() => summarizeAssessments(this.assessments()));
  readonly riskLabels = RISK_LABELS;
  readonly selectedAssessment = input<SubAreaAssessment | null>(null);
  readonly assessmentSelected = output<SubAreaAssessment | null>();
  readonly selectedKey = computed(() => {
    const result = this.selectedAssessment();
    return result ? `${result.column}:${result.row}` : '';
  });

  selectSubarea(event: Event) {
    if (!(event.target instanceof HTMLSelectElement)) return;
    const value = event.target.value;
    this.assessmentSelected.emit(this.assessments().find(result =>
      `${result.column}:${result.row}` === value,
    ) ?? null);
  }
}
