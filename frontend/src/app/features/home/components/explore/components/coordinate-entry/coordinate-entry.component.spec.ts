import { TestBed } from '@angular/core/testing';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { vi } from 'vitest';
import es from '../../../../../../../../public/i18n/es.json';
import { CoordinateEntryComponent } from './coordinate-entry.component';
import axe from 'axe-core';

describe('CoordinateEntryComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CoordinateEntryComponent],
      providers: [provideTranslateService({ lang: 'es' })],
    }).compileComponents();
    TestBed.inject(TranslateService).setTranslation('es', es);
  });

  it('labels the editor and submits coordinates without querying the API itself', async () => {
    const fixture = TestBed.createComponent(CoordinateEntryComponent);
    const submitted = vi.fn();
    fixture.componentInstance.coordinatesSubmitted.subscribe(submitted);
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    const textarea = element.querySelector('textarea')!;
    expect(element.querySelector('label')?.getAttribute('for')).toBe(textarea.id);
    textarea.value = '-2.49, 43.06\n-2.48, 43.06\n-2.48, 43.07';
    textarea.dispatchEvent(new Event('input'));
    element.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    expect(submitted).toHaveBeenCalledWith([[-2.49, 43.06], [-2.48, 43.06], [-2.48, 43.07]]);
  });

  it('rejects invalid or incomplete coordinates with a visible accessible error', async () => {
    const fixture = TestBed.createComponent(CoordinateEntryComponent);
    const submitted = vi.fn();
    fixture.componentInstance.coordinatesSubmitted.subscribe(submitted);
    for (const text of ['', '1, 2\n3, 4', 'bad, 43\n1,2\n3,4', '181,43\n1,2\n3,4',
      '1,2,3\n1,2\n3,4', '1, 91\n1,2\n3,4']) {
      fixture.componentInstance.text.set(text);
      fixture.componentInstance.submit(new Event('submit'));
      await fixture.whenStable();
      expect(fixture.componentInstance.invalid()).toBe(true);
      expect(fixture.nativeElement.querySelector('textarea').getAttribute('aria-invalid')).toBe('true');
      expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain(es.mapControls.coordinates.invalid);
    }
    expect(submitted).not.toHaveBeenCalled();
  });

  it('updates the text when corners are changed on the map', async () => {
    const fixture = TestBed.createComponent(CoordinateEntryComponent);
    fixture.componentRef.setInput('coordinates', [[-2.49, 43.06], [-2.48, 43.07]]);
    await fixture.whenStable();
    expect(fixture.componentInstance.text()).toBe('-2.49, 43.06\n-2.48, 43.07');
    fixture.componentRef.setInput('coordinates', []);
    await fixture.whenStable();
    expect(fixture.componentInstance.text()).toBe('');
  });

  it('passes semantic accessibility checks with the editor open and a validation error', async () => {
    const fixture = TestBed.createComponent(CoordinateEntryComponent);
    fixture.componentInstance.submit(new Event('submit'));
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    element.querySelector('details')!.open = true;
    const result = await axe.run(element, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
      rules: { 'color-contrast': { enabled: false } },
    });
    expect(result.violations).toEqual([]);
  });
});
