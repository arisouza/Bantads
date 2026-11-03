const test = require('node:test');
const assert = require('node:assert/strict');

const {
    ServiceTimeoutError,
    authorizeReboot,
    fetchWithTimeout,
    jobTtlSeconds,
    limparChavesDeTeste
} = require('../src/services/resilience');

const respostaFalsa = () => {
    const resposta = { statusCode: null, body: null };
    return {
        resposta,
        status(statusCode) {
            resposta.statusCode = statusCode;
            return this;
        },
        json(body) {
            resposta.body = body;
            return resposta;
        }
    };
};

test('encapsula timeout de serviço em erro semântico do gateway', async () => {
    const nativeFetch = (url, { signal }) => new Promise((resolve, reject) => {
        signal.addEventListener('abort', () => reject(new Error(`abortado: ${url}`)));
    });
    const original = process.env.HTTP_TIMEOUT_MS;
    process.env.HTTP_TIMEOUT_MS = '5';
    try {
        await assert.rejects(
            fetchWithTimeout(nativeFetch, 'http://servico-interno/teste'),
            (error) => error instanceof ServiceTimeoutError && error.timeoutMs === 5
        );
    } finally {
        if (original === undefined) delete process.env.HTTP_TIMEOUT_MS;
        else process.env.HTTP_TIMEOUT_MS = original;
    }
});

test('preserva erro original se quem chamou cancelar a requisição', async () => {
    const controller = new AbortController();
    const nativeFetch = (url, { signal }) => new Promise((resolve, reject) => {
        signal.addEventListener('abort', () => reject(new Error(`cancelado: ${url}`)));
    });
    const request = fetchWithTimeout(nativeFetch, 'http://servico-interno/teste', { signal: controller.signal });
    controller.abort();
    await assert.rejects(request, /cancelado/);
});

test('aceita reboot sem token somente fora de produção', () => {
    const nodeEnv = process.env.NODE_ENV;
    const rebootToken = process.env.REBOOT_TOKEN;
    process.env.NODE_ENV = 'development';
    delete process.env.REBOOT_TOKEN;
    let nextCalls = 0;
    try {
        authorizeReboot({ get: () => undefined }, respostaFalsa(), () => { nextCalls += 1; });
        assert.equal(nextCalls, 1);
    } finally {
        if (nodeEnv === undefined) delete process.env.NODE_ENV;
        else process.env.NODE_ENV = nodeEnv;
        if (rebootToken === undefined) delete process.env.REBOOT_TOKEN;
        else process.env.REBOOT_TOKEN = rebootToken;
    }
});

test('exige token administrativo para reboot em produção', () => {
    const nodeEnv = process.env.NODE_ENV;
    const rebootToken = process.env.REBOOT_TOKEN;
    process.env.NODE_ENV = 'production';
    process.env.REBOOT_TOKEN = 'segredo-de-teste';
    const { resposta, ...res } = respostaFalsa();
    try {
        authorizeReboot({ get: () => 'invalido' }, res, () => assert.fail('não deveria avançar'));
        assert.equal(resposta.statusCode, 403);
        assert.equal(resposta.body.erro, 'Forbidden');

        let nextCalls = 0;
        authorizeReboot({ get: () => 'segredo-de-teste' }, respostaFalsa(), () => { nextCalls += 1; });
        assert.equal(nextCalls, 1);
    } finally {
        if (nodeEnv === undefined) delete process.env.NODE_ENV;
        else process.env.NODE_ENV = nodeEnv;
        if (rebootToken === undefined) delete process.env.REBOOT_TOKEN;
        else process.env.REBOOT_TOKEN = rebootToken;
    }
});

test('limpa somente chaves de aplicação e não todo o Redis', async () => {
    const values = new Map([
        ['cache:cliente:1', 'x'],
        ['job:1', 'x'],
        ['sessao:abc', 'x'],
        ['sessao:cpf:1', 'x'],
        ['revoked:abc', 'x'],
        ['saga:1', 'x'],
        ['fila-de-outro-sistema', 'preservar']
    ]);
    const redis = {
        async *scanIterator({ MATCH }) {
            const prefix = MATCH.replace('*', '');
            for (const key of values.keys()) if (key.startsWith(prefix)) yield key;
        },
        async del(keys) {
            for (const key of keys) values.delete(key);
        }
    };
    const removidas = await limparChavesDeTeste(redis);
    assert.equal(removidas, 6);
    assert.equal(values.get('fila-de-outro-sistema'), 'preservar');
});

test('usa 30 minutos como retenção padrão de jobs e aceita configuração válida', () => {
    const original = process.env.JOB_TTL_SECONDS;
    delete process.env.JOB_TTL_SECONDS;
    assert.equal(jobTtlSeconds(), 1800);
    process.env.JOB_TTL_SECONDS = '7200';
    assert.equal(jobTtlSeconds(), 7200);
    process.env.JOB_TTL_SECONDS = 'invalido';
    assert.equal(jobTtlSeconds(), 1800);
    if (original === undefined) delete process.env.JOB_TTL_SECONDS;
    else process.env.JOB_TTL_SECONDS = original;
});
