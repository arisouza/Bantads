const jwt = require('jsonwebtoken');
const { redisClient } = require('../config/redis');

const SECRET = process.env.JWT_SECRET || 'bantads-secret-key';

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
        const sessionExists = await redisClient.exists(`sessao:${decoded.jti}`);
        
        if (!sessionExists) {
            return res.status(401).json({ auth: false, message: 'Sessão expirada.' });
        }

        await redisClient.expire(`sessao:${decoded.jti}`, 1800);
        await redisClient.expire(`sessao:cpf:${decoded.cpf}`, 1800);

        req.userIdentity = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ auth: false, message: 'Falha ao autenticar o token.' });
    }
};

const requireRole = (tipo) => (req, res, next) => {
    if (req.userIdentity?.tipo !== tipo) {
        return res.status(403).json({ status: 403, erro: "Forbidden", mensagem: "Acesso não permitido." });
    }
    next();
};

module.exports = { verifyJWT, requireRole, SECRET };