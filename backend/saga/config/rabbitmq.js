const amqp = require('amqplib');

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://rabbitmq:5672';

let channel;

const connectRabbitMQ = async () => {
    const conn = await amqp.connect(RABBITMQ_URL);
    channel = await conn.createChannel();

    await channel.assertQueue('saga.cmd', { durable: true });
    await channel.assertQueue('orquestrador.reply', { durable: true });
    await channel.assertQueue('cliente.cmd', { durable: true });
    await channel.assertQueue('auth.cmd', { durable: true });
    await channel.assertQueue('email.cmd', { durable: true });
    await channel.assertQueue('gerente.cmd', { durable: true });

    return channel;
};

const getChannel = () => {
    if (!channel) {
        throw new Error('Canal do RabbitMQ não inicializado');
    }

    return channel;
};

module.exports = {
    connectRabbitMQ,
    getChannel
};