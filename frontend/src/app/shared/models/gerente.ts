export interface Gerente {
  nome: string;
  cpf: string;
  email: string;
  telefone: string | null;
  ativo: boolean;
}

export interface GerenteListagem extends Gerente {
  quantidadeClientes: number;
}

export interface GerentesResponse {
  gerentes: GerenteListagem[];
}

export interface CriarGerentePayload {
  nome: string;
  cpf: string;
  email: string;
  telefone: string;
  senha: string;
}

export interface AtualizarGerentePayload {
  nome: string;
  telefone: string;
}
