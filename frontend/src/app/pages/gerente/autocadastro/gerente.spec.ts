import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, NEVER } from 'rxjs';
import { Gerente } from '../gerente';
import { Solicitacao } from '../../../shared/models/solicitacao';
import { SolicitacaoService } from '../../../shared/services/solicitacao';
import { GerenteService } from '../../../shared/services/gerente';

describe('Gerente', () => {
  let component: Gerente;
  let fixture: ComponentFixture<Gerente>;
  let solicitacaoService: { listar: ReturnType<typeof vi.fn> };
  let gerenteService: { aprovarCliente: ReturnType<typeof vi.fn>; recusarCliente: ReturnType<typeof vi.fn> };

  const pendente: Solicitacao = {
    cpf: '12345678901', nome: 'Cliente pendente', salario: '1500.00',
    status: 'PENDENTE', motivo: null, dataHoraAnalise: null
  };

  beforeEach(async () => {
    solicitacaoService = { listar: vi.fn(() => of([])) };
    gerenteService = {
      aprovarCliente: vi.fn(() => of({})),
      recusarCliente: vi.fn(() => of({
        ...pendente, status: 'NAO_APROVADO', motivo: 'Documentação incompleta',
        dataHoraAnalise: '2026-10-20T10:00:00Z'
      }))
    };

    await TestBed.configureTestingModule({
      imports: [Gerente],
      providers: [
        provideRouter([]),
        { provide: SolicitacaoService, useValue: solicitacaoService },
        { provide: GerenteService, useValue: gerenteService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Gerente);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('deve exibir solicitações nos três estados', () => {
    component.solicitacoes.set([
      pendente,
      { ...pendente, cpf: '12345678902', nome: 'Cliente aprovado', status: 'APROVADO', dataHoraAnalise: '2026-10-20T09:00:00Z' },
      { ...pendente, cpf: '12345678903', nome: 'Cliente não aprovado', status: 'NAO_APROVADO', motivo: 'Documentação incompleta', dataHoraAnalise: '2026-10-20T10:00:00Z' }
    ]);
    fixture.detectChanges();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Pendente');
    expect(texto).toContain('Aprovado');
    expect(texto).toContain('Não aprovado');
    expect(texto).toContain('Documentação incompleta');
  });

  it('deve validar o motivo e enviar o payload normalizado', () => {
    component.solicitacoes.set([pendente]);
    component.iniciarRecusa(pendente);
    component.motivoRecusa.set('   ');
    component.confirmarRecusa();
    expect(gerenteService.recusarCliente).not.toHaveBeenCalled();

    component.motivoRecusa.set('  Documentação incompleta  ');
    component.confirmarRecusa();

    expect(gerenteService.recusarCliente).toHaveBeenCalledWith(
      pendente.cpf, 'Documentação incompleta'
    );
    expect(component.solicitacoes()[0].status).toBe('NAO_APROVADO');
    expect(component.solicitacoes()[0].motivo).toBe('Documentação incompleta');
  });

  it('deve bloquear requisições duplicadas durante a rejeição', () => {
    gerenteService.recusarCliente.mockReturnValue(NEVER);
    component.solicitacoes.set([pendente]);
    component.iniciarRecusa(pendente);
    component.motivoRecusa.set('Motivo válido');
    component.confirmarRecusa();
    component.confirmarRecusa();

    expect(gerenteService.recusarCliente).toHaveBeenCalledTimes(1);
    expect(component.processando()).toBe(pendente.cpf);
  });
});
