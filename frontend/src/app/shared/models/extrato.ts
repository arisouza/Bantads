export interface Movimentacao {
  id: string;
  numeroConta: string;
  timestamp: string;
  tipo: string;
  cpfOrigem: string | null;
  nomeOrigem: string | null;
  cpfDestino: string | null;
  nomeDestino: string | null;
  valor: string;
}

export interface ExtratoResponse {
  numeroConta: string;
  inicio: string;
  fim: string;
  saldoAbertura: string;
  movimentacoes: Movimentacao[];
}