import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { Saque } from './saque';

describe('Saque', () => {
  let component: Saque;
  let fixture: ComponentFixture<Saque>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Saque],
      providers: [provideHttpClient(), provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(Saque);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
