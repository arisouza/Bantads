# Visão geral e Objetivo

## 1. Objetivo

Definir a modelagem do **MS Conta** para suportar:

- Event Sourcing
- CQRS
- Event Store
- Read Model
- Replay dos eventos
- Optimistic Locking
- Projeção idempotente dos eventos
- Número da conta textual com 4 dígitos, preservando zeros à esquerda
- Valores monetários em payloads JSON representados como `string`


## 2. Visão geral da arquitetura

O MS Conta é dividido conceitualmente em Command e Query.

```text
                 MS CONTA
                    │
          ┌─────────┴─────────┐
          │                   │
       COMMAND              QUERY
          │                   │
          ▼                   │
     EVENT STORE              │
          │                   │
          │ publica evento    │
          ▼                   │
       RabbitMQ               │
    ms.conta.events           │
          │                   │
          ▼                   │
       PROJEÇÃO ──────────────┘
          │
          ▼
      READ MODEL
```

### Command

Operações que alteram estado (depósito, saque, transferência, alteração de gerente). Commands não devem consultar o Read Model para validar regras de negócio; o estado atual deve ser reconstruído a partir do Event Store (replay) quando necessário.

### Query

Operações de leitura (consultar conta, consultar saldo, histórico). Consultas devem usar o Read Model denormalizado para leitura rápida.

## 3. Convenções da modelagem

- O número da conta é um identificador textual de 4 dígitos e deve preservar zeros à esquerda, como `0950`.
- No PostgreSQL, esse identificador deve ser modelado como tipo textual fixo de 4 posições.
- Valores monetários persistidos em colunas relacionais devem usar `NUMERIC(19,4)`.
- Valores monetários dentro do payload JSON dos eventos devem ser serializados como `string` para evitar perda de precisão.
