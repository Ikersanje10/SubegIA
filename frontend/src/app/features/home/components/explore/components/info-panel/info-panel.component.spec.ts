import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import en from '../../../../../../../../public/i18n/en.json';
import es from '../../../../../../../../public/i18n/es.json';
import eu from '../../../../../../../../public/i18n/eu.json';
import { InfoPanelComponent } from './info-panel.component';
import type { SubAreaAssessment } from '../../../../../../api/Assessment';

function assessmentFixture(width: number): SubAreaAssessment {
  return {
    column: 0, row: 0,
    geometry: { type: 'Polygon', coordinates: [[[0, 43], [width, 43], [width, 44], [0, 44], [0, 43]]] },
    fwi: 5, riskLevel: 'LOW', date: '2026-11-01', status: 'AVAILABLE',
    unavailableReason: null, moistureState: null, model: 'meteofrance_arome_france_hd',
    sourceLongitude: 0, sourceLatitude: 43, experimental: true,
    initialState: { date: '2025-11-01', ffmc: 85, dmc: 6, dc: 15 }, calculationDays: 365,
  };
}

describe('InfoPanelComponent', () => {
  let component: InfoPanelComponent;
  let fixture: ComponentFixture<InfoPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InfoPanelComponent],
      providers: [provideTranslateService({ lang: 'es' })],
    }).compileComponents();

    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('es', es);
    translate.setTranslation('en', en);
    translate.setTranslation('eu', eu);
    fixture = TestBed.createComponent(InfoPanelComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('replaces example copy after area submission without restoring the fake score', async () => {
    const element: HTMLElement = fixture.nativeElement;
    fixture.componentRef.setInput('hasSelectedArea', true);
    for (const [language, translations] of Object.entries({ es, en, eu })) {
      TestBed.inject(TranslateService).use(language);
      fixture.componentRef.setInput('loading', true);
      await fixture.whenStable();
      expect(element.querySelector('h2')?.textContent).toBe(translations.infoPanel.selected.title);
      expect(element.querySelector('.demo-notice')?.textContent).toBe(translations.infoPanel.selected.notice);
      expect(element.querySelector('app-skeleton')).not.toBeNull();
      expect(element.querySelector('.design-notes')).toBeNull();
      expect(element.textContent).not.toContain(translations.infoPanel.result.title);

      fixture.componentRef.setInput('loading', false);
      await fixture.whenStable();
      expect(element.querySelector('.fwi-reading')).toBeNull();
      expect(element.querySelector('.result-hint')?.textContent).toBe(translations.infoPanel.summary.unavailable);
      expect(element.querySelector('.context')?.textContent).toContain('Open-Meteo');
    }
    fixture.componentRef.setInput('assessmentError', true);
    await fixture.whenStable();
    expect(element.querySelector('.fwi-reading')).toBeNull();
    expect(element.querySelector('.result-hint')).toBeNull();
  });

  it('displays real maximum, surface coverage and dates instead of the example', async () => {
    fixture.componentRef.setInput('hasSelectedArea', true);
    fixture.componentRef.setInput('assessments', [
      { ...assessmentFixture(3), fwi: 30, riskLevel: 'HIGH' },
      { ...assessmentFixture(1), status: 'UNAVAILABLE', fwi: null, riskLevel: null },
    ]);
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('.fwi-reading strong')?.textContent).toBe('30.0');
    expect(element.querySelector('.danger-badge')?.textContent).toBe(es.mapLegend.levels.high);
    expect(element.querySelector('.summary-distribution')?.textContent).toContain('75.0%');
    expect(element.querySelector('.summary-distribution')?.textContent).toContain('25.0%');
    expect(element.querySelector('time')?.getAttribute('datetime')).toBe('2026-11-01');
    expect(element.textContent).not.toContain('27.4');
    fixture.componentRef.setInput('loading', true);
    await fixture.whenStable();
    expect(element.querySelector('.summary-distribution')).toBeNull();
    expect(element.querySelector('app-skeleton')).not.toBeNull();
  });

  it('replaces result and context fields with decorative skeletons while loading', async () => {
    fixture.componentRef.setInput('loading', true);
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;

    expect(element.querySelector('.info-panel')?.getAttribute('aria-busy')).toBe('true');
    expect(element.querySelector('[role="status"]')?.textContent).toBe(es.infoPanel.loading);
    expect(element.querySelectorAll('[role="status"]')).toHaveLength(1);
    expect(element.querySelectorAll('app-skeleton')).toHaveLength(14);
    for (const skeleton of element.querySelectorAll('app-skeleton')) {
      expect(skeleton.getAttribute('aria-hidden')).toBe('true');
    }
    expect(element.querySelector('.fwi-reading')).toBeNull();
    expect(element.querySelector('dl')).toBeNull();
    expect(element.querySelector('.safety-notice')).not.toBeNull();

    fixture.componentRef.setInput('loading', false);
    await fixture.whenStable();
    expect(element.querySelector('.info-panel')?.getAttribute('aria-busy')).toBe('false');
    expect(element.querySelectorAll('app-skeleton')).toHaveLength(0);
    expect(element.querySelector('[role="status"]')?.textContent).toBe('');
    expect(element.querySelector('.fwi-reading strong')?.textContent).toBe('27.4');
  });

  it('translates loading and assessment errors in every supported language', async () => {
    const element: HTMLElement = fixture.nativeElement;
    for (const [language, translations] of Object.entries({ es, en, eu })) {
      TestBed.inject(TranslateService).use(language);
      fixture.componentRef.setInput('loading', true);
      fixture.componentRef.setInput('assessmentError', false);
      await fixture.whenStable();
      expect(element.querySelector('[role="status"]')?.textContent).toBe(translations.infoPanel.loading);
      expect(element.querySelector('[role="alert"]')).toBeNull();

      fixture.componentRef.setInput('loading', false);
      fixture.componentRef.setInput('assessmentError', true);
      await fixture.whenStable();
      expect(element.querySelector('[role="alert"]')?.textContent).toBe(translations.infoPanel.assessmentError);
      expect(element.querySelector('app-skeleton')).toBeNull();
    }
  });

  it('shows the illustrative result and its safety notices', () => {
    const element: HTMLElement = fixture.nativeElement;

    expect(element.querySelector('h2')?.textContent).toBe(es.infoPanel.title);
    expect(element.querySelector('.fwi-reading strong')?.textContent).toBe('27.4');
    expect(element.querySelector('.danger-badge')?.textContent).toBe(es.infoPanel.result.high);
    expect(element.querySelector('.demo-notice')?.textContent).toContain(
      es.infoPanel.demoNotice,
    );
    expect(element.querySelector('.safety-notice')?.textContent).toContain(
      es.infoPanel.safety.description,
    );
  });

  it('describes the map context with five labelled values', () => {
    const element: HTMLElement = fixture.nativeElement;
    const rows = element.querySelectorAll('dl > div');

    expect(rows).toHaveLength(5);
    for (const row of rows) {
      expect(row.querySelector('dt')?.textContent?.trim()).toBeTruthy();
      expect(row.querySelector('dd')?.textContent?.trim()).toBeTruthy();
    }
    expect(element.querySelector('dl')?.textContent).toContain('Cesium World Terrain');
    expect(element.querySelector('dl')?.textContent).toContain(es.infoPanel.context.fwiSourceValue);
  });

  it('links to a focusable limitations explanation on the page', () => {
    const element: HTMLElement = fixture.nativeElement;
    const link = element.querySelector<HTMLAnchorElement>('.safety-notice a');
    const target = element.querySelector('#map-limitations');

    expect(link?.getAttribute('href')).toBe('#map-limitations');
    expect(target?.getAttribute('tabindex')).toBe('-1');
    expect(target?.textContent).toContain(es.infoPanel.safety.providers);
  });

  for (const [language, translations] of Object.entries({ es, en, eu })) {
    it(`renders the panel in ${language} without unresolved keys`, async () => {
      TestBed.inject(TranslateService).use(language);
      await fixture.whenStable();
      const element: HTMLElement = fixture.nativeElement;

      expect(element.querySelector('h2')?.textContent).toBe(translations.infoPanel.title);
      expect(element.querySelector('.danger-badge')?.textContent).toBe(
        translations.infoPanel.result.high,
      );
      expect(element.querySelector('.safety-notice')?.textContent).toContain(
        translations.infoPanel.safety.description,
      );
      expect(element.querySelector('.provider-notice')?.textContent).toContain(
        translations.infoPanel.safety.providers,
      );
      expect(element.textContent).not.toContain('infoPanel.');
      expect(element.querySelector('.fwi-reading strong')?.textContent).toBe('27.4');
    });
  }

  it('keeps the same translation keys in every language', () => {
    const keys = (value: object): string[] => Object.entries(value).flatMap(([key, entry]) =>
      typeof entry === 'object' && entry !== null
        ? keys(entry).map(child => `${key}.${child}`)
        : [key],
    ).sort();

    expect(keys(en.infoPanel)).toEqual(keys(es.infoPanel));
    expect(keys(eu.infoPanel)).toEqual(keys(es.infoPanel));
  });
});
