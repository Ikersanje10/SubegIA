import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import en from '../../../../../../../../public/i18n/en.json';
import es from '../../../../../../../../public/i18n/es.json';
import eu from '../../../../../../../../public/i18n/eu.json';
import { InfoPanelComponent } from './info-panel.component';

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
    const target = element.querySelector('#limitations');

    expect(link?.getAttribute('href')).toBe('#limitations');
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
