const { redisClient, updateJob } = require('../config/redis');
const flows = require('./flows');
const segredos = require('./segredos');

const TIMEOUT_PASSO_MS = 30000;
const ESTADO_TTL = 3600;
const COMPENSACAO = /^(ROLLBACK|REACTIVATE|REASSOCIAR)/;

const timers = new Map();

const chaveSaga = (id) => `saga:${id}`;

const carregar = async (id) => {
    const raw = await redisClient.get(chaveSaga(id));
    return raw ? JSON.parse(raw) : null;
};

const salvar = (saga) => redisClient.set(chaveSaga(saga.id), JSON.stringify(saga), { EX: ESTADO_TTL });

const limparTimer = (id) => {
    clearTimeout(timers.get(id));
    timers.delete(id);
};

const armarTimer = (saga) => {
    const { id, passo } = saga;
    limparTimer(id);
    timers.set(id, setTimeout(
        () => falhar(id, passo, `Timeout de 30s no passo ${flows[saga.tipo].passos[passo].nome}.`),
        TIMEOUT_PASSO_MS
    ));
};

const finalizar = async (saga, status, extra) => {
    limparTimer(saga.id);
    segredos.descartar(saga.id);
    saga.status = status;
    await salvar(saga);
    await updateJob(saga.id, status, extra);

    const chaves = flows[saga.tipo].cache(saga.ctx);
    if (chaves.length) await redisClient.del(chaves);
};

const concluir = (saga) => finalizar(saga, 'CONCLUIDO', flows[saga.tipo].resultado(saga.ctx));

const falhar = async (id, passo, erro) => {
    const primeiroSinal = await redisClient.set(`${chaveSaga(id)}:falha:${passo}`, '1', { NX: true, EX: ESTADO_TTL });
    if (!primeiroSinal) return;

    const saga = await carregar(id);
    if (!saga || saga.status !== 'EM_ANDAMENTO' || saga.passo !== passo) return;

    const flow = flows[saga.tipo];
    for (const indice of [...saga.feitos].reverse()) {
        await flow.passos[indice].desfazer?.(saga.ctx, id, erro);
    }

    await finalizar(saga, 'FALHA', { erro });
    await flow.aoFalhar?.(saga.ctx, erro);
};

const avancar = async (saga) => {
    const { passos } = flows[saga.tipo];

    while (saga.status === 'EM_ANDAMENTO') {
        saga.passo += 1;
        const passo = passos[saga.passo];
        if (!passo) return concluir(saga);
        if (passo.pular?.(saga.ctx)) continue;

        await salvar(saga);

        try {
            await passo.executar(saga.ctx, saga.id);
        } catch (err) {
            return falhar(saga.id, saga.passo, err.message);
        }

        if (passo.sucesso) {
            return armarTimer(saga);
        }

        saga.feitos.push(saga.passo);
    }
};

const iniciar = async ({ sagaId, action, data }) => {
    if (!flows[action]) return console.warn(`[SAGA] Ação desconhecida: ${action} (sagaId: ${sagaId})`);

    const { senha, ...ctx } = data ?? {};
    segredos.guardar(sagaId, senha);

    await updateJob(sagaId, 'PENDENTE', flows[action].job);
    await avancar({ id: sagaId, tipo: action, ctx, passo: -1, feitos: [], status: 'EM_ANDAMENTO' });
};

const responder = async ({ sagaId, tipo, payload, erro }) => {
    const saga = await carregar(sagaId);
    if (!saga || saga.status !== 'EM_ANDAMENTO') return;

    const passo = flows[saga.tipo].passos[saga.passo];
    if (!passo || (tipo !== passo.sucesso && tipo !== passo.falha)) return;

    if (tipo === passo.falha) return falhar(sagaId, saga.passo, erro || `Falha no passo ${passo.nome}.`);

    limparTimer(sagaId);
    passo.aplicar?.(saga.ctx, payload ?? {}, sagaId);
    saga.feitos.push(saga.passo);
    await avancar(saga);
};

const falhaTecnica = async ({ sagaId, action, tipo }) => {
    if (COMPENSACAO.test(action ?? tipo ?? '')) return;

    const saga = await carregar(sagaId);
    if (saga?.status === 'EM_ANDAMENTO') {
        await falhar(sagaId, saga.passo, 'Falha técnica: comando enviado à DLQ após as retentativas.');
    }
};

module.exports = { iniciar, responder, falhaTecnica };
