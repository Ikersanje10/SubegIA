import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { provideTranslateService } from '@ngx-translate/core';
import { provideHttpClient } from '@angular/common/http';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideTranslateService({ lang: 'es' }), provideHttpClient()],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the application layout', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-header')).not.toBeNull();
    expect(compiled.querySelector('main app-home')).not.toBeNull();
    expect(compiled.querySelector('app-footer')).not.toBeNull();
  });

  it('makes background sections inert only while the map is expanded', async () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    app.mapExpanded.set(true);
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    for (const selector of ['app-header', 'app-footer', 'app-project', 'app-how-it-works', 'app-limitations']) {
      expect(element.querySelector(selector)?.hasAttribute('inert')).toBe(true);
    }
    expect(element.querySelector('app-explore')?.hasAttribute('inert')).toBe(false);
    app.mapExpanded.set(false);
    await fixture.whenStable();
    expect(element.querySelector('app-header')?.hasAttribute('inert')).toBe(false);
    expect(element.querySelector('app-project')?.hasAttribute('inert')).toBe(false);
  });
});
