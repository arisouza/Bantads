const test = require('node:test');
const assert = require('node:assert/strict');
const { comporGerentesComQuantidade } = require('../src/services/gerentes');

const gerentes = [
    { cpf: '111', nome: 'Alice' },
    { cpf: '222', nome: 'Bruno' },
    { cpf: '333', nome: 'Carla' }
];

test('retorna a quantidade correta, inclusive zero', async () => {
    const resultado = await comporGerentesComQuantidade(gerentes, async (cpf) => ({
        ok: true,
        async json() {
            return { contas: cpf === '111' ? [{ numeroConta: '1001' }] : [] };
        }
    }));

    assert.deepEqual(resultado.map(({ quantidadeClientes }) => quantidadeClientes), [1, 0, 0]);
});

test('retorna null somente para o gerente cuja consulta falhou', async () => {
    const resultado = await comporGerentesComQuantidade(gerentes, async (cpf) => {
        if (cpf === '222') throw new Error('timeout');
        return {
            ok: true,
            async json() {
                return { contas: cpf === '111' ? [{}] : [] };
            }
        };
    });

    assert.deepEqual(resultado.map(({ quantidadeClientes }) => quantidadeClientes), [1, null, 0]);
});

test('trata erro HTTP e resposta inválida como quantidade indisponível', async () => {
    const resultado = await comporGerentesComQuantidade(gerentes, async (cpf) => {
        if (cpf === '111') return { ok: false, status: 503 };
        if (cpf === '222') return { ok: true, async json() { return { quantidadeClientes: 4 }; } };
        return { ok: true, async json() { return { contas: null }; } };
    });

    assert.deepEqual(resultado.map(({ quantidadeClientes }) => quantidadeClientes), [null, null, null]);
});
