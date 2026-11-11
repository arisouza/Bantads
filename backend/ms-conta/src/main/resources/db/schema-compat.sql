-- Compatibilidade para volumes PostgreSQL criados antes da idempotência de
-- comandos da SAGA. Todas as instruções são repetíveis.
CREATE SCHEMA IF NOT EXISTS conta;

CREATE TABLE IF NOT EXISTS conta.saga_command_execution (
    id UUID PRIMARY KEY,
    saga_id VARCHAR(255) NOT NULL,
    tipo VARCHAR(255) NOT NULL,
    status VARCHAR(255) NOT NULL,
    erro TEXT,
    created_at TIMESTAMP NOT NULL,
    response_payload TEXT,
    updated_at TIMESTAMP NOT NULL,
    CONSTRAINT uk_saga_command_execution UNIQUE (saga_id, tipo)
);
