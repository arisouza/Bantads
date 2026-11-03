const quantidadeClientesValida = (resposta) => {
    if (!Array.isArray(resposta?.contas)) return null;
    return resposta.contas.length;
};

const comporGerentesComQuantidade = async (gerentes, consultarContas) => Promise.all(
    gerentes.map(async (gerente) => {
        try {
            const resposta = await consultarContas(gerente.cpf);
            if (!resposta.ok) {
                return { ...gerente, quantidadeClientes: null };
            }

            const body = await resposta.json();
            return {
                ...gerente,
                quantidadeClientes: quantidadeClientesValida(body)
            };
        } catch {
            return { ...gerente, quantidadeClientes: null };
        }
    })
);

module.exports = { comporGerentesComQuantidade };
