import { TestBed } from '@angular/core/testing';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import es from '../../../../../../public/i18n/es.json';
import en from '../../../../../../public/i18n/en.json';
import eu from '../../../../../../public/i18n/eu.json';
import { HowItWorksComponent } from './how-it-works.component';

describe('HowItWorksComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HowItWorksComponent],
      providers: [provideTranslateService({ lang: 'es' })],
    }).compileComponents();

    const translate = TestBed.inject(TranslateService);
    for (const [language, translations] of Object.entries({ es, en, eu })) {
      translate.setTranslation(language, translations);
    }
  });

  it('provides the navigation target and three ordered steps', async () => {
    const fixture = TestBed.createComponent(HowItWorksComponent);
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('#howWorks')?.getAttribute('aria-labelledby'))
      .toBe('how-it-works-title');
    expect(element.querySelector('#how-it-works-title')?.textContent).toBe(es.howItWorks.title);
    expect(element.querySelectorAll('ol > li')).toHaveLength(3);
  });

  it('renders all mockup copy and updates it in each supported language', async () => {
    const fixture = TestBed.createComponent(HowItWorksComponent);
    const element: HTMLElement = fixture.nativeElement;
    for (const [language, translations] of Object.entries({ es, en, eu })) {
      TestBed.inject(TranslateService).use(language);
      await fixture.whenStable();
      expect(element.querySelector('.eyebrow')?.textContent).toBe(translations.howItWorks.eyebrow);
      expect(element.querySelector('h2')?.textContent).toBe(translations.howItWorks.title);
      expect(element.querySelector('.introduction')?.textContent)
        .toBe(translations.howItWorks.introduction);
      Object.values(translations.howItWorks.steps).forEach((step, index) => {
        const card = element.querySelectorAll('li')[index];
        expect(card.querySelector('.step-label')?.textContent).toBe(step.label);
        expect(card.querySelector('h3')?.textContent).toBe(step.title);
        expect(card.querySelector('.step-description')?.textContent?.trim()).toBe(step.description);
      });
      expect(element.querySelector('a')?.textContent).toContain(translations.howItWorks.sourceLink);
      expect(element.querySelector('.visually-hidden')?.textContent)
        .toContain(translations.howItWorks.opensInNewTab);
    }
  });

  it('links safely to the EFFIS explanation of FWI', async () => {
    const fixture = TestBed.createComponent(HowItWorksComponent);
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    const link = element.querySelector('a');
    expect(link?.href).toBe(
      'https://forest-fire.emergency.copernicus.eu/about-effis/technical-background/fire-danger-forecast',
    );
    expect(link?.target).toBe('_blank');
    expect(link?.rel).toBe('noopener noreferrer');
  });
});
