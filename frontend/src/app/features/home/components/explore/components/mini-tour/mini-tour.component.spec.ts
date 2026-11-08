import { TestBed } from '@angular/core/testing';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { vi } from 'vitest';
import axe from 'axe-core';
import es from '../../../../../../../../public/i18n/es.json';
import en from '../../../../../../../../public/i18n/en.json';
import eu from '../../../../../../../../public/i18n/eu.json';
import { MiniTourComponent } from './mini-tour.component';

describe('MiniTourComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MiniTourComponent],
      providers: [provideTranslateService({ lang: 'es' })],
    }).compileComponents();
    const translations = TestBed.inject(TranslateService);
    translations.setTranslation('es', es);
    translations.setTranslation('en', en);
    translations.setTranslation('eu', eu);
  });

  it('waits for map readiness without stealing focus', async () => {
    const fixture = TestBed.createComponent(MiniTourComponent);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('button')).toBeNull();
    const focus = document.activeElement;
    fixture.componentRef.setInput('ready', true);
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain(es.miniTour.invitation.title);
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(focus);
  });

  it('dismisses for this visit, reopens with the help button and invites on a new instance', async () => {
    const fixture = TestBed.createComponent(MiniTourComponent);
    fixture.componentRef.setInput('ready', true);
    await fixture.whenStable();
    fixture.componentInstance.dismiss();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.tour-card')).toBeNull();
    const help: HTMLButtonElement = fixture.nativeElement.querySelector('.help-button');
    help.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.step()).toBe(0);
    expect(help.getAttribute('aria-expanded')).toBe('true');
    fixture.componentInstance.close();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.tour-card')).toBeNull();
    const anotherVisit = TestBed.createComponent(MiniTourComponent);
    anotherVisit.componentRef.setInput('ready', true);
    await anotherVisit.whenStable();
    expect(anotherVisit.nativeElement.textContent).toContain(es.miniTour.invitation.title);
  });

  it('navigates four bounded steps and clears the highlight on completion', async () => {
    const fixture = TestBed.createComponent(MiniTourComponent);
    fixture.componentRef.setInput('ready', true);
    const changed = vi.fn();
    fixture.componentInstance.stepChanged.subscribe(changed);
    await fixture.whenStable();
    fixture.componentInstance.previous();
    fixture.componentInstance.next();
    expect(fixture.componentInstance.step()).toBeNull();
    fixture.componentInstance.start();
    fixture.componentInstance.previous();
    expect(fixture.componentInstance.step()).toBe(0);
    for (let step = 0; step < 4; step++) {
      await fixture.whenStable();
      expect(fixture.nativeElement.querySelector('[role="dialog"]').textContent)
        .toContain(`Paso ${step + 1} de 4`);
      fixture.componentInstance.next();
    }
    await fixture.whenStable();
    expect(changed.mock.calls.map(call => call[0])).toEqual([0, 1, 2, 3, null]);
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();
    fixture.componentInstance.start();
    fixture.componentInstance.next();
    fixture.componentInstance.previous();
    expect(fixture.componentInstance.step()).toBe(0);
  });

  it('focuses the close button and closes with Escape without closing the surrounding map', async () => {
    const fixture = TestBed.createComponent(MiniTourComponent);
    fixture.componentRef.setInput('ready', true);
    await fixture.whenStable();
    document.body.appendChild(fixture.nativeElement);
    fixture.componentInstance.start();
    await fixture.whenStable();
    const title: HTMLHeadingElement = fixture.nativeElement.querySelector('#mini-tour-title');
    expect(document.activeElement).toBe(fixture.nativeElement.querySelector('.tour-close'));
    const escaped = vi.fn();
    document.body.addEventListener('keydown', escaped);
    try {
      title.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await fixture.whenStable();
      expect(escaped).not.toHaveBeenCalled();
      expect(fixture.componentInstance.step()).toBeNull();
      expect(document.activeElement).toBe(fixture.nativeElement.querySelector('.help-button'));
    } finally {
      document.body.removeEventListener('keydown', escaped);
      fixture.nativeElement.remove();
    }
  });

  it('explains why it cannot start during an existing drawing or calculation', async () => {
    const fixture = TestBed.createComponent(MiniTourComponent);
    fixture.componentRef.setInput('ready', true);
    fixture.componentRef.setInput('available', false);
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain(es.miniTour.busy);
    expect(fixture.nativeElement.querySelector('.help-button').disabled).toBe(true);
    fixture.componentInstance.start();
    expect(fixture.componentInstance.step()).toBeNull();
    fixture.componentRef.setInput('available', true);
    fixture.componentInstance.start();
    await fixture.whenStable();
    expect(fixture.componentInstance.step()).toBe(0);
  });

  it('preserves the current step when switching language', async () => {
    const fixture = TestBed.createComponent(MiniTourComponent);
    fixture.componentRef.setInput('ready', true);
    fixture.componentInstance.start();
    fixture.componentInstance.next();
    const translations = TestBed.inject(TranslateService);
    for (const [language, dictionary] of [['es', es], ['en', en], ['eu', eu]] as const) {
      translations.use(language);
      await fixture.whenStable();
      expect(fixture.componentInstance.step()).toBe(1);
      expect(fixture.nativeElement.querySelector('h2').textContent).toBe(dictionary.miniTour.steps.drawing.title);
      expect(fixture.nativeElement.querySelector('.help-button').getAttribute('aria-label')).toBe(dictionary.miniTour.help);
    }
  });

  it('never reads or writes browser storage to remember the tour', async () => {
    const fixture = TestBed.createComponent(MiniTourComponent);
    fixture.componentRef.setInput('ready', true);
    await fixture.whenStable();
    const read = vi.spyOn(Storage.prototype, 'getItem');
    const write = vi.spyOn(Storage.prototype, 'setItem');
    try {
      fixture.componentInstance.dismiss();
      fixture.componentInstance.start();
      fixture.componentInstance.next();
      fixture.componentInstance.close();
      await fixture.whenStable();
      expect(read).not.toHaveBeenCalled();
      expect(write).not.toHaveBeenCalled();
    } finally {
      read.mockRestore();
      write.mockRestore();
    }
  });

  it('passes semantic accessibility checks for the invitation and tour', async () => {
    const fixture = TestBed.createComponent(MiniTourComponent);
    fixture.componentRef.setInput('ready', true);
    for (const open of [false, true]) {
      if (open) fixture.componentInstance.start();
      await fixture.whenStable();
      const result = await axe.run(fixture.nativeElement, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
        rules: { 'color-contrast': { enabled: false } },
      });
      expect(result.violations).toEqual([]);
    }
  });
});
