const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { createClient } = require('redis');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET = process.env.JWT_SECRET || 'bantads-secret-key';

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => console.error(err));

app.use(cors());
app.use(express.json());

const verifyJWT = async (req, res, next) => {
  const token = req.headers['x-access-token'];
  if (!token) {
    return res.status(401).json({ auth: false, message: 'Token não fornecido.' });
  }
  try {
    const isRevoked = await redisClient.get(`revoked:${token}`);
    if (isRevoked) {
      return res.status(401).json({ auth: false, message: 'Falha ao autenticar o token.' });
    }
    const decoded = jwt.verify(token, SECRET);
    const jti = decoded.jti;
    const sessionExists = await redisClient.exists(`sessao:${jti}`);
    if (!sessionExists) {
      return res.status(401).json({ auth: false, message: 'Falha ao autenticar o token.' });
    }
    await redisClient.expire(`sessao:${jti}`, 1800);
    await redisClient.expire(`sessao:cpf:${decoded.cpf}`, 1800);
    req.userIdentity = decoded;
    req.headers['X-User-CPF'] = decoded.cpf;
    req.headers['X-User-Tipo'] = decoded.tipo;
    next();
  } catch (error) {
    return res.status(401).json({ auth: false, message: 'Falha ao autenticar o token.' });
  }
};

app.post('/login', async (req, res) => {
  const { email, senha } = req.body;
  if (!email || !senha) {
    return res.status(400).json({ auth: false, message: 'Credenciais ausentes' });
  }
  try {
    const authResponse = await fetch('http://ms-auth:3001/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, senha })
    });
    if (authResponse.status === 401) {
      return res.status(401).json({ auth: false, message: 'Login inválido!' });
    }
    if (!authResponse.ok) {
      return res.status(500).json({ auth: false, message: 'Erro no MS Auth' });
    }
    const authData = await authResponse.json();
    const { cpf, tipo } = authData;
    let nome = '';
    if (tipo === 'CLIENTE') {
      const clienteResponse = await fetch(`http://ms-cliente:3002/clientes/${cpf}`);
      if (clienteResponse.ok) {
        const clienteData = await clienteResponse.json();
        nome = clienteData.nome;
      }
    } else if (tipo === 'GERENTE') {
      const gerenteResponse = await fetch(`http://ms-gerente:3003/gerentes/${cpf}`);
      if (gerenteResponse.ok) {
        const gerenteData = await gerenteResponse.json();
        nome = gerenteData.nome;
      }
    }
    const jti = Math.random().toString(36).substring(2) + Date.now().toString(36);
    const token = jwt.sign({ cpf, tipo, jti }, SECRET, { expiresIn: '8h' });
    await redisClient.set(`sessao:${jti}`, JSON.stringify({ cpf, tipo }), { EX: 1800 });
    await redisClient.set(`sessao:cpf:${cpf}`, jti, { EX: 1800 });
    return res.status(200).json({
      auth: true,
      token,
      tipo,
      usuario: { cpf, nome, email }
    });
  } catch (error) {
    return res.status(500).json({ auth: false, message: 'Erro interno no login' });
  }
});

app.post('/logout', verifyJWT, async (req, res) => {
  try {
    const token = req.headers['x-access-token'];
    const decoded = jwt.decode(token);
    const jti = decoded.jti;
    const cpf = decoded.cpf;
    const exp = decoded.exp;
    const currentTime = Math.floor(Date.now() / 1000);
    const timeRemaining = exp - currentTime;
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

app.post('/contas/:id/transferencia', verifyJWT, async (req, res) => {
  try {
    const contaOrigem = req.params.id;
    const { contaDestino, valor } = req.body;
    const cpfOrigem = req.userIdentity.cpf;
    const contaDestinoRes = await fetch(`http://ms-conta:3004/contas/${contaDestino}`);
    if (!contaDestinoRes.ok) {
      return res.status(404).json({ message: 'Conta destino não encontrada' });
    }
    const contaDestinoData = await contaDestinoRes.json();
    const cpfDestino = contaDestinoData.cpfCliente;
    const clienteOrigemRes = await fetch(`http://ms-cliente:3002/clientes/${cpfOrigem}`);
    const clienteOrigemData = await clienteOrigemRes.json();
    const nomeOrigem = clienteOrigemData.nome;
    const clienteDestinoRes = await fetch(`http://ms-cliente:3002/clientes/${cpfDestino}`);
    const clienteDestinoData = await clienteDestinoRes.json();
    const nomeDestino = clienteDestinoData.nome;
    const bodyEnriquecido = {
      contaDestino,
      valor,
      cpfOrigem,
      nomeOrigem,
      cpfDestino,
      nomeDestino
    };
    const transferRes = await fetch(`http://ms-conta:3004/contas/${contaOrigem}/transferencia`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-CPF': cpfOrigem,
        'X-User-Tipo': req.userIdentity.tipo
      },
      body: JSON.stringify(bodyEnriquecido)
    });
    if (!transferRes.ok) {
      return res.status(transferRes.status).json(await transferRes.json());
    }
    return res.status(200).json(await transferRes.json());
  } catch (error) {
    return res.status(500).json({ message: 'Erro ao processar transferencia' });
  }
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'api-gateway' });
});

app.post('/reboot', async (req, res) => {
  try {
    const responses = await Promise.all([
      fetch('http://ms-cliente:3002/reboot', { method: 'POST' }).then(r => r.json()).catch(() => ({})),
      fetch('http://ms-gerente:3003/reboot', { method: 'POST' }).then(r => r.json()).catch(() => ({})),
      fetch('http://ms-conta:3004/reboot', { method: 'POST' }).then(r => r.json()).catch(() => ({})),
      fetch('http://ms-auth:3001/reboot', { method: 'POST' }).then(r => r.json()).catch(() => ({}))
    ]);
    const keys = await redisClient.keys('*');
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
    res.status(200).json({
      status: 'ok',
      clientes: responses[0].clientes || 0,
      gerentes: responses[1].gerentes || 0,
      contas: responses[2].contas || 0
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Erro no reboot' });
  }
});

app.get('/jobs/:jobId/status', verifyJWT, async (req, res) => {
  try {
    const { jobId } = req.params;
    const jobData = await redisClient.get(`job:${jobId}`);
    if (!jobData) {
      return res.status(404).json({ message: 'Job não encontrado' });
    }
    res.status(200).json(JSON.parse(jobData));
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar status' });
  }
});

app.get('/jobs/:jobId/result', verifyJWT, async (req, res) => {
  try {
    const { jobId } = req.params;
    const jobData = await redisClient.get(`job:${jobId}`);
    if (!jobData) {
      return res.status(404).json({ message: 'Job não encontrado' });
    }
    const job = JSON.parse(jobData);
    if (job.status !== 'CONCLUIDO') {
      return res.status(400).json({ message: 'Job não concluído' });
    }
    if (job.resultType === 'resource') {
      res.redirect(303, `/${job.dominio}/${job.resourceId}`);
    } else if (job.resultType === 'inline') {
      res.status(200).json(job.resultado);
    } else {
      res.status(400).json({ message: 'Tipo inválido' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar resultado do job' });
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

app.use('/clientes', verifyJWT, createProxyMiddleware({ target: 'http://ms-cliente:3002', ...proxyOptions }));
app.use('/gerentes', verifyJWT, createProxyMiddleware({ target: 'http://ms-gerente:3003', ...proxyOptions }));
app.use('/contas', verifyJWT, createProxyMiddleware({ target: 'http://ms-conta:3004', ...proxyOptions }));

app.use((req, res) => {
  res.status(404).json({ message: 'Rota não encontrada' });
});

const startServer = async () => {
  try {
    await redisClient.connect();
    app.listen(PORT, () => {
      console.log(`API Gateway rodando na porta ${PORT}`);
    });
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

startServer();