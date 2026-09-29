export type StatusSolicitacao =
  | 'PENDENTE'
  | 'APROVADO'
  | 'NAO_APROVADO';

export interface Solicitacao {
  cpf: string;
  nome: string;
  salario: string;
  status: StatusSolicitacao;
  motivo: string | null;
  dataHoraAnalise: string | null;
}