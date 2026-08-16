# Read Model

O Read Model é uma estrutura otimizada para consultas. Será desnormalizado e atualizado a partir dos eventos.

## `conta_read` (dados atuais da conta)

Campos sugeridos:

| Campo         | Descrição                     |
|---------------|-------------------------------|
| numero_conta  | Número da conta               |
| cpf_cliente   | CPF do cliente                |
| data_criacao  | Data de criação da conta      |
| saldo         | Saldo atual projetado         |
| cpf_gerente   | CPF do gerente responsável    |

Exemplo:

- numero_conta: 1291
- cpf_cliente: 00000000000
- data_criacao: 2026-08-16
- saldo: 800.00
- cpf_gerente: 11111111111

## `movimentacao_read` (histórico)

Campos sugeridos:

| Campo         | Descrição                                 |
|---------------|-------------------------------------------|
| id            | Identificador da movimentação / evento    |
| numero_conta  | Número da conta                           |
| timestamp     | Data e hora da movimentação               |
| tipo          | Tipo da movimentação                      |
| cpf_origem    | CPF da origem, quando aplicável           |
| nome_origem   | Nome da origem, quando aplicável          |
| cpf_destino   | CPF do destino, quando aplicável          |
| nome_destino  | Nome do destino, quando aplicável         |
| valor         | Valor da movimentação                     |

O consumidor de eventos deve manter essas tabelas consistentes e idempotentes.

# Projeções e idempotência

O Read Model é atualizado a partir de eventos publicados (fila `ms.conta.events`).

Problema: um mesmo evento pode ser entregue mais de uma vez — o consumidor deve ser idempotente.

## Estratégia sugerida

- Manter tabela `eventos_processados` com os campos: `event_id`, `objeto_id`, `versao`, `processado_em`.
- Aplicar transação que grava o `eventos_processados` e atualiza o Read Model; se `event_id` já existir, ignorar.
- Garantir `UNIQUE(event_id)` para evitar duplicação.

Exemplo de fluxo:

1. Consumidor recebe evento
2. Inicia transação
3. Tenta inserir `event_id` em `eventos_processados`
4. Se inserir com sucesso, aplica atualização no Read Model
5. Commit
6. Se inserir falhar por chave única, faz rollback e ignora o evento
