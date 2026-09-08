const { createClient } = require('redis');

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const redisClient = createClient({ url: REDIS_URL });

redisClient.on('error', (err) => console.error('Erro no Redis Gateway:', err));

const connectRedis = async () => {
    await redisClient.connect();
    console.log('API Gateway conectado ao Redis com sucesso.');
};

const invalidateCache = async (prefix, identifier) => {
    await redisClient.del(`cache:${prefix}:${identifier}`);
    await redisClient.del(`cache:${prefix}:all`);
};

module.exports = { 
    redisClient, 
    connectRedis, 
    invalidateCache 
};