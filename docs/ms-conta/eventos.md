# Eventos

Lista de eventos previstos para o MS Conta:

- `Criado`
- `Depósito`
- `Saque`
- `TransferênciaOrigem`
- `TransferênciaDestino`
- `GerenteAlterado`


# Transferências

Uma transferência envolve duas contas: origem e destino. O Gateway deve enriquecer a requisição com CPF/nome dos clientes.

No Event Store serão registrados dois eventos distintos (um por conta):

- Conta A → `TransferênciaOrigem` → -500
- Conta B → `TransferênciaDestino` → +500

Cada evento deve carregar informações suficientes para o histórico (conta oposta, CPF, nome, valor, timestamp).

O processamento deve garantir atomicidade lógica (ambos eventos criados) na camada de comando/gateway — ou registrar compensação/rollback em caso de falha parcial.


## Estrutura por evento

### Criado

Ocorre na criação da conta. Deve conter dados suficientes para reconstruir a entidade.

Exemplo:

```json
{
  "numeroConta": 1291,
  "cpfCliente": "00000000000",
  "cpfGerente": "11111111111",
  "dataCriacao": "2026-08-16T10:00:00"
}
```

### Depósito

Payload:

```json
{ "valor": 1000.00 }
```

Aplicação em replay:

```
saldo = saldo + valor
```

### Saque

Payload:

```json
{ "valor": 200.00 }
```

Aplicação em replay:

```
saldo = saldo - valor
```

### TransferênciaOrigem

Representa saída da conta origem.

Payload exemplo:

```json
{
  "contaDestino": 2000,
  "cpfDestino": "00000000000",
  "nomeDestino": "Nome do cliente",
  "valor": 500.00
}
```

Aplicação:

```
saldo = saldo - valor
```

### TransferênciaDestino

Representa entrada na conta destino.

Payload exemplo:

```json
{
  "contaOrigem": 1291,
  "cpfOrigem": "00000000000",
  "nomeOrigem": "Nome do cliente",
  "valor": 500.00
}
```

Aplicação:

```
saldo = saldo + valor
```

### GerenteAlterado

Payload exemplo:

```json
{
  "cpfGerenteAnterior": "11111111111",
  "cpfGerenteNovo": "22222222222"
}
```

Aplicação:

```
cpfGerente = cpfGerenteNovo
```
