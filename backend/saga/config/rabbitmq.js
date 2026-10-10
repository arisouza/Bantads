const amqp = require('amqplib');

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://rabbitmq:5672';

const FILAS_COMANDO = ['ms.cliente.cmd', 'ms.conta.cmd', 'ms.gerente.cmd', 'ms.auth.cmd'];
const FILAS_DLQ = FILAS_COMANDO.map((fila) => `${fila}.dlq`);

let channel;

const connectRabbitMQ = async () => {
    const conn = await amqp.connect(RABBITMQ_URL);
    channel = await conn.createChannel();

    await channel.assertExchange('bantads.dlx', 'direct', { durable: true });

    for (const fila of FILAS_COMANDO) {
        await channel.assertQueue(`${fila}.dlq`, { durable: true });
        await channel.bindQueue(`${fila}.dlq`, 'bantads.dlx', `${fila}.dlq`);
        await channel.assertQueue(fila, {
            durable: true,
            arguments: {
                'x-dead-letter-exchange': 'bantads.dlx',
                'x-dead-letter-routing-key': `${fila}.dlq`
            }
        });
    }

    for (const fila of ['saga.cmd', 'orquestrador.reply', 'ms.email.cmd']) {
        await channel.assertQueue(fila, { durable: true });
    }

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
    getChannel,
    FILAS_DLQ
};