import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FooterComponent } from './footer.component';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import es from '../../../../../public/i18n/es.json';
import en from '../../../../../public/i18n/en.json';
import eu from '../../../../../public/i18n/eu.json';

describe('FooterComponent', () => {
  let component: FooterComponent;
  let fixture: ComponentFixture<FooterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FooterComponent],
      providers: [provideTranslateService({ lang: 'es' })],
    }).compileComponents();

    for (const [language, translations] of Object.entries({ es, en, eu })) {
      TestBed.inject(TranslateService).setTranslation(language, translations);
    }
    fixture = TestBed.createComponent(FooterComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders a footer landmark with translated disclaimers and current language availability', async () => {
    const element: HTMLElement = fixture.nativeElement;
    for (const [language, translations] of Object.entries({ es, en, eu })) {
      TestBed.inject(TranslateService).use(language);
      await fixture.whenStable();
      const paragraphs = element.querySelectorAll('footer p');
      expect(paragraphs).toHaveLength(2);
      expect(paragraphs[0].textContent).toBe(translations.footer.disclaimer);
      expect(paragraphs[1].textContent).toBe(translations.footer.designNotice);
      expect(paragraphs[1].textContent).toContain('ES · EU · EN');
      expect(element.textContent).not.toContain('footer works!');
    }
  });
});
