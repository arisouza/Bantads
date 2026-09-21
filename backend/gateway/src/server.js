const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { createProxyMiddleware, fixRequestBody } = require('http-proxy-middleware');

const { redisClient, connectRedis } = require('./config/redis');
const { verifyJWT, requireRole, SECRET } = require('./middlewares/auth');

const app = express();
const PORT = process.env.PORT || 3000;
const AUTH_URL = process.env.AUTH_URL || 'http://ms-auth:8080';
const CLIENTE_URL = process.env.CLIENTE_URL || 'http://ms-cliente:8080';
const GERENTE_URL = process.env.GERENTE_URL || 'http://ms-gerente:8080';
const CONTA_URL = process.env.CONTA_URL || 'http://ms-conta:8080';

app.use(cors());
app.use(express.json());

app.post('/login', async (req, res) => {
    const { email, senha } = req.body;

    if (!email || !senha) {
        return res.status(400).json({
            auth: false,
            message: 'Credenciais ausentes'
        });
    }

    try {
        const authRes = await fetch(`${AUTH_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, senha })
        });

        if (authRes.status === 401) {
            return res.status(401).json({
                auth: false,
                message: 'Login inválido!'
            });
        }

        if (!authRes.ok) {
            throw new Error('Erro no MS Auth');
        }

        const { cpf, tipo } = await authRes.json();
        let nome = '';

        const userUrl = tipo === 'CLIENTE'
            ? `${CLIENTE_URL}/clientes/${cpf}`
            : `${GERENTE_URL}/gerentes/${cpf}`;

        const userRes = await fetch(userUrl);

        if (userRes.ok) {
            const userData = await userRes.json();
            nome = userData.nome;
        }

        const jti = Math.random().toString(36).substring(2) + Date.now().toString(36);
        const token = jwt.sign({ cpf, tipo, jti }, SECRET, { expiresIn: '8h' });

        await redisClient.set(
            `sessao:${jti}`,
            JSON.stringify({ cpf, tipo }),
            { EX: 1800 }
        );

        await redisClient.set(`sessao:cpf:${cpf}`, jti, { EX: 1800 });

        return res.status(200).json({
            auth: true,
            token,
            tipo,
            usuario: { cpf, nome, email }
        });
    } catch (error) {
        return res.status(500).json({
            auth: false,
            message: 'Erro interno no login'
        });
    }
});

app.post('/logout', verifyJWT, async (req, res) => {
    try {
        const token = req.headers['x-access-token'];
        const { jti, cpf, exp } = jwt.decode(token);
        const timeRemaining = exp - Math.floor(Date.now() / 1000);

        if (timeRemaining > 0) {
            await redisClient.set(`revoked:${token}`, 'true', { EX: timeRemaining });
        }

        await redisClient.del(`sessao:${jti}`);
        await redisClient.del(`sessao:cpf:${cpf}`);

        return res.status(200).json({
            auth: false,
            message: 'Logout efetuado com sucesso'
        });
    } catch (error) {
        return res.status(500).json({
            message: 'Erro ao efetuar logout'
        });
    }
});

const proxyOptions = {
    changeOrigin: true,
    on: {
        proxyReq: (proxyReq, req) => {
            const user = req.userIdentity || req.user;

            if (user) {
                proxyReq.setHeader('X-User-CPF', user.cpf);
                proxyReq.setHeader('X-User-Tipo', user.tipo);
            }

            fixRequestBody(proxyReq, req);
        }
    }
};

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'UP' });
});

app.post('/reboot', (req, res) => {
    res.status(200).json({
        status: 'ok',
        clientes: 5,
        gerentes: 4,
        contas: 5
    });
});

app.post(
    '/solicitacoes',
    createProxyMiddleware({ target: CLIENTE_URL, ...proxyOptions })
);

app.get(
    '/solicitacoes',
    verifyJWT,
    requireRole('GERENTE'),
    createProxyMiddleware({ target: CLIENTE_URL, ...proxyOptions })
);

app.get(
    '/solicitacoes/:cpf',
    verifyJWT,
    requireRole('GERENTE'),
    createProxyMiddleware({ target: CLIENTE_URL, ...proxyOptions })
);

app.post(
    '/solicitacoes/:cpf/rejeicao',
    verifyJWT,
    requireRole('GERENTE'),
    createProxyMiddleware({ target: CLIENTE_URL, ...proxyOptions })
);

app.use(
    '/gerentes',
    verifyJWT,
    requireRole('GERENTE'),
    createProxyMiddleware({ target: GERENTE_URL, ...proxyOptions })
);

app.use(
    '/clientes',
    verifyJWT,
    createProxyMiddleware({ target: CLIENTE_URL, ...proxyOptions })
);

app.use(
    '/contas',
    verifyJWT,
    createProxyMiddleware({ target: CONTA_URL, ...proxyOptions })
);

// FIX da Joyce
// app.use(
//     '/clientes',
//     verifyJWT,
//     requireRole('CLIENTE'),
//     createProxyMiddleware({ target: 'http://ms-cliente:3002', ...proxyOptions })
// );
// app.use(
//     '/gerentes',
//     verifyJWT,
//     requireRole('GERENTE'),
//     createProxyMiddleware({ target: 'http://ms-gerente:3003', ...proxyOptions })
// );

const init = async () => {
    await connectRedis();

    app.listen(PORT, () => {
        console.log(`API Gateway ativo na porta ${PORT}`);
    });
};

init();