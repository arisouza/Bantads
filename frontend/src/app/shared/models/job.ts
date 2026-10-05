export type JobStatus = 'PENDENTE' | 'CONCLUIDO' | 'FALHA';

export type JobResultType = 'resource' | 'inline';

export interface JobAcceptedResponse {
  jobId: string;
  status: 'PENDENTE';
}

export interface JobStatusResponse {
  jobId: string;
  status: JobStatus;
  resultType?: JobResultType;
  dominio?: string;
  resourceId?: string;
  erro?: string;
}

export interface RelatorioCliente {
  cpf: string;
  nome: string;
  email: string;
  salario: string | number | null;
  numeroConta: string | null;
  saldo: string | number;
  cpfGerente: string | null;
  nomeGerente: string | null;
}

export interface RelatorioClientesResponse {
  clientes: RelatorioCliente[];
}