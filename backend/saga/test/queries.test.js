const test = require('node:test');
const assert = require('node:assert/strict');

const {
    QueryTimeoutError,
    contaParaNovoGerente,
    fetchWithTimeout,
    getJson
} = require('../services/queries');

test('interrompe consulta interna que ultrapassa o timeout configurado', async () => {
    const fetchLento = (url, { signal }) => new Promise((resolve, reject) => {
        signal.addEventListener('abort', () => reject(new Error(`abortado: ${url}`)));
    });

    await assert.rejects(
        fetchWithTimeout('http://ms-conta/lento', {}, fetchLento, 5),
        (error) => error instanceof QueryTimeoutError && error.message.includes('ms-conta')
    );
});

test('propaga erro HTTP com URL para diagnóstico da SAGA', async () => {
    const fetchNotFound = async () => ({ ok: false, status: 404 });
    await assert.rejects(
        getJson('http://ms-cliente/clientes/inexistente', fetchNotFound),
        /Consulta falhou \(404\)/
    );
});

test('não seleciona conta para redistribuição quando gerente possui uma única conta', async () => {
    const originalFetch = global.fetch;
    global.fetch = async (url) => {
        if (url.includes('/gerentes')) {
            return { ok: true, json: async () => ({ gerentes: [{ cpf: 'novo' }, { cpf: 'gerente-1' }] }) };
        }
        return {
            ok: true,
            json: async () => ({ contas: [{ numeroConta: '0001', cpfCliente: '1', saldo: '10.00' }] })
        };
    };

    try {
        assert.deepEqual(await contaParaNovoGerente('novo'), {});
    } finally {
        global.fetch = originalFetch;
    }
});
