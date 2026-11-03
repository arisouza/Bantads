const DEFAULT_HTTP_TIMEOUT_MS = 10_000;
const DEFAULT_JOB_TTL_SECONDS = 1_800;

class ServiceTimeoutError extends Error {
    constructor(url, timeoutMs) {
        super(`Tempo limite de ${timeoutMs}ms ao chamar ${url}`);
        this.name = 'ServiceTimeoutError';
        this.url = url;
        this.timeoutMs = timeoutMs;
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
    if (error instanceof ServiceTimeoutError) {
        return res.status(504).json({ status: 504, erro: 'Gateway Timeout', mensagem: 'Um serviço interno excedeu o tempo limite de resposta.' });
    }
    return res.status(500).json({ status: 500, erro: 'Internal Server Error', mensagem: error.message });
};

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
    ServiceTimeoutError,
    authorizeReboot,
    fetchWithTimeout,
    httpTimeoutMs,
    jobTtlSeconds,
    limparChavesDeTeste,
    serviceErrorResponse
};
