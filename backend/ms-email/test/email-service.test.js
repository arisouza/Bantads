const test = require('node:test');
const assert = require('node:assert/strict');
const { buildHtml, processEmail, validarMensagem } = require('../src/index');

const mensagem = (conteudo) => ({ content: Buffer.from(JSON.stringify(conteudo)) });

const canalFalso = () => {
    const respostas = [];
    const acks = [];
    const nacks = [];
    return {
        respostas,
        acks,
        nacks,
        sendToQueue: (fila, corpo) => respostas.push({ fila, corpo: JSON.parse(corpo.toString()) }),
        ack: (msg) => acks.push(msg),
        nack: (msg, allUpTo, requeue) => nacks.push({ msg, allUpTo, requeue })
    };
};

test('protege campos dinamicos contra HTML no conteudo de rejeicao', () => {
    const html = buildHtml({ tipo: 'REJEICAO', dados: { motivo: '<script>alert(1)</script>' } });
    assert.match(html, /&lt;script&gt;/);
    assert.doesNotMatch(html, /<script>/);
});

test('exige destinatario, tipo e senha no e-mail de senha inicial', () => {
    assert.throws(() => validarMensagem({ tipo: 'SENHA_INICIAL', destinatario: '', dados: {} }), /Destinatário inválido/);
    assert.throws(() => validarMensagem({ tipo: 'SENHA_INICIAL', destinatario: 'a@b.com', dados: {} }), /Senha inicial/);
    assert.throws(() => validarMensagem({ destinatario: 'a@b.com', dados: {} }), /Tipo/);
});

test('processa o e-mail em ambiente local sem publicar resposta ao orquestrador', async () => {
    const canal = canalFalso();
    const originalLog = console.log;
    console.log = () => {};
    try {
        const msg = mensagem({
            sagaId: 'saga-email-1', destinatario: 'cliente@bantads.com',
            tipo: 'REJEICAO', assunto: 'Resultado', dados: { motivo: 'documento inválido' }
        });
        await processEmail(msg, canal);
        assert.equal(canal.acks.length, 1);
        assert.equal(canal.nacks.length, 0);
        assert.deepEqual(canal.respostas, []);
    } finally {
        console.log = originalLog;
    }
});

test('descarta a mensagem invalida sem publicar EMAIL_FAILED ao orquestrador', async () => {
    const canal = canalFalso();
    const originalError = console.error;
    console.error = () => {};
    try {
        const msg = mensagem({ sagaId: 'saga-email-2', tipo: 'SENHA_INICIAL', destinatario: 'cliente@bantads.com', dados: {} });
        await processEmail(msg, canal);
        assert.equal(canal.acks.length, 0);
        assert.deepEqual(canal.nacks, [{ msg, allUpTo: false, requeue: false }]);
        assert.deepEqual(canal.respostas, []);
    } finally {
        console.error = originalError;
    }
});
