import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { Extrato } from './extrato';

describe('Extrato', () => {
  let component: Extrato;
  let fixture: ComponentFixture<Extrato>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Extrato],
      providers: [provideHttpClient(), provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(Extrato);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
