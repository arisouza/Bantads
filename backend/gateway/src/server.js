const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { createProxyMiddleware } = require('http-proxy-middleware');

const { redisClient, connectRedis } = require('./config/redis');
const { verifyJWT, requireRole, SECRET } = require('./middlewares/auth');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.post('/login', async (req, res) => {
    const { email, senha } = req.body;
    if (!email || !senha) return res.status(400).json({ auth: false, message: 'Credenciais ausentes' });

    try {
        const authRes = await fetch('http://ms-auth:3001/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, senha })
        });
        
        if (authRes.status === 401) return res.status(401).json({ auth: false, message: 'Login inválido!' });
        if (!authRes.ok) throw new Error('Erro no MS Auth');

        const { cpf, tipo } = await authRes.json();
        let nome = '';

        const userUrl = tipo === 'CLIENTE' ? `http://ms-cliente:3002/clientes/${cpf}` : `http://ms-gerente:3003/gerentes/${cpf}`;
        const userRes = await fetch(userUrl);
        if (userRes.ok) {
            const userData = await userRes.json();
            nome = userData.nome;
        }

        const jti = Math.random().toString(36).substring(2) + Date.now().toString(36);
        const token = jwt.sign({ cpf, tipo, jti }, SECRET, { expiresIn: '8h' });

        await redisClient.set(`sessao:${jti}`, JSON.stringify({ cpf, tipo }), { EX: 1800 });
        await redisClient.set(`sessao:cpf:${cpf}`, jti, { EX: 1800 });

        return res.status(200).json({ auth: true, token, tipo, usuario: { cpf, nome, email } });
    } catch (error) {
        return res.status(500).json({ auth: false, message: 'Erro interno no login' });
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
        
        return res.status(200).json({ auth: false, message: 'Logout efetuado com sucesso' });
    } catch (error) {
        return res.status(500).json({ message: 'Erro ao efetuar logout' });
    }
});

const proxyOptions = {
    changeOrigin: true,
    onProxyReq: (proxyReq, req) => {
        if (req.userIdentity) {
            proxyReq.setHeader('X-User-CPF', req.userIdentity.cpf);
            proxyReq.setHeader('X-User-Tipo', req.userIdentity.tipo);
        }
    }
};

app.post('/clientes/solicitacao', createProxyMiddleware({ target: 'http://ms-cliente:3002', changeOrigin: true }));

app.use('/clientes', verifyJWT, createProxyMiddleware({ target: 'http://ms-cliente:3002', ...proxyOptions }));
app.use('/gerentes', verifyJWT, createProxyMiddleware({ target: 'http://ms-gerente:3003', ...proxyOptions }));
app.use('/contas', verifyJWT, createProxyMiddleware({ target: 'http://ms-conta:3004', ...proxyOptions }));

//FIX da Joyce
// app.use('/clientes', verifyJWT, requireRole('CLIENTE'), createProxyMiddleware({ target: 'http://ms-cliente:3002', ...proxyOptions }));
// app.use('/gerentes', verifyJWT, requireRole('GERENTE'), createProxyMiddleware({ target: 'http://ms-gerente:3003', ...proxyOptions }));

app.get('/health', (req, res) => res.status(200).json({ status: 'ok', service: 'api-gateway' }));

const init = async () => {
    await connectRedis();
    app.listen(PORT, () => console.log(`API Gateway ativo na porta ${PORT}`));
};

init();