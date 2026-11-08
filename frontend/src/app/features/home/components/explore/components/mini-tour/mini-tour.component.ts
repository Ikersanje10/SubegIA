import { afterNextRender, Component, ElementRef, inject, Injector, input, output, signal, viewChild } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-mini-tour',
  imports: [TranslatePipe],
  templateUrl: './mini-tour.component.html',
  styleUrl: './mini-tour.component.css',
  host: {
    '(keydown.escape)': 'handleEscape($event)',
    '[class.tour-open]': 'step() !== null',
  },
})
export class MiniTourComponent {
  readonly ready = input(false);
  readonly available = input(true);
  readonly stepChanged = output<number | null>();
  readonly invitationVisible = signal(true);
  readonly step = signal<number | null>(null);
  readonly steps = ['navigation', 'drawing', 'calculation', 'results'] as const;
  private readonly injector = inject(Injector);
  private readonly helpButton = viewChild<ElementRef<HTMLButtonElement>>('helpButton');
  private readonly closeButton = viewChild<ElementRef<HTMLButtonElement>>('closeButton');

  start() {
    if (!this.ready() || !this.available()) return;
    this.invitationVisible.set(false);
    this.setStep(0);
    afterNextRender(() => {
      this.closeButton()?.nativeElement.focus({ preventScroll: true });
    }, { injector: this.injector });
  }

  dismiss() {
    this.invitationVisible.set(false);
    this.close();
  }

  toggle() {
    if (this.step() === null) this.start();
    else this.close();
  }

  next() {
    const current = this.step();
    if (current === null) return;
    if (current === this.steps.length - 1) this.close();
    else this.setStep(current + 1);
  }

  previous() {
    const current = this.step();
    if (current !== null && current > 0) this.setStep(current - 1);
  }

  close() {
    this.step.set(null);
    this.stepChanged.emit(null);
    afterNextRender(() => {
      this.helpButton()?.nativeElement.focus({ preventScroll: true });
    }, { injector: this.injector });
  }

  handleEscape(event: Event) {
    if (this.step() === null && !this.invitationVisible()) return;
    event.stopPropagation();
    this.dismiss();
  }

  private setStep(step: number) {
    this.step.set(step);
    this.stepChanged.emit(step);
  }
}
