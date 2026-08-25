import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Gerentes } from './gerentes';

describe('Gerentes', () => {
  let component: Gerentes;
  let fixture: ComponentFixture<Gerentes>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Gerentes],
    }).compileComponents();

    fixture = TestBed.createComponent(Gerentes);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
