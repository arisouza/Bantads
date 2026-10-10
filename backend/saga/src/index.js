const { connectRabbitMQ, FILAS_DLQ } = require('../config/rabbitmq');
const { connectRedis } = require('../config/redis');
const { iniciar, responder, falhaTecnica } = require('../services/orchestrator');

const consumir = (channel, fila, tratar) => channel.consume(fila, async (msg) => {
    if (!msg) return;

    try {
        await tratar(JSON.parse(msg.content.toString()));
    } catch (error) {
        console.error(`[SAGA] Erro ao processar mensagem de ${fila}:`, error);
    }

    channel.ack(msg);
});

const init = async () => {
    try {
        await connectRedis();
        const channel = await connectRabbitMQ();

        consumir(channel, 'saga.cmd', iniciar);
        consumir(channel, 'orquestrador.reply', responder);
        FILAS_DLQ.forEach((fila) => consumir(channel, fila, falhaTecnica));

        console.log('Orquestrador SAGA inicializado e consumindo filas...');
    } catch (error) {
        console.error('Falha ao inicializar o Orquestrador SAGA:', error);
        process.exit(1);
    }
};

init();