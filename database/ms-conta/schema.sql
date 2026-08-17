CREATE SCHEMA IF NOT EXISTS conta;

CREATE TABLE IF NOT EXISTS conta.eventos_conta (
    id UUID PRIMARY KEY,
    objeto_id CHAR(4) NOT NULL,
    tipo VARCHAR(50) NOT NULL,
    payload JSONB NOT NULL,
    versao INTEGER NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_eventos_conta_objeto_versao UNIQUE (objeto_id, versao),
    CONSTRAINT ck_eventos_conta_objeto_id_formato CHECK (objeto_id ~ '^[0-9]{4}$'),
    CONSTRAINT ck_eventos_conta_versao_positiva CHECK (versao > 0)
);

CREATE INDEX IF NOT EXISTS idx_eventos_conta_objeto_versao
    ON conta.eventos_conta (objeto_id, versao);

CREATE TABLE IF NOT EXISTS conta.conta_read (
    numero_conta CHAR(4) PRIMARY KEY,
    cpf_cliente VARCHAR(14) NOT NULL,
    data_criacao TIMESTAMPTZ NOT NULL,
    saldo NUMERIC(19,4) NOT NULL DEFAULT 0,
    cpf_gerente VARCHAR(14) NOT NULL,
    CONSTRAINT ck_conta_read_numero_conta_formato CHECK (numero_conta ~ '^[0-9]{4}$')
);

CREATE TABLE IF NOT EXISTS conta.movimentacao_read (
    id UUID PRIMARY KEY,
    numero_conta CHAR(4) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    tipo VARCHAR(50) NOT NULL,
    cpf_origem VARCHAR(14),
    nome_origem VARCHAR(255),
    cpf_destino VARCHAR(14),
    nome_destino VARCHAR(255),
    valor NUMERIC(19,4) NOT NULL,
    CONSTRAINT ck_movimentacao_read_numero_conta_formato CHECK (numero_conta ~ '^[0-9]{4}$'),
    CONSTRAINT ck_movimentacao_read_valor CHECK (valor > 0)
);

CREATE INDEX IF NOT EXISTS idx_movimentacao_read_conta
    ON conta.movimentacao_read (numero_conta, timestamp);

CREATE TABLE IF NOT EXISTS conta.eventos_processados (
    event_id UUID PRIMARY KEY,
    objeto_id CHAR(4) NOT NULL,
    versao INTEGER NOT NULL,
    processado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_eventos_processados_objeto_id_formato CHECK (objeto_id ~ '^[0-9]{4}$'),
    CONSTRAINT uq_eventos_processados_objeto_versao UNIQUE (objeto_id, versao)
);
