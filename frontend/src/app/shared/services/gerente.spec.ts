import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Cliente } from '../models/cliente';
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
});
