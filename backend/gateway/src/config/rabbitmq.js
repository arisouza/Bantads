const amqp = require('amqplib');

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://admin:admin@rabbitmq:5672';

let channel;

const connectRabbitMQ = async (retries = 10, delay = 3000) => {
    for (let i = 0; i < retries; i++) {
        try {
            const conn = await amqp.connect(RABBITMQ_URL);
            channel = await conn.createConfirmChannel();

            const queues = ['saga.cmd', 'ms.email.cmd'];
            for (const q of queues) {
                await channel.assertQueue(q, { durable: true });
            }

            console.log('API Gateway conectado ao RabbitMQ.');
            return channel;
        } catch (err) {
            console.log(`Aguardando RabbitMQ ficar pronto... (${i + 1}/${retries})`);
            await new Promise(res => setTimeout(res, delay));
        }
    }
    throw new Error('Falha ao conectar no RabbitMQ após múltiplas tentativas.');
};

const getChannel = () => {
    if (!channel) throw new Error('Canal RabbitMQ não inicializado');
    return channel;
};

const publishToQueue = async (queue, message) => {
    const activeChannel = getChannel();
    await activeChannel.assertQueue(queue, { durable: true });
    activeChannel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), {
        persistent: true,
        contentType: 'application/json'
    });
    await activeChannel.waitForConfirms();
};

module.exports = { connectRabbitMQ, getChannel, publishToQueue };
