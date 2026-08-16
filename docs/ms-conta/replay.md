# Replay

O replay reconstrói o estado atual de uma conta aplicando eventos em ordem.

## Exemplo

- v1 Criado
- v2 Depósito       +1000
- v3 Depósito        +900
- v4 Saque           -550
- v5 Saque           -350
- v6 Depósito       +2000
- v7 Saque           -500
- v8 Transferência  -1700

Aplicação sequencial:

```
0
 +1000
 +900
 -550
 -350
 +2000
 -500
 -1700
 -------
 = 800
```

Saldo reconstruído = R$ 800,00

## Regra do replay

Processo:

1. Buscar todos os eventos da conta
2. Ordenar pela versão
3. Criar o estado inicial
4. Aplicar cada evento na ordem
5. Retornar o estado reconstruído

Pseudo:

```pseudo
replay(conta):
    estado = estadoInicial()
    eventos = buscarEventos(conta)
    ordenar eventos por versao
    para cada evento:
        estado = aplicar(evento, estado)
    retornar estado
```
