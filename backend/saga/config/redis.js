const { createClient } = require('redis');

const REDIS_URL = process.env.REDIS_URL || 'redis://redis:6379';
const JOB_TTL_SECONDS = Number(process.env.JOB_TTL_SECONDS || 1800);
const redisClient = createClient({ url: REDIS_URL });

redisClient.on('error', (err) => console.error('Redis Client Error', err));

const connectRedis = async () => {
    if (redisClient.isOpen) return;
    await redisClient.connect();
};

const updateJob = async (jobId, status, extra = {}) => {
    const existing = await redisClient.get(`job:${jobId}`);
    const prev = existing ? JSON.parse(existing) : {};
    const job = { ...prev, jobId, status, ...extra };
    await redisClient.set(`job:${jobId}`, JSON.stringify(job), { EX: JOB_TTL_SECONDS });
};

module.exports = { connectRedis, updateJob, redisClient };
