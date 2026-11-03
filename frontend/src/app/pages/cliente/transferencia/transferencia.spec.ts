import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { Transferencia } from './transferencia';

describe('Transferencia', () => {
  let component: Transferencia;
  let fixture: ComponentFixture<Transferencia>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Transferencia],
      providers: [provideHttpClient(), provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(Transferencia);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
