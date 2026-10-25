import { TestBed } from '@angular/core/testing';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import es from '../../../../../../public/i18n/es.json';
import en from '../../../../../../public/i18n/en.json';
import eu from '../../../../../../public/i18n/eu.json';
import { ProjectComponent } from './project.component';

describe('ProjectComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectComponent],
      providers: [provideTranslateService({ lang: 'es' })],
    }).compileComponents();

    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('es', es);
    translate.setTranslation('en', en);
    translate.setTranslation('eu', eu);
  });

  it('renders the named project section and all three pillars from the design', async () => {
    const fixture = TestBed.createComponent(ProjectComponent);
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    const section = element.querySelector('#project');
    expect(section?.getAttribute('aria-labelledby')).toBe('project-title');
    expect(element.querySelector('#project-title')?.textContent).toBe(es.project.title);
    expect(element.querySelector('.introduction')?.textContent).toBe(es.project.introduction);
    const cards = element.querySelectorAll('article');
    expect(cards).toHaveLength(3);
    Object.values(es.project.pillars).forEach((pillar, index) => {
      expect(cards[index].querySelector('.card-label')?.textContent).toBe(pillar.label);
      expect(cards[index].querySelector('h3')?.textContent).toBe(pillar.title);
      expect(cards[index].querySelector('.card-description')?.textContent?.trim())
        .toBe(pillar.description);
    });
  });

  it('updates all project copy when the language changes', async () => {
    const fixture = TestBed.createComponent(ProjectComponent);
    const element: HTMLElement = fixture.nativeElement;
    for (const [language, translations] of Object.entries({ es, en, eu })) {
      TestBed.inject(TranslateService).use(language);
      await fixture.whenStable();
      expect(element.querySelector('h2')?.textContent).toBe(translations.project.title);
      expect(element.querySelector('.eyebrow')?.textContent).toBe(translations.project.eyebrow);
      expect(element.querySelector('.introduction')?.textContent)
        .toBe(translations.project.introduction);
      Object.values(translations.project.pillars).forEach((pillar, index) => {
        const card = element.querySelectorAll('article')[index];
        expect(card.textContent).toContain(pillar.label);
        expect(card.textContent).toContain(pillar.title);
        expect(card.textContent).toContain(pillar.description);
      });
      expect(element.querySelector('.status-notice')?.textContent)
        .toBe(translations.project.statusNotice);
    }
  });

  it('replaces the source link with the current mockup status', async () => {
    const fixture = TestBed.createComponent(ProjectComponent);
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('a')).toBeNull();
    expect(element.querySelector('.status-notice')?.textContent).toBe(
      'Estado actual: maqueta con terreno real y valores ficticios. El MVP y sus calculos todavia no estan implementados. Colores y textos son propuestas de diseno.',
    );
  });
});
