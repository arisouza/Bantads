# Seed

O seed deve popular Event Store e Read Model de forma consistente.

Fluxo desejado:

- Popular `eventos_conta` com eventos de seed
- Executar replay para cada conta
- Popular `conta_read` e `movimentacao_read` com o estado resultante
- Preservar o número da conta como texto de 4 dígitos em Event Store, projeções e histórico
- Persistir valores monetários como `string` nos payloads JSON dos eventos e como `NUMERIC(19,4)` nas colunas relacionais

O estado obtido pelo replay deve ser igual ao estado esperado no Read Model (ex.: saldo).
