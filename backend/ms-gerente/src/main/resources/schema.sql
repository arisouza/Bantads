CREATE SCHEMA IF NOT EXISTS gerente;

CREATE TABLE IF NOT EXISTS gerente.gerentes (
    cpf       VARCHAR(11) PRIMARY KEY,
    nome      TEXT        NOT NULL,
    email     TEXT        NOT NULL UNIQUE,
    telefone  TEXT,
    ativo     BOOLEAN     NOT NULL DEFAULT TRUE
);

ALTER TABLE gerente.gerentes ADD COLUMN IF NOT EXISTS telefone TEXT;
ALTER TABLE gerente.gerentes ADD COLUMN IF NOT EXISTS ativo BOOLEAN NOT NULL DEFAULT TRUE;

