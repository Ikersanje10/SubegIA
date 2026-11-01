import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HeaderComponent } from './header.component';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import es from '../../../../../public/i18n/es.json';
import axe from 'axe-core';

describe('HeaderComponent', () => {
  let component: HeaderComponent;
  let fixture: ComponentFixture<HeaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeaderComponent],
      providers: [provideTranslateService()],
    }).compileComponents();

    fixture = TestBed.createComponent(HeaderComponent);
    TestBed.inject(TranslateService).setTranslation('es', es);
    TestBed.inject(TranslateService).use('es');
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('passes automated semantic accessibility checks for the header', async () => {
    const result = await axe.run(fixture.nativeElement as HTMLElement, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
      rules: { 'color-contrast': { enabled: false } },
    });
    expect(result.violations).toEqual([]);
  });

  it('provides a page heading, banner and accessible names containing visible language codes', () => {
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('header h1')?.textContent).toBe('SubegIA');
    for (const button of element.querySelectorAll<HTMLButtonElement>('.languageButton')) {
      expect(button.getAttribute('aria-label')).toContain(button.textContent?.trim());
    }
    const previousLanguage = document.documentElement.lang;
    try {
      component.updateLanguage('eu');
      expect(document.documentElement.lang).toBe('eu');
    } finally {
      document.documentElement.lang = previousLanguage;
    }
  });

  it('links to the project section and closes the mobile menu on navigation', async () => {
    component.toggle();
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    const link = element.querySelector<HTMLAnchorElement>('a[href="#project"]');
    expect(link).not.toBeNull();
    link?.click();
    await fixture.whenStable();
    expect(component.menuOpen()).toBe(false);
    expect(element.querySelector('.burger')?.getAttribute('aria-expanded')).toBe('false');
  });
});
