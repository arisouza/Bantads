import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { NEVER, of } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { GerenteListagem } from '../../../shared/models/gerente';
import { GerenteService } from '../../../shared/services/gerente';
import { Gerentes } from './gerentes';

const gerente: GerenteListagem = {
  cpf: '98574307084',
  nome: 'Geniéve',
  email: 'ger1@bantads.com.br',
  telefone: '41988880001',
  ativo: true,
  quantidadeClientes: 2
};

describe('Gerentes', () => {
  let component: Gerentes;
  let fixture: ComponentFixture<Gerentes>;
  let httpTesting: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Gerentes],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(Gerentes);
    component = fixture.componentInstance;
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  function iniciarComLista(resposta: object): void {
    fixture.detectChanges();
    httpTesting.expectOne(`${environment.apiUrl}/gerentes`).flush(resposta);
    fixture.detectChanges();
  }

  it('deve carregar a lista e exibir quantidadeClientes', () => {
    fixture.detectChanges();
    expect(component.carregando()).toBe(true);
    httpTesting.expectOne(`${environment.apiUrl}/gerentes`).flush({ gerentes: [gerente] });
    fixture.detectChanges();
    expect(component.gerentes()).toEqual([gerente]);
    expect(fixture.nativeElement.textContent).toContain('2');
    expect(fixture.nativeElement.textContent).toContain('41988880001');
  });

  it('deve exibir estado vazio', () => {
    iniciarComLista({ gerentes: [] });
    expect(fixture.nativeElement.textContent).toContain('Nenhum gerente encontrado.');
  });

  it('deve exibir estado de erro', () => {
    fixture.detectChanges();
    httpTesting.expectOne(`${environment.apiUrl}/gerentes`).flush(
      { mensagem: 'Falha' },
      { status: 500, statusText: 'Erro' }
    );
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Falha');
  });

  it('deve impedir dois submits enquanto a inserção está em andamento', () => {
    const service = TestBed.inject(GerenteService);
    vi.spyOn(service, 'listar').mockReturnValue(of([]));
    const inserir = vi.spyOn(service, 'inserir').mockReturnValue(NEVER);
    fixture.detectChanges();

    component.abrirCriacao();
    component.formulario.setValue({
      nome: 'Novo Gerente', cpf: '529.982.247-25', email: 'novo@example.com',
      telefone: '(41) 98888-0001', senha: 'tads'
    });
    component.salvar();
    component.salvar();

    expect(inserir).toHaveBeenCalledTimes(1);
    expect(component.processando()).toBe(true);
  });

  it('deve recarregar a listagem após inserir um gerente', () => {
    const service = TestBed.inject(GerenteService);
    const listar = vi.spyOn(service, 'listar').mockReturnValue(of([]));
    vi.spyOn(service, 'inserir').mockReturnValue(of(gerente));
    fixture.detectChanges();

    component.abrirCriacao();
    component.formulario.setValue({
      nome: 'Novo Gerente', cpf: '529.982.247-25', email: 'novo@example.com',
      telefone: '(41) 98888-0001', senha: 'tads'
    });
    component.salvar();

    expect(listar).toHaveBeenCalledTimes(2);
    expect(component.mensagemSucesso()).toContain('inserido');
  });

  it('deve enviar somente campos permitidos e recarregar após editar', () => {
    const service = TestBed.inject(GerenteService);
    const listar = vi.spyOn(service, 'listar').mockReturnValue(of([gerente]));
    const atualizar = vi.spyOn(service, 'atualizar').mockReturnValue(of({ ...gerente, nome: 'Nome atualizado' }));
    fixture.detectChanges();

    component.abrirEdicao(gerente);
    component.formulario.controls.nome.setValue('Nome atualizado');
    component.salvar();

    expect(atualizar).toHaveBeenCalledWith('98574307084', {
      nome: 'Nome atualizado', telefone: '41988880001'
    });
    expect(listar).toHaveBeenCalledTimes(2);
    expect(component.mensagemSucesso()).toContain('atualizado');
  });

  it('deve aplicar as máscaras ao abrir a edição', () => {
    component.abrirEdicao({ ...gerente, cpf: '98574307084', telefone: '41988880001' });

    expect(component.formulario.controls.cpf.value).toBe('985.743.070-84');
    expect(component.formulario.controls.telefone.value).toBe('(41) 98888-0001');
  });

  it('deve abrir a edição normalmente quando o telefone for nulo', () => {
    expect(() => component.abrirEdicao({
      ...gerente,
      nome: 'Gerente legado',
      cpf: '64065268052',
      email: 'legado@example.com',
      telefone: null
    })).not.toThrow();

    expect(component.modoFormulario()).toBe('editar');
    expect(component.formulario.controls.nome.value).toBe('Gerente legado');
    expect(component.formulario.controls.cpf.value).toBe('640.652.680-52');
    expect(component.formulario.controls.email.value).toBe('legado@example.com');
    expect(component.formulario.controls.telefone.value).toBe('');
  });
});
