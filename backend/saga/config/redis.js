const { createClient } = require('redis');

const REDIS_URL = process.env.REDIS_URL || 'redis://redis:6379';
const redisClient = createClient({ url: REDIS_URL });

redisClient.on('error', (err) => console.error('Redis Client Error', err));

const connectRedis = async () => {
    await redisClient.connect();
};

const updateJob = async (jobId, status, extra = {}) => {
    const job = { jobId, status, ...extra };
    await redisClient.set(`job:${jobId}`, JSON.stringify(job), { EX: 300 });
};

module.exports = {
    connectRedis,
    updateJob
};