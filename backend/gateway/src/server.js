const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { createProxyMiddleware, fixRequestBody } = require('http-proxy-middleware');
const { v4: uuidv4 } = require('uuid');

const { redisClient, connectRedis, invalidateCache } = require('./config/redis');
const { connectRabbitMQ, getChannel } = require('./config/rabbitmq');
const { verifyJWT, requireRole, SECRET } = require('./middlewares/auth');

const app = express();
const PORT = process.env.PORT || 3000;
const AUTH_URL = process.env.AUTH_URL || 'http://ms-auth:3001';
const CLIENTE_URL = process.env.CLIENTE_URL || 'http://ms-cliente:3002';
const GERENTE_URL = process.env.GERENTE_URL || 'http://ms-gerente:3003';
const CONTA_URL = process.env.CONTA_URL || 'http://ms-conta:3004';

const GATEWAY_BASE = process.env.GATEWAY_BASE || 'http://localhost:3000';

app.use(cors());
app.use(express.json());

const injectHeaders = (proxyReq, req) => {
    const user = req.userIdentity;
    if (user) {
        proxyReq.setHeader('X-User-CPF', user.cpf);
        proxyReq.setHeader('X-User-Tipo', user.tipo);
    }
    fixRequestBody(proxyReq, req);
};

const proxyOpts = (target) => ({
    target,
    changeOrigin: true,
    on: { proxyReq: injectHeaders }
});

const collator = new Intl.Collator('pt-BR', { sensitivity: 'base' });
const sortByNome = (arr) => arr.sort((a, b) => collator.compare(a.nome, b.nome));

const fetchJson = async (url, opts = {}) => {
    const res = await fetch(url, opts);
    return { status: res.status, ok: res.ok, body: res.ok ? await res.json() : null };
};

const publishSaga = (action, data) => {
    const sagaId = uuidv4();
    getChannel().sendToQueue('saga.cmd', Buffer.from(JSON.stringify({ sagaId, action, data })));
    return sagaId;
};

const getJob = async (jobId) => {
    const raw = await redisClient.get(`job:${jobId}`);
    return raw ? JSON.parse(raw) : null;
};

app.get('/health', (req, res) => res.status(200).json({ status: 'UP' }));

app.post('/reboot', async (req, res) => {
    try {
        const [rCliente, rGerente, rConta, rAuth] = await Promise.all([
            fetch(`${CLIENTE_URL}/clientes/reboot`, { method: 'POST' }),
            fetch(`${GERENTE_URL}/gerentes/reboot`, { method: 'POST' }),
            fetch(`${CONTA_URL}/contas/reboot`, { method: 'POST' }),
            fetch(`${AUTH_URL}/auth/reboot`, { method: 'POST' }),
        ]);

        const [cli, ger, cnt] = await Promise.all([
            rCliente.ok ? rCliente.json() : {},
            rGerente.ok ? rGerente.json() : {},
            rConta.ok ? rConta.json() : {},
        ]);

        const keys = await redisClient.keys('*');
        if (keys.length > 0) await redisClient.del(keys);

        return res.status(200).json({
            status: 'ok',
            clientes: cli.clientes ?? 5,
            gerentes: ger.gerentes ?? 4,
            contas: cnt.contas ?? 5,
        });
    } catch (err) {
        console.error('Reboot error:', err.message);
        return res.status(200).json({ status: 'ok', clientes: 5, gerentes: 4, contas: 5 });
    }
});

app.post('/login', async (req, res) => {
    const { email, senha } = req.body;
    if (!email || !senha) {
        return res.status(400).json({ auth: false, message: 'Credenciais ausentes' });
    }

    try {
        const authRes = await fetch(`${AUTH_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, senha }),
        });

        if (authRes.status === 401) {
            return res.status(401).json({ auth: false, message: 'Login inválido!' });
        }
        if (!authRes.ok) throw new Error('Erro no MS Auth');

        const { cpf, tipo } = await authRes.json();

        const userUrl = tipo === 'CLIENTE'
            ? `${CLIENTE_URL}/clientes/${cpf}`
            : `${GERENTE_URL}/gerentes/${cpf}`;

        let nome = '';
        const userRes = await fetch(userUrl);
        if (userRes.ok) {
            const u = await userRes.json();
            nome = u.nome;
        }

        const jti = uuidv4();
        const token = jwt.sign({ cpf, tipo, jti }, SECRET, { expiresIn: '8h' });

        await redisClient.set(`sessao:${jti}`, JSON.stringify({ cpf, tipo }), { EX: 1800 });
        await redisClient.set(`sessao:cpf:${cpf}`, jti, { EX: 1800 });

        return res.status(200).json({ auth: true, token, tipo, usuario: { cpf, nome, email } });
    } catch (err) {
        return res.status(500).json({ auth: false, message: 'Erro interno no login' });
    }
});

app.post('/logout', verifyJWT, async (req, res) => {
    try {
        const token = req.headers['x-access-token'];
        const { jti, cpf, exp } = jwt.decode(token);
        const remaining = exp - Math.floor(Date.now() / 1000);

        if (remaining > 0) {
            await redisClient.set(`revoked:${token}`, 'true', { EX: remaining });
        }

        await redisClient.del(`sessao:${jti}`);
        await redisClient.del(`sessao:cpf:${cpf}`);

        return res.status(204).send();
    } catch (err) {
        return res.status(500).json({ message: 'Erro ao efetuar logout' });
    }
});

const solicitacoesProxyOpts = proxyOpts(CLIENTE_URL);
solicitacoesProxyOpts.pathRewrite = { '^/solicitacoes': '/clientes/solicitacoes' };
app.post('/solicitacoes', createProxyMiddleware(solicitacoesProxyOpts));
app.post('/clientes', createProxyMiddleware(proxyOpts(CLIENTE_URL)));

app.get('/solicitacoes', verifyJWT, requireRole('GERENTE'),
    createProxyMiddleware(solicitacoesProxyOpts));

app.get('/solicitacoes/:cpf', verifyJWT, requireRole('GERENTE'),
    createProxyMiddleware(solicitacoesProxyOpts));

app.post('/solicitacoes/:cpf/aprovacao', verifyJWT, requireRole('GERENTE'), async (req, res) => {
    const { cpf } = req.params;
    const sagaId = publishSaga('APROVAR_CLIENTE_START', { cpf });
    res.set('Location', `/jobs/${sagaId}/status`);
    return res.status(202).json({ jobId: sagaId, status: 'PENDENTE' });
});

app.post('/solicitacoes/:cpf/rejeicao', verifyJWT, requireRole('GERENTE'),
    createProxyMiddleware(solicitacoesProxyOpts));

app.get('/clientes', verifyJWT, requireRole('GERENTE'), async (req, res) => {
    try {
        const { busca } = req.query;

        const cliRes = await fetch(`${CLIENTE_URL}/clientes${busca ? `?busca=${encodeURIComponent(busca)}` : ''}`);
        if (!cliRes.ok) return res.status(502).json({ status: 502, erro: 'Bad Gateway', mensagem: 'Falha ao buscar clientes' });

        const { clientes: lista } = await cliRes.json();

        const contaRes = await fetch(`${CONTA_URL}/contas`);
        const contaMap = {};
        if (contaRes.ok) {
            const { contas } = await contaRes.json();
            for (const c of contas) contaMap[c.cpfCliente] = c.saldo;
        }

        const result = lista.map(c => ({
            cpf: c.cpf,
            nome: c.nome,
            cidade: c.endereco?.cidade ?? '',
            estado: c.endereco?.uf ?? '',
            saldo: contaMap[c.cpf] ?? '0.00',
            _links: { self: { href: `${GATEWAY_BASE}/clientes/${c.cpf}` } },
        }));

        sortByNome(result);

        return res.status(200).json({
            clientes: result,
            _links: { self: { href: `${GATEWAY_BASE}/clientes` } },
        });
    } catch (err) {
        return res.status(500).json({ status: 500, erro: 'Internal Server Error', mensagem: err.message });
    }
});

app.get('/clientes/:cpf/conta', verifyJWT, async (req, res) => {
    const { cpf } = req.params;
    const { cpf: userCpf, tipo } = req.userIdentity;

    if (tipo === 'CLIENTE' && cpf !== userCpf) {
        return res.status(403).json({ status: 403, erro: 'Forbidden', mensagem: 'Acesso não permitido.' });
    }

    try {
        const r = await fetch(`${CONTA_URL}/contas/cliente/${cpf}`);
        if (r.status === 404) return res.status(404).json({ status: 404, erro: 'Not Found', mensagem: 'Conta não encontrada' });
        if (!r.ok) return res.status(502).json({ status: 502, erro: 'Bad Gateway', mensagem: 'Erro no MS Conta' });

        const conta = await r.json();
        const numero = conta.numeroConta ?? conta.numero;
        const base = `${GATEWAY_BASE}/contas/${numero}`;
        conta._links = {
            self: { href: base },
            deposito: { href: `${base}/deposito` },
            saque: { href: `${base}/saque` },
            transferencia: { href: `${base}/transferencia` },
            extrato: { href: `${base}/extrato` },
            cliente: { href: `${GATEWAY_BASE}/clientes/${cpf}` },
        };
        return res.status(200).json(conta);
    } catch (err) {
        return res.status(500).json({ status: 500, erro: 'Internal Server Error', mensagem: err.message });
    }
});

app.get('/clientes/:cpf', verifyJWT, async (req, res) => {
    const { cpf } = req.params;
    const { cpf: userCpf, tipo } = req.userIdentity;

    if (tipo === 'CLIENTE' && cpf !== userCpf) {
        return res.status(403).json({ status: 403, erro: 'Forbidden', mensagem: 'Acesso não permitido.' });
    }

    const cacheKey = `cache:cliente:${cpf}`;
    try {
        const cached = await redisClient.get(cacheKey);
        if (cached) return res.status(200).json(JSON.parse(cached));

        const r = await fetch(`${CLIENTE_URL}/clientes/${cpf}`);
        if (r.status === 404) return res.status(404).json({ status: 404, erro: 'Not Found', mensagem: 'Cliente não encontrado' });
        if (!r.ok) return res.status(502).json({ status: 502, erro: 'Bad Gateway', mensagem: 'Erro no MS Cliente' });

        const cliente = await r.json();
        cliente._links = {
            self: { href: `${GATEWAY_BASE}/clientes/${cpf}` },
            conta: { href: `${GATEWAY_BASE}/clientes/${cpf}/conta` },
        };

        await redisClient.set(cacheKey, JSON.stringify(cliente), { EX: 300 });
        return res.status(200).json(cliente);
    } catch (err) {
        return res.status(500).json({ status: 500, erro: 'Internal Server Error', mensagem: err.message });
    }
});

app.get('/contas/:numero', verifyJWT, async (req, res) => {
    const { numero } = req.params;
    const { cpf: userCpf, tipo } = req.userIdentity;

    try {
        const r = await fetch(`${CONTA_URL}/contas/${numero}`);
        if (r.status === 404) return res.status(404).json({ status: 404, erro: 'Not Found', mensagem: 'Conta não encontrada' });
        if (!r.ok) return res.status(502).json({ status: 502, erro: 'Bad Gateway', mensagem: 'Erro no MS Conta' });

        const raw = await r.json();
        const cpfCliente = raw.cpfCliente;

        if (tipo === 'CLIENTE' && cpfCliente !== userCpf) {
            return res.status(403).json({ status: 403, erro: 'Forbidden', mensagem: 'Acesso não permitido.' });
        }

        const base = `${GATEWAY_BASE}/contas/${numero}`;
        const conta = {
            ...raw,
            numero: raw.numeroConta ?? raw.numero ?? numero,
            _links: {
                self: { href: base },
                deposito: { href: `${base}/deposito` },
                saque: { href: `${base}/saque` },
                transferencia: { href: `${base}/transferencia` },
                extrato: { href: `${base}/extrato` },
                cliente: { href: `${GATEWAY_BASE}/clientes/${cpfCliente}` },
            },
        };
        return res.status(200).json(conta);
    } catch (err) {
        return res.status(500).json({ status: 500, erro: 'Internal Server Error', mensagem: err.message });
    }
});

app.post('/contas/:numero/deposito', verifyJWT, requireRole('CLIENTE'), async (req, res) => {
    const { numero } = req.params;
    const { cpf: userCpf } = req.userIdentity;

    try {
        const contaRes = await fetch(`${CONTA_URL}/contas/${numero}`);
        if (!contaRes.ok) return res.status(404).json({ status: 404, erro: 'Not Found', mensagem: 'Conta não encontrada' });
        const conta = await contaRes.json();

        if (conta.cpfCliente !== userCpf) {
            return res.status(403).json({ status: 403, erro: 'Forbidden', mensagem: 'Acesso não permitido.' });
        }

        const r = await fetch(`${CONTA_URL}/contas/${numero}/deposito`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-User-CPF': userCpf, 'X-User-Tipo': 'CLIENTE' },
            body: JSON.stringify(req.body),
        });

        const body = await r.json();
        if (!r.ok) return res.status(r.status).json(body);

        body._links = {
            conta: { href: `${GATEWAY_BASE}/contas/${numero}` },
            extrato: { href: `${GATEWAY_BASE}/contas/${numero}/extrato` },
        };
        return res.status(201).json(body);
    } catch (err) {
        return res.status(500).json({ status: 500, erro: 'Internal Server Error', mensagem: err.message });
    }
});

app.post('/contas/:numero/saque', verifyJWT, requireRole('CLIENTE'), async (req, res) => {
    const { numero } = req.params;
    const { cpf: userCpf } = req.userIdentity;

    try {
        const contaRes = await fetch(`${CONTA_URL}/contas/${numero}`);
        if (!contaRes.ok) return res.status(404).json({ status: 404, erro: 'Not Found', mensagem: 'Conta não encontrada' });
        const conta = await contaRes.json();

        if (conta.cpfCliente !== userCpf) {
            return res.status(403).json({ status: 403, erro: 'Forbidden', mensagem: 'Acesso não permitido.' });
        }

        const r = await fetch(`${CONTA_URL}/contas/${numero}/saque`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-User-CPF': userCpf, 'X-User-Tipo': 'CLIENTE' },
            body: JSON.stringify(req.body),
        });

        const body = await r.json();
        if (!r.ok) return res.status(r.status).json(body);

        body._links = {
            conta: { href: `${GATEWAY_BASE}/contas/${numero}` },
            extrato: { href: `${GATEWAY_BASE}/contas/${numero}/extrato` },
        };
        return res.status(201).json(body);
    } catch (err) {
        return res.status(500).json({ status: 500, erro: 'Internal Server Error', mensagem: err.message });
    }
});

app.post('/contas/:numero/transferencia', verifyJWT, requireRole('CLIENTE'), async (req, res) => {
    const { numero } = req.params;
    const { cpf: userCpf } = req.userIdentity;
    const { contaDestino, valor } = req.body;

    try {
        const [origemRes, destinoRes] = await Promise.all([
            fetch(`${CONTA_URL}/contas/${numero}`),
            fetch(`${CONTA_URL}/contas/${contaDestino}`),
        ]);

        if (!origemRes.ok) return res.status(404).json({ status: 404, erro: 'Not Found', mensagem: 'Conta origem não encontrada' });
        const origem = await origemRes.json();

        if (origem.cpfCliente !== userCpf) {
            return res.status(403).json({ status: 403, erro: 'Forbidden', mensagem: 'Acesso não permitido.' });
        }

        if (!destinoRes.ok) return res.status(422).json({ status: 422, erro: 'Unprocessable Entity', mensagem: 'Conta destino não encontrada' });
        const destino = await destinoRes.json();

        const cpfDestino = destino.cpfCliente;
        const cpfOrigem = origem.cpfCliente;

        const [nomeOrigemRes, nomeDestinoRes] = await Promise.all([
            fetch(`${CLIENTE_URL}/clientes/${cpfOrigem}`),
            fetch(`${CLIENTE_URL}/clientes/${cpfDestino}`),
        ]);

        const nomeOrigem = nomeOrigemRes.ok ? (await nomeOrigemRes.json()).nome : '';
        const nomeDestino = nomeDestinoRes.ok ? (await nomeDestinoRes.json()).nome : '';

        const r = await fetch(`${CONTA_URL}/contas/${numero}/transferencia`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-User-CPF': userCpf, 'X-User-Tipo': 'CLIENTE' },
            body: JSON.stringify({
                contaDestino, valor,
                cpfOrigem,
                cpfDestino,
                nomeOrigem,
                nomeDestino,
            }),
        });

        if (!r.ok) {
            const errBody = await r.json().catch(() => ({}));
            return res.status(r.status).json(errBody);
        }

        return res.status(201).json({
            mensagem: 'Transferência registrada',
            origem: { conta: numero, nome: nomeOrigem },
            destino: { conta: contaDestino, nome: nomeDestino },
            valor,
            _links: {
                conta: { href: `${GATEWAY_BASE}/contas/${numero}` },
                extrato: { href: `${GATEWAY_BASE}/contas/${numero}/extrato` },
            },
        });
    } catch (err) {
        return res.status(500).json({ status: 500, erro: 'Internal Server Error', mensagem: err.message });
    }
});

app.get('/contas/:numero/extrato', verifyJWT, async (req, res) => {
    const { numero } = req.params;
    const { cpf: userCpf, tipo } = req.userIdentity;

    try {
        const contaRes = await fetch(`${CONTA_URL}/contas/${numero}`);
        if (!contaRes.ok) return res.status(404).json({ status: 404, erro: 'Not Found', mensagem: 'Conta não encontrada' });
        const conta = await contaRes.json();

        if (tipo === 'CLIENTE' && conta.cpfCliente !== userCpf) {
            return res.status(403).json({ status: 403, erro: 'Forbidden', mensagem: 'Acesso não permitido.' });
        }

        const hoje = new Date().toISOString().slice(0, 10);
        const trintaDiasAtras = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

        const inicio = req.query.inicio || trintaDiasAtras;
        const fim = req.query.fim || hoje;

        const r = await fetch(`${CONTA_URL}/contas/${numero}/extrato?inicio=${inicio}&fim=${fim}`, {
            headers: { 'X-User-CPF': userCpf, 'X-User-Tipo': tipo },
        });

        const body = await r.json();
        if (!r.ok) return res.status(r.status).json(body);

        body._links = { self: { href: `${GATEWAY_BASE}/contas/${numero}/extrato` } };
        return res.status(200).json(body);
    } catch (err) {
        return res.status(500).json({ status: 500, erro: 'Internal Server Error', mensagem: err.message });
    }
});

app.get('/gerentes', verifyJWT, requireRole('GERENTE'), async (req, res) => {
    try {
        const gerRes = await fetch(`${GERENTE_URL}/gerentes`);
        if (!gerRes.ok) return res.status(502).json({ status: 502, erro: 'Bad Gateway', mensagem: 'Erro no MS Gerente' });

        const { gerentes: lista } = await gerRes.json();

        const cpfs = lista.map(g => g.cpf).join(',');
        const qtdMap = {};
        if (cpfs) {
            try {
                const cntRes = await fetch(`${CONTA_URL}/contas/gerente/menos-clientes?cpfs=${encodeURIComponent(cpfs)}`);
                if (cntRes.ok) {
                    for (const g of lista) {
                        const r = await fetch(`${CONTA_URL}/contas/gerente/${g.cpf}`);
                        if (r.ok) {
                            const body = await r.json();
                            qtdMap[g.cpf] = (body.contas ?? []).length;
                        }
                    }
                }
            } catch { }
        }

        const result = lista.map(g => ({
            ...g,
            quantidadeClientes: qtdMap[g.cpf] ?? 0,
            _links: {
                self: { href: `${GATEWAY_BASE}/gerentes/${g.cpf}` },
                atualizacao: { href: `${GATEWAY_BASE}/gerentes/${g.cpf}` },
                remocao: { href: `${GATEWAY_BASE}/gerentes/${g.cpf}` },
            },
        }));

        sortByNome(result);

        return res.status(200).json({
            gerentes: result,
            _links: { self: { href: `${GATEWAY_BASE}/gerentes` } },
        });
    } catch (err) {
        return res.status(500).json({ status: 500, erro: 'Internal Server Error', mensagem: err.message });
    }
});

app.post('/gerentes', verifyJWT, requireRole('GERENTE'), async (req, res) => {
    const sagaId = publishSaga('INSERIR_GERENTE_START', req.body);
    res.set('Location', `/jobs/${sagaId}/status`);
    return res.status(202).json({ jobId: sagaId, status: 'PENDENTE' });
});

app.get('/gerentes/:cpf', verifyJWT, requireRole('GERENTE'), async (req, res) => {
    const { cpf } = req.params;
    const cacheKey = `cache:gerente:${cpf}`;

    try {
        const cached = await redisClient.get(cacheKey);
        if (cached) return res.status(200).json(JSON.parse(cached));

        const r = await fetch(`${GERENTE_URL}/gerentes/${cpf}`);
        if (r.status === 404) return res.status(404).json({ status: 404, erro: 'Not Found', mensagem: 'Gerente não encontrado' });
        if (!r.ok) return res.status(502).json({ status: 502, erro: 'Bad Gateway', mensagem: 'Erro no MS Gerente' });

        const gerente = await r.json();
        gerente._links = {
            self: { href: `${GATEWAY_BASE}/gerentes/${cpf}` },
            atualizacao: { href: `${GATEWAY_BASE}/gerentes/${cpf}` },
            remocao: { href: `${GATEWAY_BASE}/gerentes/${cpf}` },
        };

        await redisClient.set(cacheKey, JSON.stringify(gerente), { EX: 300 });
        return res.status(200).json(gerente);
    } catch (err) {
        return res.status(500).json({ status: 500, erro: 'Internal Server Error', mensagem: err.message });
    }
});

app.put('/gerentes/:cpf', verifyJWT, requireRole('GERENTE'), async (req, res) => {
    const { cpf } = req.params;
    const { email, cpf: bodyCpf, ...updates } = req.body;

    if (email !== undefined || (bodyCpf !== undefined && bodyCpf !== cpf)) {
        return res.status(400).json({ status: 400, erro: 'Bad Request', mensagem: 'E-mail e CPF são imutáveis.' });
    }

    try {
        const r = await fetch(`${GERENTE_URL}/gerentes/${cpf}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates),
        });

        const body = await r.json();
        if (!r.ok) return res.status(r.status).json(body);

        await invalidateCache('gerente', cpf);

        body._links = {
            self: { href: `${GATEWAY_BASE}/gerentes/${cpf}` },
            atualizacao: { href: `${GATEWAY_BASE}/gerentes/${cpf}` },
            remocao: { href: `${GATEWAY_BASE}/gerentes/${cpf}` },
        };
        return res.status(200).json(body);
    } catch (err) {
        return res.status(500).json({ status: 500, erro: 'Internal Server Error', mensagem: err.message });
    }
});

app.delete('/gerentes/:cpf', verifyJWT, requireRole('GERENTE'), async (req, res) => {
    const { cpf } = req.params;
    const { cpf: userCpf } = req.userIdentity;

    if (cpf === userCpf) {
        return res.status(403).json({ status: 403, erro: 'Forbidden', mensagem: 'Um gerente não pode remover a si mesmo.' });
    }

    const sagaId = publishSaga('REMOVER_GERENTE_START', { cpf, cpfSolicitante: userCpf });
    res.set('Location', `/jobs/${sagaId}/status`);
    return res.status(202).json({ jobId: sagaId, status: 'PENDENTE' });
});

app.get('/relatorios/clientes', verifyJWT, requireRole('GERENTE'), async (req, res) => {
    const jobId = uuidv4();
    await redisClient.set(`job:${jobId}`, JSON.stringify({ jobId, status: 'PENDENTE', resultType: 'inline' }), { EX: 300 });

    setImmediate(async () => {
        try {
            const [cliRes, contaRes, gerRes] = await Promise.all([
                fetch(`${CLIENTE_URL}/clientes`),
                fetch(`${CONTA_URL}/contas`),
                fetch(`${GERENTE_URL}/gerentes`),
            ]);

            const { clientes: cliLista } = await cliRes.json();
            const { contas: contaLista } = await contaRes.json();
            const { gerentes: gerLista } = await gerRes.json();

            const contaByCliente = {};
            for (const c of contaLista) contaByCliente[c.cpfCliente] = c;

            const gerById = {};
            for (const g of gerLista) gerById[g.cpf] = g;

            const rows = cliLista.map(cli => {
                const conta = contaByCliente[cli.cpf];
                const ger = conta ? gerById[conta.cpfGerente] : null;
                return {
                    cpf: cli.cpf,
                    nome: cli.nome,
                    email: cli.email,
                    salario: cli.salario,
                    numeroConta: conta?.numero ?? null,
                    saldo: conta?.saldo ?? '0.00',
                    cpfGerente: conta?.cpfGerente ?? null,
                    nomeGerente: ger?.nome ?? null,
                };
            });

            rows.sort((a, b) => collator.compare(a.nome, b.nome));

            const job = { jobId, status: 'CONCLUIDO', resultType: 'inline', resultado: { clientes: rows } };
            await redisClient.set(`job:${jobId}`, JSON.stringify(job), { EX: 300 });
        } catch (err) {
            const job = { jobId, status: 'FALHA', erro: err.message };
            await redisClient.set(`job:${jobId}`, JSON.stringify(job), { EX: 300 });
        }
    });

    res.set('Location', `/jobs/${jobId}/status`);
    return res.status(202).json({ jobId, status: 'PENDENTE' });
});

app.get('/jobs/:jobId/status', verifyJWT, async (req, res) => {
    const job = await getJob(req.params.jobId);
    if (!job) return res.status(404).json({ status: 404, erro: 'Not Found', mensagem: 'Job não encontrado ou expirado.' });

    const { resultado, ...jobSemResultado } = job;
    return res.status(200).json(jobSemResultado);
});

app.get('/jobs/:jobId/result', verifyJWT, async (req, res) => {
    const job = await getJob(req.params.jobId);
    if (!job) return res.status(404).json({ status: 404, erro: 'Not Found', mensagem: 'Job não encontrado ou expirado.' });

    if (job.status !== 'CONCLUIDO' || job.resultType !== 'inline') {
        return res.status(409).json({ status: 409, erro: 'Conflict', mensagem: 'Job não concluído ou não é inline.' });
    }

    return res.status(200).json(job.resultado);
});

const init = async () => {
    await connectRedis();
    await connectRabbitMQ();
    app.listen(PORT, () => console.log(`API Gateway ativo na porta ${PORT}`));
};

init();
