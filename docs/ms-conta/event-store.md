# Event Store

## O que é

O Event Store armazena todos os eventos que alteraram uma conta. Ele é a fonte de verdade: o estado atual é derivado pelos eventos.

### Exemplo de histórico

- v1 — Criado
- v2 — Depósito
- v3 — Depósito
- v4 — Saque
- v5 — TransferênciaOrigem

## Esquema sugerido (tabela `eventos_conta`)

| Campo      | Tipo sugerido  | Obrigatório | Descrição                                      |
|------------|----------------|-------------|------------------------------------------------|
| id         | UUID           | Sim         | Identificador único do evento                  |
| objeto_id  | BIGINT / UUID  | Sim         | Identificador da conta afetada                 |
| tipo       | VARCHAR(50)    | Sim         | Tipo do evento                                 |
| payload    | JSONB          | Sim         | Dados específicos do evento                    |
| versao     | INTEGER        | Sim         | Número sequencial do evento para aquela conta  |
| timestamp  | TIMESTAMPTZ    | Sim         | Data e hora em que o evento ocorreu            |

### Restrição de versão única

Para evitar gravações concorrentes com a mesma versão:

```sql
ALTER TABLE eventos_conta ADD CONSTRAINT unique_objeto_versao UNIQUE (objeto_id, versao);
```

Essa restrição garante Optimistic Locking por conta.

# Optimistic Locking

Controle de concorrência baseado em versão do Event Store.

### Comportamento esperado

Cada evento possui `versao` sequencial por `objeto_id`. A tabela `eventos_conta` deve ter:

```sql
UNIQUE (objeto_id, versao)
```

Fluxo em caso de conflito:

1. A operação que falhou deve executar novo replay
2. Reconstruir o estado atualizado
3. Revalidar a operação
4. Tentar novamente quando aplicável

Isso evita gravações perdidas e força revalidação sobre o estado atual.

