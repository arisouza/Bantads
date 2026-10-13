import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { NEVER, of, throwError } from 'rxjs';

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
  let service: GerenteService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Gerentes],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    }).compileComponents();

    service = TestBed.inject(GerenteService);
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

  it('deve preservar a tabela quando a atualização falhar com dados carregados', () => {
    fixture.detectChanges();
    httpTesting.expectOne(`${environment.apiUrl}/gerentes`).flush({ gerentes: [gerente] });
    fixture.detectChanges();

    component.carregarGerentes();
    httpTesting.expectOne(`${environment.apiUrl}/gerentes`).flush(
      { mensagem: 'Falha na atualização' },
      { status: 500, statusText: 'Erro' }
    );
    fixture.detectChanges();

    expect(component.gerentes()).toEqual([gerente]);
    expect(fixture.nativeElement.textContent).toContain('Geniéve');
    expect(fixture.nativeElement.textContent).toContain('Falha na atualização');
  });

  it('deve impedir dois submits enquanto a inserção está em andamento', () => {
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

  it('deve abrir a confirmação com o gerente selecionado', () => {
    vi.spyOn(service, 'listar').mockReturnValue(of([]));
    fixture.detectChanges();
    component.abrirRemocao(gerente);
    fixture.detectChanges();

    expect(component.modalRemocaoAberto()).toBe(true);
    expect(component.gerenteSelecionado()).toEqual(gerente);
    expect(fixture.nativeElement.textContent).toContain('Geniéve');
    expect(fixture.nativeElement.textContent).toContain('985.743.070-84');
  });

  it('deve cancelar a confirmação sem enviar requisição', () => {
    vi.spyOn(service, 'listar').mockReturnValue(of([]));
    const remover = vi.spyOn(service, 'remover');
    fixture.detectChanges();

    component.abrirRemocao(gerente);
    component.fecharRemocao();

    expect(component.modalRemocaoAberto()).toBe(false);
    expect(remover).not.toHaveBeenCalled();
  });

  it('deve bloquear confirmações duplicadas durante a remoção', () => {
    vi.spyOn(service, 'listar').mockReturnValue(of([]));
    const remover = vi.spyOn(service, 'remover').mockReturnValue(NEVER);
    fixture.detectChanges();

    component.abrirRemocao(gerente);
    component.confirmarRemocao();
    component.confirmarRemocao();

    expect(remover).toHaveBeenCalledTimes(1);
    expect(remover).toHaveBeenCalledWith(gerente.cpf);
    expect(component.processando()).toBe(true);
    expect(component.modalRemocaoAberto()).toBe(true);

    component.fecharRemocao();
    expect(component.modalRemocaoAberto()).toBe(true);
  });

  it('deve bloquear criação, edição e salvamento enquanto o modal estiver aberto', () => {
    vi.spyOn(service, 'listar').mockReturnValue(of([]));
    const inserir = vi.spyOn(service, 'inserir');
    const atualizar = vi.spyOn(service, 'atualizar');
    fixture.detectChanges();

    component.abrirRemocao(gerente);
    component.abrirCriacao();
    component.abrirEdicao(gerente);
    component.salvar();

    expect(component.modalRemocaoAberto()).toBe(true);
    expect(component.modoFormulario()).toBe('nenhum');
    expect(inserir).not.toHaveBeenCalled();
    expect(atualizar).not.toHaveBeenCalled();
  });

  it('deve ignorar a confirmação quando o modal não estiver aberto', () => {
    const remover = vi.spyOn(service, 'remover');
    component.gerenteSelecionado.set(gerente);

    component.confirmarRemocao();

    expect(remover).not.toHaveBeenCalled();
  });

  it('deve recarregar a listagem somente após a remoção concluir', () => {
    const listar = vi.spyOn(service, 'listar').mockReturnValue(of([]));
    vi.spyOn(service, 'remover').mockReturnValue(of({
      resultado: {
        mensagem: 'Gerente removido e contas transferidas.',
        quantidadeContas: 2
      }
    }));
    fixture.detectChanges();

    component.abrirRemocao(gerente);
    component.confirmarRemocao();

    expect(listar).toHaveBeenCalledTimes(2);
    expect(component.modalRemocaoAberto()).toBe(false);
    expect(component.mensagemSucesso()).toContain('Gerente removido');
  });

  it('deve preservar a listagem quando a remoção falhar', () => {
    vi.spyOn(service, 'listar').mockReturnValue(of([gerente]));
    vi.spyOn(service, 'remover').mockReturnValue(
      throwError(() => new Error('Não é possível remover o último gerente ativo.'))
    );
    fixture.detectChanges();
    component.gerentes.set([gerente]);

    component.abrirRemocao(gerente);
    component.confirmarRemocao();

    expect(component.gerentes()).toEqual([gerente]);
    expect(component.mensagemErro()).toContain('último gerente');
  });
});
