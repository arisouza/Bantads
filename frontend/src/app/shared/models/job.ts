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
