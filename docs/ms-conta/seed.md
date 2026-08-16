# Seed

O seed deve popular Event Store e Read Model de forma consistente.

Fluxo desejado:

- Popular `eventos_conta` com eventos de seed
- Executar replay para cada conta
- Popular `conta_read` e `movimentacao_read` com o estado resultante

O estado obtido pelo replay deve ser igual ao estado esperado no Read Model (ex.: saldo).
