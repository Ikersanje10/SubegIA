import { TestBed } from '@angular/core/testing';
import { SkeletonComponent } from './skeleton.component';

describe('SkeletonComponent', () => {
  it('is decorative and accepts dimensions without adding focusable content', async () => {
    TestBed.configureTestingModule({ imports: [SkeletonComponent] });
    const fixture = TestBed.createComponent(SkeletonComponent);
    fixture.componentRef.setInput('width', '8rem');
    fixture.componentRef.setInput('height', '2rem');
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.getAttribute('aria-hidden')).toBe('true');
    expect(element.style.width).toBe('8rem');
    expect(element.style.height).toBe('2rem');
    expect(element.hasAttribute('tabindex')).toBe(false);
    expect(element.textContent).toBe('');
  });
});
