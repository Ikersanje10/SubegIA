import { TestBed } from '@angular/core/testing';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import es from '../../../../../../public/i18n/es.json';
import en from '../../../../../../public/i18n/en.json';
import eu from '../../../../../../public/i18n/eu.json';
import { LimitationsComponent } from './limitations.component';

describe('LimitationsComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LimitationsComponent],
      providers: [provideTranslateService({ lang: 'es' })],
    }).compileComponents();

    for (const [language, translations] of Object.entries({ es, en, eu })) {
      TestBed.inject(TranslateService).setTranslation(language, translations);
    }
  });

  it('provides the named navigation target and a return link to explore', async () => {
    const fixture = TestBed.createComponent(LimitationsComponent);
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('#limitations')?.getAttribute('aria-labelledby'))
      .toBe('limitations-title');
    expect(element.querySelector('#limitations-title')?.textContent).toBe(es.limitations.title);
    const link = element.querySelector('a');
    expect(link?.getAttribute('href')).toBe('#explore');
    expect(link?.textContent).toBe(es.limitations.backToExplore);
  });

  it('renders all six limitations in mockup order in every supported language', async () => {
    const fixture = TestBed.createComponent(LimitationsComponent);
    const element: HTMLElement = fixture.nativeElement;
    for (const [language, translations] of Object.entries({ es, en, eu })) {
      TestBed.inject(TranslateService).use(language);
      await fixture.whenStable();
      expect(element.querySelector('.eyebrow')?.textContent).toBe(translations.limitations.eyebrow);
      expect(element.querySelector('h2')?.textContent).toBe(translations.limitations.title);
      expect(element.querySelector('.introduction')?.textContent)
        .toBe(translations.limitations.introduction);
      const cards = element.querySelectorAll('article');
      expect(cards).toHaveLength(6);
      Object.values(translations.limitations.topics).forEach((topic, index) => {
        expect(cards[index].querySelector('.card-label')?.textContent).toBe(topic.label);
        expect(cards[index].querySelector('h3')?.textContent).toBe(topic.title);
        expect(cards[index].querySelector('.card-description')?.textContent?.trim())
          .toBe(topic.description);
      });
      expect(element.querySelector('a')?.textContent).toBe(translations.limitations.backToExplore);
    }
  });
});
