export interface ContaLink {
  href: string;
  templated?: boolean;
  hreflang?: string;
  title?: string;
  type?: string;
  deprecation?: string;
  profile?: string;
  name?: string;
}

export interface Conta {
  numeroConta: string;
  cpfCliente: string;
  dataCriacao: string;
  saldo: string;
  cpfGerente: string;
  _links?: Record<string, ContaLink | ContaLink[]>;
}
