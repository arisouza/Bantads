# Critérios de validação

Event Store
- Todos os eventos possuem `id`, `objeto_id`, `tipo`, `payload`, `versao`, `timestamp`
- `objeto_id` preserva o número da conta como texto de 4 dígitos
- Existe `UNIQUE(objeto_id, versao)`

Eventos
- Presença dos tipos: `Criado`, `Depósito`, `Saque`, `TransferênciaOrigem`, `TransferênciaDestino`, `GerenteAlterado`
- Valores monetários em payloads JSON são serializados como `string`

Read Model
- Dados atuais da conta (`conta_read`) e saldo consistente
- Histórico em `movimentacao_read` com origens/destinos quando aplicáveis

Replay
- Eventos são ordenados por versão
- O saldo pode ser reconstruído corretamente
- O gerente pode ser reconstruído corretamente

Concorrência
- Controle de versão implementado
- Conflito de versão exige novo replay e revalidação

Projeção
- Evento recebido via RabbitMQ atualiza Read Model
- Evento duplicado não gera duplicação no Read Model

Seed
- Event Store e Read Model populados
- Replay dos eventos produz os saldos esperados
