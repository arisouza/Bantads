const { redisClient, updateJob } = require('../config/redis');
const flows = require('./flows');
const segredos = require('./segredos');

const TIMEOUT_PASSO_MS = 30000;
const ESTADO_TTL = 3600;
const COMPENSACAO = /^(ROLLBACK|REACTIVATE|REASSOCIAR|DELETE|REMOVER)/;

const timers = new Map();

const chaveSaga = (id) => `saga:${id}`;
const chaveResultadoCompensacao = (id, indice) => `${chaveSaga(id)}:compensacao:${indice}:resultado`;

const carregar = async (id) => {
    const raw = await redisClient.get(chaveSaga(id));
    if (!raw) return null;
    try {
        return JSON.parse(raw);
    } catch (err) {
        // Um valor corrompido não pode derrubar o consumidor inteiro durante
        // uma recuperação. Mantemos o registro para diagnóstico e o ignoramos.
        console.error(`[SAGA] Estado inválido para ${id}: ${err.message}`);
        return null;
    }
};

const salvar = (saga) => redisClient.set(chaveSaga(saga.id), JSON.stringify(saga), { EX: ESTADO_TTL });

const limparTimer = (id) => {
    const timer = timers.get(id);
    if (timer) clearTimeout(timer);
    timers.delete(id);
};

const armarTimer = (saga, callback) => {
    const { id, passo } = saga;
    limparTimer(id);
    timers.set(id, setTimeout(
        callback,
        TIMEOUT_PASSO_MS
    ));
};

const finalizar = async (saga, status, extra) => {
    limparTimer(saga.id);
    await segredos.descartar(saga.id);
    saga.status = status;
    await salvar(saga);
    await updateJob(saga.id, status, extra);

    const chaves = flows[saga.tipo].cache?.(saga.ctx) ?? [];
    if (chaves.length) await redisClient.del(chaves);
};

const concluir = (saga) => finalizar(saga, 'CONCLUIDO', flows[saga.tipo].resultado(saga.ctx));

const publicarCompensacao = async (saga, indice) => {
    const compensacao = saga.compensacoes[indice];
    if (!compensacao) return finalizarFalha(saga, 'Plano de compensação incompleto.');

    const passo = flows[saga.tipo].passos[compensacao.passo];
    saga.compensacaoIndice = indice;
    saga.compensacaoAtual = compensacao;
    compensacao.status = 'EM_ANDAMENTO';
    await salvar(saga);
    await updateJob(saga.id, 'PENDENTE', {
        sagaStatus: 'COMPENSANDO',
        compensacaoAtual: compensacao.nome,
        compensacaoIndice: indice
    });

    try {
        await passo.desfazer(saga.ctx, saga.id, saga.erro);
    } catch (err) {
        return falharCompensacao(saga.id, indice, `Falha ao publicar compensação: ${err.message}`);
    }

    armarTimer(saga, () => falharCompensacao(
        saga.id,
        indice,
        `Timeout de 30s na compensação ${compensacao.nome}.`
    ));
};

const finalizarFalha = async (saga, erro, compensacaoStatus) => {
    if (saga.status === 'FALHA') return;
    saga.erro = saga.erro || erro;
    if (compensacaoStatus) {
        saga.compensacaoResultado = compensacaoStatus;
        saga.compensacaoErro = erro;
    }
    await finalizar(saga, 'FALHA', {
        erro: saga.erro,
        sagaStatus: compensacaoStatus || 'COMPENSACOES_CONCLUIDAS',
        compensacoes: saga.compensacoes
    });
    await flows[saga.tipo].aoFalhar?.(saga.ctx, saga.erro);
};

const falharCompensacao = async (id, indice, erro) => {
    const primeiroSinal = await redisClient.set(chaveResultadoCompensacao(id, indice), 'FALHOU', { NX: true, EX: ESTADO_TTL });
    if (!primeiroSinal) return;

    const saga = await carregar(id);
    if (!saga || saga.status !== 'COMPENSANDO' || saga.compensacaoIndice !== indice) return;

    const compensacao = saga.compensacoes[indice];
    if (!compensacao || compensacao.status !== 'EM_ANDAMENTO') return;

    limparTimer(id);
    compensacao.status = 'FALHOU';
    compensacao.erro = erro;
    await salvar(saga);
    await finalizarFalha(saga, erro, 'COMPENSACAO_FALHOU');
};

const concluirCompensacao = async (id, indice) => {
    const primeiroSinal = await redisClient.set(chaveResultadoCompensacao(id, indice), 'CONCLUIDA', { NX: true, EX: ESTADO_TTL });
    if (!primeiroSinal) return;

    const saga = await carregar(id);
    if (!saga || saga.status !== 'COMPENSANDO' || saga.compensacaoIndice !== indice) return;

    const compensacao = saga.compensacoes?.[indice];
    if (!compensacao || compensacao.status !== 'EM_ANDAMENTO') return;

    limparTimer(id);
    compensacao.status = 'CONCLUIDA';
    await salvar(saga);
    return avancarCompensacao(saga);
};

const avancarCompensacao = async (saga) => {
    const proximo = saga.compensacaoIndice + 1;
    if (proximo >= saga.compensacoes.length) {
        return finalizarFalha(saga, saga.erro, 'COMPENSACOES_CONCLUIDAS');
    }
    return publicarCompensacao(saga, proximo);
};

const iniciarCompensacao = async (saga, erro) => {
    limparTimer(saga.id);
    saga.status = 'COMPENSANDO';
    saga.erro = erro;
    saga.compensacoes = [...saga.feitos].reverse()
        .map((passo) => ({
            passo,
            nome: flows[saga.tipo].passos[passo].nome,
            comando: flows[saga.tipo].passos[passo].compensacao?.comando,
            sucesso: flows[saga.tipo].passos[passo].compensacao?.sucesso ?? [],
            falha: flows[saga.tipo].passos[passo].compensacao?.falha ?? [],
            status: 'PENDENTE'
        }))
        .filter((compensacao) => compensacao.comando);
    saga.compensacaoIndice = -1;
    saga.compensacaoAtual = null;
    await salvar(saga);

    if (saga.compensacoes.length === 0) return finalizarFalha(saga, erro);
    return publicarCompensacao(saga, 0);
};

const falhar = async (id, passo, erro) => {
    const primeiroSinal = await redisClient.set(`${chaveSaga(id)}:falha:${passo}`, '1', { NX: true, EX: ESTADO_TTL });
    if (!primeiroSinal) return;

    const saga = await carregar(id);
    if (!saga || saga.status !== 'EM_ANDAMENTO' || saga.passo !== passo) return;
    await iniciarCompensacao(saga, erro);
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
            return armarTimer(saga, () => falhar(
                saga.id,
                saga.passo,
                `Timeout de 30s no passo ${passo.nome}.`
            ));
        }

        saga.feitos.push(saga.passo);
    }
};

const iniciar = async ({ sagaId, action, data }) => {
    if (!flows[action]) return console.warn(`[SAGA] Ação desconhecida: ${action} (sagaId: ${sagaId})`);

    const { senha, ...ctx } = data ?? {};
    await segredos.guardar(sagaId, senha);

    await updateJob(sagaId, 'PENDENTE', flows[action].job);
    await avancar({ id: sagaId, tipo: action, ctx, passo: -1, feitos: [], status: 'EM_ANDAMENTO' });
};

const responder = async ({ sagaId, tipo, payload, erro }) => {
    const saga = await carregar(sagaId);
    if (!saga) return;

    if (saga.status === 'COMPENSANDO') {
        const compensacao = saga.compensacoes?.[saga.compensacaoIndice];
        if (!compensacao || compensacao.status !== 'EM_ANDAMENTO') return;
        if (compensacao.sucesso.includes(tipo)) {
            return concluirCompensacao(sagaId, saga.compensacaoIndice);
        }
        if (compensacao.falha.includes(tipo)) {
            return falharCompensacao(sagaId, saga.compensacaoIndice, erro || `Falha na compensação ${compensacao.nome}.`);
        }
        return;
    }

    if (saga.status !== 'EM_ANDAMENTO') return;

    const passo = flows[saga.tipo].passos[saga.passo];
    if (!passo || (tipo !== passo.sucesso && tipo !== passo.falha)) return;

    if (tipo === passo.falha) return falhar(sagaId, saga.passo, erro || `Falha no passo ${passo.nome}.`);

    limparTimer(sagaId);
    try {
        await passo.aplicar?.(saga.ctx, payload ?? {}, sagaId);
    } catch (err) {
        // A resposta já foi recebida, mas persistir/aplicar seus dados falhou.
        // Tratar isto como falha do passo permite compensar o que já ocorreu.
        return falhar(sagaId, saga.passo, `Falha ao aplicar resposta de ${passo.nome}: ${err.message}`);
    }
    saga.feitos.push(saga.passo);
    await avancar(saga);
};

const falhaTecnica = async ({ sagaId, action, tipo }) => {
    const saga = await carregar(sagaId);
    const comando = action ?? tipo ?? '';

    if (saga?.status === 'COMPENSANDO') {
        const compensacao = saga.compensacoes?.[saga.compensacaoIndice];
        if (!compensacao || compensacao.status !== 'EM_ANDAMENTO' || compensacao.comando !== comando) return;
        return falharCompensacao(sagaId, saga.compensacaoIndice, 'Falha técnica: compensação enviada à DLQ após as retentativas.');
    }

    if (COMPENSACAO.test(comando)) return;

    if (saga?.status === 'EM_ANDAMENTO') {
        await falhar(sagaId, saga.passo, 'Falha técnica: comando enviado à DLQ após as retentativas.');
    }
};

const recuperarPendentes = async () => {
    for await (const key of redisClient.scanIterator({ MATCH: 'saga:*', COUNT: 100 })) {
        if (key.includes(':falha:') || key.endsWith(':senha')) continue;
        const raw = await redisClient.get(key);
        if (!raw) continue;
        let saga;
        try {
            saga = JSON.parse(raw);
        } catch (err) {
            console.error(`[SAGA] Estado inválido ignorado durante recuperação (${key}): ${err.message}`);
            continue;
        }
        if (!flows[saga?.tipo]) continue;
        if (saga.status === 'COMPENSANDO') {
            const indice = saga.compensacaoIndice;
            const compensacao = saga.compensacoes?.[indice];
            if (compensacao?.status === 'EM_ANDAMENTO') {
                await publicarCompensacao(saga, indice);
            } else {
                await avancarCompensacao(saga);
            }
            continue;
        }
        if (saga.status !== 'EM_ANDAMENTO') continue;
        const passo = flows[saga.tipo].passos[saga.passo];
        if (passo?.sucesso) armarTimer(saga, () => falhar(
            saga.id,
            saga.passo,
            `Timeout de 30s no passo ${passo.nome}.`
        ));
        else await avancar(saga);
    }
};

module.exports = { iniciar, responder, falhaTecnica, recuperarPendentes };
