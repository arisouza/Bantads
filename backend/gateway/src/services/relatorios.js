const comporRelatorioClientes = (clientes, contas, gerentes, collator = new Intl.Collator('pt-BR', { sensitivity: 'base' })) => {
    const contaByCliente = Object.fromEntries(contas.map((conta) => [conta.cpfCliente, conta]));
    const gerById = Object.fromEntries(gerentes.map((gerente) => [gerente.cpf, gerente]));

    return clientes.map((cliente) => {
        const conta = contaByCliente[cliente.cpf];
        const gerente = conta ? gerById[conta.cpfGerente] : null;
        return {
            cpf: cliente.cpf,
            nome: cliente.nome,
            email: cliente.email,
            salario: cliente.salario,
            numeroConta: conta?.numeroConta ?? conta?.numero ?? null,
            saldo: conta?.saldo ?? '0.00',
            cpfGerente: conta?.cpfGerente ?? null,
            nomeGerente: gerente?.nome ?? null,
        };
    }).sort((a, b) => collator.compare(a.nome, b.nome));
};

module.exports = { comporRelatorioClientes };
