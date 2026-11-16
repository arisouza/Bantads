const DEFAULT_HTTP_TIMEOUT_MS = 10_000;
const DEFAULT_JOB_TTL_SECONDS = 1_800;
const REBOOT_LOCK_KEY = 'maintenance:reboot';
const REBOOT_LOCK_TTL_SECONDS = 120;

class ServiceTimeoutError extends Error {
    constructor(url, timeoutMs) {
        super(`Tempo limite de ${timeoutMs}ms ao chamar ${url}`);
        this.name = 'ServiceTimeoutError';
        this.url = url;
        this.timeoutMs = timeoutMs;
    }
}

class RebootConflictError extends Error {
    constructor(message) {
        super(message);
        this.name = 'RebootConflictError';
        this.statusCode = 409;
    }
}

const numberFromEnv = (value, fallback) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const httpTimeoutMs = () => numberFromEnv(process.env.HTTP_TIMEOUT_MS, DEFAULT_HTTP_TIMEOUT_MS);
const jobTtlSeconds = () => numberFromEnv(process.env.JOB_TTL_SECONDS, DEFAULT_JOB_TTL_SECONDS);

const fetchWithTimeout = async (nativeFetch, url, options = {}) => {
    const timeoutMs = httpTimeoutMs();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const originalSignal = options.signal;
    const abortFromCaller = () => controller.abort();
    originalSignal?.addEventListener('abort', abortFromCaller, { once: true });

    try {
        return await nativeFetch(url, { ...options, signal: controller.signal });
    } catch (error) {
        if (controller.signal.aborted && !originalSignal?.aborted) {
            throw new ServiceTimeoutError(url, timeoutMs);
        }
        throw error;
    } finally {
        clearTimeout(timeout);
        originalSignal?.removeEventListener('abort', abortFromCaller);
    }
};

const isProduction = () => process.env.NODE_ENV === 'production';

const authorizeReboot = (req, res, next) => {
    const rebootToken = process.env.REBOOT_TOKEN;
    if (!isProduction() && !rebootToken) return next();
    if (!rebootToken) {
        return res.status(503).json({ status: 503, erro: 'Service Unavailable', mensagem: 'Reboot administrativo não configurado.' });
    }
    if (req.get('X-Reboot-Token') !== rebootToken) {
        return res.status(403).json({ status: 403, erro: 'Forbidden', mensagem: 'Token administrativo inválido.' });
    }
    return next();
};

const serviceErrorResponse = (res, error) => {
    if (error instanceof RebootConflictError) {
        return res.status(error.statusCode).json({
            status: error.statusCode,
            erro: 'Conflict',
            mensagem: error.message
        });
    }
    if (error instanceof ServiceTimeoutError) {
        return res.status(504).json({ status: 504, erro: 'Gateway Timeout', mensagem: 'Um serviço interno excedeu o tempo limite de resposta.' });
    }
    return res.status(500).json({ status: 500, erro: 'Internal Server Error', mensagem: error.message });
};

const validarRespostaReboot = async (nome, response, quantidadeEsperada) => {
    if (!response.ok) {
        throw new Error(`${nome}: HTTP ${response.status} durante a restauração.`);
    }

    let body;
    try {
        body = await response.json();
    } catch {
        throw new Error(`${nome}: resposta JSON inválida durante a restauração.`);
    }

    if (!body || body.status !== 'ok') {
        throw new Error(`${nome}: resposta de restauração inválida.`);
    }

    if (quantidadeEsperada !== undefined && body[quantidadeEsperada.campo] !== quantidadeEsperada.valor) {
        throw new Error(
            `${nome}: quantidade restaurada inválida (esperado ${quantidadeEsperada.valor}).`
        );
    }

    return body;
};

const verificarSagasAtivas = async (redisClient) => {
    const ativas = [];

    for await (const key of redisClient.scanIterator({ MATCH: 'saga:*', COUNT: 100 })) {
        if (key.split(':').length !== 2) continue;
        const raw = await redisClient.get(key);
        if (!raw) continue;

        let saga;
        try {
            saga = JSON.parse(raw);
        } catch {
            throw new RebootConflictError(`Não foi possível verificar o estado da SAGA ${key}.`);
        }

        if (['EM_ANDAMENTO', 'COMPENSANDO'].includes(saga?.status)) {
            ativas.push(key.slice('saga:'.length));
        }
    }

    if (ativas.length > 0) {
        throw new RebootConflictError(
            `Restauração bloqueada: existem SAGAs em andamento (${ativas.join(', ')}).`
        );
    }
};

const adquirirLockReboot = async (redisClient) => {
    const adquirido = await redisClient.set(
        REBOOT_LOCK_KEY,
        new Date().toISOString(),
        { NX: true, EX: REBOOT_LOCK_TTL_SECONDS }
    );
    if (adquirido !== 'OK') {
        throw new RebootConflictError('Já existe uma restauração em andamento.');
    }
};

const liberarLockReboot = (redisClient) => redisClient.del(REBOOT_LOCK_KEY);

const limparChavesDeTeste = async (redisClient) => {
    const patterns = ['cache:*', 'job:*', 'sessao:*', 'sessao:cpf:*', 'revoked:*', 'saga:*'];
    const keys = new Set();
    for (const pattern of patterns) {
        for await (const key of redisClient.scanIterator({ MATCH: pattern, COUNT: 100 })) keys.add(key);
    }
    const uniqueKeys = [...keys];
    if (uniqueKeys.length > 0) await redisClient.del(uniqueKeys);
    return uniqueKeys.length;
};

module.exports = {
    DEFAULT_HTTP_TIMEOUT_MS,
    DEFAULT_JOB_TTL_SECONDS,
    REBOOT_LOCK_KEY,
    ServiceTimeoutError,
    RebootConflictError,
    authorizeReboot,
    adquirirLockReboot,
    fetchWithTimeout,
    httpTimeoutMs,
    jobTtlSeconds,
    liberarLockReboot,
    limparChavesDeTeste,
    serviceErrorResponse,
    validarRespostaReboot,
    verificarSagasAtivas
};
