const amqp = require('amqplib');

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://rabbitmq:5672';
let channel;

const connectRabbitMQ = async () => {
    const conn = await amqp.connect(RABBITMQ_URL);
    channel = await conn.createChannel();

    const queues = [
        'saga.cmd', 'saga.reply', 'cliente.cmd', 
        'auth.cmd', 'conta.cmd', 'email.cmd', 'gerente.cmd'
    ];
    
    for (const q of queues) {
        await channel.assertQueue(q, { durable: true });
    }

    return channel;
};

const getChannel = () => {
    if (!channel) throw new Error('Canal do RabbitMQ não inicializado');
    return channel;
};

module.exports = {
    connectRabbitMQ,
    getChannel
};