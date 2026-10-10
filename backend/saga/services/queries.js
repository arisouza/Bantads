const CLIENTE_URL = process.env.CLIENTE_URL || 'http://ms-cliente:3002';
const GERENTE_URL = process.env.GERENTE_URL || 'http://ms-gerente:3003';
const CONTA_URL = process.env.CONTA_URL || 'http://ms-conta:3004';

const getJson = async (url) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Consulta falhou (${res.status}): ${url}`);
    return res.json();
};

const gerentesAtivos = async () => (await getJson(`${GERENTE_URL}/gerentes`)).gerentes.map((g) => g.cpf);

const contasDoGerente = async (cpf) => (await getJson(`${CONTA_URL}/contas/gerente/${cpf}`)).contas ?? [];

const cliente = (cpf) => getJson(`${CLIENTE_URL}/clientes/${cpf}`);

const somaSaldos = (contas) => contas.reduce((total, conta) => total + Number(conta.saldo), 0);

const contaParaNovoGerente = async (cpfNovo) => {
    const cpfs = (await gerentesAtivos()).filter((cpf) => cpf !== cpfNovo);
    const candidatos = await Promise.all(cpfs.map(async (cpf) => {
        const contas = await contasDoGerente(cpf);
        return { cpf, contas, total: somaSaldos(contas) };
    }));

    candidatos.sort((a, b) => b.contas.length - a.contas.length || a.total - b.total);
    const escolhido = candidatos[0];
    if (!escolhido || escolhido.contas.length <= 1) return {};

    const conta = escolhido.contas.reduce((menor, atual) => (Number(atual.saldo) < Number(menor.saldo) ? atual : menor));
    return {
        numeroConta: conta.numeroConta,
        cpfClienteConta: conta.cpfCliente,
        cpfGerenteOriginal: escolhido.cpf
    };
};

module.exports = { gerentesAtivos, contasDoGerente, cliente, contaParaNovoGerente };
