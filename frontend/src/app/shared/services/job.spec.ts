import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { JobService } from './job';

describe('JobService', () => {
  let service: JobService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [JobService, provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(JobService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());
  afterEach(() => vi.useRealTimers());

  it('deve consultar o status do job', () => {
    let resultado: unknown;
    service.getStatus('job/1').subscribe(status => resultado = status);
    const request = httpTesting.expectOne(`${environment.apiUrl}/jobs/job%2F1/status`);
    expect(request.request.method).toBe('GET');
    request.flush({ jobId: 'job/1', status: 'CONCLUIDO' });
    expect(resultado).toEqual({ jobId: 'job/1', status: 'CONCLUIDO' });
  });

  it('deve concluir imediatamente quando o primeiro status for CONCLUIDO', () => {
    vi.useFakeTimers();
    const resultados: string[] = [];
    service.pollStatus('job-imediato').subscribe(status => resultados.push(status.status));
    vi.advanceTimersByTime(0);
    httpTesting.expectOne(`${environment.apiUrl}/jobs/job-imediato/status`)
      .flush({ jobId: 'job-imediato', status: 'CONCLUIDO' });
    expect(resultados).toEqual(['CONCLUIDO']);
    httpTesting.expectNone(`${environment.apiUrl}/jobs/job-imediato/status`);
  });

  it('deve consultar novamente enquanto estiver PENDENTE e concluir em CONCLUIDO', () => {
    vi.useFakeTimers();
    const resultados: string[] = [];
    service.pollStatus('job-pendente').subscribe(status => resultados.push(status.status));
    vi.advanceTimersByTime(0);
    httpTesting.expectOne(`${environment.apiUrl}/jobs/job-pendente/status`)
      .flush({ jobId: 'job-pendente', status: 'PENDENTE' });
    vi.advanceTimersByTime(1000);
    httpTesting.expectOne(`${environment.apiUrl}/jobs/job-pendente/status`)
      .flush({ jobId: 'job-pendente', status: 'PENDENTE' });
    vi.advanceTimersByTime(1000);
    httpTesting.expectOne(`${environment.apiUrl}/jobs/job-pendente/status`)
      .flush({ jobId: 'job-pendente', status: 'CONCLUIDO' });
    expect(resultados).toEqual(['PENDENTE', 'PENDENTE', 'CONCLUIDO']);
  });

  it('deve propagar a mensagem de erro quando o status for FALHA', () => {
    vi.useFakeTimers();
    let erro: Error | undefined;
    service.pollStatus('job-falha').subscribe({ error: errorRecebido => erro = errorRecebido });
    vi.advanceTimersByTime(0);
    httpTesting.expectOne(`${environment.apiUrl}/jobs/job-falha/status`)
      .flush({ jobId: 'job-falha', status: 'FALHA', erro: 'Falha no cadastro' });
    expect(erro?.message).toBe('Falha no cadastro');
  });

  it('deve usar fallback quando FALHA não tiver mensagem', () => {
    vi.useFakeTimers();
    let erro: Error | undefined;
    service.pollStatus('job-falha-sem-mensagem')
      .subscribe({ error: errorRecebido => erro = errorRecebido });
    vi.advanceTimersByTime(0);
    httpTesting.expectOne(`${environment.apiUrl}/jobs/job-falha-sem-mensagem/status`)
      .flush({ jobId: 'job-falha-sem-mensagem', status: 'FALHA' });
    expect(erro?.message).toBe('O job falhou.');
  });

  it('deve propagar erro quando o limite de polling for esgotado', () => {
    vi.useFakeTimers();
    let erro: Error | undefined;
    service.pollStatus('job-timeout').subscribe({ error: errorRecebido => erro = errorRecebido });
    vi.advanceTimersByTime(0);
    for (let tentativa = 0; tentativa < 120; tentativa++) {
      httpTesting.expectOne(`${environment.apiUrl}/jobs/job-timeout/status`)
        .flush({ jobId: 'job-timeout', status: 'PENDENTE' });
      if (tentativa < 119) vi.advanceTimersByTime(1000);
    }
    vi.advanceTimersByTime(1000);
    expect(erro?.message).toBe('Tempo limite excedido ao aguardar a conclusão do job.');
  });
});
