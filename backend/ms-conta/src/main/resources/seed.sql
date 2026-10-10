BEGIN;

TRUNCATE TABLE conta.eventos_processados;
TRUNCATE TABLE conta.movimentacao_read;
TRUNCATE TABLE conta.conta_read;
TRUNCATE TABLE conta.eventos_conta;

CREATE TEMP TABLE tmp_eventos_seed (
    id UUID PRIMARY KEY,
    objeto_id CHAR(4) NOT NULL,
    tipo VARCHAR(50) NOT NULL,
    payload JSONB NOT NULL,
    versao INTEGER NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL
) ON COMMIT DROP;

INSERT INTO tmp_eventos_seed (id, objeto_id, tipo, payload, versao, timestamp)
VALUES
    (
        '00000000-0000-0000-0000-000012910001',
        '1291',
        'Criado',
        '{"numeroConta":"1291","cpfCliente":"12912861012","cpfGerente":"98574307084","dataCriacao":"2000-01-01T00:00:00Z"}'::jsonb,
        1,
        '2000-01-01T00:00:00Z'
    ),
    (
        '00000000-0000-0000-0000-000012910002',
        '1291',
        'Depósito',
        '{"valor":"1000.00"}'::jsonb,
        2,
        '2020-01-01T10:00:00Z'
    ),
    (
        '00000000-0000-0000-0000-000012910003',
        '1291',
        'Depósito',
        '{"valor":"900.00"}'::jsonb,
        3,
        '2020-01-01T11:00:00Z'
    ),
    (
        '00000000-0000-0000-0000-000012910004',
        '1291',
        'Saque',
        '{"valor":"550.00"}'::jsonb,
        4,
        '2020-01-01T12:00:00Z'
    ),
    (
        '00000000-0000-0000-0000-000012910005',
        '1291',
        'Saque',
        '{"valor":"350.00"}'::jsonb,
        5,
        '2020-01-01T13:00:00Z'
    ),
    (
        '00000000-0000-0000-0000-000012910006',
        '1291',
        'Depósito',
        '{"valor":"2000.00"}'::jsonb,
        6,
        '2020-01-10T15:00:00Z'
    ),
    (
        '00000000-0000-0000-0000-000012910007',
        '1291',
        'Saque',
        '{"valor":"500.00"}'::jsonb,
        7,
        '2020-01-15T08:00:00Z'
    ),
    (
        '00000000-0000-0000-0000-000012910008',
        '1291',
        'TransferênciaOrigem',
        '{"contaDestino":"0950","cpfDestino":"09506382000","nomeDestino":"Cleuddônio","valor":"1700.00"}'::jsonb,
        8,
        '2020-01-20T12:00:00Z'
    ),
    (
        '00000000-0000-0000-0000-000009500001',
        '0950',
        'Criado',
        '{"numeroConta":"0950","cpfCliente":"09506382000","cpfGerente":"64065268052","dataCriacao":"1990-10-10T00:00:00Z"}'::jsonb,
        1,
        '1990-10-10T00:00:00Z'
    ),
    (
        '00000000-0000-0000-0000-000009500002',
        '0950',
        'TransferênciaDestino',
        '{"contaOrigem":"1291","cpfOrigem":"12912861012","nomeOrigem":"Catharyna","valor":"1700.00"}'::jsonb,
        2,
        '2020-01-20T12:00:00Z'
    ),
    (
        '00000000-0000-0000-0000-000009500003',
        '0950',
        'Depósito',
        '{"valor":"1000.00"}'::jsonb,
        3,
        '2025-01-01T12:00:00Z'
    ),
    (
        '00000000-0000-0000-0000-000009500004',
        '0950',
        'Depósito',
        '{"valor":"5000.00"}'::jsonb,
        4,
        '2025-01-02T10:00:00Z'
    ),
    (
        '00000000-0000-0000-0000-000009500005',
        '0950',
        'Saque',
        '{"valor":"200.00"}'::jsonb,
        5,
        '2025-01-10T10:00:00Z'
    ),
    (
        '00000000-0000-0000-0000-000009500006',
        '0950',
        'Depósito',
        '{"valor":"7000.00"}'::jsonb,
        6,
        '2025-02-05T10:00:00Z'
    ),
    (
        '00000000-0000-0000-0000-000009500007',
        '0950',
        'Saque',
        '{"valor":"4500.00"}'::jsonb,
        7,
        '2025-03-06T11:00:00Z'
    ),
    (
        '00000000-0000-0000-0000-000085730001',
        '8573',
        'Criado',
        '{"numeroConta":"8573","cpfCliente":"85733854057","cpfGerente":"23862179060","dataCriacao":"2012-12-12T00:00:00Z"}'::jsonb,
        1,
        '2012-12-12T00:00:00Z'
    ),
    (
        '00000000-0000-0000-0000-000085730002',
        '8573',
        'Depósito',
        '{"valor":"1000.00"}'::jsonb,
        2,
        '2025-05-05T10:00:00Z'
    ),
    (
        '00000000-0000-0000-0000-000085730003',
        '8573',
        'Saque',
        '{"valor":"800.00"}'::jsonb,
        3,
        '2025-05-06T10:00:00Z'
    ),
    (
        '00000000-0000-0000-0000-000058870001',
        '5887',
        'Criado',
        '{"numeroConta":"5887","cpfCliente":"58872160006","cpfGerente":"98574307084","dataCriacao":"2022-02-22T00:00:00Z"}'::jsonb,
        1,
        '2022-02-22T00:00:00Z'
    ),
    (
        '00000000-0000-0000-0000-000058870002',
        '5887',
        'Depósito',
        '{"valor":"150000.00"}'::jsonb,
        2,
        '2025-06-01T10:00:00Z'
    ),
    (
        '00000000-0000-0000-0000-000076170001',
        '7617',
        'Criado',
        '{"numeroConta":"7617","cpfCliente":"76179646090","cpfGerente":"64065268052","dataCriacao":"2025-01-01T00:00:00Z"}'::jsonb,
        1,
        '2025-01-01T00:00:00Z'
    ),
    (
        '00000000-0000-0000-0000-000076170002',
        '7617',
        'Depósito',
        '{"valor":"1500.00"}'::jsonb,
        2,
        '2025-07-01T10:00:00Z'
    );

INSERT INTO conta.eventos_conta (id, objeto_id, tipo, payload, versao, timestamp)
SELECT id, objeto_id, tipo, payload, versao, timestamp
FROM tmp_eventos_seed
ORDER BY objeto_id, versao;

WITH criado AS (
    SELECT
        objeto_id AS numero_conta,
        payload ->> 'cpfCliente' AS cpf_cliente,
        (payload ->> 'dataCriacao')::timestamptz AS data_criacao,
        payload ->> 'cpfGerente' AS cpf_gerente_inicial
    FROM tmp_eventos_seed
    WHERE tipo = 'Criado'
),
ultimo_gerente AS (
    SELECT DISTINCT ON (objeto_id)
        objeto_id AS numero_conta,
        payload ->> 'cpfGerenteNovo' AS cpf_gerente
    FROM tmp_eventos_seed
    WHERE tipo = 'GerenteAlterado'
    ORDER BY objeto_id, versao DESC
),
saldo_final AS (
    SELECT
        objeto_id AS numero_conta,
        COALESCE(
            SUM(
                CASE
                    WHEN tipo IN ('Depósito', 'TransferênciaDestino')
                        THEN (payload ->> 'valor')::numeric(19,4)
                    WHEN tipo IN ('Saque', 'TransferênciaOrigem')
                        THEN -((payload ->> 'valor')::numeric(19,4))
                    ELSE 0::numeric
                END
            ),
            0::numeric
        )::numeric(19,4) AS saldo
    FROM tmp_eventos_seed
    GROUP BY objeto_id
)
INSERT INTO conta.conta_read (numero_conta, cpf_cliente, data_criacao, saldo, cpf_gerente)
SELECT
    criado.numero_conta,
    criado.cpf_cliente,
    criado.data_criacao,
    saldo_final.saldo,
    COALESCE(ultimo_gerente.cpf_gerente, criado.cpf_gerente_inicial) AS cpf_gerente
FROM criado
JOIN saldo_final
    ON saldo_final.numero_conta = criado.numero_conta
LEFT JOIN ultimo_gerente
    ON ultimo_gerente.numero_conta = criado.numero_conta
ORDER BY criado.numero_conta;

INSERT INTO conta.movimentacao_read (
    id,
    numero_conta,
    timestamp,
    tipo,
    cpf_origem,
    nome_origem,
    cpf_destino,
    nome_destino,
    valor
)
SELECT
    id,
    objeto_id,
    timestamp,
    tipo,
    CASE WHEN tipo = 'TransferênciaDestino' THEN payload ->> 'cpfOrigem' END AS cpf_origem,
    CASE WHEN tipo = 'TransferênciaDestino' THEN payload ->> 'nomeOrigem' END AS nome_origem,
    CASE WHEN tipo = 'TransferênciaOrigem' THEN payload ->> 'cpfDestino' END AS cpf_destino,
    CASE WHEN tipo = 'TransferênciaOrigem' THEN payload ->> 'nomeDestino' END AS nome_destino,
    (payload ->> 'valor')::numeric(19,4) AS valor
FROM tmp_eventos_seed
WHERE tipo IN ('Depósito', 'Saque', 'TransferênciaOrigem', 'TransferênciaDestino')
ORDER BY objeto_id, versao;

INSERT INTO conta.eventos_processados (event_id, objeto_id, versao, processado_em)
SELECT id, objeto_id, versao, timestamp
FROM tmp_eventos_seed
ORDER BY objeto_id, versao;

COMMIT;
