import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { Cliente } from './cliente';

describe('Cliente', () => {
  let component: Cliente;
  let fixture: ComponentFixture<Cliente>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Cliente],
      providers: [provideHttpClient(), provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(Cliente);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
