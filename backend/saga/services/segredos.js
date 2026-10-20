const { redisClient } = require('../config/redis');
const chave = (sagaId) => `saga:${sagaId}:senha`;

module.exports = {
    guardar: async (sagaId, senha) => senha && redisClient.set(chave(sagaId), senha, { EX: 3600 }),
    obter: (sagaId) => redisClient.get(chave(sagaId)),
    descartar: (sagaId) => redisClient.del(chave(sagaId))
};
