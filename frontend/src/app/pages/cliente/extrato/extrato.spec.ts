import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Subject, throwError } from 'rxjs';
import { Extrato } from './extrato';
import { AuthService } from '../../../shared/services/auth';
import { ContaService } from '../../../shared/services/conta';
import { Conta } from '../../../shared/models/conta';
import { ExtratoResponse } from '../../../shared/models/extrato';

describe('Extrato', () => {
  let component: Extrato;
  let fixture: ComponentFixture<Extrato>;
  let authService: { getUsuario: ReturnType<typeof vi.fn> };
  let contaService: {
    buscarPorCpf: ReturnType<typeof vi.fn>;
    buscarExtrato: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    authService = {
      getUsuario: vi.fn(() => ({
        cpf: '12912861012',
        nome: 'Catharyna',
        email: 'cliente@example.com'
      }))
    };

    contaService = {
      buscarPorCpf: vi.fn(),
      buscarExtrato: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [Extrato],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authService },
        { provide: ContaService, useValue: contaService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Extrato);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('deve encerrar o carregamento e exibir o extrato após a resposta', () => {
    const conta$ = new Subject<Conta>();
    const extrato$ = new Subject<ExtratoResponse>();

    contaService.buscarPorCpf.mockReturnValue(conta$);
    contaService.buscarExtrato.mockReturnValue(extrato$);

    fixture.detectChanges();
    expect(component.carregando).toBe(true);

    conta$.next({
      numeroConta: '1291',
      cpfCliente: '12912861012',
      dataCriacao: '2000-01-01T00:00:00Z',
      saldo: '800.00',
      cpfGerente: '98574307084'
    });
    conta$.complete();

    extrato$.next({
      numeroConta: '1291',
      inicio: '2026-11-01T00:00:00-03:00',
      fim: '2026-11-07T23:59:59-03:00',
      saldoAbertura: '800.00',
      movimentacoes: []
    });
    extrato$.complete();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(component.carregando).toBe(false);
    expect(component.extrato?.numeroConta).toBe('1291');
    expect(texto).toContain('Nenhuma movimentação neste dia.');
    expect(texto).not.toContain('Carregando extrato...');
  });

  it('deve encerrar o carregamento e exibir erro quando a consulta falhar', () => {
    contaService.buscarPorCpf.mockReturnValue(
      throwError(() => new Error('Falha na conta'))
    );

    fixture.detectChanges();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(component.carregando).toBe(false);
    expect(component.mensagemErro).toBe('Não foi possível carregar o extrato.');
    expect(texto).toContain('Não foi possível carregar o extrato.');
    expect(texto).not.toContain('Carregando extrato...');
  });
});
