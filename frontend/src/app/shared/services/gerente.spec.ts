import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Cliente } from '../models/cliente';
import { Gerente, GerenteListagem } from '../models/gerente';
import { JobStatusResponse } from '../models/job';
import { GerenteService } from './gerente';
import { JobService } from './job';

describe('GerenteService', () => {
  let service: GerenteService;
  let httpTesting: HttpTestingController;
  let jobService: { pollStatus: (jobId: string) => ReturnType<JobService['pollStatus']> };

  beforeEach(() => {
    jobService = { pollStatus: () => of() };
    TestBed.configureTestingModule({
      providers: [
        GerenteService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: JobService, useValue: jobService }
      ]
    });
    service = TestBed.inject(GerenteService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('deve iniciar a aprovação sem body e delegar o jobId ao polling', () => {
    const polling = vi.fn(() => throwError(() => new Error('polling delegado')));
    jobService.pollStatus = polling;
    service.aprovarCliente('123').subscribe({ error: () => undefined });

    const request = httpTesting.expectOne(`${environment.apiUrl}/solicitacoes/123/aprovacao`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toBeNull();
    request.flush({ jobId: 'saga-1', status: 'PENDENTE' });
    expect(polling).toHaveBeenCalledWith('saga-1');
  });

  it('deve buscar e emitir o cliente após um job concluído compatível', () => {
    jobService.pollStatus = () => of({
      jobId: 'saga-2', status: 'CONCLUIDO', resultType: 'resource',
      dominio: 'clientes', resourceId: '123/456'
    });
    const cliente: Cliente = { cpf: '123/456', nome: 'Cliente aprovado', email: 'cliente@example.com' };
    let resultado: Cliente | undefined;
    service.aprovarCliente('123/456').subscribe(clienteRecebido => resultado = clienteRecebido);

    httpTesting.expectOne(`${environment.apiUrl}/solicitacoes/123%2F456/aprovacao`)
      .flush({ jobId: 'saga-2', status: 'PENDENTE' });
    const resource = httpTesting.expectOne(`${environment.apiUrl}/clientes/123%2F456`);
    expect(resource.request.method).toBe('GET');
    resource.flush(cliente);
    expect(resultado).toEqual(cliente);
  });

  it('deve ignorar PENDENTE e buscar o cliente somente após CONCLUIDO', () => {
    jobService.pollStatus = () => of(...([
      { jobId: 'saga-3', status: 'PENDENTE' },
      { jobId: 'saga-3', status: 'PENDENTE' },
      { jobId: 'saga-3', status: 'CONCLUIDO', resultType: 'resource', dominio: 'clientes', resourceId: '123' }
    ] as JobStatusResponse[]));
    const resultados: Cliente[] = [];
    service.aprovarCliente('123').subscribe(cliente => resultados.push(cliente));

    httpTesting.expectOne(`${environment.apiUrl}/solicitacoes/123/aprovacao`)
      .flush({ jobId: 'saga-3', status: 'PENDENTE' });
    const resource = httpTesting.expectOne(`${environment.apiUrl}/clientes/123`);
    resource.flush({ cpf: '123', nome: 'Cliente aprovado', email: 'cliente@example.com' });

    expect(resultados).toHaveLength(1);
    httpTesting.expectNone(`${environment.apiUrl}/solicitacoes/123/aprovacao`);
  });

  it.each([
    ['resultType', { resultType: 'inline' }],
    ['dominio', { dominio: 'gerentes' }],
    ['resourceId', { resourceId: undefined }]
  ])('deve rejeitar resposta incompatível por %s', (_campo, alteracao) => {
    jobService.pollStatus = () => of({
      jobId: 'saga-invalida', status: 'CONCLUIDO', resultType: 'resource',
      dominio: 'clientes', resourceId: '123', ...alteracao
    } as JobStatusResponse);
    let erro: Error | undefined;
    service.aprovarCliente('123').subscribe({ error: errorRecebido => erro = errorRecebido });
    httpTesting.expectOne(`${environment.apiUrl}/solicitacoes/123/aprovacao`)
      .flush({ jobId: 'saga-invalida', status: 'PENDENTE' });
    expect(erro?.message).toBe('Resposta incompatível ao concluir a aprovação do cliente.');
    httpTesting.expectNone(`${environment.apiUrl}/clientes/123`);
  });

  it('deve propagar erro do JobService sem buscar o cliente', () => {
    jobService.pollStatus = () => throwError(() => new Error('Falha da SAGA'));
    let erro: Error | undefined;
    service.aprovarCliente('123').subscribe({ error: errorRecebido => erro = errorRecebido });
    httpTesting.expectOne(`${environment.apiUrl}/solicitacoes/123/aprovacao`)
      .flush({ jobId: 'saga-falha', status: 'PENDENTE' });
    expect(erro?.message).toBe('Falha da SAGA');
    httpTesting.expectNone(`${environment.apiUrl}/clientes/123`);
  });

  it('deve transformar o wrapper da listagem em uma lista de gerentes', () => {
    let resultado: GerenteListagem[] | undefined;
    service.listar().subscribe(gerentes => resultado = gerentes);

    const request = httpTesting.expectOne(`${environment.apiUrl}/gerentes`);
    expect(request.request.method).toBe('GET');
    request.flush({ gerentes: [{
      cpf: '98574307084', nome: 'Geniéve', email: 'ger1@example.com',
      telefone: '41988880001', ativo: true, quantidadeClientes: 2
    }] });

    expect(resultado?.[0].quantidadeClientes).toBe(2);
  });

  it('deve enviar o formulário, aguardar o job e buscar o gerente criado', () => {
    jobService.pollStatus = () => of({
      jobId: 'saga-gerente', status: 'CONCLUIDO', resultType: 'resource',
      dominio: 'gerentes', resourceId: '98574307084'
    });
    const payload = {
      cpf: '98574307084', nome: 'Geniéve', email: 'ger1@example.com',
      telefone: '41988880001', senha: 'tads'
    };
    let resultado: Gerente | undefined;
    service.inserir(payload).subscribe(gerente => resultado = gerente);

    const post = httpTesting.expectOne(`${environment.apiUrl}/gerentes`);
    expect(post.request.method).toBe('POST');
    expect(post.request.body).toEqual(payload);
    post.flush({ jobId: 'saga-gerente', status: 'PENDENTE' });

    const get = httpTesting.expectOne(`${environment.apiUrl}/gerentes/98574307084`);
    expect(get.request.method).toBe('GET');
    get.flush({ ...payload, ativo: true, quantidadeClientes: 0 });
    expect(resultado?.cpf).toBe(payload.cpf);
  });

  it('deve buscar o gerente criado somente após CONCLUIDO', () => {
    jobService.pollStatus = () => of(...([
      { jobId: 'saga-gerente', status: 'PENDENTE' },
      { jobId: 'saga-gerente', status: 'PENDENTE' },
      { jobId: 'saga-gerente', status: 'CONCLUIDO', resultType: 'resource', dominio: 'gerentes', resourceId: '1' }
    ] as JobStatusResponse[]));
    service.inserir({ cpf: '1', nome: 'Nome', email: 'a@b.com', telefone: '41988880001', senha: 'tads' }).subscribe();
    httpTesting.expectOne(`${environment.apiUrl}/gerentes`).flush({ jobId: 'saga-gerente', status: 'PENDENTE' });
    const get = httpTesting.expectOne(`${environment.apiUrl}/gerentes/1`);
    get.flush({ cpf: '1', nome: 'Nome', email: 'a@b.com', telefone: '41988880001', ativo: true, quantidadeClientes: 0 });
  });

  it('deve propagar FALHA da SAGA de inserção sem buscar o gerente', () => {
    jobService.pollStatus = () => throwError(() => new Error('Falha na SAGA de gerente'));
    let erro: Error | undefined;
    service.inserir({ cpf: '1', nome: 'Nome', email: 'a@b.com', telefone: '41988880001', senha: 'tads' })
      .subscribe({ error: recebido => erro = recebido });
    httpTesting.expectOne(`${environment.apiUrl}/gerentes`).flush({ jobId: 'saga-falha', status: 'PENDENTE' });
    expect(erro?.message).toBe('Falha na SAGA de gerente');
    httpTesting.expectNone(`${environment.apiUrl}/gerentes/1`);
  });

  it('deve rejeitar resultado concluído incompatível', () => {
    jobService.pollStatus = () => of({
      jobId: 'saga-invalida', status: 'CONCLUIDO', resultType: 'inline',
      dominio: 'gerentes', resourceId: '1'
    });
    let erro: Error | undefined;
    service.inserir({ cpf: '1', nome: 'Nome', email: 'a@b.com', telefone: '41988880001', senha: 'tads' })
      .subscribe({ error: recebido => erro = recebido });
    httpTesting.expectOne(`${environment.apiUrl}/gerentes`).flush({ jobId: 'saga-invalida', status: 'PENDENTE' });
    expect(erro?.message).toContain('Resposta incompatível');
    httpTesting.expectNone(`${environment.apiUrl}/gerentes/1`);
  });

  it('deve enviar no PUT somente nome e telefone', () => {
    const payload = { nome: 'Novo Nome', telefone: '41999999999' };
    let resultado: Gerente | undefined;
    service.atualizar('98574307084', payload).subscribe(gerente => resultado = gerente);
    const request = httpTesting.expectOne(`${environment.apiUrl}/gerentes/98574307084`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual(payload);
    expect(request.request.body.cpf).toBeUndefined();
    expect(request.request.body.email).toBeUndefined();
    request.flush({ cpf: '98574307084', ...payload, email: 'ger@example.com', ativo: true, quantidadeClientes: 0 });
    expect(resultado?.nome).toBe('Novo Nome');
  });
});
