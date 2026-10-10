CREATE SCHEMA IF NOT EXISTS cliente;
CREATE TABLE IF NOT EXISTS cliente.clientes (
    cpf VARCHAR(11) PRIMARY KEY,
    nome TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    telefone VARCHAR(11),
    salario NUMERIC(19,2),
    logradouro TEXT,
    numero VARCHAR(30),
    complemento TEXT,
    cep VARCHAR(8),
    cidade TEXT,
    uf VARCHAR(2)
);

CREATE TABLE IF NOT EXISTS cliente.solicitacoes (
    cpf VARCHAR(11) PRIMARY KEY,
    nome TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    telefone VARCHAR(11) NOT NULL,
    salario NUMERIC(19,2) NOT NULL,
    logradouro TEXT NOT NULL,
    numero VARCHAR(30) NOT NULL,
    complemento TEXT,
    cep VARCHAR(8) NOT NULL,
    cidade TEXT NOT NULL,
    uf VARCHAR(2) NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'PENDENTE',
    motivo_rejeicao TEXT,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_solicitacoes_status CHECK (status IN ('PENDENTE', 'APROVADA', 'REJEITADA'))
);

ALTER TABLE cliente.clientes ADD COLUMN IF NOT EXISTS telefone VARCHAR(11);
ALTER TABLE cliente.clientes ADD COLUMN IF NOT EXISTS salario NUMERIC(19,2);
ALTER TABLE cliente.clientes ADD COLUMN IF NOT EXISTS logradouro TEXT;
ALTER TABLE cliente.clientes ADD COLUMN IF NOT EXISTS numero VARCHAR(30);
ALTER TABLE cliente.clientes ADD COLUMN IF NOT EXISTS complemento TEXT;
ALTER TABLE cliente.clientes ADD COLUMN IF NOT EXISTS cep VARCHAR(8);
ALTER TABLE cliente.clientes ADD COLUMN IF NOT EXISTS cidade TEXT;
ALTER TABLE cliente.clientes ADD COLUMN IF NOT EXISTS uf VARCHAR(2);
ALTER TABLE cliente.clientes ALTER COLUMN uf TYPE VARCHAR(2);


CREATE TABLE IF NOT EXISTS cliente.comandos_processados (
    saga_id TEXT NOT NULL,
    tipo TEXT NOT NULL,
    PRIMARY KEY (saga_id, tipo)
);
