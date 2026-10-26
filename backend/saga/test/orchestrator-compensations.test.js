const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const orchestratorPath = path.resolve(__dirname, '../services/orchestrator.js');
const redisPath = path.resolve(__dirname, '../config/redis.js');
const flowsPath = path.resolve(__dirname, '../services/flows.js');
const segredosPath = path.resolve(__dirname, '../services/segredos.js');
const messagingPath = path.resolve(__dirname, '../services/messaging.js');
const queriesPath = path.resolve(__dirname, '../services/queries.js');

const makeHarness = () => {
    const values = new Map();
    const jobs = [];
    const published = [];
    const timers = new Set();
    let falhasNotificadas = 0;

    const redisClient = {
        async get(key) { return values.get(key) ?? null; },
        async set(key, value, options = {}) {
            if (options.NX && values.has(key)) return null;
            values.set(key, value);
            return 'OK';
        },
        async del(keys) {
            for (const key of (Array.isArray(keys) ? keys : [keys])) values.delete(key);
        },
        async *scanIterator() {
            for (const key of values.keys()) if (key.startsWith('saga:')) yield key;
        }
    };

    const publishPrimary = (nome) => async () => published.push(`principal:${nome}`);
    const compensar = (comando) => async () => published.push(`compensacao:${comando}`);
    const passos = [
        {
            nome: 'cliente', sucesso: 'CLIENTE_CREATED', falha: 'CLIENTE_FAILED',
            executar: publishPrimary('cliente'),
            compensacao: { comando: 'ROLLBACK_CLIENTE', sucesso: ['CLIENTE_ROLLBACK_DONE'], falha: ['CLIENTE_FAILED'] },
            desfazer: compensar('ROLLBACK_CLIENTE')
        },
        {
            nome: 'auth', sucesso: 'AUTH_CREATED', falha: 'AUTH_FAILED',
            executar: publishPrimary('auth'),
            compensacao: { comando: 'ROLLBACK_AUTH', sucesso: ['AUTH_ROLLBACK_DONE'], falha: ['AUTH_GERENTE_REVOKE_FAILED'] },
            desfazer: compensar('ROLLBACK_AUTH')
        },
        {
            nome: 'conta', sucesso: 'CONTA_CREATED', falha: 'CONTA_FAILED',
            executar: publishPrimary('conta'),
            compensacao: { comando: 'DELETE_CONTA', sucesso: ['CONTA_REMOVIDA'], falha: ['CONTA_FAILED'] },
            desfazer: compensar('DELETE_CONTA')
        }
    ];

    const flows = {
        TESTE: {
            job: { resultType: 'resource', dominio: 'clientes' },
            cache: () => [],
            resultado: () => ({ resourceId: 'cliente-1' }),
            aoFalhar: async () => { falhasNotificadas += 1; },
            passos
        }
    };

    const redisModule = {
        redisClient,
        updateJob: async (jobId, status, extra = {}) => {
            const job = { jobId, status, ...extra };
            jobs.push(job);
            values.set(`job:${jobId}`, JSON.stringify(job));
        }
    };

    const previousSetTimeout = global.setTimeout;
    const previousClearTimeout = global.clearTimeout;
    global.setTimeout = (callback) => {
        const timer = { callback, active: true };
        timers.add(timer);
        return timer;
    };
    global.clearTimeout = (timer) => {
        if (timer) timer.active = false;
    };

    require.cache[redisPath] = { id: redisPath, filename: redisPath, loaded: true, exports: redisModule };
    require.cache[flowsPath] = { id: flowsPath, filename: flowsPath, loaded: true, exports: flows };
    require.cache[segredosPath] = {
        id: segredosPath,
        filename: segredosPath,
        loaded: true,
        exports: { guardar: async () => {}, obter: async () => 'senha', descartar: async () => {} }
    };
    delete require.cache[orchestratorPath];

    const orchestrator = require(orchestratorPath);
    const restore = () => {
        global.setTimeout = previousSetTimeout;
        global.clearTimeout = previousClearTimeout;
        delete require.cache[orchestratorPath];
        delete require.cache[redisPath];
        delete require.cache[flowsPath];
        delete require.cache[segredosPath];
    };

    return { orchestrator, values, jobs, published, timers, restore, get falhasNotificadas() { return falhasNotificadas; } };
};

const resposta = (orchestrator, tipo) => orchestrator.responder({ sagaId: 'saga-1', tipo, payload: {} });

const prepararFalhaNoUltimoPasso = async (harness) => {
    const { orchestrator } = harness;
    await orchestrator.iniciar({ sagaId: 'saga-1', action: 'TESTE', data: { cpf: '111' } });
    await resposta(orchestrator, 'CLIENTE_CREATED');
    await resposta(orchestrator, 'AUTH_CREATED');
    await resposta(orchestrator, 'CONTA_FAILED');
};

test('executa compensacoes em ordem inversa e aguarda cada resposta', async () => {
    const harness = makeHarness();
    try {
        await prepararFalhaNoUltimoPasso(harness);
        assert.deepEqual(harness.published, [
            'principal:cliente', 'principal:auth', 'principal:conta',
            'compensacao:ROLLBACK_AUTH'
        ]);

        const durante = JSON.parse(harness.values.get('saga:saga-1'));
        assert.equal(durante.status, 'COMPENSANDO');
        assert.equal(durante.compensacaoIndice, 0);
        assert.equal(durante.compensacaoAtual.comando, 'ROLLBACK_AUTH');

        await resposta(harness.orchestrator, 'AUTH_ROLLBACK_DONE');
        assert.equal(harness.published.at(-1), 'compensacao:ROLLBACK_CLIENTE');

        await resposta(harness.orchestrator, 'CLIENTE_ROLLBACK_DONE');
        const final = JSON.parse(harness.values.get('saga:saga-1'));
        assert.equal(final.status, 'FALHA');
        assert.equal(final.compensacaoResultado, 'COMPENSACOES_CONCLUIDAS');
        assert.equal(JSON.parse(harness.values.get('job:saga-1')).status, 'FALHA');
    } finally {
        harness.restore();
    }
});

test('falha de compensacao finaliza o job e registra o erro', async () => {
    const harness = makeHarness();
    try {
        await prepararFalhaNoUltimoPasso(harness);
        await resposta(harness.orchestrator, 'AUTH_GERENTE_REVOKE_FAILED');
        const saga = JSON.parse(harness.values.get('saga:saga-1'));
        assert.equal(saga.status, 'FALHA');
        assert.equal(saga.compensacaoResultado, 'COMPENSACAO_FALHOU');
        assert.equal(saga.compensacoes[0].status, 'FALHOU');
        assert.equal(JSON.parse(harness.values.get('job:saga-1')).status, 'FALHA');
        assert.equal(harness.falhasNotificadas, 1);
    } finally {
        harness.restore();
    }
});

test('timeout da compensacao registra COMPENSACAO_FALHOU', async () => {
    const harness = makeHarness();
    try {
        await prepararFalhaNoUltimoPasso(harness);
        const timer = [...harness.timers].find((item) => item.active);
        await timer.callback();
        const saga = JSON.parse(harness.values.get('saga:saga-1'));
        assert.equal(saga.status, 'FALHA');
        assert.equal(saga.compensacaoResultado, 'COMPENSACAO_FALHOU');
        assert.match(saga.compensacaoErro, /Timeout de 30s/);
    } finally {
        harness.restore();
    }
});

test('resposta duplicada ou atrasada nao avanca a compensacao atual', async () => {
    const harness = makeHarness();
    try {
        await prepararFalhaNoUltimoPasso(harness);
        await resposta(harness.orchestrator, 'AUTH_ROLLBACK_DONE');
        const quantidade = harness.published.length;
        await resposta(harness.orchestrator, 'AUTH_ROLLBACK_DONE');
        assert.equal(harness.published.length, quantidade);
        assert.equal(JSON.parse(harness.values.get('saga:saga-1')).compensacaoIndice, 1);
    } finally {
        harness.restore();
    }
});

test('recupera compensacao em andamento apos reinicializacao', async () => {
    const harness = makeHarness();
    try {
        harness.values.set('saga:saga-1', JSON.stringify({
            id: 'saga-1', tipo: 'TESTE', status: 'COMPENSANDO', passo: 2,
            erro: 'falha', ctx: { cpf: '111' }, feitos: [0, 1],
            compensacaoIndice: 0,
            compensacaoAtual: { passo: 1, nome: 'auth', comando: 'ROLLBACK_AUTH', sucesso: ['AUTH_ROLLBACK_DONE'], falha: ['AUTH_GERENTE_REVOKE_FAILED'], status: 'EM_ANDAMENTO' },
            compensacoes: [
                { passo: 1, nome: 'auth', comando: 'ROLLBACK_AUTH', sucesso: ['AUTH_ROLLBACK_DONE'], falha: ['AUTH_GERENTE_REVOKE_FAILED'], status: 'EM_ANDAMENTO' },
                { passo: 0, nome: 'cliente', comando: 'ROLLBACK_CLIENTE', sucesso: ['CLIENTE_ROLLBACK_DONE'], falha: ['CLIENTE_FAILED'], status: 'PENDENTE' }
            ]
        }));
        await harness.orchestrator.recuperarPendentes();
        assert.equal(harness.published.at(-1), 'compensacao:ROLLBACK_AUTH');
        assert.ok([...harness.timers].some((item) => item.active));
    } finally {
        harness.restore();
    }
});

test('mantem os contratos reais de compensacao de R9', () => {
    const noopRedis = { get: async () => null, set: async () => 'OK', del: async () => {} };
    require.cache[redisPath] = {
        id: redisPath, filename: redisPath, loaded: true,
        exports: { redisClient: noopRedis }
    };
    require.cache[messagingPath] = {
        id: messagingPath, filename: messagingPath, loaded: true,
        exports: { cliente: () => {}, gerente: () => {}, auth: () => {}, conta: () => {}, email: () => {} }
    };
    require.cache[queriesPath] = {
        id: queriesPath, filename: queriesPath, loaded: true,
        exports: { gerentesAtivos: async () => [], contasDoGerente: async () => [], cliente: async () => ({}) }
    };
    require.cache[segredosPath] = {
        id: segredosPath, filename: segredosPath, loaded: true,
        exports: { guardar: async () => {}, obter: async () => 'senha', descartar: async () => {} }
    };
    delete require.cache[flowsPath];

    try {
        const flows = require(flowsPath);
        const passos = flows.APROVAR_CLIENTE_START.passos;
        const conta = passos.find((passo) => passo.nome === 'conta');
        assert.equal(conta.compensacao.comando, 'DELETE_CONTA');
        assert.deepEqual(conta.compensacao.sucesso, ['CONTA_REMOVIDA']);
        assert.deepEqual(conta.compensacao.falha, ['CONTA_FAILED']);
    } finally {
        delete require.cache[flowsPath];
        delete require.cache[redisPath];
        delete require.cache[messagingPath];
        delete require.cache[queriesPath];
        delete require.cache[segredosPath];
    }
});
