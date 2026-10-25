import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { By } from '@angular/platform-browser';
import { CesiumMapComponent } from './components/cesium-map/cesium-map.component';
import { ExploreComponent } from './explore.component';

describe('ExploreComponent', () => {
  const initializeMap = CesiumMapComponent.prototype['initMap'];
  let component: ExploreComponent;
  let fixture: ComponentFixture<ExploreComponent>;

  beforeEach(async () => {
    CesiumMapComponent.prototype['initMap'] = async () => undefined;
    await TestBed.configureTestingModule({
      imports: [ExploreComponent],
      providers: [provideTranslateService()],
    }).compileComponents();

    fixture = TestBed.createComponent(ExploreComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  afterEach(() => {
    CesiumMapComponent.prototype['initMap'] = initializeMap;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('projects the same information panel into the map without duplicating it', async () => {
    const element: HTMLElement = fixture.nativeElement;
    const originalPanel = element.querySelector('app-info-panel');
    const map: CesiumMapComponent = fixture.debugElement.query(By.directive(CesiumMapComponent))
      .componentInstance;
    const originalCanvasContainer = element.querySelector('.map');

    for (let index = 0; index < 2; index++) {
      map.toggleInteraction();
      map.toggleConditions();
      await fixture.whenStable();

      expect(element.querySelector('#map-conditions app-info-panel')).toBe(originalPanel);
      expect(element.querySelectorAll('app-info-panel')).toHaveLength(1);
      expect(element.querySelectorAll('#limitations')).toHaveLength(1);
      expect(element.querySelector('.map')).toBe(originalCanvasContainer);

      map.toggleInteraction();
      await fixture.whenStable();
      expect(element.querySelector('#map-conditions app-info-panel')).toBe(originalPanel);
    }
  });
});
